// src/pages/ProfessorDashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, List, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiService } from "@/services/apiService";

type ScheduleRow = {
  schedule_id?: number;
  school_year?: string;
  semester?: string;
  subj_id: number;
  prof_id: number;
  section_id: number;
  room_id?: number;
  schedule_type?: "Onsite" | "Online";
  start_time: string; // "08:00" or "08:00:00"
  end_time: string;
  days: string[] | string;  // ["Mon","Wed"] or "Mon,Wed"
  subject?: string;
  subject_name?: string;
  subj_code?: string;
  section_name?: string;
  room_number?: string;
};

type ViewMode = "list" | "calendar";

const WEEK_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_INDEX: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

function normalizeDays(d: string | string[] | undefined | null): string[] {
  if (!d) return [];
  const map: Record<string, string> = {
    sun: "Sun", sunday: "Sun",
    mon: "Mon", monday: "Mon",
    tue: "Tue", tues: "Tue", tuesday: "Tue",
    wed: "Wed", wednesday: "Wed",
    thu: "Thu", thur: "Thu", thurs: "Thu", thursday: "Thu",
    fri: "Fri", friday: "Fri",
    sat: "Sat", saturday: "Sat",
    "0": "Sun", "1": "Mon", "2": "Tue", "3": "Wed",
    "4": "Thu", "5": "Fri", "6": "Sat"
  };

  const arr = Array.isArray(d)
    ? d.map(String)
    : String(d)
        .replace(/[^\w, ]+/g, ",") // turn separators into commas
        .split(/[,\s]+/);

  return arr
    .map((x) => map[x.trim().toLowerCase()] || "")
    .filter(Boolean);
}

