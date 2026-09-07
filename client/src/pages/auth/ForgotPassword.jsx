import { useState } from 'react';
import { sendForgotPasswordEmail } from '@/services/authService';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f5fb] p-6">
      <form
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await sendForgotPasswordEmail(email);
            toast.success('If that email is registered, a reset link was sent.');
          } catch (err) {
            toast.error(err?.response?.data?.error || err.message);
          }
        }}
      >
        <h1 className="text-xl font-semibold text-[#0B4D99]">Forgot password</h1>
        <input className="mt-4 w-full rounded-lg border px-3 py-2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <button type="submit" className="mt-4 w-full rounded-lg bg-[#0B4D99] py-2 text-white">Send reset link</button>
        <Link to="/login" className="mt-3 block text-center text-sm text-[#0B4D99]">Back to login</Link>
      </form>
    </div>
  );
}
