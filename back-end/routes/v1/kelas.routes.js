/* === File: routes/v1/kelas.routes.js === */

const express = require('express');
const routerKelas = express.Router();
const controllerKelas = require('../../controllers/kelas.controller');
const { verifyToken, isGuru } = require('../../middleware/auth.middleware');

routerKelas.post('/', [verifyToken, isGuru], controllerKelas.createKelas);
routerKelas.get('/', verifyToken, controllerKelas.getAllKelas);
routerKelas.put('/:id', [verifyToken, isGuru], controllerKelas.updateKelas);
routerKelas.delete('/:id', [verifyToken, isGuru], controllerKelas.deleteKelas);

module.exports = routerKelas;
