// controllers/absen.controller.js

const db = require('../utils/firebaseDb');
const { v4: uuidv4 } = require('uuid');

// Fungsi untuk generate QR Code (oleh Guru)
exports.generateQrCode = async (req, res) => {
    try {
        const qrId = uuidv4();
        // Membuat string acak dengan 20 karakter
        const randomCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 9);
        
        const qrData = {
            id: qrId,
            code: randomCode,
            createdAt: new Date().toISOString(),
            // Set expired time for QR code, e.g., 5 minutes
            expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() 
        };

        // Simpan kode unik ke Firebase
        await db.ref(`absen-app/qr-unique-code/${qrId}`).set(qrData);

        res.status(201).send({ 
            message: "QR Code berhasil dibuat. Kode ini akan hangus dalam 5 menit.",
            code: randomCode 
        });
    } catch (error) {
        res.status(500).send({ message: "Gagal membuat QR Code.", error: error.message });
    }
};

// Fungsi untuk scan QR Code (oleh Siswa)
exports.scanQrCode = async (req, res) => {
    try {
        const { qrCode } = req.body;
        const siswaData = req.user; // Data siswa dari token JWT

        if (!qrCode) {
            return res.status(400).send({ message: "QR Code wajib diisi." });
        }

        // Cari QR code di database
        const qrRef = db.ref('absen-app/qr-unique-code');
        const snapshot = await qrRef.orderByChild('code').equalTo(qrCode).once('value');

        if (!snapshot.exists()) {
            return res.status(404).send({ message: "QR Code tidak valid atau sudah digunakan." });
        }

        const qrDataVal = snapshot.val();
        const qrId = Object.keys(qrDataVal)[0];
        const qrData = qrDataVal[qrId];

        // Cek apakah QR code sudah kedaluwarsa
        if (new Date() > new Date(qrData.expiresAt)) {
            // Hapus kode yang sudah kedaluwarsa
            await db.ref(`absen-app/qr-unique-code/${qrId}`).remove();
            return res.status(400).send({ message: "QR Code sudah kedaluwarsa." });
        }
        
        // Dapatkan ID kelas dari detail siswa
        const kelasRef = db.ref('absen-app/kelas');
        const kelasSnapshot = await kelasRef.orderByChild('kelas').equalTo(siswaData.kelas).once('value');

        if (!kelasSnapshot.exists()) {
            return res.status(404).send({ message: "Data kelas siswa tidak ditemukan." });
        }

        let id_kelas = null;
        const kelasData = kelasSnapshot.val();
        for (const key in kelasData) {
            if (kelasData[key].jurusan === siswaData.jurusan) {
                id_kelas = kelasData[key].id;
                break;
            }
        }
        
        if (!id_kelas) {
            return res.status(404).send({ message: "Kombinasi kelas dan jurusan siswa tidak cocok." });
        }

        // Buat record absen baru
        const now = new Date();
        const absenId = uuidv4();
        const absenRecord = {
            id: absenId,
            jam: now.getHours(),
            menit: now.getMinutes(),
            tanggal: now.getDate(),
            bulan: now.getMonth() + 1, // Bulan dimulai dari 0
            tahun: now.getFullYear(),
            keterangan: 'hadir',
            kelas: siswaData.kelas,
            jurusan: siswaData.jurusan
        };
        
        // Simpan data absen ke path: /absen/{id_kelas}/{id_siswa}/{id_absen_acak}
        await db.ref(`absen-app/absen/${id_kelas}/${siswaData.id}/${absenId}`).set(absenRecord);
        
        // Hapus QR Code setelah berhasil digunakan agar tidak bisa dipakai lagi
        await db.ref(`absen-app/qr-unique-code/${qrId}`).remove();

        res.status(200).send({ message: "Absensi berhasil dicatat." });

    } catch (error) {
        res.status(500).send({ message: "Gagal mencatat absensi.", error: error.message });
    }
};

// Fungsi untuk melihat rekap absen per kelas
exports.getAbsenByKelas = async (req, res) => {
    try {
        const { id_kelas } = req.params;
        const absenRef = db.ref(`absen-app/absen/${id_kelas}`);
        const snapshot = await absenRef.once('value');
        if (!snapshot.exists()) {
            return res.status(404).send({ message: "Belum ada data absensi untuk kelas ini." });
        }
        res.status(200).send(snapshot.val());
    } catch (error) {
        res.status(500).send({ message: "Gagal mengambil data.", error: error.message });
    }
};

// Fungsi untuk melihat rekap absen per siswa
exports.getAbsenBySiswa = async (req, res) => {
    try {
        const { id_siswa } = req.params;

        // Validasi: hanya user yang bersangkutan atau guru yang boleh lihat
        if (req.user.role === 'siswa' && req.user.id !== id_siswa) {
            return res.status(403).send({ message: "Anda tidak punya akses untuk melihat data ini." });
        }
        
        // Query semua absensi
        const absenRef = db.ref(`absen-app/absen`);
        const snapshot = await absenRef.once('value');
        if (!snapshot.exists()) {
            return res.status(404).send({ message: "Tidak ada data absensi." });
        }

        const allAbsen = snapshot.val();
        const siswaAbsen = {};

        // Filter data untuk siswa yang spesifik
        for (const id_kelas in allAbsen) {
            if (allAbsen[id_kelas][id_siswa]) {
                if (!siswaAbsen[id_kelas]) {
                    siswaAbsen[id_kelas] = {};
                }
                siswaAbsen[id_kelas] = allAbsen[id_kelas][id_siswa];
            }
        }

        if (Object.keys(siswaAbsen).length === 0) {
             return res.status(404).send({ message: "Tidak ada data absensi untuk siswa ini." });
        }

        res.status(200).send(siswaAbsen);
    } catch (error) {
        res.status(500).send({ message: "Gagal mengambil data.", error: error.message });
    }
};
