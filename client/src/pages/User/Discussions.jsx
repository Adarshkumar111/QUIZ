import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { userAPI } from '../../services/api';
import socketService from '../../services/socket';
import useAuthStore from '../../store/authStore';

const Discussions = () => {
  const user = useAuthStore((s) => s.user);
  const [classrooms, setClassrooms] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeType, setActiveType] = useState('classroom'); // classroom | group
  const [activeId, setActiveId] = useState('');

  const [messages, setMessages] = useState([]);
  const [loadingLeft, setLoadingLeft] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);

  const messagesContainerRef = useRef(null);

  const activeItem = useMemo(() => {
    if (!activeId) return null;
    if (activeType === 'classroom') {
      return classrooms.find((c) => c._id === activeId);
    }
    return groups.find((g) => g._id === activeId);
  }, [activeId, activeType, classrooms, groups]);

  const loadLeft = async () => {
    try {
      setLoadingLeft(true);
      setError('');
      const [classroomsRes, groupsRes] = await Promise.all([
        userAPI.getUserClassrooms(),
        userAPI.getMyGroups(),
      ]);
      setClassrooms(classroomsRes.data || []);
      setGroups(groupsRes.data?.groups || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load discussions');
    } finally {
      setLoadingLeft(false);
    }
  };

  const loadMessages = async ({ type, id }) => {
    if (!id) return;
    try {
      setLoadingMessages(true);
      setError('');

      if (type === 'classroom') {
        const res = await userAPI.getMessages(id, { limit: 50 });
        setMessages(res.data?.messages || []);
      } else {
        const res = await userAPI.getGroupMessages(id, { limit: 50 });
        setMessages(res.data?.messages || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load messages');
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadLeft();
  }, []);

  useEffect(() => {
    if (!activeId) return;

    if (activeType === 'classroom') {
      socketService.joinClassroom(activeId);
    } else {
      socketService.joinGroup(activeId);
    }

    loadMessages({ type: activeType, id: activeId });

    return () => {
      if (activeType === 'classroom') {
        socketService.leaveClassroom(activeId);
      } else {
        socketService.leaveGroup(activeId);
      }
    };
  }, [activeId, activeType]);

  useEffect(() => {
    const onNewClassroomMessage = (msg) => {
      if (activeType !== 'classroom') return;
      if (!activeId) return;
      if (msg?.classroom?.toString?.() !== activeId.toString()) return;
      setMessages((prev) => [...prev, msg]);
    };

    const onNewGroupMessage = (msg) => {
      if (activeType !== 'group') return;
      if (!activeId) return;
      if (msg?.group?.toString?.() !== activeId.toString()) return;
      setMessages((prev) => [...prev, msg]);
    };

    socketService.onNewMessage(onNewClassroomMessage);
    socketService.onNewGroupMessage(onNewGroupMessage);

    return () => {
      socketService.off('newMessage', onNewClassroomMessage);
      socketService.off('newGroupMessage', onNewGroupMessage);
    };
  }, [activeId, activeType]);

  useEffect(() => {
    if (!messagesContainerRef.current) return;
    const el = messagesContainerRef.current;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [activeId, messages.length]);

  const handleFilesChange = (e) => {
    setFiles(Array.from(e.target.files || []));
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!activeId || (!content.trim() && files.length === 0)) return;

    try {
      setSending(true);
      setError('');
      const formData = new FormData();
      formData.append('content', content.trim());
      files.forEach((f) => formData.append('attachments', f));
      let res;
      if (activeType === 'classroom') {
        res = await userAPI.postMessage(activeId, formData);
      } else {
        res = await userAPI.postGroupMessage(activeId, formData);
      }

      const created = res?.data;
      setContent('');
      setFiles([]);

      if (created && created._id) {
        setMessages((prev) => [...prev, created]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const selectItem = (type, id) => {
    setActiveType(type);
    setActiveId(id);
    setMessages([]);
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-50 tracking-tight">Interactive Discussions</h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Real-time collaboration across rooms</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">
        {/* Sidebar */}
        <div className="w-full lg:w-80 flex flex-col gap-4 flex-shrink-0 overflow-y-auto">
          {/* Classrooms Section */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-4 rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Classrooms</h3>
              {loadingLeft && <div className="h-4 w-4 border-2 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />}
            </div>
            <div className="space-y-2">
              {classrooms.length === 0 && !loadingLeft && (
                <div className="py-8 text-center bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
                   <p className="text-[10px] text-slate-600 font-black uppercase">No Channels Found</p>
                </div>
              )}
              {classrooms.map((c) => (
                <button
                  key={c._id}
                  onClick={() => selectItem('classroom', c._id)}
                  className={`group w-full flex items-center justify-between p-3 rounded-2xl transition-all duration-300 border ${
                    activeType === 'classroom' && activeId === c._id
                      ? 'bg-primary-500/10 border-primary-500/30'
                      : 'bg-slate-950/20 border-transparent hover:border-slate-700/50 hover:bg-slate-900/40'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs font-black shadow-lg ${
                      activeType === 'classroom' && activeId === c._id
                        ? 'bg-primary-500 text-slate-900'
                        : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'
                    }`}>
                      {c.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="text-left overflow-hidden">
                      <p className={`text-xs font-bold truncate ${activeType === 'classroom' && activeId === c._id ? 'text-primary-400' : 'text-slate-300'}`}>
                        {c.name}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate font-medium">#{c.subject || 'general'}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Groups Section */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-xl flex-1"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Private Groups</h3>
              <button onClick={loadLeft} className="text-[10px] font-black text-primary-500 hover:text-primary-400 uppercase tracking-widest transition-colors">Refresh</button>
            </div>
            <div className="space-y-2">
              {groups.length === 0 && !loadingLeft && (
                <div className="py-8 text-center bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
                   <p className="text-[10px] text-slate-600 font-black uppercase">No Private Groups</p>
                </div>
              )}
              {groups.map((g) => (
                <button
                  key={g._id}
                  onClick={() => selectItem('group', g._id)}
                  className={`group w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-300 border ${
                    activeType === 'group' && activeId === g._id
                      ? 'bg-indigo-500/10 border-indigo-500/30'
                      : 'bg-slate-950/20 border-transparent hover:border-slate-700/50 hover:bg-slate-900/40'
                  }`}
                >
                  <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs font-black shadow-lg ${
                    activeType === 'group' && activeId === g._id
                      ? 'bg-indigo-500 text-slate-900'
                      : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'
                  }`}>
                    {g.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="text-left overflow-hidden">
                    <p className={`text-xs font-bold truncate ${activeType === 'group' && activeId === g._id ? 'text-indigo-400' : 'text-slate-300'}`}>
                      {g.name}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate font-medium">{g.allStudents ? 'Global' : 'Secure'}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Chat Area */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 flex flex-col bg-slate-900/40 border border-slate-800 rounded-[32px] overflow-hidden backdrop-blur-xl relative"
        >
          {/* Room Header */}
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/20 flex items-center justify-between">
            <div className="flex items-center gap-4">
               {activeId ? (
                 <>
                   <div className={`h-10 w-10 rounded-2xl flex items-center justify-center text-lg font-black shadow-2xl ${
                     activeType === 'classroom' ? 'bg-primary-500 text-slate-900' : 'bg-indigo-500 text-slate-900'
                   }`}>
                     {activeItem?.name?.[0]?.toUpperCase()}
                   </div>
                   <div>
                     <h2 className="text-sm font-black text-slate-50 tracking-tight">{activeItem?.name}</h2>
                     <div className="flex items-center gap-2">
                       <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                       <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Live Channel</span>
                     </div>
                   </div>
                 </>
               ) : (
                 <div className="h-10 flex items-center">
                   <p className="text-xs text-slate-500 font-bold uppercase tracking-widest italic">Connection Pending...</p>
                 </div>
               )}
            </div>
            {activeType === 'classroom' && activeId && (
              <a
                href={`/classrooms/${activeId}/videos`}
                className="px-4 py-2 rounded-xl bg-primary-500 text-slate-900 text-[10px] font-black uppercase tracking-widest hover:bg-primary-400 transition-all shadow-lg shadow-primary-500/10"
              >
                Room Assets
              </a>
            )}
          </div>

          {/* Messages */}
          {error && <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-400 font-bold uppercase tracking-widest">{error}</div>}

          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar"
          >
            {!activeId ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                <div className="h-20 w-20 rounded-3xl bg-slate-800 flex items-center justify-center text-4xl grayscale">💬</div>
                <div className="space-y-1">
                  <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Communication Bridge Offline</p>
                  <p className="text-[10px] text-slate-600 font-bold">Select a terminal from frequency list</p>
                </div>
              </div>
            ) : messages.length === 0 && !loadingMessages ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">Channel Quiet</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {messages.map((m, i) => {
                  const isMe = user && m.author?._id === user._id;
                  const showAvatar = !isMe && (i === 0 || messages[i-1].author?._id !== m.author?._id);

                  return (
                    <motion.div
                      key={m._id}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className={`flex items-end gap-3 ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isMe && (
                        <div className="h-8 w-8 flex-shrink-0">
                           {showAvatar ? (
                             <div className="h-8 w-8 rounded-xl bg-linear-to-tr from-slate-700 to-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-black text-slate-300 shadow-xl">
                               {m.author?.username?.[0]?.toUpperCase()}
                             </div>
                           ) : (
                             <div className="w-8" />
                           )}
                        </div>
                      )}

                      <div className={`flex flex-col max-w-[70%] group ${isMe ? 'items-end' : 'items-start'}`}>
                        {showAvatar && (
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">{m.author?.username}</span>
                        )}
                        
                        <div className={`relative px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                          isMe 
                            ? 'bg-primary-500 text-slate-900 rounded-br-none font-medium' 
                            : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700 group-hover:border-slate-600 transition-colors'
                        }`}>
                          {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                          
                          {/* Attachments */}
                          {Array.isArray(m.attachments) && m.attachments.length > 0 && (
                            <div className={`mt-3 flex flex-wrap gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                              {m.attachments.map((att) => (
                                <a
                                  key={att.publicId || att.url}
                                  href={att.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="group/att block relative rounded-xl overflow-hidden border border-white/10 hover:border-white/30 transition-all shadow-xl"
                                >
                                  {att.fileType?.startsWith('image') ? (
                                    <img src={att.url} alt="" className="h-32 w-48 object-cover transition-transform duration-500 group-hover/att:scale-110" />
                                  ) : (
                                    <div className="px-4 py-3 bg-slate-900/80 backdrop-blur-md flex items-center gap-2">
                                       <span className="text-xl">📄</span>
                                       <span className="text-[10px] font-black uppercase truncate max-w-[100px]">{att.fileName}</span>
                                    </div>
                                  )}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="text-[8px] font-bold text-slate-600 uppercase mt-1 px-1">
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/20 backdrop-blur-xl">
             <form onSubmit={handleSend} className="relative bg-slate-950/40 border border-slate-800 rounded-2xl p-2 flex flex-col gap-2 focus-within:border-primary-500/50 transition-all shadow-2xl">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={activeId ? "Type an encrypted message..." : "Frequency scanning..."}
                  disabled={!activeId || sending}
                  rows={2}
                  className="w-full bg-transparent border-none focus:ring-0 text-slate-100 placeholder:text-slate-600 text-sm resize-none py-2 px-3 custom-scrollbar"
                />
                
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2 px-3 pb-2">
                    {files.map((f, idx) => (
                      <div key={idx} className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[9px] font-black text-slate-400 uppercase flex items-center gap-2">
                         <span>{f.name}</span>
                         <button type="button" onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))} className="text-rose-400 hover:text-rose-300">×</button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between px-2 pb-1">
                   <div className="flex items-center gap-1">
                      <label className="p-2 rounded-xl text-slate-400 hover:text-primary-500 hover:bg-primary-500/5 cursor-pointer transition-all">
                        <span className="text-lg">🖼️</span>
                        <input type="file" accept="image/*" multiple onChange={handleFilesChange} className="hidden" />
                      </label>
                      <button type="button" className="p-2 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-amber-500/5 transition-all">
                        <span className="text-lg">😀</span>
                      </button>
                   </div>
                   
                   <button
                    type="submit"
                    disabled={!activeId || sending || (!content.trim() && files.length === 0)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-slate-900 text-xs font-black uppercase tracking-widest disabled:opacity-30 disabled:grayscale transition-all shadow-lg shadow-primary-500/20"
                   >
                    {sending ? (
                      <div className="h-4 w-4 border-2 border-slate-900/20 border-t-slate-900 rounded-full animate-spin" />
                    ) : (
                      <>
                        SEND
                        <span className="text-base leading-none">🚀</span>
                      </>
                    )}
                   </button>
                </div>
             </form>
          </div>
        </motion.div>
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

export default Discussions;
