import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

const initialState = {
  title: '',
  description: '',
  classroom: '',
  type: 'practice',
  timeLimit: 30,
  startTime: '',
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
  const [viewingSubmissionsId, setViewingSubmissionsId] = useState(null);
  const [submissionsData, setSubmissionsData] = useState(null);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [question, setQuestion] = useState({ text: '', options: ['', '', '', ''], correctIndex: 0, marks: 1 });
  const [editingQuestionId, setEditingQuestionId] = useState(null);

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
        startTime: form.type === 'live' ? form.startTime : null,
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
        startTime: quiz.startTime ? new Date(quiz.startTime).toISOString().slice(0, 16) : '',
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

  const handleViewSubmissions = async (id) => {
    try {
      setViewingSubmissionsId(id);
      setLoadingSubmissions(true);
      const res = await adminAPI.getQuizSubmissions(id);
      setSubmissionsData(res.data);
    } catch (error) {
       toast.error(error.response?.data?.message || 'Failed to load submissions');
       setViewingSubmissionsId(null);
    } finally {
       setLoadingSubmissions(false);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };


  const stats = useMemo(() => ({
    total: allQuizzes.length,
    published: allQuizzes.filter(q => q.status === 'published').length,
    live: allQuizzes.filter(q => q.type === 'live').length,
    practice: allQuizzes.filter(q => q.type === 'practice').length,
  }), [allQuizzes]);

  const [activeTab, setActiveTab] = useState('all'); // 'all', 'live', 'practice'

  const filteredQuizzes = useMemo(() => {
    if (activeTab === 'all') return allQuizzes;
    return allQuizzes.filter(q => q.type === activeTab);
  }, [allQuizzes, activeTab]);

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <motion.div
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-3xl font-black text-slate-50 tracking-tight">Quiz Management</h1>
          <p className="text-sm text-slate-400 mt-1">Create, schedule, and analyze student assessments</p>
        </motion.div>
        <motion.div 
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           className="flex gap-3"
        >
           <button 
             onClick={() => {
                setQuizId(null);
                setForm(initialState);
                window.scrollTo({ top: 300, behavior: 'smooth' });
             }}
             className="px-6 py-2.5 rounded-xl bg-primary-600 text-white font-bold text-sm shadow-lg shadow-primary-500/20 hover:bg-primary-500 transition-all active:scale-95"
           >
              + Create New Quiz
           </button>
        </motion.div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
         <AdminStatCard label="Total Quizzes" value={stats.total} icon="📚" color="primary" />
         <AdminStatCard label="Live Events" value={stats.live} icon="⚡" color="amber" />
         <AdminStatCard label="Practice Sets" value={stats.practice} icon="🎯" color="sky" />
         <AdminStatCard label="Published" value={stats.published} icon="✅" color="emerald" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left: Management Area */}
        <div className="space-y-6 xl:col-span-2">
          
          {/* Quiz Inventory */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card !p-0 overflow-hidden border border-slate-800"
          >
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/30 flex items-center justify-between">
               <div>
                  <h2 className="text-sm font-bold text-slate-50 uppercase tracking-wider">Quiz Inventory</h2>
                  <p className="text-[10px] text-slate-500 font-medium">Manage and monitor active assessments</p>
               </div>
               <div className="flex bg-slate-800/50 p-1 rounded-lg">
                  {['all', 'live', 'practice'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all uppercase ${
                        activeTab === tab ? 'bg-primary-500 text-slate-900 shadow-lg' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
               </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/50">
                    <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-500">Quiz Info</th>
                    <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-500">Settings</th>
                    <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-500">Status</th>
                    <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {loadingQuizzes ? (
                    <tr><td colSpan="4" className="text-center py-12 text-slate-500 text-xs italic">Loading inventory...</td></tr>
                  ) : filteredQuizzes.length === 0 ? (
                    <tr><td colSpan="4" className="text-center py-12 text-slate-500 text-xs italic">No quizzes found in this category.</td></tr>
                  ) : (
                    filteredQuizzes.map((q) => (
                      <tr key={q._id} className="hover:bg-slate-800/20 group transition-colors">
                        <td className="px-6 py-4">
                           <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-100 group-hover:text-primary-400 transition-colors">
                                {q.title}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium truncate max-w-[200px]">
                                {q.description || 'No description provided'}
                              </span>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-xs">
                           <div className="flex flex-col gap-1">
                              <span className={`w-fit px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                                q.type === 'live' ? 'bg-amber-500/10 text-amber-400' : 'bg-sky-500/10 text-sky-400'
                              }`}>
                                {q.type}
                              </span>
                              <span className="text-slate-400 font-medium">{q.settings?.timeLimit || 0}m limit</span>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              q.status === 'published' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700/50 text-slate-400'
                           }`}>
                              {q.status}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleViewSubmissions(q._id)}
                                className="p-1.5 rounded-lg border border-slate-700 hover:border-emerald-500 hover:text-emerald-400 bg-slate-800/40"
                                title="View Submissions"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                              </button>
                              <button
                                onClick={() => navigate(`/admin/quizzes/${q._id}/edit`)}
                                className="p-1.5 rounded-lg border border-slate-700 hover:border-primary-500 hover:text-primary-400 bg-slate-800/40"
                                title="Edit Content"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button
                                onClick={() => handleEditQuizMeta(q._id)}
                                className="p-1.5 rounded-lg border border-slate-700 hover:border-amber-500 hover:text-amber-400 bg-slate-800/40"
                                title="Edit Settings"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                              </button>
                              <button
                                onClick={() => handleDeleteQuiz(q._id)}
                                className="p-1.5 rounded-lg border border-slate-700 hover:border-rose-500 hover:text-rose-400 bg-slate-800/40"
                                title="Delete Quiz"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                           </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/** Creation / Update Section **/}
          <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             id="create-quiz-section"
             className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div className="card space-y-4 border border-primary-500/10 bg-primary-500/5">
              <div className="flex items-center gap-3 mb-2">
                 <div className="h-8 w-8 rounded-lg bg-primary-500 flex items-center justify-center text-slate-900 font-bold">
                    {quizId ? '✎' : '+'}
                 </div>
                 <h2 className="text-sm font-bold text-slate-50 uppercase tracking-widest">
                    {quizId ? 'Update Metadata' : 'Create Context'}
                 </h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-black uppercase">Quiz Title</label>
                  <input
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    className="input-field !bg-slate-950/40"
                    placeholder="e.g. Data Structures Finale"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-black uppercase">Classroom Reference</label>
                  <input
                    name="classroom"
                    value={form.classroom}
                    onChange={handleChange}
                    className="input-field !bg-slate-950/40 text-xs"
                    placeholder="Classroom ObjectId"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-black uppercase">Short Description</label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={2}
                    className="input-field !bg-slate-950/40 resize-none text-xs"
                    placeholder="Objectives and syllabus coverage..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-black uppercase">Type</label>
                    <select
                      name="type"
                      value={form.type}
                      onChange={handleChange}
                      className="input-field !bg-slate-950/40 text-xs"
                    >
                      <option value="practice">Practice</option>
                      <option value="live">Live (Scheduled)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-black uppercase">Limit (Mins)</label>
                    <input
                      type="number"
                      name="timeLimit"
                      value={form.timeLimit}
                      onChange={handleChange}
                      className="input-field !bg-slate-950/40 text-xs"
                    />
                  </div>
                </div>

                {form.type === 'live' && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="space-y-1"
                  >
                    <label className="text-[10px] text-slate-500 font-black uppercase">Start Schedule</label>
                    <input
                      type="datetime-local"
                      name="startTime"
                      value={form.startTime}
                      onChange={handleChange}
                      className="input-field !bg-slate-950/40 text-xs"
                    />
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loading || (!!quizId && !quizMeta)}
                  className="btn-primary w-full py-2.5 text-xs font-black uppercase tracking-widest shadow-xl shadow-primary-500/20"
                >
                  {loading ? 'Processing...' : quizId ? 'Update Metadata' : 'Initialize Quiz'}
                </button>
              </form>
            </div>

            {/* Sub-Actions for initialized quiz */}
            <div className={`space-y-6 ${!quizId ? 'opacity-30 pointer-events-none transition-opacity' : ''}`}>
               <div className="card space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-sky-500 flex items-center justify-center text-slate-900 font-bold">↑</div>
                    <h2 className="text-sm font-bold text-slate-50 uppercase tracking-widest">Resources</h2>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[10px] text-slate-400 font-medium">Add PDF reference or diagrams for students.</p>
                    <input
                      type="file"
                      id="quiz-attachment"
                      accept="application/pdf,image/*"
                      onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <label 
                      htmlFor="quiz-attachment"
                      className="block w-full border-2 border-dashed border-slate-700 rounded-xl p-4 text-center cursor-pointer hover:border-sky-500/50 hover:bg-sky-500/5 transition-all"
                    >
                       <span className="text-xs text-slate-400">{attachmentFile ? attachmentFile.name : 'Select PDF or Image'}</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleUploadAttachment}
                      disabled={!attachmentFile || loading}
                      className="w-full py-2 rounded-lg bg-slate-800 text-[10px] font-black uppercase text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                    >
                      {loading ? 'Uploading...' : 'Upload Attachment'}
                    </button>
                  </div>
               </div>

               <div className="card space-y-4 border border-emerald-500/10 bg-emerald-500/5">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-900 font-bold">🛰</div>
                    <h2 className="text-sm font-bold text-slate-50 uppercase tracking-widest">Finalize</h2>
                  </div>
                  <div className="space-y-3">
                     <p className="text-[10px] text-slate-400 font-medium">Review context and questions before broadcasting.</p>
                     <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/admin/quizzes/${quizId}/edit`)}
                          className="flex-1 py-3 rounded-xl bg-slate-800 text-[10px] font-black uppercase text-slate-100 hover:bg-slate-700"
                        >
                           Edit Questions
                        </button>
                        <button
                          onClick={handlePublish}
                          disabled={loading}
                          className="flex-1 py-3 rounded-xl bg-emerald-600 text-[10px] font-black uppercase text-white hover:bg-emerald-500 shadow-lg shadow-emerald-500/20"
                        >
                           Go Live
                        </button>
                     </div>
                  </div>
               </div>
            </div>
          </motion.div>
        </div>

        {/* Right: Sidebar Content View */}
        <div className="space-y-6">
           {/* Detailed Progress / Question List */}
           <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             className="card !p-0 overflow-hidden border border-slate-800"
           >
              <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/30 flex items-center justify-between">
                 <h2 className="text-[11px] font-black text-slate-50 uppercase tracking-tighter">Content Overview</h2>
                 <span className="text-[10px] font-bold text-slate-500">{questionsList.length} Items</span>
              </div>
              
              <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
                {quizId ? (
                   questionsList.length === 0 ? (
                      <div className="text-center py-12">
                         <div className="text-4xl mb-2 opacity-20">📝</div>
                         <p className="text-xs text-slate-500 italic">No questions in this quiz context.</p>
                         <button 
                           onClick={() => navigate(`/admin/quizzes/${quizId}/edit`)}
                           className="mt-4 text-[10px] font-bold text-primary-400 uppercase underline"
                         >
                            Add Questions Now
                         </button>
                      </div>
                   ) : (
                      questionsList.map((q, idx) => (
                        <div key={q._id} className="p-3 rounded-xl bg-slate-800/20 border border-slate-800/50 hover:border-slate-700 transition-all flex gap-3">
                           <div className="h-6 w-6 rounded-md bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-500">
                              {idx + 1}
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-bold text-slate-200 line-clamp-2">{q.text}</p>
                              <div className="flex items-center gap-2 mt-1">
                                 <span className="text-[9px] font-black text-slate-500 uppercase">{q.options.length} Options</span>
                                 <span className="text-[9px] font-black text-primary-500 uppercase">{q.marks} Marks</span>
                              </div>
                           </div>
                        </div>
                      ))
                   )
                ) : (
                  <div className="text-center py-12">
                     <p className="text-xs text-slate-500 italic mb-4">Initialize or select a quiz context to view structured content.</p>
                     <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full w-1/3 bg-slate-800" />
                     </div>
                  </div>
                )}
              </div>
           </motion.div>

           {/* Quiz Selection Info */}
           {quizId && quizMeta && (
             <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="card bg-gradient-to-br from-indigo-900/20 to-primary-900/20 border-primary-500/20 p-6"
             >
                <div className="flex items-center justify-between mb-4">
                   <h3 className="text-xs font-black text-primary-400 uppercase tracking-widest">Active Context</h3>
                   <button onClick={() => setQuizId(null)} className="text-slate-500 hover:text-slate-300">✕</button>
                </div>
                <div className="space-y-4">
                   <div>
                      <p className="text-lg font-bold text-slate-100">{quizMeta.title}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">{quizMeta.type} • ID: {quizId.slice(-6)}</p>
                   </div>
                   <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 rounded bg-slate-950/60 text-[9px] font-black text-slate-400">CLASS: {quizMeta.classroom?.name || 'GEN'}</span>
                      <span className="px-2 py-1 rounded bg-slate-950/60 text-[9px] font-black text-slate-400">QUES: {questionsList.length}</span>
                      <span className="px-2 py-1 rounded bg-slate-950/60 text-[9px] font-black text-slate-400">STATUS: {quizMeta.status}</span>
                   </div>
                </div>
             </motion.div>
           )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {pendingDeleteQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card max-w-sm w-full space-y-6 border border-rose-500/20 shadow-2xl shadow-rose-500/10"
          >
            <div className="text-center">
               <div className="h-16 w-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
               </div>
               <h2 className="text-xl font-bold text-slate-50">Permanent Deletion</h2>
               <p className="text-sm text-slate-400 mt-2">
                 Are you sure you want to remove this quiz? This action is irreversible and will purge all student attempts.
               </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={async () => {
                  const id = pendingDeleteQuiz;
                  setPendingDeleteQuiz(null);
                  try {
                    await adminAPI.deleteQuiz(id);
                    toast.success('Quiz deleted successfully');
                    setAllQuizzes((prev) => prev.filter((q) => q._id !== id));
                    if (quizId === id) {
                      setForm(initialState);
                      setQuizId(null);
                      setQuizMeta(null);
                      setQuestionsList([]);
                      setEditingQuestionId(null);
                      setAttachmentFile(null);
                    }
                  } catch (error) {
                    toast.error(error.response?.data?.message || 'Failed to delete quiz');
                  }
                }}
                className="w-full py-3 rounded-xl bg-rose-600 text-sm font-bold text-white hover:bg-rose-500 shadow-lg shadow-rose-500/20"
              >
                Yes, Delete Permanently
              </button>
              <button
                type="button"
                onClick={() => setPendingDeleteQuiz(null)}
                className="w-full py-3 rounded-xl bg-slate-800 text-sm font-bold text-slate-300 hover:bg-slate-700"
              >
                No, Keep Quiz
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {/* Quiz History / Submissions Modal */}
      <AnimatePresence>
        {viewingSubmissionsId && (
          <QuizSubmissionsModal 
            isOpen={!!viewingSubmissionsId} 
            onClose={() => {
              setViewingSubmissionsId(null);
              setSubmissionsData(null);
            }}
            data={submissionsData}
            loading={loadingSubmissions}
            formatTime={formatTime}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// --- New Components ---

const QuizSubmissionsModal = ({ isOpen, onClose, data, loading, formatTime }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        className="card max-w-4xl w-full h-[80vh] flex flex-col border border-slate-800 shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
           <div>
              <h2 className="text-xl font-black text-slate-50 tracking-tight">Quiz Submission Report</h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                 {loading ? 'Fetching participants...' : `${data?.quiz?.title || 'System Quiz'} • ${data?.submissions?.length || 0} Participated`}
              </p>
           </div>
           <button 
             onClick={onClose}
             className="h-10 w-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center border border-slate-700 transition-colors"
           >
              ✕
           </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-0 custom-scrollbar">
           {loading ? (
             <div className="flex flex-col items-center justify-center h-full py-20 space-y-4">
                <div className="h-12 w-12 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Compiling Analytics Data...</p>
             </div>
           ) : !data || data.submissions?.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                <span className="text-5xl mb-4 grayscale">🏜️</span>
                <h3 className="text-lg font-bold text-slate-200">No Participants Recorded</h3>
                <p className="text-xs text-slate-500 max-w-xs mt-2 font-medium">This quiz hasn't received any graded submissions yet. Data will appear here once students complete the assessment.</p>
             </div>
           ) : (
             <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-900 z-10">
                   <tr className="border-b border-slate-800">
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">Student Identity</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">Performance</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">Time Taken</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">Attempted Date</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 text-right">Action</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                   {data.submissions.map((s, idx) => (
                     <tr key={s._id} className="hover:bg-slate-800/20 transition-colors group">
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-linear-to-tr from-slate-800 to-slate-700 flex items-center justify-center text-xs font-black text-slate-300 border border-slate-700 group-hover:border-primary-500/30 transition-colors uppercase">
                                 {s.student?.username?.[0]}
                              </div>
                              <div className="flex flex-col">
                                 <span className="text-sm font-bold text-slate-100">{s.student?.username || 'Redacted User'}</span>
                                 <span className="text-[10px] text-slate-500 font-medium">{s.student?.email}</span>
                              </div>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                 <span className="text-sm font-black text-slate-50">{s.percentage}%</span>
                                 <div className="h-1.5 w-16 bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full ${s.percentage >= 60 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                      style={{ width: `${s.percentage}%` }}
                                    />
                                 </div>
                              </div>
                              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                                 {s.score} / {s.maxScore} Marks
                              </span>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-2">
                              <span className="text-xl">⏱</span>
                              <span className="text-xs font-bold text-slate-300">{formatTime(s.timeTaken)}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <span className="text-[11px] font-medium text-slate-400">
                              {s.submittedAt ? new Date(s.submittedAt).toLocaleString() : 'N/A'}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                           {/* Using window.location.href or a simple navigate logic if available */}
                           <Link 
                             to={`/admin/attempts/${s._id}`}
                             className="px-3 py-1.5 rounded-lg bg-primary-600/10 text-primary-400 text-[10px] font-black uppercase hover:bg-primary-600 hover:text-white transition-all inline-block border border-primary-500/20"
                           >
                              Inspect Detailed
                           </Link>
                        </td>
                     </tr>
                   ))}
                </tbody>
             </table>
           )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/40 flex items-center justify-between">
           <p className="text-[9px] text-slate-500 font-bold uppercase italic">
              * Data sorted by score (primary) and time efficiency (secondary)
           </p>
           <button 
             onClick={onClose}
             className="px-6 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-black uppercase hover:bg-slate-700 transition-all"
           >
              Close Analyzer
           </button>
        </div>
      </motion.div>
    </div>
  );
};

const AdminStatCard = ({ label, value, icon, color }) => {
  const themes = {
    primary: 'text-primary-400 border-primary-500/20 bg-primary-500/5',
    amber: 'text-amber-400 border-amber-500/20 bg-amber-500/5',
    sky: 'text-sky-400 border-sky-500/20 bg-sky-500/5',
    emerald: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
  };
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className={`card p-5 border flex items-center justify-between ${themes[color] || 'border-slate-800 bg-slate-800/10'}`}
    >
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{label}</p>
        <p className="text-2xl font-black text-slate-50">{value}</p>
      </div>
      <div className="text-3xl opacity-80">{icon}</div>
    </motion.div>
  );
};

export default QuizBuilder;
