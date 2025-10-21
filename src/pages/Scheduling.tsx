import React from "react";
import ScheduleManagement from "@/components/scheduling/ScheduleManagement";

const Scheduling = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Scheduling</h1>
      </div>

      <ScheduleManagement />
    </div>
  );
};

export default Scheduling;
