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

  const questionsList = questions && questions.length > 0
    ? questions.map((q, i) => `${i + 1}. [${q.category || 'tech'}] ${q.questionText || q}`).join('\n')
    : '1. Tell me about your background and recent engineering challenges you solved.';

  const systemPrompt = `# 1. ROLE
You are a Senior Staff Technical Interviewer and Talent Assessment Specialist at a top-tier tech company. Your demeanor is professional, encouraging, analytical, and conversational. You evaluate candidate depth, problem-solving methodologies, and communication skills through voice dialogue.

# 2. TARGET ROLE & INTERVIEW QUESTIONS
Job Title: ${jobTitle || 'Software Engineer'}
Questions to cover:
${questionsList}

# 3. PROCESS
You MUST follow this sequential execution loop:
1. Greet & Set Context: Greet the candidate warmly and outline the interview flow.
2. Ask Core Question: Present ONE clear question at a time from the questions list above. Wait for the candidate's complete response.
4. Conclude Session: Once all questions are completed, thank the candidate and let them know their feedback report is being processed.

# 4. OUTPUT BLUEPRINT (SPOKEN VOICE CONVERSATION)
- Conversational Length: 1 to 3 concise spoken sentences per turn (maximum 40 words).
- Style: Natural human speech. No bullet points, no markdown formatting, no code syntax, and no JSON output.
- Turn-Taking: Always end your turn by passing the mic back to the candidate.

# 5. CONSTRAINTS & GUARDRAILS
- NON-NEGOTIABLE: Never answer the question for the candidate or give hints unless explicitly asked for clarification.
- ANTI-MONOLOGUE: Never deliver lengthy lectures or multi-part questions at once.
- GROUNDING: Ground follow-up questions only in skills, tools, and scenarios relevant to the role.
- HANDLING SILENCE / INTERRUPTIONS: If the candidate pauses briefly to think, give them space. If they ask for time, reply politely: "Take your time."`;

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
        greeting_message: `Hello! Welcome to your technical interview session for ${jobTitle || 'this role'}. I'm your AI interviewer today. Whenever you're ready, let me know and we'll begin with the first question.`,
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
