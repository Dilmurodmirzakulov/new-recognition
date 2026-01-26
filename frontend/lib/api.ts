import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

// External API base URL (Proxied via Next.js to avoid CORS)
const API_BASE_URL = '/api/proxy';

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000
});

// Request interceptor to add token
api.interceptors.request.use((config) => {
  const token = Cookies.get('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for refresh token logic
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // If error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = Cookies.get('refreshToken');
      
      if (!refreshToken) {
        // No refresh token, redirect to login
        isRefreshing = false;
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        // Call refresh endpoint
        const response = await axios.post(`${API_BASE_URL}/Auth/Refresh`, {
          refreshToken
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        // Store new tokens
        Cookies.set('accessToken', accessToken);
        if (newRefreshToken) {
          Cookies.set('refreshToken', newRefreshToken);
        }

        // Update authorization header
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        
        // Process queued requests
        processQueue(null, accessToken);
        
        isRefreshing = false;

        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        processQueue(refreshError as Error, null);
        isRefreshing = false;
        
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        window.location.href = '/login';
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const attendanceService = {
  getMyModules: async () => {
    const response = await api.post('/Attendance/MyModulesStaff');
    return response.data;
  },
  
  getSlots: async (moduleId: number, teachingType: number) => {
    const response = await api.post('/Attendance/LessonsByParams', {
      moduleId,
      teachingType
    });
    return response.data;
  },
  
  getStudents: async (lessonGuidId: string, classId: number) => {
    // embeddingType is the identifier for the embedding method used (e.g., 'dilmurod' for this system)
    const response = await api.post(`/Attendance/StudentsByLesson?LessonGuidId=${lessonGuidId}&embeddingType=dilmurod&classId=${classId}`);
    // Normalize the response - API might return array directly or wrapped in an object
    const data = response.data;
    if (Array.isArray(data)) {
      return data;
    }
    // If wrapped in object, try common keys
    return data.students || data.data || data.result || [];
  },
  
  recordAttendance: async (classId: number, userId: string, confidence: number) => {
    const response = await api.post('/Attendance/SetAttendanceStudent', {
      classId,
      userId,
      confidence
    });
    return response.data;
  }
};

const pythonApi = axios.create({
  baseURL: 'http://localhost:5000',
  timeout: 300000 // 5 minutes for embedding
});

export const pythonService = {
  checkStudents: async (studentIds: string[]) => {
    const response = await pythonApi.post('/check-students', { student_ids: studentIds });
    return response.data;
  },

  embedStudents: async (students: { studentId: string; fullName: string }[]) => {
    const response = await pythonApi.post('/embed-students', { students });
    return response.data;
  }
};

export default api;
