import React, { useState, ReactNode } from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

type AdminLayoutProps = {
  children?: ReactNode; // make optional
};

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = () => setSidebarOpen((s) => !s);

  return (
    <div className="h-screen bg-gray-50 relative">
      <div className="flex h-full">
        {/* Sidebar */}
        <div
          className={`fixed md:relative z-20 transition-all duration-300 ease-in-out ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          } md:translate-x-0`}
        >
          <AdminSidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
        </div>

        {/* Main */}
        <main className="flex-1 overflow-auto p-6 w-full">
          <Button
            variant="outline"
            size="icon"
            className="mb-4 md:hidden"
            onClick={toggleSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* If children provided, render them; otherwise render nested routes */}
          {children ?? <Outlet />}
        </main>
      </div>

      {/* Mobile overlay */}
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
