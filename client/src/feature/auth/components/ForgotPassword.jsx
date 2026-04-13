import { useState } from 'react';
import { sendForgotPasswordEmail } from '@/services/authService';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import logo from '@/assets/logo.bmp';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendForgotPasswordEmail(email);
      toast.success('Password reset link sent!');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center px-4 bg-[#f8faff] dark:bg-[#1e1f3b] transition-colors duration-300">
      <div
        className="w-full max-w-md p-8 rounded-[32px] 
        bg-[#ffffffcc] dark:bg-[#1e1f3b] 
        backdrop-blur-xl 
        shadow-[0_15px_35px_rgba(0,0,0,0.2),_0_5px_15px_rgba(0,0,0,0.1)] 
        border border-white/20 dark:border-[#2a2b4f] 
        transition-all duration-500"
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src={logo} alt="PetroLens Logo" className="h-14" />
        </div>

        {/* Heading */}
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-2">
          Forgot Password
        </h2>
        <p className="text-sm text-center text-gray-600 dark:text-gray-300 mb-6">
          We’ll email you a password reset link.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm mb-1 text-gray-700 dark:text-gray-300"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-4 py-2 rounded-full 
              bg-gray-100 dark:bg-gray-800 
              text-gray-900 dark:text-white 
              placeholder-gray-400 dark:placeholder-gray-500 
              border border-gray-300 dark:border-gray-600 
              focus:outline-none focus:ring-2 focus:ring-[#0B4D99] 
              transition-all duration-150 shadow-sm hover:shadow-md"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-full 
            text-white font-semibold flex items-center justify-center
            bg-[#0B4D99] hover:bg-[#084B98] 
            transition disabled:opacity-60"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 dark:text-gray-300 mt-6">
          © {new Date().getFullYear()}{' '}
          <span className="font-semibold text-[#0B4D99] dark:text-[#9dbdff]">
            PetroLens
          </span>. All rights reserved.
        </p>
      </div>
    </div>
  );
}
