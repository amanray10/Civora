const router = require('express').Router();
const c = require('../controllers/complaintController');
const { requireAuth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(requireAuth);
router.post('/', upload.array('files', 4), c.create);
router.get('/', c.list);
router.get('/:id', c.getById);
router.put('/:id/status', requireRole('department', 'admin', 'superadmin'), c.updateStatus);
router.put('/:id/assign', requireRole('superadmin'), c.assignDepartment);

module.exports = router;
