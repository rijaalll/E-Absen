// controllers/auth.controller.js

const db = require('../utils/firebaseDb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Fungsi untuk registrasi pengguna baru
exports.register = async (req, res) => {
    try {
        const { nama, telephone, email, password, jenis_kelamin, role, alamat, detail } = req.body;
        
        // Validasi input
        if (!email || !password || !nama || !role) {
            return res.status(400).send({ message: "Email, password, nama, dan role wajib diisi." });
        }

        // Hash password sebelum disimpan
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = uuidv4();

        const newUser = {
            id: userId,
            nama,
            telephone,
            email,
            password: hashedPassword,
            jenis_kelamin,
            role, // 'siswa' atau 'guru'
            alamat: alamat || {},
            detail: role === 'siswa' ? (detail || {}) : null
        };

        // Simpan ke Firebase Realtime Database
        await db.ref(`absen-app/user/${userId}`).set(newUser);

        res.status(201).send({ message: "Pengguna berhasil didaftarkan." });
    } catch (error) {
        res.status(500).send({ message: "Terjadi kesalahan saat registrasi.", error: error.message });
    }
};

// Fungsi untuk login pengguna
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).send({ message: "Email dan password wajib diisi." });
        }

        const usersRef = db.ref('absen-app/user');
        const snapshot = await usersRef.orderByChild('email').equalTo(email).once('value');
        
        if (!snapshot.exists()) {
            return res.status(404).send({ message: "Email tidak ditemukan." });
        }

        const userData = snapshot.val();
        const userId = Object.keys(userData)[0];
        const user = userData[userId];

        // Bandingkan password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).send({ message: "Password salah." });
        }

        // Buat token JWT
        const tokenPayload = {
            id: user.id,
            nama: user.nama,
            email: user.email,
            role: user.role,
        };
        // Jika siswa, tambahkan detail kelas ke payload
        if(user.role === 'siswa' && user.detail) {
            tokenPayload.kelas = user.detail.kelas;
            tokenPayload.jurusan = user.detail.jurusan;
        }

        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.status(200).send({
            message: "Login berhasil.",
            accessToken: token
        });

    } catch (error) {
        res.status(500).send({ message: "Terjadi kesalahan saat login.", error: error.message });
    }
};
