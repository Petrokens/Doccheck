const MODEL_PRICES_PER_MILLION = {
  'gpt-5.4': { input: 1.25, output: 10 },
  'gpt-5': { input: 1.25, output: 10 },
  'gpt-4.1': { input: 2, output: 8 },
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
  'llama-3.1-70b-versatile': { input: 0.59, output: 0.79 },
};

function extractUsage(response) {
  const usage = response?.usage || {};
  const prompt_tokens = Math.max(0, Number(usage.input_tokens ?? usage.prompt_tokens ?? 0) || 0);
  const completion_tokens = Math.max(0, Number(usage.output_tokens ?? usage.completion_tokens ?? 0) || 0);
  const total_tokens = Math.max(
    0,
    Number(usage.total_tokens ?? prompt_tokens + completion_tokens) || 0,
  );
  return { prompt_tokens, completion_tokens, total_tokens };
}

function pricesForModel(model) {
  const envIn = Number(process.env.TOKEN_INPUT_USD_PER_MILLION);
  const envOut = Number(process.env.TOKEN_OUTPUT_USD_PER_MILLION);
  if (envIn > 0 && envOut > 0) return { input: envIn, output: envOut };
  const key = String(model || '').trim().toLowerCase();
  if (MODEL_PRICES_PER_MILLION[key]) return MODEL_PRICES_PER_MILLION[key];
  const match = Object.keys(MODEL_PRICES_PER_MILLION).find((name) => key.includes(name));
  return MODEL_PRICES_PER_MILLION[match] || { input: 2.5, output: 10 };
}

function costUsd({ prompt_tokens = 0, completion_tokens = 0 }, model) {
  const prices = pricesForModel(model);
  const cost = (Number(prompt_tokens) / 1e6) * prices.input
    + (Number(completion_tokens) / 1e6) * prices.output;
  return Math.round(cost * 1e6) / 1e6;
}

function emptyUsage(provider = '', model = '') {
  return {
    provider,
    model,
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
    token_cost_usd: 0,
  };
}

function usageFromResponse(response, { provider, model }) {
  const tokens = extractUsage(response);
  return {
    provider: provider || '',
    model: model || '',
    ...tokens,
    token_cost_usd: costUsd(tokens, model),
  };
}

function countDocuments(mainName, supportName) {
  const split = (value) => String(value || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);
  return Math.max(split(mainName).length + split(supportName).length, mainName ? 1 : 0);
}

module.exports = {
  extractUsage,
  pricesForModel,
  costUsd,
  emptyUsage,
  usageFromResponse,
  countDocuments,
};
