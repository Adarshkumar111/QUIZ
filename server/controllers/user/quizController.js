import Quiz from '../../models/Quiz.js';
import QuizAttempt from '../../models/QuizAttempt.js';
import Question from '../../models/Question.js';
import gamificationService from '../../services/gamificationService.js';

// @desc    Get available quizzes
// @route   GET /api/quizzes
// @access  Private
export const getAvailableQuizzes = async (req, res) => {
  try {
    const { classroomId, type } = req.query;

    const query = { status: 'published', deletedAt: null };

    if (classroomId) query.classroom = classroomId;
    if (type) query.type = type;

    const quizzes = await Quiz.find(query)
      .populate('classroom', 'name')
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });

    // Attach per-user attempt stats so frontend can show status / next attempt / results
    const quizIds = quizzes.map((q) => q._id);
    const attempts = await QuizAttempt.find({
      quiz: { $in: quizIds },
      student: req.user._id,
      status: { $in: ['submitted', 'graded'] },
    })
      .sort({ submittedAt: -1 });

    const statsByQuizId = new Map();
    attempts.forEach((attempt) => {
      const key = attempt.quiz.toString();
      const existing = statsByQuizId.get(key);
      if (!existing) {
        statsByQuizId.set(key, {
          attemptCount: 1,
          latestAttemptId: attempt._id,
          latestPercentage: attempt.percentage,
          latestStatus: attempt.status,
        });
      } else {
        existing.attemptCount += 1;
      }
    });

    const enriched = quizzes.map((quiz) => {
      const key = quiz._id.toString();
      const stats = statsByQuizId.get(key) || { attemptCount: 0 };
      return {
        ...quiz.toObject(),
        userStats: stats,
      };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Start quiz attempt
// @route   POST /api/quizzes/:id/start
// @access  Private
export const startQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('questions');

    if (!quiz || quiz.status !== 'published') {
      return res.status(404).json({ message: 'Quiz not available' });
    }

    // Check if quiz has already been attempted and retake is not allowed
    if (!quiz.settings.allowRetake) {
      const existingAttempt = await QuizAttempt.findOne({
        quiz: quiz._id,
        student: req.user._id,
        status: { $in: ['submitted', 'graded'] },
      });

      if (existingAttempt) {
        return res.status(400).json({ message: 'Quiz retake not allowed' });
      }
    }

    // Shuffle questions if enabled
    let questions = quiz.questions;
    if (quiz.settings.shuffleQuestions) {
      questions = questions.sort(() => Math.random() - 0.5);
    }

    // Shuffle options if enabled
    if (quiz.settings.shuffleOptions) {
      questions = questions.map((q) => {
        if (q.type === 'MCQ' && q.options) {
          return {
            ...q.toObject(),
            options: q.options.sort(() => Math.random() - 0.5),
          };
        }
        return q;
      });
    }

    // Create quiz attempt
    const attempt = await QuizAttempt.create({
      quiz: quiz._id,
      student: req.user._id,
      maxScore: quiz.totalMarks,
      startedAt: new Date(),
      answers: questions.map((q) => ({
        question: q._id,
        selectedAnswer: null,
        isCorrect: false,
        marksAwarded: 0,
      })),
    });

    // Don't send correct answers to client
    const questionsForClient = questions.map((q) => {
      const qObj = q.toObject();
      delete qObj.correctAnswer;
      if (qObj.options) {
        qObj.options = qObj.options.map((opt) => ({
          text: opt.text,
          _id: opt._id,
        }));
      }
      return qObj;
    });

    res.json({
      attemptId: attempt._id,
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        timeLimit: quiz.settings.timeLimit,
        totalMarks: quiz.totalMarks,
        attachments: quiz.attachments || [],
      },
      questions: questionsForClient,
      startedAt: attempt.startedAt,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Submit quiz
// @route   POST /api/quizzes/:id/submit
// @access  Private
export const submitQuiz = async (req, res) => {
  try {
    const { attemptId, answers } = req.body;

    const attempt = await QuizAttempt.findById(attemptId).populate({
      path: 'quiz',
      populate: { path: 'questions' },
    });

    if (!attempt) {
      return res.status(404).json({ message: 'Quiz attempt not found' });
    }

    if (attempt.status !== 'in-progress') {
      return res.status(400).json({ message: 'Quiz already submitted' });
    }

    // Calculate time taken
    attempt.timeTaken = Math.floor((new Date() - attempt.startedAt) / 1000);
    attempt.submittedAt = new Date();

    // Grade answers
    let totalScore = 0;

    attempt.answers.forEach((answer, index) => {
      const submittedAnswer = answers.find(
        (a) => a.questionId === answer.question.toString()
      );

      if (submittedAnswer) {
        answer.selectedAnswer = submittedAnswer.answer;

        const question = attempt.quiz.questions.find(
          (q) => q._id.toString() === answer.question.toString()
        );

        if (question) {
          // Auto-grade based on question type
          if (question.type === 'MCQ') {
            const correctOption = question.options.find((opt) => opt.isCorrect);
            if (correctOption && correctOption.text === submittedAnswer.answer) {
              answer.isCorrect = true;
              answer.marksAwarded = question.marks;
              totalScore += question.marks;
            }
          } else if (question.type === 'TrueFalse') {
            if (question.correctAnswer.toString() === submittedAnswer.answer.toString()) {
              answer.isCorrect = true;
              answer.marksAwarded = question.marks;
              totalScore += question.marks;
            }
          } else if (question.type === 'ShortAnswer') {
            // For short answer, mark as needs manual grading
            answer.marksAwarded = 0; // Will be graded manually
          }
        }
      }
    });

    attempt.score = totalScore;
    attempt.calculatePercentage();
    attempt.status = 'graded';

    await attempt.save();

    // Award XP based on score
    const xpPoints = Math.floor(attempt.percentage / 10);
    await gamificationService.awardXP(req.user._id, xpPoints, 'Quiz completed');

    // Check for badges
    const userAttempts = await QuizAttempt.countDocuments({
      student: req.user._id,
      status: 'graded',
    });

    if (userAttempts === 1) {
      await gamificationService.awardBadge(req.user._id, 'FIRST_QUIZ');
    } else if (userAttempts === 10) {
      await gamificationService.awardBadge(req.user._id, 'ACTIVE_LEARNER');
    }

    if (attempt.percentage === 100) {
      await gamificationService.awardBadge(req.user._id, 'TOP_SCORER');
    }

    res.json({
      message: 'Quiz submitted successfully',
      attemptId: attempt._id,
      score: attempt.score,
      maxScore: attempt.maxScore,
      percentage: attempt.percentage,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get quiz results
// @route   GET /api/quizzes/:id/results
// @access  Private
export const getQuizResults = async (req, res) => {
  try {
    const { attemptId } = req.query;

    const attempt = await QuizAttempt.findOne({
      _id: attemptId,
      student: req.user._id,
    })
      .populate({
        path: 'quiz',
        populate: { path: 'questions' },
      })
      .populate('gradedBy', 'username');

    if (!attempt) {
      return res.status(404).json({ message: 'Quiz attempt not found' });
    }

    const results = {
      quiz: {
        title: attempt.quiz.title,
        totalMarks: attempt.maxScore,
      },
      score: attempt.score,
      percentage: attempt.percentage,
      timeTaken: attempt.timeTaken,
      submittedAt: attempt.submittedAt,
      status: attempt.status,
      feedback: attempt.feedback,
    };

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get leaderboard
// @route   GET /api/quizzes/:id/leaderboard
// @access  Private
export const getLeaderboard = async (req, res) => {
  try {
    const leaderboard = await QuizAttempt.find({
      quiz: req.params.id,
      status: 'graded',
    })
      .populate('student', 'username avatar level')
      .sort({ score: -1, timeTaken: 1 })
      .limit(20);

    const formattedLeaderboard = leaderboard.map((attempt, index) => ({
      rank: index + 1,
      username: attempt.student.username,
      avatar: attempt.student.avatar,
      level: attempt.student.level,
      score: attempt.score,
      percentage: attempt.percentage,
      timeTaken: attempt.timeTaken,
    }));

    res.json(formattedLeaderboard);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
