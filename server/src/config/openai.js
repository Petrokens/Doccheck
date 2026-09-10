const OpenAI = require('openai');

let client = null;

function getOpenAIClient() {
  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) return null;
  if (!client) {
    client = new OpenAI({ apiKey, timeout: 300000, maxRetries: 1 });
  }
  return client;
}

function getOpenAIModel() {
  return String(process.env.OPENAI_MODEL || 'gpt-4o-mini').trim();
}

module.exports = { getOpenAIClient, getOpenAIModel };
