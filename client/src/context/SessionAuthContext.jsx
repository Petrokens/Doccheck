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
import { getUserProfile, refreshAccessToken, logoutUser as apiLogout } from '@/services/authService';
import { clearAccessToken, getAccessToken, setAccessToken } from '@/lib/axios';

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
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const bootRef = useRef(0);

  const loadProfile = useCallback(async () => {
    try {
      const profile = await getUserProfile();
      setUser(profile);
      return profile;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  const restoreSession = useCallback(async () => {
    const current = getAccessToken();
    if (isAccessTokenValid(current)) {
      setAuthenticated(true);
      await loadProfile();
      return true;
    }
    try {
      const token = await refreshAccessToken();
      setAccessToken(token);
      setAuthenticated(true);
      await loadProfile();
      return true;
    } catch {
      clearAccessToken();
      setUser(null);
      setAuthenticated(false);
      return false;
    }
  }, [loadProfile]);

  useEffect(() => {
    const gen = ++bootRef.current;
    restoreSession().finally(() => {
      if (gen === bootRef.current) setReady(true);
    });
  }, [restoreSession]);

  const markLoggedIn = useCallback(async (token) => {
    setAccessToken(token);
    setAuthenticated(true);
    setReady(true);
    await loadProfile();
  }, [loadProfile]);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setAuthenticated(false);
  }, []);

  const value = useMemo(
    () => ({ ready, authenticated, user, markLoggedIn, logout }),
    [ready, authenticated, user, markLoggedIn, logout],
  );

  return <SessionAuthContext.Provider value={value}>{children}</SessionAuthContext.Provider>;
}

export function useSessionAuth() {
  const ctx = useContext(SessionAuthContext);
  if (!ctx) throw new Error('useSessionAuth must be used within SessionAuthProvider');
  return ctx;
}
