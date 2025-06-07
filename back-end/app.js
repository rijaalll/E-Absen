// server.js
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { db } = require('./utils/firebase');

// Initialize Firebase Admin

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/v1', require('./routes/v1/auth'));
app.use('/v1', require('./routes/v1/siswa'));
app.use('/v1', require('./routes/v1/absen'));
app.use('/v1', require('./routes/v1/qr'));
app.use('/v1', require('./routes/v1/kelas'));
app.use('/v1', require('./routes/v1/guru'));

// Basic error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler - Fixed for Express 5.x compatibility
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { db };