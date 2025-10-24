import React, { useState, useMemo } from "react";
import { Outlet } from "react-router-dom";
import ProfessorSidebar from "./ProfessorSidebar";

const ProfessorLayout: React.FC = () => {
  const [open, setOpen] = useState(true);

  // Match the widths used in ProfessorSidebar (w-[280px] / w-[80px])
  const sidebarWidth = useMemo(() => (open ? 280 : 80), [open]);

  return (
    <div className="min-h-screen w-full bg-muted/10">
      {/* Fixed sidebar */}
      <ProfessorSidebar isOpen={open} onToggle={() => setOpen(v => !v)} />

      {/* Content shifted to the right by the sidebar width */}
      <main
        className="min-h-screen transition-all duration-300"
        style={{ marginLeft: sidebarWidth }}
      >
        {/* optional: add page padding so content isn't flush to the edge */}
        <div className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default ProfessorLayout;
