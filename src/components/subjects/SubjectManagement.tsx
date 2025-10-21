import React, { useState, useEffect, useMemo } from "react";
import {
  PlusCircle,
  Pencil,
  Trash2,
  Search,
  Eye,
  Upload,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown, // NEW: sort indicator
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/use-toast";
import SubjectForm from "./SubjectForm";
import BulkUploadForm from "./BulkUploadForm";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
// NEW: checkbox for row & header selection
import { Checkbox } from "@/components/ui/checkbox";
// NEW: alert dialog for batch delete confirm
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

interface Subject {
  id: string;
  code: string;
  name: string;
  description?: string;
  units?: number;
  type?: string;
  hoursPerWeek?: number;
  gradeLevel?: string;
  strand?: string;
  schedule_count?: number;
}

interface Professor {
  id: string;
  name: string;
  email?: string;
  qualifications?: string[];
  phone?: string;
}

interface AssignedProfessor extends Professor {
  assignmentId?: string;
  scheduleInfo?: string;
}

const PAGE_SIZES = [10, 25, 50];

type SortKey =
  | "code"
  | "name"
  | "strand"
  | "gradeLevel"
  | "type"
  | "units"
  | "hoursPerWeek"
  | "schedule_count";

const SubjectManagement = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // dialogs
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  // NEW: batch delete confirm
  const [isBatchDeleteOpen, setIsBatchDeleteOpen] = useState(false);

  const [currentSubject, setCurrentSubject] = useState<Subject | null>(null);
  const [assignedProfessors, setAssignedProfessors] = useState<AssignedProfessor[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // bulk upload
  const [isUploading, setIsUploading] = useState(false);

  // PAGINATION (client-side)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);

  // Filters
  const [filterType, setFilterType] = useState<string>("");
  const [filterGrade, setFilterGrade] = useState<string>("");

  // Tabs by course (strand)
  const [activeCourse, setActiveCourse] = useState<string>("__ALL__");

  // sorting
  const [sortKey, setSortKey] = useState<SortKey>("code");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // NEW: selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch subjects
  const fetchSubjects = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getSubjects();
      if (response.success && Array.isArray(response.data)) {
        const mappedSubjects: Subject[] = response.data.map((subject: any) => ({
          id: subject.subj_id?.toString() || subject.id?.toString(),
          name: subject.subj_name || subject.name,
          code: subject.subj_code || subject.code,
          description: subject.subj_description || subject.description,
          units: subject.subj_units ?? subject.units ?? undefined,
          type: subject.subj_type || subject.type,
          hoursPerWeek: subject.subj_hours_per_week ?? subject.hoursPerWeek ?? undefined,
          gradeLevel: subject.grade_level || subject.gradeLevel || "",
          strand: subject.strand || "",
          schedule_count: subject.schedule_count || 0,
        }));
        setSubjects(mappedSubjects);
        setError(null);
        // clear selection on refetch so we don't keep stale ids
        setSelectedIds(new Set());
      } else {
        throw new Error(response.message || "Failed to fetch subjects");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to fetch subjects: ${errorMessage}`);
      setSubjects([]);
      setSelectedIds(new Set());
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch assigned professors
  const fetchAssignedProfessors = async (subjectId: string) => {
    try {
      setIsLoadingAssignments(true);
      const response = await apiService.getSubjectProfessors(Number(subjectId));
      const profs = response?.data?.professors;
      if (response.success && Array.isArray(profs)) {
        const professors: AssignedProfessor[] = profs.map((prof: any) => ({
          id: String(prof.prof_id),
          name: prof.prof_name,
          email: prof.prof_email || "",
          phone: prof.prof_phone || "",
          qualifications: (() => {
            try {
              const q = prof.prof_qualifications;
              if (!q) return [];
              const parsed = JSON.parse(q);
              return Array.isArray(parsed) ? parsed : [String(parsed)];
            } catch {
              return String(prof.prof_qualifications).split(",").map((s) => s.trim());
            }
          })(),
          scheduleInfo: prof.schedules || "",
        }));
        setAssignedProfessors(professors);
      } else {
        setAssignedProfessors([]);
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to load assigned professors: ${
          err instanceof Error ? err.message : String(err)
        }`,
      });
      setAssignedProfessors([]);
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  // Build option lists from current subjects
  const courseTabs = useMemo(() => {
    const set = new Set<string>();
    subjects.forEach((s) => s.strand && set.add(String(s.strand)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [subjects]);

  const typeOptions = useMemo(() => {
    const set = new Set<string>();
    subjects.forEach((s) => s.type && set.add(String(s.type)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [subjects]);

  const gradeOptions = useMemo(() => {
    const set = new Set<string>();
    subjects.forEach((s) => s.gradeLevel && set.add(String(s.gradeLevel)));
    const arr = Array.from(set);
    const allNum = arr.every((v) => /^\d+$/.test(v));
    return allNum ? arr.sort((a, b) => Number(a) - Number(b)) : arr.sort((a, b) => a.localeCompare(b));
  }, [subjects]);

  // Filter logic (tab + search + filters)
  const filteredSubjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return subjects.filter((subject) => {
      if (!subject) return false;

      if (activeCourse !== "__ALL__") {
        if (!subject.strand || String(subject.strand) !== activeCourse) return false;
      }

      const matchSearch =
        !q ||
        (subject.code && subject.code.toLowerCase().includes(q)) ||
        (subject.name && subject.name.toLowerCase().includes(q)) ||
        (subject.description && subject.description.toLowerCase().includes(q));
      if (!matchSearch) return false;

      if (filterType && (!subject.type || String(subject.type) !== filterType)) return false;
      if (filterGrade && (!subject.gradeLevel || String(subject.gradeLevel) !== filterGrade)) return false;

      return true;
    });
  }, [subjects, searchQuery, filterType, filterGrade, activeCourse]);

  // sorting
  const sortedSubjects = useMemo(() => {
    const arr = [...filteredSubjects];
    const getVal = (s: Subject, key: SortKey) => {
      const v = (s as any)[key];
      if (v === null || v === undefined) return "";
      if (typeof v === "number") return v;
      return String(v).toLowerCase();
    };
    arr.sort((a, b) => {
      const va = getVal(a, sortKey);
      const vb = getVal(b, sortKey);
      if (typeof va === "number" && typeof vb === "number") {
        return sortDir === "asc" ? va - vb : vb - va;
      }
      const res = String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: "base" });
      return sortDir === "asc" ? res : -res;
    });
    return arr;
  }, [filteredSubjects, sortKey, sortDir]);

  // Reset to page 1 when search, page size, filters, tab, or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, pageSize, filterType, filterGrade, activeCourse, sortKey, sortDir]);

  // Pagination
  const totalItems = sortedSubjects.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pageStartIndex = (currentPage - 1) * pageSize;
  const pageEndIndex = Math.min(pageStartIndex + pageSize, totalItems);
  const paginatedSubjects = sortedSubjects.slice(pageStartIndex, pageEndIndex);

  const gotoFirst = () => setCurrentPage(1);
  const gotoPrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const gotoNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));
  const gotoLast = () => setCurrentPage(totalPages);

  // NEW: selection helpers
  const pageIds = useMemo(() => paginatedSubjects.map((s) => s.id), [paginatedSubjects]);
  const allSelectedOnPage = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const someSelectedOnPage = pageIds.some((id) => selectedIds.has(id)) && !allSelectedOnPage;
  const totalSelected = selectedIds.size;

  const toggleRow = (id: string, checked: boolean | "indeterminate") => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleSelectAllOnPage = (checked: boolean | "indeterminate") => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        pageIds.forEach((id) => next.add(id));
      } else {
        pageIds.forEach((id) => next.delete(id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectedSubjects = useMemo(
    () => subjects.filter((s) => selectedIds.has(s.id)),
    [subjects, selectedIds]
  );

  const scheduledSelectedCount = useMemo(
    () => selectedSubjects.filter((s) => (s.schedule_count ?? 0) > 0).length,
    [selectedSubjects]
  );

  const handleAddSubject = async (data: Omit<Subject, "id">) => {
    try {
      if (!data.gradeLevel) {
        toast({ variant: "destructive", title: "Missing grade level", description: "Grade level is required." });
        return;
      }
      const subjectData = {
        subj_code: data.code,
        subj_name: data.name,
        subj_description: data.description || "",
        subj_type: data.type ?? "core",
        strand: data.strand ?? "",
        grade_level: data.gradeLevel,
      };
      const response = await apiService.createSubject(subjectData);
      if (response.success || response.status === "success") {
        await fetchSubjects();
        toast({ title: "Success", description: response.message || "Subject added successfully" });
        setIsAddDialogOpen(false);
      } else {
        throw new Error(response.message || "Failed to add subject");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast({ title: "Error", description: `Failed to add subject: ${errorMessage}`, variant: "destructive" });
    }
  };

  // UPDATE
  const handleEditSubject = async (data: Omit<Subject, "id">) => {
    if (!currentSubject) return;
    try {
      if (!data.gradeLevel) {
        toast({ variant: "destructive", title: "Missing grade level", description: "Grade level is required." });
        return;
      }
      const subjectData = {
        subj_code: data.code,
        subj_name: data.name,
        subj_description: data.description || "",
        subj_type: data.type ?? "core",
        strand: data.strand ?? "",
        grade_level: data.gradeLevel,
      };
      const response = await apiService.updateSubject(Number(currentSubject.id), subjectData);
      if (response.success || response.status === "success") {
        await fetchSubjects();
        toast({ title: "Success", description: response.message || "Subject updated successfully" });
        setIsEditDialogOpen(false);
      } else {
        throw new Error(response.message || "Failed to update subject");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast({ title: "Error", description: `Failed to update subject: ${errorMessage}`, variant: "destructive" });
    }
  };

  // Bulk upload submit
  const handleBulkUpload = async (file: File) => {
    const ext = file.name.toLowerCase().split(".").pop();
    if (!["xlsx", "xls"].includes(ext || "")) {
      toast({
        variant: "destructive",
        title: "Invalid file",
        description: "Only Excel files (.xlsx, .xls) are allowed.",
      });
      return;
    }
    try {
      setIsUploading(true);
      const form = new FormData();
      form.append("file", file, file.name);
      const resp = await apiService.bulkUploadSubjects(form);
      if (resp?.success) {
        toast({
          title: "Bulk upload complete",
          description: resp.message || "Subjects processed successfully.",
        });
        setIsBulkDialogOpen(false);
        await fetchSubjects();
      } else {
        throw new Error(resp?.message || "Bulk upload failed");
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsUploading(false);
    }
  };

  const openViewDialog = async (subject: Subject) => {
    setCurrentSubject(subject);
    setIsViewDialogOpen(true);
    if (subject.id) await fetchAssignedProfessors(subject.id);
  };

  const handleDeleteSubject = async () => {
    if (!currentSubject) return;
    try {
      const response = await apiService.deleteSubject(Number(currentSubject.id));
      if (response.success) {
        await fetchSubjects();
        toast({
          title: "Success",
          description: response.message || "Subject deleted successfully",
        });
      } else {
        throw new Error(response.message || "Failed to delete subject");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast({
        title: "Error",
        description: `Failed to delete subject: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  // NEW: batch delete handler (uses bulk endpoint if available, else per-id)
  const handleBatchDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      setIsBatchDeleteOpen(false);
      return;
    }
    try {
      // Try bulk endpoint first if present
      if (typeof (apiService as any).bulkDeleteSubjects === "function") {
        const resp = await (apiService as any).bulkDeleteSubjects({ ids: ids.map(Number) });
        if (!resp?.success) throw new Error(resp?.message || "Bulk delete failed");
      } else {
        // Fallback: delete sequentially (or Promise.all)
        await Promise.all(ids.map((id) => apiService.deleteSubject(Number(id))));
      }
      toast({
        title: "Deleted",
        description: `Successfully deleted ${ids.length} subject${ids.length > 1 ? "s" : ""}.`,
      });
      setIsBatchDeleteOpen(false);
      clearSelection();
      await fetchSubjects();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const openEditDialog = (subject: Subject) => {
    setCurrentSubject(subject);
    setIsEditDialogOpen(true);
  };
  const openDeleteDialog = (subject: Subject) => {
    setCurrentSubject(subject);
    setIsDeleteDialogOpen(true);
  };

  const clearFilters = () => {
    setFilterType("");
    setFilterGrade("");
    setSearchQuery("");
  };

  // sorting toggle
  const toggleSort = (key: SortKey) => {
    setSortKey((prevKey) => {
      if (prevKey !== key) {
        setSortDir("asc");
        return key;
      }
      setSortDir((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
      return prevKey;
    });
  };

  const SortableHeader: React.FC<{ label: string; column: SortKey; className?: string }> = ({
    label,
    column,
    className,
  }) => {
    const active = sortKey === column;
    return (
      <button
        type="button"
        onClick={() => toggleSort(column)}
        className={`inline-flex items-center gap-1 hover:opacity-80 ${className || ""}`}
        aria-label={`Sort by ${label} ${active ? `(${sortDir})` : ""}`}
      >
        <span>{label}</span>
        <ArrowUpDown
          className={`h-3.5 w-3.5 transition-transform ${
            active ? (sortDir === "asc" ? "rotate-180" : "rotate-0") : "opacity-40"
          }`}
        />
      </button>
    );
  };

  return (
    <div className="w-full p-6 bg-white rounded-lg shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold">Subject Management</h1>

        <div className="flex gap-2">
          {/* NEW: Batch delete button */}
          <Button
            variant="destructive"
            disabled={totalSelected === 0 || isLoading}
            onClick={() => setIsBatchDeleteOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete ({totalSelected})
          </Button>

          {/* Dropdown Add Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Subject
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => setIsAddDialogOpen(true)}>Manual add</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsBulkDialogOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Bulk Upload (Excel)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs by Course (strand) */}
      <Tabs value={activeCourse} onValueChange={setActiveCourse} className="mb-4">
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="__ALL__">All</TabsTrigger>
          {courseTabs.map((c) => (
            <TabsTrigger key={c} value={c}>
              {c}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Common controls above table (search + filters + page size) */}
        <div className="mt-4 flex flex-col gap-3 md:grid md:grid-cols-2 lg:grid-cols-5 items-start">
          <div className="relative col-span-2 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${activeCourse === "__ALL__" ? "subjects" : `${activeCourse} subjects`}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Type filter */}
          <Select value={filterType} onValueChange={(v) => setFilterType(v === "__ALL__" ? "" : v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">All types</SelectItem>
              {typeOptions.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Grade level filter */}
          <Select value={filterGrade} onValueChange={(v) => setFilterGrade(v === "__ALL__" ? "" : v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All grade levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">All grade levels</SelectItem>
              {gradeOptions.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Page size */}
          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Rows per page" />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear filters */}
          <div className="lg:col-span-1 w-full">
            <Button variant="outline" className="w-full" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        </div>

        <TabsContent value={activeCourse} className="mt-4">
          {error && <div className="bg-red-50 text-red-700 p-4 mb-6 rounded-md border border-red-200">{error}</div>}

          {isLoading ? (
            <div className="text-center py-10">Loading subjects...</div>
          ) : (
            <>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {/* NEW: header checkbox */}
                      <TableHead className="w-[44px]">
                        <Checkbox
                          checked={allSelectedOnPage ? true : someSelectedOnPage ? "indeterminate" : false}
                          onCheckedChange={toggleSelectAllOnPage}
                          aria-label="Select all on this page"
                        />
                      </TableHead>
                      <TableHead>
                        <SortableHeader label="Code" column="code" />
                      </TableHead>
                      <TableHead>
                        <SortableHeader label="Name" column="name" />
                      </TableHead>
                      <TableHead className="hidden md:table-cell">
                        <SortableHeader label="Course" column="strand" />
                      </TableHead>
                      <TableHead className="hidden sm:table-cell">
                        <SortableHeader label="Grade" column="gradeLevel" />
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        <SortableHeader label="Type" column="type" />
                      </TableHead>
                      <TableHead className="hidden xl:table-cell">
                        <SortableHeader label="Units" column="units" />
                      </TableHead>
                      <TableHead className="hidden xl:table-cell">
                        <SortableHeader label="Hrs/Wk" column="hoursPerWeek" />
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        <SortableHeader label="#Schedules" column="schedule_count" />
                      </TableHead>
                      <TableHead className="hidden 2xl:table-cell max-w-[320px]">Description</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSubjects.length > 0 ? (
                      paginatedSubjects.map((subject) => (
                        <TableRow key={subject.id} data-selected={selectedIds.has(subject.id)}>
                          {/* NEW: row checkbox */}
                          <TableCell className="w-[44px]">
                            <Checkbox
                              checked={selectedIds.has(subject.id)}
                              onCheckedChange={(v) => toggleRow(subject.id, v)}
                              aria-label={`Select ${subject.code}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{subject.code}</TableCell>
                          <TableCell>{subject.name}</TableCell>
                          <TableCell className="hidden md:table-cell">{subject.strand || "-"}</TableCell>
                          <TableCell className="hidden sm:table-cell">{subject.gradeLevel || "-"}</TableCell>
                          <TableCell className="hidden lg:table-cell">{subject.type || "-"}</TableCell>
                          <TableCell className="hidden xl:table-cell">{subject.units ?? "-"}</TableCell>
                          <TableCell className="hidden xl:table-cell">{subject.hoursPerWeek ?? "-"}</TableCell>
                          <TableCell className="hidden lg:table-cell">{subject.schedule_count ?? 0}</TableCell>
                          <TableCell className="hidden 2xl:table-cell max-w-[320px] truncate">
                            {subject.description || ""}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => openViewDialog(subject)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openEditDialog(subject)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(subject)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-6">
                          {sortedSubjects.length === 0 ? "No subjects found" : "No subjects on this page"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Footer: counts + pagination */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing <span className="font-medium">{totalItems === 0 ? 0 : pageStartIndex + 1}</span>–
                  <span className="font-medium">{pageEndIndex}</span> of{" "}
                  <span className="font-medium">{totalItems}</span> subjects
                  {searchQuery || filterType || filterGrade || activeCourse !== "__ALL__" ? (
                    <span>
                      {" "}
                      (filtered from <span className="font-medium">{subjects.length}</span>)
                    </span>
                  ) : null}
                  {totalSelected > 0 && (
                    <span className="ml-2">
                      • <span className="font-medium">{totalSelected}</span> selected
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={gotoFirst} disabled={currentPage === 1}>
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={gotoPrev} disabled={currentPage === 1}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <span className="text-sm px-2">
                    Page <span className="font-medium">{currentPage}</span> of{" "}
                    <span className="font-medium">{totalPages}</span>
                  </span>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={gotoNext}
                    disabled={currentPage === totalPages || totalItems === 0}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={gotoLast}
                    disabled={currentPage === totalPages || totalItems === 0}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Manual Add Dialog */}
      <SubjectForm open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} onSubmit={handleAddSubject} />

      {/* Edit Subject Dialog */}
      {currentSubject && (
        <SubjectForm
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          initialData={{
            code: currentSubject.code,
            name: currentSubject.name,
            description: currentSubject.description || "",
            type: currentSubject.type || "Core",
            strand: currentSubject.strand || "ICT",
            gradeLevel:
              currentSubject.gradeLevel && String(currentSubject.gradeLevel).trim() !== ""
                ? String(currentSubject.gradeLevel)
                : "11",
          }}
          onSubmit={handleEditSubject}
        />
      )}

      {/* View Subject Dialog */}
      {currentSubject && (
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[700px] bg-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                {currentSubject.code} — {currentSubject.name}
              </DialogTitle>
              <DialogDescription>
                Course: <span className="font-medium">{currentSubject.strand || "-"}</span> · Grade:{" "}
                <span className="font-medium">{currentSubject.gradeLevel || "-"}</span> · Type:{" "}
                <span className="font-medium">{currentSubject.type || "-"}</span> · Units:{" "}
                <span className="font-medium">{currentSubject.units ?? "-"}</span> · Hrs/Wk:{" "}
                <span className="font-medium">{currentSubject.hoursPerWeek ?? "-"}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="mb-4">
                <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                <p className="text-base mt-1">{currentSubject.description || "No description provided"}</p>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Assigned Professors</h3>

                {isLoadingAssignments ? (
                  <div className="text-center py-4">Loading assigned professors...</div>
                ) : assignedProfessors.length > 0 ? (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Schedule</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assignedProfessors.map((professor) => (
                          <TableRow key={professor.id}>
                            <TableCell className="font-medium">{professor.name}</TableCell>
                            <TableCell>{professor.scheduleInfo || "No schedule information"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-muted-foreground py-4 text-center bg-muted/20 rounded-md">
                    No professors are currently assigned to this subject.
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Single Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>Please confirm you want to delete this subject.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p>
              Are you sure you want to delete the subject{" "}
              <span className="font-semibold">
                {currentSubject?.code} - {currentSubject?.name}
              </span>
              ? This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSubject}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NEW: Batch Delete Confirmation with PREVIEW */}
      <AlertDialog open={isBatchDeleteOpen} onOpenChange={setIsBatchDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {totalSelected} selected item{totalSelected > 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected subject{totalSelected > 1 ? "s" : ""}. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* PREVIEW LIST */}
          {selectedSubjects.length > 0 ? (
            <div className="mt-3">
              <div className="text-sm mb-2 text-muted-foreground">Preview of items to be deleted:</div>
              <div className="max-h-60 overflow-auto rounded-md border">
                <ul className="divide-y">
                  {selectedSubjects.slice(0, 50).map((s) => (
                    <li key={s.id} className="p-2 text-sm flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate">
                          <span className="font-medium">{s.code}</span>{" "}
                          <span className="text-muted-foreground">—</span>{" "}
                          <span className="">{s.name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {(s.strand || "-")} · Grade {(s.gradeLevel || "-")} · Type {(s.type || "-")}
                        </div>
                      </div>
                      <div className="shrink-0 text-xs text-muted-foreground">
                        {(s.schedule_count ?? 0)} sched{(s.schedule_count ?? 0) === 1 ? "" : "s"}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              {selectedSubjects.length > 50 && (
                <div className="text-xs text-muted-foreground mt-2">
                  +{selectedSubjects.length - 50} more not shown…
                </div>
              )}

              {/* Warning if any selected has schedules */}
              {scheduledSelectedCount > 0 && (
                <div className="mt-3 text-sm rounded-md border border-amber-300 bg-amber-50 text-amber-900 p-2">
                  <span className="font-medium">{scheduledSelectedCount}</span>{" "}
                  of the selected item{scheduledSelectedCount > 1 ? "s have" : " has"} existing schedule
                  {scheduledSelectedCount > 1 ? "s" : ""}. Deleting them may orphan related data.
                </div>
              )}
            </div>
          ) : null}

          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel onClick={() => setIsBatchDeleteOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleBatchDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Upload Dialog */}
      <BulkUploadForm
        open={isBulkDialogOpen}
        onOpenChange={setIsBulkDialogOpen}
        onUpload={handleBulkUpload}
        isUploading={isUploading}
      />
    </div>
  );
};

export default SubjectManagement;
