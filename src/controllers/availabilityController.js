const calendarService = require('../services/calendarService');

function availability(req, res) {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ error: 'El parámetro "date" es requerido (formato YYYY-MM-DD)' });
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return res.status(400).json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD' });
  }

  const slots = calendarService.getAvailableSlots(date);

  res.json({
    date,
    slots,
    count: slots.length,
  });
}

module.exports = { availability };