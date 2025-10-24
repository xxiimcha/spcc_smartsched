// src/components/layout/ProfessorSidebar.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { BookOpen, LayoutDashboard, LogOut, Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Separator } from "@/components/ui/separator";
import { apiService } from "@/services/apiService";

interface ProfessorSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

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
            </Button>
          </Link>
        </TooltipTrigger>
        {!isOpen && <TooltipContent side="right">{label}</TooltipContent>}
      </Tooltip>
    </TooltipProvider>
  );
};

const ProfessorSidebar: React.FC<ProfessorSidebarProps> = ({ isOpen, onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  // If your AuthContext exposes setUser, we use it to reflect updates immediately
  const { user, logout, setUser }: any = useAuth();

  const [profileOpen, setProfileOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state seeded from current user
  const [name, setName] = useState<string>(user?.name || user?.full_name || "");
  const [email, setEmail] = useState<string>(user?.email || "");
  const [phone, setPhone] = useState<string>(user?.phone || "");
  const [username, setUsername] = useState<string>(user?.username || "");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  useEffect(() => {
    // keep dialog fields in sync if user changes due to re-login, etc.
    setName(user?.name || user?.full_name || "");
    setEmail(user?.email || "");
    setPhone(user?.phone || "");
    setUsername(user?.username || "");
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate("/pages/login");
  };

  const isDashboard = location.pathname === "/prof/dashboard";
  const isSubjects = location.pathname.startsWith("/prof/subjects");

  const openProfile = () => setProfileOpen(true);
  const closeProfile = () => {
    if (!saving) setProfileOpen(false);
  };

  const handleSaveProfile = async () => {
    // very light validation
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      toast({ title: "Enter a valid email", variant: "destructive" });
      return;
    }
    if (newPassword && newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Adjust the endpoint to match your backend. Common patterns:
      // PUT /professors/profile  or  PUT /users/profile
      // We send only fields that changed; for simplicity, send all (backend should ignore unchanged)
      const payload: any = {
        name,
        email,
        phone,
        username, // often immutable; backend can ignore if not allowed
      };
      if (newPassword) payload.password = newPassword;

      const res = await apiService.updateProfessorProfile({
        prof_id: Number(user?.prof_id ?? user?.id), // keep if your backend needs it
        name,
        email,
        phone,
        username,
        password: newPassword || undefined,         // only send if set
      });
      

      if (res?.success || res?.status === "ok") {
        // Update local auth state if supported
        if (typeof setUser === "function") {
          setUser((prev: any) => ({
            ...prev,
            name,
            full_name: name,
            email,
            phone,
            username,
          }));
        }
        toast({ title: "Profile updated" });
        setProfileOpen(false);
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const msg =
          res?.message ||
          res?.error ||
          "Could not update profile. Please try again.";
        toast({ title: "Update failed", description: msg, variant: "destructive" });
      }
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err?.message || "Network or server error.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen bg-background border-r flex flex-col transition-all duration-300",
          isOpen ? "w-[280px]" : "w-[80px]"
        )}
      >
        {/* Top / scrollable */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
          <div className="flex items-center gap-2 mb-8">
            <div className="h-8 w-8 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold">
              P
            </div>
            {isOpen && (
              <h1 className="font-bold text-xl text-blue-700">Professor Portal</h1>
            )}
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
              path="/prof/dashboard"
              active={isDashboard}
              isOpen={isOpen}
            />
            <NavItem
              icon={<BookOpen className="h-5 w-5" />}
              label="Subjects"
              path="/prof/subjects"
              active={isSubjects}
              isOpen={isOpen}
            />
          </nav>
        </div>

        {/* Bottom / fixed */}
        <div className="p-4 border-t">
          <button
            type="button"
            onClick={openProfile}
            className={cn(
              "flex items-center gap-3 w-full rounded-md p-2 hover:bg-accent transition-colors",
              !isOpen && "justify-center"
            )}
          >
            <Avatar>
              <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=professor" />
              <AvatarFallback className="bg-blue-600 text-white">PF</AvatarFallback>
            </Avatar>
            {isOpen && (
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.name || user?.username || "Professor"}
                </p>
                <p className="text-xs text-muted-foreground truncate">View profile</p>
              </div>
            )}
          </button>

          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 text-muted-foreground mt-4",
              !isOpen && "justify-center px-2"
            )}
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            {isOpen && <span>Logout</span>}
          </Button>
        </div>
      </aside>

      {/* Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={(open) => (open ? setProfileOpen(true) : closeProfile())}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </DialogTitle>
            <DialogDescription>Update your account information.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">

            <Separator />

            <div className="grid grid-cols-1 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  placeholder="Juan Dela Cruz"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@school.edu.ph"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="09xx xxx xxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  // If username shouldn't be editable, disable and remove onChange
                  // disabled
                />
              </div>

              <Separator />

              <div className="grid gap-2">
                <Label htmlFor="newPassword">New password (optional)</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={closeProfile} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProfessorSidebar;
