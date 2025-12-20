import { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';

const VIDEO_KINDS = [
  { value: 'url', label: 'Link (YouTube / Drive / any URL)' },
  { value: 'upload', label: 'Upload video file' },
];

const Classrooms = () => {
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState('');

  const [topics, setTopics] = useState([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicDescription, setNewTopicDescription] = useState('');
  const [creatingTopic, setCreatingTopic] = useState(false);

  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoKind, setVideoKind] = useState('url');
  const [videoFile, setVideoFile] = useState(null);
  const [addingVideoForTopicId, setAddingVideoForTopicId] = useState('');

  const [editingTopicId, setEditingTopicId] = useState('');
  const [editingTopicName, setEditingTopicName] = useState('');
  const [editingTopicDescription, setEditingTopicDescription] = useState('');

  const [expandedTopicId, setExpandedTopicId] = useState('');

  const [error, setError] = useState('');

  const selectedClassroom = classrooms.find((c) => c._id === selectedClassroomId);

  useEffect(() => {
    const loadClassrooms = async () => {
      try {
        setError('');
        const res = await adminAPI.getAllClassrooms();
        setClassrooms(res.data || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load classrooms');
      }
    };

    loadClassrooms();
  }, []);

  useEffect(() => {
    if (!selectedClassroomId) {
      setTopics([]);
      return;
    }

    const loadTopics = async () => {
      try {
        setLoadingTopics(true);
        setError('');
        const res = await adminAPI.getClassroomTopics(selectedClassroomId);
        setTopics(res.data || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load topics');
      } finally {
        setLoadingTopics(false);
      }
    };

    loadTopics();
  }, [selectedClassroomId]);

  const handleCreateTopic = async (e) => {
    e.preventDefault();
    if (!selectedClassroomId || !newTopicName.trim()) return;

    try {
      setCreatingTopic(true);
      setError('');
      const res = await adminAPI.createClassroomTopic(selectedClassroomId, {
        name: newTopicName.trim(),
        description: newTopicDescription.trim(),
      });
      setTopics((prev) => [res.data, ...prev]);
      setNewTopicName('');
      setNewTopicDescription('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create topic');
    } finally {
      setCreatingTopic(false);
    }
  };

  const handleVideoFileChange = (e) => {
    const file = e.target.files?.[0];
    setVideoFile(file || null);
  };

  const handleAddVideo = async (e, topicId) => {
    e.preventDefault();
    if (!selectedClassroomId || !topicId || !videoTitle.trim()) return;
    if (videoKind === 'url' && !videoUrl.trim()) return;
    if (videoKind === 'upload' && !videoFile) return;

    try {
      setAddingVideoForTopicId(topicId);
      setError('');
      const formData = new FormData();
      formData.append('title', videoTitle.trim());
      formData.append('description', videoDescription.trim());
      formData.append('kind', videoKind);
      if (videoKind === 'url') {
        formData.append('url', videoUrl.trim());
      } else if (videoKind === 'upload' && videoFile) {
        formData.append('file', videoFile);
      }

      const res = await adminAPI.addClassroomTopicVideo(
        selectedClassroomId,
        topicId,
        formData
      );

      setTopics((prev) =>
        prev.map((t) =>
          (t._id || t.id) === topicId
            ? { ...t, videos: [res.data, ...(t.videos || [])] }
            : t
        )
      );

      setVideoTitle('');
      setVideoDescription('');
      setVideoUrl('');
      setVideoFile(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add video');
    } finally {
      setAddingVideoForTopicId('');
    }
  };

  const startEditTopic = (topic) => {
    const id = topic._id || topic.id;
    setEditingTopicId(id);
    setEditingTopicName(topic.name || '');
    setEditingTopicDescription(topic.description || '');
  };

  const cancelEditTopic = () => {
    setEditingTopicId('');
    setEditingTopicName('');
    setEditingTopicDescription('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-50">Classrooms</h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Manage classroom topics and attach videos (YouTube / Drive links or uploaded files)
            so students can watch lectures topic-wise.
          </p>
        </div>
      </div>

      {error && (
        <div className="text-[11px] text-rose-400 bg-rose-500/5 border border-rose-500/30 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Classrooms list */}
        <div className="space-y-3">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-slate-50">Classrooms</h2>
              {classrooms.length === 0 && (
                <span className="text-[11px] text-slate-500">No classrooms yet.</span>
              )}
            </div>
            <div className="space-y-1 max-h-[260px] overflow-y-auto pr-1">
              {classrooms.map((c) => (
                <button
                  key={c._id}
                  onClick={() => {
                    setSelectedClassroomId(c._id);
                    setSelectedTopicId('');
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                    selectedClassroomId === c._id
                      ? 'bg-slate-900 border-primary-500/70 text-primary-100'
                      : 'bg-slate-950/60 border-slate-800 hover:bg-slate-900/80'
                  }`}
                >
                  <p className="font-medium">{c.name || 'Classroom'}</p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {c.description || 'No description'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Topics + create topic + videos inside each topic */}
        <div className="space-y-3 xl:col-span-2">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-slate-50">Topics</h2>
              {loadingTopics && (
                <span className="text-[11px] text-slate-400">Loading...</span>
              )}
            </div>

            {!selectedClassroom && (
              <p className="text-xs text-slate-500">Select a classroom to see its topics.</p>
            )}

            {selectedClassroom && (
              <>
                <form onSubmit={handleCreateTopic} className="space-y-2 mb-3">
                  <input
                    type="text"
                    value={newTopicName}
                    onChange={(e) => setNewTopicName(e.target.value)}
                    placeholder="New topic name (e.g. DBMS, JavaScript)"
                    className="w-full rounded-lg bg-slate-950/70 border border-slate-800 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/60 focus:border-primary-500/70"
                  />
                  <textarea
                    rows={2}
                    value={newTopicDescription}
                    onChange={(e) => setNewTopicDescription(e.target.value)}
                    placeholder="Short description (optional)"
                    className="w-full rounded-lg bg-slate-950/70 border border-slate-800 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/60 focus:border-primary-500/70 resize-none"
                  />
                  <button
                    type="submit"
                    disabled={creatingTopic || !newTopicName.trim()}
                    className="inline-flex items-center justify-center rounded-lg bg-primary-600 hover:bg-primary-500 disabled:opacity-60 disabled:cursor-not-allowed text-[11px] font-medium px-3 py-1.5 text-white"
                  >
                    {creatingTopic ? 'Creating...' : 'Add topic'}
                  </button>
                </form>

                <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                  {topics.length === 0 && !loadingTopics && (
                    <p className="text-xs text-slate-500">No topics yet for this classroom.</p>
                  )}
                  {topics.map((t) => {
                    const id = t._id || t.id;
                    const isExpanded = expandedTopicId === id;
                    return (
                      <div
                        key={id}
                        className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950/70 text-xs space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            {editingTopicId === id ? (
                              <>
                                <input
                                  type="text"
                                  value={editingTopicName}
                                  onChange={(e) => setEditingTopicName(e.target.value)}
                                  className="w-full rounded-lg bg-slate-950/70 border border-slate-800 px-2 py-1 text-[11px] mb-1 focus:outline-none focus:ring-1 focus:ring-primary-500/60 focus:border-primary-500/70"
                                />
                                <textarea
                                  rows={2}
                                  value={editingTopicDescription}
                                  onChange={(e) => setEditingTopicDescription(e.target.value)}
                                  className="w-full rounded-lg bg-slate-950/70 border border-slate-800 px-2 py-1 text-[11px] resize-none focus:outline-none focus:ring-1 focus:ring-primary-500/60 focus:border-primary-500/70"
                                />
                              </>
                            ) : (
                              <>
                                <p className="font-medium text-slate-50 truncate">{t.name}</p>
                                {t.description && (
                                  <p className="text-[11px] text-slate-400 truncate">{t.description}</p>
                                )}
                              </>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] text-slate-500">
                              {(t.videos || []).length} videos
                            </span>
                            <div className="flex gap-1">
                              {editingTopicId === id ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={cancelEditTopic}
                                    className="px-2 py-0.5 rounded-lg border border-slate-700 text-[10px] text-slate-200 hover:bg-slate-800/80"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!editingTopicName.trim()}
                                    className="px-2 py-0.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-[10px] text-white disabled:opacity-60"
                                  >
                                    Save
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => startEditTopic(t)}
                                  className="px-2 py-0.5 rounded-lg border border-slate-700 text-[10px] text-slate-200 hover:bg-slate-800/80"
                                >
                                  Edit
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedTopicId(isExpanded ? '' : id)
                                }
                                className="px-2 py-0.5 rounded-lg border border-primary-500/70 text-[10px] text-primary-200 hover:bg-primary-500/10"
                              >
                                {isExpanded ? 'Hide videos' : 'Show / add videos'}
                              </button>
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <>
                            {/* Add video form for this topic */}
                            <form
                              onSubmit={(e) => handleAddVideo(e, id)}
                              className="space-y-1 border-t border-slate-800 pt-2 mt-2"
                            >
                              <input
                                type="text"
                                value={videoTitle}
                                onChange={(e) => setVideoTitle(e.target.value)}
                                placeholder="Video title (e.g. Lecture 1 – ER Model)"
                                className="w-full rounded-lg bg-slate-950/70 border border-slate-800 px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary-500/60 focus:border-primary-500/70"
                              />
                              <textarea
                                rows={2}
                                value={videoDescription}
                                onChange={(e) => setVideoDescription(e.target.value)}
                                placeholder="Short description (optional)"
                                className="w-full rounded-lg bg-slate-950/70 border border-slate-800 px-2 py-1 text-[11px] resize-none focus:outline-none focus:ring-1 focus:ring-primary-500/60 focus:border-primary-500/70"
                              />
                              <div className="flex flex-col gap-1">
                                <select
                                  value={videoKind}
                                  onChange={(e) => {
                                    setVideoKind(e.target.value);
                                    setVideoUrl('');
                                    setVideoFile(null);
                                  }}
                                  className="rounded-lg bg-slate-950/70 border border-slate-800 px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary-500/60 focus:border-primary-500/70"
                                >
                                  {VIDEO_KINDS.map((k) => (
                                    <option key={k.value} value={k.value}>
                                      {k.label}
                                    </option>
                                  ))}
                                </select>

                                {videoKind === 'url' && (
                                  <input
                                    type="text"
                                    value={videoUrl}
                                    onChange={(e) => setVideoUrl(e.target.value)}
                                    placeholder="Paste YouTube / Drive / any video link here"
                                    className="w-full rounded-lg bg-slate-950/70 border border-slate-800 px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary-500/60 focus:border-primary-500/70"
                                  />
                                )}

                                {videoKind === 'upload' && (
                                  <label className="inline-flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                                    <span className="px-2 py-1 rounded-lg border border-slate-700 bg-slate-900/70">
                                      {videoFile ? videoFile.name : 'Choose video file'}
                                    </span>
                                    <input
                                      type="file"
                                      accept="video/*"
                                      onChange={handleVideoFileChange}
                                      className="hidden"
                                    />
                                  </label>
                                )}
                              </div>

                              <button
                                type="submit"
                                disabled={
                                  addingVideoForTopicId === id ||
                                  !videoTitle.trim() ||
                                  (videoKind === 'url' && !videoUrl.trim()) ||
                                  (videoKind === 'upload' && !videoFile)
                                }
                                className="mt-1 inline-flex items-center justify-center rounded-lg bg-primary-600 hover:bg-primary-500 disabled:opacity-60 disabled:cursor-not-allowed text-[11px] font-medium px-3 py-1.5 text-white"
                              >
                                {addingVideoForTopicId === id ? 'Adding video...' : 'Add video'}
                              </button>
                            </form>

                            {/* Videos list */}
                            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto pr-1">
                              {(t.videos || []).length === 0 && (
                                <p className="text-[11px] text-slate-500">
                                  No videos added for this topic yet.
                                </p>
                              )}
                              {(t.videos || []).map((v) => (
                                <div
                                  key={v._id || v.id || v.title + v.url}
                                  className="border border-slate-800 rounded-lg bg-slate-950/80 px-2 py-1 text-[11px] flex flex-col gap-1"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-slate-50 truncate">{v.title}</p>
                                      {v.description && (
                                        <p className="text-[10px] text-slate-400 truncate">{v.description}</p>
                                      )}
                                    </div>
                                    <span className="px-2 py-0.5 rounded-full text-[9px] bg-slate-900 border border-slate-700 text-slate-300">
                                      {v.kind === 'upload' ? 'Upload' : 'Link'}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[9px] text-slate-500 truncate">{v.url}</span>
                                    <a
                                      href={v.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[10px] px-2 py-0.5 rounded-lg border border-primary-500/70 text-primary-200 hover:bg-primary-500/10 whitespace-nowrap"
                                    >
                                      Open
                                    </a>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Classrooms;
