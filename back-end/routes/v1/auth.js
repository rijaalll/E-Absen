// Revisi /v1/login agar tidak bisa login dari device lain
const express = require('express');
const router = express.Router();
const { db } = require('../../utils/firebase');

router.post('/login', async (req, res) => {
  try {
    const { email, password, token: clientToken } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan password wajib diisi' });
    }

    const userRef = db.ref('absen-app/app/user');
    const snapshot = await userRef.once('value');
    const users = snapshot.val();

    if (!users) return res.status(401).json({ error: 'User tidak ditemukan' });

    let foundUser = null;
    let userId = null;

    for (const [id, user] of Object.entries(users)) {
      if (user.email === email && user.password === password) {
        foundUser = user;
        userId = id;
        break;
      }
    }

    if (!foundUser) return res.status(401).json({ error: 'Email atau password salah' });

    const userAgent = req.headers['user-agent'] || '';

    if (foundUser.role === 'siswa' && foundUser.detail) {
      const dbToken = foundUser.detail.authToken || null;

      if (dbToken) {
        // Jika token sudah ada → harus disertakan dan harus cocok
        if (!clientToken || clientToken !== dbToken) {
          return res.status(401).json({
            error: 'Login ditolak. Akun ini sudah login di perangkat lain.',
            required_token: true
          });
        }
      } else {
        // Jika belum ada token → buat dan simpan
        const newToken = generateRandomToken(10);
        await db.ref(`absen-app/app/user/${userId}/detail/authToken`).set(newToken);
        foundUser.detail.authToken = newToken;
      }

      // Simpan user-agent terbaru
      await db.ref(`absen-app/app/user/${userId}/detail/user-agent`).set(userAgent);
      foundUser.detail['user-agent'] = userAgent;
    }

    const { password: _, ...userWithoutPassword } = foundUser;

    res.json({
      message: 'Login berhasil',
      user: { ...userWithoutPassword, id: userId },
      token: foundUser.detail?.authToken || null
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

function generateRandomToken(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

module.exports = router;
