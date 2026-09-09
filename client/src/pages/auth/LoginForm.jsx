import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser, resendLoginOtp, verifyLoginOtp } from '@/services/authService';
import { useSessionAuth } from '@/context/SessionAuthContext';
import { publicApiError } from '@/lib/uploadSafety';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const REMEMBER_EMAIL_KEY = 'doccheck.rememberEmail';
const AUTH_INPUT = 'h-11 bg-[#f4f7fb] text-slate-900 placeholder:text-slate-400 dark:bg-[#f4f7fb] dark:text-slate-900 dark:placeholder:text-slate-400';

function readRememberedEmail() {
  try {
    localStorage.removeItem('petrolenz.savedLogin');
    localStorage.removeItem('petrolenz.rememberEmail');
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
  const [otpStep, setOtpStep] = useState(null);
  const [otp, setOtp] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const navigate = useNavigate();
  const { markLoggedIn } = useSessionAuth();

  useEffect(() => {
    if (!rememberEmail) localStorage.removeItem(REMEMBER_EMAIL_KEY);
  }, [rememberEmail]);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const finishLogin = async (accessToken) => {
    if (rememberEmail) localStorage.setItem(REMEMBER_EMAIL_KEY, form.email.trim());
    else localStorage.removeItem(REMEMBER_EMAIL_KEY);
    await markLoggedIn(accessToken);
    toast.success('Login successful!');
    navigate('/dashboard');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await loginUser(form);
      if (data.requiresOtp && data.challengeId) {
        setOtpStep({
          challengeId: data.challengeId,
          emailMasked: data.emailMasked || form.email,
        });
        setOtp('');
        setResendIn(60);
        toast.success('Verification code sent to your email');
        return;
      }
      if (data.accessToken) await finishLogin(data.accessToken);
    } catch (err) {
      toast.error(publicApiError(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otpStep?.challengeId) return;
    setLoading(true);
    try {
      const data = await verifyLoginOtp({ challengeId: otpStep.challengeId, otp });
      await finishLogin(data.accessToken);
    } catch (err) {
      toast.error(publicApiError(err, 'Invalid verification code'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!otpStep?.challengeId || resendIn > 0) return;
    setLoading(true);
    try {
      const data = await resendLoginOtp({ challengeId: otpStep.challengeId });
      setOtpStep({
        challengeId: data.challengeId,
        emailMasked: data.emailMasked || otpStep.emailMasked,
      });
      setOtp('');
      setResendIn(60);
      toast.success('A new code was sent');
    } catch (err) {
      toast.error(publicApiError(err, 'Could not resend code'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <h1 className="font-heading text-[1.65rem] font-semibold tracking-wide text-foreground">
        {otpStep ? 'Verify login' : 'Sign in'}
      </h1>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {otpStep
          ? `Enter the 6-digit code sent to ${otpStep.emailMasked}`
          : 'Access your QA/QC workspace with your work email.'}
      </p>

      {otpStep ? (
        <form onSubmit={handleVerify} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="otp" className="text-slate-700">
              Email verification code
            </Label>
            <Input
              id="otp"
              name="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className={`${AUTH_INPUT} tracking-[0.4em] text-center text-lg`}
            />
          </div>
          <Button type="submit" disabled={loading || otp.length !== 6} size="lg" className="mt-1 h-11 w-full text-[15px] font-semibold">
            {loading ? <Loader2 className="animate-spin" /> : 'Verify and continue'}
          </Button>
          <div className="flex items-center justify-between pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
              onClick={() => {
                setOtpStep(null);
                setOtp('');
              }}
            >
              <ArrowLeft /> Back
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              disabled={loading || resendIn > 0}
              onClick={handleResend}
            >
              {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
            </Button>
          </div>
        </form>
      ) : (
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

          <div className="flex items-center justify-between pt-0.5">
            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-600">
              <Checkbox
                checked={rememberEmail}
                onCheckedChange={(checked) => setRememberEmail(Boolean(checked))}
              />
              Remember email
            </label>
            <Link to="/forgot-password" className="text-[13px] font-medium text-primary hover:underline">
              Forgot password?
            </Link>
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
      )}
    </div>
  );
}
