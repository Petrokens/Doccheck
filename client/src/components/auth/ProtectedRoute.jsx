import { Navigate, useLocation } from 'react-router-dom';
import { useSessionAuth } from '@/context/SessionAuthContext';

export function ProtectedRoute({ children }) {
  const { ready, authenticated } = useSessionAuth();
  const location = useLocation();
  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-[#475569]">Checking your session…</div>;
  }
  if (!authenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

export function PublicAuthRoute({ children }) {
  const { ready, authenticated } = useSessionAuth();
  if (!ready) return children;
  if (authenticated) return <Navigate to="/dashboard/qa-qc/process" replace />;
  return children;
}
