import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import useAuthStore from './store/authStore';
import socketService from './services/socket';

// Auth Pages
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import VerifyOtp from './pages/Auth/VerifyOtp';

// User Pages
import UserDashboard from './pages/User/Dashboard';
import Notes from './pages/User/Notes';
import Quizzes from './pages/User/Quizzes';
import QuizTaking from './pages/User/QuizTaking';
import QuizResults from './pages/User/QuizResults';
import Discussions from './pages/User/Discussions';
import Assignments from './pages/User/Assignments';
import Profile from './pages/User/Profile';
import Whiteboard from './pages/User/Whiteboard';
import UserAnnouncements from './pages/User/Announcements';

// Admin Pages
import AdminDashboard from './pages/Admin/Dashboard';
import NotesManagement from './pages/Admin/NotesManagement';
import QuizBuilder from './pages/Admin/QuizBuilder';
import QuizEdit from './pages/Admin/QuizEdit';

import Analytics from './pages/Admin/Analytics';
import AttemptDetail from './pages/Admin/AttemptDetail';
import AdminDiscussions from './pages/Admin/Discussions';
import AdminAnnouncements from './pages/Admin/Announcements';

// Layouts & Components
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/Layout/AdminLayout';
import UserLayout from './components/Layout/UserLayout';

function App() {
  const { isAuthenticated, token, fetchUser, user, viewMode } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchUser();
      socketService.connect(token);
    }

    return () => {
      socketService.disconnect();
    };
  }, [isAuthenticated, token, fetchUser]);

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            !isAuthenticated ? (
              <Login />
            ) : (
              <Navigate
                to={
                  user?.role === 'admin' || user?.role === 'teacher' || user?.isAdmin
                    ? viewMode === 'user'
                      ? '/dashboard'
                      : '/admin'
                    : '/dashboard'
                }
              />
            )
          }
        />
        <Route
          path="/register"
          element={
            !isAuthenticated ? (
              <Register />
            ) : (
              <Navigate
                to={
                  user?.role === 'admin' || user?.role === 'teacher' || user?.isAdmin
                    ? viewMode === 'user'
                      ? '/dashboard'
                      : '/admin'
                    : '/dashboard'
                }
              />
            )
          }
        />
        <Route
          path="/verify-otp"
          element={
            !isAuthenticated ? (
              <VerifyOtp />
            ) : (
              <Navigate
                to={
                  user?.role === 'admin' || user?.role === 'teacher' || user?.isAdmin
                    ? viewMode === 'user'
                      ? '/dashboard'
                      : '/admin'
                    : '/dashboard'
                }
              />
            )
          }
        />

        {/* User Routes inside UserLayout */}
        <Route
          path="/"
          element={
            isAuthenticated && (user?.role === 'admin' || user?.role === 'teacher' || user?.isAdmin) && viewMode === 'admin' ? (
              <Navigate to="/admin" replace />
            ) : (
              <ProtectedRoute>
                <UserLayout />
              </ProtectedRoute>
            )
          }
        >
          <Route path="dashboard" element={<UserDashboard />} />
          <Route path="notes" element={<Notes />} />
          <Route path="quizzes" element={<Quizzes />} />
          <Route path="quizzes/:id/take" element={<QuizTaking />} />
          <Route path="quizzes/:id/results" element={<QuizResults />} />
          <Route path="discussions" element={<Discussions />} />
          <Route path="assignments" element={<Assignments />} />
          <Route path="announcements" element={<UserAnnouncements />} />
          <Route path="profile" element={<Profile />} />
          <Route path="whiteboard/:sessionId" element={<Whiteboard />} />
        </Route>

        {/* Admin Routes inside AdminLayout */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="notes" element={<NotesManagement />} />
          <Route path="quizzes" element={<QuizBuilder />} />
          <Route path="quizzes/:id/edit" element={<QuizEdit />} />

          <Route path="analytics" element={<Analytics />} />
          <Route path="attempts/:attemptId" element={<AttemptDetail />} />
          <Route path="discussions" element={<AdminDiscussions />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
        </Route>

        {/* Default Redirects */}
        <Route
          path="*"
          element={
            <Navigate
              to={
                isAuthenticated
                  ? user?.role === 'admin' || user?.role === 'teacher' || user?.isAdmin
                    ? viewMode === 'user'
                      ? '/dashboard'
                      : '/admin'
                    : '/dashboard'
                  : '/login'
              }
            />
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
