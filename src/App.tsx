// src/App.tsx
import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SystemSettingsProvider } from "./contexts/SystemSettingsContext";
import AppLayout from "./components/layout/AppLayout";
import AdminLayout from "./components/layout/AdminLayout";

// Lazy load pages
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

const ProfessorLayout    = lazy(() => import("./components/layout/ProfessorLayout"));
const ProfessorDashboard = lazy(() => import("./pages/ProfessorDashboard"));
const ProfessorSubjects  = lazy(() => import("./pages/ProfessorSubjects"));

/** ✅ acad_head can access /admin */
const ADMIN_ROLES = ["admin", "super_admin", "acad_head"] as const;
/** (If you intend to have a separate root app for acad_head, move it here and change login redirect) */
const APP_ROLES   = ["acad_head"] as const; // keep if you still use root area for acad_head
const PROFESSOR_ROLES = ["professor"] as const;

const AppRoutes = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <Routes>
        {/* Public */}
        <Route path="/pages/login" element={<Login />} />

        {/* Admin area (super_admin, admin, acad_head) */}
        <Route
          path="/admin/*"
          element={
            isAuthenticated && ADMIN_ROLES.includes(user?.role as any) ? (
              <AdminLayout />
            ) : (
              <Navigate to="/pages/login" replace />
            )
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
          <Route path="users" element={<Users />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Main app (only if you truly want acad_head on root) */}
        <Route
          path="/*"
          element={
            isAuthenticated && APP_ROLES.includes(user?.role as any) ? (
              <AppLayout />
            ) : isAuthenticated && ADMIN_ROLES.includes(user?.role as any) ? (
              <Navigate to="/admin" replace />
            ) : (
              <Navigate to="/pages/login" replace />
            )
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
        </Route>

        {/* Professor area */}
        <Route
          path="/prof/*"
          element={
            isAuthenticated && PROFESSOR_ROLES.includes(user?.role as any) ? (
              <ProfessorLayout />
            ) : (
              <Navigate to="/pages/login" replace />
            )
          }
        >
          <Route index element={<ProfessorDashboard />} />
          <Route path="dashboard" element={<ProfessorDashboard />} />
          <Route path="subjects" element={<ProfessorSubjects />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
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
