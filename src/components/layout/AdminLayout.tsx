import React, { useState, ReactNode } from "react";
import AdminSidebar from "./AdminSidebar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="h-screen bg-gray-50 relative">
      <div className="flex h-full">
        {/* Sidebar with conditional classes */}
        <div
          className={`fixed md:relative z-20 transition-all duration-300 ease-in-out ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          } md:translate-x-0`}
        >
          <AdminSidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-6 w-full">
          {/* Mobile menu toggle button - only visible on small screens */}
          <Button
            variant="outline"
            size="icon"
            className="mb-4 md:hidden"
            onClick={toggleSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>
          {children}
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-10 md:hidden"
          onClick={toggleSidebar}
        />
      )}
    </div>
  );
};

export default AdminLayout;
