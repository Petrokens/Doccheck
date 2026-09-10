import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '@/services/authService';
import { useSessionAuth } from '@/context/SessionAuthContext';
import { publicApiError } from '@/lib/uploadSafety';
import { toast } from 'sonner';
import { ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const REMEMBER_EMAIL_KEY = 'doccheck.rememberEmail';
const AUTH_INPUT = 'h-11 bg-[#f4f7fb] text-slate-900 placeholder:text-slate-400 dark:bg-[#f4f7fb] dark:text-slate-900 dark:placeholder:text-slate-400';

function readRememberedEmail() {
  try {
    localStorage.removeItem('docucheck.rememberEmail');
    return localStorage.getItem(REMEMBER_EMAIL_KEY) || '';
  } catch {
    return '';
  }
}

export default function LoginForm() {
  const remembered = readRememberedEmail();
  const [form, setForm] = useState({ email: remembered, password: '' });
  const [rememberEmail, setRememberEmail] = useState(Boolean(remembered));
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const busyRef = useRef(false);
  const navigate = useNavigate();
  const { markLoggedIn } = useSessionAuth();

  useEffect(() => {
    if (!rememberEmail) localStorage.removeItem(REMEMBER_EMAIL_KEY);
  }, [rememberEmail]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true;
    setLoading(true);
    try {
      const data = await loginUser(form);
      if (data.accessToken) {
        if (rememberEmail) localStorage.setItem(REMEMBER_EMAIL_KEY, form.email.trim());
        else localStorage.removeItem(REMEMBER_EMAIL_KEY);
        await markLoggedIn(data.accessToken);
        toast.success('Login successful!');
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(publicApiError(err, 'Login failed'));
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <h1 className="font-heading text-[1.65rem] font-semibold tracking-wide text-foreground">
        Sign in
      </h1>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        Access your QA/QC workspace with your work email.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-slate-700">
            Email
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="nina.v@example.com"
              className={`${AUTH_INPUT} pl-10`}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-slate-700">
            Password
          </Label>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Enter your password"
              className={`${AUTH_INPUT} pr-11 pl-10`}
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-slate-700"
            >
              {showPassword ? <EyeOff className="size-4 shrink-0" /> : <Eye className="size-4 shrink-0" />}
            </button>
          </div>
        </div>

        <div className="flex items-center pt-0.5">
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-600">
            <Checkbox
              checked={rememberEmail}
              onCheckedChange={(checked) => setRememberEmail(Boolean(checked))}
            />
            Remember email
          </label>
        </div>

        <Button type="submit" disabled={loading} size="lg" className="mt-1 h-11 w-full text-[15px] font-semibold">
          {loading ? <Loader2 className="animate-spin" /> : (
            <>
              Sign in
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
