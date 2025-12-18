import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

const initialState = {
  title: '',
  description: '',
  classroom: '',
  type: 'practice',
  timeLimit: 30,
};

const QuizBuilder = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [quizId, setQuizId] = useState(null);
  const [quizMeta, setQuizMeta] = useState(null);
  const [questionsList, setQuestionsList] = useState([]);
  const [editableQuestions, setEditableQuestions] = useState([]);
  const [allQuizzes, setAllQuizzes] = useState([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [questionTemplate] = useState({
    text: '',
    options: ['', '', '', ''],
    correctIndex: 0,
    marks: 1,
  });
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [pendingDeleteQuiz, setPendingDeleteQuiz] = useState(null);

  const refreshQuizDetails = async (idToLoad = quizId) => {
    if (!idToLoad) return;
    try {
      const res = await adminAPI.getQuizDetails(idToLoad);
      const quiz = res.data;
      setQuizMeta(quiz);
      const qs = quiz.questions || [];
      setQuestionsList(qs);
      setEditableQuestions(
        qs.map((q) => {
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
      );
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to load quiz details');
    }
  };

  useEffect(() => {
    if (!quizId) return;
    refreshQuizDetails(quizId);
  }, [quizId]);

  useEffect(() => {
    const loadQuizzes = async () => {
      try {
        setLoadingQuizzes(true);
        const res = await adminAPI.getAllQuizzes();
        const list = res.data?.quizzes || res.data || [];
        setAllQuizzes(list);
      } catch (error) {
        console.error(error);
        toast.error(error.response?.data?.message || 'Failed to load quizzes');
      } finally {
        setLoadingQuizzes(false);
      }
    };

    loadQuizzes();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title) {
      toast.error('Title is required');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        title: form.title,
        description: form.description,
        type: form.type,
        settings: {
          timeLimit: Number(form.timeLimit) || 30,
          showSolutions: false,
        },
      };

      // Only include classroom if it looks like a valid ObjectId (24 hex chars)
      const classroomTrimmed = form.classroom.trim();
      if (/^[0-9a-fA-F]{24}$/.test(classroomTrimmed)) {
        payload.classroom = classroomTrimmed;
      }

      const created = await adminAPI.createQuiz(payload);

      const createdId = created.data?._id;
      if (!createdId) {
        toast.error('Quiz created but id missing');
        return;
      }

      toast.success('Quiz created. Now add questions.');
      navigate(`/admin/quizzes/${createdId}/edit`);
      // refresh overall quizzes list
      try {
        const res = await adminAPI.getAllQuizzes();
        const list = res.data?.quizzes || res.data || [];
        setAllQuizzes(list);
      } catch (err) {
        console.error(err);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create quiz');
    } finally {
      setLoading(false);
    }
  };

  const updateEditableQuestionField = (index, field, value) => {
    setEditableQuestions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const updateEditableQuestionOption = (qIndex, optIndex, value) => {
    setEditableQuestions((prev) => {
      const next = [...prev];
      const q = next[qIndex];
      const opts = [...q.options];
      opts[optIndex] = value;
      next[qIndex] = { ...q, options: opts };
      return next;
    });
  };

  const handleSaveQuestionBlock = async (q, index) => {
    if (!quizId) return;
    const trimmedText = q.text.trim();
    if (!trimmedText) {
      toast.error('Question is required');
      return;
    }
    const opts = q.options.map((o) => o.trim()).filter(Boolean);
    if (opts.length < 2) {
      toast.error('At least 2 options are required');
      return;
    }
    if (q.correctIndex < 0 || q.correctIndex >= q.options.length) {
      toast.error('Select a valid correct option');
      return;
    }
    if (!q.options[q.correctIndex]?.trim()) {
      toast.error('Correct option cannot be empty');
      return;
    }

    const payloadQuestion = {
      type: 'MCQ',
      text: trimmedText,
      marks: Number(q.marks) || 1,
      options: q.options.map((opt, idx) => ({
        text: opt,
        isCorrect: idx === Number(q.correctIndex),
      })),
    };

    try {
      setLoading(true);
      if (q._id && !q.isNew) {
        await adminAPI.updateQuizQuestion(q._id, payloadQuestion);
        toast.success(`Question ${index + 1} updated`);
      } else {
        await adminAPI.addQuizQuestions(quizId, { questions: [payloadQuestion] });
        toast.success(`Question ${index + 1} added`);
      }
      await refreshQuizDetails(quizId);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save question');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadAttachment = async () => {
    if (!quizId) return;
    if (!attachmentFile) {
      toast.error('Please select a PDF or image');
      return;
    }

    const formData = new FormData();
    formData.append('file', attachmentFile);

    try {
      setLoading(true);
      const res = await adminAPI.uploadQuizAttachment(quizId, formData);
      setQuizMeta(res.data);
      await refreshQuizDetails(quizId);
      setAttachmentFile(null);
      toast.success('Attachment uploaded');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload attachment');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!quizId) return;
    try {
      setLoading(true);
      await adminAPI.publishQuiz(quizId);
      toast.success('Quiz published');
      setForm(initialState);
      setQuizId(null);
      setQuizMeta(null);
      setQuestionsList([]);
      setEditableQuestions([]);
      setAttachmentFile(null);
      // refresh quizzes list
      try {
        const res = await adminAPI.getAllQuizzes();
        const list = res.data?.quizzes || res.data || [];
        setAllQuizzes(list);
      } catch (err) {
        console.error(err);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to publish quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectQuestion = () => {
    // No-op on builder; detailed editing happens in QuizEdit page.
  };

  const handleDeleteQuiz = async (id) => {
    setPendingDeleteQuiz(id);
  };

  const handleEditQuizMeta = async (id) => {
    try {
      setLoading(true);
      const res = await adminAPI.getQuizDetails(id);
      const quiz = res.data;
      setQuizId(quiz._id);
      setQuizMeta(quiz);
      const qs = quiz.questions || [];
      setQuestionsList(qs);
      setEditableQuestions(
        qs.map((q) => {
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
      );
      setForm({
        title: quiz.title || '',
        description: quiz.description || '',
        classroom: quiz.classroom?._id || '',
        type: quiz.type || 'practice',
        timeLimit: quiz.settings?.timeLimit ?? 30,
      });
      if (qs.length > 0) {
        const first = qs[0];
        const baseOptions = (first.options || []).map((o) => o.text);
        while (baseOptions.length < 4) baseOptions.push('');
        const correctIdx = (first.options || []).findIndex((o) => o.isCorrect);
        setQuestion({
          text: first.text || '',
          options: baseOptions.slice(0, 4),
          correctIndex: correctIdx >= 0 ? correctIdx : 0,
          marks: first.marks || 1,
        });
        setEditingQuestionId(first._id);
      } else {
        setQuestion({ text: '', options: ['', '', '', ''], correctIndex: 0, marks: 1 });
        setEditingQuestionId(null);
      }
      setAttachmentFile(null);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };


  const publishedCount = useMemo(
    () => allQuizzes.filter((q) => q.status === 'published').length,
    [allQuizzes]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-50 mb-1">Quiz Builder</h1>
        <p className="text-sm text-slate-400 max-w-xl">
          Create quizzes for your classrooms. Published quizzes will automatically appear in the student quiz list.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: form + question editor */}
        <div className="space-y-6 xl:col-span-2">
          {/** Quiz meta form **/}
          <form onSubmit={handleSubmit} className="card space-y-4">
            {/* Title + classroom */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Quiz title</label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Midterm – DBMS"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Classroom ID (optional)</label>
                <input
                  name="classroom"
                  value={form.classroom}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Paste classroom ObjectId (optional)"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                className="input-field resize-none"
                placeholder="Short description for students..."
              />
            </div>

            {/* Type + time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Type</label>
                <select
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="practice">Practice</option>
                  <option value="live">Live</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Time limit (minutes)</label>
                <input
                  type="number"
                  min={1}
                  name="timeLimit"
                  value={form.timeLimit}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={loading || !!quizId}
                className="btn-primary text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : quizId ? 'Quiz Created' : 'Create Quiz'}
              </button>
            </div>
          </form>

          {/** Attachments + MCQ editor **/}
          {quizId && (
            <div className="card space-y-6">
              <div className="flex flex-col gap-1">
                <p className="text-xs text-slate-400">Quiz ID</p>
                <p className="text-sm font-medium text-slate-100 break-all">{quizId}</p>
              </div>

              {/* Attachments */}
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-50">Upload PDF / Image</h2>
                <div className="flex flex-col md:flex-row gap-3 md:items-center">
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                    className="input-field"
                  />
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleUploadAttachment}
                    className="btn-secondary text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
                {!!quizMeta?.attachments?.length && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-400">Attachments</p>
                    <ul className="space-y-1 text-sm text-slate-200">
                      {quizMeta.attachments.map((a) => (
                        <li key={a.publicId || a.url}>
                          <a
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary-200 hover:underline"
                          >
                            {a.fileName || a.url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Question editing moved to dedicated page */}
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-slate-50">Questions</h2>
                <p className="text-xs text-slate-400">
                  To add or edit questions for this quiz, open the dedicated edit page.
                </p>
                <button
                  type="button"
                  onClick={() => navigate(`/admin/quizzes/${quizId}/edit`)}
                  className="btn-secondary text-xs md:text-sm"
                >
                  Edit questions for this quiz
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handlePublish}
                  className="btn-primary text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? 'Publishing...' : 'Publish Quiz'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: sidebar lists */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
        >
          {/* Quizzes list */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-50">Your quizzes</h2>
                <p className="text-xs text-slate-400">
                  {loadingQuizzes
                    ? 'Loading quizzes...'
                    : `${publishedCount} published / ${allQuizzes.length} total`}
                </p>
              </div>
            </div>

            {loadingQuizzes ? (
              <p className="text-xs text-slate-500">Loading quizzes...</p>
            ) : allQuizzes.length === 0 ? (
              <p className="text-xs text-slate-500">No quizzes created yet.</p>
            ) : (
              <div className="space-y-1 max-h-[320px] overflow-y-auto">
                {allQuizzes.map((q) => (
                  <div
                    key={q._id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-200"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{q.title}</p>
                      <p className="text-[11px] text-slate-400">
                        Status: <span className="capitalize">{q.status}</span> • Type: {q.type}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/quizzes/${q._id}/edit`)}
                        className="px-2 py-1 rounded-md border border-slate-700 text-[11px] hover:border-primary-500/70 hover:text-primary-200"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteQuiz(q._id)}
                        className="px-2 py-1 rounded-md border border-rose-600/80 text-[11px] text-rose-200 hover:bg-rose-600/10"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Questions for selected quiz */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-50">
                  Questions{quizMeta?.title ? ` – ${quizMeta.title}` : ''}
                </h2>
                <p className="text-xs text-slate-400">
                  {quizId
                    ? questionsList.length
                      ? `${questionsList.length} questions in this quiz`
                      : 'No questions added yet.'
                    : 'Select a quiz to view its questions.'}
                </p>
              </div>
              {questionsList.length > 0 && (
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <span>Go to</span>
                  <select
                    className="input-field px-2 py-1 text-[11px] max-w-[80px]"
                    value={editingQuestionId || ''}
                    onChange={(e) => {
                      const q = questionsList.find((qq) => qq._id === e.target.value);
                      if (q) handleSelectQuestion(q);
                    }}
                  >
                    <option value="">Q #</option>
                    {questionsList.map((q, index) => (
                      <option key={q._id} value={q._id}>
                        Q{index + 1}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {quizId ? (
              questionsList.length === 0 ? (
                <p className="text-xs text-slate-500">Add your first question to see it here.</p>
              ) : (
                <div className="space-y-1 max-h-[320px] overflow-y-auto">
                  {questionsList.map((q, index) => {
                    const active = editingQuestionId === q._id;
                    return (
                      <motion.button
                        key={q._id}
                        type="button"
                        onClick={() => handleSelectQuestion(q)}
                        className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                          active
                            ? 'border-primary-500/70 bg-primary-500/10 text-primary-100'
                            : 'border-slate-800 bg-slate-900/60 text-slate-200 hover:border-primary-500/40'
                        }`}
                        whileHover={{ scale: 1.01 }}
                      >
                        <p className="font-medium line-clamp-1">
                          Question {index + 1}: {q.text}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Marks: {q.marks || 1}</p>
                      </motion.button>
                    );
                  })}
                </div>
              )
            ) : (
              <p className="text-xs text-slate-500">Choose a quiz from the list above to manage its questions.</p>
            )}
          </div>
        </motion.div>
      {/* Delete confirmation modal */}
      {pendingDeleteQuiz && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
          <div className="card max-w-sm w-full space-y-4 border border-slate-800 shadow-xl">
            <h2 className="text-sm font-semibold text-slate-50">Delete quiz?</h2>
            <p className="text-xs text-slate-400">
              This will remove the quiz for students. You can create it again later if needed.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingDeleteQuiz(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-200 hover:border-slate-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = pendingDeleteQuiz;
                  setPendingDeleteQuiz(null);
                  try {
                    await adminAPI.deleteQuiz(id);
                    toast.success('Quiz deleted');
                    setAllQuizzes((prev) => prev.filter((q) => q._id !== id));
                    if (quizId === id) {
                      setForm(initialState);
                      setQuizId(null);
                      setQuizMeta(null);
                      setQuestionsList([]);
                      setQuestion({ text: '', options: ['', '', '', ''], correctIndex: 0, marks: 1 });
                      setEditingQuestionId(null);
                      setAttachmentFile(null);
                    }
                  } catch (error) {
                    toast.error(error.response?.data?.message || 'Failed to delete quiz');
                  }
                }}
                className="px-3 py-1.5 rounded-lg border border-rose-600/80 bg-rose-600/10 text-xs text-rose-200 hover:bg-rose-600/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default QuizBuilder;
