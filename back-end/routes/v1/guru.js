// routes/v1/guru.js
const express = require('express');
const router = express.Router();
const { db } = require('../../utils/firebase');

// Generate random ID
function generateRandomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Register guru baru
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
    const snapshot = await db.ref('absen-app/guru').once('value');
    const existingGuru = snapshot.val();
    
    if (existingGuru) {
      const emailExists = Object.values(existingGuru).some(guru => guru.email === email);
      if (emailExists) {
        return res.status(400).json({ error: 'Email sudah terdaftar' });
      }
    }

    // Generate ID guru
    const guruId = generateRandomId();

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

    // Simpan ke Firebase
    await db.ref(`absen-app/guru/${guruId}`).set(guruData);

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
    const snapshot = await db.ref(`absen-app/guru/${id}`).once('value');
    const guru = snapshot.val();

    if (!guru) {
      return res.status(404).json({ error: 'Guru tidak ditemukan' });
    }

    // Hapus fields yang tidak boleh diubah
    delete updateData.id;
    delete updateData.role;

    // Jika ada update email, cek duplikasi
    if (updateData.email && updateData.email !== guru.email) {
      const allGuruSnapshot = await db.ref('absen-app/guru').once('value');
      const allGuru = allGuruSnapshot.val();
      
      if (allGuru) {
        const emailExists = Object.entries(allGuru).some(([guruId, guruData]) => 
          guruId !== id && guruData.email === updateData.email
        );
        if (emailExists) {
          return res.status(400).json({ error: 'Email sudah digunakan guru lain' });
        }
      }
    }

    // Update data guru
    await db.ref(`absen-app/guru/${id}`).update(updateData);

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
    const snapshot = await db.ref('absen-app/guru').once('value');
    const guru = snapshot.val();

    if (!guru) {
      return res.json({ guru: [] });
    }

    // Remove passwords dari response
    const guruWithoutPasswords = Object.entries(guru).map(([id, data]) => {
      const { password, ...guruData } = data;
      return guruData;
    });

    res.json({ guru: guruWithoutPasswords });

  } catch (error) {
    console.error('Get guru error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get guru by ID
router.get('/guru/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const snapshot = await db.ref(`absen-app/guru/${id}`).once('value');
    const guru = snapshot.val();

    if (!guru) {
      return res.status(404).json({ error: 'Guru tidak ditemukan' });
    }

    // Remove password dari response
    const { password, ...guruWithoutPassword } = guru;
    
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
    const snapshot = await db.ref(`absen-app/guru/${id}`).once('value');
    const guru = snapshot.val();

    if (!guru) {
      return res.status(404).json({ error: 'Guru tidak ditemukan' });
    }

    // Hapus guru
    await db.ref(`absen-app/guru/${id}`).remove();

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