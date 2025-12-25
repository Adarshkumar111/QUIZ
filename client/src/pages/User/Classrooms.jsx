import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { userAPI } from '../../services/api';

// Helper function to get relative time
const getRelativeTime = (date) => {
  const now = new Date();
  const then = new Date(date);
  const diff = now - then;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;
  return `${years}y ago`;
};

const Classrooms = () => {
  const [allTopics, setAllTopics] = useState([]);
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const selectedTopic = useMemo(
    () => allTopics.find((t) => (t._id || t.id) === selectedTopicId),
    [allTopics, selectedTopicId]
  );

  const loadAllPublishedTopics = async () => {
    try {
      setLoading(true);
      setError('');
      // Get all published topics from all classrooms
      const res = await userAPI.getAllPublishedTopics();
      const topics = res.data || [];
      setAllTopics(topics);
      
      // Auto-select first topic
      if (!selectedTopicId && topics.length > 0) {
        const first = topics[0];
        setSelectedTopicId(first._id || first.id);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllPublishedTopics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter topics based on search
  const filteredTopics = useMemo(() => {
    if (!search) return allTopics;
    const q = search.toLowerCase();
    return allTopics.filter((t) =>
      t.name?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      (t.videos || []).some(v => 
        v.title?.toLowerCase().includes(q) ||
        v.description?.toLowerCase().includes(q)
      )
    );
  }, [allTopics, search]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">Learning Videos</p>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-50">Published Playlists</h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Watch all published video playlists from your teachers. Click to expand and watch.
          </p>
        </div>
        <div className="w-full md:w-auto flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search playlists or videos..."
            className="flex-1 md:w-64 rounded-lg bg-slate-950/70 border border-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/60 focus:border-primary-500/70"
          />
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-xs text-rose-400 bg-rose-500/5 border border-rose-500/30 rounded-lg px-4 py-3"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Topics list */}
        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-slate-900/90 to-slate-900/50 border border-slate-800 rounded-xl p-4 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-50">Playlists</h2>
              {loading && (
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
              )}
            </div>
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {filteredTopics.length === 0 && !loading && (
                <p className="text-sm text-slate-500 text-center py-8">
                  {search ? 'No playlists match your search' : 'No published playlists yet'}
                </p>
              )}
              <AnimatePresence>
                {filteredTopics.map((t, idx) => (
                  <motion.button
                    key={t._id || t.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => setSelectedTopicId(t._id || t.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                      selectedTopicId === (t._id || t.id)
                        ? 'bg-slate-900 border-primary-500/70 text-primary-100 shadow-lg shadow-primary-500/20'
                        : 'bg-slate-950/60 border-slate-800 hover:bg-slate-900/80 hover:border-slate-700'
                    }`}
                  >
                    <p className="font-medium text-slate-50">{t.name}</p>
                    {t.description && (
                      <p className="text-xs text-slate-400 truncate mt-1">{t.description}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-1.5">
                      {(t.videos || []).length} {(t.videos || []).length === 1 ? 'video' : 'videos'}
                    </p>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* Videos Grid */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-slate-900/90 to-slate-900/50 border border-slate-800 rounded-xl p-5 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-50">Videos</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedTopic ? selectedTopic.name : 'Select a playlist to view videos'}
                </p>
              </div>
            </div>

            {selectedTopic && (selectedTopic.videos || []).length === 0 && !loading && (
              <p className="text-sm text-slate-500 text-center py-8">No videos in this playlist yet.</p>
            )}

            {!selectedTopic && filteredTopics.length > 0 && (
              <p className="text-sm text-slate-500 text-center py-8">Choose a playlist from the left to watch videos.</p>
            )}

            {filteredTopics.length === 0 && !loading && (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-slate-400 mt-3">No published content available</p>
              </div>
            )}

            {selectedTopic && (selectedTopic.videos || []).length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <AnimatePresence>
                  {(selectedTopic.videos || []).map((v, idx) => (
                    <motion.div
                      key={v._id || v.id || v.title + v.url}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2, delay: idx * 0.05 }}
                      className="group relative bg-slate-950/80 border border-slate-800 rounded-lg overflow-hidden hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/10 transition-all"
                    >
                      {/* Video Thumbnail */}
                      <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center relative overflow-hidden">
                        <svg className="w-12 h-12 text-slate-600 group-hover:text-primary-500 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                        </svg>
                        <div className="absolute top-2 right-2">
                          <span className="px-2 py-1 rounded-md text-[10px] bg-slate-950/80 border border-slate-700 text-slate-300">
                            {v.kind === 'upload' ? 'Uploaded' : 'Link'}
                          </span>
                        </div>
                        {v.createdAt && (
                          <div className="absolute bottom-2 left-2">
                            <span className="px-2 py-1 rounded-md text-[10px] bg-slate-950/80 border border-slate-700 text-slate-400">
                              {getRelativeTime(v.createdAt)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Video Info */}
                      <div className="p-3">
                        <h5 className="text-sm font-medium text-slate-100 mb-2 line-clamp-2">{v.title}</h5>
                        {v.description && (
                          <p className="text-xs text-slate-400 mb-2 line-clamp-2">{v.description}</p>
                        )}
                        <a
                          href={v.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block w-full text-center text-sm px-3 py-2 rounded-lg bg-primary-600/20 border border-primary-500/50 text-primary-200 hover:bg-primary-500/30 transition-all"
                        >
                          Watch Video
                        </a>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default Classrooms;
