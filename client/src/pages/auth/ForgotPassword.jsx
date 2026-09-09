import { useState } from 'react';
import { sendForgotPasswordEmail } from '@/services/authService';
import { publicApiError } from '@/lib/uploadSafety';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Loader2, Mail } from 'lucide-react';
import AuthLayout from './AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const AUTH_INPUT =
  'h-11 bg-[#f4f7fb] text-slate-900 placeholder:text-slate-400 dark:bg-[#f4f7fb] dark:text-slate-900 dark:placeholder:text-slate-400';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <AuthLayout>
      <div className="w-full">
        <h1 className="font-heading text-[1.65rem] font-semibold tracking-wide text-foreground">Forgot password</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          We will send a reset link if that email is registered.
        </p>

        <form
          className="mt-6 space-y-4"
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
            <Label htmlFor="reset-email" className="text-slate-700">
              Email
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="reset-email"
                className={`${AUTH_INPUT} pl-10`}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nina.v@example.com"
              />
            </div>
          </div>
          <Button type="submit" disabled={loading} size="lg" className="h-11 w-full text-[15px] font-semibold">
            {loading ? <Loader2 className="animate-spin" /> : 'Send reset link'}
          </Button>
          <Button asChild variant="link" className="h-auto w-full px-0 text-slate-600">
            <Link to="/login">Back to login</Link>
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}
