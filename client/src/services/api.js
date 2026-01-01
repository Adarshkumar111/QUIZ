import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://quiz-3nae.onrender.com/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If access token expired, try refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const { token } = response.data;
        localStorage.setItem('token', token);

        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  verifyOtp: (data) => api.post('/auth/verify-otp', data),
  resendOtp: (data) => api.post('/auth/resend-otp', data),
};

// Admin APIs
export const adminAPI = {
  // Notes
  getAllNotes: (params) => api.get('/admin/notes', { params }),
  createNote: (formData) => api.post('/admin/notes', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  updateNote: (id, data) => api.put(`/admin/notes/${id}`, data),
  deleteNote: (id) => api.delete(`/admin/notes/${id}`),
  approveNote: (id) => api.post(`/admin/notes/${id}/approve`),
  rejectNote: (id, reason) => api.post(`/admin/notes/${id}/reject`, { reason }),
  
  // Quizzes
  getAllQuizzes: (params) => api.get('/admin/quizzes', { params }),
  createQuiz: (data) => api.post('/admin/quizzes', data),
  getQuizDetails: (id) => api.get(`/admin/quizzes/${id}`),
  updateQuiz: (id, data) => api.put(`/admin/quizzes/${id}`, data),
  deleteQuiz: (id) => api.delete(`/admin/quizzes/${id}`),
  publishQuiz: (id) => api.post(`/admin/quizzes/${id}/publish`),
  addQuizQuestions: (id, data) => api.post(`/admin/quizzes/${id}/questions`, data),
  updateQuizQuestion: (questionId, data) => api.put(`/admin/quizzes/questions/${questionId}`, data),
  uploadQuizAttachment: (id, formData) =>
    api.post(`/admin/quizzes/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  // Classrooms
  getAllClassrooms: () => api.get('/admin/classrooms'),
  createClassroom: (data) => api.post('/admin/classrooms', data),
  updateClassroom: (id, data) => api.put(`/admin/classrooms/${id}`, data),
  deleteClassroom: (id) => api.delete(`/admin/classrooms/${id}`),
  generateInvite: (id) => api.post(`/admin/classrooms/${id}/invite`),
  getClassroomTopics: (id) => api.get(`/admin/classrooms/${id}/topics`),
  createClassroomTopic: (id, data) => api.post(`/admin/classrooms/${id}/topics`, data),
  addClassroomTopicVideo: (id, topicId, formData) =>
    api.post(`/admin/classrooms/${id}/topics/${topicId}/videos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteClassroomTopic: (id, topicId) => api.delete(`/admin/classrooms/${id}/topics/${topicId}`),
  removeClassroomTopicVideo: (id, topicId, videoId) =>
    api.delete(`/admin/classrooms/${id}/topics/${topicId}/videos/${videoId}`),
  publishClassroomTopic: (id, topicId, published) =>
    api.put(`/admin/classrooms/${id}/topics/${topicId}/publish`, { published }),
  addAllUsersToClassroom: (id) =>
    api.post(`/admin/classrooms/${id}/add-all-users`),
  
  // Analytics
  getDashboardStats: () => api.get('/admin/analytics/dashboard'),
  getQuizPerformance: (params) => api.get('/admin/analytics/quiz-performance', { params }),
  getNotesDownloads: () => api.get('/admin/analytics/notes-downloads'),
  getEngagement: () => api.get('/admin/analytics/engagement'),
  getUserPerformanceSummary: (params) =>
    api.get('/admin/analytics/user-performance', { params }),
  getUserPerformanceDetail: (userId) =>
    api.get(`/admin/analytics/user-performance/${userId}`),
  getAttemptDetail: (attemptId) =>
    api.get(`/admin/quizzes/attempts/${attemptId}`),
  getQuizSubmissions: (quizId) =>
    api.get(`/admin/analytics/quiz-submissions/${quizId}`),

  // Groups (global)
  getGroups: () => api.get('/admin/groups'),
  createGroup: (data) => api.post('/admin/groups', data),
  updateGroup: (id, data) => api.put(`/admin/groups/${id}`, data),
  deleteGroup: (id) => api.delete(`/admin/groups/${id}`),
  getGroupStudents: (params) => api.get('/admin/groups/students', { params }),
  
  // Moderation
  muteUser: (id, duration) => api.post(`/admin/moderation/users/${id}/mute`, { duration }),
  banUser: (id) => api.post(`/admin/moderation/users/${id}/ban`),
  deleteMessage: (id, reason) => api.delete(`/admin/moderation/messages/${id}`, { data: { reason } }),
  getFlaggedContent: () => api.get('/admin/moderation/flagged'),
  
  // Announcements
  getAllAnnouncements: () => api.get('/admin/announcements'),
  createAnnouncement: (data) => api.post('/admin/announcements', data),
  deleteAnnouncement: (id) => api.delete(`/admin/announcements/${id}`),
  
  // Tickets
  getAllTickets: (params) => api.get('/admin/tickets', { params }),
  updateTicketStatus: (id, status) => api.put(`/admin/tickets/${id}/status`, { status }),
  replyToTicket: (id, message) => api.post(`/admin/tickets/${id}/reply`, { message }),
  getAllStudents: (params) => api.get('/admin/analytics/all-students', { params }),

  // Live Classes
  getAllLiveClasses: () => api.get('/admin/live-classes'),
  createLiveClass: (data) => api.post('/admin/live-classes', data),
  startLiveClass: (id) => api.patch(`/admin/live-classes/${id}/start`),
  endLiveClass: (id) => api.patch(`/admin/live-classes/${id}/end`),
  getClassAttendance: (id) => api.get(`/admin/live-classes/${id}/attendance`),
  uploadClassRecording: (id, formData) => api.post(`/admin/live-classes/${id}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteLiveClass: (id) => api.delete(`/admin/live-classes/${id}`),
  toggleLiveClassVisibility: (id) => api.patch(`/admin/live-classes/${id}/visibility`),
};

// User APIs
export const userAPI = {
  // Notes
  browseNotes: (params) => api.get('/notes', { params }),
  getNoteDetails: (id) => api.get(`/notes/${id}`),
  downloadNote: (id) => api.get(`/notes/${id}/download`),
  rateNote: (id, rating) => api.post(`/notes/${id}/rate`, { rating }),
  saveNote: (id) => api.post(`/notes/${id}/save`),
  unsaveNote: (id) => api.delete(`/notes/${id}/save`),
  uploadNote: (formData) => api.post('/notes/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  
  // Quizzes
  getAvailableQuizzes: (params) => api.get('/quizzes', { params }),
  startQuiz: (id) => api.post(`/quizzes/${id}/start`),
  submitQuiz: (id, data) => api.post(`/quizzes/${id}/submit`, data),
  getQuizResults: (id, attemptId) => api.get(`/quizzes/${id}/results`, { params: { attemptId } }),
  getLeaderboard: (id) => api.get(`/quizzes/${id}/leaderboard`),
  
  // Discussions
  getMessages: (classroomId, params) => api.get(`/discussions/${classroomId}`, { params }),
  postMessage: (classroomId, formData) => api.post(`/discussions/${classroomId}`, formData),
  replyToMessage: (messageId, content) => api.post(`/discussions/${messageId}/reply`, { content }),
  addReaction: (messageId, emoji) => api.post(`/discussions/${messageId}/react`, { emoji }),

  // Groups (global)
  getMyGroups: () => api.get('/groups/mine'),
  getGroupMessages: (groupId, params) => api.get(`/groups/${groupId}/messages`, { params }),
  postGroupMessage: (groupId, formData) => api.post(`/groups/${groupId}/messages`, formData),
  
  // Dashboard
  getDashboardOverview: () => api.get('/dashboard/overview'),
  getSavedNotes: () => api.get('/dashboard/saved-notes'),
  getQuizHistory: () => api.get('/dashboard/quiz-history'),
  getPerformance: () => api.get('/dashboard/performance'),
  getUpcomingEvents: () => api.get('/dashboard/events'),
  getNotifications: (params) => api.get('/dashboard/notifications', { params }),
  getUserClassrooms: () => api.get('/dashboard/classrooms'),
  // Classroom videos/topics (read-only)
  getClassroomTopicsWithVideos: (classroomId, params) =>
    api.get(`/classrooms/${classroomId}/topics`, { params }),
  getAllPublishedTopics: () => api.get('/classrooms/published/all'),
  markVideoWatched: (videoId) => api.post(`/classrooms/video/${videoId}/watched`),
  
  // Assignments
  getAssignments: (params) => api.get('/assignments', { params }),
  submitAssignment: (id, formData) => api.post(`/assignments/${id}/submit`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  
  // Profile
  getProfile: () => api.get('/profile'),
  updateProfile: (formData) => api.put('/profile', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getAchievements: () => api.get('/profile/achievements'),
  getLeaderboardGlobal: (params) => api.get('/profile/leaderboard', { params }),
  
  // Whiteboard
  createWhiteboardSession: (classroomId, title) => api.post(`/whiteboard/${classroomId}/create`, { title }),
  getWhiteboardSession: (sessionId) => api.get(`/whiteboard/${sessionId}`),
  updateWhiteboardSession: (sessionId, snapshot) => api.put(`/whiteboard/${sessionId}`, { snapshot }),

  // Live Classes
  getAvailableLiveClasses: () => api.get('/live-classes'),
  joinLiveClass: (id) => api.post(`/live-classes/${id}/join`),
  leaveLiveClass: (id) => api.post(`/live-classes/${id}/leave`),
};

export default api;
