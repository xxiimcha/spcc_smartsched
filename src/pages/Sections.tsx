import React from "react";
import SectionManagement from "@/components/sections/SectionManagement";

const Sections = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Sections</h1>
      </div>

      <SectionManagement />
    </div>
  );
};

export default Sections;
