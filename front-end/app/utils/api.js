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
  delete: (id) => api.delete(`/siswa/${id}`),
};

// Guru APIs
export const guruAPI = {
  register: (data) => api.post('/guru/register', data),
  getAll: () => api.get('/guru'),
  getById: (id) => api.get(`/guru/${id}`),
  update: (id, data) => api.put(`/guru/${id}`, data),
  delete: (id) => api.delete(`/guru/${id}`),
};

// Kelas APIs
export const kelasAPI = {
  // Tingkat
  createTingkat: (data) => api.post('/kelas/tingkat', data),
  getAllTingkat: () => api.get('/kelas/tingkat'),
  
  // Jurusan
  createJurusan: (data) => api.post('/kelas/jurusan', data),
  getAllJurusan: () => api.get('/kelas/jurusan'),
  
  // Detail Kelas
  createDetail: (data) => api.post('/kelas/detail', data),
  getAllDetail: (params) => api.get('/kelas/detail', { params }),
  getDetailById: (id) => api.get(`/kelas/detail/${id}`),
  updateDetail: (id, data) => api.put(`/kelas/detail/${id}`, data),
  deleteDetail: (id) => api.delete(`/kelas/detail/${id}`),
};

// QR APIs
export const qrAPI = {
  generate: (data) => api.post('/qr/generate', data),
  refresh: (data) => api.put('/qr/refresh', data),
  getByKelas: (kelas, jurusan) => api.get(`/qr/${kelas}/${jurusan}`),
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