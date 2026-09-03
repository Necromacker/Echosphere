const axios = require('axios');
const { RtcTokenBuilder, RtcRole } = require('agora-token');
const logger = require('../config/logger');

const AGORA_APP_ID = process.env.AGORA_APP_ID || '6963e099c7c441f785c5ab1c9d7c476a';
const AGORA_PIPELINE_ID = process.env.AGORA_PIPELINE_ID || '911fc6e0084f4111aea65a45e9a09afd';

/**
 * Generate HTTP Basic Auth header for Agora REST API
 */
const getAgoraAuthHeader = () => {
  const customerId = process.env.AGORA_CUSTOMER_ID;
  const customerSecret = process.env.AGORA_CUSTOMER_SECRET;
  const precomputed = process.env.AGORA_BASIC_AUTH;

  if (precomputed) {
    return precomputed.startsWith('Basic ') ? precomputed : `Basic ${precomputed}`;
  }

  if (customerId && customerSecret) {
    const credentials = Buffer.from(`${customerId}:${customerSecret}`).toString('base64');
    return `Basic ${credentials}`;
  }

  throw new Error('Agora credentials are not configured. Please set AGORA_CUSTOMER_ID and AGORA_CUSTOMER_SECRET in .env');
};

/**
 * Generate RTC Token for the candidate browser to join the voice room
 */
const generateUserRtcToken = (channelName, uid = 0) => {
  const appCert = process.env.AGORA_APP_CERTIFICATE;
  if (!appCert) {
    // If no app certificate is set, project operates in App ID-only mode
    return null;
  }

  const role = RtcRole.PUBLISHER;
  const expirationTimeInSeconds = 3600; // 1 hour
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  return RtcTokenBuilder.buildTokenWithUid(
    AGORA_APP_ID,
    appCert,
    channelName,
    uid,
    role,
    privilegeExpiredTs
  );
};

// In-memory mapping of active agent instances (channelName -> agentId)
const activeAgents = new Map();

const getInterviewerRole = (category) => {
  const roles = {
    technical: 'Technical Interviewer',
    behavioral: 'Behavioral Interviewer',
    situational: 'Hiring Manager',
    hr: 'Hiring Manager',
    culture_fit: 'Customer / Culture Interviewer',
  };

  return roles[category] || 'General Interviewer';
};

/**
 * Launch Agora Conversational AI Agent into the interview channel
 */
const startAgent = async ({ channelName, jobTitle, questions = [] }) => {
  const authHeader = getAgoraAuthHeader();

  const totalQuestions = questions && questions.length > 0 ? questions.length : 1;
  const currentQ = questions && questions.length > 0 ? questions[0] : null;
  const q1Text = currentQ ? (currentQ.questionText || currentQ) : 'Tell me about your background and recent engineering challenges you solved.';
  const q1Role = getInterviewerRole(currentQ?.category);
  const q1Keywords = currentQ?.expectedKeywords && currentQ.expectedKeywords.length > 0
    ? currentQ.expectedKeywords.join(', ')
    : 'problem solving, technical depth, core engineering';

  const systemPrompt = `# 1. ROLE & MISSION
You are the ${q1Role} conducting a live voice interview for the role of "${jobTitle || 'Software Engineer'}".
You are currently evaluating the candidate ONLY on Question 1 of ${totalQuestions}.
DO NOT ask or talk about any other question. Focus exclusively on Question 1.

# 2. CURRENT QUESTION DETAILS
- Question Number: Question 1 of ${totalQuestions}
- Question Text: "${q1Text}"
- Expected Keywords/Concepts: ${q1Keywords}

# 3. INTERVIEW FLOW RULES (FOLLOW STRICTLY)
1. Step 1 (Greeting & Question 1):
   - Greet the candidate briefly and ask Question 1.

2. Step 2 (Help User Answer):
   - If the candidate asks for clarification, says they don't understand, or asks you to explain:
     Briefly describe or clarify what the question is asking in 1 to 2 simple sentences to help them answer. Do NOT give away the complete answer, but guide them clearly.

3. Step 3 (Listen & Check Expected Keywords):
   - Listen attentively while the candidate speaks their answer.
   - Compare what they said against the Expected Keywords (${q1Keywords}).
   - IF KEYWORDS ARE MISSING:
     Ask EXACTLY 1 concise follow-up question prompting them on the missing concept.
     Listen to their response to this single follow-up.
   - IF KEYWORDS ARE ALREADY COVERED (or after the single follow-up has been answered):
     Do NOT ask any more follow-up questions for Question 1.

4. Step 4 (Save Answer & Prompt for Next Question):
   - Clearly confirm their answer is recorded:
     "Got it, your answer for Question 1 is saved. Please click 'Next Question' on your screen whenever you are ready to proceed."
   - DO NOT ASK ANY OTHER QUESTIONS: You do not have Question 2 yet. Wait until the user clicks 'Next Question' on their screen.

# 4. SPOKEN OUTPUT STYLE
- Conversational Length: 1 to 2 clear spoken sentences per turn.
- Professional, warm, and encouraging.
- Natural speech: No bullet points, no markdown, and no code blocks.`;

  // Generate an RTC token for the AI agent's UID so it can join the secured channel
  const agentUid = 1000;
  const agentToken = generateUserRtcToken(channelName, agentUid);

  const payload = {
    name: channelName,
    pipeline_id: AGORA_PIPELINE_ID,
    properties: {
      channel: channelName,
      token: agentToken,  // Required when App Certificate is enabled
      agent_rtc_uid: String(agentUid),
      remote_rtc_uids: ['*'],
      llm: {
        system_messages: [
          {
            role: 'system',
            content: systemPrompt
          }
        ],
        greeting_message: `Hello! Welcome to your technical interview for ${jobTitle || 'this role'}. I will ask you ${totalQuestions} questions today. Let's begin with question 1: ${q1Text}`,
        failure_message: "I didn't quite catch that. Could you please repeat that?"
      }
    }
  };

  const url = `https://api.agora.io/api/conversational-ai-agent/v2/projects/${AGORA_APP_ID}/join`;

  logger.info(`[Agora] Starting Conversational AI Agent for channel: ${channelName} with Question 1 only`);
  const response = await axios.post(url, payload, {
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json'
    }
  });

  if (response.data?.agent_id) {
    activeAgents.set(channelName, response.data.agent_id);
  }

  return response.data;
};

