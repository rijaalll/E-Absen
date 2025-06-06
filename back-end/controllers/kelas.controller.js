/* === File: controllers/kelas.controller.js === */

const db = require('../utils/firebaseDb');
const { v4: uuidv4 } = require('uuid');

exports.createKelas = async (req, res) => {
    try {
        const { kelas, jurusan } = req.body;
        const kelasId = uuidv4();
        await db.ref(`absen-app/kelas/${kelasId}`).set({ id: kelasId, kelas, jurusan });
        res.status(201).send({ message: "Kelas berhasil dibuat." });
    } catch (error) {
        res.status(500).send({ message: "Gagal membuat kelas.", error: error.message });
    }
};

exports.getAllKelas = async (req, res) => {
    try {
        const snapshot = await db.ref('absen-app/kelas').once('value');
        res.status(200).send(snapshot.val() || {});
    } catch (error) {
        res.status(500).send({ message: "Gagal mengambil data.", error: error.message });
    }
};

exports.updateKelas = async (req, res) => {
    try {
        const { id } = req.params;
        const { kelas, jurusan } = req.body;
        await db.ref(`absen-app/kelas/${id}`).update({ kelas, jurusan });
        res.status(200).send({ message: "Kelas berhasil diperbarui." });
    } catch (error) {
        res.status(500).send({ message: "Gagal memperbarui kelas.", error: error.message });
    }
};

exports.deleteKelas = async (req, res) => {
    try {
        const { id } = req.params;
        await db.ref(`absen-app/kelas/${id}`).remove();
        res.status(200).send({ message: "Kelas berhasil dihapus." });
    } catch (error) {
        res.status(500).send({ message: "Gagal menghapus kelas.", error: error.message });
    }
};