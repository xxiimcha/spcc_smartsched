import * as React from "react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  MoreVertical,
  Pencil,
  Trash2,
  Layers3,
} from "lucide-react";

/** Keep in sync with your page's Schedule type */
export type Origin = "auto" | "manual";
export interface Schedule {
  schedule_id: string;
  school_year: string;
  semester: string;
  subj_code: string;
  subj_name: string;
  professor_name: string;
  section_name: string;
  schedule_type: string; // "Onsite", "Homeroom", "Recess", etc.
  start_time: string;     // "HH:MM"
  end_time: string;       // "HH:MM"
  days: string[];
  room_number: string | null;
  room_type: string | null;
  level: string;
  strand: string;
  origin: Origin;
  status?: string;
}

export type GroupMode = "none" | "section" | "section-subject";

export interface ScheduleTableProps {
  schedules: Schedule[];
  /** Row click (open details) */
  onRowClick?: (schedule: Schedule) => void;
  /** “Change Professor” in the row actions */
  onEditProfessor?: (schedule: Schedule) => void;
  /** “Review” (only shown for auto + pending) */
  onReview?: (schedule: Schedule) => void;
  /** “Delete” in the row actions */
  onDelete?: (schedule: Schedule) => void;
  /** Grouping mode (default: "section-subject") */
  groupMode?: GroupMode;
}

