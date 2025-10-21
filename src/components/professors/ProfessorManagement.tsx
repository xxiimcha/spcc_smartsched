import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  KeyRound,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileSpreadsheet,
  FileText,
  List as ListIcon, // NEW
} from "lucide-react";
import { apiService } from "@/services/apiService";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import ProfessorForm from "./ProfessorForm";
import SuccessMessage from "../popupmsg/SuccessMessage";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Subject = {
  id: string;
  subj_name: string;
  subj_code?: string;
  grade_level?: string | number;
  strand?: string;
};

interface Professor {
  id: string;             // prof_id
  user_id?: string;       // NEW: we’ll store this for convenience
  name: string;
  email?: string;
  phone?: string;
  username?: string;
  password?: string;
  subjectCount?: number;
  subject_count?: number;
  subjects?: Subject[];
  subject_ids?: (string | number)[];
}

type PrefItem = {
  subj_id: number;
  proficiency: "beginner" | "intermediate" | "advanced";
  // optional details if we can fetch them:
  subj_name?: string;
  subj_code?: string;
  grade_level?: string | number;
  strand?: string;
};

const PAGE_SIZES = [10, 25, 50];
const SUBJECT_PAGE_SIZES = [5, 10, 20];

const ProfessorManagement = () => {
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProfessor, setSelectedProfessor] = useState<Professor | null>(null);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [activeTabById, setActiveTabById] = useState<Record<string, string>>({});
  const [subjectsLoadedIds, setSubjectsLoadedIds] = useState<Record<string, boolean>>({});
  const [loadingSubjectsIds, setLoadingSubjectsIds] = useState<Record<string, boolean>>({});
  const [subjectGradeFilter, setSubjectGradeFilter] = useState<Record<string, string>>({});
  const [subjectStrandFilter, setSubjectStrandFilter] = useState<Record<string, string>>({});
  const [subjectPageById, setSubjectPageById] = useState<Record<string, number>>({});
  const [subjectPageSizeById, setSubjectPageSizeById] = useState<Record<string, number>>({});

  // NEW: Assign modal state
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignFor, setAssignFor] = useState<Professor | null>(null);
  const [prefLoading, setPrefLoading] = useState(false);
  const [prefList, setPrefList] = useState<PrefItem[]>([]);
  const [assignPick, setAssignPick] = useState<Record<number, boolean>>({});
  const [assignSaving, setAssignSaving] = useState(false);

  const { toast } = useToast();

  const subjectLoadCount = (p?: Professor | null) =>
    Number(
      p?.subjectCount ??
        p?.subject_count ??
        (Array.isArray(p?.subjects) ? p!.subjects!.length : undefined) ??
        (Array.isArray(p?.subject_ids) ? p!.subject_ids!.length : 0)
    );

  const getWorkloadStatusClass = (subjectCount: number) => {
    if (subjectCount >= 8) return "text-destructive font-medium";
    if (subjectCount >= 6) return "text-amber-500 font-medium";
    return "text-emerald-600 font-medium";
  };
  const getWorkloadStatusText = (subjectCount: number) => {
    if (subjectCount >= 8) return `${subjectCount} subjects (Maximum)`;
    if (subjectCount >= 6) return `${subjectCount} subjects (Warning)`;
    return `${subjectCount} subjects`;
  };

  const normalizeGrade = (val: any): string => {
    if (val === undefined || val === null || String(val).trim() === "") return "Unknown Grade";
    const s = String(val).replace(/grade\s*/i, "").trim();
    return s === "" ? "Unknown Grade" : `Grade ${s}`;
  };

  const normalizeStrand = (val: any): string => {
    if (val === undefined || val === null || String(val).trim() === "") return "Unknown Strand";
    return String(val).toUpperCase();
  };

  useEffect(() => {
    fetchProfessors();
  }, []);

  const fetchProfessors = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getProfessors();
      if (response.success && Array.isArray(response.data)) {
        const mappedProfessors = response.data.map((prof: any) => {
          const id = (prof.prof_id ?? prof.id)?.toString?.();
          const name = String(prof.prof_name ?? prof.name ?? "").trim();

          const subjCount = Number(
            prof.subj_count ??
              prof.subjectCount ??
              prof.subject_count ??
              prof.subjects_count ??
              (Array.isArray(prof.subjects) ? prof.subjects.length : undefined) ??
              (Array.isArray(prof.subject_ids) ? prof.subject_ids.length : 0)
          );

          return {
            id,
            user_id: prof.user_id?.toString?.(), // NEW
            name,
            email: prof.prof_email ?? prof.email,
            phone: prof.prof_phone ?? prof.phone,
            username: prof.prof_username ?? prof.username,
            password: prof.prof_password ?? prof.password,
            subject_ids: prof.subject_ids ?? [],
            subjectCount: subjCount,
          } as Professor;
        });

        setProfessors(mappedProfessors);
        setSubjectsLoadedIds({});
        setLoadingSubjectsIds({});
      } else {
        setProfessors([]);
        if (!response.success) throw new Error(response.message || "Failed to fetch professors");
      }
    } catch (err) {
      setError("Failed to load professors. Please try again later.");
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Could not fetch professors from the server.",
      });
    } finally {
      setLoading(false);
    }
  };

  const addProfessor = async (professorData: Omit<Professor, "id">) => {
    try {
      const response = await fetch("https://spcc-scheduler.site/professors.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(professorData),
      });
      const result = await response.json();
      if (result.status === "error") throw new Error(result.message || "Failed to add professor");
      await fetchProfessors();
      setSuccessMessage(`Professor ${professorData.name} added successfully!`);
      setIsSuccessDialogOpen(true);
      setIsAddDialogOpen(false);
      return true;
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to add professor: ${err instanceof Error ? err.message : String(err)}`,
      });
      return false;
    }
  };

  const updateProfessor = async (id: string, professorData: Omit<Professor, "id">) => {
    try {
      const response = await fetch(`https://spcc-scheduler.site/professors.php?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(professorData),
      });
      const result = await response.json();
      if (result.status === "error") throw new Error(result.message || "Failed to update professor");
      await fetchProfessors();
      setIsEditDialogOpen(false);
      setSuccessMessage(`Professor ${professorData.name} updated successfully!`);
      setIsSuccessDialogOpen(true);
      return true;
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update professor. Please try again.",
      });
      return false;
    }
  };

  const deleteProfessor = async (id: string) => {
    try {
      const response = await fetch(`https://spcc-scheduler.site/professors.php?id=${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (result.status === "error") throw new Error(result.message || "Failed to delete professor");
      await fetchProfessors();
      setIsDeleteDialogOpen(false);
      const professorName = selectedProfessor?.name || "Professor";
      setSuccessMessage(`${professorName} deleted successfully!`);
      setIsSuccessDialogOpen(true);
      return true;
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete professor. Please try again.",
      });
      return false;
    }
  };

  // ---------- Reset Password ----------
  const generateTempPassword = (len = 10) => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
    return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };

  const resetPassword = async (prof: Professor) => {
    try {
      const temp = generateTempPassword();
      const res = await fetch(`https://spcc-scheduler.site/professors.php?id=${prof.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: temp }),
      });
      const json = await res.json();
      if (json.status === "error") throw new Error(json.message || "Failed to reset password");

      await fetchProfessors();

      const emailMsg =
        json.email?.sent === true
          ? "An email notification was sent to the professor."
          : "Password updated but email notification failed.";

      setSuccessMessage(
        `Password for ${prof.name} has been reset.\n\nTemporary Password: ${temp}\n\n${emailMsg}`
      );
      setIsSuccessDialogOpen(true);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Reset failed",
        description: err instanceof Error ? err.message : "Could not reset password.",
      });
    }
  };

  // ----- Subjects fetchers (existing) -----
  const fetchSubjectsFromProfessorsAPI = async (professorId: string): Promise<Subject[] | null> => {
    try {
      const res = await fetch(`https://spcc-scheduler.site/professors.php?id=${professorId}`);
      const json = await res.json();
      if (json?.status === "success" && Array.isArray(json?.data?.subjects)) {
        return json.data.subjects.map((s: any) => ({
          id: String(s.subj_id),
          subj_name: s.subj_name,
          subj_code: s.subj_code,
          grade_level: s.grade_level ?? s.grade ?? s.year_level,
          strand: s.strand ?? s.track ?? s.strand_code,
        }));
      }
    } catch {}
    return null;
  };

  const fetchSubjectsFromListAPI = async (professorId: string): Promise<Subject[]> => {
    try {
      const res = await fetch(
        `https://spcc-scheduler.site/get_list_of_subjects.php?professor_id=${professorId}`
      );
      const data = await res.json();
      if (data?.status === "success" && Array.isArray(data.subjects)) {
        return data.subjects.map((s: any) => ({
          id: s.subj_id?.toString?.() ?? String(s.subj_id ?? ""),
          subj_name: s.subj_name ?? "",
          subj_code: s.subj_code ?? "",
          grade_level: s.grade_level ?? s.grade ?? s.year_level,
          strand: s.strand ?? s.track ?? s.strand_code,
        }));
      }
    } catch {}
    return [];
  };

  const ensureSubjectsFor = async (p: Professor) => {
    if (Array.isArray(p.subjects)) return p;
    setLoadingSubjectsIds((m) => ({ ...m, [p.id]: true }));
    let subjects: Subject[] | null = await fetchSubjectsFromProfessorsAPI(p.id);
    if (!subjects) {
      subjects = await fetchSubjectsFromListAPI(p.id);
    }
    setLoadingSubjectsIds((m) => ({ ...m, [p.id]: false }));
    setSubjectsLoadedIds((m) => ({ ...m, [p.id]: true }));
    setSubjectPageById((m) => ({ ...m, [p.id]: 1 }));
    setSubjectPageSizeById((m) => ({ ...m, [p.id]: SUBJECT_PAGE_SIZES[1] }));
    setSubjectGradeFilter((m) => ({ ...m, [p.id]: "ALL" }));
    setSubjectStrandFilter((m) => ({ ...m, [p.id]: "ALL" }));
    setProfessors((prev) =>
      prev.map((x) =>
        x.id === p.id ? { ...x, subjects, subject_count: subjects.length, subjectCount: subjects.length } : x
      )
    );
    return { ...p, subjects };
  };

  const handleTabChange = async (profId: string, nextTab: string) => {
    setActiveTabById((m) => ({ ...m, [profId]: nextTab }));
    if (nextTab === "subjects") {
      const prof = professors.find((x) => x.id === profId);
      if (
        prof &&
        (!subjectsLoadedIds[profId] || !Array.isArray(prof.subjects) || prof.subjects.length === 0)
      ) {
        await ensureSubjectsFor(prof);
      }
    }
  };

  // ---------- Export helpers ----------
  const toFlatRows = (list: Professor[]) => {
    const rows: Array<[string, string, string, string]> = [];
    list.forEach((p) => {
      const email = p.email || "N/A";
      if (!p.subjects || p.subjects.length === 0) {
        rows.push([p.name, email, "—", "No subjects"]);
      } else {
        p.subjects.forEach((s) => {
          rows.push([p.name, email, s.subj_code || "N/A", s.subj_name || ""]);
        });
      }
    });
    return rows;
  };

  const exportToExcel = async () => {
    try {
      const enriched = await Promise.all(
        filteredProfessors.map((p) => (Array.isArray(p.subjects) ? p : ensureSubjectsFor(p)))
      );
      const rows = toFlatRows(enriched as Professor[]);
      const header = ["Professor", "Email", "Subject Code", "Subject Name"];
      const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
      ws["!cols"] = [{ wch: 28 }, { wch: 28 }, { wch: 16 }, { wch: 48 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Professors-Subjects");
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      XLSX.writeFile(wb, `professors-subjects_${stamp}.xlsx`);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Export failed",
        description: err instanceof Error ? err.message : "Could not export to Excel.",
      });
    }
  };

  const exportToPDF = async () => {
    try {
      const enriched = await Promise.all(
        filteredProfessors.map((p) => (Array.isArray(p.subjects) ? p : ensureSubjectsFor(p)))
      );
      const rows = toFlatRows(enriched as Professor[]);
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const title = "Professors and Assigned Subjects";
      doc.setFontSize(14);
      doc.text(title, 40, 40);
      autoTable(doc, {
        startY: 60,
        head: [["Professor", "Email", "Subject Code", "Subject Name"]],
        body: rows,
        styles: { fontSize: 9, cellPadding: 6 },
        headStyles: { fillColor: undefined },
        columnStyles: { 0: { cellWidth: 180 }, 1: { cellWidth: 200 }, 2: { cellWidth: 120 }, 3: { cellWidth: "auto" } },
      });
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      doc.save(`professors-subjects_${stamp}.pdf`);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Export failed",
        description: err instanceof Error ? err.message : "Could not export to PDF.",
      });
    }
  };

  // ---------- Preferred subjects (NEW) ----------
  const fetchPreferred = async (prof: Professor): Promise<PrefItem[]> => {
    // The PHP we added accepts either prof_id or user_id; we’ll pass prof_id.
    const url = `https://spcc-scheduler.site/professor_subject_preferences.php?prof_id=${prof.id}`;
    const res = await fetch(url);
    const json = await res.json();
    if (json?.status !== "success" || !Array.isArray(json?.data)) return [];
    // coerce into PrefItem
    return json.data.map((r: any) => ({
      subj_id: Number(r.subj_id),
      proficiency: (String(r.proficiency || "").toLowerCase() as PrefItem["proficiency"]) || "beginner",
    }));
  };

  // Try to get subject details by a vector of IDs. If this endpoint doesn’t exist yet,
  // it will simply skip details and we’ll still show the IDs.
  const fetchSubjectDetailsByIds = async (ids: number[]) => {
    if (!ids.length) return {} as Record<number, Partial<PrefItem>>;
    try {
      const qs = ids.join(",");
      const r = await fetch(`https://spcc-scheduler.site/subjects.php?ids=${qs}`);
      const j = await r.json();
      if (j?.status === "success" && Array.isArray(j?.data)) {
        const map: Record<number, Partial<PrefItem>> = {};
        j.data.forEach((s: any) => {
          const key = Number(s.subj_id);
          map[key] = {
            subj_name: s.subj_name,
            subj_code: s.subj_code,
            grade_level: s.grade_level ?? s.grade ?? s.year_level,
            strand: s.strand ?? s.track ?? s.strand_code,
          };
        });
        return map;
      }
    } catch {}
    return {} as Record<number, Partial<PrefItem>>;
  };

  const openAssignModal = async (prof: Professor) => {
    setAssignFor(prof);
    setPrefLoading(true);
    setAssignOpen(true);
    try {
      const base = await fetchPreferred(prof);
      const idList = base.map((b) => b.subj_id);
      const detailsMap = await fetchSubjectDetailsByIds(idList);
      const merged = base.map((b) => ({ ...b, ...(detailsMap[b.subj_id] || {}) }));
      setPrefList(merged);
      // Pre-select what’s currently assigned intersect preferred
      const assigned = new Set<number>((prof.subject_ids || []).map((v: any) => Number(v)));
      const picks: Record<number, boolean> = {};
      merged.forEach((m) => {
        picks[m.subj_id] = assigned.has(m.subj_id);
      });
      setAssignPick(picks);
    } catch (e) {
      setPrefList([]);
      setAssignPick({});
      toast({
        variant: "destructive",
        title: "Failed to load preferred subjects",
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setPrefLoading(false);
    }
  };

  const togglePick = (sid: number) => {
    setAssignPick((m) => ({ ...m, [sid]: !m[sid] }));
  };

  const setAllPick = (value: boolean) => {
    const next: Record<number, boolean> = {};
    prefList.forEach((p) => (next[p.subj_id] = value));
    setAssignPick(next);
  };

  const saveAssignment = async () => {
    if (!assignFor) return;
    const chosen = Object.entries(assignPick)
      .filter(([, v]) => v)
      .map(([k]) => Number(k));
    try {
      setAssignSaving(true);
      const res = await fetch(`https://spcc-scheduler.site/professors.php?id=${assignFor.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject_ids: chosen }),
      });
      const json = await res.json();
      if (json?.status === "error") throw new Error(json?.message || "Failed to assign subjects");
      setAssignOpen(false);
      setAssignFor(null);
      await fetchProfessors();
      setSuccessMessage("Subjects assigned from preferred list.");
      setIsSuccessDialogOpen(true);
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Assign failed",
        description: e instanceof Error ? e.message : "Could not save assignments.",
      });
    } finally {
      setAssignSaving(false);
    }
  };

  // ---------- Filtering & pagination ----------
  const filteredProfessors = useMemo(
    () =>
      professors.filter(
        (prof) =>
          prof.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          prof.email?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [professors, searchQuery]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, pageSize]);

  const totalItems = filteredProfessors.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pageStartIndex = (currentPage - 1) * pageSize;
  const pageEndIndex = Math.min(pageStartIndex + pageSize, totalItems);
  const paginatedProfessors = filteredProfessors.slice(pageStartIndex, pageEndIndex);

  const gotoFirst = () => setCurrentPage(1);
  const gotoPrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const gotoNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));
  const gotoLast = () => setCurrentPage(totalPages);

  const uniqueGradesFor = (subs: Subject[]) => {
    const set = new Set<string>();
    subs.forEach((s) => set.add(normalizeGrade(s.grade_level)));
    return Array.from(set).sort((a, b) => {
      const na = parseInt(a.replace(/\D/g, "") || "0", 10);
      const nb = parseInt(b.replace(/\D/g, "") || "0", 10);
      if (isNaN(na) && isNaN(nb)) return a.localeCompare(b);
      if (isNaN(na)) return 1;
      if (isNaN(nb)) return -1;
      return na - nb;
    });
  };
  const uniqueStrandsFor = (subs: Subject[]) => {
    const set = new Set<string>();
    subs.forEach((s) => set.add(normalizeStrand(s.strand)));
    return Array.from(set).sort();
  };

  const filteredSubjectsFor = (p: Professor) => {
    const subs = p.subjects || [];
    const gradeSel = subjectGradeFilter[p.id] || "ALL";
    const strandSel = subjectStrandFilter[p.id] || "ALL";
    return subs.filter((s) => {
      const g = normalizeGrade(s.grade_level);
      const st = normalizeStrand(s.strand);
      const gOk = gradeSel === "ALL" || g === gradeSel;
      const stOk = strandSel === "ALL" || st === strandSel;
      return gOk && stOk;
    });
  };

  const subjectPaginationState = (id: string) => {
    const page = subjectPageById[id] ?? 1;
    const size = subjectPageSizeById[id] ?? SUBJECT_PAGE_SIZES[1];
    return { page, size };
  };

  const setSubjectPage = (id: string, page: number) => setSubjectPageById((m) => ({ ...m, [id]: page }));
  const setSubjectPageSize = (id: string, size: number) =>
    setSubjectPageSizeById((m) => ({ ...m, [id]: size }));

  const onGradeChange = (id: string, value: string) => {
    setSubjectGradeFilter((m) => ({ ...m, [id]: value }));
    setSubjectPage(id, 1);
  };

  const onStrandChange = (id: string, value: string) => {
    setSubjectStrandFilter((m) => ({ ...m, [id]: value }));
    setSubjectPage(id, 1);
  };

  if (loading) {
    return (
      <div className="w-full p-6 bg-white rounded-lg shadow-sm flex justify-center">
        <div className="text-center">
          <p className="text-lg">Loading professors...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="w-full p-6 bg-white rounded-lg shadow-sm">
        <div className="text-center">
          <p className="text-lg text-destructive">{error}</p>
          <Button className="mt-4" onClick={fetchProfessors}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const openEdit = (p: Professor) => {
    setSelectedProfessor(p);
    setIsEditDialogOpen(true);
  };
  const openDelete = (p: Professor) => {
    setSelectedProfessor(p);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="w-full p-6 bg-white rounded-lg shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <h2 className="text-2xl font-bold">Professor Management</h2>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={exportToExcel} className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Export Excel
          </Button>
          <Button variant="outline" onClick={exportToPDF} className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> Export PDF
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Professor
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div className="relative grow">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search professors by name or email..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <select
            className="border rounded-md px-2 py-1 text-sm"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {paginatedProfessors.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            {filteredProfessors.length === 0 ? "No professors found. Try a different search or add a new professor." : "No professors on this page."}
          </div>
        ) : (
          paginatedProfessors.map((p) => {
            const count = subjectLoadCount(p);
            const activeTab = activeTabById[p.id] || "overview";
            const { page, size } = subjectPaginationState(p.id);
            const subsFiltered = filteredSubjectsFor(p);
            const subsTotal = subsFiltered.length;
            const subsTotalPages = Math.max(1, Math.ceil(subsTotal / size));
            const subsStart = (page - 1) * size;
            const subsEnd = Math.min(subsStart + size, subsTotal);
            const subsPage = subsFiltered.slice(subsStart, subsEnd);

            return (
              <div key={p.id} className="rounded-lg border bg-white shadow-sm">
                <div className="flex items-start justify-between p-4">
                  <div className="w-full grid grid-cols-12 items-start gap-3 text-left">
                    <div className="col-span-6 md:col-span-6">
                      <div className="font-medium leading-5">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.email || "N/A"}</div>
                      <div className="text-xs text-muted-foreground">Phone: {p.phone || "N/A"}</div>
                    </div>
                    <div className="col-span-6 md:col-span-6 flex items-center md:justify-end gap-2">
                      <span className={getWorkloadStatusClass(count)}>{getWorkloadStatusText(count)}</span>

                      {/* NEW: Assign button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-2"
                        onClick={() => openAssignModal(p)}
                        title="Assign from preferred subjects"
                      >
                        <ListIcon className="h-4 w-4 mr-1" />
                        Assign Subjects
                      </Button>
                    </div>
                  </div>

                  <div className="shrink-0 flex gap-1 pl-2">
                    <Button variant="ghost" size="icon" onClick={() => resetPassword(p)} aria-label="Reset password">
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)} aria-label="Edit professor">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openDelete(p)} aria-label="Delete professor">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <Tabs value={activeTab} onValueChange={(val) => handleTabChange(p.id, val)} className="px-4 pb-4">
                  <TabsList className="mb-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="subjects">Subjects</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="m-0">
                    <div className="rounded-md border p-4 bg-muted/20">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <div className="text-xs text-muted-foreground">Username</div>
                          <div className="text-sm">{p.username || "—"}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Password</div>
                          <div className="text-sm">{p.password ? "••••••••" : "—"}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Subjects Total</div>
                          <div className="text-sm">{subjectLoadCount(p)}</div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="subjects" className="m-0">
                    <div className="rounded-md border p-4 bg-muted/20">
                      {loadingSubjectsIds[p.id] ? (
                        <div className="text-sm text-muted-foreground py-2">Loading subjects…</div>
                      ) : (p.subjects?.length ?? 0) === 0 ? (
                        <div className="text-muted-foreground py-2">No subjects assigned to this professor.</div>
                      ) : (
                        <>
                          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between mb-3">
                            <div className="flex gap-2">
                              <Select value={subjectGradeFilter[p.id] ?? "ALL"} onValueChange={(v) => onGradeChange(p.id, v)}>
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="Filter Grade" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ALL">All Grades</SelectItem>
                                  {uniqueGradesFor(p.subjects || []).map((g) => (
                                    <SelectItem key={g} value={g}>
                                      {g}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <Select value={subjectStrandFilter[p.id] ?? "ALL"} onValueChange={(v) => onStrandChange(p.id, v)}>
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="Filter Strand" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ALL">All Strands</SelectItem>
                                  {uniqueStrandsFor(p.subjects || []).map((s) => (
                                    <SelectItem key={s} value={s}>
                                      {s}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Rows</span>
                              <select
                                className="border rounded-md px-2 py-1 text-sm"
                                value={subjectPageSizeById[p.id] ?? SUBJECT_PAGE_SIZES[1]}
                                onChange={(e) => {
                                  setSubjectPageSize(p.id, Number(e.target.value));
                                  setSubjectPage(p.id, 1);
                                }}
                              >
                                {SUBJECT_PAGE_SIZES.map((n) => (
                                  <option key={n} value={n}>
                                    {n}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="rounded-md border bg-white">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[110px]">Grade</TableHead>
                                  <TableHead className="w-[120px]">Strand</TableHead>
                                  <TableHead className="w-[140px]">Subject Code</TableHead>
                                  <TableHead>Subject Name</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {subsPage.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                                      No subjects match your filters.
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  subsPage.map((s) => (
                                    <TableRow key={s.id}>
                                      <TableCell>{normalizeGrade(s.grade_level)}</TableCell>
                                      <TableCell>{normalizeStrand(s.strand)}</TableCell>
                                      <TableCell>{s.subj_code || "N/A"}</TableCell>
                                      <TableCell>{s.subj_name}</TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
                            <div className="text-sm text-muted-foreground">
                              Showing <span className="font-medium">{subsTotal === 0 ? 0 : subsStart + 1}</span>–
                              <span className="font-medium">{subsEnd}</span> of <span className="font-medium">{subsTotal}</span> subjects
                            </div>

                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="icon" onClick={() => setSubjectPage(p.id, 1)} disabled={page === 1}>
                                <ChevronsLeft className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setSubjectPage(p.id, Math.max(1, page - 1))}
                                disabled={page === 1}
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <span className="text-sm px-2">
                                Page <span className="font-medium">{page}</span> of <span className="font-medium">{subsTotalPages}</span>
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setSubjectPage(p.id, Math.min(subsTotalPages, page + 1))}
                                disabled={page === subsTotalPages || subsTotal === 0}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setSubjectPage(p.id, subsTotalPages)}
                                disabled={page === subsTotalPages || subsTotal === 0}
                              >
                                <ChevronsRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            );
          })
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
        <div className="text-sm text-muted-foreground">
          Showing <span className="font-medium">{totalItems === 0 ? 0 : pageStartIndex + 1}</span>–
          <span className="font-medium">{pageEndIndex}</span> of <span className="font-medium">{totalItems}</span> professors
          {searchQuery ? <span> (filtered from <span className="font-medium">{professors.length}</span>)</span> : null}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={gotoFirst} disabled={currentPage === 1}>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={gotoPrev} disabled={currentPage === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm px-2">
            Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
          </span>
          <Button variant="outline" size="icon" onClick={gotoNext} disabled={currentPage === totalPages || totalItems === 0}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={gotoLast} disabled={currentPage === totalPages || totalItems === 0}>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Add / Edit dialogs (unchanged) */}
      {isAddDialogOpen && (
        <ProfessorForm
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onSaved={async () => {
            setIsAddDialogOpen(false);
            await fetchProfessors();
            setSuccessMessage(`Professor added successfully!`);
            setIsSuccessDialogOpen(true);
          }}
        />
      )}

      {isEditDialogOpen && selectedProfessor && (
        <ProfessorForm
          key={`edit-${selectedProfessor.id}`}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          initialData={{
            prof_id: Number(selectedProfessor.id),
            name: selectedProfessor.name ?? "",
            email: selectedProfessor.email ?? "",
            phone: selectedProfessor.phone ?? "",
            username: selectedProfessor.username ?? "",
          }}
          onSaved={async () => {
            setIsEditDialogOpen(false);
            const profId = String(selectedProfessor.id);
            setSubjectsLoadedIds((m) => ({ ...m, [profId]: false }));
            setProfessors((prev) =>
              prev.map((p) => (p.id === profId ? { ...p, subjects: undefined } : p))
            );
            setSelectedProfessor(null);
            await fetchProfessors();
            setSuccessMessage(`Professor updated successfully!`);
            setIsSuccessDialogOpen(true);
          }}
        />
      )}

      {/* Delete confirm (unchanged) */}
      {isDeleteDialogOpen && selectedProfessor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-md p-6 w-[420px] shadow-lg">
            <div className="text-xl font-bold mb-2">Confirm Deletion</div>
            <p className="text-base">
              Are you sure you want to delete professor <span className="font-semibold">{selectedProfessor.name}</span>?
            </p>
            <p className="text-sm text-muted-foreground mt-2">This action cannot be undone.</p>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  await deleteProfessor(selectedProfessor.id ?? "");
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* NEW: Assign-from-preferred modal */}
      {assignOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-md p-6 w-full max-w-2xl shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xl font-bold">
                Assign Preferred Subjects{assignFor ? ` — ${assignFor.name}` : ""}
              </div>
              <Button variant="ghost" onClick={() => { setAssignOpen(false); setAssignFor(null); }}>
                Close
              </Button>
            </div>

            {prefLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading preferred subjects…</div>
            ) : prefList.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No preferred subjects saved for this professor.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-muted-foreground">
                    Select from this professor’s preferred subjects only.
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setAllPick(true)}>Select All</Button>
                    <Button variant="outline" size="sm" onClick={() => setAllPick(false)}>Clear</Button>
                  </div>
                </div>

                <div className="max-h-[420px] overflow-auto rounded border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">Pick</TableHead>
                        <TableHead className="w-[120px]">Proficiency</TableHead>
                        <TableHead className="w-[140px]">Subject Code</TableHead>
                        <TableHead>Subject Name</TableHead>
                        <TableHead className="w-[110px]">Grade</TableHead>
                        <TableHead className="w-[120px]">Strand</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prefList.map((p) => (
                        <TableRow key={p.subj_id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={!!assignPick[p.subj_id]}
                              onChange={() => togglePick(p.subj_id)}
                            />
                          </TableCell>
                          <TableCell className="capitalize">{p.proficiency}</TableCell>
                          <TableCell>{p.subj_code ?? `ID ${p.subj_id}`}</TableCell>
                          <TableCell>{p.subj_name ?? "—"}</TableCell>
                          <TableCell>{p.grade_level ? normalizeGrade(p.grade_level) : "—"}</TableCell>
                          <TableCell>{p.strand ? normalizeStrand(p.strand) : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Selected:{" "}
                    <span className="font-medium">
                      {Object.values(assignPick).filter(Boolean).length}
                    </span>
                    /{prefList.length}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setAssignOpen(false); setAssignFor(null); }}>
                      Cancel
                    </Button>
                    <Button onClick={saveAssignment} disabled={assignSaving}>
                      {assignSaving ? "Saving…" : "Save Assignment"}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <SuccessMessage
        isOpen={isSuccessDialogOpen}
        onClose={() => setIsSuccessDialogOpen(false)}
        message={successMessage}
      />
    </div>
  );
};

export default ProfessorManagement;
