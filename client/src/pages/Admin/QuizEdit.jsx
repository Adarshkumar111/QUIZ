import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

const emptyQuestion = {
  _id: null,
  text: '',
  options: ['', '', '', ''],
  correctIndex: 0,
  marks: 1,
  isNew: true,
};

const QuizEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [savingIndex, setSavingIndex] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);

  const loadQuiz = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getQuizDetails(id);
      const qz = res.data;
      setQuiz(qz);
      const qs = qz.questions || [];
      setQuestions(
        qs.length
          ? qs.map((q) => {
              const baseOptions = (q.options || []).map((o) => o.text);
              while (baseOptions.length < 4) baseOptions.push('');
              const correctIdx = (q.options || []).findIndex((o) => o.isCorrect);
              return {
                _id: q._id,
                text: q.text || '',
                options: baseOptions.slice(0, 4),
                correctIndex: correctIdx >= 0 ? correctIdx : 0,
                marks: q.marks || 1,
                isNew: false,
              };
            })
          : [emptyQuestion]
      );
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadQuiz();
  }, [id]);

  const updateField = (index, field, value) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const updateOption = (qIndex, optIndex, value) => {
    setQuestions((prev) => {
      const next = [...prev];
      const q = next[qIndex];
      const opts = [...q.options];
      opts[optIndex] = value;
      next[qIndex] = { ...q, options: opts };
      return next;
    });
  };

  const buildPayloadQuestion = (q) => {
    const trimmedText = q.text.trim();
    if (!trimmedText) {
      toast.error('Question is required');
      return null;
    }
    const opts = q.options.map((o) => o.trim()).filter(Boolean);
    if (opts.length < 2) {
      toast.error('At least 2 options are required');
      return null;
    }
    if (q.correctIndex < 0 || q.correctIndex >= q.options.length) {
      toast.error('Select a valid correct option');
      return null;
    }
    if (!q.options[q.correctIndex]?.trim()) {
      toast.error('Correct option cannot be empty');
      return null;
    }

    return {
      type: 'MCQ',
      text: trimmedText,
      marks: Number(q.marks) || 1,
      options: q.options.map((opt, idx) => ({
        text: opt,
        isCorrect: idx === Number(q.correctIndex),
      })),
    };
  };

  const handleSave = async (q, index) => {
    if (!id) return;

    const payloadQuestion = buildPayloadQuestion(q);
    if (!payloadQuestion) return;

    try {
      setSavingIndex(index);
      if (q._id && !q.isNew) {
        await adminAPI.updateQuizQuestion(q._id, payloadQuestion);
        toast.success(`Question ${index + 1} updated`);
      } else {
        await adminAPI.addQuizQuestions(id, { questions: [payloadQuestion] });
        toast.success(`Question ${index + 1} added`);
      }
      await loadQuiz();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to save question');
    } finally {
      setSavingIndex(null);
    }
  };

  const handleAddBlock = () => {
    setQuestions((prev) => [...prev, { ...emptyQuestion, _id: null, isNew: true }]);
  };

  const handlePublish = async () => {
    if (!id) return;
    try {
      setPublishing(true);

      if (!questions.length) {
        toast.error('Add at least one question before publishing');
        return;
      }

      // Save all questions (update existing + add new)
      for (let index = 0; index < questions.length; index += 1) {
        const q = questions[index];
        const payloadQuestion = buildPayloadQuestion(q);
        if (!payloadQuestion) {
          return; // validation error already shown
        }

        if (q._id && !q.isNew) {
          await adminAPI.updateQuizQuestion(q._id, payloadQuestion);
        } else {
          await adminAPI.addQuizQuestions(id, { questions: [payloadQuestion] });
        }
      }

      await adminAPI.publishQuiz(id);
      toast.success('Quiz published');
      navigate('/admin/quizzes');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to publish quiz');
    } finally {
      setPublishing(false);
    }
  };

  if (loading && !quiz) {
    return <div className="text-sm text-slate-400">Loading quiz...</div>;
  }

  if (!quiz) {
    return <div className="text-sm text-slate-400">Quiz not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-50 mb-1">Edit Quiz Questions</h1>
          <p className="text-sm text-slate-400 max-w-xl">
            {quiz.title} • Type: {quiz.type} • Time limit: {quiz.settings?.timeLimit || 30} min
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/admin/quizzes')}
          className="btn-secondary text-xs md:text-sm"
        >
          ← Back to Quiz Builder
        </button>
      </div>

      <div className="card space-y-4">
        {questions.map((q, index) => (
          <div key={q._id || index} className="space-y-3 border border-slate-800/60 rounded-xl p-3 md:p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-300">Question {index + 1}</p>
              {q._id && !q.isNew && (
                <p className="text-[11px] text-slate-500 truncate max-w-[180px]">ID: {q._id}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">Question text</label>
              <textarea
                value={q.text}
                onChange={(e) => updateField(index, 'text', e.target.value)}
                rows={3}
                className="input-field resize-none"
                placeholder="Type your question..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {q.options.map((opt, idx) => (
                <div key={idx} className="space-y-1">
                  <label className="text-xs text-slate-400">Option {idx + 1}</label>
                  <input
                    value={opt}
                    onChange={(e) => updateOption(index, idx, e.target.value)}
                    className="input-field"
                    placeholder={`Option ${idx + 1}`}
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Correct option</label>
                <select
                  value={q.correctIndex}
                  onChange={(e) => updateField(index, 'correctIndex', Number(e.target.value))}
                  className="input-field"
                >
                  <option value={0}>Option 1</option>
                  <option value={1}>Option 2</option>
                  <option value={2}>Option 3</option>
                  <option value={3}>Option 4</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Marks</label>
                <input
                  type="number"
                  min={1}
                  value={q.marks}
                  onChange={(e) => updateField(index, 'marks', e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
          </div>
        ))}

        <div className="flex flex-col md:flex-row justify-between items-center gap-3 pt-2">
          <p className="text-xs text-slate-500">Total questions: {questions.length}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddBlock}
              className="btn-secondary text-xs md:text-sm"
            >
              + Add Question
            </button>
            <button
              type="button"
              disabled={publishing}
              onClick={handlePublish}
              className="btn-primary text-xs md:text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {publishing ? 'Publishing...' : 'Publish Quiz'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizEdit;
