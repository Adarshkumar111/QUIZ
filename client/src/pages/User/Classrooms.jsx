import { useEffect, useState, useMemo, useRef } from 'react';
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

// Format time for video player
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Get YouTube video ID from URL
const getYouTubeVideoId = (url) => {
  if (!url) return null;
  // Handle various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

// Check if URL is YouTube
const isYouTubeUrl = (url) => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be');
};

// Custom Video Player Component - Supports both direct videos and YouTube
const VideoPlayer = ({ video, onClose }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const controlsTimeoutRef = useRef(null);

  const isYouTube = isYouTubeUrl(video.url);
  const youtubeId = isYouTube ? getYouTubeVideoId(video.url) : null;

  // Play/Pause toggle (only for non-YouTube)
  const togglePlay = () => {
    if (isYouTube) return; // YouTube has its own controls
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Skip forward 10 seconds
  const skipForward = () => {
    if (isYouTube) return;
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 10, duration);
    }
  };

  // Skip backward 10 seconds
  const skipBackward = () => {
    if (isYouTube) return;
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 10, 0);
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.() ||
      containerRef.current.webkitRequestFullscreen?.() ||
      containerRef.current.mozRequestFullScreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.() ||
      document.webkitExitFullscreen?.() ||
      document.mozCancelFullScreen?.();
      setIsFullscreen(false);
    }
  };

  // Handle progress bar click
  const handleProgressClick = (e) => {
    if (isYouTube) return;
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = percent * duration;
    }
  };

  // Auto-hide controls
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (!isYouTube) {
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) setShowControls(false);
      }, 3000);
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isYouTube) {
        if (e.key === 'Escape') onClose();
        return;
      }
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipForward();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipBackward();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          if (!isFullscreen) onClose();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isFullscreen, duration, isYouTube]);

  // Update fullscreen state on change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        className="relative w-full max-w-6xl mx-4"
        onClick={(e) => e.stopPropagation()}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => !isYouTube && isPlaying && setShowControls(false)}
      >
        {/* Close Button */}
        <motion.button
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onClose}
          className="absolute -top-12 right-0 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </motion.button>

        {/* Video Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-12 left-0 text-white font-medium text-lg flex items-center gap-3"
        >
          {video.title}
          {isYouTube && (
            <span className="px-2 py-0.5 rounded bg-red-600 text-xs font-medium">YouTube</span>
          )}
        </motion.div>

        {/* Video Container */}
        <div className="relative bg-black rounded-xl overflow-hidden shadow-2xl">
          {isYouTube ? (
            // YouTube Embed
            <>
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`}
                className="w-full aspect-video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              {/* Open in YouTube button */}
              <a
                href={video.url}
                target="_blank"
                rel="noreferrer"
                className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium flex items-center gap-1.5 transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                Open in YouTube
              </a>
            </>
          ) : (
            // Direct Video Player
            <>
              <video
                ref={videoRef}
                src={video.url}
                className="w-full aspect-video"
                onClick={togglePlay}
                onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.target.duration)}
                onEnded={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />

              {/* Center Play/Pause Button (shown when paused) */}
              <AnimatePresence>
                {!isPlaying && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <button
                      onClick={togglePlay}
                      className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center hover:bg-white/30 transition-all"
                    >
                      <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                      </svg>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Controls Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: showControls ? 1 : 0 }}
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4"
              >
                {/* Progress Bar */}
                <div
                  className="w-full h-2 bg-white/20 rounded-full cursor-pointer mb-4 group"
                  onClick={handleProgressClick}
                >
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full relative"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Play/Pause */}
                    <button onClick={togglePlay} className="p-2 rounded-lg hover:bg-white/10 text-white transition-all">
                      {isPlaying ? (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>

                    {/* Skip Backward 10s */}
                    <button onClick={skipBackward} className="p-2 rounded-lg hover:bg-white/10 text-white transition-all flex items-center gap-1">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                      </svg>
                      <span className="text-xs font-medium">10</span>
                    </button>

                    {/* Skip Forward 10s */}
                    <button onClick={skipForward} className="p-2 rounded-lg hover:bg-white/10 text-white transition-all flex items-center gap-1">
                      <span className="text-xs font-medium">10</span>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
                      </svg>
                    </button>

                    {/* Time Display */}
                    <span className="text-white text-sm font-mono">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Volume */}
                    <div className="flex items-center gap-2 group">
                      <button className="p-2 rounded-lg hover:bg-white/10 text-white transition-all">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={(e) => {
                          const vol = parseFloat(e.target.value);
                          setVolume(vol);
                          if (videoRef.current) videoRef.current.volume = vol;
                        }}
                        className="w-0 group-hover:w-20 transition-all accent-cyan-400"
                      />
                    </div>

                    {/* Fullscreen */}
                    <button onClick={toggleFullscreen} className="p-2 rounded-lg hover:bg-white/10 text-white transition-all">
                      {isFullscreen ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </div>

        {/* Keyboard Shortcuts Hint */}
        {!isYouTube && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: showControls ? 0.5 : 0 }}
            className="absolute -bottom-8 left-0 text-white/50 text-xs"
          >
            Space: Play/Pause • ←→: Skip 10s • F: Fullscreen • Esc: Close
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

const Classrooms = () => {
  const [allTopics, setAllTopics] = useState([]);
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [playingVideo, setPlayingVideo] = useState(null);

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
      {/* Video Player Modal */}
      <AnimatePresence>
        {playingVideo && (
          <VideoPlayer video={playingVideo} onClose={() => setPlayingVideo(null)} />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8"
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
            Learning Videos
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Watch curated video playlists directly on this platform
          </p>

          {/* Search */}
          <div className="max-w-2xl mx-auto">
            <div className="relative flex items-center gap-3 bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl px-6 py-4">
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search playlists or videos..."
                className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>
        </motion.div>

        {error && (
          <div className="max-w-2xl mx-auto bg-rose-500/10 border border-rose-500/30 rounded-2xl px-6 py-4 text-rose-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Playlists Sidebar */}
          <div className="lg:col-span-4 xl:col-span-3">
            <div className="sticky top-6 bg-slate-900/60 backdrop-blur-2xl border border-slate-700/50 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-100">Playlists</h2>
                {loading && <div className="w-5 h-5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />}
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredTopics.length === 0 && !loading && (
                  <div className="text-center py-8 text-slate-500">
                    {search ? 'No matching playlists' : 'No playlists yet'}
                  </div>
                )}

                {filteredTopics.map((t) => (
                  <button
                    key={t._id || t.id}
                    onClick={() => setSelectedTopicId(t._id || t.id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selectedTopicId === (t._id || t.id)
                        ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/50'
                        : 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600/50'
                    }`}
                  >
                    <h3 className="font-medium text-slate-100">{t.name}</h3>
                    {t.description && <p className="text-xs text-slate-400 truncate mt-1">{t.description}</p>}
                    <p className="text-xs text-slate-500 mt-2">{(t.videos || []).length} videos</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Videos Grid */}
          <div className="lg:col-span-8 xl:col-span-9">
            <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-700/50 rounded-2xl p-6 md:p-8 min-h-[600px]">
              {selectedTopic && (
                <div className="mb-8">
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-100">{selectedTopic.name}</h2>
                  {selectedTopic.description && <p className="text-slate-400 mt-2">{selectedTopic.description}</p>}
                </div>
              )}

              {!selectedTopic && filteredTopics.length > 0 && (
                <div className="flex items-center justify-center h-full text-slate-500">Choose a playlist from the left</div>
              )}

              {filteredTopics.length === 0 && !loading && (
                <div className="flex items-center justify-center h-full text-slate-500">No published content</div>
              )}

              {selectedTopic && (selectedTopic.videos || []).length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {(selectedTopic.videos || []).map((v, idx) => (
                    <motion.div
                      key={v._id || v.id || idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden hover:border-cyan-500/50 transition-all"
                    >
                      {/* Thumbnail */}
                      <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 relative flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-cyan-500/30 transition-all">
                          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                          </svg>
                        </div>
                        <span className="absolute top-3 right-3 px-2 py-1 rounded text-xs bg-slate-900/80 text-slate-300">
                          {isYouTubeUrl(v.url) ? 'YouTube' : v.kind === 'upload' ? 'Video' : 'Link'}
                        </span>
                        {v.createdAt && (
                          <span className="absolute bottom-3 left-3 px-2 py-1 rounded text-xs bg-slate-900/80 text-slate-400">
                            {getRelativeTime(v.createdAt)}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-4">
                        <h3 className="font-medium text-slate-100 line-clamp-2 mb-2">{v.title}</h3>
                        {v.description && <p className="text-xs text-slate-400 line-clamp-2 mb-3">{v.description}</p>}
                        
                        {/* Always show Watch Now button */}
                        <button
                          onClick={() => setPlayingVideo(v)}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium hover:from-cyan-400 hover:to-blue-500 transition-all flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                          </svg>
                          Watch Now
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {selectedTopic && (selectedTopic.videos || []).length === 0 && (
                <div className="flex items-center justify-center h-96 text-slate-500">No videos in this playlist</div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Classrooms;
