const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
  startInterviewAgent,
  stopInterviewAgent,
  nextQuestionForAgent
} = require('../controllers/agora.controller');

router.use(protect);

router.post('/:interviewId/start', startInterviewAgent);
router.post('/:interviewId/stop', stopInterviewAgent);
router.post('/:interviewId/next-question', nextQuestionForAgent);

module.exports = router;
