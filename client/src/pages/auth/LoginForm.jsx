import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser, resendLoginOtp, verifyLoginOtp } from '@/services/authService';
import { useSessionAuth } from '@/context/SessionAuthContext';
import { publicApiError } from '@/lib/uploadSafety';
import { toast } from 'sonner';
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import logoMark from '@/assets/icon.png';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const REMEMBER_EMAIL_KEY = 'petrolenz.rememberEmail';

function readRememberedEmail() {
  try {
    localStorage.removeItem('petrolenz.savedLogin');
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
      <div className="flex items-center gap-3">
        <img src={logoMark} alt="Petrolenz" className="h-16 w-16 shrink-0 rounded-xl object-contain" />
        <div>
          <p className="font-heading text-2xl font-bold tracking-[0.08em] text-foreground">PETROLENZ</p>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            QA / QC Platform
          </p>
        </div>
      </div>

      <h1 className="mt-10 font-heading text-3xl font-semibold tracking-wide text-foreground">
        {otpStep ? 'Verify login' : 'Sign in'}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {otpStep
          ? `Enter the 6-digit code sent to ${otpStep.emailMasked}`
          : 'AI QC Checker for Engineering Documents'}
      </p>

      {otpStep ? (
        <form onSubmit={handleVerify} className="mt-8 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="otp">Email verification code</Label>
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
              className="h-11 bg-muted tracking-[0.4em] text-center text-lg"
            />
          </div>
          <Button type="submit" disabled={loading || otp.length !== 6} size="lg" className="mt-1 h-11 w-full">
            {loading ? <Loader2 className="animate-spin" /> : 'Verify and continue'}
          </Button>
          <div className="flex items-center justify-between pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="px-0 text-muted-foreground"
              onClick={() => {
                setOtpStep(null);
                setOtp('');
              }}
            >
              <ArrowLeft /> Back
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={loading || resendIn > 0} onClick={handleResend}>
              {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Enter your email"
              className="h-11 bg-muted"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Enter your password"
                className="h-11 bg-muted pr-11"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4 shrink-0" /> : <Eye className="size-4 shrink-0" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-muted-foreground">
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

          <Button type="submit" disabled={loading} size="lg" className="mt-1 h-11 w-full">
            {loading ? <Loader2 className="animate-spin" /> : 'Continue'}
          </Button>
        </form>
      )}

      <p className="mt-10 text-[11px] text-muted-foreground">© 2026 Petrolenz. All rights reserved.</p>
    </div>
  );
}
