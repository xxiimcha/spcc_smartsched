import React, { useState, useRef, useEffect } from "react";
import logo from "../components/images/logo.png";
import background from "../components/images/login.jpg";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { authService } from "../services/authService";
import type { User, Role } from "../contexts/AuthContext";

type RawRole = string | Role;
const normalizeRole = (r: RawRole): Role => {
  const v = String(r || "").toLowerCase();
  if (v === "super_admin" || v === "super-admin") return "super_admin";
  if (v === "admin") return "admin";
  if (v === "acad_head" || v === "school_head" || v === "acad-head") return "acad_head";
  if (v === "professor" || v === "professors") return "professor";
  // default to lowest-priv route; adjust if you prefer a hard error
  return "professor";
};

interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string | null;
  user?: {
    id: string | number;
    username: string;
    role: RawRole;
    email?: string;
    name?: string;
    token?: string | null; // some APIs put token here
    profile?: any;
  };
}

const Login: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string>("");
  const [isError, setIsError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();
  const redirectTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimer.current) window.clearTimeout(redirectTimer.current);
    };
  }, []);

  useEffect(() => {
    if (message) {
      setIsError(false);
      setMessage("");
    }
  }, [username, password]); // reset message on input change

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ("getModifierState" in e) {
      const on = (e as any).getModifierState?.("CapsLock");
      if (typeof on === "boolean") setCapsLockOn(on);
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;

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

      if (result.success && result.user) {
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
        setMessage("Login successful! Redirecting...");

        const to =
          role === "super_admin" || role === "admin"
            ? "/admin"
            : role === "professor"
            ? "/prof"
            : "/";

        redirectTimer.current = window.setTimeout(() => navigate(to), 600);
      } else {
        setIsError(true);
        setMessage(result.message || "Invalid credentials. Please try again.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setIsError(true);
      setMessage("An error occurred during login. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit =
    username.trim().length > 0 && password.length > 0 && !isLoading;

  return (
    <div
      className="flex justify-center items-center min-h-screen bg-gray-100 bg-cover bg-center p-4"
      style={{ backgroundImage: `url(${background})` }}
    >
      <div className="flex flex-col md:flex-row max-w-3xl w-full bg-white shadow-lg rounded-xl overflow-hidden">
        <div className="bg-[#010662] text-white text-center p-10 flex flex-col justify-center items-center md:w-1/2 w-full">
          <img src={logo} className="w-28 mb-4" alt="SPCC Logo" />
          <h1 className="font-extrabold text-4xl mb-2">SPCC</h1>
          <p className="text-lg">Systems Plus Computer College</p>
          <p className="text-xs mt-auto">
            &copy; {new Date().getFullYear()} SPCC. All rights reserved.
          </p>
        </div>

        <div className="bg-white p-10 flex-1 w-full md:w-1/2">
          <h2 className="text-2xl font-bold">Welcome back</h2>
          <p className="text-gray-600 mb-6">
            Enter your credentials to access your account
          </p>

          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label htmlFor="username" className="font-semibold block mb-1">
                Username or Email
              </label>
              <input
                type="text"
                id="username"
                placeholder="Enter Username or Email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isLoading}
                autoCapitalize="none"
                autoComplete="username"
                inputMode="email"
              />
            </div>

            <div className="mb-2">
              <label htmlFor="password" className="font-semibold block mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            {capsLockOn && (
              <p className="text-xs text-amber-600 mb-3">Caps Lock is ON</p>
            )}

            <button
              type="submit"
              className="w-full p-3 bg-[#010662] text-white rounded-md hover:bg-[#020a94] transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              disabled={!canSubmit}
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
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
                      d="M4 12a 8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
                    />
                  </svg>
                  <span>Signing in...</span>
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {message && (
            <p
              className={`mt-4 text-center ${
                isError ? "text-red-600" : "text-green-600"
              }`}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
