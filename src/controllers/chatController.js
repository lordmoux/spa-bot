const openaiService = require('../services/openaiService');
const calendarService = require('../services/calendarService');
const appointmentRepository = require('../repositories/appointmentRepository');
const conversationRepository = require('../repositories/conversationRepository');

async function handleWhatsApp(req, res) {
  try {
    const msgObj = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const contactObj = req.body?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0];

    const from = msgObj?.from || contactObj?.wa_id;
    const text = msgObj?.text?.body;

    if (!from || !text) {
      return res.status(400).json({ error: 'message y from son requeridos' });
    }

    const history = conversationRepository.getHistory(from, 6);
    const reply = await openaiService.chat(text, history);

    conversationRepository.addMessage(from, 'user', text);
    conversationRepository.addMessage(from, 'assistant', reply);

    const scheduleMatch = reply.match(/\{"action":"schedule".*\}/);
    if (scheduleMatch) {
      try {
        const scheduleData = JSON.parse(scheduleMatch[0]);
        const serviceId = scheduleData.service_id;

        if (calendarService.isServiceValid(serviceId)) {
          const service = calendarService.getServiceById(serviceId);
          const hasConflict = appointmentRepository.findConflictingSlot(
            scheduleData.date,
            scheduleData.time,
            service.duration_minutes
          );

          if (!hasConflict) {
            appointmentRepository.create({
              client_name: scheduleData.client_name,
              client_phone: scheduleData.client_phone || from,
              service_id: service.id,
              service_name: service.name,
              appointment_date: scheduleData.date,
              appointment_time: scheduleData.time,
              duration_minutes: service.duration_minutes,
              notes: null,
              client_email: null,
            });
          }
        }
      } catch {
        // JSON parsing error - just ignore
      }
    }

    res.json({ reply });
  } catch (error) {
    console.error('Error en chat controller:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function demoChat(req, res) {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'message es requerido' });
    }

    const from = '+demo0000001';
    const history = conversationRepository.getHistory(from, 6);
    const reply = await openaiService.chat(message, history);

    conversationRepository.addMessage(from, 'user', message);
    conversationRepository.addMessage(from, 'assistant', reply);

    const scheduleMatch = reply.match(/\{"action":"schedule".*\}/);
    if (scheduleMatch) {
      try {
        const scheduleData = JSON.parse(scheduleMatch[0]);
        const serviceId = scheduleData.service_id;

        if (calendarService.isServiceValid(serviceId)) {
          const service = calendarService.getServiceById(serviceId);
          const hasConflict = appointmentRepository.findConflictingSlot(
            scheduleData.date,
            scheduleData.time,
            service.duration_minutes
          );

          if (!hasConflict) {
            appointmentRepository.create({
              client_name: scheduleData.client_name,
              client_phone: scheduleData.client_phone || from,
              service_id: service.id,
              service_name: service.name,
              appointment_date: scheduleData.date,
              appointment_time: scheduleData.time,
              duration_minutes: service.duration_minutes,
              notes: null,
              client_email: null,
            });
          }
        }
      } catch {
        // JSON parsing error - just ignore
      }
    }

    res.json({ reply });
  } catch (error) {
    console.error('Error en demo chat:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = { handleWhatsApp, demoChat };