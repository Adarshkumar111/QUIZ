import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminAPI } from '../../services/api';

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

const AdminStatCard = ({ title, value, icon, color }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 backdrop-blur-xl relative overflow-hidden group"
  >
    <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}-500/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-500`} />
    <div className="relative flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{title}</p>
        <p className="text-2xl font-black text-slate-50 mt-1">{value}</p>
      </div>
      <div className={`h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center text-lg`}>
        {icon}
      </div>
    </div>
  </motion.div>
);

const AdminAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('medium');
  const [isBroadcast, setIsBroadcast] = useState(true);

  const stats = useMemo(() => ({
    total: announcements.length,
    activeBroadcasts: announcements.filter(a => a.isBroadcast).length,
    urgent: announcements.filter(a => a.priority === 'urgent').length,
  }), [announcements]);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminAPI.getAllAnnouncements();
      setAnnouncements(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      setError('');
      await adminAPI.deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => a._id !== id));
      setPendingDeleteId(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete announcement');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    try {
      setLoading(true);
      setError('');
      await adminAPI.createAnnouncement({
        title: title.trim(),
        content: content.trim(),
        priority,
        isBroadcast,
      });

      setTitle('');
      setContent('');
      setPriority('medium');
      setIsBroadcast(true);
      await loadAnnouncements();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create announcement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Stats */}
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black text-slate-50 tracking-tight">Platform Broadcasts</h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Manage institutional communications and critical alerts</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AdminStatCard title="Total Alerts" value={stats.total} icon="📢" color="primary" />
          <AdminStatCard title="Active Broadcasts" value={stats.activeBroadcasts} icon="🌐" color="emerald" />
          <AdminStatCard title="Urgent Notices" value={stats.urgent} icon="🔥" color="rose" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Creator Form */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="xl:col-span-1 space-y-6"
        >
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl">
             <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-8 rounded-lg bg-primary-500 flex items-center justify-center text-slate-900 text-lg">📁</div>
                <h2 className="text-sm font-black text-slate-50 uppercase tracking-tight">Draft Broadcast</h2>
             </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-400 font-black uppercase tracking-widest leading-relaxed">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-2xl bg-slate-950/40 border border-slate-800 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-primary-500/50 transition-all"
                  placeholder="System Maintenance, Schedule Change..."
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Message Content</label>
                <textarea
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full rounded-2xl bg-slate-950/40 border border-slate-800 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-primary-500/50 transition-all resize-none custom-scrollbar"
                  placeholder="Draft the full announcement here..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full rounded-2xl bg-slate-950/40 border border-slate-800 px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-primary-500/50 transition-all"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="flex flex-col justify-end pb-1 px-1">
                   <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all ${
                         isBroadcast ? 'bg-primary-500 border-primary-500' : 'border-slate-800 group-hover:border-slate-700'
                      }`}>
                         {isBroadcast && <span className="text-slate-900 text-[10px] font-black">✓</span>}
                      </div>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={isBroadcast}
                        onChange={(e) => setIsBroadcast(e.target.checked)}
                      />
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Broadcast</span>
                   </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-2xl bg-primary-600 hover:bg-primary-500 disabled:opacity-30 disabled:grayscale text-slate-900 text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-primary-500/20 active:scale-[0.98]"
              >
                {loading ? (
                   <span className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 border-2 border-slate-900/20 border-t-slate-900 rounded-full animate-spin" />
                      INITIATING...
                   </span>
                ) : 'INITIALIZE BROADCAST 🚀'}
              </button>
            </form>
          </div>
        </motion.div>

        {/* List Feed */}
        <div className="xl:col-span-2 space-y-4">
           <div className="flex items-center justify-between px-2">
             <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Transmission History</h2>
             {loading && <div className="h-4 w-4 border-2 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />}
           </div>

          <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
            {announcements.length === 0 && !loading && (
              <div className="py-20 text-center bg-slate-900/20 rounded-[40px] border border-dashed border-slate-800">
                 <div className="text-4xl grayscale mb-4">🔇</div>
                 <p className="text-xs font-black text-slate-600 uppercase tracking-widest">No Transmissions Recorded</p>
              </div>
            )}

            <AnimatePresence mode="popLayout">
              {announcements.map((a, i) => {
                const theme = PRIORITY_THEMES[a.priority] || PRIORITY_THEMES.medium;
                const date = a.publishAt || a.createdAt;

                return (
                  <motion.div
                    key={a._id}
                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05 }}
                    className="relative group bg-slate-900/40 border border-slate-800 p-5 rounded-3xl backdrop-blur-xl overflow-hidden hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4 relative z-10">
                      <div className="flex-1 space-y-3 min-w-0">
                         <div className="flex items-center gap-3">
                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${theme.badge} shadow-lg ${theme.glow}`}>
                               {theme.icon} {a.priority}
                            </span>
                            {a.isBroadcast && (
                              <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-800 border border-slate-700 text-slate-400">
                                📡 GLOBAL
                              </span>
                            )}
                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">
                               {new Date(date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            </span>
                         </div>
                         
                         <div>
                            <h3 className="text-sm font-black text-slate-50 tracking-tight">{a.title}</h3>
                            <p className="text-xs text-slate-400 leading-relaxed mt-2 whitespace-pre-wrap break-all" style={{ overflowWrap: 'anywhere' }}>{a.content}</p>
                         </div>

                         {a.createdBy?.username && (
                            <div className="flex items-center gap-2">
                               <div className="h-5 w-5 rounded-md bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase">{a.createdBy.username[0]}</div>
                               <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Signed By {a.createdBy.username}</span>
                            </div>
                         )}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                         <button
                           onClick={() => setPendingDeleteId(a._id)}
                           className="h-8 w-8 rounded-xl flex items-center justify-center bg-rose-500/5 text-rose-500 border border-rose-500/10 hover:bg-rose-500 hover:text-white transition-all shadow-lg"
                         >
                           🗑️
                         </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {pendingDeleteId === a._id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-6 pt-5 border-t border-rose-500/20"
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10">
                            <div className="flex items-center gap-3">
                               <span className="text-xl">⚠️</span>
                               <div>
                                  <p className="text-[10px] font-black text-rose-300 uppercase leading-none">Terminate Broadcast</p>
                                  <p className="text-[9px] text-rose-400 font-bold uppercase mt-1">This action is permanent and affects all terminals</p>
                               </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setPendingDeleteId(null)}
                                className="px-4 py-2 rounded-xl text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-white transition-colors"
                              >
                                Abort
                              </button>
                              <button
                                onClick={() => handleDelete(a._id)}
                                className="px-4 py-2 rounded-xl bg-rose-500 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
                              >
                                Confirm Termination
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}} />
    </div>
  );
};

export default AdminAnnouncements;
