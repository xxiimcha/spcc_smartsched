import React, { useEffect, useState } from "react";
import axios from "axios";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/use-toast";

export interface SectionRef {
  section_id: number;
  section_name: string;
  strand: string;
  grade_level: "11" | "12";
  subject_ids?: number[];
}

export interface Subject {
  subj_id: number;
  subj_code: string;
  subj_name: string;
  subj_description?: string | null;
  schedule_count: number;
  strand?: string | null;
  grade_level?: "11" | "12" | null;
}

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  section: SectionRef | null;
  apiBase?: string;
  onSaved?: () => void;
};

const AssignSubjectsDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  section,
  apiBase = "https://spcc-scheduler.site",
  onSaved,
}) => {
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchAssignedIds = async (sectionId: number): Promise<number[]> => {
    try {
      const res = await axios.get(`${apiBase}/sections.php`, { params: { id: sectionId } });
      const ids = res?.data?.data?.subject_ids;
      return Array.isArray(ids) ? ids.map((n: any) => Number(n)) : [];
    } catch {
      return [];
    }
  };

  const loadSubjects = async () => {
    if (!section) return;
    try {
      setLoading(true);
      let res = await axios.get(`${apiBase}/subjects.php`, {
        params: { grade_level: section.grade_level, strand: section.strand },
      });

      let list: Subject[] = [];
      if (res.data?.success && Array.isArray(res.data.data)) {
        list = res.data.data as Subject[];
      } else {
        res = await axios.get(`${apiBase}/subjects.php`);
        if (!res.data?.success || !Array.isArray(res.data.data)) {
          throw new Error("Failed to load subjects");
        }
        const all = res.data.data as Subject[];
        list = all.filter(
          (s) =>
            String(s.grade_level ?? "") === section.grade_level &&
            String((s.strand ?? "").toLowerCase()) === section.strand.toLowerCase()
        );
      }

      setAllSubjects(list);

      let assignedIds = Array.isArray(section.subject_ids)
        ? section.subject_ids
        : await fetchAssignedIds(section.section_id);

      const present = new Set(list.map((s) => s.subj_id));
      const prechecked = new Set<number>();
      assignedIds.forEach((id) => {
        if (present.has(id)) prechecked.add(Number(id));
      });
      setSelected(prechecked);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Error",
        description: e?.message || "Failed to load subjects.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadSubjects();
  }, [open, section?.section_id, section?.grade_level, section?.strand]);

  const toggle = (id: number) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const save = async () => {
    if (!section) return;
    try {
      setSaving(true);
      const res = await axios.put(`${apiBase}/sections.php?id=${section.section_id}`, {
        subj_ids: Array.from(selected),
      });
      if (!res.data?.success) throw new Error(res.data?.message || "Failed to save");
      toast({ title: "Saved", description: "Subjects assigned to section." });
      onOpenChange(false);
      onSaved?.();
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Error",
        description: e?.message || "Failed to save changes.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Assign Subjects{" "}
            {section ? `• ${section.section_name} (Grade ${section.grade_level} • ${section.strand})` : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-md border">
          <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30 text-sm">
            <span>Total subjects: {allSubjects.length}</span>
            <span>Selected: {selected.size}</span>
          </div>

          <div className="max-h-[420px] overflow-auto divide-y">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
              </div>
            ) : allSubjects.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No subjects found matching this grade level & strand.
              </div>
            ) : (
              allSubjects.map((s) => {
                const isChecked = selected.has(s.subj_id);
                return (
                  <label
                    key={s.subj_id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 cursor-pointer"
                  >
                    <Checkbox checked={isChecked} onCheckedChange={() => toggle(s.subj_id)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="font-medium truncate">
                          {s.subj_code} — {s.subj_name}
                        </div>
                        <div className="text-xs text-muted-foreground shrink-0">
                          used in {s.schedule_count} schedule{s.schedule_count === 1 ? "" : "s"}
                        </div>
                      </div>
                      {s.subj_description && (
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {s.subj_description}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={saving || loading} onClick={save}>
            {saving ? "Saving..." : "Save Assignments"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignSubjectsDialog;
