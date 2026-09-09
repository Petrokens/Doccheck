import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '@/services/authService';
import { publicApiError } from '@/lib/uploadSafety';
import { toast } from 'sonner';
import { Loader2, LockKeyhole } from 'lucide-react';
import AuthLayout from './AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const AUTH_INPUT =
  'h-11 bg-[#f4f7fb] text-slate-900 placeholder:text-slate-400 dark:bg-[#f4f7fb] dark:text-slate-900 dark:placeholder:text-slate-400';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = useMemo(() => params.get('token') || '', [params]);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  return (
    <AuthLayout>
      <div className="w-full">
        <h1 className="font-heading text-[1.65rem] font-semibold tracking-wide text-foreground">Reset password</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Use 12+ characters with upper, lower, number, and symbol.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!token) {
              toast.error('Reset link is missing or invalid.');
              return;
            }
            if (password !== confirm) {
              toast.error('Passwords do not match.');
              return;
            }
            setLoading(true);
            try {
              await resetPassword(token, password);
              toast.success('Password updated. Sign in with the new password.');
              navigate('/login', { replace: true });
            } catch (err) {
              toast.error(publicApiError(err, 'Reset failed'));
            } finally {
              setLoading(false);
            }
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="new-password" className="text-slate-700">
              New password
            </Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="new-password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                className={`${AUTH_INPUT} pl-10`}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password" className="text-slate-700">
              Confirm password
            </Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="confirm-password"
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm password"
                className={`${AUTH_INPUT} pl-10`}
              />
            </div>
          </div>
          <Button type="submit" disabled={loading} size="lg" className="h-11 w-full text-[15px] font-semibold">
            {loading ? <Loader2 className="animate-spin" /> : 'Update password'}
          </Button>
          <Button asChild variant="link" className="h-auto w-full px-0 text-slate-600">
            <Link to="/login">Back to login</Link>
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}
