// src/pages/ProfessorSubjects.tsx
import React from "react";
import { BookOpen, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";

import FiltersPanel from "../components/prof-subjects/components/FiltersPanel";
import SubjectCard from "../components/prof-subjects/components/SubjectCard";
import SelectionSummary from "../components/prof-subjects/components/SelectionSummary";

import ConfirmSaveDialog from "../components/prof-subjects/dialogs/ConfirmSaveDialog";
import SuccessDialog from "../components/prof-subjects/dialogs/SuccessDialog";
import ClearDialog from "../components/prof-subjects/dialogs/ClearDialog";

import { useProfessorSubjects } from "../components/prof-subjects/hooks/useProfessorSubjects";

const ProfessorSubjects: React.FC = () => {
  const { user } = useAuth();
  const professorId =
    (user as any)?.prof_id ?? (user as any)?.id ?? (user as any)?.user_id ?? 0;

  const s = useProfessorSubjects(professorId);

  const strandsForTabs = s.allStrands.length
    ? s.allStrands
    : Array.from(
        new Set(
          s.subjects
            .map((x: any) => String(x?.strand ?? "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b));

  return (
    <div className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Subjects
          </h1>
          <p className="text-sm text-muted-foreground">
            Pick the subjects you prefer to handle, rate your proficiency, and
            mark if you’re willing to teach.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={s.clearFilters}>
            Reset Filters
          </Button>
          <Button
            variant="destructive"
            onClick={() => s.setClearOpen(true)}
            disabled={s.clearing}
            title="Remove all saved subject preferences"
          >
            {s.clearing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            {s.clearing ? "Clearing..." : "Clear Preferences"}
          </Button>
          {/* ✅ Enable/disable by hasChanges+validation, and show number of changes */}
          <Button onClick={s.handleSaveClick} disabled={!s.canSubmit}>
            {s.saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            {s.saving ? "Saving..." : `Confirm (${s.changeCount})`}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)_320px] gap-6">
        <FiltersPanel
          query={s.query}
          setQuery={s.setQuery}
          gradeLevel={s.gradeLevel}
          setGradeLevel={s.setGradeLevel}
          selectedCount={s.selectedCount}
          onReset={s.clearFilters}
          gradeOptions={s.GRADE_LEVEL_OPTIONS}
        />

        <div className="min-h-[300px]">
          <Tabs value={s.strand} onValueChange={s.setStrand} className="mb-4">
            <TabsList className="w-full overflow-x-auto">
              <TabsTrigger value="all" className="whitespace-nowrap">
                All
              </TabsTrigger>
              {strandsForTabs.map((t) => (
                <TabsTrigger key={t} value={t} className="whitespace-nowrap">
                  {t}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {s.loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading subjects…
            </div>
          ) : s.error ? (
            <div className="text-red-600">{s.error}</div>
          ) : (
            <div className="grid sm:grid-cols-2 2xl:grid-cols-3 gap-4">
              {s.displayed.map((subj) => {
                const level = s.prefs[subj.id];
                const isSelected = !!level;
                const willingVal = s.willing[subj.id];
                const isMissingWill = isSelected && !willingVal;
                const isLocked = isSelected && s.lockedAssigned.has(subj.id);

                return (
                  <SubjectCard
                    key={subj.id}
                    id={subj.id}
                    code={subj.code}
                    name={subj.name}
                    units={subj.units ?? undefined}
                    type={subj.type ?? undefined}
                    gradeLevel={subj.gradeLevel ?? undefined}
                    strand={subj.strand ?? undefined}
                    isSelected={isSelected}
                    isLocked={isLocked}
                    level={level}
                    willing={willingVal}
                    isMissingWill={isMissingWill}
                    onToggle={() => s.handleToggle(subj.id)}
                    onLevelChange={(v) => s.handleLevelChange(subj.id, v)}
                    onWillingChange={(v) => s.handleWillingChange(subj.id, v)}
                    toastAssignedBlocked={() => {}}
                  />
                );
              })}

              {s.displayed.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-10">
                  No subjects found with current filters.
                </div>
              )}
            </div>
          )}
        </div>

        <SelectionSummary
          rows={s.selectionSummary}
          lockedAssigned={s.lockedAssigned}
          onRemove={(id) => {
            s.setPrefs((prev) => {
              const next = { ...prev };
              delete next[id];
              s.setWilling((w) => {
                const c = { ...w };
                delete c[id];
                return c;
              });
              return next;
            });
          }}
        />
      </div>

      <ConfirmSaveDialog
        open={s.confirmOpen}
        setOpen={s.setConfirmOpen}
        saving={s.saving}
        selectionCount={s.selectionSummary.length}
        addedRows={s.addedRows}
        updatedRows={s.updatedRows}
        removedRows={s.removedRows}
        onConfirm={s.performSave}
      />

      <SuccessDialog
        open={s.successOpen}
        setOpen={s.setSuccessOpen}
        savedCount={s.savedCount}
        summary={s.selectionSummary}
      />

      <ClearDialog
        open={s.clearOpen}
        setOpen={s.setClearOpen}
        clearing={s.clearing}
        onClear={s.handleClearPreferences}
      />
    </div>
  );
};

export default ProfessorSubjects;
