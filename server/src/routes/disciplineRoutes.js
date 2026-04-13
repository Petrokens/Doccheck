const express = require('express');
const router = express.Router();
const disciplineController = require('../controllers/disciplineController');
const verifyToken = require('../middleware/verifyToken');
 
// CRUD Routes
router.post('/',verifyToken, disciplineController.createDiscipline);           
router.get('/', verifyToken, disciplineController.getAllDisciplines);           
router.get('/:id',verifyToken, disciplineController.getDisciplineById);        
router.put('/:id',verifyToken, disciplineController.updateDiscipline);         
router.delete('/:id',verifyToken, disciplineController.deleteDiscipline);     

module.exports = router;
