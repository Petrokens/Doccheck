import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
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

function formatWhen(value) {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function roleLabel(roles, id) {
  return roles.find((role) => Number(role.id) === Number(id))?.name || `Role ${id}`;
}

function roleBadge(name) {
  const key = String(name || '').toLowerCase();
  if (key === 'master') return 'bg-blue-600/15 text-blue-800 dark:bg-blue-600/25 dark:text-blue-200';
  if (key === 'engineer') return 'bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200';
  return 'bg-[#e8eef8] text-[#415e99] dark:bg-[#243044] dark:text-slate-200';
}

function AdminHeader({ eyebrow, title, body, actions }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7a8794] dark:text-slate-400">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold text-[#0f1d44] dark:text-white">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-[#5d6f9d] dark:text-dash-muted">{body}</p>
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

  useEffect(() => {
    if (!formOpen) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape' && !saving) setFormOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [formOpen, saving]);

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
            <button type="button" onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-[#c4d2f0] px-3 py-1.5 text-xs font-semibold text-[#2e4f8f] dark:border-dash-border dark:text-white">
              <RefreshCw size={13} /> Refresh
            </button>
            <button type="button" onClick={() => setFormOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B4D99] px-3 py-1.5 text-xs font-semibold text-white dark:bg-blue-600">
              <Plus size={13} /> Add user
            </button>
          </>
        )}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['Accounts', stats.total],
          ['Master users', stats.masters],
          ['Have logged in', stats.active],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[#c4d2f0] bg-white px-4 py-3 dark:border-dash-border dark:bg-dash-surface">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a8794] dark:text-slate-400">{label}</p>
            <p className="mt-1 text-3xl font-bold text-[#0f1d44] dark:text-white">{loading ? '—' : value}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#c4d2f0] bg-white dark:border-dash-border dark:bg-dash-surface">
        <div className="border-b border-[#cfd9ee] px-4 py-3 dark:border-dash-border">
          <div className="flex items-center gap-2 rounded-lg border border-[#c4d2f0] bg-[#f8fbff] px-3 py-1.5 dark:border-dash-border dark:bg-dash-surface-elevated">
            <Search size={14} className="text-[#7a8794]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, or role"
              className="w-full bg-transparent text-sm outline-none dark:text-white"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#e8eef8] text-xs uppercase tracking-wide text-[#415e99] dark:bg-[#1c2533] dark:text-slate-200">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Last login</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#5d6f9d]">Loading users…</td></tr>
              ) : filtered.length ? filtered.map((item) => {
                const isSelf = item.user_id === sessionUser?.user_id;
                return (
                  <tr key={item.user_id} className="border-t border-[#e4ebf7] odd:bg-white even:bg-[#f7faff] dark:border-[#2a3548] dark:odd:bg-[#151b27] dark:even:bg-[#1a2230]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#0f1d44] dark:text-white">{item.username}</p>
                      <p className="text-xs text-[#7a8794] dark:text-slate-400">{item.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={String(item.role_id)}
                        onChange={(e) => changeRole(item.user_id, e.target.value)}
                        className="rounded-lg border border-[#c4d2f0] bg-white px-2 py-1 text-xs dark:border-dash-border dark:bg-dash-surface-elevated dark:text-white"
                      >
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-[#5d6f9d] dark:text-slate-300">{formatWhen(item.last_login_at)}</td>
                    <td className="px-4 py-3 text-[#5d6f9d] dark:text-slate-300">{formatWhen(item.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={isSelf}
                        onClick={() => setPendingId(item.user_id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 disabled:opacity-40"
                      >
                        <Trash2 size={12} /> {isSelf ? 'You' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#5d6f9d]">No users match this search.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {formOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-black/50" onClick={() => !saving && setFormOpen(false)} />
          <form onSubmit={submitUser} className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[#c4d2f0] bg-white p-5 shadow-xl dark:border-dash-border dark:bg-dash-surface">
            <h2 className="text-lg font-semibold text-[#0c2340] dark:text-white">Add user</h2>
            <p className="mt-1 text-sm text-[#4f6490] dark:text-dash-muted">Password must be 12+ characters with upper, lower, number, and symbol.</p>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                Name
                <input required value={form.username} onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#c4d2f0] px-3 py-2 dark:border-dash-border dark:bg-dash-surface-elevated dark:text-white" />
              </label>
              <label className="block text-sm">
                Email
                <input required type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#c4d2f0] px-3 py-2 dark:border-dash-border dark:bg-dash-surface-elevated dark:text-white" />
              </label>
              <label className="block text-sm">
                Password
                <input required type="password" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#c4d2f0] px-3 py-2 dark:border-dash-border dark:bg-dash-surface-elevated dark:text-white" />
              </label>
              <label className="block text-sm">
                Role
                <select value={form.role_id} onChange={(e) => setForm((prev) => ({ ...prev, role_id: e.target.value }))} className="mt-1 w-full rounded-lg border border-[#c4d2f0] px-3 py-2 dark:border-dash-border dark:bg-dash-surface-elevated dark:text-white">
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-[#c4d2f0] px-4 py-2 text-sm dark:border-dash-border">Cancel</button>
              <button type="submit" disabled={saving} className="rounded-lg bg-[#0B4D99] px-4 py-2 text-sm text-white disabled:opacity-50">{saving ? 'Creating…' : 'Create'}</button>
            </div>
          </form>
        </div>
      ) : null}

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
          <Link to={MAIN_PERMISSIONS} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B4D99] px-3 py-1.5 text-xs font-semibold text-white dark:bg-blue-600">
            <Shield size={13} /> Access Control
          </Link>
        )}
      />

      <form onSubmit={submit} className="flex flex-wrap gap-2 rounded-2xl border border-[#c4d2f0] bg-white p-4 dark:border-dash-border dark:bg-dash-surface">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New role name"
          className="min-w-[200px] flex-1 rounded-lg border border-[#c4d2f0] px-3 py-2 text-sm dark:border-dash-border dark:bg-dash-surface-elevated dark:text-white"
        />
        <button type="submit" disabled={saving || !name.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B4D99] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          <Plus size={14} /> {saving ? 'Creating…' : 'Create role'}
        </button>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {loading ? (
          <p className="text-sm text-[#5d6f9d]">Loading roles…</p>
        ) : roles.map((role) => (
          <article key={role.id} className="rounded-2xl border border-[#c4d2f0] bg-white p-5 dark:border-dash-border dark:bg-dash-surface">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${roleBadge(role.name)}`}>{role.name}</span>
                <p className="mt-2 text-xs text-[#7a8794]">Role ID {role.id}</p>
              </div>
              <p className="text-right text-sm text-[#415e99] dark:text-slate-200">
                <span className="text-2xl font-bold text-[#0f1d44] dark:text-white">{counts.get(Number(role.id)) || 0}</span>
                <span className="block text-xs">assigned users</span>
              </p>
            </div>
            {editingId === role.id ? (
              <div className="mt-4 flex gap-2">
                <input value={editingName} onChange={(e) => setEditingName(e.target.value)} className="flex-1 rounded-lg border border-[#c4d2f0] px-3 py-2 text-sm dark:border-dash-border dark:bg-dash-surface-elevated dark:text-white" />
                <button type="button" onClick={() => saveRename(role.id)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white">Save</button>
                <button type="button" onClick={() => setEditingId('')} className="rounded-lg border px-3 py-2 text-xs dark:border-dash-border">Cancel</button>
              </div>
            ) : (
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={() => { setEditingId(role.id); setEditingName(role.name); }} className="rounded-lg border border-[#c4d2f0] px-3 py-1.5 text-xs font-semibold dark:border-dash-border dark:text-white">Rename</button>
                <Link to={`${MAIN_PERMISSIONS}?role=${role.id}`} className="rounded-lg border border-[#c4d2f0] px-3 py-1.5 text-xs font-semibold dark:border-dash-border dark:text-white">Edit permissions</Link>
                <Link to={MAIN_USERS} className="rounded-lg border border-[#c4d2f0] px-3 py-1.5 text-xs font-semibold dark:border-dash-border dark:text-white">View users</Link>
              </div>
            )}
          </article>
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
          <Link to={MAIN_ROLES} className="inline-flex items-center gap-1.5 rounded-lg border border-[#c4d2f0] px-3 py-1.5 text-xs font-semibold dark:border-dash-border dark:text-white">
            <KeyRound size={13} /> Roles
          </Link>
        )}
      />

      <div className="flex flex-wrap gap-2">
        {roles.map((role) => (
          <button
            key={role.id}
            type="button"
            onClick={() => setRoleId(String(role.id))}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
              String(role.id) === String(roleId)
                ? 'bg-[#0B4D99] text-white dark:bg-blue-600'
                : 'border border-[#c4d2f0] bg-white text-[#0B4D99] dark:border-dash-border dark:bg-dash-surface dark:text-white'
            }`}
          >
            {role.name}
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-[#c4d2f0] bg-white p-4 dark:border-dash-border dark:bg-dash-surface">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-[#5d6f9d] dark:text-dash-muted">
            {selected.length} of {permissions.length} permissions assigned
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setSelected(permissions.map((item) => item.id))} className="rounded-lg border px-3 py-1.5 text-xs dark:border-dash-border dark:text-white">Select all</button>
            <button type="button" onClick={() => setSelected([])} className="rounded-lg border px-3 py-1.5 text-xs dark:border-dash-border dark:text-white">Clear</button>
            <button type="button" onClick={save} disabled={saving || loading} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B4D99] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
              <Save size={12} /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
        {loading ? (
          <p className="text-sm text-[#5d6f9d]">Loading permissions…</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {grouped.map(([group, items]) => (
              <div key={group} className="rounded-xl border border-[#c3d1ee] bg-[#f7faff] p-4 dark:border-dash-border dark:bg-dash-surface-elevated">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#7a8794]">{group}</h2>
                <div className="mt-3 space-y-2">
                  {items.map((item) => (
                    <label key={item.id} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selected.includes(item.id)}
                        onChange={() => setSelected((prev) => (prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]))}
                        className="mt-1"
                      />
                      <span>
                        <span className="font-medium text-[#0f1d44] dark:text-white">{item.name}</span>
                        <span className="block text-xs text-[#5d6f9d] dark:text-slate-400">{item.description || item.key}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function AuditLog() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[#0B4D99] dark:text-white">Audit Log</h1>
      <p className="mt-3 text-sm text-[#4f6490]">Login events are stored on each user record (last login). Report history is the QA/QC audit trail.</p>
    </div>
  );
}

export function EnvSettings() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[#0B4D99] dark:text-white">Environment Config</h1>
      <p className="mt-3 text-sm text-[#4f6490]">API keys and database URLs are configured in server/.env — they are not editable from the browser.</p>
    </div>
  );
}
