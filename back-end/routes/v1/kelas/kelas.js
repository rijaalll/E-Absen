// routes/v1/kelas/kelas.js
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

// Create kelas (guru only)
router.post('/', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'guru') {
      return res.status(403).json({ message: 'Access denied. Only teachers can create classes.' });
    }

    const { kelas, jurusan } = req.body;

    if (!kelas || !jurusan) {
      return res.status(400).json({ message: 'Kelas and jurusan are required' });
    }

    // Check if class already exists
    const kelasSnapshot = await db.ref('absen-app/kelas').once('value');
    const existingKelas = kelasSnapshot.val() || {};
    
    const isDuplicate = Object.values(existingKelas).some(k => 
      k.kelas === kelas && k.jurusan === jurusan
    );

    if (isDuplicate) {
      return res.status(400).json({ message: 'Class already exists' });
    }

    const kelasId = uuidv4();
    const kelasData = {
      id: kelasId,
      kelas,
      jurusan
    };

    await db.ref(`absen-app/kelas/${kelasId}`).set(kelasData);

    res.status(201).json({
      message: 'Class created successfully',
      kelas: kelasData
    });
  } catch (error) {
    console.error('Create class error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all kelas
router.get('/', verifyToken, async (req, res) => {
  try {
    const kelasSnapshot = await db.ref('absen-app/kelas').once('value');
    const kelas = kelasSnapshot.val() || {};

    res.json({ kelas });
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get kelas by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const kelasSnapshot = await db.ref(`absen-app/kelas/${id}`).once('value');
    
    if (!kelasSnapshot.exists()) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const kelasData = kelasSnapshot.val();

    res.json({ kelas: kelasData });
  } catch (error) {
    console.error('Get class error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update kelas (guru only)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'guru') {
      return res.status(403).json({ message: 'Access denied. Only teachers can update classes.' });
    }

    const { id } = req.params;
    const { kelas, jurusan } = req.body;

    const kelasSnapshot = await db.ref(`absen-app/kelas/${id}`).once('value');
    
    if (!kelasSnapshot.exists()) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Check if updated class already exists (excluding current one)
    if (kelas && jurusan) {
      const allkelasSnapshot = await db.ref('absen-app/kelas').once('value');
      const existingKelas = allkelasSnapshot.val() || {};
      
      const isDuplicate = Object.entries(existingKelas).some(([kelasId, k]) => 
        kelasId !== id && k.kelas === kelas && k.jurusan === jurusan
      );

      if (isDuplicate) {
        return res.status(400).json({ message: 'Class already exists' });
      }
    }

    const updateData = {};
    if (kelas) updateData.kelas = kelas;
    if (jurusan) updateData.jurusan = jurusan;

    await db.ref(`absen-app/kelas/${id}`).update(updateData);

    res.json({ message: 'Class updated successfully' });
  } catch (error) {
    console.error('Update class error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete kelas (guru only)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'guru') {
      return res.status(403).json({ message: 'Access denied. Only teachers can delete classes.' });
    }

    const { id } = req.params;

    const kelasSnapshot = await db.ref(`absen-app/kelas/${id}`).once('value');
    
    if (!kelasSnapshot.exists()) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Check if there are students in this class
    const usersSnapshot = await db.ref('absen-app/user').once('value');
    const users = usersSnapshot.val() || {};
    
    const kelasData = kelasSnapshot.val();
    const hasStudents = Object.values(users).some(user => 
      user.role === 'siswa' && 
      user.detail && 
      user.detail.kelas === kelasData.kelas && 
      user.detail.jurusan === kelasData.jurusan
    );

    if (hasStudents) {
      return res.status(400).json({ 
        message: 'Cannot delete class. There are students enrolled in this class.' 
      });
    }

    await db.ref(`absen-app/kelas/${id}`).remove();

    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get unique kelas names
router.get('/list/names', verifyToken, async (req, res) => {
  try {
    const kelasSnapshot = await db.ref('absen-app/kelas').once('value');
    const kelas = kelasSnapshot.val() || {};

    const kelasNames = [...new Set(Object.values(kelas).map(k => k.kelas))];

    res.json({ kelasNames });
  } catch (error) {
    console.error('Get class names error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get unique jurusan names
router.get('/list/jurusan', verifyToken, async (req, res) => {
  try {
    const kelasSnapshot = await db.ref('absen-app/kelas').once('value');
    const kelas = kelasSnapshot.val() || {};

    const jurusanNames = [...new Set(Object.values(kelas).map(k => k.jurusan))];

    res.json({ jurusanNames });
  } catch (error) {
    console.error('Get jurusan names error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;