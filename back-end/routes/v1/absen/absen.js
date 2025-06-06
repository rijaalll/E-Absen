// routes/v1/absen/absen.js
const express = require('express');
const router = express.Router();
const { db } = require('../../../utils/firebaseDb');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Middleware untuk verifikasi token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token.' });
  }
};

// Create absen record (siswa only)
router.post('/', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'siswa') {
      return res.status(403).json({ message: 'Access denied. Only students can create attendance records.' });
    }

    const { qrCode } = req.body;

    if (!qrCode) {
      return res.status(400).json({ message: 'QR code is required' });
    }

    // Verify QR code
    const qrSnapshot = await db.ref('absen-app/qr-unique-code').once('value');
    const qrData = qrSnapshot.val();
    
    if (!qrData || qrData.code !== qrCode) {
      return res.status(400).json({ message: 'Invalid QR code' });
    }

    // Get user data
    const userSnapshot = await db.ref(`absen-app/user/${req.user.id}`).once('value');
    const userData = userSnapshot.val();

    if (!userData || !userData.detail) {
      return res.status(400).json({ message: 'Student data not found' });
    }

    // Find kelas ID
    const kelasSnapshot = await db.ref('absen-app/kelas').once('value');
    const allKelas = kelasSnapshot.val() || {};
    
    const kelasId = Object.keys(allKelas).find(id => 
      allKelas[id].kelas === userData.detail.kelas && 
      allKelas[id].jurusan === userData.detail.jurusan
    );

    if (!kelasId) {
      return res.status(400).json({ message: 'Class not found' });
    }

    // Check if already present today
    const today = new Date();
    const todayDate = today.getDate();
    const todayMonth = today.getMonth() + 1;
    const todayYear = today.getFullYear();

    const absenSnapshot = await db.ref(`absen-app/absen/${kelasId}/${req.user.id}`).once('value');
    const existingAbsen = absenSnapshot.val() || {};

    const alreadyPresent = Object.values(existingAbsen).some(record => 
      record.tanggal === todayDate && 
      record.bulan === todayMonth && 
      record.tahun === todayYear
    );

    if (alreadyPresent) {
      return res.status(400).json({ message: 'Already marked attendance for today' });
    }

    // Create attendance record
    const absenId = uuidv4();
    const absenData = {
      id: absenId,
      jam: today.getHours(),
      menit: today.getMinutes(),
      tanggal: todayDate,
      bulan: todayMonth,
      tahun: todayYear,
      keterangan: 'hadir',
      kelas: userData.detail.kelas,
      jurusan: userData.detail.jurusan
    };

    await db.ref(`absen-app/absen/${kelasId}/${req.user.id}/${absenId}`).set(absenData);

    res.status(201).json({
      message: 'Attendance recorded successfully',
      absen: absenData
    });
  } catch (error) {
    console.error('Create attendance error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get attendance by class and date (guru only)
router.get('/kelas/:kelasId', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'guru') {
      return res.status(403).json({ message: 'Access denied. Only teachers can view class attendance.' });
    }

    const { kelasId } = req.params;
    const { tanggal, bulan, tahun } = req.query;

    const absenSnapshot = await db.ref(`absen-app/absen/${kelasId}`).once('value');
    const absenData = absenSnapshot.val() || {};

    let filteredAbsen = absenData;

    // Filter by date if provided
    if (tanggal || bulan || tahun) {
      filteredAbsen = {};
      Object.keys(absenData).forEach(siswaId => {
        const siswaAbsen = absenData[siswaId];
        const filteredSiswaAbsen = {};
        
        Object.keys(siswaAbsen).forEach(recordId => {
          const record = siswaAbsen[recordId];
          let match = true;
          
          if (tanggal && record.tanggal !== parseInt(tanggal)) match = false;
          if (bulan && record.bulan !== parseInt(bulan)) match = false;
          if (tahun && record.tahun !== parseInt(tahun)) match = false;
          
          if (match) {
            filteredSiswaAbsen[recordId] = record;
          }
        });
        
        if (Object.keys(filteredSiswaAbsen).length > 0) {
          filteredAbsen[siswaId] = filteredSiswaAbsen;
        }
      });
    }

    res.json({ absen: filteredAbsen });
  } catch (error) {
    console.error('Get class attendance error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get student's own attendance
router.get('/siswa/me', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'siswa') {
      return res.status(403).json({ message: 'Access denied. Only students can view their own attendance.' });
    }

    // Get user data to find kelas
    const userSnapshot = await db.ref(`absen-app/user/${req.user.id}`).once('value');
    const userData = userSnapshot.val();

    if (!userData || !userData.detail) {
      return res.status(400).json({ message: 'Student data not found' });
    }

    // Find kelas ID
    const kelasSnapshot = await db.ref('absen-app/kelas').once('value');
    const allKelas = kelasSnapshot.val() || {};
    
    const kelasId = Object.keys(allKelas).find(id => 
      allKelas[id].kelas === userData.detail.kelas && 
      allKelas[id].jurusan === userData.detail.jurusan
    );

    if (!kelasId) {
      return res.status(400).json({ message: 'Class not found' });
    }

    const absenSnapshot = await db.ref(`absen-app/absen/${kelasId}/${req.user.id}`).once('value');
    const absenData = absenSnapshot.val() || {};

    res.json({ absen: absenData });
  } catch (error) {
    console.error('Get student attendance error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get attendance by student ID (guru only)
router.get('/siswa/:siswaId', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'guru') {
      return res.status(403).json({ message: 'Access denied. Only teachers can view student attendance.' });
    }

    const { siswaId } = req.params;

    // Get student data to find kelas
    const userSnapshot = await db.ref(`absen-app/user/${siswaId}`).once('value');
    const userData = userSnapshot.val();

    if (!userData || userData.role !== 'siswa' || !userData.detail) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Find kelas ID
    const kelasSnapshot = await db.ref('absen-app/kelas').once('value');
    const allKelas = kelasSnapshot.val() || {};
    
    const kelasId = Object.keys(allKelas).find(id => 
      allKelas[id].kelas === userData.detail.kelas && 
      allKelas[id].jurusan === userData.detail.jurusan
    );

    if (!kelasId) {
      return res.status(400).json({ message: 'Class not found' });
    }

    const absenSnapshot = await db.ref(`absen-app/absen/${kelasId}/${siswaId}`).once('value');
    const absenData = absenSnapshot.val() || {};

    res.json({ 
      siswa: {
        id: userData.id,
        nama: userData.nama,
        kelas: userData.detail.kelas,
        jurusan: userData.detail.jurusan
      },
      absen: absenData 
    });
  } catch (error) {
    console.error('Get student attendance error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update attendance record (guru only)
router.put('/:kelasId/:siswaId/:recordId', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'guru') {
      return res.status(403).json({ message: 'Access denied. Only teachers can update attendance records.' });
    }

    const { kelasId, siswaId, recordId } = req.params;
    const { keterangan } = req.body;

    if (!keterangan) {
      return res.status(400).json({ message: 'Keterangan is required' });
    }

    const recordSnapshot = await db.ref(`absen-app/absen/${kelasId}/${siswaId}/${recordId}`).once('value');
    
    if (!recordSnapshot.exists()) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    await db.ref(`absen-app/absen/${kelasId}/${siswaId}/${recordId}`).update({ keterangan });

    res.json({ message: 'Attendance record updated successfully' });
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete attendance record (guru only)
router.delete('/:kelasId/:siswaId/:recordId', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'guru') {
      return res.status(403).json({ message: 'Access denied. Only teachers can delete attendance records.' });
    }

    const { kelasId, siswaId, recordId } = req.params;

    const recordSnapshot = await db.ref(`absen-app/absen/${kelasId}/${siswaId}/${recordId}`).once('value');
    
    if (!recordSnapshot.exists()) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    await db.ref(`absen-app/absen/${kelasId}/${siswaId}/${recordId}`).remove();

    res.json({ message: 'Attendance record deleted successfully' });
  } catch (error) {
    console.error('Delete attendance error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get attendance summary by class and date range
router.get('/summary/:kelasId', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'guru') {
      return res.status(403).json({ message: 'Access denied. Only teachers can view attendance summary.' });
    }

    const { kelasId } = req.params;
    const { startDate, endDate, bulan, tahun } = req.query;

    const absenSnapshot = await db.ref(`absen-app/absen/${kelasId}`).once('value');
    const absenData = absenSnapshot.val() || {};

    // Get class info
    const kelasSnapshot = await db.ref(`absen-app/kelas/${kelasId}`).once('value');
    const kelasInfo = kelasSnapshot.val();

    if (!kelasInfo) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Get all students in this class
    const usersSnapshot = await db.ref('absen-app/user').once('value');
    const users = usersSnapshot.val() || {};
    
    const studentsInClass = Object.values(users).filter(user => 
      user.role === 'siswa' && 
      user.detail && 
      user.detail.kelas === kelasInfo.kelas && 
      user.detail.jurusan === kelasInfo.jurusan
    );

    const summary = {
      kelas: kelasInfo,
      totalStudents: studentsInClass.length,
      attendanceData: {}
    };

    studentsInClass.forEach(student => {
      const studentAbsen = absenData[student.id] || {};
      let filteredRecords = Object.values(studentAbsen);

      // Filter by date range if provided
      if (bulan && tahun) {
        filteredRecords = filteredRecords.filter(record => 
          record.bulan === parseInt(bulan) && record.tahun === parseInt(tahun)
        );
      }

      if (startDate && endDate) {
        filteredRecords = filteredRecords.filter(record => {
          const recordDate = new Date(record.tahun, record.bulan - 1, record.tanggal);
          const start = new Date(startDate);
          const end = new Date(endDate);
          return recordDate >= start && recordDate <= end;
        });
      }

      const hadirCount = filteredRecords.filter(r => r.keterangan === 'hadir').length;
      const sakitCount = filteredRecords.filter(r => r.keterangan === 'sakit').length;
      const izinCount = filteredRecords.filter(r => r.keterangan === 'izin').length;
      const alfaCount = filteredRecords.filter(r => r.keterangan === 'alfa').length;

      summary.attendanceData[student.id] = {
        nama: student.nama,
        nisn: student.detail.nisn,
        hadir: hadirCount,
        sakit: sakitCount,
        izin: izinCount,
        alfa: alfaCount,
        total: filteredRecords.length
      };
    });

    res.json({ summary });
  } catch (error) {
    console.error('Get attendance summary error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;