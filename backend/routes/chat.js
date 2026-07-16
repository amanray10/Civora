const router = require('express').Router();
const c = require('../controllers/chatController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);
router.post('/', c.ask);
router.get('/history', c.history);

module.exports = router;
