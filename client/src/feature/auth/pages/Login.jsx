import { useState, useEffect } from 'react';
import LoginForm from '../components/LoginForm';
import { Moon, Sun } from 'lucide-react';
import backgroundImg from '../../../assets/login.jpeg'; // background image

export default function LoginPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);

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
    <div className="w-full min-h-screen relative flex items-center justify-center px-4 transition-colors duration-300 overflow-hidden">
      {/* Background Image with blur */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center filter blur-sm brightness-75 dark:brightness-50"
        style={{
          backgroundImage: `url(${backgroundImg})`,
        }}
      />

      {/* Optional overlay tint */}
      <div className="absolute inset-0 bg-white/20 dark:bg-[#1e1f3b]/30 backdrop-blur-sm z-0" />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <span className="text-white text-lg">Loading...</span>
        </div>
      )}

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-5 right-5 bg-[#4E8CFB] text-white dark:bg-white dark:text-[#4E8CFB] p-2 rounded-full shadow-md hover:scale-105 transition z-20"
        title="Toggle Theme"
      >
        {darkMode ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Login Form */}
      <div className="relative z-20">
        <LoginForm loading={loading} setLoading={setLoading} />
      </div>
    </div>
  );
}
516














