// src/pages/Users.tsx
import React, { useMemo, useState } from "react";
import { Plus, MoreVertical, Search, User2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
} from "@/components/ui/table";

type Role = "super_admin" | "admin" | "acad_head" | "professor";
type Status = "active" | "inactive";

type UserRow = {
  id: string;
  username: string;
  email: string;
  name?: string;
  role: Role;
  status: Status;
  last_login?: string | null;
};

// --- Static demo data (layout only) ---
const DEMO_ROWS: UserRow[] = [
  { id: "1", username: "super", email: "super@spcc.edu.ph", name: "System Owner", role: "super_admin", status: "active", last_login: null },
  { id: "2", username: "admin1", email: "admin1@spcc.edu.ph", name: "Admin One", role: "admin", status: "active", last_login: "2025-10-18T12:15:00Z" },
  { id: "3", username: "head.acad", email: "head@spcc.edu.ph", name: "Academic Head", role: "acad_head", status: "inactive", last_login: "2025-10-10T08:00:00Z" },
  { id: "4", username: "prof.maria", email: "maria@spcc.edu.ph", name: "Prof. Maria Dela Cruz", role: "professor", status: "active", last_login: "2025-10-19T03:22:00Z" },
];

const ROLE_OPTIONS: { value: Role | "all"; label: string }[] = [
  { value: "all", label: "All Roles" },
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "acad_head", label: "Academic Head" },
  { value: "professor", label: "Professor" },
];

const STATUS_OPTIONS: { value: Status | "all"; label: string }[] = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function roleBadge(role: Role) {
  const map: Record<Role, { label: string; className: string }> = {
    super_admin: { label: "Super Admin", className: "bg-purple-100 text-purple-700" },
    admin: { label: "Admin", className: "bg-blue-100 text-blue-700" },
    acad_head: { label: "Academic Head", className: "bg-amber-100 text-amber-700" },
    professor: { label: "Professor", className: "bg-emerald-100 text-emerald-700" },
  };
  const r = map[role];
  return <Badge className={r.className}>{r.label}</Badge>;
}

function statusBadge(status: Status) {
  return status === "active" ? (
    <Badge className="bg-emerald-100 text-emerald-700 flex gap-1">
      <CheckCircle2 className="h-3.5 w-3.5" /> Active
    </Badge>
  ) : (
    <Badge className="bg-zinc-200 text-zinc-700 flex gap-1">
      <XCircle className="h-3.5 w-3.5" /> Inactive
    </Badge>
  );
}

const Users: React.FC = () => {
  // UI-only state
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");

  // Filter demo data locally (layout preview)
  const filtered = useMemo(() => {
    const qlc = q.trim().toLowerCase();
    return DEMO_ROWS.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (!qlc) return true;
      return (
        u.username.toLowerCase().includes(qlc) ||
        (u.email || "").toLowerCase().includes(qlc) ||
        (u.name || "").toLowerCase().includes(qlc)
      );
    });
  }, [q, roleFilter, statusFilter]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <User2 className="h-6 w-6" /> User Management
          </h1>
          <p className="text-sm text-muted-foreground">Create, edit, and manage user access.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled>Refresh</Button>
          <Button disabled><Plus className="h-4 w-4 mr-2" />Add User</Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="sr-only">Filters</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="flex gap-2 items-center w-full md:w-auto">
              <div className="relative w-full md:w-[320px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search by name, username, or email"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <Button variant="secondary" disabled>Apply</Button>
            </div>

            <div className="flex gap-2">
              <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as Role | "all")}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value as any}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Status | "all")}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value as any}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <div className="mt-5 rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[32px]" />
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <User2 className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell className="font-medium">{u.name || "—"}</TableCell>
                    <TableCell>{u.username}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{roleBadge(u.role)}</TableCell>
                    <TableCell>{statusBadge(u.status)}</TableCell>
                    <TableCell>{u.last_login ? new Date(u.last_login).toLocaleString() : "—"}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem disabled>Edit</DropdownMenuItem>
                          <DropdownMenuItem disabled>Reset Password</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem disabled>
                            {u.status === "active" ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Users;
