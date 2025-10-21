import React from "react";
import SystemSettings from "@/components/admin/SystemSettings";

const Settings = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      </div>

      <SystemSettings />
    </div>
  );
};

export default Settings;
