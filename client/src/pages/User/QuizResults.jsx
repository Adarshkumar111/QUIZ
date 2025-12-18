import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { userAPI } from '../../services/api';
import toast from 'react-hot-toast';

const QuizResults = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const attemptId = searchParams.get('attemptId');

  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!attemptId) {
        setLoading(false);
        return;
      }

      try {
        const res = await userAPI.getQuizResults(id, attemptId);
        if (mounted) setResults(res.data);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load results');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [attemptId, id]);

  if (loading) {
    return <div className="text-sm text-slate-400">Loading results...</div>;
  }

  if (!attemptId) {
    return (
      <div className="card">
        <p className="text-sm text-slate-400">Missing attempt id.</p>
        <div className="pt-3">
          <Link to="/quizzes" className="btn-secondary text-sm">Back to quizzes</Link>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="card">
        <p className="text-sm text-slate-400">Results not available.</p>
        <div className="pt-3">
          <Link to="/quizzes" className="btn-secondary text-sm">Back to quizzes</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-50 mb-1">Quiz Results</h1>
        <p className="text-sm text-slate-400">Your submission summary.</p>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-50">{results.quiz?.title || 'Quiz'}</p>
          <p className="text-xs text-slate-400">Attempt: {attemptId}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-xs text-slate-400">Score</p>
            <p className="text-xl font-semibold text-slate-50">{results.score} / {results.quiz?.totalMarks}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-xs text-slate-400">Percentage</p>
            <p className="text-xl font-semibold text-slate-50">
              {Number(results.percentage ?? 0).toFixed(2)}%
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-xs text-slate-400">Time taken</p>
            <p className="text-xl font-semibold text-slate-50">{results.timeTaken || 0}s</p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Link to="/quizzes" className="btn-primary text-sm">Back to quizzes</Link>
        </div>
      </div>
    </div>
  );
};

export default QuizResults;
