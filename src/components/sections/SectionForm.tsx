import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import SuccessMessage from "@/components/popupmsg/SuccessMessage";
import { AlertTriangle } from "lucide-react";

const SUBJECTS_URL = "https://spcc-scheduler.site/subjects.php";
const SECTION_SUBJECTS_URL = "https://spcc-scheduler.site/section_subjects.php";

const formSchema = z.object({
  section_name: z
    .string({ required_error: "Please enter section name" })
    .min(1, "Section name is required")
    .max(50, "Section name must be less than 50 characters")
    .regex(/^[A-Za-z0-9\s-]+$/, "Only letters, numbers, spaces, and hyphens"),
  grade_level: z.enum(["11", "12"], { required_error: "Please select a grade level" }),
  number_of_students: z
    .string()
    .refine((val) => {
      const num = parseInt(val);
      return !isNaN(num) && num >= 0;
    }, "Number of students must be a non-negative number"),
  strand: z.string({ required_error: "Please select a strand" }).max(10, "Strand must be less than 10 characters"),
  subjects: z.array(z.number()).default([]),
});

interface Section {
  section_id: number;
  section_name: string;
  grade_level: "11" | "12";
  number_of_students: number;
  strand: string;
  room?: {
    id: number;
    number: number;
    type: string;
    capacity: number;
  } | null;
}

interface SectionFormProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSectionAdded: () => void;
  sections: Section[];
  editingSection?: Section | null;
}

interface Room {
  id: number;
  number: number;
  type: string;
  capacity: number;
}

type Subject = {
  id: number;
  code?: string;
  name: string;
  strand?: string;
  grade_level?: string | number;
  units?: number;
};

