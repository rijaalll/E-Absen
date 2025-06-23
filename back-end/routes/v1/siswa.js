// routes/v1/siswa.js
const express = require('express');
const router = express.Router();
const { db } = require('../../utils/firebase');

// Generate random ID sesuai struktur baru
function generateSiswaId(jurusan) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomPart = '';
  for (let i = 0; i < 6; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${jurusan}-${randomPart}`;
}

function generateRandomToken(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Register siswa baru - Updated untuk struktur database baru
router.post('/siswa/register', async (req, res) => {
  try {
    const {
      nama, telephone, email, password, jenis_kelamin,
      alamat, detail
    } = req.body;

    // Validasi input
    if (!nama || !email || !password || !detail?.jurusan || !detail?.id_kelas) {
      return res.status(400).json({ 
        error: 'Nama, email, password, jurusan, dan id_kelas wajib diisi' 
      });
    }

    // Cek email sudah ada atau belum
    const snapshot = await db.ref('absen-app/app/user').once('value');
    const existingUsers = snapshot.val();
    
    if (existingUsers) {
      const emailExists = Object.values(existingUsers).some(user => user.email === email);
      if (emailExists) {
        return res.status(400).json({ error: 'Email sudah terdaftar' });
      }
    }

    // Generate ID siswa sesuai format baru
    const siswaId = generateSiswaId(detail.jurusan);

    const siswaData = {
      id: siswaId,
      nama,
      telephone: telephone || '',
      email,
      password,
      jenis_kelamin: jenis_kelamin || '',
      role: 'siswa',
      alamat: alamat || {
        provinsi: '',
        kota: '',
        kecamatan: '',
        kode_pos: '',
        desa: '',
        rt: '',
        rw: ''
      },
      detail: {
        id_kelas: detail.id_kelas,
        nama_ibu: detail.nama_ibu || '',
        nama_ayah: detail.nama_ayah || '',
        telephone_ortu: detail.telephone_ortu || '',
        nisn: detail.nisn || '',
        kelas: detail.kelas || '',
        jurusan: detail.jurusan,
        status: 1,
        authToken: generateRandomToken(10),
        'user-agent': ''
      }
    };

    // Simpan ke struktur database baru
    await db.ref(`absen-app/app/user/${siswaId}`).set(siswaData);

    // Return data tanpa password
    const { password: _, ...siswaWithoutPassword } = siswaData;
    
    res.status(201).json({
      message: 'Siswa berhasil didaftarkan',
      siswa: siswaWithoutPassword
    });

  } catch (error) {
    console.error('Register siswa error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update data siswa
router.put('/siswa/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Cek siswa exists
    const snapshot = await db.ref(`absen-app/app/user/${id}`).once('value');
    const siswa = snapshot.val();

    if (!siswa || siswa.role !== 'siswa') {
      return res.status(404).json({ error: 'Siswa tidak ditemukan' });
    }

    // Hapus fields yang tidak boleh diubah
    delete updateData.id;
    delete updateData.role;
    if (updateData.detail) {
      delete updateData.detail.authToken;
    }

    // Jika ada update email, cek duplikasi
    if (updateData.email && updateData.email !== siswa.email) {
      const allUsersSnapshot = await db.ref('absen-app/app/user').once('value');
      const allUsers = allUsersSnapshot.val();
      
      if (allUsers) {
        const emailExists = Object.entries(allUsers).some(([userId, userData]) => 
          userId !== id && userData.email === updateData.email
        );
        if (emailExists) {
          return res.status(400).json({ error: 'Email sudah digunakan user lain' });
        }
      }
    }

    // Update data siswa
    await db.ref(`absen-app/app/user/${id}`).update(updateData);

    res.json({
      message: 'Data siswa berhasil diperbarui',
      id,
      updated: updateData
    });

  } catch (error) {
    console.error('Update siswa error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get semua siswa
router.get('/siswa', async (req, res) => {
  try {
    const snapshot = await db.ref('absen-app/app/user').once('value');
    const users = snapshot.val();

    if (!users) {
      return res.json({ siswa: [] });
    }

    // Filter hanya siswa dan remove passwords
    const siswaList = Object.entries(users)
      .filter(([id, data]) => data.role === 'siswa')
      .map(([id, data]) => {
        const { password, ...siswaData } = data;
        return siswaData;
      });

    res.json({ siswa: siswaList });

  } catch (error) {
    console.error('Get siswa error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get siswa by ID
router.get('/siswa/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const snapshot = await db.ref(`absen-app/app/user/${id}`).once('value');
    const user = snapshot.val();

    if (!user || user.role !== 'siswa') {
      return res.status(404).json({ error: 'Siswa tidak ditemukan' });
    }

    // Remove password dari response
    const { password, ...siswaWithoutPassword } = user;
    
    res.json({ siswa: siswaWithoutPassword });

  } catch (error) {
    console.error('Get siswa by ID error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete siswa
router.delete('/siswa/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Cek siswa exists
    const snapshot = await db.ref(`absen-app/app/user/${id}`).once('value');
    const user = snapshot.val();

    if (!user || user.role !== 'siswa') {
      return res.status(404).json({ error: 'Siswa tidak ditemukan' });
    }

    // Hapus siswa
    await db.ref(`absen-app/app/user/${id}`).remove();

    res.json({
      message: 'Siswa berhasil dihapus',
      id
    });

  } catch (error) {
    console.error('Delete siswa error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;