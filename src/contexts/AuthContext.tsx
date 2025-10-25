// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { setApiUserRole } from "@/services/apiService";

export type Role = "admin" | "acad_head" | "super_admin" | "professor";

export interface User {
  id: string;
  username: string;
  role: Role;
  email?: string;
  name?: string;
  token?: string | null;
  profile?: any;
}

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  login: (u: User) => void;
  logout: () => void;

  // convenience flags
  isAdmin: boolean;              // (admin OR super_admin) — keep existing meaning
  isSuperAdmin: boolean;
  isSchoolHead: boolean;         // acad_head
  isProfessor: boolean;
  canAccessAdminPanel: boolean;  // NEW: super_admin OR admin OR acad_head
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Optional: normalize role in case localStorage has variants
const normalizeRole = (r: string): Role => {
  const v = String(r ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_");
  if (v === "super_admin" || v === "superadmin") return "super_admin";
  if (v === "admin" || v === "administrator") return "admin";
  if (v === "acad_head" || v === "school_head" || v === "academic_head" || v === "acadhead" || v === "schoolhead")
    return "acad_head";
  return "professor";
};

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem("user");
    const roleRaw = localStorage.getItem("role");
    if (!raw || !roleRaw) return null;
    const parsed = JSON.parse(raw);
    const role = normalizeRole(roleRaw);
    return { ...parsed, role } as User;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => readStoredUser());

  // Sync across tabs + keep X-User-Role header correct when storage changes
  useEffect(() => {
    const onStorage = () => {
      const u = readStoredUser();
      setUser(u);
      setApiUserRole(u?.role);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Ensure header set on first mount (rehydrated user)
  useEffect(() => {
    setApiUserRole(user?.role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  const login = (u: User) => {
    setUser(u);
    localStorage.setItem("user", JSON.stringify(u));
    localStorage.setItem("role", u.role);
    if (u.token) localStorage.setItem("authToken", u.token);
    else localStorage.removeItem("authToken");

    setApiUserRole(u.role);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    localStorage.removeItem("authToken");
    setApiUserRole(undefined);
  };

  const isAuthenticated = !!user;

  const flags = useMemo(
    () => {
      const role = user?.role;
      const isAdmin = role === "admin" || role === "super_admin"; // preserve old meaning
      const canAccessAdminPanel =
        role === "super_admin" || role === "admin" || role === "acad_head"; // <-- include acad_head

      return {
        isAdmin,
        isSuperAdmin: role === "super_admin",
        isSchoolHead: role === "acad_head",
        isProfessor: role === "professor",
        canAccessAdminPanel,
      };
    },
    [user?.role]
  );

  const value: AuthContextValue = {
    user,
    isAuthenticated,
    login,
    logout,
    ...flags,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
