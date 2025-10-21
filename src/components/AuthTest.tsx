import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

const AuthTest: React.FC = () => {
  const { user, isAuthenticated, isAdmin, isSchoolHead, logout } = useAuth();

  if (!isAuthenticated) {
    return (
      <Card className="w-full max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle>Authentication Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Not authenticated</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Authentication Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">User ID:</p>
          <p className="text-base">{user?.id}</p>
        </div>

        <div>
          <p className="text-sm font-medium text-muted-foreground">Username:</p>
          <p className="text-base">{user?.username}</p>
        </div>

        <div>
          <p className="text-sm font-medium text-muted-foreground">Name:</p>
          <p className="text-base">{user?.name || "N/A"}</p>
        </div>

        <div>
          <p className="text-sm font-medium text-muted-foreground">Email:</p>
          <p className="text-base">{user?.email || "N/A"}</p>
        </div>

        <div>
          <p className="text-sm font-medium text-muted-foreground">Role:</p>
          <p className="text-base capitalize">{user?.role}</p>
        </div>

        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Permissions:
          </p>
          <div className="flex gap-2 mt-1">
            {isAdmin && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                Admin
              </span>
            )}
            {isSchoolHead && (
              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                School Head
              </span>
            )}
          </div>
        </div>

        <div className="pt-4">
          <Button onClick={logout} variant="outline" className="w-full">
            Logout
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AuthTest;
