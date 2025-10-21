// src/pages/ProfessorSubjects.tsx
import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, Search, CheckCircle2, Loader2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiService, SubjectDTO } from "@/services/apiService";

type Proficiency = "beginner" | "intermediate" | "advanced";
type PrefMap = Record<number, Proficiency | undefined>;

// Supports both SHS (11/12) and College (1st–4th)
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

  // ui state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // derive unique strand options from loaded subjects
  const uniqueStrands = useMemo(() => {
    const s = new Set<string>();
    subjects.forEach((x) => {
      const v = (x.strand ?? "").toString().trim();
      if (v) s.add(v);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [subjects]);

  // fetch subjects (server-side filtering) + load existing prefs once
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
        setSubjects(Array.isArray(res.data) ? res.data : []);

        // optional: load existing preferences only the first time
        if (Object.keys(prefs).length === 0) {
          try {
            const prefRes = await apiService.getProfessorSubjectPreferences(professorId);
            const initial: PrefMap = {};
            const arr = Array.isArray(prefRes.data) ? prefRes.data : [];
            arr.forEach((p: any) => {
              const lvl = String(p.proficiency || "").toLowerCase();
              if (["beginner", "intermediate", "advanced"].includes(lvl)) {
                initial[Number(p.subj_id)] = lvl as Proficiency;
              }
            });
            if (!alive) return;
            if (Object.keys(initial).length) setPrefs(initial);
          } catch {
            // endpoint optional; ignore errors
          }
        }

        setError(null);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "Failed to load subjects");
      } finally {
        if (alive) setLoading(false);
      }
    }, 250); // debounce a bit

    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, gradeLevel, strand, professorId]);

  // local safety filter in case backend ignores any param
  const displayed = useMemo(() => {
    const q = query.trim().toLowerCase();
    return subjects.filter((s) => {
      const byQ = !q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
      const byGrade = gradeLevel === "all" || String(s.gradeLevel ?? "").toLowerCase() === gradeLevel.toLowerCase();
      const byStrand = strand === "all" || String(s.strand ?? "").toLowerCase() === strand.toLowerCase();
      return byQ && byGrade && byStrand;
    });
  }, [subjects, query, gradeLevel, strand]);

  const selectedCount = useMemo(
    () => Object.values(prefs).filter(Boolean).length,
    [prefs]
  );

  const handleToggle = (id: number) => {
    setPrefs((prev) => {
      const current = prev[id];
      if (!current) return { ...prev, [id]: "beginner" }; // default level on select
      const next = { ...prev };
      delete next[id]; // deselect
      return next;
    });
  };

  const handleLevelChange = (id: number, level: Proficiency) => {
    setPrefs((prev) => ({ ...prev, [id]: level }));
  };

  const clearFilters = () => {
    setQuery("");
    setGradeLevel("all");
    setStrand("all");
  };

  const handleSave = async () => {
    const selections = Object.entries(prefs)
      .filter(([, v]) => !!v)
      .map(([k, v]) => ({ subj_id: Number(k), proficiency: v as Proficiency }));

    if (!professorId || selections.length === 0) {
      toast({ title: "Nothing to save", description: "Select at least one subject.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const res = await apiService.saveProfessorSubjectPreferences(professorId, selections);
      if (res.success) {
        toast({ title: "Preferences saved", description: "Your subject preferences have been updated." });
      } else {
        toast({ title: "Save failed", description: res.message || "Please try again.", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

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
            Pick the subjects you prefer to handle and rate your proficiency.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={clearFilters}>Reset Filters</Button>
          <Button onClick={handleSave} disabled={saving || selectedCount === 0}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            {saving ? "Saving..." : `Confirm (${selectedCount})`}
          </Button>
        </div>
      </div>

      {/* Two-pane layout: Filters | Results */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-6">
        {/* Filters Panel */}
        <Card className="h-min lg:sticky lg:top-4">
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

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Strand</div>
              <Select value={strand} onValueChange={setStrand}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {uniqueStrands.map((s) => (
                    <SelectItem key={s} value={s.toLowerCase()}>{s}</SelectItem>
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
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading subjects…
            </div>
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {displayed.map((subj) => {
                const level = prefs[subj.id];
                const isSelected = !!level;
                return (
                  <Card
                    key={subj.id}
                    className={`border transition cursor-pointer ${
                      isSelected ? "border-blue-600 ring-1 ring-blue-300" : ""
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

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Proficiency</span>
                        <div data-stop>
                          <Select
                            value={level ?? ""}
                            onValueChange={(v) => handleLevelChange(subj.id, v as Proficiency)}
                            disabled={!isSelected}
                          >
                            <SelectTrigger className="w-44">
                              <SelectValue placeholder="Not selected" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="beginner">Beginner</SelectItem>
                              <SelectItem value="intermediate">Intermediate</SelectItem>
                              <SelectItem value="advanced">Advanced</SelectItem>
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
      </div>
    </div>
  );
};

export default ProfessorSubjects;
