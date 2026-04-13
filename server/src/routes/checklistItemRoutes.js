const express = require('express');
const router = express.Router();
const checklistItemController = require('../controllers/checklistItemController');

router.post('/', checklistItemController.createChecklistItem);
router.get('/:checklist_id', checklistItemController.getChecklistItems);
router.put('/:id', checklistItemController.updateChecklistItem);
router.delete('/:id', checklistItemController.deleteChecklistItem);

module.exports = router;
