// src/pages/Login.tsx
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { authService } from "../services/authService";
import type { User, Role } from "../contexts/AuthContext";
import {
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Sun,
  Moon,
  User2,
  Lock,
  Shield,
} from "lucide-react";
import { motion } from "framer-motion";

import logo from "../components/images/logo.png";
import background from "../components/images/login.jpg";

type RawRole = string | Role;
const normalizeRole = (r: RawRole): Role => {
  const v = String(r || "").toLowerCase();
  if (v === "super_admin" || v === "super-admin") return "super_admin";
  if (v === "admin") return "admin";
  if (v === "acad_head" || v === "school_head" || v === "acad-head")
    return "acad_head";
  if (v === "professor" || v === "professors") return "professor";
  return "professor";
};

interface AuthUserPayload {
  id: string | number;
  username: string;
  role: RawRole;
  email?: string;
  name?: string;
  token?: string | null;
  profile?: any;
}

interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  code?: string;
  status?: string;
  token?: string | null;
  user?: AuthUserPayload;
}

const getErrorMessage = (err: any): string => {
  const data = err?.response?.data;
  if (data) {
    if (typeof data === "string") return data;
    if (data.error) return data.error;
    if (data.message) return data.message;
  }
  return err?.message || "Unable to sign in.";
};

const THEME_KEY = "spcc_theme"; // "light" | "dark"