/**
 * Update active Agora agent with ONLY the next question when user clicks Next Question
 */
const updateAgentQuestion = async ({ channelName, jobTitle, question, questionIndex, totalQuestions }) => {
  const agentId = activeAgents.get(channelName);
  if (!agentId) {
    logger.warn(`[Agora] No active agent found for channel: ${channelName}`);
    return;
  }
  const authHeader = getAgoraAuthHeader();
  const text = question.questionText || question;
  const interviewerRole = getInterviewerRole(question.category);
  const keywords = question.expectedKeywords && question.expectedKeywords.length > 0
    ? question.expectedKeywords.join(', ')
    : 'core technical principles';

  const systemPrompt = `# 1. ROLE & MISSION
You are the ${interviewerRole} conducting a live voice interview for the role of "${jobTitle || 'Software Engineer'}".
The candidate just moved to Question ${questionIndex + 1} of ${totalQuestions}.
You are currently evaluating the candidate ONLY on Question ${questionIndex + 1} of ${totalQuestions}.
DO NOT ask or talk about any other question. Focus exclusively on Question ${questionIndex + 1}.

# 2. CURRENT QUESTION DETAILS
- Question Number: Question ${questionIndex + 1} of ${totalQuestions}
- Question Text: "${text}"
- Expected Keywords/Concepts: ${keywords}

# 3. INTERVIEW FLOW RULES (FOLLOW STRICTLY)
1. Step 1 (Ask Question ${questionIndex + 1}):
   - Present Question ${questionIndex + 1} clearly to the candidate.

2. Step 2 (Help User Answer):
   - If the candidate asks for clarification, says they don't understand, or asks you to explain:
     Briefly describe or clarify what the question is asking in 1 to 2 simple sentences to help them answer.

3. Step 3 (Listen & Check Expected Keywords):
   - Listen attentively while the candidate speaks their answer.
   - Compare what they said against the Expected Keywords (${keywords}).
   - IF KEYWORDS ARE MISSING:
     Ask EXACTLY 1 concise follow-up question prompting them on the missing concept.
     Listen to their response to this single follow-up.
   - IF KEYWORDS ARE ALREADY COVERED (or after the single follow-up has been answered):
     Do NOT ask any more follow-up questions for Question ${questionIndex + 1}.

4. Step 4 (Save Answer & Prompt for Next Action):
   - Clearly confirm their answer is recorded:
     ${questionIndex + 1 < totalQuestions 
       ? `"Got it, your answer for Question ${questionIndex + 1} is saved. Please click 'Next Question' on your screen whenever you are ready to proceed."`
       : `"Thank you, all answers have been recorded! Please click 'Finish & Submit for Groq Review' on your screen to view your detailed evaluation."`}
   - DO NOT ASK ANY OTHER QUESTIONS until the user clicks to proceed.

# 4. SPOKEN OUTPUT STYLE
- Conversational Length: 1 to 2 clear spoken sentences per turn.
- Professional, warm, and encouraging.
- Natural speech: No bullet points, no markdown, and no code blocks.`;

  // 1. Update the agent configuration with the new question system prompt
  const updateUrl = `https://api.agora.io/api/conversational-ai-agent/v2/projects/${AGORA_APP_ID}/agents/${agentId}/update`;
  logger.info(`[Agora] Updating agent ${agentId} with Question ${questionIndex + 1}`);

  await axios.post(updateUrl, {
    properties: {
      llm: {
        system_messages: [
          {
            role: 'system',
            content: systemPrompt
          }
        ]
      }
    }
  }, {
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json'
    }
  });

  // 2. Broadcast the question so Agora speaks Question X aloud immediately
  try {
    const speakUrl = `https://api.agora.io/api/conversational-ai-agent/v2/projects/${AGORA_APP_ID}/agents/${agentId}/speak`;
    await axios.post(speakUrl, {
      text: `Question ${questionIndex + 1}: ${text}`,
      priority: 'high',
      interruptable: true
    }, {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      }
    });
  } catch (speakErr) {
    logger.warn(`[Agora] Speak endpoint note: ${speakErr.message}`);
  }
};

/**
 * Disconnect Agora Conversational AI Agent from the channel
 */
const stopAgent = async (channelName) => {
  const authHeader = getAgoraAuthHeader();
  const agentId = activeAgents.get(channelName);

  if (!agentId) {
    logger.info(`[Agora] No active agent ID found in memory for channel: ${channelName}`);
    return null;
  }

  const url = `https://api.agora.io/api/conversational-ai-agent/v2/projects/${AGORA_APP_ID}/agents/${agentId}/leave`;

  logger.info(`[Agora] Stopping Conversational AI Agent ${agentId} for channel: ${channelName}`);
  try {
    const response = await axios.post(url, {}, {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      }
    });
    activeAgents.delete(channelName);
    return response.data;
  } catch (err) {
    logger.warn(`[Agora] Leave agent request error: ${err.response?.data?.message || err.message}`);
    activeAgents.delete(channelName);
    return null;
  }
};

module.exports = {
  AGORA_APP_ID,
  generateUserRtcToken,
  startAgent,
  updateAgentQuestion,
  stopAgent
};
