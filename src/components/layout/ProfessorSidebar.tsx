// src/components/layout/ProfessorSidebar.tsx
import React from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { BookOpen, LayoutDashboard, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/pages/login");
  };

  const isDashboard = location.pathname === "/prof/dashboard";
  const isSubjects = location.pathname.startsWith("/prof/subjects");

  return (
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
        {isOpen && <h1 className="font-bold text-xl text-blue-700">Professor Portal</h1>}
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
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=professor" />
            <AvatarFallback className="bg-blue-600 text-white">PF</AvatarFallback>
          </Avatar>
          {isOpen && (
            <div>
              <p className="text-sm font-medium">{user?.name || user?.username || "Professor"}</p>
              <p className="text-xs text-muted-foreground">Professor</p>
            </div>
          )}
        </div>

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
  );
};

export default ProfessorSidebar;
