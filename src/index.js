require('dotenv').config();

const express = require('express');
const cors = require('cors');

const healthController = require('./controllers/healthController');
const catalogController = require('./controllers/catalogController');
const availabilityController = require('./controllers/availabilityController');
const chatController = require('./controllers/chatController');

const { getDatabase, closeDatabase } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

getDatabase();

app.get('/health', healthController.health);
app.get('/webhook-info', healthController.webhookInfo);

app.get('/catalog', catalogController.list);
app.get('/catalog/:id', catalogController.byId);

app.get('/availability', availabilityController.availability);

app.post('/demo/chat', chatController.demoChat);
app.get('/demo', (req, res) => {
  res.sendFile('demo.html', { root: 'public' });
});

app.post('/webhook/whatsapp', chatController.handleWhatsApp);
app.get('/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('Webhook WhatsApp verificado');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
});

function gracefulShutdown() {
  console.log('\nCerrando SpaBot...');
  closeDatabase();
  process.exit(0);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

app.listen(PORT, () => {
  console.log(`🧖‍♀️ SpaBot corriendo en puerto ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
});

module.exports = app;
