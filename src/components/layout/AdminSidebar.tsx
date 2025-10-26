import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  // Header / general
  ShieldCheck,
  Settings,
  LogOut,
  ChevronRight,
  Menu,
  // Navigation (enhanced)
  LayoutDashboard,
  GraduationCap,
  Building2,
  BookOpen,
  SquareStack,
  CalendarClock,
  Users as UsersIcon,
  FileDown,
  User as UserIcon, 
  Eye, EyeOff,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input"; // ⬅️ added
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  path: string;
  active?: boolean;
  isOpen: boolean;
}

const NavItem = ({ icon, label, path, active = false, isOpen }: NavItemProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link to={path} className="w-full">
            <Button
              variant={active ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 mb-1 text-left",
                active ? "bg-secondary font-medium" : "text-muted-foreground",
                !isOpen && "justify-center px-2"
              )}
            >
              {icon}
              {isOpen && <span>{label}</span>}
              {active && isOpen && <ChevronRight className="ml-auto h-4 w-4" />}
            </Button>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface AdminSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const getSchoolYears = () => {
  const now = new Date();
  const currentStartYear = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  const years: string[] = [];
  for (let i = 0; i <= 3; i++) {
    const start = currentStartYear - i;
    years.push(`${start}-${start + 1}`);
  }
  return years;
};

