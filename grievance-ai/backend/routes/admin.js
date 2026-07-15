const router = require('express').Router();
const c = require('../controllers/adminController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth, requireRole('admin'));
router.get('/analytics', c.analytics);
router.get('/users', c.users);
router.put('/users/:id/role', c.setRole);

module.exports = router;
