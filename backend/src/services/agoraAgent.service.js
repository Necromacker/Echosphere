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

/**
 * Launch Agora Conversational AI Agent into the interview channel
 */
const startAgent = async ({ channelName, jobTitle, questions = [] }) => {
  const authHeader = getAgoraAuthHeader();

  const totalQuestions = questions && questions.length > 0 ? questions.length : 1;
  const questionsList = questions && questions.length > 0
    ? questions.map((q, i) => `Question ${i + 1} of ${totalQuestions}: [${q.category || 'tech'}] ${q.questionText || q}`).join('\n\n')
    : 'Question 1 of 1: Tell me about your background and recent engineering challenges you solved.';

  const systemPrompt = `# 1. ROLE & MISSION
You are a Senior Technical Interviewer conducting a live voice interview for the role of "${jobTitle || 'Software Engineer'}".
Your ONLY task is to verbally ask the candidate the EXACT ${totalQuestions} questions listed below, one by one, listen to their answer, and then conclude the interview.

# 2. THE STRICT ${totalQuestions} QUESTIONS TO ASK
Total Questions: ${totalQuestions}

${questionsList}

# 3. STRICT INTERVIEW FLOW RULES (STRICT LIMIT: EXACTLY ${totalQuestions} QUESTIONS)
1. Step 1 (Greeting & First Question):
   Start with a brief 1-sentence greeting, then immediately ask Question 1.
2. Step 2 (Sequential Question Flow):
   - Listen attentively to the candidate's answer.
   - When the candidate finishes their answer, acknowledge with a single brief natural phrase (e.g., "Got it.", "Thank you.", "Understood.") and immediately ask the next question in numerical order.
   - You must proceed strictly: Question 1 -> Question 2 -> ... -> Question ${totalQuestions}.
3. Step 3 (CRITICAL CONSTRAINTS - DO NOT DEVIATE):
   - STRICT LIMIT: You must ask EXACTLY ${totalQuestions} questions. NEVER exceed ${totalQuestions} questions under any circumstance.
   - NO FOLLOW-UPS: Do NOT ask any follow-up questions, probing questions, or impromptu questions. Move directly to the next question from the list.
   - NO EXTRA QUESTIONS: Do NOT invent, rephrase into multiple questions, or add any unlisted questions.
4. Step 4 (Conclude Interview):
   - Immediately after the candidate finishes answering Question ${totalQuestions} (the final question), DO NOT ask anything else.
   - Say: "Thank you for completing all ${totalQuestions} questions. That concludes our interview today. Your responses will now be analyzed and scored."
   - Conclude your speaking and end the session.

# 4. SPOKEN OUTPUT STYLE
- Conversational Length: 1 to 2 clear spoken sentences per turn.
- Natural speech: No bullet points, no markdown, no numbers, and no code blocks.`;

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
        greeting_message: `Hello! Welcome to your technical interview for ${jobTitle || 'this role'}. I will ask you ${totalQuestions} questions today. Let's begin with question 1: ${questions && questions.length > 0 ? (questions[0].questionText || questions[0]) : 'Tell me about yourself and your background.'}`,
        failure_message: "I didn't quite catch that. Could you please repeat that?"
      }
    }
  };

  const url = `https://api.agora.io/api/conversational-ai-agent/v2/projects/${AGORA_APP_ID}/join`;

  logger.info(`[Agora] Starting Conversational AI Agent for channel: ${channelName}`);
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
  stopAgent
};
