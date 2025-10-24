// services/authService.ts
import { apiService, ApiResponse } from "./apiService";

export type RolePick = "admin" | "acad_head" | "super_admin" | "professors";

export interface LoginCredentials { username: string; password: string; }
export interface AuthUser {
  id: string; username: string; role: RolePick; email?: string; name?: string;
  token?: string | null; profile?: any;
}
export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  message?: string;
  error?: string;
}

const AUTH_ENDPOINT = "/auth.php";

// helper to detect wrapper statuses like "error"/"fail"
const isWrapperStatus = (v: any) => {
  const s = String(v ?? "").toLowerCase();
  return s === "error" || s === "fail" || s === "failed";
};

function parseBackend<T = any>(resp: ApiResponse<T> | any) {
  const ok =
    resp?.success === true ||
    resp?.status === "success" ||
    resp?.data?.success === true;

  const user = resp?.user ?? resp?.data?.user;

  const message =
    resp?.message ??
    resp?.error ??
    resp?.data?.message ??
    resp?.data?.error ??
    null;

  // prefer inner payload's status when wrapper uses "error"
  const inner = (resp?.data && typeof resp.data === "object") ? resp.data : resp;
  let accountStatus: string | null =
    inner?.status ?? null;

  if (isWrapperStatus(accountStatus)) {
    // try to find a more specific status inside nested data
    const deeper = inner?.data && typeof inner.data === "object" ? inner.data : null;
    if (deeper?.status && !isWrapperStatus(deeper.status)) {
      accountStatus = deeper.status;
    } else {
      // some APIs put it as account_status
      accountStatus = deeper?.account_status ?? inner?.account_status ?? null;
    }
  }

  const code = resp?.code ?? resp?.data?.code ?? null;
  return { ok, user, message, accountStatus, code };
}

function coerceRole(r: any): RolePick | null {
  const v = String(r ?? "").toLowerCase();
  if (v === "admin") return "admin";
  if (v === "super_admin" || v === "super-admin") return "super_admin";
  if (v === "acad_head" || v === "school_head" || v === "acad-head") return "acad_head";
  if (v === "professor" || v === "professors") return "professors";
  return null;
}

function normalizeUser(raw: any): AuthUser | null {
  if (!raw) return null;
  const role = coerceRole(raw.role);
  if (!role) return null;

  return {
    id: String(raw.id ?? raw.user_id ?? ""),
    username: String(raw.username ?? ""),
    role,
    email: raw.email ?? undefined,
    name: raw.name ?? undefined,
    token: raw.token ?? null,
    profile: raw.profile ?? undefined,
  };
}

function extractAxiosError(err: any): { message: string } {
  const data = err?.response?.data;

  // prefer inner object if wrapped
  const inner = data?.data && typeof data.data === "object" ? data.data : data;

  const serverMsg =
    (typeof inner === "string" && inner) ||
    inner?.error ||
    inner?.message ||
    (typeof data === "string" && data) ||
    data?.error ||
    data?.message ||
    null;

  // prefer a semantic status (inactive/suspended), avoid wrapper "error/fail"
  let statusStr =
    inner?.status && !isWrapperStatus(inner.status) ? inner.status :
    inner?.account_status ? inner.account_status :
    data?.status && !isWrapperStatus(data.status) ? data.status :
    undefined;

  let message = serverMsg || `HTTP ${err?.response?.status || ""}`.trim();
  if (statusStr) message = `${message} (Status: ${statusStr})`;

  return { message };
}

class AuthService {
  private async doUnifiedAuth(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const resp = await apiService.makeRequest<ApiResponse<any>>(
        "POST",
        AUTH_ENDPOINT,
        credentials
      );

      const { ok, user, message, accountStatus } = parseBackend(resp);

      if (!ok || !user) {
        return {
          success: false,
          error: accountStatus ? `${message || "Invalid credentials"} (Status: ${accountStatus})` : (message || "Invalid credentials"),
        };
      }

      const normalized = normalizeUser(user);
      if (!normalized) return { success: false, error: "Unable to determine user role." };

      localStorage.setItem("user", JSON.stringify(normalized));
      localStorage.setItem("role", normalized.role);
      if (normalized.token) localStorage.setItem("authToken", normalized.token);
      else localStorage.removeItem("authToken");

      return { success: true, user: normalized };
    } catch (err: any) {
      console.error("Auth error:", err);
      const data = err?.response?.data;
      const serverError =
        data?.error ||
        data?.message ||
        (typeof data === "string" ? data : null);
      return {
        success: false,
        error: serverError || "Authentication failed. Please try again.",
      };
    }    
  }

  async login(credentials: LoginCredentials, _rolePick?: RolePick): Promise<AuthResponse> {
    return this.doUnifiedAuth(credentials);
  }
  async loginAs(credentials: LoginCredentials, _role: RolePick): Promise<AuthResponse> {
    return this.doUnifiedAuth(credentials);
  }
  async verifyAdminCredentials(credentials: LoginCredentials): Promise<AuthResponse> {
    return this.doUnifiedAuth(credentials);
  }
  async verifySchoolHeadCredentials(credentials: LoginCredentials): Promise<AuthResponse> {
    return this.doUnifiedAuth(credentials);
  }
  async verifySuperAdminCredentials(credentials: LoginCredentials): Promise<AuthResponse> {
    return this.doUnifiedAuth(credentials);
  }
  async verifyProfessorCredentials(credentials: LoginCredentials): Promise<AuthResponse> {
    return this.doUnifiedAuth(credentials);
  }

  logout(): void {
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    localStorage.removeItem("authToken");
  }

  isAuthenticated(): boolean {
    return !!(localStorage.getItem("user") && localStorage.getItem("role"));
  }

  getCurrentUser() {
    const userStr = localStorage.getItem("user");
    const role = localStorage.getItem("role");
    if (userStr && role) {
      try { return { ...JSON.parse(userStr), role }; }
      catch (e) { console.error("Error parsing user data:", e); }
    }
    return null;
  }
}

export const authService = new AuthService();
export default authService;
