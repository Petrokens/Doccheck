import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SessionAuthProvider } from '@/context/SessionAuthContext';
import { ProtectedRoute, PublicAuthRoute, RoleProtectedRoute } from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import LoginPage from '@/pages/auth/Login';
import DisciplineWorkspace from '@/pages/dashboard/DisciplineWorkspace';
import History from '@/pages/dashboard/History';
import AIReview from '@/pages/dashboard/AIReview';
import Profile from '@/pages/dashboard/Profile';
import Settings from '@/pages/dashboard/Settings';
import Info from '@/pages/dashboard/Info';
import SystemStatus from '@/pages/dashboard/SystemStatus';
import ApiDocs from '@/pages/dashboard/ApiDocs';
import AuditReports from '@/pages/dashboard/AuditReports';
import SystemLogs from '@/pages/dashboard/SystemLogs';
import Announcements from '@/pages/dashboard/Announcements';
import {
  AccessControl,
  AuditLog,
  EnvSettings,
  RoleManagement,
  UserManagement,
} from '@/pages/dashboard/adminPages';
import { DashboardHome } from '@/context/SidebarAccessContext';

function AppRoutesInner() {
  return (
    <Routes>
      <Route path="/login" element={<PublicAuthRoute><LoginPage /></PublicAuthRoute>} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardHome />} />
        <Route path="qa-qc">
          <Route index element={<DashboardHome />} />
          <Route path="process" element={<DisciplineWorkspace department="process" />} />
          <Route path="piping" element={<DisciplineWorkspace department="piping" />} />
          <Route path="pipeline" element={<DisciplineWorkspace department="pipeline" />} />
          <Route path="civil" element={<DisciplineWorkspace department="civil" />} />
          <Route path="civil-structural" element={<DisciplineWorkspace department="civil" />} />
          <Route path="mechanical" element={<DisciplineWorkspace department="mechanical" />} />
          <Route path="mechanical-rotating" element={<DisciplineWorkspace department="mechanical-rotating" />} />
          <Route path="mechanical-static" element={<DisciplineWorkspace department="mechanical-static" />} />
          <Route path="electrical" element={<DisciplineWorkspace department="electrical" />} />
          <Route path="hvac" element={<DisciplineWorkspace department="hvac" />} />
          <Route path="instrumentation" element={<DisciplineWorkspace department="instrumentation" />} />
          <Route path="telecom" element={<DisciplineWorkspace department="telecom" />} />
          <Route path="hse" element={<DisciplineWorkspace department="hse" />} />
          <Route path="general" element={<DisciplineWorkspace department="general" />} />
          <Route path="general-discipline" element={<DisciplineWorkspace department="general" />} />
          <Route path="common-document-check" element={<DisciplineWorkspace department="common" />} />
          <Route path="history" element={<History />} />
          <Route path="ai-review" element={<AIReview />} />
          <Route path="templates" element={<Navigate to="/dashboard" replace />} />
          <Route path="user-activity" element={<AuditLog />} />
        </Route>
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
        <Route path="info" element={<Info />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="system-status" element={<SystemStatus />} />
        <Route path="env-settings" element={<RoleProtectedRoute><EnvSettings /></RoleProtectedRoute>} />
        <Route path="users" element={<RoleProtectedRoute><UserManagement /></RoleProtectedRoute>} />
        <Route path="roles" element={<RoleProtectedRoute><RoleManagement /></RoleProtectedRoute>} />
        <Route path="permissions" element={<RoleProtectedRoute><AccessControl /></RoleProtectedRoute>} />
        <Route path="audit-log" element={<AuditLog />} />
        <Route path="audit-reports" element={<RoleProtectedRoute><AuditReports /></RoleProtectedRoute>} />
        <Route path="system-logs" element={<RoleProtectedRoute><SystemLogs /></RoleProtectedRoute>} />
        <Route path="api-docs" element={<RoleProtectedRoute><ApiDocs /></RoleProtectedRoute>} />
      </Route>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <SessionAuthProvider>
        <AppRoutesInner />
      </SessionAuthProvider>
    </BrowserRouter>
  );
}
