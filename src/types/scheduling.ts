// src/types/scheduling.ts

/** Days used in UI and schedule data */
export type DayId =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

/** Core domain entities used by the Scheduling UI */
export interface Professor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  qualifications?: string[];
  subjectCount?: number; // derived/summary field
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  units?: number;
  hoursPerWeek?: number;
}

export type RoomType = "Lecture" | "Laboratory";

export interface Room {
  id: string;
  number: string;          // e.g., "301", "Lab A"
  type: RoomType;
  capacity?: number;
}

export interface SectionRoom {
  id: string;
  number: string;
  type: RoomType;
  capacity?: number;
}

export interface Section {
  id: string;
  name: string;
  grade_level: "11" | "12";
  strand?: string;
  number_of_students?: number;
  /** Rooms assigned to the section (commonly one Lecture room, optional Lab rooms) */
  rooms?: SectionRoom[];
}

/** Normalized schedule row used for conflict checks/suggestions */
export interface NormSchedule {
  id: string;
  subj_id: string;     // subject id
  prof_id: string;     // professor id
  section_id: string;  // section id
  start: number;       // minutes from midnight (e.g., 7:30 -> 450)
  end: number;         // minutes from midnight
  days: DayId[];       // which days this schedule applies to
}

/** Payload when creating a schedule (API request) */
export interface CreateSchedulePayload {
  school_year: string;           // "2024-2025"
  semester: string;              // "First Semester" | "Second Semester"
  subj_id: number;               // int
  prof_id: number;               // int
  schedule_type: "Onsite" | "Online";
  start_time: string;            // "HH:mm"
  end_time: string;              // "HH:mm"
  room_id?: number;              // optional if Online
  section_id: number;            // int
  days: DayId[] | string[];      // array or server-accepted string list
}

/** Generic API response helpers (optional but handy) */
export interface ApiSuccess<T = unknown> {
  success: true;
  message?: string;
  data: T;
}
export interface ApiError {
  success: false;
  message?: string;
}
export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

export type ListResponse<T> = ApiResponse<T[]>;

/** Convenience for getSchedules(schoolYear, semester) raw row (before normalize) */
export interface RawScheduleRow {
  id?: string | number;
  sched_id?: string | number;

  subject_id?: string | number;
  subj_id?: string | number;

  professor_id?: string | number;
  prof_id?: string | number;

  section_id?: string | number;
  section?: string | number;

  start_time?: string; // "07:30"
  start?: string;
  end_time?: string;   // "09:30"
  end?: string;

  days?: DayId[] | string; // "monday,wednesday" or ["monday","wednesday"]
}
