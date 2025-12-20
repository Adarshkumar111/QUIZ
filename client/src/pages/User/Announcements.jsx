import { useEffect, useState } from 'react';
import { userAPI } from '../../services/api';

const PRIORITY_COLORS = {
  low: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40',
  medium: 'bg-sky-500/10 text-sky-300 border-sky-500/40',
  high: 'bg-amber-500/10 text-amber-300 border-amber-500/40',
  urgent: 'bg-rose-500/10 text-rose-300 border-rose-500/40',
};

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      // Re-use dashboard events endpoint to fetch recent announcements
      const res = await userAPI.getUpcomingEvents();
      const anns = res.data?.announcements || [];
      setAnnouncements(anns);

      if (anns.length > 0) {
        const latest = anns[0].publishAt || anns[0].createdAt;
        if (latest) {
          localStorage.setItem('announcements:lastSeenAt', latest);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-50">Announcements</h1>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl">
          Important updates from your administrators and teachers. You can only read these messages.
        </p>
      </div>

      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 max-h-[620px] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-slate-50">Recent announcements</h2>
          <div className="flex items-center gap-3">
            {loading && <span className="text-[11px] text-slate-400">Loading...</span>}
            <button
              onClick={load}
              disabled={loading}
              className="text-[11px] px-2 py-1 rounded-lg border border-slate-700 text-slate-300 hover:border-primary-500/70 hover:text-primary-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="text-[11px] text-rose-400 bg-rose-500/5 border border-rose-500/30 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        {announcements.length === 0 && !loading && !error && (
          <p className="text-xs text-slate-500">No announcements available right now.</p>
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
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">
                    {createdAt ? new Date(createdAt).toLocaleString() : ''}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-50 mt-1">{a.title}</h3>
                <p className="text-xs text-slate-300 whitespace-pre-wrap mt-1">{a.content}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Announcements;
