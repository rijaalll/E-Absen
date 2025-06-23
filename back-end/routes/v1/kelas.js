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

// ========== TINGKAT ROUTES ==========

// Create tingkat baru
router.post('/kelas/tingkat', async (req, res) => {
  try {
    const { tingkat } = req.body;

    if (!tingkat || !['10', '11', '12'].includes(tingkat)) {
      return res.status(400).json({ error: 'Tingkat harus 10, 11, atau 12' });
    }

    const tingkatId = generateRandomId();
    const tingkatData = {
      tingkat: tingkat
    };

    await db.ref(`absen-app/app/kelas/tingkat/${tingkatId}`).set(tingkatData);

    res.status(201).json({
      message: 'Tingkat berhasil dibuat',
      id: tingkatId,
      tingkat: tingkatData
    });

  } catch (error) {
    console.error('Create tingkat error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get semua tingkat
router.get('/kelas/tingkat', async (req, res) => {
  try {
    const snapshot = await db.ref('absen-app/app/kelas/tingkat').once('value');
    const tingkatData = snapshot.val();

    const tingkatArray = tingkatData ? 
      Object.entries(tingkatData).map(([id, data]) => ({ id, ...data })) : [];

    res.json({ tingkat: tingkatArray });

  } catch (error) {
    console.error('Get tingkat error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== JURUSAN ROUTES ==========

// Create jurusan baru
router.post('/kelas/jurusan', async (req, res) => {
  try {
    const { nama } = req.body;

    if (!nama) {
      return res.status(400).json({ error: 'Nama jurusan wajib diisi' });
    }

    const jurusanGroupId = generateRandomId();
    const jurusanId = generateRandomId();
    const jurusanData = {
      nama: nama
    };

    await db.ref(`absen-app/app/kelas/jurusan/${jurusanGroupId}/${jurusanId}`).set(jurusanData);

    res.status(201).json({
      message: 'Jurusan berhasil dibuat',
      group_id: jurusanGroupId,
      jurusan_id: jurusanId,
      jurusan: jurusanData
    });

  } catch (error) {
    console.error('Create jurusan error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get semua jurusan
router.get('/kelas/jurusan', async (req, res) => {
  try {
    const snapshot = await db.ref('absen-app/app/kelas/jurusan').once('value');
    const jurusanData = snapshot.val();

    let jurusanArray = [];
    if (jurusanData) {
      for (const [groupId, group] of Object.entries(jurusanData)) {
        for (const [jurusanId, jurusan] of Object.entries(group)) {
          jurusanArray.push({
            group_id: groupId,
            jurusan_id: jurusanId,
            ...jurusan
          });
        }
      }
    }

    res.json({ jurusan: jurusanArray });

  } catch (error) {
    console.error('Get jurusan error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== DETAIL KELAS ROUTES ==========

// Create detail kelas baru
router.post('/kelas/detail', async (req, res) => {
  try {
    const { nama_kelas, tingkat, jurusan, bk_kelas } = req.body;

    if (!nama_kelas || !tingkat || !jurusan) {
      return res.status(400).json({ 
        error: 'Nama kelas, tingkat, dan jurusan wajib diisi' 
      });
    }

    // Validasi tingkat
    if (!['10', '11', '12'].includes(tingkat)) {
      return res.status(400).json({ error: 'Tingkat harus 10, 11, atau 12' });
    }

    // Validasi guru BK exists jika ada
    if (bk_kelas) {
      const guruSnapshot = await db.ref(`absen-app/app/user/${bk_kelas}`).once('value');
      const guru = guruSnapshot.val();
      if (!guru || guru.role !== 'guru') {
        return res.status(400).json({ error: 'Guru BK tidak ditemukan' });
      }
    }

    const kelasId = generateRandomId();
    const kelasData = {
      id: kelasId,
      nama_kelas,
      tingkat,
      jurusan,
      bk_kelas: bk_kelas || '',
      status: 1
    };

    await db.ref(`absen-app/app/kelas/detail_kelas/${kelasId}`).set(kelasData);

    res.status(201).json({
      message: 'Detail kelas berhasil dibuat',
      kelas: kelasData
    });

  } catch (error) {
    console.error('Create detail kelas error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get semua detail kelas
router.get('/kelas/detail', async (req, res) => {
  try {
    const { tingkat, jurusan, status } = req.query;

    const snapshot = await db.ref('absen-app/app/kelas/detail_kelas').once('value');
    const kelasData = snapshot.val();

    if (!kelasData) {
      return res.json({ kelas: [] });
    }

    let kelasArray = Object.values(kelasData);

    // Filter berdasarkan query parameters
    if (tingkat) {
      kelasArray = kelasArray.filter(kelas => kelas.tingkat === tingkat);
    }
    if (jurusan) {
      kelasArray = kelasArray.filter(kelas => kelas.jurusan === jurusan);
    }
    if (status !== undefined) {
      kelasArray = kelasArray.filter(kelas => kelas.status === parseInt(status));
    }

    res.json({ kelas: kelasArray });

  } catch (error) {
    console.error('Get detail kelas error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get detail kelas by ID
router.get('/kelas/detail/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const snapshot = await db.ref(`absen-app/app/kelas/detail_kelas/${id}`).once('value');
    const kelasData = snapshot.val();

    if (!kelasData) {
      return res.status(404).json({ error: 'Kelas tidak ditemukan' });
    }

    res.json({ kelas: kelasData });

  } catch (error) {
    console.error('Get detail kelas by ID error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update detail kelas
router.put('/kelas/detail/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_kelas, tingkat, jurusan, bk_kelas, status } = req.body;

    // Cek kelas exists
    const snapshot = await db.ref(`absen-app/app/kelas/detail_kelas/${id}`).once('value');
    const kelas = snapshot.val();

    if (!kelas) {
      return res.status(404).json({ error: 'Kelas tidak ditemukan' });
    }

    const updateData = {};
    if (nama_kelas) updateData.nama_kelas = nama_kelas;
    if (tingkat) {
      if (!['10', '11', '12'].includes(tingkat)) {
        return res.status(400).json({ error: 'Tingkat harus 10, 11, atau 12' });
      }
      updateData.tingkat = tingkat;
    }
    if (jurusan) updateData.jurusan = jurusan;
    if (bk_kelas !== undefined) {
      if (bk_kelas) {
        // Validasi guru BK exists
        const guruSnapshot = await db.ref(`absen-app/app/user/${bk_kelas}`).once('value');
        const guru = guruSnapshot.val();
        if (!guru || guru.role !== 'guru') {
          return res.status(400).json({ error: 'Guru BK tidak ditemukan' });
        }
      }
      updateData.bk_kelas = bk_kelas;
    }
    if (status !== undefined) updateData.status = parseInt(status);

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Tidak ada data yang diperbarui' });
    }

    await db.ref(`absen-app/app/kelas/detail_kelas/${id}`).update(updateData);

    res.json({
      message: 'Detail kelas berhasil diperbarui',
      id,
      updated: updateData
    });

  } catch (error) {
    console.error('Update detail kelas error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete detail kelas
router.delete('/kelas/detail/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Cek kelas exists
    const snapshot = await db.ref(`absen-app/app/kelas/detail_kelas/${id}`).once('value');
    const kelas = snapshot.val();

    if (!kelas) {
      return res.status(404).json({ error: 'Kelas tidak ditemukan' });
    }

    // Hapus kelas
    await db.ref(`absen-app/app/kelas/detail_kelas/${id}`).remove();

    res.json({
      message: 'Detail kelas berhasil dihapus',
      id
    });

  } catch (error) {
    console.error('Delete detail kelas error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;