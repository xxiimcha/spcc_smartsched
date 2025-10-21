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
const Admin       = lazy(() => import("./pages/Admin"));
const Settings    = lazy(() => import("./pages/Settings"));
const Sections    = lazy(() => import("./pages/Sections"));
const Rooms       = lazy(() => import("./pages/Rooms"));
const ScheduleNew = lazy(() => import("./pages/ScheduleNew"));
const Users       = lazy(() => import("./pages/Users"));


const ProfessorLayout   = lazy(() => import("./components/layout/ProfessorLayout"));
const ProfessorDashboard = lazy(() => import("./pages/ProfessorDashboard"));
const ProfessorSubjects  = lazy(() => import("./pages/ProfessorSubjects"));

const ADMIN_ROLES = ["admin", "super_admin"] as const;
const APP_ROLES   = ["acad_head"] as const;
const PROFESSOR_ROLES = ["professor"] as const;

const AppRoutes = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          Loading...
        </div>
      }
    >
      <Routes>
        {/* Public */}
        <Route path="/pages/login" element={<Login />} />

        {/* Admin area (admin + super_admin) */}
        <Route
          path="/admin/*"
          element={
            isAuthenticated && ADMIN_ROLES.includes(user?.role as any) ? (
              <AdminLayout>
                <Routes>
                  <Route index element={<Dashboard />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="professors" element={<Professors />} />
                  <Route path="rooms" element={<Rooms />} />
                  <Route path="subjects" element={<Subjects />} />
                  <Route path="sections" element={<Sections />} />
                  <Route path="scheduling" element={<Scheduling />} />
                  <Route path="scheduling/new" element={<ScheduleNew />} />
                  <Route path="users" element={<Users />} />
                  <Route index element={<Admin />} />
                  <Route path="settings" element={<Settings />} />
                </Routes>
              </AdminLayout>
            ) : (
              <Navigate to="/pages/login" />
            )
          }
        />

        {/* Main app (acad_head) at root */}
        <Route
          path="/*"
          element={
            isAuthenticated && APP_ROLES.includes(user?.role as any) ? (
              <AppLayout>
                <Routes>
                  <Route index element={<Dashboard />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="professors" element={<Professors />} />
                  <Route path="rooms" element={<Rooms />} />
                  <Route path="subjects" element={<Subjects />} />
                  <Route path="sections" element={<Sections />} />
                  <Route path="scheduling" element={<Scheduling />} />
                  <Route path="scheduling/new" element={<ScheduleNew />} />
                </Routes>
              </AppLayout>
            ) : isAuthenticated && ADMIN_ROLES.includes(user?.role as any) ? (
              <Navigate to="/admin" />
            ) : (
              <Navigate to="/pages/login" />
            )
          }
        />

        <Route
          path="/prof/*"
          element={
            isAuthenticated && PROFESSOR_ROLES.includes(user?.role as any) ? (
              <ProfessorLayout>
                {/* The Outlet in ProfessorLayout will render these child routes */}
              </ProfessorLayout>
            ) : (
              <Navigate to="/pages/login" />
            )
          }
        >
          <Route index element={<ProfessorDashboard />} />
          <Route path="dashboard" element={<ProfessorDashboard />} />
          <Route path="subjects" element={<ProfessorSubjects />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
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
