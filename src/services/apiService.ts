import axios, { AxiosResponse } from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "https://spcc-scheduler.site";

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error("API Request Error:", error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error("API Response Error:", error.response?.status, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export interface ApiResponse<T = any> {
  success?: boolean;
  status?: string;
  message?: string;
  data?: T;
  error?: string;
}

/** UI-facing Subject shape (what components consume) */
export interface SubjectDTO {
  id: number;
  code: string;
  name: string;
  description?: string;
  units?: number;
  type?: string;
  hoursPerWeek?: number;
  gradeLevel?: string | null; // '11' | '12' | null
  strand?: string | null;     // e.g., ICT, STEM, ...
  schedule_count?: number;
}

type BulkDeleteResult = { deleted_ids?: number[]; message?: string };

/** Payload you can send to backend (accepts both camel & snake). */
export type SubjectPayload = {
  // backend snake_case (any optional; backend accepts partial on PUT)
  subj_code?: string;
  subj_name?: string;
  subj_description?: string;
  subj_units?: number;
  subj_type?: string;
  subj_hours_per_week?: number;
  grade_level?: string | null;
  strand?: string | null;
  is_active?: number;

  // camelCase aliases
  code?: string;
  name?: string;
  description?: string;
  units?: number;
  type?: string;              // maps to subj_type
  hoursPerWeek?: number;
  gradeLevel?: string | null;
};

export interface Professor {
  prof_id: number;
  prof_name: string;
  prof_email?: string;
  prof_contact?: string;
}

export interface ProfessorCreatePayload {
  name: string;
  username: string;
  password: string;
  email?: string;
  phone?: string;
  qualifications: string[];
  subject_ids: number[];
}

export interface ProfessorUpdatePayload {
  name: string;
  email?: string;
  phone?: string;
  qualifications: string[];
  subject_ids: number[];
}

export interface ProfessorRow {
  prof_id: number;
  prof_name: string;
  prof_username?: string;
  prof_password?: string;
  prof_email?: string;
  prof_phone?: string;
  prof_qualifications?: string | string[];
  prof_subject_ids?: string | number[];
  subj_count?: number;
}

export interface Room {
  room_id: number;
  room_number: string;
  room_type: string;
  room_capacity: number;
}

export interface Section {
  section_id: number;
  section_name: string;
  section_year_level: string;
  section_course: string;
  assigned_room?: number;
}

export interface Schedule {
  schedule_id?: number;
  school_year: string;
  semester: string;
  subj_id: number;
  prof_id: number;
  section_id: number;
  room_id?: number;
  schedule_type: "Onsite" | "Online";
  start_time: string;
  end_time: string;
  days: string[];
}

/** NEW: types for auto-generation */
export interface AutoGenPayload {
  school_year: string;
  semester: string;
  days: string[];
  startTime: string;
  endTime: string;
  maxDailyLoad?: number;
  onlySectionsWithAssignedRooms: boolean;
  preventSameTimeSameSection: boolean;
  preventProfDoubleBooking: boolean;
  preventDuplicateSubjectPerSection: boolean;
  subjectWeeklyHourCap: number;
}

export interface AutoGenResult {
  inserted: number;
  skipped: number;
  details?: any;
}

/** NEW: DTOs for dashboard endpoints */
export interface ActivityDTO {
  id: number;
  description: string;
  timestamp: string; // ISO-ish
  type: string;      // professor | subject | schedule | room | section | other
}

export interface WorkloadAlertDTO {
  professor_name: string;
  subject_count: number;
  alert_level: "high" | "max";
}

function coerceArray<T = any>(v: any): T[] {
  if (Array.isArray(v)) return v as T[];
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

class ApiService {
  private prettifyType(v?: string) {
    if (!v) return v;
    const t = String(v).toLowerCase();
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  private mapSubjectRow(row: any): SubjectDTO {
    return {
      id: Number(row.subj_id ?? row.id),
      code: row.subj_code ?? row.code ?? "",
      name: row.subj_name ?? row.name ?? "",
      description: row.subj_description ?? row.description ?? "",
      units: row.subj_units ?? row.units,
      type: this.prettifyType(row.subj_type ?? row.type),
      hoursPerWeek: row.subj_hours_per_week ?? row.hoursPerWeek,
      gradeLevel: row.grade_level ?? row.gradeLevel ?? null,
      strand: row.strand ?? null,
      schedule_count: Number(row.schedule_count ?? 0),
    };
  }

  private mapActivityRow(r: any): ActivityDTO {
    return {
      id: Number(r.id ?? r.activity_id ?? 0),
      description: String(r.description ?? r.activity_description ?? ""),
      timestamp: String(r.timestamp ?? r.created_at ?? r.updated_at ?? ""),
      type: String(r.type ?? r.entity ?? r.category ?? "other").toLowerCase(),
    };
  }

  private mapWorkloadAlertRow(w: any): WorkloadAlertDTO {
    const level = String(w.alert_level ?? w.level ?? "high").toLowerCase();
    return {
      professor_name: String(w.professor_name ?? w.name ?? ""),
      subject_count: Number(w.subject_count ?? w.count ?? 0),
      alert_level: level === "max" ? "max" : "high",
    };
  }

  async makeRequest<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    endpoint: string,
    data?: any
  ): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse = await apiClient({ method, url: endpoint, data });
      return {
        success: response.data.status === "success" || response.data.success === true,
        status: response.data.status,
        message: response.data.message,
        data: (response.data?.data ?? response.data) as T,
      };
    } catch (error) {
      console.error(`API Error (${method} ${endpoint}):`, error);
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          status: "error",
          message: error.response?.data?.message || error.message,
          error: error.response?.data?.error || error.message,
        };
      }
      return {
        success: false,
        status: "error",
        message: "An unexpected error occurred",
        error: String(error),
      };
    }
  }

  // --- Subjects -------------------------------------------------------------

  async getSubjects(filters?: {
    q?: string;
    strand?: string;
    type?: string;
    grade_level?: string;
  }): Promise<ApiResponse<SubjectDTO[]>> {
    const qp = new URLSearchParams();
    if (filters?.q) qp.append("q", filters.q);
    if (filters?.strand) qp.append("strand", filters.strand);
    if (filters?.type) qp.append("type", filters.type);
    if (filters?.grade_level) qp.append("grade_level", filters.grade_level);

    const url = `/subjects.php${qp.toString() ? `?${qp.toString()}` : ""}`;
    const response = await this.makeRequest<any>("GET", url);

    const rows = response.data?.subjects || response.data?.data || response.data || [];
    const mapped: SubjectDTO[] = Array.isArray(rows) ? rows.map((r: any) => this.mapSubjectRow(r)) : [];

    return { ...response, data: mapped };
  }

  async createSubject(subject: SubjectPayload): Promise<ApiResponse<SubjectDTO>> {
    return this.makeRequest<SubjectDTO>("POST", "/subjects.php", subject);
  }

  async updateSubject(id: number, subject: SubjectPayload): Promise<ApiResponse<SubjectDTO>> {
    return this.makeRequest<SubjectDTO>("PUT", `/subjects.php?id=${id}`, subject);
  }

  async deleteSubject(id: number): Promise<ApiResponse> {
    return this.makeRequest("DELETE", `/subjects.php?id=${id}`);
  }

  async getSubjectProfessors(subjectId: number | string): Promise<ApiResponse> {
    const sid = /^\d+$/.test(String(subjectId)) ? Number(subjectId) : subjectId;
    return this.makeRequest("GET", `/get_subject_professors.php?subject_id=${sid}`);
  }

  async getProfessorSubjectPreferences(
    profId: number | string
  ): Promise<ApiResponse<{ subj_id: number; proficiency: "beginner" | "intermediate" | "advanced" }[]>> {
    return this.makeRequest("GET", `/professor_subject_preferences.php?prof_id=${Number(profId)}`);
  }

  async saveProfessorSubjectPreferences(
    profId: number | string,
    preferences: { subj_id: number; proficiency: "beginner" | "intermediate" | "advanced" }[]
  ): Promise<ApiResponse> {
    return this.makeRequest("POST", "/professor_subject_preferences.php", {
      prof_id: Number(profId),
      preferences,
    });
  }
  
  async getListOfSubjects(professorId?: number | string): Promise<ApiResponse> {
    const pid = professorId != null ? String(professorId) : "";
    const url = pid ? `/get_list_of_subjects.php?professor_id=${pid}` : "/get_list_of_subjects.php";
    return this.makeRequest("GET", url);
  }

  // --- Professors -----------------------------------------------------------

  async getProfessors(): Promise<ApiResponse<(ProfessorRow & { qualifications: string[]; subjects: number[] })[]>> {
    const base = await this.makeRequest<any>("GET", "/professors.php");
    const rows: ProfessorRow[] = base.data?.professors || base.data?.data || base.data || [];
    const mapped = rows.map((r) => ({
      ...r,
      qualifications: coerceArray<string>(r.prof_qualifications),
      subjects: coerceArray<number>(r.prof_subject_ids),
    }));
    return { ...base, data: mapped };
  }

  async getProfessor(id: number): Promise<ApiResponse<ProfessorRow>> {
    return this.makeRequest<ProfessorRow>("GET", `/professors.php?id=${id}`);
  }

  async createProfessorWithSubjects(payload: ProfessorCreatePayload): Promise<ApiResponse> {
    return this.makeRequest("POST", "/professors.php", payload);
  }

  async updateProfessorWithSubjects(id: number, payload: ProfessorUpdatePayload): Promise<ApiResponse> {
    return this.makeRequest("PUT", `/professors.php?id=${id}`, payload);
  }

  async deleteProfessor(id: number): Promise<ApiResponse> {
    return this.makeRequest("DELETE", `/professors.php?id=${id}`);
  }

  // --- Rooms ----------------------------------------------------------------

  async getRooms(): Promise<ApiResponse<Room[]>> {
    const response = await this.makeRequest<any>("GET", "/rooms.php");
    return { ...response, data: response.data?.rooms || response.data?.data || response.data || [] };
  }

  async createRoom(room: Omit<Room, "room_id">): Promise<ApiResponse<Room>> {
    return this.makeRequest<Room>("POST", "/rooms.php", room);
  }

  async updateRoom(id: number, room: Partial<Room>): Promise<ApiResponse<Room>> {
    return this.makeRequest<Room>("PUT", `/rooms.php?id=${id}`, room);
  }

  async deleteRoom(id: number): Promise<ApiResponse> {
    return this.makeRequest("DELETE", `/rooms.php?id=${id}`);
  }

  // --- Sections -------------------------------------------------------------

  async getSections(): Promise<ApiResponse<Section[]>> {
    const response = await this.makeRequest<any>("GET", "/sections.php");
    return { ...response, data: response.data?.sections || response.data?.data || response.data || [] };
  }

  async getRoomAssignedSections(): Promise<ApiResponse<Section[]>> {
    const response = await this.makeRequest<any>("GET", "/get_room_assigned_sections.php");
    return { ...response, data: response.data?.sections || response.data?.data || response.data || [] };
  }

  async createSection(section: Omit<Section, "section_id">): Promise<ApiResponse<Section>> {
    return this.makeRequest<Section>("POST", "/sections.php", section);
  }

  async updateSection(id: number, section: Partial<Section>): Promise<ApiResponse<Section>> {
    return this.makeRequest<Section>("PUT", `/sections.php?id=${id}`, section);
  }

  async deleteSection(id: number): Promise<ApiResponse> {
    return this.makeRequest("DELETE", `/sections.php?id=${id}`);
  }

  // --- Schedules ------------------------------------------------------------

  async getSchedules(filters?: { school_year?: string; semester?: string; professor_id?: number | string; _t?: number }): Promise<ApiResponse<Schedule[]>> {
    const qp = new URLSearchParams();
    if (filters?.school_year) qp.append("school_year", filters.school_year);
    if (filters?.semester) qp.append("semester", filters.semester);
    if (filters?.professor_id != null) qp.append("professor_id", String(filters.professor_id));
    // always add a cache-buster so callers don't need to type `_t`
    qp.append("_t", String(filters?._t ?? Date.now()));
    const url = `/schedule.php?${qp.toString()}`;
    const response = await this.makeRequest<any>("GET", url);
    return { ...response, data: response.data?.schedules || response.data?.data || response.data || [] };
  }

  async createSchedule(schedule: Omit<Schedule, "schedule_id">): Promise<ApiResponse<Schedule>> {
    const result = await this.makeRequest<Schedule>("POST", "/schedule.php", schedule);
    if (result.success) {
      try { await this.syncToFirebase(); } catch (e) { console.warn("Failed to sync to Firebase after schedule creation:", e); }
    }
    return result;
  }

  async updateSchedule(id: number, schedule: Partial<Schedule>): Promise<ApiResponse<Schedule>> {
    const result = await this.makeRequest<Schedule>("PUT", `/schedule.php?id=${id}`, schedule);
    if (result.success) {
      try { await this.syncToFirebase(); } catch (e) { console.warn("Failed to sync to Firebase after schedule update:", e); }
    }
    return result;
  }

  async deleteSchedule(id: number | string): Promise<ApiResponse> {
    const result = await this.makeRequest("DELETE", `/schedule.php?id=${id}`);
    if (result.success) {
      try { await this.syncToFirebase(); } catch (e) { console.warn("Failed to sync to Firebase after schedule deletion:", e); }
    }
    return result;
  }
  
  async deleteSchedulesBulk(ids: number[]): Promise<ApiResponse<BulkDeleteResult>> {
    const result = await this.makeRequest<BulkDeleteResult>(
      "DELETE",
      "/schedule.php",
      { ids }
    );
    if (result.success) {
      try { await this.syncToFirebase(); } catch (e) { console.warn("Failed to sync to Firebase after bulk delete:", e); }
    }
    return result;
  }

  async deleteSchedulesBySection(payload: {
    section_id?: number;
    section_name?: string;
    school_year?: string;
    semester?: string;
  }): Promise<ApiResponse<BulkDeleteResult>> {
    const result = await this.makeRequest<BulkDeleteResult>(
      "DELETE",
      "/schedule.php",
      payload
    );
    if (result.success) {
      try { await this.syncToFirebase(); } catch (e) { console.warn("Failed to sync to Firebase after section bulk delete:", e); }
    }
    return result;
  }

  async updateScheduleProfessor(scheduleId: number | string, professorId: number | string): Promise<ApiResponse> {
    const id = /^\d+$/.test(String(scheduleId)) ? Number(scheduleId) : scheduleId;
    return this.makeRequest("PUT", `/schedule.php?id=${id}`, {
      prof_id: Number(professorId),
    });
  }
  
  async getAvailableTimeSlots(data: {
    school_year: string;
    semester: string;
    days: string[];
    prof_id?: number;
    room_id?: number;
    section_id?: number;
  }): Promise<ApiResponse> {
    return this.makeRequest("POST", "/get_available_time_slots.php", data);
  }

  async checkConflicts(data: {
    school_year: string;
    semester: string;
    days: string[];
    prof_id: number;
    room_id?: number;
    section_id: number;
    start_time: string;
    end_time: string;
  }): Promise<ApiResponse> {
    return this.makeRequest("POST", "/enhanced_conflict_detection.php", data);
  }

  async validateTimeSlots(data: Schedule): Promise<ApiResponse> {
    return this.makeRequest("POST", "/validate_time_slots.php", data);
  }

  // --- School Heads ---------------------------------------------------------

  async getSchoolHeads(): Promise<ApiResponse> { return this.makeRequest("GET", "/acad_head.php"); }
  async createSchoolHead(data: any): Promise<ApiResponse> { return this.makeRequest("POST", "/acad_head.php", data); }
  async updateSchoolHead(id: number, data: any): Promise<ApiResponse> { return this.makeRequest("PUT", `/acad_head.php?id=${id}`, data); }
  async deleteSchoolHead(id: number): Promise<ApiResponse> { return this.makeRequest("DELETE", `/acad_head.php?id=${id}`); }

  // --- Dashboard (normalized here!) ----------------------------------------

  async getDashboardActivities(): Promise<ApiResponse<ActivityDTO[]>> {
    const base = await this.makeRequest<any>("GET", "/dashboard_activities.php");
    const raw = (Array.isArray(base.data?.data) && base.data.data) || (Array.isArray(base.data) && base.data) || [];
    const mapped: ActivityDTO[] = raw.map((r: any) => this.mapActivityRow(r));
    mapped.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return { ...base, data: mapped };
  }

  async getDashboardMetrics(): Promise<ApiResponse> { return this.makeRequest("GET", "/dashboard_metrics.php"); }

  async getDashboardWorkload(): Promise<ApiResponse<WorkloadAlertDTO[]>> {
    const base = await this.makeRequest<any>("GET", "/dashboard_workload.php");
    const raw = (Array.isArray(base.data?.data) && base.data.data) || (Array.isArray(base.data) && base.data) || [];
    const mapped: WorkloadAlertDTO[] = raw.map((w: any) => this.mapWorkloadAlertRow(w));
    return { ...base, data: mapped };
  }

  // --- Bulk upload / Sync / Optimizer --------------------------------------

  async bulkUploadSubjects(formData: FormData): Promise<ApiResponse> {
    try {
      const response = await apiClient.post("/subjects_bulk_upload.php", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
      });
      return {
        success: response.data?.status === "success" || response.data?.success === true,
        status: response.data?.status,
        message: response.data?.message,
        data: response.data?.data ?? response.data,
      };
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          status: "error",
          message: error.response?.data?.message || error.message,
          error: error.response?.data?.error || error.message,
        };
      }
      return { success: false, status: "error", message: "An unexpected error occurred", error: String(error) };
    }
  }

  async syncToFirebase(): Promise<ApiResponse> { return this.makeRequest("GET", "/sync_schedules_only.php"); }
  async manualSyncToFirebase(): Promise<ApiResponse> { return this.makeRequest("GET", "/manual_sync.php"); }

  async analyzeWorkload(schoolYear: string, semester: string): Promise<ApiResponse> {
    return this.makeRequest("POST", "/workload_balancer.php", {
      action: "analyze",
      school_year: schoolYear,
      semester: semester,
    });
  }

  async balanceWorkload(schoolYear: string, semester: string, options: any = {}): Promise<ApiResponse> {
    return this.makeRequest("POST", "/workload_balancer.php", {
      action: "balance",
      school_year: schoolYear,
      semester: semester,
      options,
    });
  }

  async getWorkloadRecommendations(schoolYear: string, semester: string): Promise<ApiResponse> {
    return this.makeRequest("POST", "/workload_balancer.php", {
      action: "recommendations",
      school_year: schoolYear,
      semester: semester,
    });
  }

  /** Existing autogen (kept) */
  async autoGenerateSchedules(payload: AutoGenPayload): Promise<ApiResponse<AutoGenResult>> {
    const result = await this.makeRequest<AutoGenResult>("POST", "/schedule_autogen.php", payload);
    if (result.success) {
      try { await this.syncToFirebase(); } catch (error) { console.warn("Failed to sync to Firebase after auto-generate:", error); }
    }
    return result;
  }

  /** Alias so components can call apiService.autoGenerate(...) */
  async autoGenerate(payload: AutoGenPayload): Promise<ApiResponse<AutoGenResult>> {
    return this.autoGenerateSchedules(payload);
  }
}

export const apiService = new ApiService();
export default apiService;
