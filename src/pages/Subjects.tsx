import React from "react";
import SubjectManagement from "@/components/subjects/SubjectManagement";

const Subjects = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Subjects</h1>
      </div>

      <SubjectManagement />
    </div>
  );
};

export default Subjects;
