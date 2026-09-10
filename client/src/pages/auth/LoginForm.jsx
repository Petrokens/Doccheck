import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, resendLoginOtp, verifyLoginOtp } from '@/services/authService';
import { useSessionAuth } from '@/context/SessionAuthContext';
import { publicApiError } from '@/lib/uploadSafety';
import { toast } from 'sonner';
import { ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
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
  const [otp, setOtp] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [step, setStep] = useState('credentials');
  const [rememberEmail, setRememberEmail] = useState(Boolean(remembered));
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const busyRef = useRef(false);
  const navigate = useNavigate();
  const { markLoggedIn } = useSessionAuth();

  useEffect(() => {
    if (!rememberEmail) localStorage.removeItem(REMEMBER_EMAIL_KEY);
  }, [rememberEmail]);

  const finishLogin = async (accessToken) => {
    if (rememberEmail) localStorage.setItem(REMEMBER_EMAIL_KEY, form.email.trim());
    else localStorage.removeItem(REMEMBER_EMAIL_KEY);
    await markLoggedIn(accessToken);
    toast.success('Login successful!');
    navigate('/dashboard');
  };

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true;
    setLoading(true);
    try {
      const data = await loginUser(form);

      // OTP policy: password step must return a challenge (never skip UI when requiresOtp).
      if (data?.requiresOtp || data?.challengeId) {
        if (!data.challengeId) {
          toast.error('Login challenge missing. Try again.');
          return;
        }
        setChallengeId(data.challengeId);
        setOtp('');
        setStep('otp');
        toast.success(data.message || 'Verification code sent to your email.');
        return;
      }

      // Only allowed when server has AUTH_SKIP_OTP=true
      if (data?.accessToken) {
        await finishLogin(data.accessToken);
        return;
      }

      toast.error('Unexpected login response.');
    } catch (err) {
      toast.error(publicApiError(err, 'Login failed'));
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true;
    setLoading(true);
    try {
      const data = await verifyLoginOtp({ challengeId, otp });
      if (data.accessToken) await finishLogin(data.accessToken);
      else toast.error('Unexpected verification response.');
    } catch (err) {
      toast.error(publicApiError(err, 'Verification failed'));
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (busyRef.current || !challengeId) return;
    busyRef.current = true;
    setLoading(true);
    try {
      const data = await resendLoginOtp({ challengeId });
      if (data.challengeId) setChallengeId(data.challengeId);
      setOtp('');
      toast.success(data.message || 'A new code was sent.');
    } catch (err) {
      toast.error(publicApiError(err, 'Could not resend code'));
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  };

  if (step === 'otp') {
    return (
      <div className="w-full">
        <h1 className="font-heading text-[1.65rem] font-semibold tracking-wide text-foreground">
          Enter code
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          We emailed a 6-digit code to <span className="font-medium text-foreground">{form.email.trim()}</span>.
        </p>

        <form onSubmit={handleOtpSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="otp" className="text-slate-700">
              Verification code
            </Label>
            <div className="relative">
              <ShieldCheck className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="otp"
                name="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit code"
                className={`${AUTH_INPUT} tracking-[0.28em] pl-10`}
              />
            </div>
          </div>

          <Button type="submit" disabled={loading || otp.length !== 6} size="lg" className="mt-1 h-11 w-full text-[15px] font-semibold">
            {loading ? <Loader2 className="animate-spin" /> : (
              <>
                Verify &amp; continue
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>

          <div className="flex items-center justify-between gap-3 pt-1 text-[13px]">
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setStep('credentials');
                setChallengeId('');
                setOtp('');
              }}
              className="text-slate-600 underline-offset-2 hover:underline"
            >
              Back
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleResend}
              className="font-medium text-[#0f3d3e] underline-offset-2 hover:underline"
            >
              Resend code
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h1 className="font-heading text-[1.65rem] font-semibold tracking-wide text-foreground">
        Sign in
      </h1>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        Access your QA/QC workspace with your work email.
      </p>

      <form onSubmit={handleCredentialsSubmit} className="mt-6 space-y-4">
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
              Continue
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
