import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { apiService, SubjectDTO } from "@/services/apiService";
import {
  Proficiency, Willingness, PrefMap, WillingMap, Snap, GRADE_LEVEL_OPTIONS
} from "../types";
import { computeSelectionSummary, snapshotFromState, computeDiff } from "../utils/diff";

export function useProfessorSubjects(professorId: number) {
  const { toast } = useToast();

  // filters
  const [query, setQuery] = useState("");
  const [gradeLevel, setGradeLevel] = useState<string>("all");
  const [strand, setStrand] = useState<string>("all");

  // data
  const [subjects, setSubjects] = useState<SubjectDTO[]>([]);
  const [prefs, setPrefs] = useState<PrefMap>({});
  const [willing, setWilling] = useState<WillingMap>({});

  // baseline snapshot
  const initialSnapshotRef = useRef<Map<number, Snap>>(new Map());
  const initialLoadedRef = useRef(false);

  // already assigned (locked)
  const [lockedAssigned, setLockedAssigned] = useState<Set<number>>(new Set());

  // ui
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // dialogs
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const [allStrands, setAllStrands] = useState<string[]>([]);

  // normalize subjects once for diff/summary (avoid null vs undefined mismatches)
  const subjectsForDiff = useMemo(
    () =>
      subjects.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        strand: s.strand ?? undefined,
        gradeLevel: s.gradeLevel,
        units: s.units,
        type: s.type,
      })),
    [subjects]
  );

  // fetch subjects + prefs
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await apiService.getSubjects({
          q: query || undefined,
          grade_level: gradeLevel !== "all" ? gradeLevel : undefined,
          strand: strand !== "all" ? strand : undefined,
        });
        if (!alive) return;

        const list = Array.isArray(res.data) ? res.data : [];
        setSubjects(list);

        if (strand === "all") {
          const s = new Set<string>();
          list.forEach((x: any) => {
            const v = (x?.strand ?? "").toString().trim();
            if (v) s.add(v);
          });
          setAllStrands(Array.from(s).sort((a, b) => a.localeCompare(b)));
        }

        // initial preferences load
        if (!initialLoadedRef.current) {
          try {
            const prefRes = await apiService.getProfessorSubjectPreferences(professorId);
            const initial: PrefMap = {};
            const initialWilling: WillingMap = {};
            const arr = Array.isArray(prefRes.data) ? prefRes.data : [];

            const snap = new Map<number, Snap>();
            arr.forEach((p: any) => {
              const sid = Number(p.subj_id);
              const lvl = String(p.proficiency || "").toLowerCase();
              const w = p.willingness ? String(p.willingness).toLowerCase() : "";

              if (["beginner", "intermediate", "advanced"].includes(lvl)) {
                initial[sid] = lvl as Proficiency;
                snap.set(sid, { prof: lvl as Proficiency });
              }
              if (["willing", "not_willing"].includes(w)) {
                initialWilling[sid] = w as Willingness;
                const prev = snap.get(sid);
                snap.set(sid, { ...(prev || ({} as Snap)), will: w as Willingness });
              }
            });

            if (!alive) return;
            if (Object.keys(initial).length) setPrefs(initial);
            if (Object.keys(initialWilling).length) setWilling(initialWilling);

            initialSnapshotRef.current = snap;
            initialLoadedRef.current = true;
          } catch {
            initialLoadedRef.current = true;
          }
        }

        setError(null);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "Failed to load subjects");
      } finally {
        if (alive) setLoading(false);
      }
    }, 250);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, gradeLevel, strand, professorId]);

  // fetch assigned (lock)
  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!professorId) return;
      try {
        const hasHelper = typeof (apiService as any).getProfessorAssignedSubjects === "function";
        if (hasHelper) {
          const resp = await (apiService as any).getProfessorAssignedSubjects(professorId);
          const ids: number[] = Array.isArray(resp?.data) ? resp.data.map((x: any) => Number(x)) : [];
          if (alive) setLockedAssigned(new Set(ids));
          return;
        }
        const res = await fetch(`https://spcc-scheduler.site/professors.php?id=${professorId}`);
        const json = await res.json();
        const ids: number[] = Array.isArray(json?.data?.subjects)
          ? json.data.subjects.map((s: any) => Number(s.subj_id))
          : [];
        if (alive) setLockedAssigned(new Set(ids));
      } catch {
        // ignore
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, [professorId]);

  // filters
  const displayed = useMemo(() => {
    const q = query.trim().toLowerCase();
    return subjects.filter((s) => {
      const byQ = !q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
      const byGrade = gradeLevel === "all" || String(s.gradeLevel ?? "").toLowerCase() === gradeLevel.toLowerCase();
      const byStrand = strand === "all" || String(s.strand ?? "").toLowerCase() === strand.toLowerCase();
      return byQ && byGrade && byStrand;
    });
  }, [subjects, query, gradeLevel, strand]);

  // validations
  const selectedCount = useMemo(() => Object.values(prefs).filter(Boolean).length, [prefs]);

  const missingWillingIds = useMemo(
    () =>
      Object.entries(prefs)
        .filter(([, prof]) => !!prof)
        .map(([id]) => Number(id))
        .filter((id) => !willing[id]),
    [prefs, willing]
  );

  // summary
  const selectionSummary = useMemo(
    () => computeSelectionSummary(prefs, willing, subjectsForDiff),
    [prefs, willing, subjectsForDiff]
  );

  // diff vs baseline
  const currentSnapshot = useMemo(() => snapshotFromState(prefs, willing), [prefs, willing]);

  const { addedRows, removedRows, updatedRows, removedIds } = useMemo(() => {
    const diff = computeDiff(initialSnapshotRef.current, currentSnapshot, subjectsForDiff);
    // do not show locked as "removed"
    diff.removedRows = diff.removedRows.filter((r) => !lockedAssigned.has(r.id));
    diff.removedIds = diff.removedIds.filter((id) => !lockedAssigned.has(id));
    return diff;
  }, [currentSnapshot, subjectsForDiff, lockedAssigned]) as any;

  // changes gate for Confirm button
  const changeCount =
    (addedRows?.length || 0) + (updatedRows?.length || 0) + (removedIds?.length || 0);
  const hasChanges = changeCount > 0;

  // ✅ final canSubmit: based on changes, not selection count
  const canSubmit = hasChanges && missingWillingIds.length === 0 && !saving;

  // handlers
  const handleToggle = (id: number) => {
    setPrefs((prev) => {
      const isSelected = !!prev[id];
      if (!isSelected) return { ...prev, [id]: "beginner" };

      if (lockedAssigned.has(id)) {
        toast({
          title: "Assigned subject",
          description: "You can’t remove a subject that’s already assigned to you.",
          variant: "destructive",
        });
        return prev;
      }

      const next = { ...prev };
      delete next[id];
      setWilling((w) => {
        const c = { ...w };
        delete c[id];
        return c;
      });
      return next;
    });
  };

  const handleLevelChange = (id: number, level: Proficiency) =>
    setPrefs((p) => ({ ...p, [id]: level }));

  const handleWillingChange = (id: number, val: Willingness) =>
    setWilling((w) => ({ ...w, [id]: val }));

  const clearFilters = () => {
    setQuery("");
    setGradeLevel("all");
    setStrand("all");
  };

  const handleSaveClick = () => {
    if (!hasChanges) {
      toast({ title: "No changes", description: "There’s nothing new to save yet." });
      return;
    }
    if (missingWillingIds.length > 0) {
      toast({
        title: "Willingness required",
        description: `Please choose “Willing to teach?” for ${missingWillingIds.length} selected ${
          missingWillingIds.length === 1 ? "subject" : "subjects"
        }.`,
        variant: "destructive",
      });
      return;
    }
    setConfirmOpen(true);
  };

  const performSave = async () => {
    // build payload from current state
    const byId = new Map<number, { subj_id: number; proficiency: Proficiency; willingness: Willingness }>();
    Object.entries(prefs).forEach(([k, v]) => {
      if (!v) return;
      const id = Number(k);
      byId.set(id, {
        subj_id: id,
        proficiency: v,
        willingness: (willing[id] ?? "willing") as Willingness,
      });
    });

    // ensure locked assigned can't be dropped
    lockedAssigned.forEach((id) => {
      if (!byId.has(id)) {
        const snap = initialSnapshotRef.current.get(id);
        const prof = (prefs[id] ?? snap?.prof ?? "beginner") as Proficiency;
        const will = (willing[id] ?? snap?.will ?? "willing") as Willingness;
        byId.set(id, { subj_id: id, proficiency: prof, willingness: will });
      }
    });

    // ✅ allow empty to clear all prefs on backend
    const finalSelections = Array.from(byId.values());

    setSaving(true);
    try {
      const res = await apiService.saveProfessorSubjectPreferences(professorId, finalSelections);
      if (res.success) {
        setSavedCount(finalSelections.length);
        setSuccessOpen(true);
        toast({ title: "Preferences saved", description: "Your subject preferences have been updated." });

        // refresh baseline snapshot
        const next = new Map<number, Snap>();
        finalSelections.forEach((s) => next.set(s.subj_id, { prof: s.proficiency, will: s.willingness }));
        initialSnapshotRef.current = next;
      } else {
        toast({ title: "Save failed", description: res.message || "Please try again.", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  const handleClearPreferences = async () => {
    if (!professorId) return;
    setClearing(true);
    try {
      const keptPrefs: PrefMap = {};
      const keptWilling: WillingMap = {};
      lockedAssigned.forEach((id) => {
        const snap = initialSnapshotRef.current.get(id);
        keptPrefs[id] = (prefs[id] ?? snap?.prof ?? "beginner") as Proficiency;
        keptWilling[id] = (willing[id] ?? snap?.will ?? "willing") as Willingness;
      });

      const payload = Array.from(lockedAssigned).map((id) => ({
        subj_id: id,
        proficiency: keptPrefs[id] as Proficiency,
        willingness: keptWilling[id] as Willingness,
      }));

      const res = await apiService.saveProfessorSubjectPreferences(professorId, payload);
      const ok =
        res?.success === true ||
        res?.status === "ok" ||
        res?.message?.toLowerCase?.().includes?.("cleared") ||
        res?.message?.toLowerCase?.().includes?.("deleted") ||
        res?.message?.toLowerCase?.().includes?.("updated");
      if (!ok) throw new Error(res?.message || "Unable to clear preferences");

      setPrefs(keptPrefs);
      setWilling(keptWilling);

      const next = new Map<number, Snap>();
      Array.from(lockedAssigned).forEach((id) => next.set(id, { prof: keptPrefs[id]!, will: keptWilling[id]! }));
      initialSnapshotRef.current = next;

      toast({
        title: "Preferences cleared",
        description:
          lockedAssigned.size > 0
            ? "Cleared all except subjects already assigned to you."
            : "All saved subject preferences have been removed.",
      });
      setClearOpen(false);
    } catch (e: any) {
      toast({ title: "Clear failed", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setClearing(false);
    }
  };

  return {
    // state
    query, setQuery, gradeLevel, setGradeLevel, strand, setStrand,
    subjects, displayed,
    prefs, setPrefs, willing, setWilling,
    lockedAssigned,
    loading, saving, error,
    confirmOpen, setConfirmOpen, successOpen, setSuccessOpen,
    savedCount,
    clearOpen, setClearOpen, clearing,
    allStrands,

    // derived
    selectedCount,
    selectionSummary,
    addedRows, removedRows, updatedRows,
    changeCount, hasChanges, canSubmit,

    // handlers
    handleToggle, handleLevelChange, handleWillingChange,
    clearFilters, handleSaveClick, performSave, handleClearPreferences,

    // constants
    GRADE_LEVEL_OPTIONS,
  };
}
