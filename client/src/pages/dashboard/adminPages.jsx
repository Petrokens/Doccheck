import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { KeyRound, Plus, Save, Shield } from 'lucide-react';
import { MAIN_PERMISSIONS, MAIN_ROLES, MAIN_USERS } from '@/lib/dashboardPaths';
import { publicApiError } from '@/lib/uploadSafety';
import { useSessionAuth } from '@/context/SessionAuthContext';
import { useSidebarAccess } from '@/context/SidebarAccessContext';
import {
  createRole,
  getRolePermissions,
  getRoleSidebar,
  listPermissions,
  listRoles,
  listSidebarCatalog,
  listUsers,
  setRolePermissions,
  setRoleSidebar,
  updateRole,
} from '@/services/adminService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export { UserManagement } from '@/pages/dashboard/MasterAdminDashboard';

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

function visibleCatalog(catalog, roleId) {
  const isMaster = Number(roleId) === 1;
  return catalog
    .map((section) => ({
      ...section,
      items: (section.items || []).filter((item) => isMaster || !item.admin),
    }))
    .filter((section) => section.items.length);
}

function SidebarItemPicker({ catalog, roleId, selected, onChange }) {
  const isMaster = Number(roleId) === 1;
  const sections = visibleCatalog(catalog, roleId);

  const toggle = (item) => {
    if (item.admin && isMaster) return;
    const id = item.id;
    onChange(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]);
  };

  const setSection = (items, on) => {
    const ids = items.filter((item) => !(item.admin && isMaster)).map((item) => item.id);
    if (on) onChange([...new Set([...selected, ...ids])]);
    else onChange(selected.filter((id) => !ids.includes(id)));
  };

  return (
    <div className="space-y-3">
      {sections.map((section) => {
        const unlocked = section.items.filter((item) => !(item.admin && isMaster));
        const allOn = unlocked.every((item) => selected.includes(item.id));
        return (
          <div key={section.id} className="rounded-lg bg-muted/40 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{section.title}</p>
              {unlocked.length ? (
                <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setSection(section.items, !allOn)}>
                  {allOn ? 'Clear' : 'All'}
                </Button>
              ) : null}
            </div>
            <div className="space-y-2">
              {section.items.map((item) => {
                const locked = Boolean(item.admin && isMaster);
                const checked = locked || selected.includes(item.id);
                return (
                  <label key={item.id} className="flex items-start gap-2 text-sm">
                    <Checkbox
                      checked={checked}
                      disabled={locked}
                      onCheckedChange={() => toggle(item)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium">{item.label}</span>
                      {item.admin ? (
                        <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Admin</span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
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
        body="Roles group permissions. Assign people from Master Admin, then edit what each role can do in Access Control."
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
  const { user: sessionUser } = useSessionAuth();
  const { reload: reloadSidebar } = useSidebarAccess();
  const [tab, setTab] = useState('sidebar');
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [roleId, setRoleId] = useState('');
  const [selected, setSelected] = useState([]);
  const [menuIds, setMenuIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accessSaving, setAccessSaving] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('role');
    Promise.all([listRoles(), listPermissions(), listSidebarCatalog()])
      .then(([nextRoles, nextPermissions, nextCatalog]) => {
        setRoles(nextRoles);
        setPermissions(nextPermissions);
        setCatalog(nextCatalog);
        setRoleId(fromQuery || String(nextRoles[0]?.id || '1'));
        if (fromQuery) setTab('permissions');
      })
      .catch((err) => toast.error(publicApiError(err, 'Unable to load access control')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!roleId) return;
    getRolePermissions(roleId).then(setSelected).catch(() => setSelected([]));
    getRoleSidebar(roleId)
      .then((data) => setMenuIds(data.item_ids || []))
      .catch(() => setMenuIds([]));
  }, [roleId]);

  const selectedRole = roles.find((role) => String(role.id) === String(roleId));

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

  const saveAccess = async () => {
    if (!roleId) return;
    setAccessSaving(true);
    try {
      const result = await setRoleSidebar(roleId, menuIds);
      setMenuIds(result.item_ids || []);
      toast.success(`Sidebar menus saved for ${selectedRole?.name || 'role'}`);
      if (Number(sessionUser?.role_id) === Number(roleId)) await reloadSidebar();
    } catch (err) {
      toast.error(publicApiError(err, 'Could not save sidebar menus'));
    } finally {
      setAccessSaving(false);
    }
  };

  return (
    <div className="space-y-5 p-4 md:p-6">
      <AdminHeader
        eyebrow="Administration · Access"
        title="Access Control"
        body="Choose a role, then assign the sidebar menus and catalog permissions everyone in that role receives."
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

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="sidebar">Sidebar menus</TabsTrigger>
          <TabsTrigger value="permissions">Role permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="sidebar" className="mt-4">
          <Card>
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>{selectedRole?.name || 'Select a role'}</CardTitle>
                <CardDescription>
                  {Number(roleId) === 1
                    ? 'Master always keeps Administration menus. Everyone with this role sees the same sidebar.'
                    : 'Everyone with this role sees the same sidebar. Administration menus stay Master-only.'}
                </CardDescription>
              </div>
              <Button type="button" size="sm" onClick={saveAccess} disabled={!roleId || accessSaving || loading}>
                <Save /> {accessSaving ? 'Saving…' : 'Save menus'}
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading menus…</p>
              ) : roleId ? (
                <SidebarItemPicker
                  catalog={catalog}
                  roleId={roleId}
                  selected={menuIds}
                  onChange={setMenuIds}
                />
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="mt-4">
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
        </TabsContent>
      </Tabs>
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
