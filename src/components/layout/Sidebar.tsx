import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Home,
  Users,
  BookOpen,
  Calendar,
  LogOut,
  ChevronRight,
  Menu,
  DoorOpen,
  GraduationCap,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  path: string;
  active?: boolean;
  isOpen: boolean;
}

const NavItem = ({
  icon,
  label,
  path,
  active = false,
  isOpen,
}: NavItemProps) => {
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

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar = ({ isOpen, onToggle }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const currentPath = location.pathname;

  const handleLogout = () => {
    logout();
    navigate("/pages/login");
  };

  return (
    <div
      className={cn(
        "h-full bg-background border-r flex flex-col transition-all duration-300",
        isOpen ? "w-[280px]" : "w-[80px]"
      )}
    >
      <div className="p-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="h-8 w-8 rounded-md bg-[#010662] flex items-center justify-center">
            <span className="text-white font-bold">SP</span>
          </div>
          {isOpen && (
            <h1 className="font-bold text-xl text-[#010662]">School Panel</h1>
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
            icon={<Home className="h-5 w-5" />}
            label="Dashboard"
            path="/"
            active={currentPath === "/"}
            isOpen={isOpen}
          />
          <NavItem
            icon={<Users className="h-5 w-5" />}
            label="Professors"
            path="/professors"
            active={currentPath.startsWith("/professors")}
            isOpen={isOpen}
          />
          <NavItem
            icon={<BookOpen className="h-5 w-5" />}
            label="Subjects"
            path="/subjects"
            active={currentPath.startsWith("/subjects")}
            isOpen={isOpen}
          />
          <NavItem
            icon={<GraduationCap className="h-5 w-5" />}
            label="Sections"
            path="/sections"
            active={currentPath.startsWith("/sections")}
            isOpen={isOpen}
          />
          <NavItem
            icon={<DoorOpen className="h-5 w-5" />}
            label="Rooms"
            path="/rooms"
            active={currentPath.startsWith("/rooms")}
            isOpen={isOpen}
          />

          <NavItem
            icon={<Calendar className="h-5 w-5" />}
            label="Scheduling"
            path="/scheduling"
            active={currentPath.startsWith("/scheduling")}
            isOpen={isOpen}
          />
        </nav>
      </div>

      <div className="mt-auto p-4 border-t">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=schoolhead" />
            <AvatarFallback className="bg-[#010662] text-white">
              SH
            </AvatarFallback>
          </Avatar>
          {isOpen && (
            <div>
              <p className="text-sm font-medium">
                {user?.name || user?.username || "School Head"}
              </p>
              <p className="text-xs text-muted-foreground">School Head</p>
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
    </div>
  );
};

export default Sidebar;
