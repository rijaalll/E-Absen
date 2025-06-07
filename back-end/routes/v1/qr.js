const express = require('express');
const router = express.Router();
const { db } = require('../../utils/firebase');

// Utility: Random string generators
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

// ========== 1. Generate QR ==========
router.post('/qr/generate', async (req, res) => {
  try {
    const { kelas, jurusan, guru_id } = req.body;

    if (!kelas || !jurusan || !guru_id) {
      return res.status(400).json({ error: 'Kelas, jurusan, dan guru_id wajib diisi' });
    }

    const guruSnapshot = await db.ref(`absen-app/guru/${guru_id}`).once('value');
    const guru = guruSnapshot.val();
    if (!guru) return res.status(404).json({ error: 'Guru tidak ditemukan' });

    const qrKey = `${kelas}-${jurusan}`;
    const qrData = {
      id: generateRandomId(),
      code: generateRandomCode(20)
    };

    await db.ref(`absen-app/qr-unique-code/${qrKey}`).set(qrData);

    res.json({
      message: 'QR Code berhasil dibuat',
      kelas,
      jurusan,
      qr_data: qrData
    });
  } catch (error) {
    console.error('Generate QR error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== 2. Refresh QR ==========
router.put('/qr/refresh', async (req, res) => {
  try {
    const { kelas, jurusan, guru_id } = req.body;

    if (!kelas || !jurusan || !guru_id) {
      return res.status(400).json({ error: 'Kelas, jurusan, dan guru_id wajib diisi' });
    }

    const guruSnapshot = await db.ref(`absen-app/guru/${guru_id}`).once('value');
    const guru = guruSnapshot.val();
    if (!guru) return res.status(404).json({ error: 'Guru tidak ditemukan' });

    const qrKey = `${kelas}-${jurusan}`;
    const qrData = {
      id: generateRandomId(),
      code: generateRandomCode(20)
    };

    await db.ref(`absen-app/qr-unique-code/${qrKey}`).set(qrData);

    res.json({
      message: 'QR Code berhasil diperbarui',
      kelas,
      jurusan,
      qr_data: qrData
    });
  } catch (error) {
    console.error('Refresh QR error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== 3. Get QR ==========
router.get('/qr/:kelas/:jurusan', async (req, res) => {
  try {
    const { kelas, jurusan } = req.params;
    const qrKey = `${kelas}-${jurusan}`;

    const snapshot = await db.ref(`absen-app/qr-unique-code/${qrKey}`).once('value');
    const qrData = snapshot.val();

    if (!qrData) {
      return res.status(404).json({ error: 'QR Code untuk kelas-jurusan ini belum dibuat' });
    }

    res.json({
      kelas,
      jurusan,
      qr_data: qrData
    });
  } catch (error) {
    console.error('Get QR error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== 4. Verify QR ==========
router.post('/qr/verify', async (req, res) => {
  try {
    const { id, id_siswa } = req.body;

    if (!id || !id_siswa) {
      return res.status(400).json({ error: 'ID QR dan ID siswa wajib diisi' });
    }

    const siswaSnapshot = await db.ref(`absen-app/siswa/${id_siswa}`).once('value');
    const siswa = siswaSnapshot.val();
    if (!siswa) return res.status(404).json({ error: 'Siswa tidak ditemukan' });

    // Cari QR berdasarkan ID
    const qrSnapshot = await db.ref('absen-app/qr-unique-code').once('value');
    const allQrData = qrSnapshot.val();

    let foundKey = null;
    let foundQrData = null;

    if (allQrData) {
      for (const [key, qrData] of Object.entries(allQrData)) {
        if (qrData.id === id) {
          foundKey = key;
          foundQrData = qrData;
          break;
        }
      }
    }

    if (!foundKey || !foundQrData) {
      return res.status(401).json({ 
        error: 'QR Code tidak valid atau sudah kadaluarsa',
        valid: false 
      });
    }

    const [kelas, jurusan] = foundKey.split('-');

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
      kelas,
      jurusan: siswa.detail?.jurusan || jurusan
    };

    await db.ref(`absen-app/absen/${foundKey}/${id_siswa}/${dateKey}/${absenId}`).set(absenData);

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
    console.error('Verify QR error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
