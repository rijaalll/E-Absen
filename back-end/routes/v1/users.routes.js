/* === File: routes/v1/users.routes.js === */

const express = require('express');
const routerUsers = express.Router();
const controllerUsers = require('../../controllers/user.controller');
const { verifyToken } = require('../../middleware/auth.middleware');

// Semua rute di sini memerlukan token yang valid
routerUsers.use(verifyToken);

routerUsers.get('/', controllerUsers.getAllUsers);
routerUsers.get('/:id', controllerUsers.getUserById);
routerUsers.put('/:id', controllerUsers.updateUser);
routerUsers.delete('/:id', controllerUsers.deleteUser);

module.exports = routerUsers;
