/**
 * SALUS Sync — App Router
 *
 * Route structure:
 *   /              → SplashPage (auto-redirects)
 *   /login         → LoginPage
 *   /dashboard/*   → AppShell (protected)
 *     /home        → DashboardPage
 *     /health      → HealthDataPage
 *     /sync        → SyncPage
 *     /settings    → SettingsPage
 */

import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';
import { AppConfigProvider } from './context/AppConfigContext';

import { AppShell } from './components/common/AppShell';

import { SplashPage }     from './pages/Splash/SplashPage';
import { LoginPage }      from './pages/Login/LoginPage';
import { DashboardPage }  from './pages/Dashboard/DashboardPage';
import { HealthDataPage } from './pages/HealthData/HealthDataPage';
import { SyncPage }       from './pages/Sync/SyncPage';
import { SettingsPage }   from './pages/Settings/SettingsPage';

import './styles/global.css';

/** Redirects unauthenticated users to /login */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isReady } = useAuth();

  // Wait for auth state to be rehydrated from storage
  if (!isReady) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

/** Redirects already-authenticated users away from login */
function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isReady } = useAuth();

  if (!isReady) return null;

  if (isAuthenticated) {
    return <Navigate to="/dashboard/home" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Splash — auto-redirects based on auth */}
      <Route path="/"      element={<SplashPage />} />

      {/* Login — redirect if already authenticated */}
      <Route
        path="/login"
        element={
          <AuthRedirect>
            <LoginPage />
          </AuthRedirect>
        }
      />

      {/* Protected dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index           element={<Navigate to="home" replace />} />
        <Route path="home"     element={<DashboardPage />} />
        <Route path="health"   element={<HealthDataPage />} />
        <Route path="sync"     element={<SyncPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppConfigProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </AppConfigProvider>
    </BrowserRouter>
  );
}
