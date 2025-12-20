import { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';

const PRIORITY_COLORS = {
  low: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40',
  medium: 'bg-sky-500/10 text-sky-300 border-sky-500/40',
  high: 'bg-amber-500/10 text-amber-300 border-amber-500/40',
  urgent: 'bg-rose-500/10 text-rose-300 border-rose-500/40',
};

const AdminAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('medium');
  const [isBroadcast, setIsBroadcast] = useState(true);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminAPI.getAllAnnouncements();
      setAnnouncements(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      setError('');
      await adminAPI.deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => a._id !== id));
      setPendingDeleteId((prev) => (prev === id ? null : prev));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete announcement');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    try {
      setLoading(true);
      setError('');
      await adminAPI.createAnnouncement({
        title: title.trim(),
        content: content.trim(),
        priority,
        isBroadcast,
      });

      setTitle('');
      setContent('');
      setPriority('medium');
      setIsBroadcast(true);
      await loadAnnouncements();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create announcement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-50">Announcements</h1>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl">
          Create and manage platform-wide announcements. Students will receive notifications and see them in their announcements view.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-4">
          <h2 className="text-sm font-semibold text-slate-50">New announcement</h2>
          {error && (
            <div className="text-[11px] text-rose-400 bg-rose-500/5 border border-rose-500/30 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg bg-slate-950/70 border border-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/60 focus:border-primary-500/70"
                placeholder="Exam schedule update, Maintenance notice, ..."
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Content</label>
              <textarea
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full rounded-lg bg-slate-950/70 border border-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/60 focus:border-primary-500/70 resize-none"
                placeholder="Write a clear announcement for all students..."
                required
              />
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="rounded-lg bg-slate-950/70 border border-slate-800 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/60 focus:border-primary-500/70"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <label className="inline-flex items-center gap-2 text-xs text-slate-300 mt-4">
                <input
                  type="checkbox"
                  checked={isBroadcast}
                  onChange={(e) => setIsBroadcast(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-950 text-primary-500 focus:ring-primary-500/60"
                />
                Broadcast to all students
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 inline-flex items-center justify-center rounded-lg bg-primary-600 hover:bg-primary-500 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-medium px-3 py-2 text-white shadow-[0_0_18px_rgba(6,174,214,0.35)] transition-colors"
            >
              {loading ? 'Publishing...' : 'Publish announcement'}
            </button>
          </form>
        </div>

        <div className="xl:col-span-2 bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 max-h-[620px] overflow-y-auto">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-slate-50">Recent announcements</h2>
            {loading && <span className="text-[11px] text-slate-400">Loading...</span>}
          </div>

          {announcements.length === 0 && !loading && (
            <p className="text-xs text-slate-500">No announcements have been published yet.</p>
          )}

          <div className="space-y-3">
            {announcements.map((a) => {
              const badgeClass = PRIORITY_COLORS[a.priority] || PRIORITY_COLORS.medium;
              const createdAt = a.publishAt || a.createdAt;
              return (
                <div
                  key={a._id}
                  className="border border-slate-800 rounded-lg bg-slate-950/60 px-4 py-3 flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border ${badgeClass}`}>
                        {a.priority?.toUpperCase?.() || 'MEDIUM'}
                      </span>
                      {a.isBroadcast && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-primary-500/10 text-primary-200 border border-primary-500/40">
                          Broadcast
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-400 whitespace-nowrap">
                        {createdAt ? new Date(createdAt).toLocaleString() : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(a._id)}
                        disabled={loading}
                        className="text-[11px] px-2 py-0.5 rounded-lg border border-rose-600/70 text-rose-300 hover:bg-rose-600/10 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-50 mt-1">{a.title}</h3>
                  <p className="text-xs text-slate-300 whitespace-pre-wrap mt-1">{a.content}</p>
                  {a.createdBy?.username && (
                    <p className="text-[11px] text-slate-500 mt-1">By {a.createdBy.username}</p>
                  )}
                  {pendingDeleteId === a._id && (
                    <div className="mt-3 border border-rose-500/40 bg-rose-500/5 rounded-lg px-3 py-2 flex flex-col gap-2">
                      <p className="text-[11px] text-rose-200">
                        Are you sure you want to permanently delete this announcement for all users?
                      </p>
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(null)}
                          className="text-[11px] px-2.5 py-1 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-800/80"
                          disabled={loading}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(a._id)}
                          className="text-[11px] px-2.5 py-1 rounded-lg border border-rose-500 bg-rose-600/80 text-white hover:bg-rose-500 disabled:opacity-60 disabled:cursor-not-allowed"
                          disabled={loading}
                        >
                          Confirm delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnnouncements;
