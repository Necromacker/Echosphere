const { Server } = require("socket.io");
const groq = require('./config/groq');
const { DEFAULT_MODEL } = require('./config/groq');
require("dotenv").config();
const SystemPrompt = require('./models/SystemPrompt.model');

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  const normalizedOrigin = origin.replace(/\/$/, '');
  const envOrigins = (process.env.CLIENT_URL || 'http://localhost:5173,http://localhost:5174,http://localhost:3000')
    .split(',')
    .map(o => o.trim().replace(/\/$/, ''))
    .filter(Boolean);

  if (envOrigins.includes(normalizedOrigin)) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalizedOrigin)) return true;
  return false;
};

const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
          return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"), false);
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Listen for live interview responses
    socket.on("live_answer", async ({ questionText, answerText, expectedKeywords }) => {
      try {
        let systemPromptText = `Act as an AI interviewer. The candidate just responded to the following question. Provide a brief, conversational, and direct 1-3 sentence follow-up or acknowledgment based ONLY on their answer. Do not return JSON. Just speak as an interviewer naturally.`;
        try {
          const doc = await SystemPrompt.findOne({ category: 'interview' });
          if (doc) systemPromptText = doc.content;
        } catch (e) { /* ignore fallback */ }

        const prompt = `${systemPromptText}

Question: ${questionText}
Expected Keywords: ${expectedKeywords?.join(', ') || 'None'}
Candidate Answer: ${answerText || '(silence)'}`;

        const stream = await groq.chat.completions.create({
          model: DEFAULT_MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.5,
          max_tokens: 150,
          stream: true,
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            socket.emit("ai_chunk", content);
          }
        }
        
        // Let the client know the AI finished speaking
        socket.emit("ai_complete");
      } catch (error) {
        console.error("Socket Groq Error:", error);
        socket.emit("ai_error", "Failed to get AI response.");
      }
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });
};

module.exports = initSocket;
