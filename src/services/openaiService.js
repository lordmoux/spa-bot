const OpenAI = require('openai');

const { buildSystemPrompt } = require('../config/prompts');

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

function toUserFacingMessage(error) {
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

async function chat(spa, messages, history = []) {
  const openai = getClient();

  const systemMsg = { role: 'system', content: buildSystemPrompt(spa) };
  const historyMsgs = history.map(h => ({ role: h.role, content: h.content }));
  const userMsg = { role: 'user', content: messages };

  const allMessages = [systemMsg, ...historyMsgs, userMsg];

  for (let attempt = 0; attempt < 2; attempt++) {
    let response;
    try {
      response = await openai.chat.completions.create({
        model: process.env.AI_MODEL || 'llama-3.1-8b-instant',
        messages: allMessages,
        temperature: attempt === 0 ? 0.7 : 0.2,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });
    } catch (error) {
      return { reply: toUserFacingMessage(error), schedule: null };
    }

    const content = response.choices[0].message.content;
    const parsed = parseStructuredReply(content);
    if (parsed.wasJson) {
      return parsed;
    }

    if (attempt === 0) {
      console.warn('Respuesta del modelo no fue JSON válido, reintentando con temperatura baja');
    }
  }

  return { reply: 'Lo siento, tuve un problema procesando la respuesta. ¿Podrías repetirlo, por favor? 🙏', schedule: null };
}

function parseStructuredReply(content) {
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        return { reply: content.trim(), schedule: null, wasJson: false };
      }
    } else {
      return { reply: content.trim(), schedule: null, wasJson: false };
    }
  }

  const reply = typeof parsed.reply === 'string' ? parsed.reply : content.trim();
  const schedule = isValidSchedule(parsed.schedule) ? parsed.schedule : null;
  return { reply, schedule, wasJson: true };
}

function isValidSchedule(schedule) {
  if (!schedule || typeof schedule !== 'object') return false;
  return (
    typeof schedule.service_id === 'string' &&
    isDateLike(schedule.date) &&
    /^\d{2}:\d{2}$/.test(schedule.time) &&
    typeof schedule.client_name === 'string'
  );
}

function isDateLike(date) {
  if (typeof date !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(date) || /^\d{2}\/\d{2}\/\d{4}$/.test(date);
}

module.exports = { chat };
