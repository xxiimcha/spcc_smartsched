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
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isSchoolHead: boolean;
  isProfessor: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem("user");
    const role = localStorage.getItem("role");
    if (!raw || !role) return null;
    const parsed = JSON.parse(raw);
    return { ...parsed, role } as User;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => readStoredUser());

  // Keep state in sync across tabs and keep X-User-Role header correct
  useEffect(() => {
    const onStorage = () => {
      const u = readStoredUser();
      setUser(u);
      setApiUserRole(u?.role); // set/clear header if user changed in another tab
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Ensure header is set on initial mount (rehydrated user)
  useEffect(() => {
    setApiUserRole(user?.role);
  }, []); // run once on mount

  const login = (u: User) => {
    setUser(u);
    localStorage.setItem("user", JSON.stringify(u));
    localStorage.setItem("role", u.role);
    if (u.token) localStorage.setItem("authToken", u.token);
    else localStorage.removeItem("authToken");

    // IMPORTANT: set X-User-Role for all subsequent requests
    setApiUserRole(u.role);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    localStorage.removeItem("authToken");

    // IMPORTANT: remove X-User-Role header
    setApiUserRole(undefined);
  };

  const isAuthenticated = !!user;

  const flags = useMemo(
    () => ({
      isAdmin: user?.role === "admin" || user?.role === "super_admin",
      isSuperAdmin: user?.role === "super_admin",
      isSchoolHead: user?.role === "acad_head",
      isProfessor: user?.role === "professor",
    }),
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
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};
