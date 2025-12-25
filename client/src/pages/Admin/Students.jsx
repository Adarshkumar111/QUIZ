import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../services/api';

const Students = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const loadStudents = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getAllStudents({ search });
      setStudents(res.data.students || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadStudents();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Student Management</h1>
          <p className="text-sm text-slate-400">View and manage all registered students</p>
        </div>
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-primary-500 transition-colors"
          />
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Student</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Course / Sem</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Rank</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Level / XP</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Joined</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4" colSpan="5">
                      <div className="h-4 bg-slate-800 rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                    No students found matching your search.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <motion.tr
                    key={student._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => navigate(`/admin/students/${student._id}`)}
                    className="hover:bg-slate-900/40 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-primary-500/20 to-secondary-500/20 flex items-center justify-center border border-slate-800 overflow-hidden">
                          {student.avatar ? (
                            <img src={student.avatar} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-primary-300 font-bold">{student.username[0].toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-50">{student.username}</p>
                          <p className="text-xs text-slate-500">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-300">{student.course || 'N/A'}</p>
                      <p className="text-xs text-slate-500">Sem {student.semester || '0'}</p>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex flex-col">
                           <span className="text-sm font-bold text-amber-400">#{student.globalRank || 'N/A'}</span>
                           <span className="text-[10px] text-slate-500 uppercase font-black">Global</span>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                        <span className="text-primary-400">Lvl {student.level || 1}</span>
                        <p className="text-xs text-slate-500 font-normal">{student.xpPoints || 0} XP</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {new Date(student.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                         student.isActive 
                           ? 'bg-emerald-500/10 text-emerald-400' 
                           : 'bg-rose-500/10 text-rose-400'
                       }`}>
                         {student.isActive ? 'Active' : 'Inactive'}
                       </span>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Students;
