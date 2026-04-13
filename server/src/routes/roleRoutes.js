const express = require('express');
const router = express.Router();
const  roleController= require('../controllers/roleController');
const verifyToken = require('../middleware/verifyToken');

router.get('/', roleController.getRoles);
router.post('/',verifyToken, roleController.createRole);
router.put('/:id',verifyToken,roleController.updateRole);
router.delete('/:id',verifyToken, roleController.deleteRole);

module.exports = router;
    