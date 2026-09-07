import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { jwtDecode } from 'jwt-decode';
import { refreshAccessToken, logoutUser as apiLogout } from '@/services/authService';
import { clearAccessToken, setAccessToken } from '@/lib/axios';

function isAccessTokenValid(token) {
  if (!token || typeof token !== 'string') return false;
  try {
    const { exp } = jwtDecode(token);
    return Boolean(exp) && exp * 1000 > Date.now() + 5000;
  } catch {
    return false;
  }
}

const SessionAuthContext = createContext(null);

export function SessionAuthProvider({ children }) {
  const [ready, setReady] = useState(() => {
    const token = localStorage.getItem('accessToken');
    if (isAccessTokenValid(token)) {
      setAccessToken(token);
      return true;
    }
    return false;
  });
  const [authenticated, setAuthenticated] = useState(() =>
    isAccessTokenValid(localStorage.getItem('accessToken')),
  );
  const bootRef = useRef(0);

  const restoreSession = useCallback(async () => {
    const stored = localStorage.getItem('accessToken');
    if (isAccessTokenValid(stored)) {
      setAccessToken(stored);
      setAuthenticated(true);
      return true;
    }
    try {
      const token = await refreshAccessToken();
      setAccessToken(token);
      setAuthenticated(true);
      return true;
    } catch {
      localStorage.removeItem('accessToken');
      clearAccessToken();
      setAuthenticated(false);
      return false;
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      setReady(true);
      return;
    }
    const gen = ++bootRef.current;
    restoreSession().finally(() => {
      if (gen === bootRef.current) setReady(true);
    });
  }, [authenticated, restoreSession]);

  const markLoggedIn = useCallback((token) => {
    setAccessToken(token);
    setAuthenticated(true);
    setReady(true);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setAuthenticated(false);
  }, []);

  const value = useMemo(
    () => ({ ready, authenticated, markLoggedIn, logout }),
    [ready, authenticated, markLoggedIn, logout],
  );

  return <SessionAuthContext.Provider value={value}>{children}</SessionAuthContext.Provider>;
}

export function useSessionAuth() {
  const ctx = useContext(SessionAuthContext);
  if (!ctx) throw new Error('useSessionAuth must be used within SessionAuthProvider');
  return ctx;
}
