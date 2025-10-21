import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import {
  Plus,
  RefreshCw,
  Trash2,
  Users,
  MapPin,
  Pencil,
  UserPlus,
  AlertTriangle,
  Eye,
  MoreVertical,
  LayoutGrid,
  List,
  ArrowUpDown,
  Building2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import RoomForm from "./RoomForm";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

/* ---------- Types ---------- */

interface Room {
  id: number;
  number: number;
  type: "Lecture" | "Laboratory" | string;
  capacity: number;
  sections?: {
    section_id: number;
    section_name: string;
    grade_level: string | number;
    strand: string;
  }[];
}

interface Section {
  section_id: number;
  section_name: string;
  grade_level: number;
  strand: string;
}

interface RoomSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: number;
  roomNumber: number;
  onSectionAdded: () => void;
}

/* ---------- Add section dialog ---------- */

const RoomSectionDialog: React.FC<RoomSectionDialogProps> = ({
  open,
  onOpenChange,
  roomId,
  roomNumber,
  onSectionAdded,
}) => {
  const [sections, setSections] = React.useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loadingSections, setLoadingSections] = React.useState(false);

  React.useEffect(() => {
    const loadUnassignedSections = async () => {
      setLoadingSections(true);
      setError(null);
      try {
        const { data } = await axios.get("https://spcc-scheduler.site/sections.php");
        if (!data?.success || !Array.isArray(data.data)) {
          throw new Error("Invalid sections response");
        }
        const unassigned = data.data.filter(
          (s: any) => !Array.isArray(s.rooms) || s.rooms.length === 0
        );
        setSections(unassigned);
      } catch (e: any) {
        setError(e?.message || "Failed to load sections");
        setSections([]);
      } finally {
        setLoadingSections(false);
      }
    };

    if (open) loadUnassignedSections();
  }, [open]);

  const handleAddSection = async () => {
    if (!selectedSection) return;

    setIsLoading(true);
    setError(null);
    try {
      const secRes = await axios.get(
        `https://spcc-scheduler.site/sections.php?id=${selectedSection}`
      );
      if (!secRes.data?.success) throw new Error("Failed to fetch section data");

      const section = secRes.data.data;

      if (Array.isArray(section.rooms) && section.rooms.length > 0) {
        toast({
          title: "Section already assigned",
          description: "Only unassigned sections can be added to a room.",
          variant: "destructive",
        });
        return;
      }

      const payload = {
        section_name: section.section_name,
        grade_level: section.grade_level,
        number_of_students: section.number_of_students ?? 0,
        strand: section.strand ?? "",
        room_ids: [roomId],
      };

      const resp = await axios.put(
        `https://spcc-scheduler.site/sections.php?id=${selectedSection}`,
        payload
      );

      if (resp.data.status === "success") {
        toast({ title: "Section assigned", description: "The section was added to this room." });
        onSectionAdded();
        onOpenChange(false);
      } else {
        throw new Error(resp.data.message || "Failed to add section");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to add section. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const nothingToAssign = !loadingSections && sections.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle>Add Section to Room {roomNumber}</DialogTitle>
          <DialogDescription>
            {nothingToAssign
              ? "All sections are already assigned to rooms."
              : "Select a section to assign to this room."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mb-3">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <div className="space-y-2">
            <span className="text-sm font-medium">Section</span>
            <Select
              value={selectedSection}
              onValueChange={setSelectedSection}
              disabled={loadingSections || nothingToAssign}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={loadingSections ? "Loading..." : "Choose a section..."} />
              </SelectTrigger>
              <SelectContent>
                {sections.map((s: any) => (
                  <SelectItem key={s.section_id} value={s.section_id.toString()}>
                    {s.section_name} • G{s.grade_level} {s.strand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={handleAddSection}
              disabled={isLoading || !selectedSection || nothingToAssign}
            >
              {isLoading ? "Adding..." : "Add Section"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ---------- Page ---------- */

type ViewMode = "grid" | "list";
type SortKey = "number" | "capacity" | "type";

const RoomManagement = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<number | null>(null);

  const [selectedFloor, setSelectedFloor] = useState<string>("all");
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [selectedRoomForSection, setSelectedRoomForSection] = useState<Room | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // UI states
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("number");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const fetchRooms = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get("https://spcc-scheduler.site/rooms.php");
      if (response.data.success && Array.isArray(response.data.data)) {
        setRooms(response.data.data);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load rooms. Please try again later.");
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const getRoomTypeBadge = (type: string) =>
    type === "Lecture"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : type === "Laboratory"
      ? "bg-purple-50 text-purple-700 border-purple-200"
      : "bg-gray-50 text-gray-700 border-gray-200";

  const sortRooms = (list: Room[]) => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      let va: any = a[sortKey];
      let vb: any = b[sortKey];
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  };

  // Keep floor filter available (derived from room number), but no grouping
  const getUniqueFloors = (all: Room[]): number[] =>
    Array.from(new Set(all.map((r) => Math.floor(r.number / 100)))).sort((a, b) => a - b);

  const filtered = useMemo(() => {
    const byFloor =
      selectedFloor === "all"
        ? rooms
        : rooms.filter((r) => Math.floor(r.number / 100) === Number(selectedFloor));

    const bySearch = search.trim()
      ? byFloor.filter((r) => {
          const s = search.toLowerCase();
          return (
            String(r.number).includes(search) ||
            r.type.toLowerCase().includes(s) ||
            r.sections?.some((x) =>
              `${x.section_name} ${x.strand} ${x.grade_level}`.toLowerCase().includes(s)
            )
          );
        })
      : byFloor;

    return sortRooms(bySearch);
  }, [rooms, selectedFloor, search, sortKey, sortDir]);

  const formatOrdinal = (n: number) => {
    const j = n % 10,
      k = n % 100;
    if (j === 1 && k !== 11) return `${n}st`;
    if (j === 2 && k !== 12) return `${n}nd`;
    if (j === 3 && k !== 13) return `${n}rd`;
    return `${n}th`;
  };

  const handleRoomCreated = () => {
    setIsFormOpen(false);
    fetchRooms();
    toast({ title: "Room Saved", description: "Room was created/updated." });
  };

  const confirmDelete = (roomId: number) => {
    setRoomToDelete(roomId);
    setDeleteDialogOpen(true);
  };

  const deleteRoom = async () => {
    if (!roomToDelete) return;
    try {
      const response = await axios.delete(
        `https://spcc-scheduler.site/rooms.php?id=${roomToDelete}`
      );
      if (response.data.success || response.data.message?.includes("deleted successfully")) {
        setRooms((prev) => prev.filter((r) => r.id !== roomToDelete));
        setDeleteDialogOpen(false);
        setRoomToDelete(null);
        toast({ title: "Room Deleted", description: "The room has been removed." });
      } else {
        throw new Error(response.data.message || "Failed to delete room");
      }
    } catch (err: any) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setRooms((prev) => prev.filter((r) => r.id !== roomToDelete));
        setDeleteDialogOpen(false);
        setRoomToDelete(null);
        toast({ title: "Room Deleted", description: "The room has been removed." });
        return;
      }
      console.error(err);
      toast({
        title: "Error",
        description: err?.message || "Failed to delete room.",
        variant: "destructive",
      });
    }
  };

  const handleEditRoom = (room: Room) => {
    setSelectedRoom(room);
    setIsFormOpen(true);
  };

  // GUARD: block assignment for Laboratory rooms
  const handleAddSection = (room: Room) => {
    if (room.type?.toLowerCase() === "laboratory") {
      toast({
        title: "Not allowed",
        description: "Laboratory rooms cannot be assigned to sections.",
        variant: "destructive",
      });
      return;
    }
    if (room.sections && room.sections.length > 0) {
      toast({
        title: "Already assigned",
        description: "This room already has a section assigned.",
      });
      return;
    }
    setSelectedRoomForSection(room);
    setSectionDialogOpen(true);
  };

  const fetchRoomDetails = async (roomId: number) => {
    try {
      const response = await axios.get(`https://spcc-scheduler.site/rooms.php?id=${roomId}`);
      if (response.data.success) setSelectedRoom(response.data.data);
      else throw new Error("Failed to fetch room details");
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: "Failed to fetch room details.",
        variant: "destructive",
      });
    }
  };

  const openViewDialog = (room: Room) => {
    setSelectedRoom(room);
    setIsViewDialogOpen(true);
    fetchRoomDetails(room.id);
  };

  // Quick stats
  const stats = useMemo(() => {
    const total = rooms.length;
    const lecture = rooms.filter((r) => r.type === "Lecture").length;
    const lab = rooms.filter((r) => r.type === "Laboratory").length;
    const capacity = rooms.reduce((acc, r) => acc + (Number(r.capacity) || 0), 0);
    return { total, lecture, lab, capacity };
  }, [rooms]);

  return (
    <div className="max-w-screen-2xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Sticky Toolbar */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="py-3 space-y-3 md:space-y-0 md:flex md:items-center md:justify-between">
          {/* Title */}
          <div className="flex items-center gap-3 min-w-0">
            <Building2 className="h-6 w-6 text-primary shrink-0" />
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-semibold truncate">Room Management</h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                Organize rooms and their assigned sections.
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex-1 min-w-[190px] sm:min-w-[260px]">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search room number, type, or section…"
                  aria-label="Search rooms"
                  className="w-full"
                />
              </div>

              {/* Floor filter (optional) */}
              <div className="w-[140px] sm:w-[150px]">
                <Select value={selectedFloor} onValueChange={setSelectedFloor}>
                  <SelectTrigger className="w-full" aria-label="Floor filter">
                    <SelectValue placeholder="Floor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Floors</SelectItem>
                    {getUniqueFloors(rooms).map((f) => (
                      <SelectItem key={f} value={String(f)}>
                        {formatOrdinal(f)} Floor
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[120px] sm:w-[140px]">
                <Select value={sortKey} onValueChange={(v: SortKey) => setSortKey(v)}>
                  <SelectTrigger className="w-full" aria-label="Sort by">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="number">Room #</SelectItem>
                    <SelectItem value="capacity">Capacity</SelectItem>
                    <SelectItem value="type">Type</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="hidden sm:flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                  title="Toggle sort direction"
                >
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  {sortDir.toUpperCase()}
                </Button>

                <Button variant="outline" onClick={fetchRooms}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>

                <div className="flex rounded-lg border overflow-hidden">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    className="rounded-none"
                    onClick={() => setViewMode("grid")}
                    aria-label="Grid view"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    className="rounded-none"
                    onClick={() => setViewMode("list")}
                    aria-label="List view"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>

                <Button onClick={() => setIsFormOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Room
                </Button>
              </div>

              {/* Mobile: compact menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="sm:hidden" variant="default" size="icon" aria-label="More actions">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}>
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    Sort: {sortDir.toUpperCase()}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={fetchRooms}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setViewMode("grid")}>
                    <LayoutGrid className="mr-2 h-4 w-4" />
                    Grid view
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setViewMode("list")}>
                    <List className="mr-2 h-4 w-4" />
                    List view
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setIsFormOpen(true)}
                    className="font-medium"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New Room
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Rooms" value={stats.total} />
        <StatCard label="Lecture Rooms" value={stats.lecture} />
        <StatCard label="Laboratories" value={stats.lab} />
        <StatCard label="Total Capacity" value={stats.capacity.toLocaleString()} />
      </div>

      {/* Body (flat list / grid, NO per-floor grouping) */}
      <div className="mt-6">
        {loading ? (
          <SkeletonList />
        ) : error ? (
          <Card className="bg-destructive/10 border-destructive">
            <CardHeader>
              <CardTitle>Error</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="text-center p-6 sm:p-10">
            <CardHeader>
              <CardTitle>No Rooms Found</CardTitle>
              <CardDescription>
                {search
                  ? "Try clearing your search or filters."
                  : selectedFloor !== "all"
                  ? "No rooms on the selected floor."
                  : "Create a room to get started."}
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-center">
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Room
              </Button>
            </CardFooter>
          </Card>
        ) : viewMode === "grid" ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                getRoomTypeBadge={getRoomTypeBadge}
                openViewDialog={openViewDialog}
                handleEditRoom={handleEditRoom}
                confirmDelete={confirmDelete}
                handleAddSection={handleAddSection}
              />
            ))}
          </div>
        ) : (
          <div className="divide-y rounded-md border">
            {filtered.map((room) => (
              <RoomRow
                key={room.id}
                room={room}
                getRoomTypeBadge={getRoomTypeBadge}
                openViewDialog={openViewDialog}
                handleEditRoom={handleEditRoom}
                confirmDelete={confirmDelete}
                handleAddSection={handleAddSection}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete room?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the room.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteRoom} className="bg-red-600 hover:bg-red-700 w-full sm:w-auto">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Forms / dialogs */}
      <RoomForm
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setSelectedRoom(null);
        }}
        onSubmit={handleRoomCreated}
        room={selectedRoom}
      />

      <RoomSectionDialog
        open={sectionDialogOpen}
        onOpenChange={setSectionDialogOpen}
        roomId={selectedRoomForSection?.id || 0}
        roomNumber={selectedRoomForSection?.number || 0}
        onSectionAdded={fetchRooms}
      />

      {isViewDialogOpen && selectedRoom && (
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle>Room {selectedRoom.number}</DialogTitle>
              <DialogDescription>Room details and current assignments</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="text-sm font-medium">{selectedRoom.type}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Capacity</p>
                <p className="text-sm font-medium">{selectedRoom.capacity} students</p>
              </div>
              {selectedRoom.sections && selectedRoom.sections.length > 0 && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Assigned Sections</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRoom.sections.map((s) => (
                      <Badge key={s.section_id} variant="secondary">
                        {s.section_name} • G{s.grade_level} {s.strand}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

/* ---------- Small components ---------- */

const StatCard = ({ label, value }: { label: string; value: string | number }) => (
  <Card className="shadow-none">
    <CardHeader className="pb-2">
      <CardDescription className="truncate">{label}</CardDescription>
      <CardTitle className="text-xl sm:text-2xl">{value}</CardTitle>
    </CardHeader>
  </Card>
);

const RoomCard = ({
  room,
  getRoomTypeBadge,
  openViewDialog,
  handleEditRoom,
  confirmDelete,
  handleAddSection,
}: {
  room: Room;
  getRoomTypeBadge: (t: string) => string;
  openViewDialog: (r: Room) => void;
  handleEditRoom: (r: Room) => void;
  confirmDelete: (id: number) => void;
  handleAddSection: (r: Room) => void;
}) => {
  const isLab = room.type?.toLowerCase() === "laboratory";
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">Room {room.number}</CardTitle>
            <div className="mt-1">
              <Badge className={getRoomTypeBadge(room.type)}>{room.type}</Badge>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => openViewDialog(room)}>
                <Eye className="mr-2 h-4 w-4" />
                View details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEditRoom(room)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-700"
                onClick={() => confirmDelete(room.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <div className="inline-flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span>{room.capacity} students</span>
          </div>
          <div className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            <span>{room.type}</span>
          </div>
        </div>

        {room.sections && room.sections.length > 0 ? (
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground">Assigned Sections</div>
            <div className="flex flex-wrap gap-1">
              {room.sections.map((s) => (
                <Badge key={s.section_id} variant="secondary" className="px-2 py-0.5">
                  {s.section_name} • G{s.grade_level} {s.strand}
                </Badge>
              ))}
            </div>
          </div>
        ) : isLab ? (
          <div className="text-sm text-muted-foreground border rounded-md px-3 py-2">
            Laboratory rooms cannot be assigned to sections.
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => handleAddSection(room)}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Section
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

const RoomRow = ({
  room,
  getRoomTypeBadge,
  openViewDialog,
  handleEditRoom,
  confirmDelete,
  handleAddSection,
}: {
  room: Room;
  getRoomTypeBadge: (t: string) => string;
  openViewDialog: (r: Room) => void;
  handleEditRoom: (r: Room) => void;
  confirmDelete: (id: number) => void;
  handleAddSection: (r: Room) => void;
}) => {
  const isLab = room.type?.toLowerCase() === "laboratory";
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3">
      <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
        <div className="shrink-0 rounded-md border px-3 py-2 text-sm font-semibold">
          {room.number}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium truncate">Room {room.number}</span>
            <Badge className={getRoomTypeBadge(room.type)}>{room.type}</Badge>
          </div>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {room.capacity} students
            </span>
            {room.sections && room.sections.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {room.sections.length} section(s)
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 w-full sm:w-auto">
        <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => openViewDialog(room)}>
          <Eye className="mr-2 h-4 w-4" /> View
        </Button>
        <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => handleEditRoom(room)}>
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </Button>

        {room.type?.toLowerCase() !== "laboratory" && (!room.sections || room.sections.length === 0) ? (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => handleAddSection(room)}
          >
            <UserPlus className="mr-2 h-4 w-4" /> Add Section
          </Button>
        ) : null}

        <Button
          variant="destructive"
          size="sm"
          className="flex-1 sm:flex-none"
          onClick={() => confirmDelete(room.id)}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </Button>
      </div>
    </div>
  );
};

const SkeletonList = () => (
  <div className="space-y-6">
    {[1, 2].map((i) => (
      <Card key={i}>
        <CardHeader className="py-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <Card key={idx} className="p-4">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-3/5" />
                  <Skeleton className="h-3 w-2/5" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

export default RoomManagement;
