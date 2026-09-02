const Groq = require('groq-sdk');
require('dotenv').config();

if (!process.env.GROQ_API_KEY) {
  console.warn('[GROQ] Warning: GROQ_API_KEY is missing from environment variables.');
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const DEFAULT_MODEL = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';

module.exports = groq;
module.exports.DEFAULT_MODEL = DEFAULT_MODEL;
