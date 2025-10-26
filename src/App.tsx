// src/App.tsx
import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SystemSettingsProvider } from "./contexts/SystemSettingsContext";

// Layouts
import AppLayout from "./components/layout/AppLayout";      // used by acad_head at /acad/*
import AdminLayout from "./components/layout/AdminLayout";
const ProfessorLayout    = lazy(() => import("./components/layout/ProfessorLayout"));

// Pages
const Dashboard   = lazy(() => import("./pages/Dashboard"));
const Professors  = lazy(() => import("./pages/Professors"));
const Subjects    = lazy(() => import("./pages/Subjects"));
const Scheduling  = lazy(() => import("./pages/Scheduling"));
const Login       = lazy(() => import("./pages/Login"));
const Settings    = lazy(() => import("./pages/Settings"));
const Sections    = lazy(() => import("./pages/Sections"));
const Rooms       = lazy(() => import("./pages/Rooms"));
const ScheduleNew = lazy(() => import("./pages/ScheduleNew"));
const Users       = lazy(() => import("./pages/Users"));
const ProfessorDashboard = lazy(() => import("./pages/ProfessorDashboard"));
const ProfessorSubjects  = lazy(() => import("./pages/ProfessorSubjects"));

// Role gates
const ADMIN_ROLES      = ["admin", "super_admin"] as const;
const ACAD_ROLES       = ["acad_head"] as const;
const PROFESSOR_ROLES  = ["professor"] as const;

// Smart landing based on role
function RoleLanding() {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/pages/login" replace />;

  switch (user?.role) {
    case "super_admin":
    case "admin":
      return <Navigate to="/admin" replace />;
    case "acad_head":
      return <Navigate to="/acad" replace />;
    case "professor":
      return <Navigate to="/prof" replace />;
    default:
      return <Navigate to="/pages/login" replace />;
  }
}

const AppRoutes = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <Routes>
        {/* Public */}
        <Route path="/pages/login" element={<Login />} />

        {/* Default landing */}
        <Route path="/" element={<RoleLanding />} />

        {/* ---------- Admin area (admin, super_admin) ---------- */}
        <Route
          path="/admin/*"
          element={
            isAuthenticated && ADMIN_ROLES.includes(user?.role as any)
              ? <AdminLayout />
              : <Navigate to="/pages/login" replace />
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="professors" element={<Professors />} />
          <Route path="rooms" element={<Rooms />} />
          <Route path="subjects" element={<Subjects />} />
          <Route path="sections" element={<Sections />} />
          <Route path="scheduling" element={<Scheduling />} />
          <Route path="scheduling/new" element={<ScheduleNew />} />
          <Route path="users" element={<Users />} />         {/* keep Users in admin */}
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Route>

        {/* ---------- Acad area (acad_head) using AppLayout at /acad ---------- */}
        <Route
          path="/acad/*"
          element={
            isAuthenticated && ACAD_ROLES.includes(user?.role as any)
              ? <AppLayout />
              : <Navigate to="/pages/login" replace />
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="professors" element={<Professors />} />
          <Route path="rooms" element={<Rooms />} />
          <Route path="subjects" element={<Subjects />} />
          <Route path="sections" element={<Sections />} />
          <Route path="scheduling" element={<Scheduling />} />
          <Route path="scheduling/new" element={<ScheduleNew />} />
          {/* No admin-only pages (like Users) here unless intended */}
          <Route path="*" element={<Navigate to="/acad/dashboard" replace />} />
        </Route>

        {/* ---------- Professor area ---------- */}
        <Route
          path="/prof/*"
          element={
            isAuthenticated && PROFESSOR_ROLES.includes(user?.role as any)
              ? <ProfessorLayout />
              : <Navigate to="/pages/login" replace />
          }
        >
          <Route index element={<ProfessorDashboard />} />
          <Route path="dashboard" element={<ProfessorDashboard />} />
          <Route path="subjects" element={<ProfessorSubjects />} />
          <Route path="*" element={<Navigate to="/prof/dashboard" replace />} />
        </Route>

        {/* Fallback: if authed, go to role landing; else login */}
        <Route path="*" element={<RoleLanding />} />
      </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <AuthProvider>
      <SystemSettingsProvider>
        <AppRoutes />
      </SystemSettingsProvider>
    </AuthProvider>
  );
}

export default App;
