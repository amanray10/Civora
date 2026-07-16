const router = require('express').Router();
const { translate } = require('../controllers/translateController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);
router.post('/', translate);

module.exports = router;
