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
      const res = await userAPI.getAllPublishedTopics();
      const topics = res.data || [];
      setAllTopics(topics);
      
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8"
      >
        {/* Header Section with Gradient */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center space-y-4"
        >
          <div className="inline-block">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative"
            >
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                Learning Videos
              </h1>
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400/20 via-blue-500/20 to-purple-600/20 blur-2xl -z-10"></div>
            </motion.div>
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-slate-400 text-lg max-w-2xl mx-auto"
          >
            Explore curated playlists and master new skills with our video collection
          </motion.p>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="max-w-2xl mx-auto"
          >
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all"></div>
              <div className="relative flex items-center gap-3 bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl px-6 py-4 hover:border-slate-600/50 transition-all">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search for playlists, topics, or videos..."
                  className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none text-base"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="text-slate-400 hover:text-slate-300 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto bg-rose-500/10 border border-rose-500/30 rounded-2xl px-6 py-4 backdrop-blur-xl"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-rose-300">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Playlists Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-4 xl:col-span-3"
          >
            <div className="sticky top-6 space-y-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all"></div>
                <div className="relative bg-slate-900/60 backdrop-blur-2xl border border-slate-700/50 rounded-2xl p-6 hover:border-slate-600/50 transition-all">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 animate-pulse"></span>
                      Playlists
                    </h2>
                    {loading && (
                      <div className="w-5 h-5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"></div>
                    )}
                  </div>

                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {filteredTopics.length === 0 && !loading && (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center">
                          <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <p className="text-sm text-slate-500">
                          {search ? 'No matching playlists' : 'No playlists yet'}
                        </p>
                      </div>
                    )}

                    <AnimatePresence>
                      {filteredTopics.map((t, idx) => (
                        <motion.button
                          key={t._id || t.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ delay: idx * 0.05 }}
                          onClick={() => setSelectedTopicId(t._id || t.id)}
                          className={`w-full group relative overflow-hidden rounded-xl p-4 text-left transition-all duration-300 ${
                            selectedTopicId === (t._id || t.id)
                              ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-2 border-cyan-500/50 shadow-lg shadow-cyan-500/20'
                              : 'bg-slate-800/40 border-2 border-slate-700/50 hover:border-slate-600/50 hover:bg-slate-800/60'
                          }`}
                        >
                          <div className={`absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity ${
                            selectedTopicId === (t._id || t.id) ? 'opacity-100' : ''
                          }`}></div>
                          
                          <div className="relative">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <h3 className="font-medium text-slate-100 flex-1 line-clamp-2">{t.name}</h3>
                              {selectedTopicId === (t._id || t.id) && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center flex-shrink-0"
                                >
                                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                </motion.div>
                              )}
                            </div>
                            {t.description && (
                              <p className="text-xs text-slate-400 line-clamp-2 mb-2">{t.description}</p>
                            )}
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                                </svg>
                                <span>{(t.videos || []).length} videos</span>
                              </div>
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Videos Grid */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="lg:col-span-8 xl:col-span-9"
          >
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all"></div>
              <div className="relative bg-slate-900/60 backdrop-blur-2xl border border-slate-700/50 rounded-2xl p-6 md:p-8 min-h-[600px] hover:border-slate-600/50 transition-all">
                {selectedTopic && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                  >
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-100 mb-2">{selectedTopic.name}</h2>
                    {selectedTopic.description && (
                      <p className="text-slate-400">{selectedTopic.description}</p>
                    )}
                    <div className="mt-4 flex items-center gap-3 text-sm text-slate-500">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                          <svg className="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                          </svg>
                        </div>
                        <span>{(selectedTopic.videos || []).length} videos in this playlist</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {!selectedTopic && filteredTopics.length > 0 && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center space-y-4">
                      <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 flex items-center justify-center">
                        <svg className="w-12 h-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-lg text-slate-300 font-medium">Choose a playlist</p>
                        <p className="text-sm text-slate-500 mt-1">Select from the sidebar to start watching</p>
                      </div>
                    </div>
                  </div>
                )}

                {filteredTopics.length === 0 && !loading && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center space-y-4">
                      <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center">
                        <svg className="w-12 h-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-lg text-slate-300 font-medium">No content found</p>
                        <p className="text-sm text-slate-500 mt-1">Try adjusting your search</p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedTopic && (selectedTopic.videos || []).length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    <AnimatePresence>
                      {(selectedTopic.videos || []).map((v, idx) => (
                        <motion.div
                          key={v._id || v.id || v.title + v.url}
                          initial={{ opacity: 0, scale: 0.9, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: -20 }}
                          transition={{ duration: 0.3, delay: idx * 0.08 }}
                          className="group relative"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                          
                          <div className="relative bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden hover:border-slate-600/50 transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/10">
                            {/* Thumbnail with gradient overlay */}
                            <div className="aspect-video bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 relative overflow-hidden group">
                              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                              
                              <div className="absolute inset-0 flex items-center justify-center">
                                <motion.div
                                  whileHover={{ scale: 1.1 }}
                                  className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 cursor-pointer"
                                >
                                  <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                                  </svg>
                                </motion.div>
                              </div>

                              {/* Badges */}
                              <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 text-slate-300">
                                  {v.kind === 'upload' ? '📹 Uploaded' : '🔗 Link'}
                                </span>
                              </div>

                              {v.createdAt && (
                                <div className="absolute bottom-3 left-3">
                                  <span className="px-3 py-1 rounded-full text-xs bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 text-slate-400">
                                    {getRelativeTime(v.createdAt)}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Content */}
                            <div className="p-5 space-y-3">
                              <h3 className="font-semibold text-slate-100 line-clamp-2 leading-snug">
                                {v.title}
                              </h3>
                              {v.description && (
                                <p className="text-sm text-slate-400 line-clamp-2">
                                  {v.description}
                                </p>
                              )}

                              <a
                                href={v.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block w-full"
                              >
                                <motion.div
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  className="relative group/btn overflow-hidden rounded-xl"
                                >
                                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 opacity-100 group-hover/btn:opacity-100 transition-opacity"></div>
                                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                                  <div className="relative px-4 py-3 flex items-center justify-center gap-2 text-white font-medium">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Watch Now</span>
                                  </div>
                                </motion.div>
                              </a>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                {selectedTopic && (selectedTopic.videos || []).length === 0 && !loading && (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-center space-y-4">
                      <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center">
                        <svg className="w-12 h-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-lg text-slate-300 font-medium">No videos yet</p>
                        <p className="text-sm text-slate-500 mt-1">This playlist is empty</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(100, 116, 139, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.7);
        }
      `}</style>
    </div>
  );
};

export default Classrooms;
