import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { userAPI } from '../../services/api';
import socketService from '../../services/socket';





const Dashboard = () => {
  const [availableQuizzes, setAvailableQuizzes] = useState([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [savedNotes, setSavedNotes] = useState([]);
  const [topPerformers, setTopPerformers] = useState([]);
  const [isDailyLeaderboard, setIsDailyLeaderboard] = useState(true);

  useEffect(() => {
    // Join rankings room
    socketService.joinRankings();

    // Listen for real-time leaderboard updates
    socketService.onTopPerformersUpdate(({ topPerformers, isDaily }) => {
      setTopPerformers(topPerformers);
      if (isDaily !== undefined) setIsDailyLeaderboard(isDaily);
    });

    return () => {
      socketService.leaveRankings();
      socketService.offTopPerformersUpdate();
    };
  }, []);

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
        setDashboardData({
            ...dashboardRes.data,
            upcomingEvents: upcomingRes.data
        });
        setSavedNotes(savedNotesRes.data || []);
        if (dashboardRes.data?.topPerformers) {
          setTopPerformers(dashboardRes.data.topPerformers);
        }
        if (dashboardRes.data?.isDailyLeaderboard !== undefined) {
          setIsDailyLeaderboard(dashboardRes.data.isDailyLeaderboard);
        }
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
            <div className="flex flex-col items-end gap-1">
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300">
                Level {dashboardData?.user?.level || 1}
              </span>
              <span className="text-[10px] font-bold text-primary-400 uppercase tracking-tighter">
                Global Rank: #{dashboardData?.user?.globalRank || '...'}
              </span>
            </div>
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
          <div className="flex items-center gap-2 mt-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-500 animate-pulse" />
            <p className="text-[10px] text-primary-300 uppercase font-bold tracking-wider">
              {loadingQuizzes ? 'Syncing...' : 'Real-time Stats'}
            </p>
          </div>
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

          <div className="card border-primary-500/10 bg-gradient-to-br from-slate-900/60 to-primary-500/5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-50 uppercase tracking-wider">
                   {isDailyLeaderboard ? 'Daily Champions' : 'Global Champions'}
                </h2>
                <p className="text-[10px] text-slate-400 mt-0.5">
                   {isDailyLeaderboard ? 'Top performers of the day' : 'Top performers of all time'}
                </p>
              </div>
              <span className="flex items-center gap-1 self-start">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-emerald-400 font-medium tracking-widest">LIVE</span>
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
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40 border border-slate-700/50"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ring-2 ring-slate-900 overflow-hidden ${
                          idx === 0 ? 'bg-amber-400 text-slate-900' : 
                          idx === 1 ? 'bg-slate-300 text-slate-900' : 
                          'bg-amber-700 text-slate-100'
                        }`}>
                          {performer.avatar ? (
                            <img src={performer.avatar} alt="" className="h-full w-full object-cover" />
                          ) : (
                            performer.username[0].toUpperCase()
                          )}
                        </div>
                        <div className={`absolute -top-1 -left-1 h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-black shadow-lg ${
                          idx === 0 ? 'bg-amber-400 text-slate-900' : 
                          idx === 1 ? 'bg-slate-300 text-slate-900' : 
                          'bg-amber-700 text-slate-100'
                        }`}>
                          {idx + 1}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-100">{performer.username}</p>
                        <p className="text-[8px] text-slate-500 uppercase font-black">
                           {isDailyLeaderboard ? 'Daily MVP' : 'Elite Learner'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-primary-400">{Math.round(performer.score)}</p>
                      <p className="text-[8px] text-slate-500 font-bold uppercase">
                         {isDailyLeaderboard ? 'Points' : 'XP'}
                      </p>
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
