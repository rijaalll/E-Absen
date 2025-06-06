// routes/v1/user/user.js
const express = require('express');
const router = express.Router();
const { db } = require('../../../utils/firebaseDb');
const bcrypt = require('bcrypt');
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

// Register user
router.post('/register', async (req, res) => {
  try {
    const {
      nama, telephone, email, password, jenis_kelamin, role, alamat,
      nama_ibu, nama_ayah, telephone_ortu, nisn, kelas, jurusan
    } = req.body;

    // Validasi input
    if (!nama || !telephone || !email || !password || !jenis_kelamin || !role) {
      return res.status(400).json({ message: 'Required fields are missing' });
    }

    // Check if email already exists
    const userSnapshot = await db.ref('absen-app/user').orderByChild('email').equalTo(email).once('value');
    if (userSnapshot.exists()) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    // Create user object
    const userData = {
      id: userId,
      nama,
      telephone,
      email,
      password: hashedPassword,
      jenis_kelamin,
      role,
      alamat
    };

    // Add student details if role is siswa
    if (role === 'siswa') {
      userData.detail = {
        nama_ibu,
        nama_ayah,
        telephone_ortu,
        nisn,
        kelas,
        jurusan,
        status: 'active'
      };
    }

    // Save to database
    await db.ref(`absen-app/user/${userId}`).set(userData);

    // Remove password from response
    delete userData.password;

    res.status(201).json({
      message: 'User registered successfully',
      user: userData
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user by email
    const userSnapshot = await db.ref('absen-app/user').orderByChild('email').equalTo(email).once('value');
    
    if (!userSnapshot.exists()) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const userData = Object.values(userSnapshot.val())[0];

    // Check password
    const validPassword = await bcrypt.compare(password, userData.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: userData.id, email: userData.email, role: userData.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Remove password from response
    delete userData.password;

    res.json({
      message: 'Login successful',
      token,
      user: userData
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all users (admin only)
router.get('/', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'guru') {
      return res.status(403).json({ message: 'Access denied. Only teachers can view all users.' });
    }

    const usersSnapshot = await db.ref('absen-app/user').once('value');
    const users = usersSnapshot.val() || {};

    // Remove passwords from response
    Object.keys(users).forEach(userId => {
      delete users[userId].password;
    });

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user can access this data
    if (req.user.id !== id && req.user.role !== 'guru') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const userSnapshot = await db.ref(`absen-app/user/${id}`).once('value');
    
    if (!userSnapshot.exists()) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = userSnapshot.val();
    delete userData.password;

    res.json({ user: userData });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update user
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user can update this data
    if (req.user.id !== id && req.user.role !== 'guru') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const userSnapshot = await db.ref(`absen-app/user/${id}`).once('value');
    
    if (!userSnapshot.exists()) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updateData = { ...req.body };
    
    // Hash password if provided
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    // Remove id from update data to prevent overwriting
    delete updateData.id;

    await db.ref(`absen-app/user/${id}`).update(updateData);

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete user
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Only teachers can delete users
    if (req.user.role !== 'guru') {
      return res.status(403).json({ message: 'Access denied. Only teachers can delete users.' });
    }

    const userSnapshot = await db.ref(`absen-app/user/${id}`).once('value');
    
    if (!userSnapshot.exists()) {
      return res.status(404).json({ message: 'User not found' });
    }

    await db.ref(`absen-app/user/${id}`).remove();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get students by class
router.get('/siswa/kelas/:kelas/:jurusan', verifyToken, async (req, res) => {
  try {
    const { kelas, jurusan } = req.params;

    const usersSnapshot = await db.ref('absen-app/user').once('value');
    const users = usersSnapshot.val() || {};

    const students = Object.values(users).filter(user => 
      user.role === 'siswa' && 
      user.detail && 
      user.detail.kelas === kelas && 
      user.detail.jurusan === jurusan
    );

    // Remove passwords from response
    students.forEach(student => delete student.password);

    res.json({ students });
  } catch (error) {
    console.error('Get students by class error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;