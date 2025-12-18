import { useState } from 'react';
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
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);

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
        },
      };

      // Only include classroom if it looks like a valid ObjectId (24 hex chars)
      const classroomTrimmed = form.classroom.trim();
      if (/^[0-9a-fA-F]{24}$/.test(classroomTrimmed)) {
        payload.classroom = classroomTrimmed;
      }

      await adminAPI.createQuiz(payload);

      toast.success('Quiz created successfully. Please add questions before publishing.');
      setForm(initialState);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create quiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-50 mb-1">Quiz Builder</h1>
        <p className="text-sm text-slate-400 max-w-xl">
          Create quizzes for your classrooms. Published quizzes will automatically appear in the student quiz list.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4 max-w-2xl">
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
            disabled={loading}
            className="btn-primary text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create & Publish Quiz'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuizBuilder;
