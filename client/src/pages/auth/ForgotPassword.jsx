import { useState } from 'react';
import { sendForgotPasswordEmail } from '@/services/authService';
import { publicApiError } from '@/lib/uploadSafety';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import AuthLayout from './AuthLayout';
import logoMark from '@/assets/logo.png';
import { BRAND_COPYRIGHT, BRAND_NAME, BRAND_TAGLINE } from '@/lib/brandCopy';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <AuthLayout>
      <div className="w-full">
        <div className="flex items-center gap-3">
          <img
            src={logoMark}
            alt={BRAND_NAME}
            className="h-24 w-24 shrink-0 rounded-xl bg-white object-contain p-0.5 shadow-sm"
          />
          <div>
            <p className="font-heading text-2xl font-bold tracking-[0.04em] text-foreground">{BRAND_NAME}</p>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {BRAND_TAGLINE}
            </p>
          </div>
        </div>

        <h1 className="mt-10 font-heading text-3xl font-semibold tracking-wide">Forgot password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We will send a reset link if that email is registered.
        </p>

        <form
          className="mt-8 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            try {
              await sendForgotPasswordEmail(email);
              toast.success('If that email is registered, a reset link was sent.');
            } catch (err) {
              toast.error(publicApiError(err, 'Unable to send reset email'));
            } finally {
              setLoading(false);
            }
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              className="h-11 bg-muted"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>
          <Button type="submit" disabled={loading} size="lg" className="h-11 w-full">
            {loading ? <Loader2 className="animate-spin" /> : 'Send reset link'}
          </Button>
          <Button asChild variant="link" className="w-full">
            <Link to="/login">Back to login</Link>
          </Button>
        </form>

        <p className="mt-10 text-[11px] text-muted-foreground">{BRAND_COPYRIGHT}</p>
      </div>
    </AuthLayout>
  );
}
