import { useState, useEffect } from 'react';
import ForgotPassword from '@/feature/auth/components/ForgotPassword';
import { Moon, Sun } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark';
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    document.documentElement.classList.toggle('dark', newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center px-4 bg-[#f8faff] dark:bg-[#1e1f3b] transition-colors duration-300 relative">
      
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="absolute top-5 right-5 bg-gray-800 text-white dark:bg-white dark:text-gray-900 rounded-full p-2 shadow hover:scale-105 transition"
        title="Toggle Theme"
      >
        {darkMode ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Forgot Password Form */}
      <ForgotPassword />
    </div>
  );
}
