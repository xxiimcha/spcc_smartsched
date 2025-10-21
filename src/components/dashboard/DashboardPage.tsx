import React from "react";
import SummaryMetrics from "./SummaryMetrics";
import Reports from "./Reports";

const DashboardPage = () => {
  return (
    <div className="space-y-6 p-6">
      <SummaryMetrics />
      <Reports />
    </div>
  );
};

export default DashboardPage;
