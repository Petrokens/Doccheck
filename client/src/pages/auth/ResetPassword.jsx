import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '@/services/authService';
import { publicApiError } from '@/lib/uploadSafety';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import AuthLayout from './AuthLayout';
import logoMark from '@/assets/petrolenz-favicon.png';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
      <Card className="w-full max-w-[420px] py-7 shadow-xl">
        <CardContent className="px-8 sm:px-9">
          <div className="flex items-center justify-center gap-2">
            <img src={logoMark} alt="" className="h-10 w-10 object-contain" />
            <span className="text-[26px] font-bold tracking-[0.06em] text-foreground" style={{ fontFamily: 'Merriweather, Georgia, serif' }}>
              PETROLENZ
            </span>
          </div>
          <h1 className="mt-4 text-center font-heading text-[28px] font-bold leading-none">Reset password</h1>
          <p className="mt-1.5 text-center text-[13px] text-muted-foreground">Use 12+ characters with upper, lower, number, and symbol.</p>
          <form
            className="mt-7 space-y-4"
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
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
