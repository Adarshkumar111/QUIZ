import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { userAPI } from '../../services/api';

const ClassroomVideos = () => {
  const { id } = useParams();
  const [topics, setTopics] = useState([]);
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const selectedTopic = useMemo(
    () => topics.find((t) => (t._id || t.id) === selectedTopicId),
    [topics, selectedTopicId]
  );

  const loadTopics = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await userAPI.getClassroomTopicsWithVideos(id, search ? { search } : undefined);
      setTopics(res.data || []);
      if (!selectedTopicId && res.data && res.data.length > 0) {
        const first = res.data[0];
        setSelectedTopicId(first._id || first.id);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load classroom videos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    loadTopics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!id) return;
    loadTopics();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">Classroom Videos</p>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-50">Topic-wise lectures</h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Browse videos that your teacher has shared for this classroom. You can search by topic or video
            title and open links like YouTube / Google Drive in a new tab.
          </p>
        </div>
        <form onSubmit={handleSearchSubmit} className="w-full md:w-auto flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search topic or video title"
            className="flex-1 md:w-64 rounded-lg bg-slate-950/70 border border-slate-800 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/60 focus:border-primary-500/70"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-xs font-medium text-white disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {error && (
        <div className="text-[11px] text-rose-400 bg-rose-500/5 border border-rose-500/30 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Topics list */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-slate-50">Topics</h2>
              {loading && <span className="text-[11px] text-slate-400">Loading...</span>}
            </div>
            <div className="space-y-1 max-h-[340px] overflow-y-auto pr-1">
              {topics.length === 0 && !loading && (
                <p className="text-xs text-slate-500">No topics or videos available yet.</p>
              )}
              {topics.map((t) => (
                <button
                  key={t._id || t.id}
                  onClick={() => setSelectedTopicId(t._id || t.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                    selectedTopicId === (t._id || t.id)
                      ? 'bg-slate-900 border-primary-500/70 text-primary-100'
                      : 'bg-slate-950/60 border-slate-800 hover:bg-slate-900/80'
                  }`}
                >
                  <p className="font-medium text-slate-50">{t.name}</p>
                  {t.description && (
                    <p className="text-[11px] text-slate-400 truncate">{t.description}</p>
                  )}
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {(t.videos || []).length} videos
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Videos */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 min-h-[260px]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-50">Videos</h2>
                <p className="text-[11px] text-slate-400">
                  {selectedTopic ? selectedTopic.name : 'Select a topic from the left to see its videos.'}
                </p>
              </div>
            </div>

            {selectedTopic && (selectedTopic.videos || []).length === 0 && !loading && (
              <p className="text-xs text-slate-500">No videos have been added for this topic yet.</p>
            )}

            {!selectedTopic && topics.length > 0 && (
              <p className="text-xs text-slate-500">Choose a topic from the left to see its videos.</p>
            )}

            {topics.length === 0 && !loading && (
              <p className="text-xs text-slate-500">Your teacher has not added any videos yet.</p>
            )}

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {selectedTopic &&
                (selectedTopic.videos || []).map((v) => (
                  <div
                    key={v._id || v.id || v.title + v.url}
                    className="border border-slate-800 rounded-lg bg-slate-950/70 px-3 py-2 text-xs flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-50 truncate">{v.title}</p>
                        {v.description && (
                          <p className="text-[11px] text-slate-400 truncate">{v.description}</p>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-900 border border-slate-700 text-slate-300">
                        {v.kind === 'upload' ? 'Upload' : 'Link'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-[10px] text-slate-500 truncate">
                        {v.url}
                      </span>
                      <a
                        href={v.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] px-2 py-0.5 rounded-lg border border-primary-500/70 text-primary-200 hover:bg-primary-500/10"
                      >
                        Open
                      </a>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassroomVideos;
