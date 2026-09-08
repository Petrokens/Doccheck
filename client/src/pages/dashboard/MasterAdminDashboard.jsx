import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import ConfirmDialog from '@/components/Common/ConfirmDialog';
import { useSessionAuth } from '@/context/SessionAuthContext';
import { publicApiError } from '@/lib/uploadSafety';
import {
  createUser,
  deleteUser,
  listRoles,
  listUsers,
  updateUser,
} from '@/services/adminService';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
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
  const [editUser, setEditUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([listUsers(), listRoles()])
      .then(([nextUsers, nextRoles]) => {
        setUsers(nextUsers);
        setRoles(nextRoles);
      })
      .catch((err) => toast.error(publicApiError(err, 'Unable to load Master Admin')))
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

  const openCreate = () => {
    const roleId = roles.some((role) => Number(role.id) === 2) ? '2' : String(roles[0]?.id || '2');
    setForm({ ...EMPTY_USER_FORM, role_id: roleId });
    setFormOpen(true);
  };

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Administration · Master</p>
          <h1 className="mt-1 font-heading text-2xl font-semibold">Master Admin</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Create accounts, assign roles, and remove users. Sidebar menus are assigned by role in Access Control.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={load}>
            <RefreshCw /> Refresh
          </Button>
          <Button type="button" size="sm" onClick={openCreate} disabled={loading}>
            <Plus /> Add user
          </Button>
        </div>
      </div>

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
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditUser(item);
                          setEditName(item.username);
                        }}
                      >
                        <Pencil /> Edit
                      </Button>
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
                    </div>
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

      <Dialog open={Boolean(editUser)} onOpenChange={(open) => { if (!editSaving && !open) setEditUser(null); }}>
        <DialogContent>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (!editUser) return;
              setEditSaving(true);
              try {
                const updated = await updateUser(editUser.user_id, { username: editName.trim() });
                setUsers((prev) => prev.map((item) => (item.user_id === editUser.user_id ? { ...item, ...updated } : item)));
                setEditUser(null);
                toast.success('User updated');
              } catch (err) {
                toast.error(publicApiError(err, 'Could not update user'));
              } finally {
                setEditSaving(false);
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>Edit user</DialogTitle>
              <DialogDescription>{editUser?.email}</DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-1.5">
              <Label htmlFor="edit-user-name">Name</Label>
              <Input id="edit-user-name" required value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <DialogFooter className="mt-5">
              <Button type="button" variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button type="submit" disabled={editSaving || !editName.trim()}>{editSaving ? 'Saving…' : 'Save'}</Button>
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
