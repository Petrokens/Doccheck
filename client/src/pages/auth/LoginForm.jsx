import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser } from '@/services/authService';
import { useSessionAuth } from '@/context/SessionAuthContext';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import logoMark from '@/assets/petrolenz-favicon.png';

const SAVED_LOGIN_KEY = 'petrolenz.savedLogin';

function readSavedLogin() {
  try {
    const raw = localStorage.getItem(SAVED_LOGIN_KEY);
    if (!raw) return { email: '', password: '', savePassword: false };
    const parsed = JSON.parse(raw);
    return {
      email: parsed.email || '',
      password: parsed.password || '',
      savePassword: true,
    };
  } catch {
    return { email: '', password: '', savePassword: false };
  }
}

export default function LoginForm() {
  const saved = readSavedLogin();
  const [form, setForm] = useState({ email: saved.email, password: saved.password });
  const [savePassword, setSavePassword] = useState(saved.savePassword);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { markLoggedIn } = useSessionAuth();

  useEffect(() => {
    if (!savePassword) localStorage.removeItem(SAVED_LOGIN_KEY);
  }, [savePassword]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await loginUser(form);
      if (savePassword) {
        localStorage.setItem(SAVED_LOGIN_KEY, JSON.stringify(form));
      } else {
        localStorage.removeItem(SAVED_LOGIN_KEY);
      }
      markLoggedIn(data.accessToken);
      toast.success('Login successful!');
      navigate('/dashboard/qa-qc/process');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-center gap-2">
        <img src={logoMark} alt="" className="h-10 w-10 object-contain" />
        <span
          className="text-[26px] font-bold tracking-[0.06em] text-[#1c2434]"
          style={{ fontFamily: 'Merriweather, Georgia, serif' }}
        >
          PETROLENZ
        </span>
      </div>

      <h1 className="mt-4 text-center text-[28px] font-bold leading-none text-[#111827]">Login</h1>
      <p className="mt-1.5 text-center text-[13px] text-[#8b95a7]">AI QC Checker for Engineering Documents</p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium text-[#374151]">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="username"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Enter your email"
            className="h-11 w-full rounded-xl bg-[#eef2f7] px-4 text-[14px] text-[#111827] outline-none ring-0 transition placeholder:text-[#9aa3b5] focus:bg-[#e8eef8] focus:ring-2 focus:ring-[#4A86F7]/35"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-[13px] font-medium text-[#374151]">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Enter your password"
              className="h-11 w-full rounded-xl bg-[#eef2f7] px-4 pr-11 text-[14px] text-[#111827] outline-none transition placeholder:text-[#9aa3b5] focus:bg-[#e8eef8] focus:ring-2 focus:ring-[#4A86F7]/35"
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa3b5] hover:text-[#64748b]"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-0.5">
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#6b7280]">
            <input
              type="checkbox"
              checked={savePassword}
              onChange={(e) => setSavePassword(e.target.checked)}
              className="h-4 w-4 rounded border-[#c5cdd8] accent-[#4A86F7]"
            />
            Save Password
          </label>
          <Link to="/forgot-password" className="text-[13px] font-medium text-[#4A86F7] hover:underline">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#4A86F7] text-[15px] font-semibold text-white shadow-[0_8px_18px_rgba(74,134,247,0.35)] transition hover:bg-[#3b78ea] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Login'}
        </button>
      </form>

      <p className="mt-5 text-center text-[11px] text-[#9aa3b5]">© 2026 Petrolenz. All rights reserved.</p>
    </div>
  );
}
