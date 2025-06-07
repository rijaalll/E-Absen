import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for detailed error logging
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      data: error.config?.data,
      status: error.response?.status,
      errorMessage: error.response?.data?.error || error.message,
      responseData: error.response?.data,
    });
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (credentials) => api.post('/login', credentials),
};

// Siswa APIs
export const siswaAPI = {
  register: (data) => api.post('/siswa/register', data),
  getAll: () => api.get('/siswa'),
  getById: (id) => api.get(`/siswa/${id}`),
  update: (id, data) => api.put(`/siswa/${id}`, data),
};

// Guru APIs
export const guruAPI = {
  getAll: () => api.get('/guru'),
  create: (data) => api.post('/guru', data),
  update: (id, data) => api.put(`/guru/${id}`, data),
  delete: (id) => api.delete(`/guru/${id}`),
};

// Kelas APIs
export const kelasAPI = {
  getAll: () => api.get('/kelas'),
  getById: (id) => api.get(`/kelas/${id}`),
  create: (data) => api.post('/kelas', data),
  update: (id, data) => api.put(`/kelas/${id}`, data),
  delete: (id) => api.delete(`/kelas/${id}`),
};

// QR APIs
export const qrAPI = {
  get: (kelas, jurusan) => api.get(`/qr/${kelas}/${jurusan}`),
  getByKelas: (kelas, jurusan) => api.get(`/qr/${kelas}/${jurusan}`),
  generate: (data) => api.post('/qr/generate', data),
  refresh: (data) => api.put('/qr/refresh', data),
  verify: (data) =>
    api.post('/qr/verify', data).catch((error) => {
      console.error('QR Verification Failed:', {
        qrId: data.id,
        id_siswa: data.id_siswa,
        error: error.response?.data?.error || error.message,
        status: error.response?.status,
        responseData: error.response?.data,
      });
      throw error;
    }),
};

// Absen APIs
export const absenAPI = {
  getAll: (params) =>
    api.get('/absen', { params }).catch((error) => {
      console.error('Absen Fetch Failed:', { params, error: error.response?.data?.error || error.message });
      throw error;
    }),
  getBySiswa: (id_siswa, params) =>
    api.get(`/absen/siswa/${id_siswa}`, { params }).catch((error) => {
      console.error('Siswa Absen Fetch Failed:', {
        id_siswa,
        params,
        error: error.response?.data?.error || error.message,
      });
      throw error;
    }),
};

export default api;