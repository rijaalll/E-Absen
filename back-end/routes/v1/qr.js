// routes/v1/qr.js
const express = require('express');
const router = express.Router();
const { db } = require('../../utils/firebase');

// Generate random code
function generateRandomCode(length = 20) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateRandomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate QR code untuk kelas (hanya guru)
router.post('/qr/generate', async (req, res) => {
  try {
    const { kelas, guru_id } = req.body;

    if (!kelas || !guru_id) {
      return res.status(400).json({ error: 'Kelas dan guru_id wajib diisi' });
    }

    // Verifikasi guru exists
    const guruSnapshot = await db.ref(`absen-app/guru/${guru_id}`).once('value');
    const guru = guruSnapshot.val();

    if (!guru) {
      return res.status(404).json({ error: 'Guru tidak ditemukan' });
    }

    // Generate QR code data
    const qrData = {
      id: generateRandomId(),
      code: generateRandomCode(20)
    };

    // Simpan QR code untuk kelas
    await db.ref(`absen-app/qr-unique-code/${kelas}`).set(qrData);

    res.json({
      message: 'QR Code berhasil dibuat',
      kelas,
      qr_data: qrData
    });

  } catch (error) {
    console.error('Generate QR error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update/refresh QR code untuk kelas (hanya guru)
router.put('/qr/refresh', async (req, res) => {
  try {
    const { kelas, guru_id } = req.body;

    if (!kelas || !guru_id) {
      return res.status(400).json({ error: 'Kelas dan guru_id wajib diisi' });
    }

    // Verifikasi guru exists
    const guruSnapshot = await db.ref(`absen-app/guru/${guru_id}`).once('value');
    const guru = guruSnapshot.val();

    if (!guru) {
      return res.status(404).json({ error: 'Guru tidak ditemukan' });
    }

    // Generate QR code data baru
    const qrData = {
      id: generateRandomId(),
      code: generateRandomCode(20)
    };

    // Update QR code untuk kelas
    await db.ref(`absen-app/qr-unique-code/${kelas}`).set(qrData);

    res.json({
      message: 'QR Code berhasil diperbarui',
      kelas,
      qr_data: qrData
    });

  } catch (error) {
    console.error('Refresh QR error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get QR code untuk kelas tertentu
router.get('/qr/:kelas', async (req, res) => {
  try {
    const { kelas } = req.params;

    const snapshot = await db.ref(`absen-app/qr-unique-code/${kelas}`).once('value');
    const qrData = snapshot.val();

    if (!qrData) {
      return res.status(404).json({ error: 'QR Code untuk kelas ini belum dibuat' });
    }

    res.json({
      kelas,
      qr_data: qrData
    });

  } catch (error) {
    console.error('Get QR error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify QR code dan langsung catat absensi
router.post('/qr/verify', async (req, res) => {
  try {
    const { id, id_siswa } = req.body;

    if (!id || !id_siswa) {
      return res.status(400).json({ error: 'ID QR dan ID siswa wajib diisi' });
    }

    // Ambil data siswa
    const siswaSnapshot = await db.ref(`absen-app/siswa/${id_siswa}`).once('value');
    const siswa = siswaSnapshot.val();

    if (!siswa) {
      return res.status(404).json({ error: 'Siswa tidak ditemukan' });
    }

    // Cari QR code berdasarkan ID di semua kelas
    const qrSnapshot = await db.ref('absen-app/qr-unique-code').once('value');
    const allQrData = qrSnapshot.val();

    let foundKelas = null;
    let foundQrData = null;

    if (allQrData) {
      for (const [kelas, qrData] of Object.entries(allQrData)) {
        if (qrData.id === id) {
          foundKelas = kelas;
          foundQrData = qrData;
          break;
        }
      }
    }

    if (!foundKelas || !foundQrData) {
      return res.status(401).json({ 
        error: 'QR Code tidak valid atau sudah kadaluarsa',
        valid: false 
      });
    }

    // Buat data absen
    const now = new Date();
    const tanggal = now.getDate();
    const bulan = now.getMonth() + 1;
    const tahun = now.getFullYear();
    const jam = now.getHours();
    const menit = now.getMinutes();

    const dateKey = `${tanggal}-${bulan}-${tahun}`;
    const absenId = generateRandomId();

    const absenData = {
      id: absenId,
      id_siswa,
      jam,
      menit,
      tanggal,
      bulan,
      tahun,
      keterangan: 'hadir',
      kelas: foundKelas,
      jurusan: siswa.detail.jurusan
    };

    // Simpan absensi
    await db.ref(`absen-app/absen/${foundKelas}/${id_siswa}/${dateKey}/${absenId}`).set(absenData);

    res.json({
      message: 'Absen berhasil dicatat',
      valid: true,
      absen: absenData,
      siswa: {
        nama: siswa.nama,
        kelas: siswa.detail.kelas,
        jurusan: siswa.detail.jurusan
      }
    });

  } catch (error) {
    console.error('Verify QR and absen error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;