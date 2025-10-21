import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import ProfessorSidebar from "./ProfessorSidebar";

const ProfessorLayout: React.FC = () => {
  const [open, setOpen] = useState(true);

  return (
    <div className="min-h-screen w-full grid grid-cols-[auto_1fr]">
      <ProfessorSidebar isOpen={open} onToggle={() => setOpen((v) => !v)} />
      <main className="bg-muted/10">
        <Outlet />
      </main>
    </div>
  );
};

export default ProfessorLayout;
