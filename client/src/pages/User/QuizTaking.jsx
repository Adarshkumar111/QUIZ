import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { userAPI } from '../../services/api';
import toast from 'react-hot-toast';

const QuizTaking = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [attemptId, setAttemptId] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [startedAt, setStartedAt] = useState(null);
  const [remainingMs, setRemainingMs] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answersByQuestionId, setAnswersByQuestionId] = useState({});

  useEffect(() => {
    let mounted = true;

    const start = async () => {
      try {
        const res = await userAPI.startQuiz(id);
        if (!mounted) return;
        setAttemptId(res.data?.attemptId || null);
        setQuiz(res.data?.quiz || null);
        setQuestions(res.data?.questions || []);
        setStartedAt(res.data?.startedAt ? new Date(res.data.startedAt) : new Date());
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to start quiz');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    start();
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!quiz?.timeLimit || !startedAt) return;

    const totalMs = Number(quiz.timeLimit) * 60 * 1000;
    const end = startedAt.getTime() + totalMs;

    const tick = () => {
      const ms = end - Date.now();
      setRemainingMs(ms);
      if (ms <= 0) {
        setRemainingMs(0);
      }
    };

    tick();
    const timerId = setInterval(tick, 1000);
    return () => clearInterval(timerId);
  }, [quiz?.timeLimit, startedAt]);

  useEffect(() => {
    if (remainingMs === null) return;
    if (remainingMs > 0) return;
    if (submitting) return;
    if (!attemptId) return;

    handleSubmit();
  }, [remainingMs, submitting, attemptId]);

  const formatRemaining = (ms) => {
    if (ms === null || ms === undefined) return '--:--';
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
  };

  const currentQuestion = questions[currentIndex];
  const currentSelected = currentQuestion ? answersByQuestionId[currentQuestion._id] : null;

  const progress = useMemo(() => {
    if (!questions.length) return { answered: 0, total: 0 };
    const answered = Object.values(answersByQuestionId).filter((v) => v !== null && v !== undefined && v !== '').length;
    return { answered, total: questions.length };
  }, [answersByQuestionId, questions.length]);

  const handleSelect = (questionId, optionText) => {
    setAnswersByQuestionId((prev) => ({ ...prev, [questionId]: optionText }));
  };

  const handleSubmit = async () => {
    if (!attemptId) return;
    if (!questions.length) {
      toast.error('No questions in this quiz');
      return;
    }

    const answers = questions.map((q) => ({
      questionId: q._id,
      answer: answersByQuestionId[q._id] ?? null,
    }));

    try {
      setSubmitting(true);
      await userAPI.submitQuiz(id, { attemptId, answers });
      navigate(`/quizzes/${id}/results?attemptId=${attemptId}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-slate-400">Loading quiz...</div>;
  }

  if (!quiz) {
    return <div className="text-sm text-slate-400">Quiz not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="card space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-50">{quiz.title}</h1>
            {quiz.description && <p className="text-sm text-slate-400 mt-1">{quiz.description}</p>}
          </div>
          <div className="text-right text-xs text-slate-400">
            <div>Time limit: {quiz.timeLimit || 30} min</div>
            <div>Remaining: {formatRemaining(remainingMs)}</div>
            <div>{progress.answered}/{progress.total} answered</div>
          </div>
        </div>

        {!!quiz.attachments?.length && (
          <div className="pt-3 border-t border-slate-800">
            <p className="text-xs text-slate-400 mb-2">Attachments</p>
            <div className="flex flex-col gap-2">
              {quiz.attachments.map((a) => (
                <a
                  key={a.publicId || a.url}
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary-200 hover:underline"
                >
                  {a.fileName || a.url}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {!currentQuestion ? (
        <div className="card">
          <p className="text-sm text-slate-400">No questions available.</p>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-4 md:gap-6 items-start">
          {/* Question number navigator */}
          <div className="col-span-12 md:col-span-3 lg:col-span-2">
            <div className="card space-y-3 sticky top-24">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-50">Questions</p>
                <p className="text-[11px] text-slate-500">
                  {progress.answered}/{progress.total} answered
                </p>
              </div>
              <div className="grid grid-cols-8 sm:grid-cols-6 md:grid-cols-3 gap-2">
                {questions.map((q, index) => {
                  const answered =
                    answersByQuestionId[q._id] !== null &&
                    answersByQuestionId[q._id] !== undefined &&
                    answersByQuestionId[q._id] !== '';
                  const isCurrent = index === currentIndex;
                  return (
                    <button
                      key={q._id}
                      type="button"
                      onClick={() => setCurrentIndex(index)}
                      className={`h-8 rounded-lg text-xs font-medium border transition-colors flex items-center justify-center ${
                        isCurrent
                          ? 'border-primary-500 bg-primary-500/20 text-primary-100'
                          : answered
                            ? 'border-emerald-500/70 bg-emerald-500/15 text-emerald-100 hover:border-emerald-400'
                            : 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-primary-500/40'
                      }`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main question panel */}
          <div className="col-span-12 md:col-span-9 lg:col-span-10">
            <div className="card space-y-4 min-h-[380px] flex flex-col">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">Question {currentIndex + 1} of {questions.length}</p>
                <p className="text-xs text-slate-400">Marks: {currentQuestion.marks || 1}</p>
              </div>
              <h2 className="text-lg md:text-xl font-semibold text-slate-50 leading-relaxed">
                {currentQuestion.text}
              </h2>

              <div className="mt-2 space-y-2 flex-1">
                {(currentQuestion.options || []).map((opt) => {
                  const selected = currentSelected === opt.text;
                  return (
                    <button
                      key={opt._id || opt.text}
                      type="button"
                      onClick={() => handleSelect(currentQuestion._id, opt.text)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                        selected
                          ? 'border-primary-500/70 bg-primary-500/10 text-primary-100'
                          : 'border-slate-800 bg-slate-900/60 text-slate-200 hover:border-primary-500/40'
                      }`}
                    >
                      <span className="text-sm">{opt.text}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-3">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  className="btn-secondary text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                <div className="flex items-center gap-2">
                  {currentIndex < questions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
                      className="btn-primary text-sm"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleSubmit}
                      className="btn-primary text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Submitting...' : 'Submit'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
;

export default QuizTaking;