const Login: React.FC = () => {
  // form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  // ui state
  const [message, setMessage] = useState<string>("");
  const [isError, setIsError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(
    (localStorage.getItem(THEME_KEY) as "light" | "dark") || "light"
  );

  // client-side brief lockout after repeated failures
  const [failCount, setFailCount] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);

  const navigate = useNavigate();
  const { login } = useAuth();
  const redirectTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimer.current) window.clearTimeout(redirectTimer.current);
    };
  }, []);

  useEffect(() => {
    // reset message when user types
    if (message) {
      setIsError(false);
      setMessage("");
    }
  }, [username, password]);

  useEffect(() => {
    // apply theme to <html>
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ("getModifierState" in e) {
      const on = (e as any).getModifierState?.("CapsLock");
      if (typeof on === "boolean") setCapsLockOn(on);
    }
  };

  const now = () => Date.now();
  const isLocked = lockUntil !== null && now() < lockUntil;
  const lockRemainingSec = isLocked ? Math.ceil((lockUntil! - now()) / 1000) : 0;

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading || isLocked) return;

    const uname = username.trim();
    const pwd = password;

    if (!uname || !pwd) {
      setIsError(true);
      setMessage("Please enter your username and password.");
      return;
    }

    setIsLoading(true);
    setMessage("");
    setIsError(false);

    try {
      const result: AuthResponse = await authService.login({
        username: uname,
        password: pwd,
      });

      if (result?.success && result.user) {
        const role = normalizeRole(result.user.role);
        const userObj: User = {
          id: String(result.user.id),
          username: result.user.username,
          role,
          email: result.user.email,
          name: result.user.name,
          token: result.token ?? result.user.token ?? null,
          profile: result.user.profile,
        };

        login(userObj);
        setIsError(false);
        setMessage("Login successful! Redirecting...");

        // --- FIX: send acad_head to its own area instead of /admin ---
        const routeByRole: Record<Role, string> = {
          super_admin: "/admin",
          admin: "/admin",
          acad_head: "/acad",   // <— academic head landing route
          professor: "/prof",
        };

        const to = routeByRole[role] ?? "/";
        redirectTimer.current = window.setTimeout(() => navigate(to), 600);

        setFailCount(0);
        setLockUntil(null);
        return;
      }

      // failure
      setIsError(true);
      setMessage("Invalid credentials or account inactive. Please try again.");
      const nextFails = failCount + 1;
      setFailCount(nextFails);

      // brief lockout after 3 consecutive failures
      if (nextFails >= 3) {
        const pauseMs = 10_000; // 10s client-side throttle
        setLockUntil(now() + pauseMs);
        setTimeout(() => setLockUntil(null), pauseMs);
      }
    } catch (err: any) {
      setIsError(true);
      setMessage(
        getErrorMessage(err) ||
          "Invalid credentials or account inactive. Please try again."
      );
      const nextFails = failCount + 1;
      setFailCount(nextFails);
      if (nextFails >= 3) {
        const pauseMs = 10_000;
        setLockUntil(now() + pauseMs);
        setTimeout(() => setLockUntil(null), pauseMs);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit =
    username.trim().length > 0 && password.length > 0 && !isLoading && !isLocked;

  // press-and-hold “peek” handlers for password
  const onPeekDown = () => setShowPassword(true);
  const onPeekUp = () => setShowPassword(false);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gray-100 dark:bg-[#0b0e1a]">
      {/* Background image and overlays */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${background})` }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-sm"
      />

      {/* Animated soft blobs */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 0.55, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-indigo-500/30 blur-3xl"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 0.55, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.1 }}
        className="pointer-events-none absolute -bottom-24 -right-24 h-[28rem] w-[28rem] rounded-full bg-blue-500/30 blur-3xl"
      />

      {/* Theme toggle */}
      <div className="relative z-10 flex w-full justify-end p-4">
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-2 text-sm shadow ring-1 ring-black/5 backdrop-blur hover:bg-white dark:bg-black/40 dark:hover:bg.black/50"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span className="hidden sm:inline">
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </span>
        </button>
      </div>

      <div className="relative z-10 flex min-h-[calc(100vh-56px)] items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mx-auto flex w-full max-w-5xl overflow-hidden rounded-2xl bg-white/90 shadow-2xl backdrop-blur-lg ring-1 ring-black/5 dark:bg-[#0f1428]/80"
        >
          {/* Left info panel */}
          <div className="hidden w-[45%] flex-col justify-between bg-[#010662] p-10 text-white md:flex">
            <div>
              <img src={logo} className="w-24 drop-shadow-sm" alt="SPCC Logo" />
              <h1 className="mt-6 text-3xl font-extrabold tracking-tight">
                SPCC SmartSched
              </h1>
              <p className="text-sm text-white/80">
                Systems Plus Computer College
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Shield className="mt-0.5 h-5 w-5 opacity-90" />
                <p className="text-sm text-white/85">
                  Secure access for administrators and faculty. Your sessions are
                  protected.
                </p>
              </div>
              <div className="rounded-lg bg-white/10 p-3 text-xs leading-relaxed text-white/80 ring-1 ring-white/15">
                Tip: You can <span className="font-semibold">press and hold</span>{" "}
                the eye icon to peek at your password.
              </div>
            </div>

            <p className="mt-6 text-xs text-white/70">
              &copy; {new Date().getFullYear()} SPCC. All rights reserved.
            </p>
          </div>

          {/* Right form panel */}
          <div className="w-full p-8 md:w-[55%] md:p-10">
            {/* Mobile header */}
            <div className="mb-6 flex items-center gap-3 md:hidden">
              <img src={logo} className="w-10" alt="SPCC Logo" />
              <div>
                <h1 className="text-xl font-semibold leading-tight text-gray-900 dark:text-white">
                  SPCC SmartSched
                </h1>
                <p className="text-xs text-gray-500 -mt-0.5">
                  Systems Plus Computer College
                </p>
              </div>
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Welcome back
            </h2>
            <p className="mb-6 text-gray-600 dark:text-gray-300">
              Enter your credentials to access your account
            </p>

            {/* Live region for screen readers */}
            <div aria-live="polite" aria-atomic="true" className="sr-only">
              {message}
            </div>

            {/* Status message */}
            {message && (
              <div
                className={`mb-4 flex items-start gap-3 rounded-lg border p-3 text-sm ${
                  isError
                    ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300"
                    : "border-green-200 bg-green-50 text-green-700 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-300"
                }`}
                role="alert"
              >
                {isError ? (
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                )}
                <span>{message}</span>
              </div>
            )}

            {/* Lockout notice */}
            {isLocked && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
                Too many attempts. Please wait {lockRemainingSec}s before trying
                again.
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Username */}
              <div>
                <label
                  htmlFor="username"
                  className="mb-1.5 block text-sm font-medium text-gray-800 dark:text-gray-200"
                >
                  Username or Email
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-gray-400">
                    <User2 className="h-5 w-5" />
                  </span>
                  <input
                    type="text"
                    id="username"
                    placeholder="e.g. jdelacruz or jdela@spcc.edu"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 p-3 shadow-sm outline-none ring-indigo-200 transition focus:border-indigo-500 focus:ring-2 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/50"
                    required
                    disabled={isLoading || isLocked}
                    autoCapitalize="none"
                    autoComplete="username"
                    inputMode="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-gray-800 dark:text-gray-200"
                >
                  Password
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-gray-400">
                    <Lock className="h-5 w-5" />
                  </span>

                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-12 p-3 shadow-sm outline-none ring-indigo-200 transition focus:border-indigo-500 focus:ring-2 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/50"
                    required
                    disabled={isLoading || isLocked}
                    autoComplete="current-password"
                    aria-describedby={capsLockOn ? "caps-indicator" : undefined}
                  />

                  {/* Toggle / Peek */}
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    onMouseDown={onPeekDown}
                    onMouseUp={onPeekUp}
                    onMouseLeave={onPeekUp}
                    onTouchStart={onPeekDown}
                    onTouchEnd={onPeekUp}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg outline-none transition hover:bg-black/5 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:hover:bg-white/10"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    title="Click to toggle. Press & hold to peek."
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-600 dark:text-gray-200" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-600 dark:text-gray-200" />
                    )}
                  </button>
                </div>

                {capsLockOn && (
                  <p
                    id="caps-indicator"
                    className="mt-2 text-xs text-amber-600 dark:text-amber-300"
                  >
                    Caps Lock is ON
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-lg bg-[#010662] p-3 font-medium text-white shadow-sm transition hover:bg-[#0b1199] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!canSubmit}
              >
                {/* subtle animated sheen */}
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition group-hover:translate-x-full" />
                {isLoading ? (
                  <>
                    <svg
                      className="h-5 w-5 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
                      />
                    </svg>
                    <span>Signing in...</span>
                  </>
                ) : (
                  "Sign in"
                )}
              </button>

              {/* Tiny helper / contact line */}
              <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                Need help? Contact your administrator.
              </p>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
