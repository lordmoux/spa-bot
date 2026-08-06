const https = require('https');

const DEFAULT_VERSION = process.env.WHATSAPP_API_VERSION || 'v20.0';
const GRAPH_HOST = 'graph.facebook.com';

function sendTextMessage(spa, to, text) {
  if (!spa.phone_number_id || !spa.whatsapp_token) {
    console.warn(`[whatsapp] spa ${spa.id} sin phone_number_id/whatsapp_token configurados`);
    return Promise.resolve({ skipped: true });
  }

  const payload = JSON.stringify({
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text },
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: GRAPH_HOST,
      path: `/${DEFAULT_VERSION}/${spa.phone_number_id}/messages`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${spa.whatsapp_token}`,
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ ok: true });
        } else {
          console.error(`[whatsapp] error ${res.statusCode}: ${body}`);
          resolve({ ok: false, statusCode: res.statusCode, body });
        }
      });
    });

    req.on('error', (err) => {
      console.error('[whatsapp] error de red:', err.message);
      reject(err);
    });

    req.setTimeout(10000, () => {
      req.destroy(new Error('timeout enviando mensaje de WhatsApp'));
    });

    req.write(payload);
    req.end();
  });
}

module.exports = { sendTextMessage };
