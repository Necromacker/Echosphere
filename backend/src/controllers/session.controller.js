const Session = require('../models/Session.model');
const Interview = require('../models/Interview.model');
const User = require('../models/User.model');
const AppError = require('../utils/AppError');
const { evaluateAnswer, generateOverallFeedback } = require('../services/ai.service');

// ─── POST /api/sessions/start ─────────────────────────────────────
exports.startSession = async (req, res, next) => {
  const { interviewId } = req.body;

  const interview = await Interview.findOne({ _id: interviewId, userId: req.user._id });
  if (!interview) return next(new AppError('Interview not found.', 404));

  // Allow start if status is 'ready' OR if questions were generated despite a stale status
  const hasQuestions = interview.questions && interview.questions.length > 0;
  if (!hasQuestions) {
    return next(new AppError('Interview questions have not been generated yet.', 400));
  }

  // Check for existing in-progress session
  const existingSession = await Session.findOne({
    userId: req.user._id,
    interviewId,
    status: { $in: ['started', 'in_progress'] },
  });

  if (existingSession) {
    return res.status(200).json({ success: true, session: existingSession, resumed: true });
  }

  interview.status = 'in_progress';
  await interview.save();

  const session = await Session.create({
    userId: req.user._id,
    interviewId,
    answers: [],
    status: 'started',
    startedAt: new Date(),
  });

  res.status(201).json({ success: true, session, interview });
};

// ─── POST /api/sessions/:id/answer ────────────────────────────────
exports.submitAnswer = async (req, res, next) => {
  const { questionId, answerText, timeTaken, skipped } = req.body;

  const session = await Session.findOne({
    _id: req.params.id,
    userId: req.user._id,
    status: { $in: ['started', 'in_progress'] },
  });

  if (!session) return next(new AppError('Active session not found.', 404));

  const interview = await Interview.findById(session.interviewId);
  const question = interview.questions.id(questionId);
  if (!question) return next(new AppError('Question not found in interview.', 404));

  // Check if already answered
  const existing = session.answers.find((a) => a.questionId.toString() === questionId);
  if (existing) {
    existing.answerText = answerText;
    existing.timeTaken = timeTaken;
    existing.skipped = skipped;
  } else {
    session.answers.push({
      questionId,
      questionText: question.questionText,
      answerText: answerText || '',
      timeTaken: timeTaken || 0,
      skipped: skipped || false,
    });
  }

  session.status = 'in_progress';
  await session.save();

  res.status(200).json({ success: true, message: 'Answer saved.', session });
};

// ─── POST /api/sessions/:id/complete ─────────────────────────────
exports.completeSession = async (req, res, next) => {
  const session = await Session.findOne({
    _id: req.params.id,
    userId: req.user._id,
    status: { $in: ['started', 'in_progress'] },
  });

  if (!session) return next(new AppError('Active session not found.', 404));

  const interview = await Interview.findById(session.interviewId);
  const { spokenTranscript = '', answers: submittedAnswers } = req.body || {};

  // If candidate submitted specific per-question answers, update session.answers
  if (Array.isArray(submittedAnswers) && submittedAnswers.length > 0) {
    submittedAnswers.forEach((sub) => {
      const existing = session.answers.find((a) => a.questionId?.toString() === sub.questionId?.toString());
      const answerContent = sub.answerText ? sub.answerText.trim() : '';
      if (existing) {
        existing.answerText = answerContent;
        existing.timeTaken = sub.timeTaken || 0;
        existing.skipped = sub.skipped !== undefined ? sub.skipped : !answerContent;
      } else if (sub.questionId) {
        session.answers.push({
          questionId: sub.questionId,
          questionText: sub.questionText || '',
          answerText: answerContent,
          timeTaken: sub.timeTaken || 0,
          skipped: sub.skipped !== undefined ? sub.skipped : !answerContent,
        });
      }
    });
  }

  // Ensure all interview questions exist in session.answers
  if (interview && interview.questions) {
    interview.questions.forEach((q) => {
      let existing = session.answers.find((a) => a.questionId.toString() === q._id.toString());
      if (!existing) {
        session.answers.push({
          questionId: q._id,
          questionText: q.questionText,
          answerText: '',
          timeTaken: 0,
          skipped: true,
        });
      }
    });
  }

  // ── Evaluate each answer using Groq AI ───────────────────────────
  const evaluationPromises = session.answers.map(async (answer) => {
    if (answer.skipped || !answer.answerText || !answer.answerText.trim()) {
      answer.aiScore = 0;
      answer.aiFeedback = 'Question was skipped or left unanswered.';
      return;
    }
    const qDoc = interview?.questions?.id(answer.questionId);
    const result = await evaluateAnswer({
      questionText: answer.questionText,
      answerText: answer.answerText,
      expectedKeywords: qDoc?.expectedKeywords || [],
      jobTitle: interview?.jobTitle || 'Software Engineer',
    });
    answer.aiScore = typeof result.score === 'number' ? result.score : 5;
    answer.aiFeedback = result.feedback || 'Answer evaluated.';
  });

  await Promise.all(evaluationPromises);

  // ── Generate overall feedback & scoring using Groq AI ─────────────
  const overallData = await generateOverallFeedback({
    jobTitle: interview?.jobTitle || 'Software Engineer',
    answers: session.answers,
  });

  // ── Finalize session ──────────────────────────────────────────
  session.overallScore = overallData.overallScore ?? 0;
  session.overallFeedback = overallData.improvementTips?.join(' ') ?? '';
  session.strengths = overallData.strengths ?? [];
  session.areasForImprovement = overallData.weaknesses ?? [];
  session.recommendedResources = overallData.improvementTips ?? [];
  session.status = 'completed';
  session.completedAt = new Date();
  session.totalTimeTaken = session.answers.reduce((s, a) => s + (a.timeTaken || 0), 0);

  await session.save();

  // Update interview status and user's total sessions
  if (interview) {
    interview.status = 'completed';
    await interview.save();
  }

  await User.findByIdAndUpdate(req.user._id, { $inc: { totalSessions: 1 } });

  res.status(200).json({ success: true, session });
};

// ─── GET /api/sessions ────────────────────────────────────────────
exports.getMySessions = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [sessions, total] = await Promise.all([
    Session.find({ userId: req.user._id })
      .sort('-createdAt')
      .skip(skip)
      .limit(limit)
      .populate({ path: 'interviewId', select: 'jobTitle company experienceLevel' })
      .select('-answers'),
    Session.countDocuments({ userId: req.user._id }),
  ]);

  res.status(200).json({
    success: true,
    count: sessions.length,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    sessions,
  });
};

// ─── GET /api/sessions/:id ────────────────────────────────────────
exports.getSessionById = async (req, res, next) => {
  const session = await Session.findOne({ _id: req.params.id, userId: req.user._id })
    .populate({ path: 'interviewId', select: 'jobTitle company experienceLevel questions' });

  if (!session) return next(new AppError('Session not found.', 404));
  res.status(200).json({ success: true, session });
};
