// routes/v1/kelas.js
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

// Create kelas baru
router.post('/kelas', async (req, res) => {
  try {
    const { kelas, jurusan } = req.body;

    if (!kelas || !jurusan) {
      return res.status(400).json({ error: 'Kelas dan jurusan wajib diisi' });
    }

    const kelasId = generateRandomId();
    const kelasData = {
      id: kelasId,
      kelas,
      jurusan
    };

    // Simpan kelas
    await db.ref(`absen-app/kelas/${kelasId}`).set(kelasData);

    res.status(201).json({
      message: 'Kelas berhasil dibuat',
      kelas: kelasData
    });

  } catch (error) {
    console.error('Create kelas error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get semua kelas
router.get('/kelas', async (req, res) => {
  try {
    const snapshot = await db.ref('absen-app/kelas').once('value');
    const kelasData = snapshot.val();

    res.json({ 
      kelas: kelasData ? Object.values(kelasData) : [] 
    });

  } catch (error) {
    console.error('Get kelas error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get kelas by ID
router.get('/kelas/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const snapshot = await db.ref(`absen-app/kelas/${id}`).once('value');
    const kelasData = snapshot.val();

    if (!kelasData) {
      return res.status(404).json({ error: 'Kelas tidak ditemukan' });
    }

    res.json({ kelas: kelasData });

  } catch (error) {
    console.error('Get kelas by ID error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update kelas
router.put('/kelas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { kelas, jurusan } = req.body;

    const updateData = {};
    if (kelas) updateData.kelas = kelas;
    if (jurusan) updateData.jurusan = jurusan;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Tidak ada data yang diperbarui' });
    }

    await db.ref(`absen-app/kelas/${id}`).update(updateData);

    res.json({
      message: 'Kelas berhasil diperbarui',
      id,
      updated: updateData
    });

  } catch (error) {
    console.error('Update kelas error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete kelas
router.delete('/kelas/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Hapus kelas
    await db.ref(`absen-app/kelas/${id}`).remove();

    res.json({
      message: 'Kelas berhasil dihapus',
      id
    });

  } catch (error) {
    console.error('Delete kelas error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;