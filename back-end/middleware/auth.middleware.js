// middleware/auth.middleware.js

const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    // Ambil token dari header 'Authorization'
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer TOKEN

    if (!token) {
        return res.status(403).send({ message: "Akses ditolak. Token tidak disediakan." });
    }

    try {
        // Verifikasi token menggunakan secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Simpan data user dari token ke request
    } catch (err) {
        return res.status(401).send({ message: "Token tidak valid." });
    }
    
    return next(); // Lanjutkan ke middleware atau controller berikutnya
};

const isGuru = (req, res, next) => {
    if (req.user && req.user.role === 'guru') {
        next();
    } else {
        res.status(403).send({ message: "Akses ditolak. Peran 'guru' diperlukan." });
    }
};

const isSiswa = (req, res, next) => {
     if (req.user && req.user.role === 'siswa') {
        next();
    } else {
        res.status(403).send({ message: "Akses ditolak. Peran 'siswa' diperlukan." });
    }
}

module.exports = {
    verifyToken,
    isGuru,
    isSiswa
};
