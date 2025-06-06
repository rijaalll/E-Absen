/* === File: controllers/user.controller.js === */

const db = require('../utils/firebaseDb');
const bcrypt = require('bcryptjs');

exports.getAllUsers = async (req, res) => {
    try {
        const snapshot = await db.ref('absen-app/user').once('value');
        const users = snapshot.val();
        // Hapus password dari response untuk keamanan
        if (users) {
            Object.keys(users).forEach(key => {
                delete users[key].password;
            });
        }
        res.status(200).send(users || {});
    } catch (error) {
        res.status(500).send({ message: "Gagal mengambil data pengguna.", error: error.message });
    }
};

exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const snapshot = await db.ref(`absen-app/user/${id}`).once('value');
        if (!snapshot.exists()) {
            return res.status(404).send({ message: "Pengguna tidak ditemukan." });
        }
        const user = snapshot.val();
        delete user.password;
        res.status(200).send(user);
    } catch (error) {
        res.status(500).send({ message: "Gagal mengambil data.", error: error.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        // Jika ada password baru, hash terlebih dahulu
        if (updates.password) {
            updates.password = await bcrypt.hash(updates.password, 10);
        }

        await db.ref(`absen-app/user/${id}`).update(updates);
        res.status(200).send({ message: "Data pengguna berhasil diperbarui." });
    } catch (error) {
        res.status(500).send({ message: "Gagal memperbarui data.", error: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        await db.ref(`absen-app/user/${id}`).remove();
        res.status(200).send({ message: "Pengguna berhasil dihapus." });
    } catch (error) {
        res.status(500).send({ message: "Gagal menghapus pengguna.", error: error.message });
    }
};
