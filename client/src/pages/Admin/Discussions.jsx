import { useEffect, useMemo, useState } from 'react';
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

  const activeTitle = useMemo(() => {
    if (!activeId) return '';
    if (activeType === 'classroom') {
      return classrooms.find((c) => c._id === activeId)?.name || 'Classroom';
    }
    return groups.find((g) => g._id === activeId)?.name || 'Group';
  }, [activeId, activeType, classrooms, groups]);

  useEffect(() => {
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

      if (activeType === 'classroom') {
        await userAPI.postMessage(activeId, formData);
      } else {
        await userAPI.postGroupMessage(activeId, formData);
      }
      setContent('');
      setFiles([]);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-50">Discussions</h1>
          <p className="text-sm text-slate-400 mt-1">
            Group discussion space where students and admins can interact and clarify doubts.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-3">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-50">Classrooms</h2>
              {loadingRooms && (
                <span className="text-[11px] text-slate-400">Loading...</span>
              )}
            </div>
            <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
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
                    {c.description || 'Classroom discussion'}
                  </p>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Each classroom acts as a group where all enrolled students and admins can chat.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-50">Groups</h2>
              <button
                onClick={() => setShowCreateGroup(true)}
                className="text-[11px] px-2 py-1 rounded-md border border-slate-700 bg-slate-900/60 text-slate-200 hover:border-primary-500/70"
              >
                + Create
              </button>
            </div>
            <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
              {groups.length === 0 && (
                <p className="text-xs text-slate-500">No groups yet.</p>
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
                  <p className="font-medium">{g.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {g.allStudents ? 'All students' : `Members: ${g.membersCount ?? 0}`}
                  </p>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Only users added to a group will see it.
            </p>
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="border-b border-slate-800 px-4 py-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-50">
              {activeId ? `${activeTitle} (${activeType})` : 'Select a classroom or group'}
            </p>
            {loadingMessages && activeId && (
              <span className="text-[11px] text-slate-400">Loading messages...</span>
            )}
          </div>

          {error && (
            <div className="px-4 pt-3 text-xs text-rose-400">
              {error}
            </div>
          )}

          <div className="flex-1 min-h-[260px] max-h-[420px] overflow-y-auto px-4 py-3 space-y-3">
            {!activeId && (
              <p className="text-sm text-slate-500">
                Choose a classroom or group on the left to join its discussion.
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

          <form
            onSubmit={handleSend}
            className="border-t border-slate-800 px-4 py-3 flex flex-col gap-2"
          >
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
                {files.length > 0 && (
                  <span>{files.length} file(s) selected</span>
                )}
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

      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-50">Create Group</p>
              <button
                onClick={() => setShowCreateGroup(false)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Close
              </button>
            </div>
            <form onSubmit={createGroup} className="p-4 space-y-4">
              <div>
                <label className="text-xs text-slate-400">Group name</label>
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="mt-1 w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="e.g. Users"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={groupAllStudents}
                  onChange={(e) => setGroupAllStudents(e.target.checked)}
                />
                Add all students
              </label>

              {!groupAllStudents && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="flex-1 bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      placeholder="Search student username"
                    />
                    <button
                      type="button"
                      onClick={loadStudents}
                      className="px-3 py-2 rounded-lg text-xs border border-slate-700 text-slate-200 hover:border-primary-500/70"
                    >
                      Search
                    </button>
                  </div>

                  <div className="max-h-[260px] overflow-y-auto border border-slate-800 rounded-lg">
                    {students.map((s) => (
                      <label
                        key={s._id}
                        className="flex items-center justify-between px-3 py-2 border-b border-slate-800 last:border-b-0 text-sm"
                      >
                        <span className="text-slate-200">{s.username}</span>
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(s._id)}
                          onChange={() => toggleStudent(s._id)}
                        />
                      </label>
                    ))}
                    {students.length === 0 && (
                      <div className="px-3 py-3 text-xs text-slate-500">
                        No students found.
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Selected: {selectedStudentIds.length}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateGroup(false)}
                  className="px-3 py-2 rounded-lg text-xs border border-slate-700 text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingGroup || !groupName.trim()}
                  className="px-3 py-2 rounded-lg text-xs bg-primary-600 hover:bg-primary-500 text-white disabled:opacity-60"
                >
                  {creatingGroup ? 'Creating...' : 'Create group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDiscussions;
