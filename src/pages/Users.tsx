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
  X as XIcon,
  Pencil,
  RefreshCw,
  Power,
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

  // --- Add dialog state
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

  // --- Edit dialog state
  const [openEdit, setOpenEdit] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "acad_head" as Role,
    status: "active" as Status,
  });

  // --- Inline feedback (within dialogs)
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [editFeedback, setEditFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  // Per-row action spinners
  const [rowBusy, setRowBusy] = useState<Record<string | number, boolean>>({});

  // Helpers to reset add-form/dialog
  function defaultRoleForCreator(): Role {
    return isAdmin ? "acad_head" : "admin";
  }
  function resetForm() {
    setForm({
      name: "",
      username: "",
      email: "",
      role: defaultRoleForCreator(),
      status: "active",
      password: "",
    });
    setFeedback(null);
    setSaving(false);
  }
  function handleCancelAdd() {
    resetForm();
    setOpenAdd(false);
  }

  // Setup edit dialog with user values
  function openEditDialog(u: UserRow) {
    setEditTarget(u);
    setEditForm({
      name: u.name || "",
      email: u.email || "",
      role: (u.role === "admin" || u.role === "acad_head" ? u.role : "acad_head") as Role,
      status: u.status,
    });
    setEditFeedback(null);
    setOpenEdit(true);
  }
  function resetEdit() {
    setEditTarget(null);
    setEditForm({ name: "", email: "", role: "acad_head", status: "active" });
    setEditFeedback(null);
    setEditSaving(false);
  }

  // Auto-dismiss feedback after 6s (if dialog stays open)
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 6000);
    return () => clearTimeout(t);
  }, [feedback]);
  useEffect(() => {
    if (!editFeedback) return;
    const t = setTimeout(() => setEditFeedback(null), 6000);
    return () => clearTimeout(t);
  }, [editFeedback]);

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

  function showSuccess(text: string) {
    setFeedback({ kind: "success", text });
  }
  function showError(text: string) {
    setFeedback({ kind: "error", text });
  }
  function showEditSuccess(text: string) {
    setEditFeedback({ kind: "success", text });
  }
  function showEditError(text: string) {
    setEditFeedback({ kind: "error", text });
  }

  function formatBackendError(err: any): string {
    const msg =
      err?.response?.data?.message ||
      err?.message ||
      "Please verify inputs and try again.";

    const eu = err?.response?.data?.existing_user;
    if (eu && typeof eu === "object") {
      const parts: string[] = [];
      if (eu.username) parts.push(String(eu.username));
      if (eu.role) parts.push(`(${String(eu.role)})`);
      const who = parts.length ? parts.join(" ") : "";
      const email = eu.email ? ` – ${String(eu.email)}` : "";
      const id = eu.id ? ` • ID ${String(eu.id)}` : "";
      return `${msg}. Existing: ${who}${email}${id}`;
    }
    return msg;
  }

  // ------- Create user -------
  async function handleCreateSubmit(e?: React.FormEvent) {
    e?.preventDefault();

    if (!canAddUsers) {
      showError("Only Super Admins or Admins can add users.");
      return;
    }
    if (isAdmin && form.role !== "acad_head") {
      showError("Admins can only create Academic Head accounts.");
      return;
    }
    if (isSuperAdmin && !["admin", "acad_head"].includes(form.role)) {
      showError("Super Admins can create Admin or Academic Head accounts only.");
      return;
    }

    const username = form.username.trim();
    const email = form.email.trim();
    if (!username || !email) {
      showError("Username and Email are required.");
      return;
    }

    // Client-side guard: username must be globally unique (case-insensitive)
    const usernameTaken = rows.some(
      (u) => String(u.username).toLowerCase() === username.toLowerCase()
    );
    if (usernameTaken) {
      showError("Username already exists. Please choose another one.");
      return;
    }

    try {
      setSaving(true);

      const payload: Parameters<typeof apiService.createUser>[0] = {
        ...(form.name.trim() ? { name: form.name.trim() } : {}),
        username,
        email,
        role: form.role as "admin" | "acad_head",
        status: form.status as "active" | "inactive",
        password: form.password ? form.password : undefined,
      };

      // If you want upsert behavior on duplicate email, pass { upsert: true } as the 2nd arg.
      const res = await apiService.createUser(payload /* , { upsert: true } */);

      const created =
        res?.success === true ||
        res?.status === "ok" ||
        res?.status === "success" ||
        res?.message?.toLowerCase?.().includes?.("created") ||
        res?.message?.toLowerCase?.().includes?.("upserted");

      if (!created) {
        throw Object.assign(new Error(res?.message || "Create failed"), { response: { data: res } });
      }

      showSuccess(
        form.role === "admin"
          ? "Admin account has been added."
          : "Academic Head account has been added."
      );

      // Close the dialog after a short delay so the success message is visible
      setTimeout(() => {
        setOpenAdd(false);
        resetForm();
        fetchUsers();
      }, 1200);
    } catch (err: any) {
      showError(formatBackendError(err));
    } finally {
      setSaving(false);
    }
  }

  // ------- Edit user -------
  async function handleEditSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!editTarget) return;

    // Allow only super_admin to change to "admin", and admin can keep/assign only "acad_head"
    if (isAdmin && editForm.role !== "acad_head") {
      showEditError("Admins can only assign Academic Head role.");
      return;
    }
    if (isSuperAdmin && !["admin", "acad_head"].includes(editForm.role)) {
      showEditError("Super Admins can assign Admin or Academic Head only.");
      return;
    }

    const email = editForm.email.trim();
    if (!email) {
      showEditError("Email is required.");
      return;
    }

    try {
      setEditSaving(true);
      const payload = {
        ...(editForm.name.trim() ? { name: editForm.name.trim() } : { name: "" }),
        email,
        role: editForm.role as "admin" | "acad_head",
        status: editForm.status as "active" | "inactive",
      };
      // Assumes backend supports PUT /users.php?id=ID
      const res = await apiService.makeRequest(
        "PUT",
        `/users.php?id=${editTarget.id}`,
        payload
      );

      const ok =
        res?.success === true ||
        res?.status === "ok" ||
        res?.status === "success" ||
        res?.message?.toLowerCase?.().includes?.("updated");

      if (!ok) {
        throw Object.assign(new Error(res?.message || "Update failed"), { response: { data: res } });
      }

      showEditSuccess("User updated.");
      setTimeout(() => {
        setOpenEdit(false);
        resetEdit();
        fetchUsers();
      }, 900);
    } catch (err: any) {
      showEditError(formatBackendError(err));
    } finally {
      setEditSaving(false);
    }
  }

  // ------- Toggle Active/Inactive -------
  async function handleToggleStatus(u: UserRow) {
    const nextStatus: Status = u.status === "active" ? "inactive" : "active";
    setRowBusy((m) => ({ ...m, [u.id]: true }));
    try {
      const res = await apiService.makeRequest(
        "PUT",
        `/users.php?id=${u.id}`,
        { status: nextStatus }
      );
      const ok =
        res?.success === true ||
        res?.status === "ok" ||
        res?.status === "success" ||
        res?.message?.toLowerCase?.().includes?.("updated");
      if (!ok) {
        throw Object.assign(new Error(res?.message || "Status change failed"), { response: { data: res } });
      }
      toast({ title: "Status updated", description: `${u.username} is now ${nextStatus}.` });
      fetchUsers();
    } catch (err: any) {
      toast({
        title: "Failed to update status",
        description: formatBackendError(err),
        variant: "destructive",
      });
    } finally {
      setRowBusy((m) => ({ ...m, [u.id]: false }));
    }
  }

  // ------- Reset Password -------
  async function handleResetPassword(u: UserRow) {
    if (!window.confirm(`Reset password for ${u.username}? They will receive a new temporary password by email.`)) {
      return;
    }
    setRowBusy((m) => ({ ...m, [u.id]: true }));
    try {
      // Assumes backend supports PUT /users.php?id=ID with { reset_password: true }
      const res = await apiService.makeRequest(
        "PUT",
        `/users.php?id=${u.id}`,
        { reset_password: true }
      );
      const ok =
        res?.success === true ||
        res?.status === "ok" ||
        res?.status === "success" ||
        res?.message?.toLowerCase?.().includes?.("reset");
      if (!ok) {
        throw Object.assign(new Error(res?.message || "Password reset failed"), { response: { data: res } });
      }
      toast({ title: "Password reset", description: `A temporary password has been emailed to ${u.email}.` });
    } catch (err: any) {
      toast({
        title: "Failed to reset password",
        description: formatBackendError(err),
        variant: "destructive",
      });
    } finally {
      setRowBusy((m) => ({ ...m, [u.id]: false }));
    }
  }

  // Reset add-form whenever dialog closes; set default role when it opens
  useEffect(() => {
    if (!openAdd) {
      resetForm();
    } else {
      setForm((f) => ({ ...f, role: defaultRoleForCreator() }));
      setFeedback(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openAdd, isAdmin]);

  // Reset edit dialog when it closes
  useEffect(() => {
    if (!openEdit) {
      resetEdit();
    }
  }, [openEdit]);

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
                  filtered.map((u) => {
                    const busy = !!rowBusy[u.id];
                    return (
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
                              <Button variant="ghost" size="icon" aria-label="Actions" disabled={busy}>
                                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onSelect={() => openEditDialog(u)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleResetPassword(u)}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => handleToggleStatus(u)}>
                                <Power className="h-4 w-4 mr-2" />
                                {u.status === "active" ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog
        open={openAdd}
        onOpenChange={(v) => {
          setOpenAdd(v);
          if (!v) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>
              Super Admins can create <span className="font-medium">Admin</span> or{" "}
              <span className="font-medium">Academic Head</span> accounts. Admins can create{" "}
              <span className="font-medium">Academic Head</span> only.
            </DialogDescription>
          </DialogHeader>

          {/* Inline alert inside Add dialog */}
          {feedback && (
            <Alert
              className={`mb-3 ${feedback.kind === "success" ? "border-emerald-300" : "border-red-300"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  {feedback.kind === "success" ? (
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 mt-0.5 text-red-600" />
                  )}
                  <div>
                    <AlertTitle className="capitalize">{feedback.kind}</AlertTitle>
                    <AlertDescription>{feedback.text}</AlertDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFeedback(null)}
                  aria-label="Dismiss"
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            </Alert>
          )}

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
              <Button type="button" variant="outline" onClick={handleCancelAdd} disabled={saving}>
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

      {/* Edit Dialog */}
      <Dialog
        open={openEdit}
        onOpenChange={(v) => {
          setOpenEdit(v);
          if (!v) resetEdit();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update basic information and access level for this account.
            </DialogDescription>
          </DialogHeader>

          {/* Inline alert inside Edit dialog */}
          {editFeedback && (
            <Alert
              className={`mb-3 ${editFeedback.kind === "success" ? "border-emerald-300" : "border-red-300"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  {editFeedback.kind === "success" ? (
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 mt-0.5 text-red-600" />
                  )}
                  <div>
                    <AlertTitle className="capitalize">{editFeedback.kind}</AlertTitle>
                    <AlertDescription>{editFeedback.text}</AlertDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditFeedback(null)}
                  aria-label="Dismiss"
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            </Alert>
          )}

          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-3 py-2">
              <div className="grid gap-1">
                <Label htmlFor="edit-name">Full Name (optional)</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div className="grid gap-1">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>

              <div className="grid gap-1">
                <Label>Role</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, role: v as Role }))}
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
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, status: v as Status }))}
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenEdit(false)} disabled={editSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={editSaving}>
                {editSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Users;
