// Import library yang dibutuhkan
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import rute utama
const authRoutes = require('./routes/v1/auth.routes');
const userRoutes = require('./routes/v1/users.routes');
const kelasRoutes = require('./routes/v1/kelas.routes');
const absenRoutes = require('./routes/v1/absen.routes');

// Inisialisasi aplikasi Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Mengizinkan Cross-Origin Resource Sharing
app.use(express.json()); // Mem-parsing body request sebagai JSON
app.use(express.urlencoded({ extended: true }));

// Rute utama aplikasi
app.get('/', (req, res) => {
    res.json({ message: 'Selamat datang di API Absensi v1' });
});

// Menggunakan rute yang telah didefinisikan
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/kelas', kelasRoutes);
app.use('/api/v1/absen', absenRoutes);


// Menjalankan server
app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
