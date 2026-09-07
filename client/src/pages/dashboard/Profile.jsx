import { useEffect, useState } from 'react';
import { getUserProfile } from '@/services/authService';

export default function Profile() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    getUserProfile().then(setUser).catch(() => setUser(null));
  }, []);
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[#0B4D99]">Profile</h1>
      <div className="mt-4 max-w-lg rounded-2xl border border-[#c4d2f0] bg-white p-5 dark:border-dash-border dark:bg-dash-surface">
        <p><span className="text-[#627ab1]">Name:</span> {user?.username || '—'}</p>
        <p className="mt-2"><span className="text-[#627ab1]">Email:</span> {user?.email || '—'}</p>
        <p className="mt-2"><span className="text-[#627ab1]">Role ID:</span> {user?.role_id ?? '—'}</p>
      </div>
    </div>
  );
}
