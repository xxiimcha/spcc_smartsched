import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { cn } from "@/lib/utils";
import { BookOpen, Users, Calendar, Building2, Users2 } from "lucide-react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

interface MetricsData {
  totalSchedules: number;
  totalProfessors: number;
  totalSubjects: number;
  totalRooms: number;
  totalSections: number;
}

interface SummaryMetricProps {
  refreshData?: () => void;
  initialMetrics?: MetricsData;
}

const SummaryMetrics = ({
  refreshData,
  initialMetrics,
}: SummaryMetricProps) => {
  const [metrics, setMetrics] = useState<MetricsData>({
    totalSchedules: initialMetrics?.totalSchedules || 0,
    totalProfessors: initialMetrics?.totalProfessors || 0,
    totalSubjects: initialMetrics?.totalSubjects || 0,
    totalRooms: initialMetrics?.totalRooms || 0,
    totalSections: initialMetrics?.totalSections || 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(
        "https://spcc-scheduler.site/dashboard_metrics.php"
      );

      if (response.data.success) {
        setMetrics(response.data.data);
      } else {
        setError("Failed to load metrics");
      }
    } catch (err) {
      console.error("Error fetching metrics:", err);
      setError("Error connecting to the server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();

    // Listen for dashboard data updated events
    const handleDataUpdated = () => {
      fetchMetrics();
    };

    window.addEventListener("dashboardDataUpdated", handleDataUpdated);

    return () => {
      window.removeEventListener("dashboardDataUpdated", handleDataUpdated);
    };
  }, []);

  const {
    totalSchedules,
    totalProfessors,
    totalSubjects,
    totalRooms,
    totalSections,
  } = metrics;

  // Simple refresh icon component
  const RefreshIcon = ({ className }: { className?: string }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
  interface MetricCardProps {
    title: string;
    value: number;
    icon: React.ReactNode;
    className?: string;
    valueClassName?: string;
    loading?: boolean;
  }

  const MetricCard = ({
    title,
    value,
    icon,
    className,
    valueClassName,
    loading = false,
  }: MetricCardProps) => {
    return (
      <Card
        className={cn(
          "border cursor-pointer hover:shadow-md transition-shadow",
          className
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-700">
            {title}
          </CardTitle>
          <div className="rounded-full p-2 bg-white/80">{icon}</div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-8 w-16 bg-gray-200 animate-pulse rounded-md"></div>
          ) : (
            <div className={cn("text-3xl font-bold", valueClassName)}>
              {value}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">Total count as of today</p>
        </CardContent>
      </Card>
    );
  };
  return (
    <div className="w-full bg-white p-4 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Summary</h2>
        {loading ? (
          <span className="text-sm text-gray-500">Updating...</span>
        ) : error ? (
          <span className="text-sm text-red-500">{error}</span>
        ) : (
          <button
            onClick={fetchMetrics}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
          >
            <RefreshIcon className="h-4 w-4 mr-1" />
            Refresh Metrics
          </button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Link to="/scheduling">
          <MetricCard
            title="Total Schedules"
            value={totalSchedules}
            icon={<Calendar className="h-5 w-5 text-blue-600" />}
            className="border-blue-100 bg-blue-50"
            valueClassName="text-blue-700"
            loading={loading}
          />
        </Link>
        <Link to="/professors">
          <MetricCard
            title="Total Professors"
            value={totalProfessors}
            icon={<Users className="h-5 w-5 text-emerald-600" />}
            className="border-emerald-100 bg-emerald-50"
            valueClassName="text-emerald-700"
            loading={loading}
          />
        </Link>
        <Link to="/subjects">
          <MetricCard
            title="Total Subjects"
            value={totalSubjects}
            icon={<BookOpen className="h-5 w-5 text-purple-600" />}
            className="border-purple-100 bg-purple-50"
            valueClassName="text-purple-700"
            loading={loading}
          />
        </Link>
        <Link to="/rooms">
          <MetricCard
            title="Total Rooms"
            value={totalRooms}
            icon={<Building2 className="h-5 w-5 text-orange-600" />}
            className="border-orange-100 bg-orange-50"
            valueClassName="text-orange-700"
            loading={loading}
          />
        </Link>
        <Link to="/sections">
          <MetricCard
            title="Total Sections"
            value={totalSections}
            icon={<Users2 className="h-5 w-5 text-rose-600" />}
            className="border-rose-100 bg-rose-50"
            valueClassName="text-rose-700"
            loading={loading}
          />
        </Link>
      </div>
    </div>
  );
};

export default SummaryMetrics;
