// src/pages/Users.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  MoreVertical,
  Search,
  User2,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { apiService } from "@/services/apiService";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

type Role = "super_admin" | "admin" | "acad_head" | "professor";
type Status = "active" | "inactive";

export type UserRow = {
  id: string | number;
  username: string;
  email: string;
  name?: string;
  role: Role;
  status: Status;
  last_login?: string | null;
};

const STATUS_OPTIONS: { value: Status | "all"; label: string }[] = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function RoleBadge({ role }: { role: Role }) {
  const map: Record<Role, { label: string; className: string }> = {
    super_admin: { label: "Super Admin", className: "bg-purple-100 text-purple-700" },
    admin: { label: "Admin", className: "bg-blue-100 text-blue-700" },
    acad_head: { label: "Academic Head", className: "bg-amber-100 text-amber-700" },
    professor: { label: "Professor", className: "bg-emerald-100 text-emerald-700" },
  };
  const r = map[role];
  return <Badge className={r.className}>{r.label}</Badge>;
}

function StatusBadge({ status }: { status: Status }) {
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

function canViewUser(viewerRole?: Role, targetRole?: Role) {
  if (!viewerRole || !targetRole) return false;
  if (viewerRole === "super_admin") return targetRole === "admin" || targetRole === "acad_head";
  if (viewerRole === "admin") return targetRole === "acad_head";
  return false;
}

function visibleRoleOptionsFor(viewerRole?: Role): { value: Role | "all"; label: string }[] {
  if (viewerRole === "super_admin") {
    return [
      { value: "all", label: "All Roles" },
      { value: "admin", label: "Admin" },
      { value: "acad_head", label: "Academic Head" },
    ];
  }
  if (viewerRole === "admin") {
    return [
      { value: "all", label: "All Roles" },
      { value: "acad_head", label: "Academic Head" },
    ];
  }
  return [{ value: "all", label: "All Roles" }];
}

const Users: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const isAdmin = user?.role === "admin";
  const canAddUsers = isSuperAdmin || isAdmin;
  const canViewPage = isSuperAdmin || isAdmin;

  const { toast } = useToast();

  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");

  const [openAdd, setOpenAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    role: (isAdmin ? "acad_head" : "admin") as Role, // super_admin → admin, admin → acad_head
    status: "active" as Status,
    password: "",
  });

  async function fetchUsers() {
    try {
      setLoading(true);
      const res = await apiService.getUsers();
      const data = Array.isArray(res) ? res : res?.data ?? [];
      setRows(data as UserRow[]);
    } catch (err: any) {
      toast({
        title: "Failed to load users",
        description: err?.message || "Please check your connection or backend.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const qlc = q.trim().toLowerCase();
    return rows.filter((u) => {
      if (!canViewUser(user?.role as Role | undefined, u.role)) return false;
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (!qlc) return true;
      return (
        u.username.toLowerCase().includes(qlc) ||
        (u.email || "").toLowerCase().includes(qlc) ||
        (u.name || "").toLowerCase().includes(qlc)
      );
    });
  }, [q, roleFilter, statusFilter, rows, user?.role]);

  async function handleCreateSubmit(e?: React.FormEvent) {
    e?.preventDefault();

    if (!canAddUsers) {
      toast({
        title: "Not allowed",
        description: "Only Super Admins or Admins can add users.",
        variant: "destructive",
      });
      return;
    }

    if (isAdmin && form.role !== "acad_head") {
      toast({
        title: "Role restricted",
        description: "Admins can only create Academic Head accounts.",
        variant: "destructive",
      });
      return;
    }

    if (isSuperAdmin && !["admin", "acad_head"].includes(form.role)) {
      toast({
        title: "Role restricted",
        description: "Super Admins can create Admin or Academic Head accounts only.",
        variant: "destructive",
      });
      return;
    }

    if (!form.username.trim() || !form.email.trim()) {
      toast({
        title: "Missing fields",
        description: "Username and Email are required.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      const payload: Parameters<typeof apiService.createUser>[0] = {
        ...(form.name.trim() ? { name: form.name.trim() } : {}),
        username: form.username.trim(),
        email: form.email.trim(),
        role: form.role as "admin" | "acad_head",
        status: form.status as "active" | "inactive",
        password: form.password ? form.password : undefined,
      };

      const res = await apiService.createUser(payload);
      const ok =
        res?.success === true ||
        res?.status === "ok" ||
        res?.status === "success" ||
        res?.message?.toLowerCase?.().includes?.("created");

      if (!ok) throw new Error(res?.message || "Create failed");

      toast({
        title: "User created",
        description:
          form.role === "admin"
            ? "Admin account has been added."
            : "Academic Head account has been added.",
      });

      setOpenAdd(false);
      setForm({
        name: "",
        username: "",
        email: "",
        role: isAdmin ? "acad_head" : "admin",
        status: "active",
        password: "",
      });
      fetchUsers();
    } catch (err: any) {
      toast({
        title: "Create failed",
        description: err?.response?.data?.message || err?.message || "Please verify inputs and try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  if (!canViewPage) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">User Management</h1>
        <p className="text-sm text-muted-foreground">You don’t have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <User2 className="h-6 w-6" /> User Management
          </h1>
          <p className="text-sm text-muted-foreground">Create, edit, and manage user access.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchUsers} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Refresh
          </Button>
          {canAddUsers && (
            <Button
              onClick={() => {
                setForm((f) => ({
                  ...f,
                  role: isAdmin ? ("acad_head" as Role) : ("admin" as Role),
                }));
                setOpenAdd(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          )}
        </div>
      </div>

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
              <Button variant="secondary" disabled>
                Apply
              </Button>
            </div>

            <div className="flex gap-2">
              <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as Role | "all")}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  {visibleRoleOptionsFor(user?.role as Role | undefined).map((r) => (
                    <SelectItem key={r.value} value={r.value as any}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Status | "all")}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value as any}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
                {loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading users…
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  filtered.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <User2 className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                      <TableCell className="font-medium">{u.name || "—"}</TableCell>
                      <TableCell>{u.username}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <RoleBadge role={u.role} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={u.status} />
                      </TableCell>
                      <TableCell>
                        {u.last_login ? new Date(u.last_login).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Actions">
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

      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>
              Super Admins can create <span className="font-medium">Admin</span> or{" "}
              <span className="font-medium">Academic Head</span> accounts. Admins can create{" "}
              <span className="font-medium">Academic Head</span> only.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit}>
            <div className="grid gap-3 py-2">
              <div className="grid gap-1">
                <Label htmlFor="name">Full Name (optional)</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div className="grid gap-1">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  required
                />
              </div>

              <div className="grid gap-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>

              <div className="grid gap-1">
                <Label>Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm((f) => ({ ...f, role: v as Role }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {isSuperAdmin && <SelectItem value="admin">Admin</SelectItem>}
                    <SelectItem value="acad_head">Academic Head</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as Status }))}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1">
                <Label htmlFor="password">Password (optional)</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenAdd(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !canAddUsers}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Users;
