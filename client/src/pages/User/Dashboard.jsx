import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { userAPI } from '../../services/api';





const Dashboard = () => {
  const [availableQuizzes, setAvailableQuizzes] = useState([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [savedNotes, setSavedNotes] = useState([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [quizzesRes, dashboardRes, savedNotesRes, upcomingRes] = await Promise.all([
          userAPI.getAvailableQuizzes(),
          userAPI.getDashboardOverview(),
          userAPI.getSavedNotes(),
          userAPI.getUpcomingEvents()
        ]);
        
        if (!mounted) return;
        setAvailableQuizzes(quizzesRes.data || []);
        // Merge upcoming events into dashboard data for easier passing or separate state
        setDashboardData({
            ...dashboardRes.data,
            upcomingEvents: upcomingRes.data
        });
        setSavedNotes(savedNotesRes.data || []);
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        if (mounted) setLoadingQuizzes(false);
      }
    };
    
    load();
    return () => {
      mounted = false;
      const now = new Date().toISOString();
      localStorage.setItem('lastQuizSeenAt', now);
    };
  }, []);

  const newQuizCount = useMemo(() => {
    const lastSeen = localStorage.getItem('lastQuizSeenAt');
    if (!lastSeen) return 0;
    const last = new Date(lastSeen).getTime();
    return (availableQuizzes || []).filter((q) => new Date(q.createdAt).getTime() > last).length;
  }, [availableQuizzes]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">Student Overview</p>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-50">
            Welcome back, let&apos;s continue your streak
          </h1>
          <p className="text-sm text-slate-400 mt-2 max-w-xl">
            Quickly jump into notes, quizzes, and assignments while tracking your learning progress.
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/quizzes" className="btn-primary text-xs md:text-sm">
            Continue Quiz
          </Link>
          <Link to="/notes" className="btn-secondary text-xs md:text-sm">
            Browse Notes
          </Link>
        </div>
      </div>

      {/* XP + streak row -> Now Learning Progress */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div className="card col-span-2 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Learning Progress</p>
              <div className="flex items-baseline gap-2">
                 <p className="text-lg font-semibold text-slate-50">
                  {dashboardData?.stats?.progressPercentage || 0}% Completed
                 </p>
                 <span className="text-xs text-slate-500">
                   ({dashboardData?.stats?.userContent || 0} / {dashboardData?.stats?.totalContent || 0} items)
                 </span>
              </div>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300">
              Level {dashboardData?.user?.level || 1}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-primary-500 to-primary-400"
              initial={{ width: 0 }}
              animate={{ width: `${dashboardData?.stats?.progressPercentage || 0}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
             <span>Keep learning to level up!</span>
             <span>{dashboardData?.user?.xpPoints || 0} XP earned</span>
          </div>
        </div>
        <div className="card flex flex-col justify-between">
          <div>
            <p className="text-xs text-slate-400 mb-1">Weekly streak</p>
            <p className="text-2xl font-semibold text-slate-50">{dashboardData?.stats?.streak || 0} days</p>
          </div>
          <p className="text-xs text-primary-300 mt-2">
            {loadingQuizzes ? 'Checking new quizzes...' : `${newQuizCount} new quizzes added`}
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Saved notes */}
        <motion.div
          className="xl:col-span-2 card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.35 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-50">Saved notes</h2>
              <p className="text-xs text-slate-400">Your bookmarked notes for quick revision.</p>
            </div>
            <Link to="/notes" className="text-[11px] text-primary-200 hover:text-primary-100">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {savedNotes.length === 0 ? (
              <p className="text-xs text-slate-400 p-2 text-center">No saved notes yet.</p>
            ) : (
              savedNotes.map((note) => (
                <div
                  key={note._id}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-200"
                >
                  <div>
                    <p className="font-medium text-slate-50">{note.title}</p>
                    <p className="text-[11px] text-slate-400">{note.subject}</p>
                  </div>
                  <div className="text-right flex justify-end gap-2 mt-2">
                     <button 
                      onClick={async () => {
                        try {
                          await userAPI.unsaveNote(note._id);
                          setSavedNotes(prev => prev.filter(n => n._id !== note._id));
                          toast.success("Note removed");
                        } catch (error) {
                          toast.error("Failed to remove note");
                        }
                      }}
                      className="inline-block px-3 py-1 rounded-lg border border-red-500/20 text-[11px] text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      Remove
                    </button>
                    <button 
                      onClick={async () => {
                        try {
                          const { data } = await userAPI.downloadNote(note._id);
                          if (data.url) window.open(data.url, '_blank');
                        } catch (error) {
                          console.error("Failed to open note", error);
                        }
                      }}
                      className="inline-block px-3 py-1 rounded-lg bg-primary-500/10 text-[11px] text-primary-200 hover:bg-primary-500/20 transition-colors"
                    >
                      Open
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Recent quizzes */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
        >
          <div className="card">
            <h2 className="text-sm font-semibold text-slate-50 mb-3">Recent quizzes</h2>
            <div className="space-y-4 text-xs text-slate-300">
              {!dashboardData?.recentQuizzes?.length ? (
                 <p className="text-slate-400">No quizzes attempted yet.</p>
              ) : (
                dashboardData.recentQuizzes.map((quiz) => (
                  <div key={quiz._id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-50 line-clamp-1">{quiz.title}</p>
                      <p className="text-[11px] text-slate-400">Score: {quiz.score}</p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-[11px] ${
                          quiz.isPassed ? 'text-emerald-300' : 'text-amber-300'
                        }`}
                      >
                        {quiz.percentage} ({quiz.status})
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-slate-50 mb-3">Upcoming</h2>
            <ul className="space-y-2 text-xs text-slate-300">
              {/* Upcoming Quizzes */}
              {dashboardData?.upcomingEvents?.upcomingQuizzes?.map(quiz => (
                <li key={quiz._id} className="flex items-center justify-between">
                  <span className="line-clamp-1">{quiz.title}</span>
                  <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 text-[11px] whitespace-nowrap">
                    {new Date(quiz.startTime).toLocaleDateString()}
                  </span>
                </li>
              ))}

              {/* Pending Assignments */}
              {dashboardData?.upcomingEvents?.pendingAssignments?.map(assignment => (
                <li key={assignment._id} className="flex items-center justify-between">
                  <span className="line-clamp-1">{assignment.title}</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 text-[11px] whitespace-nowrap">
                    Due {new Date(assignment.dueDate).toLocaleDateString()}
                  </span>
                </li>
              ))}

              {/* Latest Announcement */}
              {dashboardData?.upcomingEvents?.announcements?.length > 0 && (
                <li className="flex items-center justify-between group cursor-pointer">
                  <div className="flex-1">
                     <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Latest Announcement</span>
                     <Link to="/announcements" className="line-clamp-1 group-hover:text-primary-400 transition-colors">
                        {dashboardData.upcomingEvents.announcements[0].title}
                     </Link>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-[11px]">New</span>
                </li>
              )}

              {/* Empty State */}
              {!dashboardData?.upcomingEvents?.upcomingQuizzes?.length && 
               !dashboardData?.upcomingEvents?.pendingAssignments?.length && 
               !dashboardData?.upcomingEvents?.announcements?.length && (
                 <li className="text-slate-500 text-center py-2">No upcoming events</li>
              )}
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