const AdminSidebar = ({ isOpen, onToggle }: AdminSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const [exportOpen, setExportOpen] = useState(false);
  const [schoolYears, setSchoolYears] = useState<string[]>([]);
  const [selectedSY, setSelectedSY] = useState<string>("");

  // ▼ Profile dialog state
  const [profileOpen, setProfileOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "https://spcc-scheduler.site";

  // If your API route differs, change this:
  const PROFILE_UPDATE_ENDPOINT = `${API_BASE_URL}/users.php?action=update_self`;

  const handleLogout = () => {
    logout();
    navigate("/pages/login");
  };

  useEffect(() => {
    if (exportOpen) {
      const list = getSchoolYears();
      setSchoolYears(list);
      if (!selectedSY && list.length) setSelectedSY(list[0]);
    }
  }, [exportOpen, selectedSY]);

  const handleExport = async () => {
    if (!selectedSY) {
      toast({ variant: "destructive", title: "Please select a school year" });
      return;
    }
    try {
      const res = await fetch(
        `${API_BASE_URL}/export_all.php?school_year=${encodeURIComponent(selectedSY)}`
      );
      if (!res.ok) throw new Error("Failed to download file");

      const blob = await res.blob();
      const fileName = `SPCC_Compiled_${selectedSY}.xlsx`;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast({ title: "Export started", description: `Downloading ${fileName}` });
      setExportOpen(false);
    } catch {
      toast({
        variant: "destructive",
        title: "Export failed",
        description: "Unable to generate file. Please try again.",
      });
    }
  };

  // ▼ Open profile dialog pre-filling from current user
  const openProfile = () => {
    setFullName((user?.name as string) || user?.username || "");
    setEmail((user?.email as string) || "");
    setUsername((user?.username as string) || "");
    setPassword("");
    setConfirmPassword("");
    setProfileOpen(true);
  };

  // ▼ Save profile
  const handleSaveProfile = async () => {
    if (!fullName?.trim()) {
      toast({ variant: "destructive", title: "Name is required." });
      return;
    }
    if (!email?.trim()) {
      toast({ variant: "destructive", title: "Email is required." });
      return;
    }
    if (!username?.trim()) {
      toast({ variant: "destructive", title: "Username is required." });
      return;
    }
    if (password && password !== confirmPassword) {
      toast({ variant: "destructive", title: "Passwords do not match." });
      return;
    }

    const payload: Record<string, unknown> = {
      // backend can derive user_id from session; include if you store it in user
      user_id: (user as any)?.user_id ?? (user as any)?.id,
      name: fullName.trim(),
      email: email.trim(),
      username: username.trim(),
      // Only send password if entered (no hashing here; backend will handle as you prefer)
      ...(password ? { password } : {}),
    };

    try {
      setSavingProfile(true);
      const res = await fetch(PROFILE_UPDATE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // keep cookies/session if used in your app
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || (data && data.success === false)) {
        throw new Error(data?.message || "Failed to update profile");
      }

      toast({ title: "Profile updated", description: "Your changes have been saved." });
      setProfileOpen(false);

      // Optional: refresh page or pull fresh user details from AuthContext if you expose a refresh
      // await refreshUser?.();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: err?.message || "Please try again.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const currentPath = location.pathname;

  const DASHBOARD_PATH = "/admin/dashboard";
  const SETTINGS_PATH = "/admin/settings";

  const isAdminOrSuper = user?.role === "admin" || user?.role === "super_admin";

  return (
    <div
      className={cn(
        "h-full bg-background border-r flex flex-col transition-all duration-300",
        isOpen ? "w-[280px]" : "w-[80px]"
      )}
    >
      <div className="p-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="h-8 w-8 rounded-md bg-red-600 flex items-center justify-center">
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          {isOpen && <h1 className="font-bold text-xl text-red-600">Admin Panel</h1>}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="ml-auto p-0 h-8 w-8"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        <nav className="space-y-1">
          <NavItem
            icon={<LayoutDashboard className="h-5 w-5" />}
            label="Dashboard"
            path={DASHBOARD_PATH}
            active={currentPath === "/admin" || currentPath === DASHBOARD_PATH}
            isOpen={isOpen}
          />

          <NavItem
            icon={<GraduationCap className="h-5 w-5" />}
            label="Professors"
            path="/admin/professors"
            active={currentPath.startsWith("/admin/professors")}
            isOpen={isOpen}
          />

          <NavItem
            icon={<Building2 className="h-5 w-5" />}
            label="Rooms"
            path="/admin/rooms"
            active={currentPath.startsWith("/admin/rooms")}
            isOpen={isOpen}
          />

          <NavItem
            icon={<BookOpen className="h-5 w-5" />}
            label="Subjects"
            path="/admin/subjects"
            active={currentPath.startsWith("/admin/subjects")}
            isOpen={isOpen}
          />

          <NavItem
            icon={<SquareStack className="h-5 w-5" />}
            label="Sections"
            path="/admin/sections"
            active={currentPath.startsWith("/admin/sections")}
            isOpen={isOpen}
          />

          <NavItem
            icon={<CalendarClock className="h-5 w-5" />}
            label="Scheduling"
            path="/admin/scheduling"
            active={currentPath.startsWith("/admin/scheduling")}
            isOpen={isOpen}
          />

          {isAdminOrSuper && (
            <NavItem
              icon={<UsersIcon className="h-5 w-5" />}
              label="User Management"
              path="/admin/users"
              active={currentPath.startsWith("/admin/users")}
              isOpen={isOpen}
            />
          )}

          <NavItem
            icon={<Settings className="h-5 w-5" />}
            label="System Settings"
            path={SETTINGS_PATH}
            active={currentPath === SETTINGS_PATH}
            isOpen={isOpen}
          />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 mb-1 text-left text-muted-foreground",
                    !isOpen && "justify-center px-2"
                  )}
                  onClick={() => setExportOpen(true)}
                >
                  <FileDown className="h-5 w-5" />
                  {isOpen && <span>Export Data</span>}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Export Data</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </nav>
      </div>

      {/* Footer with Avatar + Profile + Logout */}
      <div className="mt-auto p-4 border-t">
        <div className="flex items-center gap-3">
          <Avatar className="cursor-pointer" onClick={openProfile}>
            <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=admin" />
            <AvatarFallback className="bg-red-600 text-white">AD</AvatarFallback>
          </Avatar>
          {isOpen && (
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.name || user?.username || "Admin User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.role === "super_admin" ? "Super Admin" : "Admin"}
              </p>
            </div>
          )}
        </div>

        <div className={cn("flex gap-2 mt-4", !isOpen && "flex-col")}>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 text-muted-foreground",
              !isOpen && "justify-center px-2"
            )}
            onClick={openProfile}
          >
            <UserIcon className="h-5 w-5" />
            {isOpen && <span>Profile</span>}
          </Button>

          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 text-muted-foreground",
              !isOpen && "justify-center px-2"
            )}
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            {isOpen && <span>Logout</span>}
          </Button>
        </div>
      </div>

      {/* Export Dialog */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Export Compiled Data</DialogTitle>
            <DialogDescription>
              Select a school year to download all recorded data as an Excel file.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <label className="text-sm font-medium">School Year</label>
            <Select value={selectedSY} onValueChange={setSelectedSY}>
              <SelectTrigger>
                <SelectValue placeholder="Select school year" />
              </SelectTrigger>
              <SelectContent>
                {schoolYears.map((sy) => (
                  <SelectItem key={sy} value={sy}>
                    {sy}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setExportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={!selectedSY}>
              Download Excel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update your account details below.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <div className="col-span-1 sm:col-span-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Juan Dela Cruz"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Username</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
              />
            </div>

            {/* 🔒 Password Field with Toggle */}
            <div className="relative">
              <label className="text-sm font-medium">New Password (optional)</label>
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-8 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* 🔒 Confirm Password Field with Toggle */}
            <div className="relative">
              <label className="text-sm font-medium">Confirm Password</label>
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-8 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={() => setProfileOpen(false)} disabled={savingProfile}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default AdminSidebar;
