const OpenAI = require('openai');

let client = null;

function getGroqClient() {
  const apiKey = String(process.env.GROQ_API_KEY || '').trim();
  if (!apiKey) return null;
  if (!client) {
    client = new OpenAI({
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
      timeout: 180000,
      maxRetries: 1,
    });
  }
  return client;
}

function getGroqModel() {
  return String(process.env.GROQ_MODEL || 'llama-3.3-70b-versatile').trim();
}

module.exports = { getGroqClient, getGroqModel };
