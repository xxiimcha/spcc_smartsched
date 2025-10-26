// src/pages/ProfessorSubjects.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Search, CheckCircle2, Loader2, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiService, SubjectDTO } from "@/services/apiService";

type Proficiency = "beginner" | "intermediate" | "advanced";
type Willingness = "willing" | "not_willing";

type PrefMap = Record<number, Proficiency | undefined>;
type WillingMap = Record<number, Willingness | undefined>;

// SHS (11/12)
const GRADE_LEVEL_OPTIONS = ["11", "12"];

const ProfessorSubjects: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const professorId =
    (user as any)?.prof_id ??
    (user as any)?.id ??
    (user as any)?.user_id ??
    0;

  // filters
  const [query, setQuery] = useState("");
  const [gradeLevel, setGradeLevel] = useState<string>("all");
  const [strand, setStrand] = useState<string>("all");

  // data
  const [subjects, setSubjects] = useState<SubjectDTO[]>([]);
  const [prefs, setPrefs] = useState<PrefMap>({});
  const [willing, setWilling] = useState<WillingMap>({});

  // keep a snapshot of initially-saved subject IDs (for "newly added" diff)
  const initialSelectedIdsRef = useRef<Set<number>>(new Set());
  const initialLoadedRef = useRef(false);

  // ui state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // dialogs
  const [confirmOpen, setConfirmOpen] = useState(false); // pre-save confirm
  const [successOpen, setSuccessOpen] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  // clear confirmation dialog
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  // stable list of ALL strands captured from the "All" view
  const [allStrands, setAllStrands] = useState<string[]>([]);

  // derive strands from current payload (fallback)
  const derivedStrands = useMemo(() => {
    const s = new Set<string>();
    subjects.forEach((x) => {
      const v = (x.strand ?? "").toString().trim();
      if (v) s.add(v);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [subjects]);

  // fetch subjects + existing prefs
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
          const arr = Array.from(s).sort((a, b) => a.localeCompare(b));
          setAllStrands(arr);
        }

        // initial load of preferences
        if (!initialLoadedRef.current) {
          try {
            const prefRes = await apiService.getProfessorSubjectPreferences(professorId);
            const initial: PrefMap = {};
            const initialWilling: WillingMap = {};
            const arr = Array.isArray(prefRes.data) ? prefRes.data : [];

            const initialIds = new Set<number>();
            arr.forEach((p: any) => {
              const sid = Number(p.subj_id);
              const lvl = String(p.proficiency || "").toLowerCase();
              const w = p.willingness ? String(p.willingness).toLowerCase() : "";

              if (["beginner", "intermediate", "advanced"].includes(lvl)) {
                initial[sid] = lvl as Proficiency;
                initialIds.add(sid);
              }
              if (["willing", "not_willing"].includes(w)) {
                initialWilling[sid] = w as Willingness;
              }
            });

            if (!alive) return;
            if (Object.keys(initial).length) setPrefs(initial);
            if (Object.keys(initialWilling).length) setWilling(initialWilling);

            // snapshot baseline
            initialSelectedIdsRef.current = initialIds;
            initialLoadedRef.current = true;
          } catch {
            // optional endpoint — ignore
            initialLoadedRef.current = true; // avoid retry loop
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

  // local filter
  const displayed = useMemo(() => {
    const q = query.trim().toLowerCase();
    return subjects.filter((s) => {
      const byQ =
        !q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
      const byGrade =
        gradeLevel === "all" ||
        String(s.gradeLevel ?? "").toLowerCase() === gradeLevel.toLowerCase();
      const byStrand =
        strand === "all" ||
        String(s.strand ?? "").toLowerCase() === strand.toLowerCase();
      return byQ && byGrade && byStrand;
    });
  }, [subjects, query, gradeLevel, strand]);

  const selectedCount = useMemo(
    () => Object.values(prefs).filter(Boolean).length,
    [prefs]
  );

  // Which selected subjects are missing a willingness choice?
  const missingWillingIds = useMemo(() => {
    return Object.entries(prefs)
      .filter(([, prof]) => !!prof)
      .map(([id]) => Number(id))
      .filter((id) => !willing[id]);
  }, [prefs, willing]);

  const canSubmit = selectedCount > 0 && missingWillingIds.length === 0 && !saving;

  // Build a full summary from current selections
  const selectionSummary = useMemo(() => {
    const rows = Object.entries(prefs)
      .filter(([, v]) => !!v)
      .map(([idStr, prof]) => {
        const id = Number(idStr);
        const subj = subjects.find((s) => s.id === id);
        return {
          id,
          code: subj?.code ?? `#${id}`,
          name: subj?.name ?? "Unknown subject",
          proficiency: prof as Proficiency,
          willingness: willing[id],
          strand: subj?.strand,
          gradeLevel: subj?.gradeLevel,
          units: subj?.units,
          type: subj?.type,
        };
      })
      .sort((a, b) => a.code.localeCompare(b.code) || a.name.localeCompare(b.name));
    return rows;
  }, [prefs, willing, subjects]);

  // Only the newly added ones (not present in initial snapshot)
  const newSelectionSummary = useMemo(() => {
    const baseline = initialSelectedIdsRef.current;
    return selectionSummary.filter((row) => !baseline.has(row.id));
  }, [selectionSummary]);

  const handleToggle = (id: number) => {
    setPrefs((prev) => {
      const current = prev[id];
      if (!current) return { ...prev, [id]: "beginner" }; // default
      // deselect -> also clear willingness
      const next = { ...prev };
      delete next[id];
      setWilling((w) => {
        const copy = { ...w };
        delete copy[id];
        return copy;
      });
      return next;
    });
  };

  const handleLevelChange = (id: number, level: Proficiency) => {
    setPrefs((prev) => ({ ...prev, [id]: level }));
  };

  const handleWillingChange = (id: number, val: Willingness) => {
    setWilling((prev) => ({ ...prev, [id]: val }));
  };

  const clearFilters = () => {
    setQuery("");
    setGradeLevel("all");
    setStrand("all");
  };

  // Open pre-save confirmation dialog (shows only new selections)
  const handleSave = () => {
    if (missingWillingIds.length > 0) {
      toast({
        title: "Willingness required",
        description: `Please choose “Willing to teach?” for ${missingWillingIds.length} selected ${missingWillingIds.length === 1 ? "subject" : "subjects"}.`,
        variant: "destructive",
      });
      return;
    }
    if (selectedCount === 0) {
      toast({ title: "Nothing to save", description: "Select at least one subject.", variant: "destructive" });
      return;
    }
    setConfirmOpen(true);
  };

  // Actual API save (runs after user confirms)
  const performSave = async () => {
    const selections = Object.entries(prefs)
      .filter(([, v]) => !!v)
      .map(([k, v]) => {
        const id = Number(k);
        return {
          subj_id: id,
          proficiency: v as Proficiency,
          willingness: willing[id]!, // assured by guard
        };
      });

    if (!professorId || selections.length === 0) {
      toast({ title: "Nothing to save", description: "Select at least one subject.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const res = await apiService.saveProfessorSubjectPreferences(professorId, selections);
      if (res.success) {
        setSavedCount(selections.length);
        setSuccessOpen(true);
        toast({ title: "Preferences saved", description: "Your subject preferences have been updated." });

        // After a successful save, refresh the baseline so next confirm only shows truly *new* adds
        initialSelectedIdsRef.current = new Set(selections.map((s) => s.subj_id));
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
      const hasClear =
        typeof (apiService as any).clearProfessorSubjectPreferences === "function";

      const res = hasClear
        ? await (apiService as any).clearProfessorSubjectPreferences(professorId)
        : await apiService.saveProfessorSubjectPreferences(professorId, []);

      const ok =
        res?.success === true ||
        res?.status === "ok" ||
        res?.message?.toLowerCase?.().includes?.("cleared") ||
        res?.message?.toLowerCase?.().includes?.("deleted") ||
        res?.message?.toLowerCase?.().includes?.("updated");

      if (!ok) throw new Error(res?.message || "Unable to clear preferences");

      setPrefs({});
      setWilling({});
      // also reset baseline
      initialSelectedIdsRef.current = new Set();
      toast({ title: "Preferences cleared", description: "All saved subject preferences have been removed." });
      setClearOpen(false);
    } catch (e: any) {
      toast({
        title: "Clear failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setClearing(false);
    }
  };

  const ProficiencyBadge = ({ value }: { value: Proficiency }) => (
    <Badge variant="secondary" className="capitalize">{value}</Badge>
  );
  const WillingBadge = ({ value }: { value?: Willingness }) =>
    value ? (
      <Badge variant="outline" className="capitalize">
        {value === "not_willing" ? "not willing" : value}
      </Badge>
    ) : (
      <Badge variant="outline" className="opacity-60">no choice</Badge>
    );

  const strandsForTabs = allStrands.length ? allStrands : derivedStrands;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Subjects
          </h1>
          <p className="text-sm text-muted-foreground">
            Pick the subjects you prefer to handle, rate your proficiency, and mark if you’re willing to teach.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={clearFilters}>Reset Filters</Button>
          <Button
            variant="destructive"
            onClick={() => setClearOpen(true)}
            disabled={clearing}
            title="Remove all saved subject preferences"
          >
            {clearing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {clearing ? "Clearing..." : "Clear Preferences"}
          </Button>
          <Button onClick={handleSave} disabled={!canSubmit}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            {saving ? "Saving..." : `Confirm (${selectedCount})`}
          </Button>
        </div>
      </div>

      {/* Three-column on wide: Filters | Results | Live Summary */}
      <div className="grid grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)_320px] gap-6">
        {/* Filters Panel */}
        <Card className="h-min xl:sticky xl:top-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by name or code"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Grade Level</div>
              <Select value={gradeLevel} onValueChange={setGradeLevel}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {GRADE_LEVEL_OPTIONS.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />
            <div className="text-xs text-muted-foreground">
              Selected: <span className="font-medium">{selectedCount}</span>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="min-h-[300px]">
          {/* Strand Tabs */}
          <Tabs value={strand} onValueChange={setStrand} className="mb-4">
            <TabsList className="w-full overflow-x-auto">
              <TabsTrigger value="all" className="whitespace-nowrap">All</TabsTrigger>
              {strandsForTabs.map((s) => (
                <TabsTrigger key={s} value={s} className="whitespace-nowrap">
                  {s}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading subjects…
            </div>
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : (
            <div className="grid sm:grid-cols-2 2xl:grid-cols-3 gap-4">
              {displayed.map((subj) => {
                const level = prefs[subj.id];
                const isSelected = !!level;
                const willingVal = willing[subj.id];
                const isMissingWill = isSelected && !willingVal;

                return (
                  <Card
                    key={subj.id}
                    className={`border transition cursor-pointer ${
                      isSelected
                        ? (isMissingWill ? "border-red-500 ring-1 ring-red-300" : "border-blue-600 ring-1 ring-blue-300")
                        : ""
                    }`}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest("[data-stop]")) return;
                      handleToggle(subj.id);
                    }}
                  >
                    <CardHeader>
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>{subj.code}</span>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="font-medium">{subj.name}</p>

                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {subj.units != null && <Badge variant="outline">{subj.units} units</Badge>}
                        {subj.type && <Badge variant="outline">{subj.type}</Badge>}
                        {subj.gradeLevel && <Badge variant="outline">Grade {subj.gradeLevel}</Badge>}
                        {subj.strand && <Badge variant="outline">{subj.strand}</Badge>}
                      </div>

                      {/* Proficiency */}
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-sm text-muted-foreground">Proficiency</span>
                        <div data-stop className="min-w-0 w-full sm:w-auto">
                          <Select
                            value={level ?? ""}
                            onValueChange={(v) => handleLevelChange(subj.id, v as Proficiency)}
                            disabled={!isSelected}
                          >
                            <SelectTrigger className="w-full sm:w-44 max-w-full">
                              <SelectValue placeholder="Not selected" />
                            </SelectTrigger>
                            <SelectContent
                              position="popper"
                              side="top"
                              align="end"
                              sideOffset={4}
                              className="w-[var(--radix-select-trigger-width)] max-h-64 overflow-auto"
                            >
                              <SelectItem value="beginner">Beginner</SelectItem>
                              <SelectItem value="intermediate">Intermediate</SelectItem>
                              <SelectItem value="advanced">Advanced</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Willingness */}
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-sm text-muted-foreground">Willing to teach?</span>
                        <div data-stop className="min-w-0 w-full sm:w-auto">
                          <Select
                            value={willingVal ?? ""}
                            onValueChange={(v) => handleWillingChange(subj.id, v as Willingness)}
                            disabled={!isSelected}
                          >
                            <SelectTrigger className="w-full sm:w-44 max-w-full">
                              <SelectValue
                                placeholder={
                                  isSelected
                                    ? (isMissingWill ? "Required" : "Choose an option")
                                    : "Select a subject first"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent
                              position="popper"
                              side="top"
                              align="end"
                              sideOffset={4}
                              className="w-[var(--radix-select-trigger-width)] max-h-64 overflow-auto"
                            >
                              <SelectItem value="willing">Willing</SelectItem>
                              <SelectItem value="not_willing">Not willing</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                    </CardContent>
                  </Card>
                );
              })}

              {displayed.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-10">
                  No subjects found with current filters.
                </div>
              )}
            </div>
          )}
        </div>

        {/* LIVE Selection Summary */}
        <Card className="h-min xl:sticky xl:top-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Selection Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Total selected: <span className="font-medium">{selectionSummary.length}</span>
            </div>

            {selectionSummary.length === 0 ? (
              <div className="text-sm text-muted-foreground">No selections yet.</div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
                {selectionSummary.map((row) => (
                  <div key={row.id} className="flex items-start justify-between gap-2 rounded-lg border p-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{row.code} — {row.name}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <ProficiencyBadge value={row.proficiency} />
                        <WillingBadge value={row.willingness} />
                        {row.gradeLevel ? <Badge variant="outline">G{row.gradeLevel}</Badge> : null}
                        {row.strand ? <Badge variant="outline">{row.strand}</Badge> : null}
                      </div>
                    </div>
                    <Button
                      data-stop
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 shrink-0"
                      title="Remove from selection"
                      onClick={() => handleToggle(row.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* PRE-SAVE CONFIRMATION DIALOG — shows ONLY newly added subjects */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm saving preferences?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  You’re about to save <span className="font-medium">{selectionSummary.length}</span>{" "}
                  {selectionSummary.length === 1 ? "preference" : "preferences"} for your account.
                </p>

                <div className="rounded-md border">
                  <div className="px-3 py-2 border-b text-sm font-medium">
                    Newly added subjects
                  </div>
                  <div className="max-h-[260px] overflow-auto p-2 space-y-2">
                    {newSelectionSummary.length === 0 ? (
                      <div className="text-sm text-muted-foreground px-1 py-1">
                        No newly added subjects. (Existing selections may be updated.)
                      </div>
                    ) : (
                      newSelectionSummary.map((row) => (
                        <div key={row.id} className="text-sm">
                          <div className="font-medium">{row.code} — {row.name}</div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            <ProficiencyBadge value={row.proficiency} />
                            <WillingBadge value={row.willingness} />
                            {row.gradeLevel ? <Badge variant="outline">G{row.gradeLevel}</Badge> : null}
                            {row.strand ? <Badge variant="outline">{row.strand}</Badge> : null}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving} onClick={() => setConfirmOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={performSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {saving ? "Saving..." : "Confirm & Save"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Message Box with Summary (unchanged) */}
      <AlertDialog open={successOpen} onOpenChange={setSuccessOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Preferences saved</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  {savedCount} {savedCount === 1 ? "preference has" : "preferences have"} been successfully updated for your account.
                </p>
                {selectionSummary.length > 0 ? (
                  <div className="rounded-md border">
                    <div className="px-3 py-2 border-b text-sm font-medium">
                      Summary of choices
                    </div>
                    <div className="max-h-[260px] overflow-auto p-2 space-y-2">
                      {selectionSummary.map((row) => (
                        <div key={row.id} className="text-sm">
                          <div className="font-medium">{row.code} — {row.name}</div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            <ProficiencyBadge value={row.proficiency} />
                            <WillingBadge value={row.willingness} />
                            {row.gradeLevel ? <Badge variant="outline">G{row.gradeLevel}</Badge> : null}
                            {row.strand ? <Badge variant="outline">{row.strand}</Badge> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No selections to show.</div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setSuccessOpen(false)}>
              Done
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Confirmation */}
      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all preferences?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all saved subject preferences from your account. You can set them again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearPreferences} disabled={clearing}>
              {clearing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {clearing ? "Clearing..." : "Clear"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProfessorSubjects;
