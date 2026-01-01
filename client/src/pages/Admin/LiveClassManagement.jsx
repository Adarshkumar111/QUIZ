import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import MeetingRoom from '../../components/LiveClass/MeetingRoom';
import socketService from '../../services/socket';

const LiveClassManagement = () => {
  const { user } = useAuthStore();
  const [classes, setClasses] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    classroom: '',
    scheduledTime: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [classesRes, classroomsRes] = await Promise.all([
        adminAPI.getAllLiveClasses(),
        adminAPI.getAllClassrooms()
      ]);
      setClasses(classesRes.data);
      setClassrooms(classroomsRes.data);
    } catch (err) {
      console.error('Failed to load live class data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await adminAPI.createLiveClass(formData);
      setShowCreateModal(false);
      setFormData({ title: '', description: '', classroom: '', scheduledTime: '' });
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create class');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (id) => {
    try {
      const res = await adminAPI.startLiveClass(id);
      setActiveSession(res.data);
      
      // Notify all users that class is now live
      const socket = socketService.socket;
      if (socket) {
        socket.emit('class-started', { classId: id, classData: res.data });
      }
    } catch (err) {
      alert('Failed to start class');
    }
  };

  const handleEnd = async () => {
    if (!activeSession) return;
    try {
      const res = await adminAPI.endLiveClass(activeSession._id);
      
      // Notify all users that class has ended
      const socket = socketService.socket;
      if (socket) {
        socket.emit('class-ended', { classId: activeSession._id, classData: res.data });
      }
      
      setActiveSession(null);
      loadData();
    } catch (err) {
      alert('Failed to end class');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this class? This will also remove the recording from the cloud.')) return;
    try {
      await adminAPI.deleteLiveClass(id);
      loadData();
    } catch (err) {
      alert('Failed to delete class');
    }
  };

  const handleToggleVisibility = async (id) => {
    try {
      await adminAPI.toggleLiveClassVisibility(id);
      loadData();
    } catch (err) {
      alert('Failed to toggle visibility');
    }
  };

  if (activeSession) {
    return (
      <div className="h-[calc(100vh-100px)] flex flex-col gap-4">
        <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-3xl border border-slate-800">
          <div>
            <h2 className="text-xl font-black text-slate-50">{activeSession.title}</h2>
            <p className="text-xs text-primary-400 font-bold uppercase tracking-widest">Live Session in Progress</p>
          </div>
          <button
            onClick={handleEnd}
            className="px-6 py-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-500/20"
          >
            End Session
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <MeetingRoom 
            classId={activeSession._id}
            user={user}
            onEnd={handleEnd}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-50 tracking-tight">Live Classrooms</h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Host and manage real-time educational sessions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-3 rounded-2xl bg-primary-600 hover:bg-primary-500 text-slate-900 text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-primary-500/20"
        >
          Schedule Session
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((c) => (
          <motion.div
            key={c._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-slate-900/40 border border-slate-800 p-6 rounded-[32px] backdrop-blur-xl group hover:border-primary-500/30 transition-all ${!c.isVisible ? 'opacity-50 grayscale' : ''}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                  c.status === 'live' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
                  c.status === 'ended' ? 'bg-slate-800 text-slate-500 border-slate-700' :
                  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  {c.status === 'live' && '● '} {c.status}
                </span>
                {!c.isVisible && (
                  <span className="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Hidden
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleToggleVisibility(c._id)}
                  className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-all"
                  title={c.isVisible ? 'Hide from students' : 'Show to students'}
                >
                  {c.isVisible ? '👁️' : '🙈'}
                </button>
                <button
                  onClick={() => handleDelete(c._id)}
                  className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-all"
                  title="Delete permanently"
                >
                  🗑️
                </button>
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter block mb-2">
              {new Date(c.scheduledTime).toLocaleString()}
            </span>
            
            <h3 className="text-lg font-black text-slate-50 mb-2 truncate group-hover:text-primary-400 transition-colors">
              {c.title}
            </h3>
            <p className="text-xs text-slate-400 line-clamp-2 mb-6">
              {c.description}
            </p>

            <div className="flex items-center justify-between pt-6 border-t border-slate-800/50">
               <div className="text-[10px] font-black text-slate-500 uppercase">
                  {c.classroom?.name}
               </div>
               {c.status !== 'ended' && (
                 <button
                   onClick={() => handleStart(c._id)}
                   className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-primary-600 hover:text-slate-900 text-slate-300 text-[10px] font-black uppercase tracking-widest transition-all"
                 >
                   {c.status === 'live' ? 'Join Local' : 'Start Session'}
                 </button>
               )}
               {c.status === 'ended' && c.recordingUrl && (
                 <a
                   href={c.recordingUrl}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-primary-600 hover:text-slate-900 text-primary-400 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                 >
                   <span>▶</span> Watch Rec
                 </a>
               )}
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[40px] p-8 shadow-2xl"
            >
              <h2 className="text-2xl font-black text-slate-50 mb-6">Schedule Live Class</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Session Title</label>
                  <input
                    required
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-100 outline-none focus:border-primary-500/50 transition-all"
                    placeholder="E.g. Advanced Calculus Review"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Classroom</label>
                  <select
                    required
                    value={formData.classroom}
                    onChange={(e) => setFormData({...formData, classroom: e.target.value})}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-100 outline-none focus:border-primary-500/50 transition-all"
                  >
                    <option value="">Select a Classroom</option>
                    {classrooms.map(cls => (
                      <option key={cls._id} value={cls._id}>{cls.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Schedule Time</label>
                  <input
                    required
                    type="datetime-local"
                    value={formData.scheduledTime}
                    onChange={(e) => setFormData({...formData, scheduledTime: e.target.value})}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-100 outline-none focus:border-primary-500/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-100 outline-none focus:border-primary-500/50 transition-all resize-none"
                    placeholder="Brief overview of the session topics..."
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 rounded-2xl bg-primary-600 hover:bg-primary-500 text-slate-900 text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-primary-500/20"
                  >
                    Create Session
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiveClassManagement;
