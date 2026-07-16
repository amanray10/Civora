const router = require('express').Router();
const c = require('../controllers/deptAdminController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth, requireRole('admin'));
router.get('/users', c.listUsers);

router.put('/officers/:id/demote', c.demoteOfficer);
router.put('/users/:id/deactivate', c.deactivate);
router.put('/users/:id/reactivate', c.reactivate);

module.exports = router;
