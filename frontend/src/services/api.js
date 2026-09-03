import api from '@/lib/axios';

// ── User ───────────────────────────────────────────────────────────
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  changePassword: (data) => api.put('/users/change-password', data),
  getDashboard: () => api.get('/users/dashboard'),
};

// ── Resume ─────────────────────────────────────────────────────────
export const resumeAPI = {
  upload: (formData) =>
    api.post('/resumes/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getAll: () => api.get('/resumes'),
  delete: (id) => api.delete(`/resumes/${id}`),
  setDefault: (id) => api.patch(`/resumes/${id}/default`),
  parse: (id, jobDescription = '') =>
    api.post(`/resumes/${id}/parse`, { jobDescription }),
};

// ── Interview ──────────────────────────────────────────────────────
export const interviewAPI = {
  create: (data) => api.post('/interviews', data),
  generateQuestions: (id) => api.post(`/interviews/${id}/generate`),
  getAll: (params) => api.get('/interviews', { params }),
  getById: (id) => api.get(`/interviews/${id}`),
  delete: (id) => api.delete(`/interviews/${id}`),
};

// ── Session ────────────────────────────────────────────────────────
export const sessionAPI = {
  start: (interviewId) => api.post('/sessions/start', { interviewId }),
  submitAnswer: (sessionId, data) => api.post(`/sessions/${sessionId}/answer`, data),
  nextQuestion: (sessionId, data) => api.post(`/sessions/${sessionId}/next-question`, data),
  complete: (sessionId, data = {}) => api.post(`/sessions/${sessionId}/complete`, data),
  getAll: (params) => api.get('/sessions', { params }),
  getById: (id) => api.get(`/sessions/${id}`),
};

// ── Agora Conversational AI Agent ─────────────────────────────────
export const agoraAPI = {
  start: (interviewId) => api.post(`/agora/${interviewId}/start`),
  stop: (interviewId) => api.post(`/agora/${interviewId}/stop`),
  nextQuestion: (interviewId, data) => api.post(`/agora/${interviewId}/next-question`, data),
  message: (interviewId, data) => api.post(`/agora/${interviewId}/message`, data),
};

