import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { logoutUser, getUserProfile } from '@/services/authService';

export default function Topbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState(null);
  const menuRef = useRef();

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

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const decoded = jwtDecode(token);
        const userId = decoded.user_id;
        if (!userId) return;

        const userData = await getUserProfile(userId);
        setUser(userData);
      } catch (err) {
        console.error('Failed to decode token or fetch user profile:', err);
      }
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    navigate('/');
  };

  const handleOutsideClick = (e) => {
    if (menuRef.current && !menuRef.current.contains(e.target)) {
      setMenuOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-[#F2F6FF] dark:bg-[#1a1a2e] shadow border-b border-[#DCEBFF] dark:border-[#2a2b4f]">
      {/* Logo */}
      <div className="flex items-center space-x-3">
        <h1 className="text-xl font-bold text-[#0B4D99] dark:text-blue-400">
          PetroLenz
        </h1>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-4">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="text-sm px-3 py-1 rounded-full bg-[#E6EFFF] hover:bg-[#DCEBFF] dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 transition"
        >
          {darkMode ? '🌙 Dark' : '☀️ Light'}
        </button>

        {/* User Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center space-x-2 px-4 py-1 rounded-full bg-[#4E8CFB] text-sm text-white hover:opacity-90 transition"
          >
            <span>{user ? user.username : 'Loading...'}</span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-[#F2F6FF] dark:bg-[#1e1f3b] border border-[#DCEBFF] dark:border-[#2a2b4f] rounded-xl shadow-lg z-50">
              <button
                onClick={() => {
                  navigate('/dashboard/profile');
                  setMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-[#1a1a1a] dark:text-gray-100 hover:bg-[#E6EFFF] dark:hover:bg-[#2a2b4f] transition"
              >
                Profile
              </button>
              <button
                onClick={() => {
                  navigate('/dashboard/settings');
                  setMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-[#1a1a1a] dark:text-gray-100 hover:bg-[#E6EFFF] dark:hover:bg-[#2a2b4f] transition"
              >
                Settings
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 transition"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
