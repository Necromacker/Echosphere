/**
 * App.jsx — Route definitions only
 *
 * No UI, no components — just routing structure.
 * Auth state comes from Zustand (authStore) via useAuth().
 *
 * Route categories:
 *  - Public      → accessible to everyone
 *  - GuestOnly   → redirect to /dashboard if already logged in
 *  - Protected   → redirect to /login if not authenticated
 *  - AdminOnly   → redirect to /dashboard if not admin
 */

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import ErrorBoundary from '@/components/admin/ErrorBoundary';
import SuspenseLoader from '@/components/admin/SuspenseLoader';

// ─── Layouts ─────────────────────────────────────────────────────
import DashboardLayout from '@/layouts/DashboardLayout';
import AdminLayout     from '@/layouts/AdminLayout';

// ─── Pages ───────────────────────────────────────────────────────
import LandingPage          from '@/pages/LandingPage';
import DashboardPage        from '@/pages/dashboard/DashboardPage';
import NewInterviewPage     from '@/pages/interview/NewInterviewPage';
import InterviewListPage    from '@/pages/interview/InterviewListPage';
import InterviewSessionPage from '@/pages/interview/InterviewSessionPage';
import SessionResultPage    from '@/pages/interview/SessionResultPage';
import SessionHistoryPage   from '@/pages/session/SessionHistoryPage';
import ResumesPage          from '@/pages/resume/ResumesPage';
import ProfilePage          from '@/pages/profile/ProfilePage';

// ─── Admin Pages ──────────────────────────────────────────────────
const AdminLoginPage       = lazy(() => import('@/pages/admin/AdminLoginPage'));
const AdminDashboardPage   = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminUsersPage       = lazy(() => import('@/pages/admin/AdminUsersPage'));
const AdminInterviewsPage  = lazy(() => import('@/pages/admin/AdminInterviewsPage'));
const AdminSessionsPage    = lazy(() => import('@/pages/admin/AdminSessionsPage'));
const AdminResumesPage     = lazy(() => import('@/pages/admin/AdminResumesPage'));
const AdminJobsPage        = lazy(() => import('@/pages/admin/AdminJobsPage'));
const AdminAtsPage         = lazy(() => import('@/pages/admin/AdminAtsPage'));
const AdminSubscriptionPage = lazy(() => import('@/pages/admin/AdminSubscriptionPage'));
const AdminPaymentsPage    = lazy(() => import('@/pages/admin/AdminPaymentsPage'));
const AdminAnalyticsPage   = lazy(() => import('@/pages/admin/AdminAnalyticsPage'));
const AdminSettingsPage    = lazy(() => import('@/pages/admin/AdminSettingsPage'));
const AdminScraperPage     = lazy(() => import('@/pages/admin/AdminScraperPage'));
const AdminPromptsPage     = lazy(() => import('@/pages/admin/AdminPromptsPage'));
const AdminLogsPage        = lazy(() => import('@/pages/admin/AdminLogsPage'));

// ─── Route Guards (Bypassed for No-Auth Mode) ────────────────────

const ProtectedRoute = ({ children }) => {
  return children;
};

const GuestRoute = ({ children }) => {
  return children;
};

const AdminRoute = ({ children }) => {
  return children;
};

const AdminPermissionRoute = ({ children }) => {
  return children;
};

const AdminGuestRoute = ({ children }) => {
  return children;
};

// ─── App ──────────────────────────────────────────────────────────
export default function App() {
  return (
    <Routes>
      {/* ── Public ──────────────────────────────── */}
      <Route path="/" element={<LandingPage />} />

      {/* ── Admin Login (guest-only for admins) ──── */}
      <Route
        path="/admin/login"
        element={
          <ErrorBoundary>
            <Suspense fallback={<SuspenseLoader />}>
              <AdminGuestRoute>
                <AdminLoginPage />
              </AdminGuestRoute>
            </Suspense>
          </ErrorBoundary>
        }
      />

      {/* ── Admin protected routes ────────────────── */}
      <Route
        element={
          <AdminRoute>
            <ErrorBoundary>
              <Suspense fallback={<SuspenseLoader />}>
                <AdminLayout />
              </Suspense>
            </ErrorBoundary>
          </AdminRoute>
        }
      >
        <Route path="/admin"             element={<AdminDashboardPage />} />
        <Route path="/admin/users"       element={<AdminUsersPage />} />
        <Route path="/admin/jobs"        element={<AdminJobsPage />} />
        <Route path="/admin/interviews"  element={<AdminInterviewsPage />} />
        <Route path="/admin/resumes"     element={<AdminResumesPage />} />
        <Route path="/admin/sessions"    element={<AdminSessionsPage />} />
        <Route path="/admin/ats"         element={<AdminAtsPage />} />
        <Route path="/admin/subscription" element={<AdminPermissionRoute permission="view:settings"><AdminSubscriptionPage /></AdminPermissionRoute>} />
        <Route path="/admin/payments"     element={<AdminPermissionRoute permission="view:payments"><AdminPaymentsPage /></AdminPermissionRoute>} />
        <Route path="/admin/analytics"    element={<AdminPermissionRoute permission="view:analytics"><AdminAnalyticsPage /></AdminPermissionRoute>} />
        <Route path="/admin/settings"     element={<AdminPermissionRoute permission="view:settings"><AdminSettingsPage /></AdminPermissionRoute>} />
        <Route path="/admin/scraper"      element={<AdminPermissionRoute permission="view:scraper"><AdminScraperPage /></AdminPermissionRoute>} />
        <Route path="/admin/prompts"      element={<AdminPermissionRoute permission="view:prompts"><AdminPromptsPage /></AdminPermissionRoute>} />
        <Route path="/admin/logs"         element={<AdminPermissionRoute permission="view:logs"><AdminLogsPage /></AdminPermissionRoute>} />
      </Route>

      {/* ── Anonymous (dashboard) ────────────────── */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard"                    element={<DashboardPage />} />
        <Route path="/interviews"                   element={<InterviewListPage />} />
        <Route path="/interviews/new"               element={<NewInterviewPage />} />
        <Route path="/interviews/:id/session"       element={<InterviewSessionPage />} />
        <Route path="/sessions/:id/results"         element={<SessionResultPage />} />
        <Route path="/sessions"                     element={<SessionHistoryPage />} />
        <Route path="/resumes"                      element={<ResumesPage />} />
        <Route path="/profile"                      element={<ProfilePage />} />
      </Route>

      {/* ── 404 fallback ─────────────────────────── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

