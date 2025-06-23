// routes/v1/guru.js
const express = require('express');
const router = express.Router();
const { db } = require('../../utils/firebase');

// Generate random ID untuk guru (10 karakter acak)
function generateGuruId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Register guru baru - Updated untuk struktur database baru
router.post('/guru/register', async (req, res) => {
  try {
    const {
      nama, telephone, email, password, jenis_kelamin, alamat
    } = req.body;

    // Validasi input
    if (!nama || !email || !password) {
      return res.status(400).json({ error: 'Nama, email, dan password wajib diisi' });
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

    // Generate ID guru
    const guruId = generateGuruId();

    const guruData = {
      id: guruId,
      nama,
      telephone: telephone || '',
      email,
      password,
      jenis_kelamin: jenis_kelamin || '',
      role: 'guru',
      alamat: alamat || {
        provinsi: '',
        kota: '',
        kecamatan: '',
        kode_pos: '',
        desa: '',
        rt: '',
        rw: ''
      }
    };

    // Simpan ke struktur database baru
    await db.ref(`absen-app/app/user/${guruId}`).set(guruData);

    // Return data tanpa password
    const { password: _, ...guruWithoutPassword } = guruData;
    
    res.status(201).json({
      message: 'Guru berhasil didaftarkan',
      guru: guruWithoutPassword
    });

  } catch (error) {
    console.error('Register guru error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update data guru
router.put('/guru/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Cek guru exists
    const snapshot = await db.ref(`absen-app/app/user/${id}`).once('value');
    const guru = snapshot.val();

    if (!guru || guru.role !== 'guru') {
      return res.status(404).json({ error: 'Guru tidak ditemukan' });
    }

    // Hapus fields yang tidak boleh diubah
    delete updateData.id;
    delete updateData.role;

    // Jika ada update email, cek duplikasi
    if (updateData.email && updateData.email !== guru.email) {
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

    // Update data guru
    await db.ref(`absen-app/app/user/${id}`).update(updateData);

    res.json({
      message: 'Data guru berhasil diperbarui',
      id,
      updated: updateData
    });

  } catch (error) {
    console.error('Update guru error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get semua guru
router.get('/guru', async (req, res) => {
  try {
    const snapshot = await db.ref('absen-app/app/user').once('value');
    const users = snapshot.val();

    if (!users) {
      return res.json({ guru: [] });
    }

    // Filter hanya guru dan remove passwords
    const guruList = Object.entries(users)
      .filter(([id, data]) => data.role === 'guru')
      .map(([id, data]) => {
        const { password, ...guruData } = data;
        return guruData;
      });

    res.json({ guru: guruList });

  } catch (error) {
    console.error('Get guru error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get guru by ID
router.get('/guru/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const snapshot = await db.ref(`absen-app/app/user/${id}`).once('value');
    const user = snapshot.val();

    if (!user || user.role !== 'guru') {
      return res.status(404).json({ error: 'Guru tidak ditemukan' });
    }

    // Remove password dari response
    const { password, ...guruWithoutPassword } = user;
    
    res.json({ guru: guruWithoutPassword });

  } catch (error) {
    console.error('Get guru by ID error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete guru
router.delete('/guru/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Cek guru exists
    const snapshot = await db.ref(`absen-app/app/user/${id}`).once('value');
    const user = snapshot.val();

    if (!user || user.role !== 'guru') {
      return res.status(404).json({ error: 'Guru tidak ditemukan' });
    }

    // Hapus guru
    await db.ref(`absen-app/app/user/${id}`).remove();

    res.json({
      message: 'Guru berhasil dihapus',
      id
    });

  } catch (error) {
    console.error('Delete guru error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;