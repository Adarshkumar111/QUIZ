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



  const handleDeleteTopic = async (topicId) => {
    if (!selectedClassroomId || !confirm('Are you sure you want to delete this topic?')) return;
    try {
      setError('');
      await adminAPI.deleteClassroomTopic(selectedClassroomId, topicId);
      setTopics((prev) => prev.filter((t) => (t._id || t.id) !== topicId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete topic');
    }
  };

  const handleRemoveVideo = async (topicId, videoId) => {
    if (!selectedClassroomId || !confirm('Are you sure you want to remove this video?')) return;
    try {
      setError('');
      await adminAPI.removeClassroomTopicVideo(selectedClassroomId, topicId, videoId);
      setTopics((prev) =>
        prev.map((t) =>
          (t._id || t.id) === topicId
            ? { ...t, videos: (t.videos || []).filter((v) => (v._id || v.id) !== videoId) }
            : t
        )
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove video');
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
            Manage classroom topics (playlists) and attach videos. directly upload or link videos.
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
              <h2 className="text-sm font-semibold text-slate-50">Topics (Playlists)</h2>
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
                    {creatingTopic ? 'Creating...' : 'Add Topic (Playlist)'}
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
                                <>
                                 <button
                                    type="button"
                                    onClick={() => handleDeleteTopic(id)}
                                    className="px-2 py-0.5 rounded-lg border border-red-500/20 text-[10px] text-red-400 hover:bg-red-500/10"
                                  >
                                    Delete
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => startEditTopic(t)}
                                    className="px-2 py-0.5 rounded-lg border border-slate-700 text-[10px] text-slate-200 hover:bg-slate-800/80"
                                  >
                                    Edit
                                  </button>
                                </>
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
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] text-slate-400 ml-1">Add to Playlist</label>
                                <input
                                  type="text"
                                  value={videoTitle}
                                  onChange={(e) => setVideoTitle(e.target.value)}
                                  placeholder="Video title"
                                  className="w-full rounded-lg bg-slate-950/70 border border-slate-800 px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary-500/60 focus:border-primary-500/70"
                                />
                                <div className="flex gap-2">
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
                                   <button
                                    type="submit"
                                    disabled={
                                      addingVideoForTopicId === id ||
                                      !videoTitle.trim() ||
                                      (videoKind === 'url' && !videoUrl.trim()) ||
                                      (videoKind === 'upload' && !videoFile)
                                    }
                                    className="inline-flex items-center justify-center rounded-lg bg-primary-600 hover:bg-primary-500 disabled:opacity-60 disabled:cursor-not-allowed text-[11px] font-medium px-3 py-1 text-white ml-auto"
                                  >
                                    {addingVideoForTopicId === id ? 'Adding...' : 'Add Video'}
                                  </button>
                                </div>
                                
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
                                  <label className="inline-flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer border border-dashed border-slate-700 rounded-lg p-2 bg-slate-900/40 hover:bg-slate-900/60 transition-colors">
                                    <span className={!videoFile ? "text-slate-400" : "text-emerald-400"}>
                                      {videoFile ? `Selected: ${videoFile.name}` : 'Click to upload video file'}
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
                            </form>

                            {/* Videos list */}
                            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto pr-1">
                              {(t.videos || []).length === 0 && (
                                <p className="text-[11px] text-slate-500">
                                  No videos added (Playlist empty).
                                </p>
                              )}
                              {(t.videos || []).map((v, idx) => (
                                <div
                                  key={v._id || v.id || idx}
                                  className="border border-slate-800 rounded-lg bg-slate-950/80 px-2 py-1 text-[11px] flex flex-col gap-1 hover:border-slate-700 transition-colors"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-slate-50 truncate">{idx + 1}. {v.title}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded-full text-[9px] bg-slate-900 border border-slate-700 text-slate-300">
                                          {v.kind === 'upload' ? 'Upload' : 'Link'}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveVideo(id, v._id || v.id)}
                                            className="text-red-400 hover:text-red-300 p-0.5"
                                            title="Remove video"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                              <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[9px] text-slate-500 truncate">{v.url}</span>
                                    <a
                                      href={v.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[10px] px-2 py-0.5 rounded-lg border border-primary-500/70 text-primary-200 hover:bg-primary-500/10 whitespace-nowrap"
                                    >
                                      Watch
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