const formatTimeAMPM = (time: string) => {
  if (!time) return "";
  const [h, mm] = time.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${mm} ${hour >= 12 ? "PM" : "AM"}`;
};

const getOriginBadge = (origin: Origin) =>
  origin === "auto" ? (
    <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">Auto</Badge>
  ) : (
    <Badge className="bg-amber-100 text-amber-800 border-amber-200">Manual</Badge>
  );

const isReviewable = (s: Schedule) =>
  s.origin === "auto" && (s.status || "").toLowerCase() === "pending";

const RowActionsMenu: React.FC<{
  schedule: Schedule;
  onEditProfessor?: (s: Schedule) => void;
  onReview?: (s: Schedule) => void;
  onDelete?: (s: Schedule) => void;
}> = ({ schedule, onEditProfessor, onReview, onDelete }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      <Button size="icon" variant="ghost" className="h-8 w-8">
        <MoreVertical className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      <DropdownMenuLabel>Actions</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => onEditProfessor?.(schedule)}>
        <Pencil className="mr-2 h-4 w-4" />
        Change Professor
      </DropdownMenuItem>
      {isReviewable(schedule) && (
        <DropdownMenuItem onClick={() => onReview?.(schedule)}>
          <ClipboardCheck className="mr-2 h-4 w-4" />
          Review
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => onDelete?.(schedule)}>
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

/* ---------- Display-only override for static slots ---------- */
const displayFor = (s: Schedule) => {
  const start = (s.start_time || "").trim();
  const end   = (s.end_time || "").trim();

  if (start === "07:30" && end === "08:00") {
    return { subjCode: "HOMEROOM", subjName: "Homeroom", prof: "ADVISER", type: "Homeroom" };
  }
  if (start === "08:00" && end === "08:30") {
    return { subjCode: "RECESS", subjName: "Recess", prof: "", type: "Recess" };
  }
  return {
    subjCode: s.subj_code || s.schedule_type,
    subjName: s.subj_name,
    prof: s.professor_name || "",
    type: s.schedule_type,
  };
};

/* ---------- Group builders ---------- */
type SectionGroup = {
  key: string;              // section_name
  level: string;
  strand: string;
  rows: Schedule[];
};

type SectionSubjectGroup = {
  sectionKey: string;       // section_name
  subjectKey: string;       // subj_code || schedule_type
  subjName: string;         // subj_name
  level: string;
  strand: string;
  rows: Schedule[];
};

function buildSectionGroups(rows: Schedule[]): SectionGroup[] {
  const map = new Map<string, SectionGroup>();
  const sorted = [...rows].sort((a, b) => {
    const sA = a.section_name.localeCompare(b.section_name);
    if (sA !== 0) return sA;
    const kA = (a.subj_code || a.schedule_type).localeCompare(b.subj_code || b.schedule_type);
    if (kA !== 0) return kA;
    return a.start_time.localeCompare(b.start_time);
  });
  for (const r of sorted) {
    const k = r.section_name;
    if (!map.has(k)) {
      map.set(k, { key: k, level: r.level, strand: r.strand, rows: [] });
    }
    map.get(k)!.rows.push(r);
  }
  return Array.from(map.values());
}

function buildSectionSubjectGroups(rows: Schedule[]): SectionSubjectGroup[] {
  const map = new Map<string, SectionSubjectGroup>();
  const sorted = [...rows].sort((a, b) => {
    const sA = a.section_name.localeCompare(b.section_name);
    if (sA !== 0) return sA;
    const kA = (a.subj_code || a.schedule_type).localeCompare(b.subj_code || b.schedule_type);
    if (kA !== 0) return kA;
    return a.start_time.localeCompare(b.start_time);
  });

  for (const r of sorted) {
    const subjectKey = r.subj_code || r.schedule_type;
    const k = `${r.section_name}||${subjectKey}`;
    if (!map.has(k)) {
      map.set(k, {
        sectionKey: r.section_name,
        subjectKey,
        subjName: r.subj_name,
        level: r.level,
        strand: r.strand,
        rows: [],
      });
    }
    map.get(k)!.rows.push(r);
  }

  return Array.from(map.values());
}

/* ---------- Component ---------- */
export const ScheduleTable: React.FC<ScheduleTableProps> = ({
  schedules,
  onRowClick,
  onEditProfessor,
  onReview,
  onDelete,
  groupMode = "section-subject",
}) => {
  // collapsed state per group key
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (k: string) => setCollapsed((p) => ({ ...p, [k]: !p[k] }));

  const sectionGroups = useMemo(
    () => (groupMode === "section" ? buildSectionGroups(schedules) : []),
    [schedules, groupMode]
  );

  const sectionSubjectGroups = useMemo(
    () => (groupMode === "section-subject" ? buildSectionSubjectGroups(schedules) : []),
    [schedules, groupMode]
  );

  return (
    <div className="rounded-lg border bg-white">
      <div className="flex items-center gap-2 px-3 py-2 border-b text-xs text-muted-foreground">
        <Layers3 className="h-3.5 w-3.5" />
        Grouping: <Badge variant="outline" className="text-[10px]">{groupMode}</Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[26%]">
              {groupMode === "none" ? "Section" : groupMode === "section" ? "Section" : "Section / Subject"}
            </TableHead>
            <TableHead className="w-[18%]">Subject</TableHead>
            <TableHead className="w-[16%]">Professor</TableHead>
            <TableHead className="w-[14%]">Time</TableHead>
            <TableHead className="w-[14%]">Days</TableHead>
            <TableHead className="w-[10%]">Room</TableHead>
            <TableHead className="w-[8%]">Origin</TableHead>
            <TableHead className="w-[60px] text-right pr-6"> </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {/* No grouping */}
          {groupMode === "none" &&
            schedules.map((s) => {
              const d = displayFor(s);
              return (
                <TableRow key={s.schedule_id} className="cursor-pointer" onClick={() => onRowClick?.(s)}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{s.section_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.level} - {s.strand}
                      </p>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div>
                      <p className="font-medium">{d.subjCode}</p>
                      <p className="text-xs text-muted-foreground">{d.subjName}</p>
                    </div>
                  </TableCell>

                  <TableCell>{d.prof || "—"}</TableCell>

                  <TableCell>
                    {formatTimeAMPM(s.start_time)} - {formatTimeAMPM(s.end_time)}
                  </TableCell>

                  <TableCell>
                    <div className="flex gap-1">
                      {s.days.slice(0, 3).map((dayStr) => (
                        <Badge key={dayStr} variant="outline" className="text-xs">
                          {dayStr.slice(0, 3)}
                        </Badge>
                      ))}
                      {s.days.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{s.days.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>{s.room_number || "No Room"}</TableCell>
                  <TableCell>{getOriginBadge(s.origin)}</TableCell>

                  <TableCell className="text-right pr-2" onClick={(e) => e.stopPropagation()}>
                    <RowActionsMenu
                      schedule={s}
                      onEditProfessor={onEditProfessor}
                      onReview={onReview}
                      onDelete={onDelete}
                    />
                  </TableCell>
                </TableRow>
              );
            })}

          {/* Group by Section */}
          {groupMode === "section" &&
            sectionGroups.map((g) => {
              const key = g.key;
              const isCollapsed = !!collapsed[key];
              return (
                <React.Fragment key={key}>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableCell colSpan={8} className="py-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="inline-flex items-center text-sm text-gray-700 hover:text-gray-900"
                            onClick={() => toggle(key)}
                          >
                            {isCollapsed ? (
                              <ChevronRight className="h-4 w-4 mr-1" />
                            ) : (
                              <ChevronDown className="h-4 w-4 mr-1" />
                            )}
                            <span className="font-semibold">{g.key}</span>
                          </button>
                          <span className="text-xs text-muted-foreground">
                            {g.level} • {g.strand} • {g.rows.length} item{g.rows.length > 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>

                  {!isCollapsed &&
                    g.rows.map((s) => {
                      const d = displayFor(s);
                      return (
                        <TableRow key={s.schedule_id} className="cursor-pointer" onClick={() => onRowClick?.(s)}>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">{g.key}</div>
                          </TableCell>

                          <TableCell>
                            <div>
                              <p className="font-medium">{d.subjCode}</p>
                              <p className="text-xs text-muted-foreground">{d.subjName}</p>
                            </div>
                          </TableCell>

                          <TableCell>{d.prof || "—"}</TableCell>

                          <TableCell>
                            {formatTimeAMPM(s.start_time)} - {formatTimeAMPM(s.end_time)}
                          </TableCell>

                          <TableCell>
                            <div className="flex gap-1">
                              {s.days.slice(0, 3).map((dayStr) => (
                                <Badge key={dayStr} variant="outline" className="text-xs">
                                  {dayStr.slice(0, 3)}
                                </Badge>
                              ))}
                              {s.days.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{s.days.length - 3}
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          <TableCell>{s.room_number || "No Room"}</TableCell>
                          <TableCell>{getOriginBadge(s.origin)}</TableCell>
                          <TableCell className="text-right pr-2" onClick={(e) => e.stopPropagation()}>
                            <RowActionsMenu
                              schedule={s}
                              onEditProfessor={onEditProfessor}
                              onReview={onReview}
                              onDelete={onDelete}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </React.Fragment>
              );
            })}

          {/* Group by Section -> Subject */}
          {groupMode === "section-subject" &&
            (() => {
              const bySection = new Map<
                string,
                { level: string; strand: string; subjGroups: SectionSubjectGroup[] }
              >();

              for (const g of sectionSubjectGroups) {
                if (!bySection.has(g.sectionKey)) {
                  bySection.set(g.sectionKey, { level: g.level, strand: g.strand, subjGroups: [] });
                }
                bySection.get(g.sectionKey)!.subjGroups.push(g);
              }

              for (const v of bySection.values()) {
                v.subjGroups.sort((a, b) => a.subjectKey.localeCompare(b.subjectKey));
              }

              const sectionKeys = Array.from(bySection.keys()).sort((a, b) => a.localeCompare(b));

              return sectionKeys.map((section) => {
                const { level, strand, subjGroups } = bySection.get(section)!;
                const sectionCollapsed = !!collapsed[section];

                return (
                  <React.Fragment key={section}>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableCell colSpan={8} className="py-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="inline-flex items-center text-sm text-gray-700 hover:text-gray-900"
                              onClick={() => toggle(section)}
                            >
                              {sectionCollapsed ? (
                                <ChevronRight className="h-4 w-4 mr-1" />
                              ) : (
                                <ChevronDown className="h-4 w-4 mr-1" />
                              )}
                              <span className="font-semibold">{section}</span>
                            </button>
                            <span className="text-xs text-muted-foreground">
                              {level} • {strand} • {subjGroups.reduce((sum, g) => sum + g.rows.length, 0)} item
                              {subjGroups.reduce((sum, g) => sum + g.rows.length, 0) > 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>

                    {!sectionCollapsed &&
                      subjGroups.map((sg) => {
                        const sgKey = `${section}||${sg.subjectKey}`;
                        const subjectCollapsed = !!collapsed[sgKey];

                        return (
                          <React.Fragment key={sgKey}>
                            <TableRow className="bg-white hover:bg-white">
                              <TableCell colSpan={8} className="py-2 pl-8">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    className="inline-flex items-center text-sm text-gray-700 hover:text-gray-900"
                                    onClick={() => toggle(sgKey)}
                                  >
                                    {subjectCollapsed ? (
                                      <ChevronRight className="h-4 w-4 mr-1" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4 mr-1" />
                                    )}
                                    <span className="font-medium">{sg.subjectKey}</span>
                                  </button>
                                  <span className="text-xs text-muted-foreground">
                                    {sg.subjName || "—"} • {sg.rows.length} item{sg.rows.length > 1 ? "s" : ""}
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>

                            {!subjectCollapsed &&
                              sg.rows.map((s) => {
                                const d = displayFor(s);
                                return (
                                  <TableRow
                                    key={s.schedule_id}
                                    className="cursor-pointer"
                                    onClick={() => onRowClick?.(s)}
                                  >
                                    <TableCell>
                                      <div className="text-xs text-muted-foreground">{section}</div>
                                    </TableCell>

                                    <TableCell>
                                      <div>
                                        <p className="font-medium">{d.subjCode}</p>
                                        <p className="text-xs text-muted-foreground">{d.subjName}</p>
                                      </div>
                                    </TableCell>

                                    <TableCell>{d.prof || "—"}</TableCell>

                                    <TableCell>
                                      {formatTimeAMPM(s.start_time)} - {formatTimeAMPM(s.end_time)}
                                    </TableCell>

                                    <TableCell>
                                      <div className="flex gap-1">
                                        {s.days.slice(0, 3).map((dayStr) => (
                                          <Badge key={dayStr} variant="outline" className="text-xs">
                                            {dayStr.slice(0, 3)}
                                          </Badge>
                                        ))}
                                        {s.days.length > 3 && (
                                          <Badge variant="outline" className="text-xs">
                                            +{s.days.length - 3}
                                          </Badge>
                                        )}
                                      </div>
                                    </TableCell>

                                    <TableCell>{s.room_number || "No Room"}</TableCell>
                                    <TableCell>{getOriginBadge(s.origin)}</TableCell>

                                    <TableCell className="text-right pr-2" onClick={(e) => e.stopPropagation()}>
                                      <RowActionsMenu
                                        schedule={s}
                                        onEditProfessor={onEditProfessor}
                                        onReview={onReview}
                                        onDelete={onDelete}
                                      />
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                          </React.Fragment>
                        );
                      })}
                  </React.Fragment>
                );
              });
            })()}
        </TableBody>
      </Table>
    </div>
  );
};
