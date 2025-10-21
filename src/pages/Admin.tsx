import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building, Calendar } from "lucide-react";
import SchoolHeadManagement from "@/components/schoolhead/SchoolHeadManagement";

type SchoolHead = {
  id: string;
  name: string;
  email?: string;
  username: string;
};

const Admin: React.FC = () => {
  const [schoolHeads, setSchoolHeads] = useState<SchoolHead[]>([]);

  useEffect(() => {
    const fetchSchoolHeadsCount = async () => {
      try {
        const response = await fetch(
          "https://spcc-scheduler.site/acad_head.php"
        );
        const result = await response.json();
        if (Array.isArray(result)) {
          setSchoolHeads(result);
        } else if (result && Array.isArray(result.data)) {
          setSchoolHeads(result.data);
        } else {
          setSchoolHeads([]);
        }
      } catch (e) {
        setSchoolHeads([]);
      }
    };
    fetchSchoolHeadsCount();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">
            Manage school heads and system overview
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total School Heads
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schoolHeads.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>School Heads Management</CardTitle>
        </CardHeader>
        <CardContent>
          <SchoolHeadManagement />
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;
