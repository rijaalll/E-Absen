// routes/v1/qr/qr.js
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

// Generate random string for QR code
const generateRandomCode = (length = 20) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Generate QR code (guru only)
router.post('/generate', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'guru') {
      return res.status(403).json({ message: 'Access denied. Only teachers can generate QR codes.' });
    }

    const qrId = uuidv4();
    const qrCode = generateRandomCode(20);

    const qrData = {
      id: qrId,
      code: qrCode,
      createdAt: new Date().toISOString(),
      createdBy: req.user.id
    };

    // Replace existing QR code (only one active at a time)
    await db.ref('absen-app/qr-unique-code').set(qrData);

    res.status(201).json({
      message: 'QR code generated successfully',
      qr: {
        id: qrId,
        code: qrCode,
        createdAt: qrData.createdAt
      }
    });
  } catch (error) {
    console.error('Generate QR code error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get current QR code (guru only)
router.get('/current', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'guru') {
      return res.status(403).json({ message: 'Access denied. Only teachers can view QR codes.' });
    }

    const qrSnapshot = await db.ref('absen-app/qr-unique-code').once('value');
    const qrData = qrSnapshot.val();

    if (!qrData) {
      return res.status(404).json({ message: 'No QR code found' });
    }

    res.json({ 
      qr: {
        id: qrData.id,
        code: qrData.code,
        createdAt: qrData.createdAt
      }
    });
  } catch (error) {
    console.error('Get current QR code error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Verify QR code (siswa only)
router.post('/verify', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'siswa') {
      return res.status(403).json({ message: 'Access denied. Only students can verify QR codes.' });
    }

    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'QR code is required' });
    }

    const qrSnapshot = await db.ref('absen-app/qr-unique-code').once('value');
    const qrData = qrSnapshot.val();

    if (!qrData || qrData.code !== code) {
      return res.status(400).json({ message: 'Invalid QR code' });
    }

    // Check if QR code is not too old (optional: add expiration logic)
    const createdAt = new Date(qrData.createdAt);
    const now = new Date();
    const hoursDiff = (now - createdAt) / (1000 * 60 * 60);

    if (hoursDiff > 24) { // QR code expires after 24 hours
      return res.status(400).json({ message: 'QR code has expired' });
    }

    res.json({ 
      message: 'QR code is valid',
      valid: true
    });
  } catch (error) {
    console.error('Verify QR code error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete QR code (guru only)
router.delete('/current', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'guru') {
      return res.status(403).json({ message: 'Access denied. Only teachers can delete QR codes.' });
    }

    const qrSnapshot = await db.ref('absen-app/qr-unique-code').once('value');
    
    if (!qrSnapshot.exists()) {
      return res.status(404).json({ message: 'No QR code found' });
    }

    await db.ref('absen-app/qr-unique-code').remove();

    res.json({ message: 'QR code deleted successfully' });
  } catch (error) {
    console.error('Delete QR code error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Regenerate QR code (guru only)
router.put('/regenerate', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'guru') {
      return res.status(403).json({ message: 'Access denied. Only teachers can regenerate QR codes.' });
    }

    const qrId = uuidv4();
    const qrCode = generateRandomCode(20);

    const qrData = {
      id: qrId,
      code: qrCode,
      createdAt: new Date().toISOString(),
      createdBy: req.user.id
    };

    await db.ref('absen-app/qr-unique-code').set(qrData);

    res.json({
      message: 'QR code regenerated successfully',
      qr: {
        id: qrId,
        code: qrCode,
        createdAt: qrData.createdAt
      }
    });
  } catch (error) {
    console.error('Regenerate QR code error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;