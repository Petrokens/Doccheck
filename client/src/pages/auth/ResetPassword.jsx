import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '@/services/authService';
import { publicApiError } from '@/lib/uploadSafety';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import AuthLayout from './AuthLayout';
import logoMark from '@/assets/icon.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
        <div className="flex items-center gap-3">
          <img
            src={logoMark}
            alt="Petrolenz"
            className="h-16 w-16 shrink-0 rounded-xl object-contain"
          />
          <div>
            <p className="font-heading text-2xl font-bold tracking-[0.08em] text-foreground">PETROLENZ</p>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              QA / QC Platform
            </p>
          </div>
        </div>

        <h1 className="mt-10 font-heading text-3xl font-semibold tracking-wide">Reset password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Use 12+ characters with upper, lower, number, and symbol.
        </p>

        <form
          className="mt-8 space-y-4"
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
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              className="h-11 bg-muted"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm password"
              className="h-11 bg-muted"
            />
          </div>
          <Button type="submit" disabled={loading} size="lg" className="h-11 w-full">
            {loading ? <Loader2 className="animate-spin" /> : 'Update password'}
          </Button>
          <Button asChild variant="link" className="w-full">
            <Link to="/login">Back to login</Link>
          </Button>
        </form>

        <p className="mt-10 text-[11px] text-muted-foreground">© 2026 Petrolenz. All rights reserved.</p>
      </div>
    </AuthLayout>
  );
}
