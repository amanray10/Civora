const router = require('express').Router();
const c = require('../controllers/adminController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth, requireRole('superadmin'));
router.get('/analytics', c.analytics);
router.get('/users', c.users);
router.put('/users/:id/role', c.setRole);
router.put('/users/:id/deactivate', c.deactivate);
router.put('/users/:id/reactivate', c.reactivate);

module.exports = router;
