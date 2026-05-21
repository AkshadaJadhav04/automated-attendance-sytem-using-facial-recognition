import axios from 'axios'

const API = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('admin')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  login: (data) => API.post('/auth/login', data),
  check: () => API.get('/auth/check'),
}

export const studentAPI = {
  getAll: () => API.get('/students'),
  getById: (id) => API.get(`/students/${id}`),
  search: (query) => API.get(`/students/search?q=${query}`),
  create: (data) => API.post('/students', data),
  update: (id, data) => API.put(`/students/${id}`, data),
  delete: (id) => API.delete(`/students/${id}`),
  captureSamples: (data) => API.post('/students/capture-samples', data),
  getAttendance: (id) => API.get(`/students/${id}/attendance`),
}

export const subjectAPI = {
  getAll: () => API.get('/subjects'),
  create: (data) => API.post('/subjects', data),
  delete: (id) => API.delete(`/subjects/${id}`),
}

export const timetableAPI = {
  getAll: () => API.get('/timetable'),
  create: (data) => API.post('/timetable', data),
  delete: (id) => API.delete(`/timetable/${id}`),
  getCurrentLecture: (classDivision) =>
    API.get(`/timetable/current-lecture${classDivision ? `?class_division=${classDivision}` : ''}`),
}

export const attendanceAPI = {
  mark: (data) => API.post('/attendance/mark', data),
  getToday: (params) => API.get('/attendance/today', { params }),
  getRange: (params) => API.get('/attendance/range', { params }),
  getBySubject: (id, params) => API.get(`/attendance/subject/${id}`, { params }),
  markAbsent: (id) => API.post(`/attendance/mark-absent/${id}`),
  getAbsentStudents: () => API.get('/attendance/absent-students'),
  sendSMS: (data) => API.post('/attendance/send-sms', data),
  liveFeed: (data) => API.post('/attendance/live-feed', data),
}

export const dashboardAPI = {
  getStats: () => API.get('/dashboard/stats'),
  getSubjectStats: (params) => API.get('/dashboard/subject-stats', { params }),
  getRecentAttendance: () => API.get('/dashboard/recent-attendance'),
}

export const reportAPI = {
  daily: (params) => API.get('/reports/daily', { params, responseType: 'blob' }),
  monthly: (params) => API.get('/reports/monthly', { params, responseType: 'blob' }),
  student: (id) => API.get(`/reports/student/${id}`, { responseType: 'blob' }),
  subject: (id, params) => API.get(`/reports/subject/${id}`, { params, responseType: 'blob' }),
  exportExcel: (data) => API.post('/reports/export-excel', data, { responseType: 'blob' }),
  exportPDF: (data) => API.post('/reports/export-pdf', data, { responseType: 'blob' }),
}

export const smsAPI = {
  getLogs: () => API.get('/sms-logs'),
}

export default API
