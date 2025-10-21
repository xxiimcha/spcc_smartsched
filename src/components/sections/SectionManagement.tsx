import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import {
  Plus,
  Search,
  MapPin,
  DoorOpen,
  Users as UsersIcon,
  MoreVertical,
  BookOpen,
  Eye,
} from "lucide-react";
import SectionForm from "./SectionForm";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AssignSubjectsDialog from "./AssignSubjectsDialog";

interface Room {
  id: number;
  number: number;
  type: string;
  capacity: number;
}

interface Subject {
  subj_id: number;
  subj_code: string;
  subj_name: string;
  subj_description?: string | null;
  schedule_count: number;
}

interface Section {
  section_id: number;
  section_name: string;
  grade_level: "11" | "12";
  number_of_students: number;
  strand: string;
  primary_room_id?: number | null;
  rooms?: Array<Room>;
  room?: Room | null;
  room_id?: number | null;
  room_number?: number | null;
  room_type?: string | null;
  room_capacity?: number | null;
  subject_ids?: number[];          // <-- from API (decoded JSON)
  subject_ids_raw?: string | null; // optional raw JSON from API
}

const API_BASE = "https://spcc-scheduler.site";

const SectionManagement: React.FC = () => {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGradeLevel, setSelectedGradeLevel] = useState("all");
  const [selectedStrand, setSelectedStrand] = useState("all");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<number | null>(null);

  // Assign/Update dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignFor, setAssignFor] = useState<Section | null>(null);

  // View Assigned dialog
  const [viewOpen, setViewOpen] = useState(false);
  const [viewFor, setViewFor] = useState<Section | null>(null);

  // Subjects cache for displaying assigned subject names
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  const getRoom = (s: Section): Room | null => {
    if (Array.isArray(s.rooms) && s.rooms.length > 0) {
      let chosen = s.rooms[0];
      if (s.primary_room_id != null) {
        const match = s.rooms.find((r) => Number(r.id) === Number(s.primary_room_id));
        if (match) chosen = match;
      }
      return {
        ...chosen,
        id: Number(chosen.id),
        number: Number(chosen.number),
        capacity: Number(chosen.capacity),
      };
    }
    if (s.room) return s.room;
    if (s.room_id) {
      return {
        id: Number(s.room_id),
        number: Number(s.room_number ?? 0),
        type: String(s.room_type ?? "Room"),
        capacity: Number(s.room_capacity ?? 0),
      };
    }
    return null;
  };

  const fetchSections = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/sections.php`);
      if (response.data.success && Array.isArray(response.data.data)) {
        setSections(response.data.data);
        setError(null);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.error("Error fetching sections:", err);
      setError("Failed to load sections. Please try again later.");
      setSections([]);
      toast({
        title: "Error",
        description: "Failed to load sections. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const ensureSubjectsLoaded = async () => {
    if (allSubjects.length > 0 || subjectsLoading) return;
    try {
      setSubjectsLoading(true);
      const res = await axios.get(`${API_BASE}/subjects.php`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        setAllSubjects(res.data.data);
      }
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: "Failed to load subject list.",
        variant: "destructive",
      });
    } finally {
      setSubjectsLoading(false);
    }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  const filteredSections = useMemo(() => {
    return (sections ?? []).filter((section) => {
      const matchesSearch = section.section_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGradeLevel =
        selectedGradeLevel === "all" || section.grade_level === (selectedGradeLevel as "11" | "12");
      const matchesStrand = selectedStrand === "all" || section.strand === selectedStrand;
      return matchesSearch && matchesGradeLevel && matchesStrand;
    });
  }, [sections, searchQuery, selectedGradeLevel, selectedStrand]);

  const uniqueStrands = useMemo(() => {
    const strands = Array.from(new Set((sections ?? []).map((s) => s.strand || "none").filter(Boolean)));
    return strands.length > 0 ? strands : ["none"];
  }, [sections]);

  const handleDelete = async () => {
    if (!sectionToDelete) return;
    try {
      const response = await axios.delete(`${API_BASE}/sections.php?id=${sectionToDelete}`);
      if (response.data.success || response.data.status === "success") {
        setSections((prev) => prev.filter((s) => s.section_id !== sectionToDelete));
        toast({ title: "Success", description: "Section deleted successfully" });
      } else {
        throw new Error(response.data.message || "Failed to delete section");
      }
    } catch (err) {
      console.error("Error deleting section:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete section.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setSectionToDelete(null);
    }
  };

  const handleEdit = (section: Section) => {
    setEditingSection(section);
    setIsFormOpen(true);
  };
  const handleCreate = () => {
    setEditingSection(null);
    setIsFormOpen(true);
  };

  const handleSectionSubmit = async (updatedSection?: any) => {
    try {
      if (updatedSection) {
        setSections((prev) => {
          if (editingSection) {
            return prev.map((s) => (s.section_id === editingSection.section_id ? { ...s, ...updatedSection } : s));
          }
          return [...prev, updatedSection];
        });
      } else {
        await fetchSections();
      }
    } catch (err) {
      console.error("Error refreshing sections:", err);
      toast({ title: "Error", description: "Failed to refresh sections list.", variant: "destructive" });
    } finally {
      setIsFormOpen(false);
      setEditingSection(null);
    }
  };

  const openAssign = (section: Section) => {
    setAssignFor(section);
    setAssignOpen(true);
  };

  const openViewAssigned = async (section: Section) => {
    await ensureSubjectsLoaded();
    setViewFor(section);
    setViewOpen(true);
  };

  const assignedSubjectsForView = useMemo(() => {
    if (!viewFor || !Array.isArray(viewFor.subject_ids)) return [];
    const map = new Map(allSubjects.map((s) => [s.subj_id, s]));
    return viewFor.subject_ids
      .map((id) => map.get(id))
      .filter(Boolean) as Subject[];
  }, [viewFor, allSubjects]);

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Section Management</h1>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Section
        </Button>
      </div>

      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          <Select value={selectedGradeLevel} onValueChange={setSelectedGradeLevel}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Grade Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grade Levels</SelectItem>
              <SelectItem value="11">Grade 11</SelectItem>
              <SelectItem value="12">Grade 12</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedStrand} onValueChange={setSelectedStrand}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Strand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Strands</SelectItem>
              {uniqueStrands.map((strand) => (
                <SelectItem key={strand} value={strand || "none"}>
                  {strand || "No Strand"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(selectedGradeLevel !== "all" || selectedStrand !== "all") && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedGradeLevel("all");
                setSelectedStrand("all");
              }}
            >
              Clear Filters
            </Button>
            <span className="text-sm text-muted-foreground">
              {filteredSections.length} section{filteredSections.length !== 1 ? "s" : ""} found
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      ) : error ? (
        <Card className="bg-destructive/10 border-destructive">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : filteredSections.length === 0 ? (
        <Card className="text-center p-8">
          <CardHeader>
            <CardTitle>No Sections Found</CardTitle>
            <CardDescription>
              {searchQuery || selectedGradeLevel || selectedStrand
                ? "No sections match your search criteria."
                : "There are no sections available. Create a new section to get started."}
            </CardDescription>
          </CardHeader>
          {!searchQuery && !selectedGradeLevel && !selectedStrand && (
            <CardFooter className="justify-center">
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Create Section
              </Button>
            </CardFooter>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSections.map((section) => {
            const room = getRoom(section);
            const assigned = !!room;
            const hasAssignedSubjects = Array.isArray(section.subject_ids) && section.subject_ids.length > 0;

            return (
              <Card
                key={section.section_id}
                className={`transition-shadow hover:shadow-md ${
                  assigned ? "border-emerald-200" : "border-amber-200"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base md:text-lg truncate">{section.section_name}</CardTitle>
                      <CardDescription className="mt-1">
                        Grade {section.grade_level}
                        {section.strand ? ` • ${section.strand}` : ""}
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={assigned ? "default" : "secondary"}
                        className={`shrink-0 ${assigned ? "bg-emerald-600" : ""}`}
                      >
                        {assigned ? "Assigned" : "Unassigned"}
                      </Badge>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => handleEdit(section)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openAssign(section)}>
                            {hasAssignedSubjects ? "Update Subjects" : "Assign Subjects"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-700"
                            onClick={() => {
                              setSectionToDelete(section.section_id);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <InfoRow
                    icon={<UsersIcon className="h-4 w-4" />}
                    label="Students"
                    value={String(section.number_of_students)}
                  />

                  {assigned ? (
                    <div className="rounded-lg border bg-emerald-50/60 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <DoorOpen className="h-4 w-4 text-emerald-700" />
                        <span className="font-medium text-emerald-900">Assigned Room</span>
                      </div>
                      <div className="mt-1 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                        <InfoPill icon={<MapPin className="h-3.5 w-3.5" />} label="No." value={String(room!.number)} />
                        <InfoPill icon={<DoorOpen className="h-3.5 w-3.5" />} label="Type" value={room!.type} />
                        <InfoPill
                          icon={<UsersIcon className="h-3.5 w-3.5" />}
                          label="Capacity"
                          value={String(room!.capacity)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border bg-amber-50/60 p-3">
                      <div className="flex items-center gap-2">
                        <DoorOpen className="h-4 w-4 text-amber-700" />
                        <span className="text-amber-900">No room assigned</span>
                      </div>
                    </div>
                  )}

                  <div className="pt-1 flex gap-2">
                    {hasAssignedSubjects ? (
                      <Button variant="outline" size="sm" onClick={() => openViewAssigned(section)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Assigned Subjects
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => openAssign(section)}>
                        <BookOpen className="mr-2 h-4 w-4" />
                        Assign Subjects
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <SectionForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        editingSection={editingSection}
        onSectionAdded={fetchSections}
        sections={sections}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete section?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the section.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign / Update dialog (existing component) */}
      <AssignSubjectsDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        section={
          assignFor
            ? {
                section_id: assignFor.section_id,
                section_name: assignFor.section_name,
                strand: assignFor.strand,         
                grade_level: assignFor.grade_level, 
                subject_ids: assignFor.subject_ids ?? [],
              }
            : null
        }
        apiBase={API_BASE}
        onSaved={fetchSections}
      />



      {/* View Assigned Subjects dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Assigned Subjects {viewFor ? `• ${viewFor.section_name}` : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="rounded-md border">
            <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30 text-sm">
              <span>
                {Array.isArray(viewFor?.subject_ids) ? viewFor!.subject_ids!.length : 0} assigned
              </span>
              <span className="text-muted-foreground">
                {subjectsLoading ? "Loading subject names..." : ""}
              </span>
            </div>

            <div className="max-h-[360px] overflow-auto divide-y">
              {!viewFor || !Array.isArray(viewFor.subject_ids) || viewFor.subject_ids.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No subjects assigned yet.
                </div>
              ) : assignedSubjectsForView.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Unable to resolve subject names. Try Update Subjects.
                </div>
              ) : (
                assignedSubjectsForView.map((s) => (
                  <div key={s.subj_id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{s.subj_code} — {s.subj_name}</div>
                      <span className="text-xs text-muted-foreground">
                        used in {s.schedule_count} schedule{s.schedule_count === 1 ? "" : "s"}
                      </span>
                    </div>
                    {s.subj_description && (
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {s.subj_description}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
            {viewFor && (
              <Button
                onClick={() => {
                  setViewOpen(false);
                  openAssign(viewFor);
                }}
              >
                Update Subjects
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SectionManagement;

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-center justify-between text-sm">
    <div className="flex items-center gap-2 text-muted-foreground">
      {icon}
      <Label className="text-xs">{label}</Label>
    </div>
    <span className="font-medium">{value}</span>
  </div>
);

const InfoPill = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-center gap-2 rounded-md border bg-white px-2.5 py-1.5">
    {icon}
    <span className="text-xs text-muted-foreground">{label}:</span>
    <span className="text-sm font-medium">{value}</span>
  </div>
);
