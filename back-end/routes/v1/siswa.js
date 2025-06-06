// routes/v1/siswa.js
const express = require('express');
const router = express.Router();
const { db } = require('../../utils/firebase');

// Generate random ID
function generateRandomId(prefix = '') {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix ? `${prefix}-${result}` : result;
}

// Register siswa baru
router.post('/register', async (req, res) => {
  try {
    const {
      nama, telephone, email, password, jenis_kelamin,
      alamat, detail
    } = req.body;

    // Validasi input
    if (!nama || !email || !password || !detail?.jurusan) {
      return res.status(400).json({ error: 'Nama, email, password, dan jurusan wajib diisi' });
    }

    // Generate ID siswa
    const siswaId = generateRandomId(detail.jurusan);

    const siswaData = {
      id: siswaId,
      nama,
      telephone: telephone || '',
      email,
      password,
      jenis_kelamin: jenis_kelamin || '',
      role: 'siswa',
      alamat: alamat || {
        provinsi: '', kota: '', kecamatan: '', kode_pos: '', desa: '', rt: '', rw: ''
      },
      detail: {
        nama_ibu: detail.nama_ibu || '',
        nama_ayah: detail.nama_ayah || '',
        telephone_ortu: detail.telephone_ortu || '',
        nisn: detail.nisn || '',
        kelas: detail.kelas || '',
        jurusan: detail.jurusan,
        status: 1
      }
    };

    // Simpan ke Firebase
    await db.ref(`absen-app/siswa/${siswaId}`).set(siswaData);

    // Return data tanpa password
    const { password: _, ...siswaWithoutPassword } = siswaData;
    
    res.status(201).json({
      message: 'Siswa berhasil didaftarkan',
      siswa: siswaWithoutPassword
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update data siswa
router.put('/siswa/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Hapus fields yang tidak boleh diubah
    delete updateData.id;
    delete updateData.role;

    // Update data siswa
    await db.ref(`absen-app/siswa/${id}`).update(updateData);

    res.json({
      message: 'Data siswa berhasil diperbarui',
      id
    });

  } catch (error) {
    console.error('Update siswa error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get semua siswa
router.get('/siswa', async (req, res) => {
  try {
    const snapshot = await db.ref('absen-app/siswa').once('value');
    const siswa = snapshot.val();

    if (!siswa) {
      return res.json({ siswa: [] });
    }

    // Remove passwords dari response
    const siswaWithoutPasswords = Object.entries(siswa).map(([id, data]) => {
      const { password, ...siswaData } = data;
      return siswaData;
    });

    res.json({ siswa: siswaWithoutPasswords });

  } catch (error) {
    console.error('Get siswa error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get siswa by ID
router.get('/siswa/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const snapshot = await db.ref(`absen-app/siswa/${id}`).once('value');
    const siswa = snapshot.val();

    if (!siswa) {
      return res.status(404).json({ error: 'Siswa tidak ditemukan' });
    }

    // Remove password dari response
    const { password, ...siswaWithoutPassword } = siswa;
    
    res.json({ siswa: siswaWithoutPassword });

  } catch (error) {
    console.error('Get siswa by ID error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;