const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
  startInterviewAgent,
  stopInterviewAgent
} = require('../controllers/agora.controller');

router.use(protect);

router.post('/:interviewId/start', startInterviewAgent);
router.post('/:interviewId/stop', stopInterviewAgent);

module.exports = router;
