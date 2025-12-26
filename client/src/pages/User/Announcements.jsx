import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { userAPI } from '../../services/api';

const PRIORITY_THEMES = {
  low: {
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    icon: '🟢',
    glow: 'shadow-emerald-500/10'
  },
  medium: {
    badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    icon: '🔵',
    glow: 'shadow-sky-500/10'
  },
  high: {
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    icon: '🟠',
    glow: 'shadow-amber-500/10'
  },
  urgent: {
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    icon: '🔴',
    glow: 'shadow-rose-500/10'
  },
};

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      // Re-use dashboard events endpoint to fetch recent announcements
      const res = await userAPI.getUpcomingEvents();
      const anns = res.data?.announcements || [];
      setAnnouncements(anns);

      if (anns.length > 0) {
        const latest = anns[0].publishAt || anns[0].createdAt;
        if (latest) {
          localStorage.setItem('announcements:lastSeenAt', latest);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-10 py-4">
      {/* Immersive Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800 pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="h-2 w-10 bg-primary-500 rounded-full" />
             <span className="text-[10px] font-black text-primary-500 uppercase tracking-[0.3em]">Institutional Feed</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-50 tracking-tighter">Student Bulletin</h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest max-w-xl">
             Official updates, critical alerts, and campus-wide communications
          </p>
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="group relative px-6 py-2.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-black text-slate-400 hover:text-white transition-all overflow-hidden"
        >
          <div className="relative z-10 flex items-center gap-2">
            {loading ? (
               <div className="h-3 w-3 border-2 border-slate-400/20 border-t-slate-400 rounded-full animate-spin" />
            ) : 'REFRESH FEED'}
          </div>
          <div className="absolute inset-0 bg-primary-500/0 group-hover:bg-primary-500/5 transition-colors" />
        </button>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-400 font-black uppercase tracking-widest text-center"
        >
          {error}
        </motion.div>
      )}

      {/* Feed Container */}
      <div className="space-y-6">
        {announcements.length === 0 && !loading && !error && (
          <div className="py-32 text-center rounded-[60px] bg-slate-900/10 border border-dashed border-slate-800/50">
             <div className="text-6xl mb-6 grayscale opacity-20">📭</div>
             <p className="text-sm font-black text-slate-600 uppercase tracking-[0.2em]">No Active Bulletins at this time</p>
             <p className="text-[10px] text-slate-700 font-bold uppercase mt-2 italic">Check back later for institutional updates</p>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {announcements.map((a, i) => {
            const theme = PRIORITY_THEMES[a.priority] || PRIORITY_THEMES.medium;
            const date = a.publishAt || a.createdAt;

            return (
              <motion.div
                key={a._id}
                initial={{ opacity: 0, y: 30, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="group bg-slate-900/40 border border-slate-800 p-8 rounded-[40px] backdrop-blur-xl hover:border-slate-700 transition-all shadow-2xl shadow-black/20"
              >
                <div className="flex flex-col gap-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                       <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${theme.badge} shadow-lg ${theme.glow}`}>
                          {theme.icon} {a.priority}
                       </span>
                       {a.isBroadcast && (
                        <span className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-slate-800 border border-slate-700 text-slate-500">
                          📡 BROADCAST
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-800/50 px-3 py-1.5 rounded-xl">
                      {new Date(date).toLocaleString([], { dateStyle: 'long', timeStyle: 'short' })}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-2xl font-black text-slate-50 tracking-tight leading-none group-hover:text-primary-400 transition-colors">
                      {a.title}
                    </h2>
                    <p className="text-sm text-slate-400 leading-relaxed font-medium whitespace-pre-wrap break-words max-w-3xl border-l-2 border-slate-800 pl-6 py-2 italic group-hover:border-primary-500/30 transition-colors" style={{ overflowWrap: 'break-word' }}>
                      {a.content}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 pt-4 border-t border-slate-800/50">
                     <div className="h-10 w-10 rounded-2xl bg-slate-800 flex items-center justify-center text-lg shadow-inner">
                        🛡️
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Authenticated By</p>
                        <p className="text-[11px] font-black text-slate-300 uppercase tracking-tight">Institutional Administration</p>
                     </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
      `}} />
    </div>
  );
};

export default Announcements;
