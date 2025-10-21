import React from "react";
import ProfessorManagement from "@/components/professors/ProfessorManagement";

const Professors = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Professors</h1>
      </div>

      <ProfessorManagement />
    </div>
  );
};

export default Professors;
