const OpenAI = require('openai');

const { SYSTEM_PROMPT } = require('../config/prompts');

let client = null;

function getClient() {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.AI_API_KEY,
      baseURL: process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1',
      timeout: 10000,
      maxRetries: 1,
    });
  }
  return client;
}

async function chat(messages, history = []) {
  const openai = getClient();

  const systemMsg = { role: 'system', content: SYSTEM_PROMPT };
  const historyMsgs = history.map(h => ({ role: h.role, content: h.content }));
  const userMsg = { role: 'user', content: messages };

  const allMessages = [systemMsg, ...historyMsgs, userMsg];

  try {
    const response = await openai.chat.completions.create({
      model: process.env.AI_MODEL || 'llama-3.1-8b-instant',
      messages: allMessages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const reply = response.choices[0].message.content;
    return reply;
  } catch (error) {
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED' || error.status === 408) {
      return 'Lo siento, el servicio está tardando más de lo normal. Por favor intenta de nuevo en unos segundos. 🙏';
    }
    if (error.status === 429) {
      return 'Hay muchas solicitudes en este momento. Por favor espera un momento y vuelve a intentar. ⏳';
    }
    if (error.status === 401 || error.status === 403) {
      console.error('Error de autenticación con el proveedor de IA');
      return 'Ocurrió un error inesperado. Por favor intenta de nuevo más tarde. 😅';
    }
    console.error('Error del proveedor de IA:', error.message);
    return 'Ocurrió un error inesperado. Por favor intenta de nuevo más tarde. 😅';
  }
}

module.exports = { chat };