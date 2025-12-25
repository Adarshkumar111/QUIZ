import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If we have token but user profile is not yet fetched, show loading
  if (isAuthenticated && !user) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="h-10 w-10 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
        <p className="text-xs text-slate-500 font-black uppercase tracking-widest">Validating Authorization...</p>
      </div>
    );
  }

  if (requiredRole) {
    const isAdminRoute = requiredRole === 'admin';
    const isElevated = user?.role === 'admin' || user?.role === 'teacher' || user?.isAdmin;
    const hasAccess = isAdminRoute ? isElevated : user?.role === requiredRole;

    if (!hasAccess) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
