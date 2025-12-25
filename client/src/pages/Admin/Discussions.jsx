import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminAPI, userAPI } from '../../services/api';
import socketService from '../../services/socket';
import useAuthStore from '../../store/authStore';

const AdminDiscussions = () => {
  const user = useAuthStore((s) => s.user);
  const [classrooms, setClassrooms] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeType, setActiveType] = useState('classroom'); // classroom | group
  const [activeId, setActiveId] = useState('');
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupAllStudents, setGroupAllStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

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
      setLoadingRooms(true);
      const [cRes, gRes] = await Promise.all([
        adminAPI.getAllClassrooms(),
        adminAPI.getGroups(),
      ]);
      setClassrooms(cRes.data || []);
      setGroups(gRes.data?.groups || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load classrooms');
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    loadLeft();
  }, []);

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
    } finally {
      setLoadingMessages(false);
    }
  };

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
      files.forEach((file) => formData.append('attachments', file));

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

  const loadStudents = async () => {
    try {
      setError('');
      const res = await adminAPI.getGroupStudents(
        studentSearch ? { search: studentSearch } : undefined
      );
      setStudents(res.data?.students || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load students');
    }
  };

  useEffect(() => {
    if (!showCreateGroup) return;
    loadStudents();
  }, [showCreateGroup]);

  const toggleStudent = (id) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const createGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    try {
      setCreatingGroup(true);
      setError('');

      await adminAPI.createGroup({
        name: groupName.trim(),
        allStudents: groupAllStudents,
        members: groupAllStudents ? [] : selectedStudentIds,
      });

      const gRes = await adminAPI.getGroups();
      setGroups(gRes.data?.groups || []);

      setShowCreateGroup(false);
      setGroupName('');
      setGroupAllStudents(false);
      setStudentSearch('');
      setStudents([]);
      setSelectedStudentIds([]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create group');
    } finally {
      setCreatingGroup(false);
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-50 tracking-tight">Admin Discussion Control</h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Manage and interact with all discussion channels</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">
        {/* Sidebar */}
        <div className="w-full lg:w-80 flex flex-col gap-4 flex-shrink-0 overflow-y-auto custom-scrollbar">
          {/* Classrooms Section */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-4 rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Live Classrooms</h3>
              {loadingRooms && <div className="h-4 w-4 border-2 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />}
            </div>
            <div className="space-y-2">
              {classrooms.map((c) => (
                <button
                  key={c._id}
                  onClick={() => selectItem('classroom', c._id)}
                  className={`group w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-300 border ${
                    activeType === 'classroom' && activeId === c._id
                      ? 'bg-primary-500/10 border-primary-500/30'
                      : 'bg-slate-950/20 border-transparent hover:border-slate-700/50 hover:bg-slate-900/40'
                  }`}
                >
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
                    <p className="text-[10px] text-slate-500 truncate font-medium">Classroom Channel</p>
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
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Custom Groups</h3>
              <button
                onClick={() => setShowCreateGroup(true)}
                className="px-2 py-1 rounded-lg bg-primary-500 text-slate-900 text-[9px] font-black uppercase tracking-widest hover:bg-primary-400 transition-all shadow-lg shadow-primary-500/10"
              >
                + NEW
              </button>
            </div>
            <div className="space-y-2">
              {groups.length === 0 && (
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
                    <p className="text-[10px] text-slate-500 truncate font-medium">
                       {g.allStudents ? 'Global Access' : `Secure [${g.membersCount || 0}]`}
                    </p>
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
                       <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Administrator Oversight</span>
                     </div>
                   </div>
                 </>
               ) : (
                 <div className="h-10 flex items-center">
                   <p className="text-xs text-slate-500 font-bold uppercase tracking-widest italic">Terminal Standby...</p>
                 </div>
               )}
            </div>
            {activeId && (
              <div className="flex items-center gap-3">
                 <span className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                   SECURE CHANNEL
                 </span>
              </div>
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
                <div className="h-20 w-20 rounded-3xl bg-slate-800 flex items-center justify-center text-4xl grayscale">🛡️</div>
                <div className="space-y-1">
                  <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Admin Hub Standby</p>
                  <p className="text-[10px] text-slate-600 font-bold">Monitor student interactions in real-time</p>
                </div>
              </div>
            ) : messages.length === 0 && !loadingMessages ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">No Recorded Activity</p>
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
                          <div className="flex items-center gap-2 mb-1 ml-1">
                             <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{m.author?.username}</span>
                             {m.author?.role === 'admin' && (
                               <span className="px-1 py-0.5 rounded bg-amber-500/20 text-amber-500 text-[7px] font-black uppercase tracking-tighter">STAFF</span>
                             )}
                          </div>
                        )}
                        
                        <div className={`relative px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                          isMe 
                            ? 'bg-amber-500 text-slate-900 rounded-br-none font-medium' 
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
             <form onSubmit={handleSend} className="relative bg-slate-950/40 border border-slate-800 rounded-2xl p-2 flex flex-col gap-2 focus-within:border-amber-500/50 transition-all shadow-2xl">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={activeId ? "Type an authoritative message..." : "Channel selection required..."}
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
                      <label className="p-2 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-amber-500/5 cursor-pointer transition-all">
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
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-900 text-xs font-black uppercase tracking-widest disabled:opacity-30 disabled:grayscale transition-all shadow-lg shadow-amber-500/20"
                   >
                    {sending ? (
                      <div className="h-4 w-4 border-2 border-slate-900/20 border-t-slate-900 rounded-full animate-spin" />
                    ) : (
                      <>
                        POST
                        <span className="text-base leading-none">📢</span>
                      </>
                    )}
                   </button>
                </div>
             </form>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showCreateGroup && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/20">
                <div>
                   <p className="text-sm font-black text-slate-50 tracking-tight uppercase">Construct Secure Group</p>
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Initialize a custom discussion frequency</p>
                </div>
                <button
                  onClick={() => setShowCreateGroup(false)}
                  className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                  ×
                </button>
              </div>

              <form onSubmit={createGroup} className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-6">
                      <div>
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Group Identifier</label>
                        <input
                          value={groupName}
                          onChange={(e) => setGroupName(e.target.value)}
                          className="w-full bg-slate-950/40 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-amber-500/50 transition-all"
                          placeholder="e.g. CORE COMMITTEE"
                        />
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800">
                        <label className="flex items-center gap-4 cursor-pointer group">
                          <div className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                             groupAllStudents ? 'bg-amber-500 border-amber-500' : 'border-slate-700 group-hover:border-slate-500'
                          }`}>
                             {groupAllStudents && <span className="text-slate-900 text-xs font-black">✓</span>}
                          </div>
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={groupAllStudents}
                            onChange={(e) => setGroupAllStudents(e.target.checked)}
                          />
                          <div>
                             <p className="text-xs font-black text-slate-300 uppercase">Universal Broadcast</p>
                             <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Include all registered students automatically</p>
                          </div>
                        </label>
                      </div>
                   </div>

                   {!groupAllStudents && (
                    <div className="space-y-4">
                      <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block">Select Members</label>
                      <div className="flex items-center gap-2">
                        <input
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), loadStudents())}
                          className="flex-1 bg-slate-950/40 border border-slate-800 rounded-2xl px-4 py-2 text-xs text-slate-100 focus:outline-none"
                          placeholder="Search database..."
                        />
                        <button
                          type="button"
                          onClick={loadStudents}
                          className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-2xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all border border-slate-700"
                        >
                          🔍
                        </button>
                      </div>

                      <div className="h-40 overflow-y-auto border border-slate-800 rounded-2xl bg-slate-950/20 custom-scrollbar pr-1">
                        {students.map((s) => (
                          <label
                            key={s._id}
                            className={`flex items-center justify-between px-4 py-3 border-b border-slate-800/50 last:border-b-0 cursor-pointer hover:bg-white/5 transition-all ${
                               selectedStudentIds.includes(s._id) ? 'bg-amber-500/5' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3">
                               <div className="h-6 w-6 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase">{s.username[0]}</div>
                               <span className="text-xs font-bold text-slate-300">{s.username}</span>
                            </div>
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500/20 bg-transparent"
                              checked={selectedStudentIds.includes(s._id)}
                              onChange={() => toggleStudent(s._id)}
                            />
                          </label>
                        ))}
                        {students.length === 0 && (
                          <div className="h-full flex items-center justify-center p-4">
                            <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest italic text-center">No students found in search results</p>
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase text-right">
                        Selection: {selectedStudentIds.length} ENTRIES
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4">
                   <div className="flex items-center gap-4 text-slate-500">
                      <div className="flex -space-x-3 overflow-hidden">
                         {[1,2,3].map(i => <div key={i} className="inline-block h-6 w-6 rounded-full ring-2 ring-slate-900 bg-slate-800 border border-slate-700" />)}
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-widest">Protocol validation active</span>
                   </div>
                   
                   <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowCreateGroup(false)}
                      className="px-6 py-2.5 rounded-xl border border-slate-800 text-slate-400 text-[10px] font-black uppercase hover:border-slate-600 transition-all"
                    >
                      ABORT
                    </button>
                    <button
                      type="submit"
                      disabled={creatingGroup || !groupName.trim()}
                      className="px-8 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-900 text-[10px] font-black uppercase tracking-widest disabled:opacity-30 transition-all shadow-xl shadow-amber-500/20"
                    >
                      {creatingGroup ? 'INITIALIZING...' : 'INITIALIZE GROUP'}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}} />
    </div>
  );
};

export default AdminDiscussions;
