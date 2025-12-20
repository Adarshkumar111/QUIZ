import { useEffect, useMemo, useState } from 'react';
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

  const activeTitle = useMemo(() => {
    if (!activeId) return '';
    if (activeType === 'classroom') {
      return classrooms.find((c) => c._id === activeId)?.name || 'Classroom';
    }
    return groups.find((g) => g._id === activeId)?.name || 'Group';
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

      if (activeType === 'classroom') {
        await userAPI.postMessage(activeId, formData);
      } else {
        await userAPI.postGroupMessage(activeId, formData);
      }

      setContent('');
      setFiles([]);
      // optimistic socket should add; but keep consistent
      await loadMessages({ type: activeType, id: activeId });
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-50">Discussions</h1>
        <p className="text-sm text-slate-400 mt-1">
          Chat in classrooms and groups. You only see groups you are added to.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-3">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-slate-50">Classrooms</h2>
              {loadingLeft && <span className="text-[11px] text-slate-400">Loading...</span>}
            </div>
            <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
              {classrooms.length === 0 && !loadingLeft && (
                <p className="text-xs text-slate-500">No classrooms found.</p>
              )}
              {classrooms.map((c) => (
                <button
                  key={c._id}
                  onClick={() => selectItem('classroom', c._id)}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                    activeType === 'classroom' && activeId === c._id
                      ? 'bg-slate-900 border-primary-500/70 text-primary-100'
                      : 'bg-slate-950/60 border-slate-800 hover:bg-slate-900/80'
                  }`}
                >
                  <p className="font-medium">{c.name || 'Classroom'}</p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {c.description || 'Group chat for this classroom'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-slate-50">My Groups</h2>
              <button
                onClick={loadLeft}
                className="text-[11px] text-primary-200 hover:text-primary-100"
              >
                Refresh
              </button>
            </div>
            <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
              {groups.length === 0 && !loadingLeft && (
                <p className="text-xs text-slate-500">No groups assigned yet.</p>
              )}
              {groups.map((g) => (
                <button
                  key={g._id}
                  onClick={() => selectItem('group', g._id)}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                    activeType === 'group' && activeId === g._id
                      ? 'bg-slate-900 border-primary-500/70 text-primary-100'
                      : 'bg-slate-950/60 border-slate-800 hover:bg-slate-900/80'
                  }`}
                >
                  <p className="font-medium">{g.name || 'Group'}</p>
                  <p className="text-[11px] text-slate-400">
                    {g.allStudents ? 'All students' : 'Private group'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
          <div className="border-b border-slate-800 px-4 py-3 flex items-center justify-between bg-slate-900/80">
            <div>
              <p className="text-sm font-semibold text-slate-50">
                {activeId ? activeTitle : 'No room selected'}
              </p>
              <p className="text-[11px] text-slate-400">
                {activeId
                  ? activeType === 'classroom'
                    ? 'Classroom discussion'
                    : 'Private/group discussion'
                  : 'Choose a classroom or group from the left to start chatting.'}
              </p>
            </div>
            {loadingMessages && activeId && (
              <span className="text-[11px] text-slate-400">Loading messages...</span>
            )}
          </div>

          {error && (
            <div className="px-4 pt-2 text-[11px] text-rose-400 border-b border-slate-800 bg-slate-950/40">
              {error}
            </div>
          )}

          <div className="flex-1 min-h-[260px] max-h-[520px] overflow-y-auto px-4 py-3 space-y-2 bg-slate-950/40">
            {!activeId && (
              <p className="text-sm text-slate-500">
                Choose a classroom or a group from the left.
              </p>
            )}

            {activeId && messages.length === 0 && !loadingMessages && (
              <p className="text-sm text-slate-500">No messages yet. Start the conversation!</p>
            )}

            {messages.map((m) => {
              const isMe = user && m.author && m.author._id === user._id;
              return (
                <div
                  key={m._id}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-3 py-2 text-xs shadow-sm border ${
                      isMe
                        ? 'bg-primary-600/90 border-primary-500/80 text-white'
                        : 'bg-slate-950/80 border-slate-800 text-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {!isMe && (
                          <div className="h-6 w-6 rounded-full bg-linear-to-tr from-primary-500 to-secondary-500 flex items-center justify-center text-[10px] font-semibold">
                            {m.author?.username?.[0]?.toUpperCase?.() || '?'}
                          </div>
                        )}
                        <span className="font-medium text-[11px]">
                          {isMe ? 'You' : m.author?.username || 'User'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 ml-3 whitespace-nowrap">
                        {m.createdAt ? new Date(m.createdAt).toLocaleTimeString() : ''}
                      </span>
                    </div>
                    {m.content && (
                      <p className="text-xs whitespace-pre-wrap wrap-break-word leading-relaxed">
                        {m.content}
                      </p>
                    )}
                    {Array.isArray(m.attachments) && m.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {m.attachments.map((att) => (
                          <a
                            key={att.publicId || att.url}
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block border border-slate-700 rounded-md overflow-hidden max-w-[140px] max-h-[110px] bg-slate-900"
                          >
                            {att.fileType?.startsWith('image') ? (
                              <img
                                src={att.url}
                                alt={att.fileName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="p-2 text-[10px] text-slate-200 truncate">
                                {att.fileName || 'Attachment'}
                              </div>
                            )}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <form onSubmit={handleSend} className="border-t border-slate-800 px-4 py-3 flex flex-col gap-2">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={activeId ? 'Type your message...' : 'Select a room to start chatting'}
              disabled={!activeId || sending}
              rows={2}
              className="w-full bg-slate-950/70 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-60"
            />
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <span className="px-2 py-1 rounded-md border border-slate-700 bg-slate-900/60 text-slate-200 text-[11px]">
                    Attach image
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFilesChange}
                    className="hidden"
                  />
                </label>
                {files.length > 0 && <span>{files.length} file(s) selected</span>}
              </div>
              <button
                type="submit"
                disabled={!activeId || sending || (!content.trim() && files.length === 0)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-600 hover:bg-primary-500 text-white disabled:opacity-60"
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Discussions;