function fmtTime(t?: string) {
  if (!t) return "—";
  const [h, m] = String(t).split(":");
  if (!h) return t;
  const d = new Date();
  d.setHours(parseInt(h, 10), parseInt(m || "0", 10), 0, 0);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function parseToMinutes(time?: string): number {
  if (!time) return 0;
  const [h, m] = String(time).split(":").map((x) => parseInt(x || "0", 10));
  return h * 60 + (m || 0);
}

function startOfWeek(date = new Date(), weekStartsOn: 0 | 1 = 1) {
  const d = new Date(date);
  const diff = (d.getDay() + 7 - weekStartsOn) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const ProfessorDashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const initialProfId = (user as any)?.prof_id ?? (user as any)?.professor_id ?? null;
  const userId = (user as any)?.user_id ?? (user as any)?.id ?? null;

  const [profId, setProfId] = useState<number | null>(initialProfId);
  const [loading, setLoading] = useState(true);
  const [resolvingProfId, setResolvingProfId] = useState(false);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [view, setView] = useState<ViewMode>("list");

  // Calendar state
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), 1));
  const dayDates = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  }), [weekStart]);

  // Calendar time window
  const MIN_MIN = 7 * 60;  // 07:00
  const MAX_MIN = 20 * 60; // 20:00
  const totalMinutes = MAX_MIN - MIN_MIN;
  const hourRows = (MAX_MIN - MIN_MIN) / 60 + 1;

  // 1) Resolve prof_id from user_id if needed
  useEffect(() => {
    let cancelled = false;
    async function resolveProf() {
      if (profId || !userId) return;
      try {
        setResolvingProfId(true);
        const profs = await apiService.getProfessors();
        const list = Array.isArray(profs.data) ? profs.data : [];
        const match = list.find((p: any) => Number(p.user_id) === Number(userId));
        if (!cancelled) setProfId(match ? Number(match.prof_id) : null);
      } catch (e: any) {
        if (!cancelled) {
          toast({
            title: "Could not resolve professor profile",
            description: e?.message || "Ask admin to link your user to a professor profile.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setResolvingProfId(false);
      }
    }
    resolveProf();
    return () => { cancelled = true; };
  }, [profId, userId, toast]);

  // 2) Load schedules once we have profId
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!profId) { setLoading(false); return; }
      try {
        setLoading(true);
        const res = await apiService.getSchedules({ professor_id: profId });
        const raw: any[] = Array.isArray(res.data) ? res.data : [];
        const mapped: ScheduleRow[] = raw.map((r) => ({
          schedule_id: Number(r.schedule_id ?? r.id ?? r.sched_id ?? 0),
          school_year: r.school_year,
          semester: r.semester,
          subj_id: Number(r.subj_id ?? r.subject_id ?? 0),
          prof_id: Number(r.prof_id ?? r.professor_id ?? profId),
          section_id: Number(r.section_id ?? 0),
          room_id: r.room_id != null ? Number(r.room_id) : undefined,
          schedule_type: (r.schedule_type as "Onsite" | "Online") ?? undefined,
          start_time: String(r.start_time ?? ""),
          end_time: String(r.end_time ?? ""),
          days: normalizeDays(r.days),
          subject: r.subject ?? r.subject_name ?? r.subj_name,
          subject_name: r.subject_name ?? r.subj_name ?? r.subject,
          subj_code: r.subj_code,
          section_name: r.section_name ?? r.section,
          room_number: r.room_number ?? r.room,
        }));
        if (!cancelled) setSchedules(mapped);
      } catch (err: any) {
        if (!cancelled) {
          toast({
            title: "Failed to load schedule",
            description: err?.message || "Please check your connection or try again.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [profId, toast]);

  // LIST VIEW: sort upcoming
  const today = useMemo(() => new Date(), []);
  const todayLabel = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][today.getDay()];
  const upcoming = useMemo(() => {
    if (schedules.length === 0) return [];
    const order = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const idxToday = order.indexOf(todayLabel);

    const sorted = [...schedules].sort((a, b) => {
      const aDays = normalizeDays(a.days);
      const bDays = normalizeDays(b.days);
      const aNext = aDays.map((d) => (order.indexOf(d) - idxToday + 7) % 7).sort((x, y) => x - y)[0] ?? 99;
      const bNext = bDays.map((d) => (order.indexOf(d) - idxToday + 7) % 7).sort((x, y) => x - y)[0] ?? 99;
      if (aNext !== bNext) return aNext - bNext;
      return (a.start_time || "").localeCompare(b.start_time || "");
    });

    const seen = new Set<string>();
    return sorted.filter((s) => {
      const key = `${normalizeDays(s.days).join(",")}|${s.start_time}|${s.end_time}|${s.subj_id}|${s.section_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [schedules, todayLabel]);

  // CALENDAR EVENTS (repeat weekly based on day labels)
  type CalEvent = {
    key: string;
    dayIndex: number;   // 0..6 (Mon-first)
    label: string;
    startMin: number;
    endMin: number;
    section?: string;
    room?: string;
  };

  const weekEvents: CalEvent[] = useMemo(() => {
    if (schedules.length === 0) return [];
    const events: CalEvent[] = [];
    for (const s of schedules) {
      for (const d of normalizeDays(s.days)) {
        if (!(d in DAY_INDEX)) continue;
        const startMin = parseToMinutes(s.start_time);
        const endMin = Math.max(startMin + 30, parseToMinutes(s.end_time));
        events.push({
          key: `${s.schedule_id}-${d}-${s.start_time}-${s.section_id}`,
          dayIndex: DAY_INDEX[d],
          label: s.subject_name || s.subject || s.subj_code || `Subject #${s.subj_id}`,
          startMin,
          endMin,
          section: s.section_name,
          room: s.room_number,
        });
      }
    }
    return events;
  }, [schedules]);

  const titleRange = `${dayDates[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${dayDates[6].toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Professor Schedule</h1>
          <p className="text-sm text-muted-foreground">Switch between list and calendar views.</p>
        </div>

        {/* View toggle */}
        <div className="flex gap-2">
          <Button
            variant={view === "list" ? "default" : "outline"}
            onClick={() => setView("list")}
            className="flex items-center gap-2"
          >
            <List className="h-4 w-4" /> List
          </Button>
          <Button
            variant={view === "calendar" ? "default" : "outline"}
            onClick={() => setView("calendar")}
            className="flex items-center gap-2"
          >
            <CalendarDays className="h-4 w-4" /> Calendar
          </Button>
        </div>
      </div>

      {view === "list" ? (
        /* ------------------------------ LIST VIEW ------------------------------ */
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>All Scheduled Classes</CardTitle>
            <span className="text-sm text-muted-foreground">
              {loading || resolvingProfId ? "Loading…" : `${upcoming.length} item(s)`}
            </span>
          </CardHeader>
          <CardContent>
            {resolvingProfId ? (
              <p className="text-sm text-muted-foreground">Linking your professor profile…</p>
            ) : loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No classes found.</p>
            ) : (
              <ul className="divide-y">
                {upcoming.map((s) => {
                  const days = normalizeDays(s.days);
                  const label = s.subject_name || s.subject || s.subj_code || `Subject #${s.subj_id}`;
                  return (
                    <li
                      key={`${s.schedule_id}-${s.subj_id}-${s.section_id}-${s.start_time}`}
                      className="py-3 flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">{label}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {s.section_name ? `${s.section_name} • ` : ""}
                          {days.join(", ") || "—"} • {fmtTime(s.start_time)}–{fmtTime(s.end_time)}
                          {s.room_number ? ` • Room ${s.room_number}` : ""}
                          {s.schedule_type ? ` • ${s.schedule_type}` : ""}
                        </div>
                      </div>
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0 ml-3" />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : (
        /* ---------------------------- CALENDAR VIEW --------------------------- */
        <Card className="shadow-md border border-muted/30">
          <CardHeader className="flex items-center justify-between bg-muted/10 rounded-t-lg px-5 py-3 border-b">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              Week Calendar{" "}
              <span className="text-sm font-normal text-muted-foreground">
                ({titleRange})
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setWeekStart((d) => {
                    const nd = new Date(d);
                    nd.setDate(d.getDate() - 7);
                    return startOfWeek(nd, 1);
                  })
                }
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Prev
              </Button>
              <Button size="sm" variant="outline" onClick={() => setWeekStart(startOfWeek(new Date(), 1))}>
                Today
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setWeekStart((d) => {
                    const nd = new Date(d);
                    nd.setDate(d.getDate() + 7);
                    return startOfWeek(nd, 1);
                  })
                }
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            {resolvingProfId ? (
              <p className="text-sm text-muted-foreground p-4">
                Linking your professor profile…
              </p>
            ) : loading ? (
              <p className="text-sm text-muted-foreground p-4">Loading…</p>
            ) : (
              <div className="w-full overflow-x-auto">
                <div className="min-w-[950px]">
                  {/* Header Row */}
                  <div className="grid bg-muted/10 sticky top-0 z-10" style={{ gridTemplateColumns: "80px repeat(7, 1fr)" }}>
                    <div className="border-r border-muted/30 bg-background" />
                    {WEEK_ORDER.map((d, i) => (
                      <div
                        key={d}
                        className="px-3 py-3 text-sm font-medium border-l border-muted/30 text-center"
                      >
                        {d}
                        <div className="text-xs text-muted-foreground">
                          {dayDates[i].toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Grid Container */}
                  <div className="relative grid border-t border-muted/30" style={{ gridTemplateColumns: "80px repeat(7, 1fr)" }}>
                    {/* Time Ruler */}
                    <div className="sticky left-0 bg-background border-r border-muted/30 z-20">
                      {Array.from({ length: hourRows }, (_, i) => {
                        const m = MIN_MIN + i * 60;
                        return (
                          <div
                            key={m}
                            className={`h-16 relative ${i % 2 === 0 ? "bg-muted/5" : ""}`}
                          >
                            <div className="absolute top-1 right-2 text-[11px] text-muted-foreground font-medium">
                              {fmtTime(`${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`)}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Day Columns */}
                    {Array.from({ length: 7 }).map((_, col) => (
                      <div
                        key={col}
                        className="relative border-l border-muted/30 overflow-hidden"
                      >
                        {/* Hour Blocks */}
                        {Array.from({ length: hourRows }, (_, i) => (
                          <div
                            key={i}
                            className={`h-16 border-t border-dashed border-muted/40 ${
                              i % 2 === 0 ? "bg-muted/5" : "bg-transparent"
                            }`}
                          />
                        ))}

                        {/* Events */}
                        {weekEvents
                          .filter((e) => e.dayIndex === col)
                          .map((e, i) => {
                            const topPx =
                              ((e.startMin - MIN_MIN) / totalMinutes) * 16 * hourRows;
                            const hPx = Math.max(
                              40,
                              ((e.endMin - e.startMin) / totalMinutes) * 16 * hourRows
                            );

                            const colors = [
                              "from-blue-400/40 to-blue-500/60",
                              "from-green-400/40 to-green-500/60",
                              "from-violet-400/40 to-violet-500/60",
                              "from-orange-400/40 to-orange-500/60",
                              "from-pink-400/40 to-pink-500/60",
                            ];
                            const bg = colors[i % colors.length];

                            return (
                              <div
                                key={e.key}
                                className={`absolute left-1 right-1 rounded-lg shadow-sm border border-primary/20 bg-gradient-to-br ${bg} backdrop-blur-sm px-2 py-1 text-xs text-primary-foreground hover:scale-[1.02] hover:shadow-md transition-transform`}
                                style={{ top: topPx, height: hPx }}
                              >
                                <div className="font-semibold text-[13px] truncate">
                                  {e.label}
                                </div>
                                <div className="text-[11px] text-muted-foreground truncate">
                                  {fmtTime(
                                    `${Math.floor(e.startMin / 60)}:${String(
                                      e.startMin % 60
                                    ).padStart(2, "0")}`
                                  )}
                                  {" – "}
                                  {fmtTime(
                                    `${Math.floor(e.endMin / 60)}:${String(
                                      e.endMin % 60
                                    ).padStart(2, "0")}`
                                  )}
                                  {e.section ? ` • ${e.section}` : ""}
                                  {e.room ? ` • Rm ${e.room}` : ""}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      )}
    </div>
  );
};

export default ProfessorDashboard;
