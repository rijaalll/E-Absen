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
      code: generateRandomCode(20),
      kelas,
      jurusan,
      guru_id
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
      code: generateRandomCode(20),
      kelas,
      jurusan,
      guru_id
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
      return res.status(400).json({
        error: 'ID QR dan ID siswa wajib diisi',
        valid: false
      });
    }

    // Get siswa data first
    const siswaSnapshot = await db.ref(`absen-app/siswa/${id_siswa}`).once('value');
    const siswa = siswaSnapshot.val();

    if (!siswa) {
      return res.status(404).json({
        error: 'Siswa tidak ditemukan',
        valid: false
      });
    }

    // Validate siswa data completeness
    const siswaKelas = siswa.detail?.kelas;
    const siswaJurusan = siswa.detail?.jurusan;

    if (!siswaKelas || !siswaJurusan) {
      return res.status(400).json({
        error: 'Data kelas atau jurusan siswa tidak lengkap. Silakan hubungi admin.',
        valid: false,
        debug: {
          siswa_kelas: siswaKelas,
          siswa_jurusan: siswaJurusan
        }
      });
    }

    // Find QR code by ID across all QR codes
    const qrSnapshot = await db.ref('absen-app/qr-unique-code').once('value');
    const allQrData = qrSnapshot.val();

    let foundQrData = null;
    let foundKey = null;

    if (allQrData) {
      for (const [key, qrData] of Object.entries(allQrData)) {
        if (qrData && qrData.id === id) {
          foundQrData = qrData;
          foundKey = key;
          break;
        }
      }
    }

    if (!foundQrData) {
      return res.status(401).json({
        error: 'QR Code tidak valid atau sudah kadaluarsa',
        valid: false
      });
    }

    // Check if QR code has expired (if expires_at exists)
    if (foundQrData.expires_at) {
      const now = new Date();
      const expiresAt = new Date(foundQrData.expires_at);

      if (expiresAt < now) {
        return res.status(410).json({
          error: 'QR Code sudah kadaluarsa. Silakan minta guru untuk membuat QR Code baru.',
          valid: false,
          expired: true
        });
      }
    }

    // Extract QR kelas and jurusan
    const qrKelas = foundQrData.kelas?.toString();
    const qrJurusan = foundQrData.jurusan?.toString();

    // CRITICAL: Validate kelas and jurusan match
    if (!qrKelas || !qrJurusan) {
      return res.status(400).json({
        error: 'QR Code tidak memiliki informasi kelas atau jurusan yang valid',
        valid: false
      });
    }

    // Convert siswa data to string for comparison
    const siswaKelasStr = siswaKelas.toString();
    const siswaJurusanStr = siswaJurusan.toString();

    if (siswaKelasStr !== qrKelas || siswaJurusanStr !== qrJurusan) {
      return res.status(403).json({
        error: `❌ QR Code ini khusus untuk kelas ${qrKelas} ${qrJurusan}. Anda terdaftar di kelas ${siswaKelasStr} ${siswaJurusanStr}. Silakan gunakan QR Code yang sesuai dengan kelas Anda.`,
        valid: false,
        mismatch: true,
        siswa_info: {
          kelas: siswaKelasStr,
          jurusan: siswaJurusanStr
        },
        qr_info: {
          kelas: qrKelas,
          jurusan: qrJurusan
        }
      });
    }

    // Check if already attended today
    const now = new Date();
    const tanggal = now.getDate();
    const bulan = now.getMonth() + 1;
    const tahun = now.getFullYear();
    const dateKey = `${tanggal}-${bulan}-${tahun}`;

    const existingAbsenSnapshot = await db.ref(`absen-app/absen/${foundKey}/${id_siswa}/${dateKey}`).once('value');
    const existingAbsen = existingAbsenSnapshot.val();

    if (existingAbsen && Object.keys(existingAbsen).length > 0) {
      const firstAbsen = Object.values(existingAbsen)[0];
      return res.status(409).json({
        error: `Anda sudah melakukan absen hari ini pada ${formatTime(firstAbsen.jam, firstAbsen.menit)}`,
        valid: false,
        already_attended: true,
        existing_attendance: firstAbsen
      });
    }

    // Record attendance
    const jam = now.getHours();
    const menit = now.getMinutes();
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
      kelas: qrKelas,
      jurusan: qrJurusan,
      timestamp: now.toISOString()
    };

    await db.ref(`absen-app/absen/${foundKey}/${id_siswa}/${dateKey}/${absenId}`).set(absenData);

    // Success response
    res.json({
      message: '✅ Absen berhasil dicatat!',
      valid: true,
      absen: absenData,
      siswa: {
        nama: siswa.nama,
        kelas: siswaKelasStr,
        jurusan: siswaJurusanStr
      },
      waktu: `${formatTime(jam, menit)}`,
      tanggal: `${tanggal}/${bulan}/${tahun}`
    });

  } catch (error) {
    console.error('❌ Verify QR error:', error);
    res.status(500).json({
      error: 'Server error. Silakan coba lagi.',
      valid: false
    });
  }
});

// Helper function for time formatting
function formatTime(jam, menit) {
  const hour = parseInt(jam) || 0;
  const minute = parseInt(menit) || 0;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}
module.exports = router;