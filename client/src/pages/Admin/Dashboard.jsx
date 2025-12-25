import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { adminAPI } from '../../services/api';
import socketService from '../../services/socket';

const quickLinks = [
  { to: '/admin/notes', label: 'Review Notes', desc: 'Approve, reject, and manage notes', badge: 'Notes' },
  { to: '/admin/quizzes', label: 'Build a Quiz', desc: 'Create or edit quiz templates', badge: 'Quizzes' },
  { to: '/admin/classrooms', label: 'Manage Classrooms', desc: 'Invite students & assign roles', badge: 'Classrooms' },
  { to: '/admin/analytics', label: 'View Analytics', desc: 'Track performance & engagement', badge: 'Analytics' },
];

const Dashboard = () => {
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [topPerformers, setTopPerformers] = useState([]);
  const [isDailyLeaderboard, setIsDailyLeaderboard] = useState(true);
  const [recentActivity, setRecentActivity] = useState(null);

  useEffect(() => {
    // Join admin dashboard room
    socketService.joinAdminDashboard();

    // Listen for leaderboard updates
    socketService.onTopPerformersUpdate(({ topPerformers, recentActivity, isDaily }) => {
      setTopPerformers(topPerformers);
      if (isDaily !== undefined) setIsDailyLeaderboard(isDaily);
      if (recentActivity) {
        setRecentActivity(recentActivity);
        setTimeout(() => setRecentActivity(null), 5000);
      }
    });

    return () => {
      socketService.leaveAdminDashboard();
      socketService.offTopPerformersUpdate();
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const response = await adminAPI.getDashboardStats();
        if (mounted) {
          setDashboardStats(response.data?.stats || null);
          if (response.data?.topPerformers) {
            setTopPerformers(response.data.topPerformers);
          }
          if (response.data?.isDailyLeaderboard !== undefined) {
            setIsDailyLeaderboard(response.data.isDailyLeaderboard);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    const id = setInterval(load, 15000);

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const stats = useMemo(() => {
    const valueOrDash = (value) => {
      if (loading) return '...';
      if (value === null || value === undefined) return '0';
      return String(value);
    };

    return [
      {
        label: 'Total Students',
        value: valueOrDash(dashboardStats?.totalStudents),
        sub: `${valueOrDash(dashboardStats?.activeUsersNow)} active right now`,
      },
      {
        label: 'Active Quizzes',
        value: valueOrDash(dashboardStats?.activeQuizzesNow),
        sub: 'Live right now',
      },
      {
        label: 'Total Notes',
        value: valueOrDash(dashboardStats?.totalNotes),
        sub: 'All notes added to the platform',
      },
    ];
  }, [dashboardStats, loading]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">Admin Overview</p>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-50">
            Control center for your learning community
          </h1>
          <p className="text-sm text-slate-400 mt-2 max-w-xl">
            Monitor quizzes, notes, classrooms, and student activity from a single, focused dashboard.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/admin/quizzes"
            className="btn-primary text-xs md:text-sm"
          >
            Create Quiz
          </Link>
          <Link
            to="/admin/announcements"
            className="btn-secondary text-xs md:text-sm"
          >
            New Announcement
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: { staggerChildren: 0.06 },
          },
        }}
      >
        {stats.map((item) => (
          <motion.div
            key={item.label}
            variants={{
              hidden: { opacity: 0, y: 16 },
              visible: { opacity: 1, y: 0 },
            }}
            className="flex"
          >
            {item.label === 'Total Students' ? (
              <Link to="/admin/students" className="card flex flex-col justify-between w-full hover:border-primary-500/50 transition-colors">
                <div>
                  <p className="text-xs text-slate-400 mb-1">{item.label}</p>
                  <p className="text-2xl font-semibold text-slate-50">{item.value}</p>
                </div>
                <p className="text-xs text-primary-300 mt-3">{item.sub}</p>
              </Link>
            ) : (
              <div className="card flex flex-col justify-between w-full">
                <div>
                  <p className="text-xs text-slate-400 mb-1">{item.label}</p>
                  <p className="text-2xl font-semibold text-slate-50">{item.value}</p>
                </div>
                <p className="text-xs text-primary-300 mt-3">{item.sub}</p>
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Quick actions */}
        <motion.div
          className="xl:col-span-2 card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-50">Quick admin actions</h2>
              <p className="text-xs text-slate-400">Jump directly into the most important workflows.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            {quickLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="group relative rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-4 flex flex-col gap-1 hover:border-primary-500/70 hover:shadow-[0_0_20px_rgba(6,174,214,0.35)] transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-primary-200 bg-primary-500/10 px-2 py-0.5 rounded-full">
                    {link.badge}
                  </span>
                  <span className="text-[11px] text-slate-400 group-hover:text-primary-200 transition-colors">
                    Open →
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-50">{link.label}</p>
                <p className="text-xs text-slate-400">{link.desc}</p>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Right column: activity & alerts */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35 }}
        >
          <div className="card">
            <h2 className="text-sm font-semibold text-slate-50 mb-3">Today&apos;s signal</h2>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Quiz completion rate is <span className="text-emerald-300 font-medium">+12% higher</span> than yesterday.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
                <span>18 notes are waiting for moderation in the review queue.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400" />
                <span>2 live quizzes are close to their end time.</span>
              </li>
            </ul>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-slate-50 mb-3">Moderation queue</h2>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center justify-between">
                <span>Flagged messages</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 text-[11px]">5 pending</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Reported users</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 text-[11px]">2 under review</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Spam detection</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-[11px]">Healthy</span>
              </li>
            </ul>
          </div>

          <div className="card border-primary-500/10 bg-gradient-to-br from-slate-900/60 to-primary-500/5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-50 uppercase tracking-wider">
                  {isDailyLeaderboard ? 'Daily Champions' : 'Global Champions'}
                </h2>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {isDailyLeaderboard ? 'Top performers of the day' : 'Top performers of all time'}
                </p>
                {recentActivity && (
                  <motion.p 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[10px] text-primary-400 font-medium mt-0.5"
                  >
                    {recentActivity.username} {recentActivity.reason} (+{recentActivity.points})
                  </motion.p>
                )}
              </div>
              <span className="flex items-center gap-1 self-start">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-emerald-400 font-medium">LIVE</span>
              </span>
            </div>
            
            <div className="space-y-3">
              {topPerformers.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4 italic">Competition is just heating up...</p>
              ) : (
                topPerformers.slice(0, 3).map((performer, idx) => (
                  <motion.div 
                    key={performer.userId}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ 
                      type: "spring",
                      stiffness: 500,
                      damping: 30,
                      mass: 1
                    }}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40 border border-slate-700/50 hover:border-primary-500/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm ring-2 ring-slate-900 overflow-hidden shadow-lg ${
                          idx === 0 ? 'bg-amber-400 text-slate-900 ring-amber-400/20' : 
                          idx === 1 ? 'bg-slate-300 text-slate-900 ring-slate-300/20' : 
                          'bg-amber-700 text-slate-100 ring-amber-700/20'
                        }`}>
                          {performer.avatar ? (
                            <img src={performer.avatar} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span>{performer.username[0].toUpperCase()}</span>
                          )}
                        </div>
                        <div className={`absolute -top-1 -left-1 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md ${
                          idx === 0 ? 'bg-amber-400 text-slate-900' : 
                          idx === 1 ? 'bg-slate-300 text-slate-900' : 
                          'bg-amber-700 text-slate-100'
                        }`}>
                          {idx + 1}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-50">{performer.username}</p>
                        <div className="flex items-center gap-1">
                          <span className={`h-1 w-1 rounded-full ${isDailyLeaderboard ? 'bg-primary-400' : 'bg-amber-400'}`} />
                          <p className="text-[9px] text-slate-400 uppercase tracking-tighter">
                            {isDailyLeaderboard ? 'Daily Score' : 'Total XP'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs font-black text-primary-400">{Math.round(performer.score)}</span>
                        <svg className="w-2.5 h-2.5 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <p className="text-[8px] text-slate-500 font-bold uppercase">Points</p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
