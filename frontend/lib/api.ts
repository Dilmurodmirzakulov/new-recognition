import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000  // Increased to 30 seconds for face detection processing
});

export const attendanceAPI = {
  // Start session
  startSession: async (className: string, subject: string, teacher_id: string) => {
    const res = await api.post('/attendance/sessions/start', {
      className,
      subject,
      teacher_id
    });
    return res.data;
  },

  // End session
  endSession: async (session_id: string) => {
    const res = await api.post(`/attendance/sessions/${session_id}/end`);
    return res.data;
  },

  // Detect faces
  detectFaces: async (session_id: string) => {
    const res = await api.post('/attendance/detect', { session_id });
    return res.data;
  },

  // Get session attendance
  getSessionAttendance: async (session_id: string) => {
    const res = await api.get(`/attendance/sessions/${session_id}/attendance`);
    return res.data;
  }
};

export default api;
