import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { toast } from "@/components/ui/use-toast";
import { apiService } from "@/services/apiService";
import {
  BookOpen,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  MoreVertical,
  Users,
  Trash2,
  List as ListIcon,
} from "lucide-react";
import { WeekCalendar, WeekCalEvent } from "@/components/scheduling/WeekCalendar";

export type Origin = "auto" | "manual";
export interface Schedule {
  schedule_id: string;
  school_year: string;
  semester: string;
  subj_code: string;
  subj_name: string;
  professor_name: string;
  section_name: string;
  schedule_type: string;
  start_time: string;
  end_time: string;
  days: string[];
  room_number: string | null;
  room_type: string | null;
  level: string;
  strand: string;
  origin: Origin;
  status?: string;
}

export interface ScheduleCardsProps {
  schedules: Schedule[];
  onScheduleClick?: (schedule: Schedule) => void;
  onDeleted?: (sectionName: string, removedIds: string[]) => void;
  onDeleteSection?: (sectionName: string, items: Schedule[]) => void; // kept for compat; unused
  cols?: 1 | 2 | 3 | 4;
  calendarMode?: "dialog" | "side";
}

const formatTimeAMPM = (time: string) => {
  if (!time) return "";
  const [h, mm] = time.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${mm} ${hour >= 12 ? "PM" : "AM"}`;
};

const toMinutesAny = (t: string) => {
  if (!t) return NaN;
  const parts = t.trim().split(":");
  const h = parseInt(parts[0] || "0", 10);
  const m = parseInt(parts[1] || "0", 10);
  return h * 60 + m;
};

const getOriginBadge = (origin: Origin) =>
  origin === "auto" ? (
    <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">Auto</Badge>
  ) : (
    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Manual</Badge>
  );

type Display = { subjCode: string; subjName: string; prof: string; type: string };
const displayFor = (s: Schedule): Display => {
  const startM = toMinutesAny(s.start_time);
  const endM = toMinutesAny(s.end_time);
  if (startM === 450 && endM === 480) {
    return { subjCode: "HOMEROOM", subjName: "Homeroom", prof: "ADVISER", type: "Homeroom" };
  }
  if (startM === 480 && endM === 510) {
    return { subjCode: "RECESS", subjName: "Recess", prof: "", type: "Recess" };
  }
  return {
    subjCode: s.subj_code || s.schedule_type || "",
    subjName: s.subj_name || "",
    prof: s.professor_name || "",
    type: s.schedule_type || "",
  };
};

const leftStripeClass = (s: Schedule) => {
  const t = displayFor(s).type.toLowerCase();
  if (t === "homeroom") return "before:bg-amber-400";
  if (t === "recess") return "before:bg-slate-400";
  return s.origin === "auto" ? "before:bg-indigo-400" : "before:bg-emerald-400";
};

const gridCols = (cols?: number) => {
  switch (cols) {
    case 1: return "grid-cols-1";
    case 2: return "grid-cols-1 md:grid-cols-2";
    case 4: return "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";
    case 3:
    default: return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
  }
};

type SectionGroup = {
  key: string;
  name: string;
  level?: string;
  strand?: string;
  items: Schedule[];
};

const useSectionGroups = (schedules: Schedule[]) => {
  return React.useMemo<SectionGroup[]>(() => {
    const map = new Map<string, SectionGroup>();
    for (const s of schedules) {
      const key = s.section_name.trim();
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: s.section_name,
          level: s.level,
          strand: s.strand,
          items: [],
        });
      }
      map.get(key)!.items.push(s);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [schedules]);
};

const toWeekEvents = (group: SectionGroup): WeekCalEvent[] => {
  const events: WeekCalEvent[] = [];
  group.items.forEach((s) => {
    const d = displayFor(s);
    (s.days || []).forEach((day) => {
      const dayLower = (day || "").toLowerCase() as WeekCalEvent["day"];
      events.push({
        id: `${s.schedule_id}-${dayLower}`,
        day: dayLower,
        start: s.start_time.slice(0, 5),
        end: s.end_time.slice(0, 5),
        title: d.subjCode || s.schedule_type,
        subtitle: d.subjName || "",
        meta: `${d.prof || "—"}${s.room_number ? ` • ${s.room_number}` : ""}`,
        schedule_type: s.schedule_type,
        origin: s.origin,
        raw: s,
      });
    });
  });
  return events;
};

// Helpers for list view
const DAY_ORDER: Record<string, number> = {
  monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 7,
};
const firstDayKey = (days: string[]) => {
  const k = (days?.[0] || "").toLowerCase();
  return DAY_ORDER[k] || 999;
};
const sortByDayThenTime = (a: Schedule, b: Schedule) => {
  const da = firstDayKey(a.days);
  const db = firstDayKey(b.days);
  if (da !== db) return da - db;
  const ta = toMinutesAny(a.start_time);
  const tb = toMinutesAny(b.start_time);
  if (ta !== tb) return ta - tb;
  return (a.subj_code || "").localeCompare(b.subj_code || "");
};
const daysLabel = (days: string[]) =>
  (days || []).map(d => (d?.[0]?.toUpperCase() || "") + d.slice(1,3).toLowerCase()).join(", ");

const SectionActionsMenu: React.FC<{
  section: SectionGroup;
  onViewList: (section: SectionGroup) => void;
}> = ({ section, onViewList }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button size="icon" variant="ghost" className="h-8 w-8">
        <MoreVertical className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuLabel>Actions</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={(e) => {
          e.stopPropagation();
          onViewList(section);
        }}
      >
        <ListIcon className="h-4 w-4 mr-2" />
        View schedules
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

export const ScheduleCards: React.FC<ScheduleCardsProps> = ({
  schedules,
  onScheduleClick,
  onDeleted,
  onDeleteSection, // not used here
  cols = 3,
  calendarMode = "dialog",
}) => {
  const groups = useSectionGroups(schedules);
  const [selected, setSelected] = React.useState<SectionGroup | null>(null);
  const [open, setOpen] = React.useState(false);

  // List view dialog state
  const [listOpen, setListOpen] = React.useState(false);
  const [listSection, setListSection] = React.useState<SectionGroup | null>(null);

  // Selection for bulk delete in list dialog
  const [selectedIds, setSelectedIds] = React.useState<Record<string, boolean>>({});
  const [listBusy, setListBusy] = React.useState(false);

  // Per-item busy & confirm (both card and list)
  const [itemBusy, setItemBusy] = React.useState<Record<string, boolean>>({});
  const [confirmSingleOpen, setConfirmSingleOpen] = React.useState(false);
  const [toDeleteSingle, setToDeleteSingle] = React.useState<Schedule | null>(null);

  const openCalendarFor = (g: SectionGroup) => {
    if (calendarMode === "dialog") {
      setSelected(g);
      setOpen(true);
    } else {
      setSelected(g);
    }
  };

  const openListFor = (g: SectionGroup) => {
    const sorted = [...g.items].sort(sortByDayThenTime);
    setListSection({ ...g, items: sorted });
    setSelectedIds({});
    setListOpen(true);
  };

  const promptDeleteSingle = (sched: Schedule) => {
    setToDeleteSingle(sched);
    setConfirmSingleOpen(true);
  };

  const performDeleteSingle = async () => {
    if (!toDeleteSingle) return;
    const sched = toDeleteSingle;
    const idKey = String(sched.schedule_id);
    const idNum = Number(idKey);
    setItemBusy((m) => ({ ...m, [idKey]: true }));

    try {
      const r = await apiService.deleteSchedule(idNum);
      if (!r?.success) throw new Error(r?.message || "Delete failed");

      toast({
        title: "Deleted",
        description: `Removed ${displayFor(sched).subjCode || "schedule"} from ${sched.section_name}.`,
      });

      // propagate to parent
      onDeleted?.(sched.section_name, [idKey]);

      // if list open & same section, remove locally
      if (listSection?.key === sched.section_name.trim()) {
        setListSection((prev) =>
          prev ? { ...prev, items: prev.items.filter(i => String(i.schedule_id) !== idKey) } : prev
        );
        setSelectedIds((prev) => {
          const next = { ...prev };
          delete next[idKey];
          return next;
        });
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Failed to delete schedule.",
        variant: "destructive",
      });
    } finally {
      setItemBusy((m) => ({ ...m, [idKey]: false }));
      setConfirmSingleOpen(false);
      setToDeleteSingle(null);
    }
  };

  // Bulk selection helpers
  const listIds = React.useMemo(
    () => (listSection ? listSection.items.map(i => String(i.schedule_id)) : []),
    [listSection]
  );
  const allChecked = listIds.length > 0 && listIds.every(id => selectedIds[id]);
  const someChecked = listIds.some(id => selectedIds[id]) && !allChecked;
  const selectedIdList = listIds.filter(id => selectedIds[id]);

  const toggleAll = () => {
    if (!listSection) return;
    const next: Record<string, boolean> = {};
    const check = !allChecked;
    for (const id of listIds) next[id] = check;
    setSelectedIds(next);
  };

  const toggleOne = (id: string) => {
    setSelectedIds((p) => ({ ...p, [id]: !p[id] }));
  };

  const bulkDeleteSelected = async () => {
  if (!listSection || selectedIdList.length === 0) return;

  const ok = window.confirm(
    `Delete ${selectedIdList.length} selected schedule${selectedIdList.length > 1 ? "s" : ""} from ${listSection.name}? This cannot be undone.`
  );
  if (!ok) return;

  setListBusy(true);

  const numericIds = selectedIdList
    .map((id) => Number(id))
    .filter((n) => Number.isFinite(n) && n > 0);

  let removedIds: string[] = [];

  try {
    // Try BULK first
    const bulk = await apiService.deleteSchedulesBulk(numericIds);

    if (bulk?.success) {
      // use deleted_ids when provided; otherwise assume all requested were deleted
      const fromServer = (bulk.data as any)?.deleted_ids as number[] | undefined;
      removedIds = (fromServer ?? numericIds).map(String);
    } else {
      // Fallback: sequential delete WITHOUT per-item sync; then one sync at the end
      await Promise.all(
        numericIds.map((id) => apiService.makeRequest("DELETE", `/schedule.php?id=${id}`))
      );
      await apiService.syncToFirebase();
      removedIds = numericIds.map(String);
    }

    // Update local dialog list
    setListSection((prev) =>
      prev
        ? { ...prev, items: prev.items.filter((i) => !removedIds.includes(String(i.schedule_id))) }
        : prev
    );
    setSelectedIds({});

    toast({
      title: "Deleted",
      description: `Removed ${removedIds.length} schedule${removedIds.length > 1 ? "s" : ""} from ${listSection.name}.`,
    });

    // Notify parent page
    onDeleted?.(listSection.name, removedIds);

    // Close the dialog and refresh the page to ensure everything is in sync
    setListOpen(false);
    // small delay lets the toast render before reload (optional)
    setTimeout(() => {
      window.location.reload();
    }, 250);
  } catch (e: any) {
    toast({
      title: "Error",
      description: e?.message || "Bulk delete failed.",
      variant: "destructive",
    });
  } finally {
    setListBusy(false);
  }
  };


  return (
    <div className={`w-full ${calendarMode === "side" ? "grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4" : ""}`}>
      {/* GRID */}
      <div>
        <div className={`grid gap-4 ${gridCols(cols)}`}>
          {groups.map((g) => {
            const preview = g.items.slice(0, 2);
            const total = g.items.length;
            return (
              <div
                key={g.key}
                role="button"
                onClick={() => openCalendarFor(g)}
                className="relative overflow-hidden rounded-xl border bg-white hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="absolute top-2 right-2 z-10">
                  <SectionActionsMenu section={g} onViewList={openListFor} />
                </div>

                {/* Header */}
                <div className="p-4 pr-12">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="text-base font-semibold truncate">{g.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        Grade {g.level ?? "—"} • {g.strand ?? "—"}
                      </div>
                    </div>
                    <Badge variant="secondary">{total} class{total !== 1 ? "es" : ""}</Badge>
                  </div>
                </div>

                {/* Body preview */}
                <div className="px-4 pb-4 space-y-2">
                  {preview.map((s) => {
                    const d = displayFor(s);
                    const stripe = leftStripeClass(s);
                    const busyThis = itemBusy[String(s.schedule_id)] === true;
                    return (
                      <div
                        key={s.schedule_id}
                        className={`relative rounded-lg border p-2 pr-9 before:absolute before:left-0 before:top-0 before:h-full before:w-1 ${stripe}`}
                        onClick={(e) => { e.stopPropagation(); openCalendarFor(g); }}
                      >
                        {/* Per-item delete button (with confirm) */}
                        <button
                          className="absolute right-2 top-2 rounded-md p-1 hover:bg-red-50 text-red-600"
                          title="Delete this schedule"
                          onClick={(e) => { e.stopPropagation(); promptDeleteSingle(s); }}
                          disabled={busyThis}
                        >
                          <Trash2 className={`h-4 w-4 ${busyThis ? "opacity-50" : ""}`} />
                        </button>

                        <div className="flex items-start gap-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">
                              {d.subjCode || s.schedule_type}{" "}
                              <span className="text-xs text-muted-foreground">({d.subjName})</span>
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                              <span className="inline-flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {d.prof || "—"}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTimeAMPM(s.start_time)}–{formatTimeAMPM(s.end_time)}
                              </span>
                              {s.room_number && (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {s.room_number}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {total > preview.length && (
                    <div className="text-xs text-muted-foreground pl-1">+{total - preview.length} more…</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SIDE PANEL */}
      {calendarMode === "side" && (
        <div className="hidden lg:block rounded-xl border bg-white p-4 sticky top-4 h-fit">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-sm text-muted-foreground">Section</div>
              <div className="text-lg font-semibold">{selected?.name ?? "—"}</div>
            </div>
          </div>
          {selected ? (
            <WeekCalendar
              events={toWeekEvents(selected)}
              startTime="07:30"
              endTime="16:30"
              defaultPxPerMin={1.2}
              onEventClick={(ev) => onScheduleClick?.(ev.raw)}
            />
          ) : (
            <div className="text-sm text-muted-foreground">
              Select a section to preview its weekly calendar.
            </div>
          )}
        </div>
      )}

      {/* CALENDAR DIALOG */}
      {calendarMode === "dialog" && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            className="
              w-[98vw] sm:w-auto sm:max-w-[95vw] lg:max-w-[1320px] xl:max-w-[1440px]
              p-0
              max-h-[92vh]
              overflow-hidden
            "
          >
            <div className="flex flex-col h-[88vh] sm:h-[82vh]">
              <DialogHeader className="px-4 pt-4 pb-2">
                <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <CalendarIcon className="h-5 w-5" />
                  {selected?.name ?? "Section"}
                </DialogTitle>
              </DialogHeader>

              <div className="px-2 sm:px-4 pb-4 flex-1 min-h-0 overflow-auto overscroll-contain">
                {selected && (
                  <div className="rounded-lg border bg-white">
                    <WeekCalendar
                      events={toWeekEvents(selected)}
                      startTime="07:30"
                      endTime="16:30"
                      defaultPxPerMin={1.2}
                      onEventClick={(ev) => onScheduleClick?.(ev.raw)}
                    />
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* LIST VIEW DIALOG (with bulk delete) */}
      <Dialog open={listOpen} onOpenChange={setListOpen}>
        <DialogContent className="w-[98vw] sm:w-auto sm:max-w-[1100px] p-0">
          <div className="flex flex-col max-h-[85vh]">
            <DialogHeader className="px-4 pt-4 pb-2">
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                <ListIcon className="h-5 w-5" />
                {listSection?.name ?? "Schedules"}
              </DialogTitle>
            </DialogHeader>

            <div className="px-4 pb-4 overflow-auto">
              {listSection && (
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground">
                    Grade {listSection.level ?? "—"} • {listSection.strand ?? "—"} • {listSection.items.length} item{listSection.items.length !== 1 ? "s" : ""}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={bulkDeleteSelected}
                      disabled={listBusy || selectedIdList.length === 0}
                    >
                      {listBusy ? "Deleting..." : `Delete selected (${selectedIdList.length})`}
                    </Button>
                  </div>
                </div>
              )}

              <div className="rounded-lg border overflow-hidden">
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
                        <th className="w-10">
                          <input
                            type="checkbox"
                            aria-label="Select all"
                            checked={allChecked}
                            ref={(el) => {
                              if (el) el.indeterminate = someChecked;
                            }}
                            onChange={toggleAll}
                          />
                        </th>
                        <th>Subject</th>
                        <th>Time</th>
                        <th>Days</th>
                        <th>Room</th>
                        <th>Professor</th>
                        <th>Type</th>
                        <th>Origin</th>
                        <th className="text-right pr-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listSection?.items.map((s) => {
                        const d = displayFor(s);
                        const key = String(s.schedule_id);
                        const busyThis = itemBusy[key] === true;
                        return (
                          <tr key={key} className="border-t align-top">
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={!!selectedIds[key]}
                                onChange={() => toggleOne(key)}
                                aria-label={`Select ${d.subjCode || s.schedule_type}`}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <div className="font-medium">{d.subjCode || s.schedule_type}</div>
                              <div className="text-xs text-muted-foreground">{d.subjName}</div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {formatTimeAMPM(s.start_time)}–{formatTimeAMPM(s.end_time)}
                            </td>
                            <td className="px-3 py-2">{daysLabel(s.days)}</td>
                            <td className="px-3 py-2">{s.room_number || "—"}</td>
                            <td className="px-3 py-2">{d.prof || "—"}</td>
                            <td className="px-3 py-2">{s.schedule_type}</td>
                            <td className="px-3 py-2">{getOriginBadge(s.origin)}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-2 text-red-600 hover:bg-red-50"
                                  onClick={() => promptDeleteSingle(s)}
                                  disabled={busyThis}
                                  title="Delete"
                                >
                                  <Trash2 className={`h-4 w-4 ${busyThis ? "opacity-50" : ""}`} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {(!listSection || listSection.items.length === 0) && (
                        <tr>
                          <td colSpan={9} className="px-3 py-6 text-center text-sm text-muted-foreground">
                            No schedules to show.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm SINGLE deletion (used by both card + list item) */}
      <AlertDialog open={confirmSingleOpen} onOpenChange={setConfirmSingleOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={performDeleteSingle}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
