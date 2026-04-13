import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser } from '../../../services/authService';
import { toast } from 'react-hot-toast';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import logo from '@/assets/logo.bmp';

export default function LoginForm() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [savePassword, setSavePassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loginUser(form);
      toast.success('Login successful!');
      savePassword
        ? localStorage.setItem('savedEmail', form.email)
        : localStorage.removeItem('savedEmail');
      navigate('/dashboard/process');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-100 max-w-md mx-auto"
    >
      <div className="rounded-[32px] bg-[#ffffffcc] dark:bg-[#1e1f3b] shadow-lg border border-white/30 dark:border-[#2a2b4f] p-10">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src={logo} alt="PetroLens Logo" className="h-14" />
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white">Login</h1>
        <p className="text-sm text-center text-gray-600 dark:text-gray-300 mt-2">
          AI QC Checker for Engineering Documents
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#4E8CFB] transition-all duration-150 shadow-sm hover:shadow-md"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                className="w-full px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#4E8CFB] pr-10 transition-all duration-150 shadow-sm hover:shadow-md"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 dark:text-gray-300 hover:text-black dark:hover:text-white"
                title={showPassword ? 'Hide Password' : 'Show Password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Save + Forgot */}
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                checked={savePassword}
                onChange={(e) => setSavePassword(e.target.checked)}
                className="accent-[#4E8CFB] rounded-sm"
              />
              <span>Save Password</span>
            </label>
            <Link
              to="/forgot-password"
              className="text-[#4E8CFB] dark:text-[#9dbdff] hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#4E8CFB] hover:bg-[#3b75da] transition-all text-white font-semibold py-2 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 dark:text-gray-300 mt-6">
          © {new Date().getFullYear()}{' '}
          <span className="font-semibold text-[#4E8CFB] dark:text-[#9dbdff]">PetroLens</span>. All rights reserved.
        </p>
      </div>
    </motion.div>
  );
}
