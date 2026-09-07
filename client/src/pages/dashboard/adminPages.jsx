import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { KeyRound, Plus, RefreshCw, Save, Search, Shield, Trash2 } from 'lucide-react';
import ConfirmDialog from '@/components/Common/ConfirmDialog';
import { useSessionAuth } from '@/context/SessionAuthContext';
import { MAIN_PERMISSIONS, MAIN_ROLES, MAIN_USERS } from '@/lib/dashboardPaths';
import { publicApiError } from '@/lib/uploadSafety';
import {
  createRole,
  createUser,
  deleteUser,
  getRolePermissions,
  listPermissions,
  listRoles,
  listUsers,
  setRolePermissions,
  updateRole,
  updateUser,
} from '@/services/adminService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function formatWhen(value) {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function roleLabel(roles, id) {
  return roles.find((role) => Number(role.id) === Number(id))?.name || `Role ${id}`;
}

function AdminHeader({ eyebrow, title, body, actions }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{eyebrow}</p>
        <h1 className="mt-1 font-heading text-2xl font-semibold">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{body}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

const EMPTY_USER_FORM = { username: '', email: '', password: '', role_id: '2' };

export function UserManagement() {
  const { user: sessionUser } = useSessionAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_USER_FORM);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([listUsers(), listRoles()])
      .then(([nextUsers, nextRoles]) => {
        setUsers(nextUsers);
        setRoles(nextRoles);
      })
      .catch((err) => toast.error(publicApiError(err, 'Unable to load users')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((item) =>
      [item.username, item.email, roleLabel(roles, item.role_id)]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [users, roles, query]);

  const stats = useMemo(() => ({
    total: users.length,
    masters: users.filter((item) => Number(item.role_id) === 1).length,
    active: users.filter((item) => item.last_login_at).length,
  }), [users]);

  const submitUser = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await createUser(form);
      setForm(EMPTY_USER_FORM);
      setFormOpen(false);
      toast.success('User created');
      load();
    } catch (err) {
      toast.error(publicApiError(err, 'Could not create user'));
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (userId, roleId) => {
    try {
      const updated = await updateUser(userId, { role_id: Number(roleId) });
      setUsers((prev) => prev.map((item) => (item.user_id === userId ? { ...item, ...updated } : item)));
      toast.success('Role updated');
    } catch (err) {
      toast.error(publicApiError(err, 'Could not update role'));
    }
  };

  return (
    <div className="space-y-5 p-4 md:p-6">
      <AdminHeader
        eyebrow="Administration · Accounts"
        title="User Management"
        body="Create accounts, assign roles, and remove users. You cannot delete your own account or the last Master."
        actions={(
          <>
            <Button type="button" variant="outline" size="sm" onClick={load}>
              <RefreshCw /> Refresh
            </Button>
            <Button type="button" size="sm" onClick={() => setFormOpen(true)}>
              <Plus /> Add user
            </Button>
          </>
        )}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['Accounts', stats.total],
          ['Master users', stats.masters],
          ['Have logged in', stats.active],
        ].map(([label, value]) => (
          <Card key={label} size="sm">
            <CardHeader>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
              <CardTitle className="text-3xl">{loading ? '—' : value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden py-0">
        <CardHeader className="border-b py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, or role"
              className="pl-8"
            />
          </div>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Last login</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Loading users…</TableCell></TableRow>
            ) : filtered.length ? filtered.map((item) => {
              const isSelf = item.user_id === sessionUser?.user_id;
              return (
                <TableRow key={item.user_id}>
                  <TableCell>
                    <p className="font-medium">{item.username}</p>
                    <p className="text-xs text-muted-foreground">{item.email}</p>
                  </TableCell>
                  <TableCell>
                    <Select value={String(item.role_id)} onValueChange={(value) => changeRole(item.user_id, value)}>
                      <SelectTrigger className="h-7 w-[140px]" size="sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={String(role.id)}>{role.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatWhen(item.last_login_at)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatWhen(item.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isSelf}
                      className="text-destructive"
                      onClick={() => setPendingId(item.user_id)}
                    >
                      <Trash2 /> {isSelf ? 'You' : 'Delete'}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            }) : (
              <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No users match this search.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={formOpen} onOpenChange={(open) => { if (!saving) setFormOpen(open); }}>
        <DialogContent>
          <form onSubmit={submitUser}>
            <DialogHeader>
              <DialogTitle>Add user</DialogTitle>
              <DialogDescription>Password must be 12+ characters with upper, lower, number, and symbol.</DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="user-name">Name</Label>
                <Input id="user-name" required value={form.username} onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="user-email">Email</Label>
                <Input id="user-email" required type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="user-password">Password</Label>
                <Input id="user-password" required type="password" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="user-role">Role</Label>
                <Select value={form.role_id} onValueChange={(value) => setForm((prev) => ({ ...prev, role_id: value }))}>
                  <SelectTrigger id="user-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={String(role.id)}>{role.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-5">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingId)}
        title="Delete user?"
        message="This permanently removes the account. This cannot be undone."
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        loading={deleting}
        onClose={() => !deleting && setPendingId('')}
        onConfirm={async () => {
          setDeleting(true);
          try {
            await deleteUser(pendingId);
            setUsers((prev) => prev.filter((item) => item.user_id !== pendingId));
            setPendingId('');
            toast.success('User deleted');
          } catch (err) {
            toast.error(publicApiError(err, 'Delete failed'));
          } finally {
            setDeleting(false);
          }
        }}
      />
    </div>
  );
}

export function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [editingName, setEditingName] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([listRoles(), listUsers()])
      .then(([nextRoles, nextUsers]) => {
        setRoles(nextRoles);
        setUsers(nextUsers);
      })
      .catch((err) => toast.error(publicApiError(err, 'Unable to load roles')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(() => {
    const map = new Map();
    users.forEach((item) => map.set(Number(item.role_id), (map.get(Number(item.role_id)) || 0) + 1));
    return map;
  }, [users]);

  const submit = async (event) => {
    event.preventDefault();
    const next = name.trim();
    if (!next) return;
    setSaving(true);
    try {
      const role = await createRole(next);
      setRoles((prev) => [...prev, role].sort((a, b) => a.id - b.id));
      setName('');
      toast.success('Role created');
    } catch (err) {
      toast.error(publicApiError(err, 'Could not create role'));
    } finally {
      setSaving(false);
    }
  };

  const saveRename = async (id) => {
    try {
      const role = await updateRole(id, editingName.trim());
      setRoles((prev) => prev.map((item) => (item.id === role.id ? role : item)));
      setEditingId('');
      toast.success('Role renamed');
    } catch (err) {
      toast.error(publicApiError(err, 'Could not rename role'));
    }
  };

  return (
    <div className="space-y-5 p-4 md:p-6">
      <AdminHeader
        eyebrow="Administration · Access"
        title="Role Management"
        body="Roles group permissions. Assign people from User Management, then edit what each role can do in Access Control."
        actions={(
          <Button asChild size="sm">
            <Link to={MAIN_PERMISSIONS}>
              <Shield /> Access Control
            </Link>
          </Button>
        )}
      />

      <form onSubmit={submit} className="flex flex-wrap gap-2 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New role name"
          className="min-w-[200px] flex-1"
        />
        <Button type="submit" disabled={saving || !name.trim()}>
          <Plus /> {saving ? 'Creating…' : 'Create role'}
        </Button>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading roles…</p>
        ) : roles.map((role) => (
          <Card key={role.id}>
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <Badge variant={String(role.name).toLowerCase() === 'master' ? 'default' : 'secondary'}>{role.name}</Badge>
                <CardDescription className="mt-2">Role ID {role.id}</CardDescription>
              </div>
              <p className="text-right text-sm text-muted-foreground">
                <span className="block text-2xl font-bold text-foreground">{counts.get(Number(role.id)) || 0}</span>
                assigned users
              </p>
            </CardHeader>
            <CardContent>
              {editingId === role.id ? (
                <div className="flex gap-2">
                  <Input value={editingName} onChange={(e) => setEditingName(e.target.value)} />
                  <Button type="button" size="sm" onClick={() => saveRename(role.id)}>Save</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditingId('')}>Cancel</Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => { setEditingId(role.id); setEditingName(role.name); }}>Rename</Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`${MAIN_PERMISSIONS}?role=${role.id}`}>Edit permissions</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to={MAIN_USERS}>View users</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function AccessControl() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [roleId, setRoleId] = useState('');
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('role');
    Promise.all([listRoles(), listPermissions()])
      .then(([nextRoles, nextPermissions]) => {
        setRoles(nextRoles);
        setPermissions(nextPermissions);
        setRoleId(fromQuery || String(nextRoles[0]?.id || '1'));
      })
      .catch((err) => toast.error(publicApiError(err, 'Unable to load access control')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!roleId) return;
    getRolePermissions(roleId).then(setSelected).catch(() => setSelected([]));
  }, [roleId]);

  const grouped = useMemo(() => {
    const map = new Map();
    permissions.forEach((item) => {
      const group = String(item.key || '').split('.')[0] || 'other';
      if (!map.has(group)) map.set(group, []);
      map.get(group).push(item);
    });
    return [...map.entries()];
  }, [permissions]);

  const save = async () => {
    setSaving(true);
    try {
      await setRolePermissions(roleId, selected);
      toast.success('Permissions saved');
    } catch (err) {
      toast.error(publicApiError(err, 'Could not save permissions'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 p-4 md:p-6">
      <AdminHeader
        eyebrow="Administration · Access"
        title="Access Control"
        body="Choose a role and grant catalog permissions. Master should keep user, role, and permission management."
        actions={(
          <Button asChild variant="outline" size="sm">
            <Link to={MAIN_ROLES}>
              <KeyRound /> Roles
            </Link>
          </Button>
        )}
      />

      <div className="flex flex-wrap gap-2">
        {roles.map((role) => (
          <Button
            key={role.id}
            type="button"
            size="sm"
            variant={String(role.id) === String(roleId) ? 'default' : 'outline'}
            onClick={() => setRoleId(String(role.id))}
          >
            {role.name}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <CardDescription>
            {selected.length} of {permissions.length} permissions assigned
          </CardDescription>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setSelected(permissions.map((item) => item.id))}>Select all</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setSelected([])}>Clear</Button>
            <Button type="button" size="sm" onClick={save} disabled={saving || loading}>
              <Save /> {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading permissions…</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {grouped.map(([group, items]) => (
                <Card key={group} size="sm" className="bg-muted/40">
                  <CardHeader>
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{group}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {items.map((item) => (
                      <label key={item.id} className="flex items-start gap-2 text-sm">
                        <Checkbox
                          checked={selected.includes(item.id)}
                          onCheckedChange={() => setSelected((prev) => (prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]))}
                          className="mt-1"
                        />
                        <span>
                          <span className="font-medium">{item.name}</span>
                          <span className="block text-xs text-muted-foreground">{item.description || item.key}</span>
                        </span>
                      </label>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function AuditLog() {
  return (
    <div className="space-y-6 p-6">
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Audit Log</CardTitle>
          <CardDescription>
            Login events are stored on each user record (last login). Report history is the QA/QC audit trail.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

export function EnvSettings() {
  return (
    <div className="space-y-6 p-6">
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Environment Config</CardTitle>
          <CardDescription>
            API keys and database URLs are configured in server/.env — they are not editable from the browser.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
