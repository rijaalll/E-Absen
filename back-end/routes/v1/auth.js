// routes/v1/auth.js
const express = require('express');
const router = express.Router();
const { db } = require('../../utils/firebase');

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    
    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password, dan role wajib diisi' });
    }

    // Cari user berdasarkan role
    const userRef = db.ref(`absen-app/${role}`);
    const snapshot = await userRef.once('value');
    const users = snapshot.val();

    if (!users) {
      return res.status(401).json({ error: 'User tidak ditemukan' });
    }

    // Cari user dengan email dan password yang cocok
    let foundUser = null;
    let userId = null;

    for (const [id, user] of Object.entries(users)) {
      if (user.email === email && user.password === password) {
        foundUser = user;
        userId = id;
        break;
      }
    }

    if (!foundUser) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    // Return user data tanpa password
    const { password: _, ...userWithoutPassword } = foundUser;
    
    res.json({
      message: 'Login berhasil',
      user: { ...userWithoutPassword, id: userId }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;