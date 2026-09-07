import { getThemeMode, setThemeMode } from '@/lib/theme';
import { useState } from 'react';

export default function Settings() {
  const [mode, setMode] = useState(getThemeMode());
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[#0B4D99] dark:text-white">Settings</h1>
      <div className="mt-4 max-w-lg rounded-2xl border border-[#c4d2f0] bg-white p-5 dark:border-dash-border dark:bg-dash-surface">
        <label className="text-sm font-medium">Theme</label>
        <select
          value={mode}
          onChange={(e) => {
            setMode(e.target.value);
            setThemeMode(e.target.value);
          }}
          className="mt-2 w-full rounded-lg border border-[#c4d2f0] bg-white px-3 py-2 dark:border-dash-border dark:bg-dash-surface-elevated dark:text-white"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
      </div>
    </div>
  );
}
