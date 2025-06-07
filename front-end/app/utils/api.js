import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

// Guru APIs (using same endpoints as siswa for CRUD operations)
export const guruAPI = {
  getAll: () => api.get('/guru'), // This would need to be added to backend
  create: (data) => api.post('/guru', data), // This would need to be added to backend
  update: (id, data) => api.put(`/guru/${id}`, data), // This would need to be added to backend
  delete: (id) => api.delete(`/guru/${id}`), // This would need to be added to backend
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
  verify: (data) => api.post('/qr/verify', data),
};

// Absen APIs
export const absenAPI = {
  getAll: (params) => api.get('/absen', { params }),
  getBySiswa: (id_siswa, params) => api.get(`/absen/siswa/${id_siswa}`, { params }),
};

export default api;