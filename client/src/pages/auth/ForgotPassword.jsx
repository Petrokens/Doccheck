import { useState } from 'react';
import { sendForgotPasswordEmail } from '@/services/authService';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import AuthLayout from './AuthLayout';
import logoMark from '@/assets/petrolenz-favicon.png';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <AuthLayout>
      <div className="w-full max-w-[420px] rounded-[28px] bg-white px-8 py-7 shadow-[0_28px_80px_rgba(15,23,42,0.22)] sm:px-9 sm:py-8">
        <div className="flex items-center justify-center gap-2">
          <img src={logoMark} alt="" className="h-10 w-10 object-contain" />
          <span
            className="text-[26px] font-bold tracking-[0.06em] text-[#1c2434]"
            style={{ fontFamily: 'Merriweather, Georgia, serif' }}
          >
            PETROLENZ
          </span>
        </div>
        <h1 className="mt-4 text-center text-[28px] font-bold leading-none text-[#111827]">Forgot password</h1>
        <p className="mt-1.5 text-center text-[13px] text-[#8b95a7]">We will send a reset link if that email is registered.</p>
        <form
          className="mt-7 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            try {
              await sendForgotPasswordEmail(email);
              toast.success('If that email is registered, a reset link was sent.');
            } catch (err) {
              toast.error(err?.response?.data?.error || err.message);
            } finally {
              setLoading(false);
            }
          }}
        >
          <div>
            <label htmlFor="reset-email" className="mb-1.5 block text-[13px] font-medium text-[#374151]">
              Email
            </label>
            <input
              id="reset-email"
              className="h-11 w-full rounded-xl bg-[#eef2f7] px-4 text-[14px] text-[#111827] outline-none transition placeholder:text-[#9aa3b5] focus:bg-[#e8eef8] focus:ring-2 focus:ring-[#4A86F7]/35"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#4A86F7] text-[15px] font-semibold text-white shadow-[0_8px_18px_rgba(74,134,247,0.35)] transition hover:bg-[#3b78ea] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send reset link'}
          </button>
          <Link to="/login" className="block text-center text-[13px] font-medium text-[#4A86F7] hover:underline">
            Back to login
          </Link>
        </form>
      </div>
    </AuthLayout>
  );
}
