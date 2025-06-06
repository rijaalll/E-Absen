/* === File: lib/api.js === */
const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_KEY = process.env.NEXT_PUBLIC_WEBSITE_API_KEY;

// Helper function untuk fetch dengan error handling dan token
async function fetchWithAuth(endpoint, options = {}) {
    const token = localStorage.getItem('accessToken');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Terjadi kesalahan pada API');
    }
    
    return data;
}

// Auth
export const loginUser = (credentials) => fetchWithAuth('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
});

// Absen
export const generateQrCode = () => fetchWithAuth('/absen/generate-qr', { method: 'POST' });
export const scanQrCode = (payload) => fetchWithAuth('/absen/scan-qr', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'x-api-key': API_KEY } // Kirim API Key khusus untuk endpoint ini
});
export const getAbsenByKelas = (id_kelas) => fetchWithAuth(`/absen/kelas/${id_kelas}`);
export const getAbsenBySiswa = (id_siswa) => fetchWithAuth(`/absen/siswa/${id_siswa}`);

// Kelas
export const getAllKelas = () => fetchWithAuth('/kelas');

// Users
export const getAllUsers = () => fetchWithAuth('/users');
export const getUserById = (id) => fetchWithAuth(`/users/${id}`);
export const updateUser = (id, data) => fetchWithAuth(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
});