const SectionForm: React.FC<SectionFormProps> = ({
  open = false,
  onOpenChange,
  onSectionAdded,
  sections,
  editingSection,
}) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const { toast } = useToast();
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      section_name: "",
      grade_level: "11",
      number_of_students: "",
      strand: "",
      subjects: [],
    },
  });

  useEffect(() => {
    const values: z.infer<typeof formSchema> = editingSection
      ? {
          section_name: editingSection.section_name ?? "",
          grade_level: (editingSection.grade_level as "11" | "12") ?? "11",
          number_of_students:
            editingSection.number_of_students != null ? String(editingSection.number_of_students) : "",
          strand: editingSection.strand ?? "",
          subjects: [],
        }
      : {
          section_name: "",
          grade_level: "11",
          number_of_students: "",
          strand: "",
          subjects: [],
        };

    if (open) {
      form.reset(values);
      if (editingSection?.section_id) {
        axios
          .get(SECTION_SUBJECTS_URL, { params: { section_id: editingSection.section_id } })
          .then((res) => {
            const ids: number[] = res?.data?.subject_ids || res?.data?.subjects?.map((s: any) => Number(s.id)) || [];
            if (Array.isArray(ids)) {
              form.setValue(
                "subjects",
                ids.filter((x) => typeof x === "number" && !isNaN(x))
              );
            }
          })
          .catch(() => {});
      }
    }
  }, [editingSection, open]); // eslint-disable-line

  const watchGrade = form.watch("grade_level");
  const watchStrand = form.watch("strand");

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const fetchSubjects = async () => {
      try {
        const params: any = {};
        if (watchGrade) params.grade_level = watchGrade;
        if (watchStrand) params.strand = watchStrand;
        const res = await axios.get(SUBJECTS_URL, { params, signal: controller.signal });
        const raw = Array.isArray(res.data) ? res.data : res.data?.data || [];
        const list: Subject[] = raw
          .map((row: any) => {
            const id = Number(row.subj_id ?? row.subject_id ?? row.id ?? row.ID);
            const code = (row.subj_code ?? row.subject_code ?? row.code ?? "").toString().trim();
            const name =
              (
                row.subj_name ??
                row.subject_name ??
                row.name ??
                row.title ??
                row.subj_description ??
                row.description ??
                ""
              ).toString().trim() || code || (id ? `Subject ${id}` : "Untitled");
            return {
              id,
              code: code || undefined,
              name,
              strand: row.strand ?? row.track ?? undefined,
              grade_level: row.grade_level ?? row.grade ?? undefined,
              units: row.units != null ? Number(row.units) : undefined,
            };
          })
          .filter((s: Subject) => Number.isFinite(s.id));
        setAllSubjects(list);
      } catch {
        toast({
          title: "Couldn’t load subjects",
          description: "The subject list failed to load. You can try again or continue.",
          variant: "destructive",
        });
      }
    };
    fetchSubjects();
    return () => controller.abort();
  }, [open, watchGrade, watchStrand]); // eslint-disable-line

  const selectedSubjectIds = form.watch("subjects");
  const selectedSubjects = useMemo(
    () => allSubjects.filter((s) => selectedSubjectIds.includes(s.id)),
    [allSubjects, selectedSubjectIds]
  );

  const upsertSectionSubjects = async (sectionId: number, ids: number[]) => {
    try {
      setAssigning(true);
      const method = editingSection ? "put" : "post";
      const res = await axios[method](SECTION_SUBJECTS_URL, { section_id: sectionId, subject_ids: ids });
      const ok =
        res?.data?.success || res?.data?.status === "success" || res?.status === 200 || res?.status === 201;
      if (!ok) throw new Error(res?.data?.message || "Assigning subjects failed");
      return true;
    } catch (e: any) {
      toast({
        title: "Subject assignment failed",
        description:
          e?.message ||
          "We saved the section, but assigning subjects ran into an issue. You can retry in the section page.",
        variant: "destructive",
      });
      return false;
    } finally {
      setAssigning(false);
    }
  };

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    setError(null);
    try {
      const isDuplicate = sections.some(
        (section) =>
          section.section_name.toLowerCase() === values.section_name.toLowerCase() &&
          (!editingSection || section.section_id !== editingSection.section_id)
      );
      if (isDuplicate) {
        setError("A section with this name already exists");
        return;
      }

      const payload = {
        section_name: values.section_name,
        grade_level: values.grade_level,
        number_of_students: values.number_of_students,
        strand: values.strand,
        subject_ids: values.subjects || [],
      };

      let response;
      if (editingSection) {
        response = await axios.put(
          `https://spcc-scheduler.site/sections.php?id=${editingSection.section_id}`,
          payload
        );
      } else {
        response = await axios.post("https://spcc-scheduler.site/sections.php", payload);
      }

      const ok =
        response?.data?.success ||
        response?.data?.status === "success" ||
        response?.data?.message?.toString()?.toLowerCase()?.includes("success") ||
        (response?.status && response.status >= 200 && response.status < 300);

      if (!ok) {
        throw new Error(response?.data?.message || "Failed to save the section");
      }

      const sectionId: number =
        Number(
          response?.data?.section?.section_id ??
            response?.data?.section?.id ??
            response?.data?.section_id ??
            response?.data?.id ??
            response?.data?.data?.section_id ??
            response?.data?.data?.id
        ) || Number(editingSection?.section_id);

      if (sectionId && Array.isArray(values.subjects)) {
        await upsertSectionSubjects(sectionId, values.subjects);
      }

      setSuccessMessage(`Section ${editingSection ? "updated" : "created"} successfully`);
      setShowSuccess(true);
      onSectionAdded?.();
      onOpenChange?.(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error saving section";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[520px]" key={editingSection ? editingSection.section_id : "new"}>
          <DialogHeader>
            <DialogTitle>{editingSection ? "Edit Section" : "Add New Section"}</DialogTitle>
            <DialogDescription>
              {editingSection ? "Update the section information below." : "Fill in the details to create a new section."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <FormField
                control={form.control}
                name="section_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter section name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="grade_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grade Level</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select grade level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="11">Grade 11</SelectItem>
                          <SelectItem value="12">Grade 12</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="strand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Strand</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select strand" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="STEM">STEM</SelectItem>
                          <SelectItem value="HUMSS">HUMSS</SelectItem>
                          <SelectItem value="GAS">GAS</SelectItem>
                          <SelectItem value="ABM">ABM</SelectItem>
                          <SelectItem value="TVL">TVL</SelectItem>
                          <SelectItem value="ICT">ICT</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="number_of_students"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Students</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter number of students"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subjects"
                render={() => (
                  <FormItem>
                    <FormLabel>Assign Subjects</FormLabel>
                    {allSubjects.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No subjects available for this grade level and strand.</p>
                    ) : (
                      <div className="max-h-[220px] overflow-y-auto border rounded-md p-3 space-y-2">
                        {allSubjects.map((subject) => {
                          const checked = form.watch("subjects").includes(subject.id);
                          return (
                            <div key={subject.id} className="flex items-start space-x-2 border-b border-muted/30 pb-2 last:border-0 last:pb-0">
                              <input
                                id={`subject-${subject.id}`}
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  const selected = form.getValues("subjects");
                                  if (checked) {
                                    form.setValue("subjects", selected.filter((id) => id !== subject.id));
                                  } else {
                                    form.setValue("subjects", [...selected, subject.id]);
                                  }
                                }}
                                className="mt-[2px] h-4 w-4 accent-primary"
                              />
                              <label htmlFor={`subject-${subject.id}`} className="flex-1 text-sm leading-tight cursor-pointer">
                                <span className="font-medium">{subject.code || `Subject ${subject.id}`}</span>
                                <br />
                                <span className="text-muted-foreground text-xs">
                                  {subject.name}
                                  {subject.strand ? ` • ${subject.strand}` : ""}
                                  {subject.grade_level ? ` • Grade ${subject.grade_level}` : ""}
                                </span>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-2">List automatically filters by grade level and strand.</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)} disabled={loading || assigning}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || assigning}>
                  {loading || assigning ? (editingSection ? "Saving…" : "Creating…") : editingSection ? "Save Changes" : "Create Section"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <SuccessMessage isOpen={showSuccess} onClose={() => setShowSuccess(false)} message={successMessage} />
    </>
  );
};

export default SectionForm;
