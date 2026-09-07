import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '@/services/authService';
import { useSessionAuth } from '@/context/SessionAuthContext';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import icon from '@/assets/icon.png';

export default function LoginForm() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { markLoggedIn } = useSessionAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await loginUser(form);
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
    <div className="mx-auto w-full max-w-[460px]">
      <img src={icon} alt="App icon" className="mx-auto h-[140px] w-[140px] object-contain" />
      <h2 className="mt-3 text-center text-[38px] font-semibold text-[#0f172a]">Welcome Back!</h2>
      <p className="mt-1 text-center text-sm text-[#6b7280]">Sign in to continue to QA/QC</p>
      <div className="mx-auto mt-2 h-[3px] w-[56px] rounded-full bg-[#6a73ff]" />
      <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
        <label className="mb-1.5 block text-[13px] font-medium">Email Address</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a0a6b4]" />
          <input name="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Enter your email" className="h-11 w-full rounded-[10px] bg-[#eef2fb] pl-10 pr-4 text-[13px] outline-none" />
        </div>
        <label className="mb-1.5 block text-[13px] font-medium">Password</label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a0a6b4]" />
          <input name="password" type={showPassword ? 'text' : 'password'} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Enter your password" className="h-11 w-full rounded-[10px] bg-[#eef2fb] pl-10 pr-10 text-[13px] outline-none" />
          <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a0a6b4]">
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <button type="submit" disabled={loading} className="flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-[#0B4D99] text-sm font-semibold text-white">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
