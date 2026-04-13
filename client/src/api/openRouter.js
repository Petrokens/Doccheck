// NVIDIA NIM API integration (OpenAI-compatible)

const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

const CHEAP_MODELS = {
  nvidia: [
    'meta/llama-3.1-8b-instruct',
    'meta/llama-3.1-70b-instruct',
    'nvidia/llama-3.1-nemotron-70b-instruct'
  ]
};

const DEFAULT_MODEL = 'meta/llama-3.1-8b-instruct';
const DEFAULT_MAX_TOKENS = 2000;

/**
 * Call NVIDIA API for AI QC analysis
 */
export async function callOpenRouterAPI(prompt, fileContent = '', apiKey, options = {}) {
  if (!apiKey) {
    throw new Error('API key is required. Please set it in .env file or settings.');
  }

  const model = options.model || DEFAULT_MODEL;
  const maxTokens = options.maxTokens || DEFAULT_MAX_TOKENS;
  // Support chunked content for large documents
  // If fileContent is an array, it's chunks; otherwise use full content
  let contentToSend = '';
  
  if (Array.isArray(fileContent)) {
    // Multiple chunks - combine intelligently
    contentToSend = fileContent.join('\n\n--- Next Section ---\n\n');
  } else if (fileContent) {
    // Single content or full document
    // Use larger limit for better analysis (100K chars)
    const contentLimit = options.contentLimit || 100000;
    contentToSend = fileContent.length > contentLimit 
      ? fileContent.substring(0, contentLimit) + '\n\n[Note: Content truncated to first ' + contentLimit + ' characters]'
      : fileContent;
  }

  // Build messages array - support conversation history for chat
  const messages = [];
  
  // Add system prompt (use provided or default)
  const systemPrompt = options.systemPrompt || 
    'You are an expert QA/QC Engineer with 40+ years of experience in EPC projects. Provide detailed, structured QA/QC analysis in the requested format. Be concise but thorough.';
  
  messages.push({
    role: 'system',
    content: systemPrompt
  });
  
  // Add conversation history if provided (for chat)
  if (options.conversationHistory && Array.isArray(options.conversationHistory)) {
    messages.push(...options.conversationHistory);
  }
  
  // Add current user message
  const userMessage = contentToSend
    ? `${prompt}\n\nDocument Content:\n${contentToSend}`
    : prompt;
  
  messages.push({
    role: 'user',
    content: userMessage
  });

  try {
    const response = await fetch(NVIDIA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.3,
        max_tokens: maxTokens
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `API request failed with status ${response.status}`;
      
      // Handle authentication errors
      if (
        errorMessage.includes('API key not valid') ||
        errorMessage.includes('invalid api key') ||
        errorMessage.includes('Unauthorized') ||
        response.status === 401 ||
        response.status === 403
      ) {
        throw new Error(
          `API Key Authentication Failed.\n\n` +
          `The NVIDIA API key is invalid or expired.\n\n` +
          `Solutions:\n` +
          `1. Check your API key in API Settings (⚙️ button)\n` +
          `2. Get a new API key from: https://build.nvidia.com/\n` +
          `3. Clear localStorage and use a fresh key\n` +
          `4. Ensure your key starts with "nvapi-"`
        );
      }
      
      // Handle model not found errors
      if (
        errorMessage.includes('model not found') ||
        errorMessage.includes('not available') ||
        response.status === 404
      ) {
        throw new Error(
          `Model "${model}" not available.\n\n` +
          `Please try one of these NVIDIA models:\n` +
          `- ${CHEAP_MODELS.nvidia[0]}\n` +
          `- ${CHEAP_MODELS.nvidia[1]}\n` +
          `- ${CHEAP_MODELS.nvidia[2]}`
        );
      }
      
      // Handle credit/token limit errors
      if (errorMessage.includes('credits') || errorMessage.includes('tokens')) {
        throw new Error(
          `Insufficient credits. ${errorMessage}\n\n` +
          `Solutions:\n` +
          `1. Reduce max_tokens (currently ${maxTokens})\n` +
          `2. Use a lighter model: ${CHEAP_MODELS.nvidia[0]}\n` +
          `3. Reduce prompt/document size`
        );
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || '';
    
    if (!content) {
      throw new Error('Invalid API response format - no content received');
    }

    return content;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

/**
 * Get API key from environment or localStorage
 */
export function getAPIKey() {
  // First try environment variable (set in .env file)
  const envKey = import.meta.env.VITE_NVIDIA_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_OPENROUTER_API_KEY;
  if (envKey) return envKey;

  // Fallback to localStorage (supports legacy key name)
  const storedKey = localStorage.getItem('nvidia_api_key') || localStorage.getItem('gemini_api_key') || localStorage.getItem('openrouter_api_key');
  if (storedKey) return storedKey;
  return '';
}

/**
 * Save API key to localStorage
 */
export function saveAPIKey(apiKey) {
  localStorage.setItem('nvidia_api_key', apiKey);
}

/**
 * Get available cheap/free models
 */
export function getCheapModels(provider = 'nvidia') {
  return CHEAP_MODELS[provider] || CHEAP_MODELS.nvidia;
}

/**
 * Detect API provider from key format
 */
export function detectProvider(apiKey) {
  if (!apiKey) return 'nvidia';
  return 'nvidia';
}

/**
 * Test API key by making a simple request
 * Returns { valid: boolean, message: string, provider: string }
 */
export async function testAPIKey(apiKey) {
  if (!apiKey) {
    return {
      valid: false,
      message: 'No API key provided',
      provider: null
    };
  }

  const provider = 'nvidia';
  
  try {
    // Make a minimal test request
    const testPrompt = 'Say "OK" if you can read this.';
    const response = await callOpenRouterAPI(
      testPrompt,
      '',
      apiKey,
      {
        model: DEFAULT_MODEL,
        maxTokens: 10,
        provider: provider
      }
    );

    return {
      valid: true,
      message: `✅ API key is valid! (${provider.toUpperCase()})`,
      provider: provider,
      testResponse: response
    };
  } catch (error) {
    let message = error.message;
    
    // Provide specific guidance based on error
    if (error.message.includes('API Key Authentication Failed') ||
        error.message.includes('User not found') ||
        error.message.includes('Invalid API key') ||
        error.message.includes('Unauthorized')) {
      message = `❌ API key is invalid or expired.\n\n${error.message}`;
    } else if (error.message.includes('credits') || error.message.includes('tokens')) {
      message = `⚠️ API key is valid but has insufficient credits.\n\n${error.message}`;
    } else {
      message = `❌ API key test failed: ${error.message}`;
    }

    return {
      valid: false,
      message: message,
      provider: provider,
      error: error.message
    };
  }
}

