import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { userAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import MeetingRoom from '../../components/LiveClass/MeetingRoom';
import socketService from '../../services/socket';

const LiveClassList = () => {
  const { user } = useAuthStore();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeSession, setActiveSession] = useState(null);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const res = await userAPI.getAvailableLiveClasses();
      setClasses(res.data);
    } catch (err) {
      console.error('Failed to load available live classes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  // Real-time updates for class status
  useEffect(() => {
    const socket = socketService.socket;
    if (!socket) return;

    const handleClassUpdate = ({ type, classId, classData }) => {
      console.log('Live class update:', type, classId);
      // Reload the list to get fresh data
      loadClasses();
    };

    socket.on('live-class-update', handleClassUpdate);

    return () => {
      socket.off('live-class-update', handleClassUpdate);
    };
  }, []);

  const handleJoin = async (id) => {
    try {
      const res = await userAPI.joinLiveClass(id);
      setActiveSession({
        ...classes.find(c => c._id === id),
        meetingId: res.data.meetingId
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to join class');
    }
  };

  const handleLeave = async () => {
    if (!activeSession) return;
    try {
      await userAPI.leaveLiveClass(activeSession._id);
      setActiveSession(null);
      loadClasses();
    } catch (err) {
      console.error('Error logging leave attendance');
      setActiveSession(null);
    }
  };

  if (activeSession) {
    return (
      <div className="h-[calc(100vh-100px)] flex flex-col gap-4">
        <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-3xl border border-slate-800">
          <div>
            <h2 className="text-xl font-black text-slate-50">{activeSession.title}</h2>
            <p className="text-xs text-primary-400 font-bold uppercase tracking-widest italic flex items-center gap-2">
               <span className="relative flex h-2 w-2">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
               </span>
               Participating in Live Classroom
            </p>
          </div>
          <button
            onClick={handleLeave}
            className="px-6 py-2 rounded-full bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-400 text-xs font-black uppercase tracking-widest transition-all"
          >
            Exit Class
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <MeetingRoom 
            classId={activeSession._id}
            user={user}
            onEnd={handleLeave}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800 pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="h-2 w-10 bg-primary-500 rounded-full" />
             <span className="text-[10px] font-black text-primary-500 uppercase tracking-[0.3em]">Live Interactive sessions</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-50 tracking-tighter">Campus Broadcasts</h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest max-w-xl">
             Join real-time lectures, workshops, and interactive discussions
          </p>
        </div>
        <button
          onClick={loadClasses}
          className="px-6 py-2.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-black text-slate-400 hover:text-white transition-all"
        >
          {loading ? 'REFRESHING...' : 'SYNC FEED'}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {classes.length === 0 && !loading && (
          <div className="col-span-full py-32 text-center rounded-[60px] bg-slate-900/10 border border-dashed border-slate-800/50">
             <div className="text-6xl mb-6 grayscale opacity-20">📡</div>
             <p className="text-sm font-black text-slate-600 uppercase tracking-[0.2em]">No Active or Scheduled Broadcasts</p>
          </div>
        )}

        {classes.map((c) => (
          <motion.div
            key={c._id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative bg-slate-900/40 border border-slate-800 p-8 rounded-[40px] backdrop-blur-xl hover:border-slate-700 transition-all overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 ${c.status === 'live' ? 'bg-rose-500/5' : 'bg-primary-500/5'} rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150`} />
            
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center justify-between mb-6">
                <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                  c.status === 'live' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-lg shadow-rose-500/10' : 
                  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  {c.status === 'live' ? '⚡ LIVE NOW' : (c.status === 'ended' ? '🏁 ENDED' : '📅 SCHEDULED')}
                </span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-800/50 px-3 py-1.5 rounded-xl">
                  {new Date(c.scheduledTime).toLocaleString([], { dateStyle: 'long', timeStyle: 'short' })}
                </span>
              </div>

              <h2 className="text-2xl font-black text-slate-50 tracking-tight leading-none mb-3 group-hover:text-primary-400 transition-colors">
                {c.title}
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed font-medium line-clamp-2 mb-8 italic">
                {c.description}
              </p>

              <div className="mt-auto flex items-center justify-between pt-6 border-t border-slate-800/50">
                 <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-slate-800 flex items-center justify-center text-sm">👨‍🏫</div>
                    <div>
                      <p className="text-[9px] font-black text-slate-600 uppercase leading-none">Instructor</p>
                      <p className="text-[11px] font-black text-slate-300 uppercase mt-1">{c.teacher?.username}</p>
                    </div>
                 </div>
                 
                 {c.status === 'live' ? (
                   <button
                     onClick={() => handleJoin(c._id)}
                     className="px-6 py-2 rounded-2xl bg-primary-600 hover:bg-primary-500 text-slate-900 text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-primary-500/20 active:scale-95"
                   >
                     Join Session 🚀
                   </button>
                 ) : c.status === 'ended' && c.recordingUrl ? (
                   <a
                     href={c.recordingUrl}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="px-6 py-2 rounded-2xl bg-slate-800 hover:bg-primary-600 hover:text-slate-900 text-primary-400 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                   >
                     <span>▶</span> Watch Recording
                   </a>
                 ) : (
                   <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest border border-slate-800 px-4 py-2 rounded-xl">
                      {c.status === 'ended' ? 'Session Ended' : 'Waiting to Start'}
                   </div>
                 )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default LiveClassList;
