import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

const Analytics = () => {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      setError('');
      const { data } = await adminAPI.getUserPerformanceSummary(
        search ? { search } : undefined
      );
      setUsers(data.users || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchDetail = async (userId) => {
    try {
      setLoadingDetail(true);
      setError('');
      const { data } = await adminAPI.getUserPerformanceDetail(userId);
      setDetail(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load user performance');
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchDetail(selectedUserId);
    }
  }, [selectedUserId]);

  const handleSelectUser = (userId) => {
    setSelectedUserId(userId);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const getStatusBadge = (percentage) => {
    if (percentage >= 80) return { label: 'Excellent', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    if (percentage >= 60) return { label: 'Proficient', color: 'bg-primary-500/10 text-primary-400 border-primary-500/20' };
    if (percentage >= 40) return { label: 'Developing', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
    return { label: 'Review Needed', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Page Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/5 text-xl">
              📈
            </div>
            <h1 className="text-3xl font-black text-slate-50 tracking-tight text-shadow-sm">Performance Analysis</h1>
          </div>
          <p className="text-sm text-slate-400 max-w-xl font-medium">
            Monitor educational ROI. Detailed metrics, attempt history, and student progression at your fingertips.
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Left Sidebar: Student Navigator */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="xl:col-span-1 space-y-6"
        >
          <div className="card !p-0 border-slate-800/80 bg-slate-900/40 relative overflow-hidden h-[650px] flex flex-col shadow-2xl">
             <div className="p-5 border-b border-slate-800/80">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary-500 animate-pulse" />
                    Student Directory
                  </h2>
                  {loadingUsers && (
                    <span className="h-3 w-3 border-2 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
                  )}
                </div>
                
                <form onSubmit={handleSearchSubmit} className="relative group">
                  <input
                    type="text"
                    placeholder="Search query..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl pl-4 pr-10 py-2.5 text-xs focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/50 transition-all placeholder:text-slate-600 font-medium"
                  />
                  <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-primary-400 transition-colors">
                     🔍
                  </button>
                </form>
             </div>

             <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {users.length === 0 && !loadingUsers ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                     <span className="text-3xl mb-3">👻</span>
                     <p className="text-xs text-slate-600 font-bold uppercase tracking-tight">No participants found</p>
                  </div>
                ) : (
                  users.map((u, idx) => (
                    <motion.button
                      key={u.userId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => handleSelectUser(u.userId)}
                      className={`w-full group relative flex items-center gap-3 p-3 rounded-2xl transition-all duration-300 ${
                        selectedUserId === u.userId
                          ? 'bg-primary-500/10 border border-primary-500/30'
                          : 'bg-transparent border border-transparent hover:bg-slate-800/40 hover:border-slate-800'
                      }`}
                    >
                      <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-xs font-black transition-transform duration-500 group-hover:scale-110 ${
                        selectedUserId === u.userId 
                          ? 'bg-primary-500 text-slate-950 shadow-lg shadow-primary-500/20' 
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                         {u.username?.[0]?.toUpperCase()}
                      </div>
                      <div className="text-left flex-1 min-w-0">
                         <p className={`text-xs font-bold truncate ${selectedUserId === u.userId ? 'text-primary-100' : 'text-slate-300'}`}>{u.username}</p>
                         <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">{u.attemptsCount} Tries</span>
                            <span className="h-1 w-1 rounded-full bg-slate-700" />
                            <span className={`text-[9px] font-black tracking-tighter ${u.avgPercentage >= 60 ? 'text-emerald-500' : 'text-amber-500'}`}>{Math.round(u.avgPercentage)}% AVG</span>
                         </div>
                      </div>
                      <AnimatePresence>
                         {selectedUserId === u.userId && (
                           <motion.div 
                             layoutId="sidebar-active"
                             className="absolute right-3 h-1.5 w-1.5 rounded-full bg-primary-500 shadow-[0_0_10px] shadow-primary-500"
                           />
                         )}
                      </AnimatePresence>
                    </motion.button>
                  ))
                )}
             </div>
          </div>
        </motion.div>

        {/* Right Area: Performance Insights */}
        <div className="xl:col-span-3 min-h-[600px] relative">
          <AnimatePresence mode="wait">
             {!selectedUserId ? (
               <motion.div 
                 key="empty"
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 1.05 }}
                 className="card !p-20 border-slate-800/80 bg-slate-900/40 border-dashed flex flex-col items-center justify-center text-center h-full min-h-[500px]"
               >
                  <div className="h-24 w-24 rounded-full bg-slate-800/30 flex items-center justify-center text-4xl mb-6 shadow-canvas">
                     🛰️
                  </div>
                  <h3 className="text-xl font-black text-slate-50 tracking-tight mb-2">Ready for Extraction</h3>
                  <p className="text-sm text-slate-500 max-w-xs font-medium leading-relaxed">
                    Select a student profile from the sidebar to visualize their academic progression and session metrics.
                  </p>
               </motion.div>
             ) : loadingDetail ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-8"
                >
                  <div className="h-32 w-full animate-pulse bg-slate-800/20 rounded-3xl border border-slate-800" />
                  <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-24 animate-pulse bg-slate-800/20 rounded-3xl border border-slate-800" />
                    ))}
                  </div>
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 animate-pulse bg-slate-800/20 rounded-3xl border border-slate-800" />
                    ))}
                  </div>
                </motion.div>
             ) : detail ? (
               <motion.div 
                 key={selectedUserId}
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="space-y-8"
               >
                 {/* Student Bio Card */}
                 <div className="card border-slate-800/80 bg-slate-900/60 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 h-64 w-64 bg-primary-500/5 blur-[120px] rounded-full -mr-32 -mt-32" />
                    <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-center">
                       <div className="h-20 w-20 shrink-0 rounded-3xl bg-linear-to-tr from-primary-600 to-indigo-600 flex items-center justify-center text-3xl font-black text-white shadow-2xl shadow-primary-500/30 ring-4 ring-white/5">
                          {detail?.user?.username?.[0]?.toUpperCase()}
                       </div>
                       <div className="flex-1">
                          <h2 className="text-2xl font-black text-slate-50 tracking-tight leading-none mb-1">{detail?.user?.username}</h2>
                          <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">{detail?.user?.email}</p>
                          <div className="flex items-center gap-3 mt-4">
                             <div className="px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                {detail?.user?.course || 'GENERAL'}
                             </div>
                             <div className="px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                SEM {detail?.user?.semester || 'N/A'}
                             </div>
                             <span className="h-1 w-1 rounded-full bg-slate-700" />
                             <span className="text-[10px] font-black text-primary-500 uppercase tracking-widest">LOYALTY L{detail?.user?.level || 1}</span>
                          </div>
                       </div>
                       <div className="hidden md:block text-right">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">XP PROGRESSION</p>
                          <p className="text-2xl font-black text-primary-400 leading-none">{detail?.user?.xpPoints || 0} <span className="text-xs text-slate-600">XP</span></p>
                       </div>
                    </div>
                 </div>

                 {/* High-Impact Stat Matrix */}
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Sprints', value: detail?.summary?.totalAttempts || 0, color: 'indigo', icon: '🏃' },
                      { label: 'Avg Calibration', value: `${detail?.summary?.avgPercentage ?? 0}%`, color: 'emerald', icon: '🎯' },
                      { label: 'Peak Performance', value: `${detail?.summary?.bestPercentage ?? 0}%`, color: 'amber', icon: '⚡' },
                      { label: 'Session Velocity', value: 'High', color: 'rose', icon: '🚀' },
                    ].map((s, i) => (
                      <motion.div 
                        key={s.label}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className={`p-5 rounded-3xl bg-slate-900/40 border border-${s.color}-500/20 group relative overflow-hidden`}
                      >
                         <div className={`absolute top-0 right-0 h-16 w-16 bg-${s.color}-500/5 blur-xl group-hover:scale-150 transition-transform`} />
                         <div className="flex items-center justify-between mb-2">
                            <span className="text-lg">{s.icon}</span>
                            <span className={`h-1.5 w-1.5 rounded-full bg-${s.color}-500 shadow-[0_0_5px] shadow-${s.color}-500`} />
                         </div>
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{s.label}</p>
                         <p className={`text-xl font-black text-${s.color}-400`}>{s.value}</p>
                      </motion.div>
                    ))}
                 </div>

                 {/* Detailed History */}
                 <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                       <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Historical Performance Log</h3>
                       <p className="text-[9px] text-slate-600 italic">Sorted by chronological sequence</p>
                    </div>

                    <div className="space-y-3">
                       {!detail?.attempts || detail.attempts.length === 0 ? (
                         <div className="p-8 text-center bg-slate-900/20 border border-slate-800 rounded-3xl border-dashed">
                            <p className="text-xs text-slate-600 font-bold uppercase tracking-widest">No graded sessions recorded</p>
                         </div>
                       ) : (
                         detail.attempts.map((attempt, i) => {
                            const badge = getStatusBadge(attempt.percentage);
                            return (
                              <motion.div
                                key={attempt._id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + i * 0.05 }}
                                onClick={() => navigate(`/admin/attempts/${attempt._id}`)}
                                className="group w-full flex items-center justify-between p-4 rounded-3xl border border-slate-800/80 bg-slate-900/40 hover:border-primary-500/30 hover:bg-slate-900/60 transition-all cursor-pointer shadow-sm active:scale-[0.99]"
                              >
                                 <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className="h-10 w-10 shrink-0 rounded-2xl bg-slate-950 flex items-center justify-center text-lg border border-slate-800 group-hover:border-primary-500/50 transition-colors">
                                       📑
                                    </div>
                                    <div className="min-w-0">
                                       <div className="flex items-center gap-3 mb-0.5">
                                          <h4 className="text-sm font-black text-slate-100 truncate group-hover:text-primary-400 transition-colors">{attempt.quiz?.title || 'System Quiz'}</h4>
                                          <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${badge.color}`}>
                                             {badge.label}
                                          </span>
                                       </div>
                                       <p className="text-[11px] text-slate-500 font-medium tracking-tight">
                                          {attempt.quiz?.subject || 'CORE'} <span className="opacity-30 mx-1">•</span> {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString() : 'REALTIME'}
                                       </p>
                                    </div>
                                 </div>

                                 <div className="text-right shrink-0">
                                    <p className="text-sm font-black text-slate-50 tracking-tighter">
                                       {attempt.score} <span className="text-[10px] text-slate-600">/ {attempt.maxScore}</span>
                                    </p>
                                    <p className={`text-[10px] font-black ${attempt.percentage >= 60 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                       {Math.round(attempt.percentage)}%
                                    </p>
                                 </div>
                              </motion.div>
                            );
                         })
                       )}
                    </div>
                 </div>
               </motion.div>
             ) : (
                <div className="flex items-center justify-center h-full text-slate-500 text-xs">Failed to load payload.</div>
             )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Analytics;

