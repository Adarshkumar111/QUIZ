import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { adminAPI } from '../../services/api';

const StudentDetail = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await adminAPI.getUserPerformanceDetail(userId);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load student details');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
    </div>
  );

  if (error) return (
    <div className="card bg-rose-500/10 border-rose-500/20 text-rose-400 p-6 text-center">
      <p>{error}</p>
      <button onClick={() => navigate(-1)} className="mt-4 text-sm underline">Go back</button>
    </div>
  );

  const { user, summary, attempts } = data;

  return (
    <div className="space-y-8">
      {/* Header / Profile Info */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="h-24 w-24 rounded-2xl bg-gradient-to-tr from-primary-500 to-secondary-500 flex items-center justify-center text-3xl font-bold border-4 border-slate-900 shadow-xl overflow-hidden">
             {user.avatar ? (
                <img src={user.avatar} alt={user.username} className="h-full w-full object-cover" />
             ) : (
                user.username[0].toUpperCase()
             )}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-50">{user.username}</h1>
            <p className="text-slate-400">{user.email}</p>
            <div className="flex items-center gap-4 mt-2">
               <span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-medium text-slate-300">
                  {user.course || 'No Course'} • Sem {user.semester || '0'}
               </span>
               <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                  {user.isActive ? 'Active' : 'Inactive'}
               </span>
            </div>
          </div>
        </div>
        <button 
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
        >
          ← Back to Students
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Overall Progress" value={`${summary.progressPercentage}%`} sub={`${summary.userContent} / ${summary.totalContent} items`} color="primary" />
        <StatCard label="Global Rank" value={`#${summary.globalRank || 'N/A'}`} sub="Based on total XP" color="amber" />
        <StatCard label="Avg Score" value={`${Math.round(summary.avgPercentage)}%`} sub={`${summary.totalAttempts} Quiz Attempts`} color="secondary" />
        <StatCard label="Notes / Videos" value={`${summary.readNotesCount} / ${summary.watchedVideosCount}`} sub="Content consumption" color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Activity & More Stats */}
        <div className="space-y-6">
          <div className="card p-6 bg-slate-900/50 border-slate-800">
            <h3 className="text-lg font-semibold text-slate-50 mb-4">Account Analytics</h3>
            <div className="space-y-4">
               <InfoRow label="Experience Points" value={`${user.xpPoints} XP (Level ${user.level})`} />
               <InfoRow label="Global Leaderboard" value={`Rank #${summary.globalRank || 'N/A'}`} />
               <InfoRow label="Member Since" value={new Date(user.createdAt).toLocaleDateString()} />
               <InfoRow label="Last Active" value={user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleString() : 'Never'} />
               <InfoRow label="Best Quiz Score" value={`${summary.bestPercentage}%`} />
            </div>
          </div>

          <div className="card p-6 border-primary-500/20 bg-primary-500/5">
            <h3 className="text-lg font-semibold text-primary-400 mb-2">Learning Progress</h3>
            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden mt-4">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${summary.progressPercentage}%` }}
                 className="h-full bg-gradient-to-r from-primary-500 to-secondary-500"
               />
            </div>
            <p className="text-xs text-slate-400 mt-2 text-right">
               {summary.userContent} of {summary.totalContent} total items completed
            </p>
          </div>
        </div>

        {/* Right Col: Quiz History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-50">Quiz Attempt History</h3>
              <span className="text-xs text-slate-400">{attempts.length} total attempts</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/50">
                    <th className="px-6 py-3 text-xs font-semibold uppercase text-slate-500">Quiz</th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase text-slate-500">Date</th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase text-slate-500">Score</th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase text-slate-500 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {attempts.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                        No quiz attempts recorded for this user.
                      </td>
                    </tr>
                  ) : (
                    attempts.map((attempt) => (
                      <tr key={attempt._id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-slate-200">{attempt.quiz?.title || 'Unknown Quiz'}</p>
                          <p className="text-[10px] text-slate-500">{attempt.quiz?.subject || 'N/A'}</p>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400">
                          {new Date(attempt.submittedAt || attempt.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-100">{attempt.percentage}%</span>
                              <p className="text-[10px] text-slate-500">({attempt.score}/{attempt.quiz?.totalMarks || 100})</p>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-right text-xs">
                           <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${
                              attempt.percentage >= 60 ? 'text-emerald-400' : 'text-rose-400'
                           }`}>
                              {attempt.percentage >= 60 ? 'Passed' : 'Failed'}
                           </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, sub, color }) => {
  const colors = {
    primary: 'text-primary-400 border-primary-500/20',
    secondary: 'text-secondary-400 border-secondary-500/20',
    emerald: 'text-emerald-400 border-emerald-500/20',
    sky: 'text-sky-400 border-sky-500/20',
    amber: 'text-amber-400 border-amber-500/20',
  };
  return (
    <div className={`card p-5 border bg-slate-900/40 ${colors[color] || 'border-slate-800'}`}>
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-50">{value}</p>
      <p className="text-[10px] text-slate-500 mt-2">{sub}</p>
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div className="flex justify-between items-center py-2 border-b border-slate-800/50 last:border-0">
    <span className="text-xs text-slate-500">{label}</span>
    <span className="text-sm font-medium text-slate-300">{value}</span>
  </div>
);

export default StudentDetail;
