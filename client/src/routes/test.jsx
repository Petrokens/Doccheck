// src/routes/AppRoutes.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Layout
import DashboardLayout from '@/components/layout/DashboardLayout';

// Public Pages
import LoginPage from '../feature/auth/pages/Login';
import ForgotPasswordPage from '../feature/auth/pages/ForgotPassword';
import CreateUserPage from '../feature/admin/pages/CreateUser';

// Dashboard Pages
import Process from '@/pages/dashboard/Process';
import Piping from '@/pages/dashboard/Piping';
import Civil from '@/pages/dashboard/CivilStructural';
import Mechanical from '@/pages/dashboard/Mechanical';
import Electrical from '@/pages/dashboard/Electrical';
import Instrumentation from '@/pages/dashboard/Instrumentation';
import HSE from '@/pages/dashboard/HSE';
import General from '@/pages/dashboard/GeneralDeliverables';
import Projects from '@/pages/dashboard/Projects';
import History from '@/pages/dashboard/History';
import Profile from '@/pages/dashboard/Profile';
import Settings from '@/pages/dashboard/Settings';
import ForgotPasswordDash from '@/pages/dashboard/ForgotPassword';
import CreateUserDash from '@/pages/dashboard/CreateUser';

const isAuthenticated = () => {
  return !!localStorage.getItem('accessToken');
};

const ProtectedRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/" replace />;
};

export default function AppRoutes() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/admin/create-user" element={<CreateUserPage />} />

        {/* Protected Dashboard with Layout */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* Disciplines */}
          <Route path="process" element={<Process />} />
          <Route path="piping" element={<Piping />} />
          <Route path="civil" element={<Civil />} />
          <Route path="mechanical" element={<Mechanical />} />
          <Route path="electrical" element={<Electrical />} />
          <Route path="instrumentation" element={<Instrumentation />} />
          <Route path="hse" element={<HSE />} />
          <Route path="general" element={<General />} />
          <Route path="projects" element={<Projects />} />

          {/* Others */}
          <Route path="history" element={<History />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
          <Route path="forgot-password" element={<ForgotPasswordDash />} />
          <Route path="create-user" element={<CreateUserDash />} />
        </Route>
      </Routes>
    </Router>
  );
}
