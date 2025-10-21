// services/authService.ts
import { apiService, ApiResponse } from "./apiService";

export type RolePick = "admin" | "acad_head" | "super_admin" | "professors";

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthUser {
  id: string;
  username: string;
  role: RolePick;
  email?: string;
  name?: string;
  token?: string | null;
  profile?: any;
}

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  message?: string;
  error?: string;
}

const AUTH_ENDPOINT = "/auth.php";

function parseBackend<T = any>(resp: ApiResponse<T> | any) {
  const ok = resp?.success === true || resp?.status === "success";
  const user = resp?.user ?? resp?.data?.user;
  const message =
    resp?.message ??
    resp?.error ??
    resp?.data?.message ??
    resp?.data?.error ??
    null;

  return { ok, user, message };
}

function coerceRole(r: any): RolePick | null {
  const v = String(r ?? "").toLowerCase();
  if (v === "admin") return "admin";
  if (v === "super_admin") return "super_admin";
  if (v === "acad_head" || v === "acad_head") return "acad_head";
  if (v === "professors" || v === "professor") return "professors";
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

class AuthService {
  private async doUnifiedAuth(
    credentials: LoginCredentials
  ): Promise<AuthResponse> {
    try {
      const resp = await apiService.makeRequest<ApiResponse<any>>(
        "POST",
        AUTH_ENDPOINT,
        credentials
      );

      const { ok, user, message } = parseBackend(resp);

      if (!ok || !user) {
        return {
          success: false,
          message: message || "Invalid credentials",
        };
      }

      const normalized = normalizeUser(user);
      if (!normalized) {
        return {
          success: false,
          message: "Unable to determine user role.",
        };
      }

      // Persist session (adjust keys as your app expects)
      localStorage.setItem("user", JSON.stringify(normalized));
      localStorage.setItem("role", normalized.role);
      if (normalized.token) {
        localStorage.setItem("authToken", normalized.token);
      } else {
        localStorage.removeItem("authToken");
      }

      return { success: true, user: normalized };
    } catch (err) {
      console.error("Auth error:", err);
      return {
        success: false,
        error: "Authentication failed. Please try again.",
      };
    }
  }

  // Unified login (single endpoint)
  async login(
    credentials: LoginCredentials,
    _rolePick?: RolePick // ignored; kept for backward compatibility
  ): Promise<AuthResponse> {
    return this.doUnifiedAuth(credentials);
  }

  // Backward-compatible wrappers (now just call unified)
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
    const user = localStorage.getItem("user");
    const role = localStorage.getItem("role");
    return !!(user && role);
  }

  getCurrentUser() {
    const userStr = localStorage.getItem("user");
    const role = localStorage.getItem("role");
    if (userStr && role) {
      try {
        const user = JSON.parse(userStr);
        return { ...user, role };
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
    return null;
  }
}

export const authService = new AuthService();
export default authService;
