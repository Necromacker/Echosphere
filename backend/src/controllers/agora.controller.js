const Interview = require('../models/Interview.model');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');
const {
  AGORA_APP_ID,
  generateUserRtcToken,
  startAgent,
  updateAgentQuestion,
  speakAgentMessage,
  stopAgent
} = require('../services/agoraAgent.service');

/**
 * POST /api/agora/:interviewId/start
 * Returns client RTC credentials immediately so frontend can join the channel,
 * then launches the Agora Conversational AI Agent after a short delay
 * (so the candidate is already in the channel when the agent arrives).
 */
exports.startInterviewAgent = async (req, res, next) => {
  const { interviewId } = req.params;

  const interview = await Interview.findOne({ _id: interviewId, userId: req.user._id });
  if (!interview) {
    return next(new AppError('Interview not found.', 404));
  }

  // Generate unique Agora RTC channel name (letters, numbers, underscores only)
  const channelName = `interview_${interviewId}`.replace(/[^a-zA-Z0-9_]/g, '_');
  const uid = Math.floor(Math.random() * 100000) + 1; // numeric UID for candidate

  try {
    // 1. Generate user RTC token for the candidate FIRST
    const token = generateUserRtcToken(channelName, uid);

    // 2. Return credentials immediately so frontend can join the channel
    res.status(200).json({
      success: true,
      data: {
        appId: AGORA_APP_ID,
        channelName,
        token,
        uid
      }
    });

    // 3. After responding, wait a moment for the frontend to join, then start the AI agent
    setTimeout(async () => {
      try {
        logger.info(`[Agora] Launching AI agent into channel ${channelName} (delayed start)`);
        const agentResponse = await startAgent({
          channelName,
          jobTitle: interview.jobTitle,
          questions: interview.questions || [],
          totalQuestions: interview.numberOfQuestions
        });
        logger.info(`[Agora] AI Agent started: ${agentResponse.agent_id}, status: ${agentResponse.status}`);
      } catch (agentErr) {
        logger.error(`[Agora] Failed to start AI agent (delayed): ${agentErr.message}`, {
          response: agentErr.response?.data
        });
      }
    }, 2000); // 2-second delay gives the frontend time to join and publish mic

  } catch (err) {
    logger.error(`[Agora] Failed to start voice interview agent: ${err.message}`, {
      response: err.response?.data
    });
    return next(
      new AppError(
        err.response?.data?.message || err.message || 'Failed to initialize Agora voice agent.',
        err.response?.status || 500
      )
    );
  }
};

/**
 * POST /api/agora/:interviewId/stop
 * Terminates the Agora Conversational AI Agent in the channel
 */
exports.stopInterviewAgent = async (req, res, next) => {
  const { interviewId } = req.params;
  const channelName = `interview_${interviewId}`.replace(/[^a-zA-Z0-9_]/g, '_');

  try {
    await stopAgent(channelName);
    res.status(200).json({
      success: true,
      message: 'Agora voice agent terminated successfully.'
    });
  } catch (err) {
    logger.warn(`[Agora] Error stopping voice agent: ${err.message}`);
    res.status(200).json({
      success: true,
      message: 'Agent stop request processed.'
    });
  }
};

/**
 * POST /api/agora/:interviewId/next-question
 * Updates the active Agora AI Agent with only the next question and triggers speech
 */
exports.nextQuestionForAgent = async (req, res, next) => {
  const { interviewId } = req.params;
  const { questionIndex = 0 } = req.body;

  const interview = await Interview.findOne({ _id: interviewId, userId: req.user._id });
  if (!interview) {
    return next(new AppError('Interview not found.', 404));
  }

  const channelName = `interview_${interviewId}`.replace(/[^a-zA-Z0-9_]/g, '_');
  const question = interview.questions?.[questionIndex];
  if (!question) {
    return next(new AppError('Question index out of bounds.', 400));
  }

  try {
    await updateAgentQuestion({
      channelName,
      jobTitle: interview.jobTitle,
      question,
      questionIndex,
      totalQuestions: interview.numberOfQuestions
    });
    res.status(200).json({
      success: true,
      message: `Agora agent updated with Question ${questionIndex + 1}.`
    });
  } catch (err) {
    logger.warn(`[Agora] Failed to update agent question dynamically: ${err.message}`);
    res.status(200).json({
      success: false,
      message: 'Agent update attempted.'
    });
  }
};

/**
 * POST /api/agora/:interviewId/message
 * Speaks a short control message through the active Agora agent.
 */
exports.messageInterviewAgent = async (req, res, next) => {
  const { text } = req.body;
  if (!text) return next(new AppError('Agent message is required.', 400));

  const channelName = `interview_${req.params.interviewId}`.replace(/[^a-zA-Z0-9_]/g, '_');
  try {
    await speakAgentMessage({ channelName, text });
    res.status(200).json({ success: true });
  } catch (err) {
    logger.warn(`[Agora] Failed to speak control message: ${err.message}`);
    res.status(200).json({ success: false });
  }
};

