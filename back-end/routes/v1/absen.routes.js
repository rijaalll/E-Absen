// routes/v1/absen.routes.js

const express = require('express');
const router = express.Router();
const controller = require('../../controllers/absen.controller');
const { verifyToken, isGuru, isSiswa } = require('../../middleware/auth.middleware');
const verifyApiKey = require('../../middleware/apikey.middleware');

// Endpoint untuk Guru membuat QR Code
// Dilindungi oleh token JWT dan harus memiliki peran 'guru'
router.post('/generate-qr', [verifyToken, isGuru], controller.generateQrCode);

// Endpoint untuk Siswa melakukan scan QR
// Dilindungi oleh API Key website, token JWT, dan harus peran 'siswa'
router.post('/scan-qr', [verifyApiKey, verifyToken, isSiswa], controller.scanQrCode);

// Endpoint untuk melihat rekap absensi per kelas (Hanya Guru)
router.get('/kelas/:id_kelas', [verifyToken, isGuru], controller.getAbsenByKelas);

// Endpoint untuk melihat rekap absensi per siswa (Guru bisa lihat semua, siswa hanya bisa lihat miliknya)
router.get('/siswa/:id_siswa', [verifyToken], controller.getAbsenBySiswa);


module.exports = router;
