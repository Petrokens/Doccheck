const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const verifyToken = require('../middleware/verifyToken');

// GET all users
router.get('/', userController.getUsers);

// GET user by user_id (UUID)
router.get('/:user_id',verifyToken, userController.getUserById);

// UPDATE user
router.put('/:user_id',verifyToken , userController.updateUser);

// DELETE user
router.delete('/:user_id',verifyToken, userController.deleteUser);


module.exports = router;