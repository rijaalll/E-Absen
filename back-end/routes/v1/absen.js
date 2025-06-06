// routes/v1/absen.js
const express = require('express');
const router = express.Router();
const { db } = require('../../utils/firebase');

// Get semua data absen (pisahkan per kelas dan jurusan)
router.get('/absen', async (req, res) => {
  try {
    const { kelas, jurusan, tanggal, bulan, tahun } = req.query;

    const snapshot = await db.ref('absen-app/absen').once('value');
    const absenData = snapshot.val();

    if (!absenData) {
      return res.json({ absen: {} });
    }

    let filteredData = {};

    // Filter berdasarkan kelas jika ada
    if (kelas) {
      const kelasData = absenData[kelas];
      if (kelasData) {
        filteredData[kelas] = kelasData;
      }
    } else {
      filteredData = absenData;
    }

    // Filter berdasarkan jurusan, tanggal, bulan, tahun jika ada
    if (jurusan || tanggal || bulan || tahun) {
      const result = {};
      
      for (const [kelasKey, kelasValue] of Object.entries(filteredData)) {
        result[kelasKey] = {};
        
        for (const [siswaId, siswaAbsen] of Object.entries(kelasValue)) {
          result[kelasKey][siswaId] = {};
          
          for (const [dateKey, dateAbsen] of Object.entries(siswaAbsen)) {
            for (const [absenId, absenDetail] of Object.entries(dateAbsen)) {
              // Filter berdasarkan kriteria
              let include = true;
              
              if (jurusan && absenDetail.jurusan !== jurusan) include = false;
              if (tanggal && absenDetail.tanggal !== parseInt(tanggal)) include = false;
              if (bulan && absenDetail.bulan !== parseInt(bulan)) include = false;
              if (tahun && absenDetail.tahun !== parseInt(tahun)) include = false;
              
              if (include) {
                if (!result[kelasKey][siswaId][dateKey]) {
                  result[kelasKey][siswaId][dateKey] = {};
                }
                result[kelasKey][siswaId][dateKey][absenId] = absenDetail;
              }
            }
          }
        }
      }
      
      filteredData = result;
    }

    res.json({ absen: filteredData });

  } catch (error) {
    console.error('Get absen error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get absen siswa tertentu
router.get('/absen/siswa/:id_siswa', async (req, res) => {
  try {
    const { id_siswa } = req.params;
    const { kelas } = req.query;

    if (!kelas) {
      return res.status(400).json({ error: 'Parameter kelas wajib diisi' });
    }

    const snapshot = await db.ref(`absen-app/absen/${kelas}/${id_siswa}`).once('value');
    const absenData = snapshot.val();

    res.json({ 
      absen: absenData || {},
      id_siswa,
      kelas
    });

  } catch (error) {
    console.error('Get absen siswa error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;