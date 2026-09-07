import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { deleteUser, getRolePermissions, listPermissions, listRoles, listUsers, setRolePermissions } from '@/services/adminService';

export function UserManagement() {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    listUsers().then(setUsers).catch((e) => toast.error(e.message));
  }, []);
  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold text-[#0B4D99]">User Management</h1>
      <div className="overflow-x-auto rounded-2xl border border-[#c4d2f0] bg-white dark:border-dash-border dark:bg-dash-surface">
        <table className="min-w-full text-sm">
          <thead className="bg-[#e8eef8] text-left">
            <tr>
              <th className="px-4 py-2">Username</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.user_id} className="border-t">
                <td className="px-4 py-2">{u.username}</td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">{u.role_id}</td>
                <td className="px-4 py-2 text-right">
                  <button
                    type="button"
                    className="text-red-600"
                    onClick={async () => {
                      await deleteUser(u.user_id);
                      setUsers((prev) => prev.filter((x) => x.user_id !== u.user_id));
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function RoleManagement() {
  const [roles, setRoles] = useState([]);
  useEffect(() => {
    listRoles().then(setRoles).catch((e) => toast.error(e.message));
  }, []);
  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold text-[#0B4D99]">Role Management</h1>
      <ul className="space-y-2">
        {roles.map((r) => (
          <li key={r.id} className="rounded-xl border border-[#c4d2f0] bg-white px-4 py-3 dark:border-dash-border dark:bg-dash-surface">
            {r.id}. {r.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AccessControl() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [roleId, setRoleId] = useState('1');
  const [selected, setSelected] = useState([]);
  useEffect(() => {
    Promise.all([listRoles(), listPermissions()]).then(([r, p]) => {
      setRoles(r);
      setPermissions(p);
    });
  }, []);
  useEffect(() => {
    if (!roleId) return;
    getRolePermissions(roleId).then(setSelected);
  }, [roleId]);
  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold text-[#0B4D99]">Access Control</h1>
      <select value={roleId} onChange={(e) => setRoleId(e.target.value)} className="mb-4 rounded-lg border px-3 py-2">
        {roles.map((r) => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>
      <div className="space-y-2">
        {permissions.map((p) => (
          <label key={p.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(p.id)}
              onChange={() =>
                setSelected((prev) => (prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]))
              }
            />
            {p.name}
          </label>
        ))}
      </div>
      <button
        type="button"
        className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white"
        onClick={async () => {
          await setRolePermissions(roleId, selected);
          toast.success('Permissions saved');
        }}
      >
        Save
      </button>
    </div>
  );
}

export function AuditLog() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[#0B4D99]">Audit Log</h1>
      <p className="mt-3 text-sm text-[#4f6490]">Login events are stored on each user record (last login). Report history is the QA/QC audit trail.</p>
    </div>
  );
}

export function EnvSettings() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[#0B4D99]">Environment Config</h1>
      <p className="mt-3 text-sm text-[#4f6490]">API keys and database URLs are configured in server/.env — they are not editable from the browser.</p>
    </div>
  );
}
