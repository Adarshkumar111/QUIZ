import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import useAuthStore from '../../store/authStore';
import socketService from '../../services/socket';
import { userAPI } from '../../services/api';

const userLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/notes', label: 'Notes' },
  { to: '/quizzes', label: 'Quizzes' },
  { to: '/discussions', label: 'Discussions' },
  { to: '/classrooms', label: 'Classrooms' },
  { to: '/live-classes', label: 'Live Classes' },
  { to: '/announcements', label: 'Announcements' },
  { to: '/profile', label: 'Profile' },
];

const UserLayout = () => {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const viewMode = useAuthStore((s) => s.viewMode);
  const setViewMode = useAuthStore((s) => s.setViewMode);
  const navigate = useNavigate();
  const location = useLocation();

  const [hasNewAnnouncements, setHasNewAnnouncements] = useState(false);

  // On first load, check if there are announcements newer than what user has seen
  useEffect(() => {
    const checkInitialAnnouncements = async () => {
      try {
        const res = await userAPI.getUpcomingEvents();
        const anns = res.data?.announcements || [];
        if (!anns.length) return;

        const latest = anns[0].publishAt || anns[0].createdAt;
        if (!latest) return;

        const lastSeen = localStorage.getItem('announcements:lastSeenAt');
        if (!lastSeen || new Date(latest) > new Date(lastSeen)) {
          setHasNewAnnouncements(true);
        }
      } catch (e) {
        // ignore errors here, badge is a best-effort hint
      }
    };

    checkInitialAnnouncements();
  }, []);

  // Listen for realtime announcements and show a red dot until user visits the page
  useEffect(() => {
    const handleAnnouncement = () => {
      // Only show badge if user is not already on the announcements page
      if (location.pathname !== '/announcements') {
        setHasNewAnnouncements(true);
      }
    };

    socketService.onAnnouncement(handleAnnouncement);

    return () => {
      socketService.off('announcement', handleAnnouncement);
    };
  }, [location.pathname]);

  // Clear badge when user opens announcements page
  useEffect(() => {
    if (location.pathname === '/announcements' && hasNewAnnouncements) {
      setHasNewAnnouncements(false);
    }
  }, [location.pathname, hasNewAnnouncements]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isElevated = user?.role === 'admin' || user?.role === 'teacher' || user?.isAdmin;

  const handleSwitchToAdmin = () => {
    setViewMode('admin');
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <aside className="w-64 border-r border-slate-800 bg-slate-950/80 backdrop-blur-xl hidden md:flex md:flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <span className="text-lg font-semibold bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent">
            Quiz Portal
          </span>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1">
          {userLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? 'bg-slate-900 text-primary-200 border border-primary-500/50 shadow-[0_0_18px_rgba(6,174,214,0.35)]'
                    : 'text-slate-300 hover:bg-slate-900/70 hover:text-primary-100'
                }`
              }
            >
              <span>{link.label}</span>
              {link.to === '/announcements' && hasNewAnnouncements && (
                <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(248,113,113,0.8)]" />
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl flex items-center justify-between px-4 md:px-8">
          <div>
            <p className="text-xs text-slate-400">Logged in as</p>
            <p className="text-sm font-medium capitalize">{user?.role || 'student'}</p>
          </div>
          <div className="flex items-center gap-2">
            {isElevated && viewMode === 'user' && (
              <button
                onClick={handleSwitchToAdmin}
                className="hidden md:inline-flex text-xs md:text-sm px-3 py-1.5 rounded-lg border border-slate-700 hover:border-primary-500/70 hover:text-primary-200 transition-colors"
              >
                Switch to Admin View
              </button>
            )}
            <button
              onClick={handleLogout}
              className="text-xs md:text-sm px-3 py-1.5 rounded-lg border border-rose-600/80 text-rose-200 hover:bg-rose-600/10 transition-colors"
            >
              Logout
            </button>
          </div>
        </header>
        <motion.main
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="flex-1 p-4 md:p-8 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-y-auto"
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
};

export default UserLayout;
