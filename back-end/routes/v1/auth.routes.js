// routes/v1/auth.routes.js

const express = require('express');
const router = express.Router();
const controller = require('../../controllers/auth.controller');

// Endpoint untuk registrasi
router.post('/register', controller.register);

// Endpoint untuk login
router.post('/login', controller.login);

module.exports = router;
