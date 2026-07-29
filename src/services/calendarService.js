const appointmentRepository = require('../repositories/appointmentRepository');
const catalog = require('../data/catalog.json');

const WORK_START = parseInt(process.env.WORK_START_HOUR, 10) || 9;
const WORK_END = parseInt(process.env.WORK_END_HOUR, 10) || 18;

function getServiceById(serviceId) {
  return catalog.find(s => s.id === serviceId);
}

function generateSlots(date) {
  const existing = appointmentRepository.findByDate(date);
  const slots = [];

  for (let hour = WORK_START; hour < WORK_END; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      if (!isSlotInPast(date, time)) {
        slots.push({ time, available: true });
      }
    }
  }

  for (const apt of existing) {
    if (apt.status === 'confirmed') {
      const startMin = timeToMinutes(apt.appointment_time);
      const endMin = startMin + apt.duration_minutes;
      for (const slot of slots) {
        const slotMin = timeToMinutes(slot.time);
        if (slotMin >= startMin && slotMin < endMin) {
          slot.available = false;
        }
      }
    }
  }

  return slots;
}

function getAvailableSlots(date) {
  const slots = generateSlots(date);
  return slots.filter(s => s.available).map(s => s.time);
}

function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function isSlotInPast(date, time) {
  const now = new Date();
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const slotDate = new Date(year, month - 1, day, hour, minute);
  return slotDate < now;
}

function isServiceValid(serviceId) {
  return catalog.some(s => s.id === serviceId);
}

function isWithinBusinessHours(time) {
  const mins = timeToMinutes(time);
  return mins >= WORK_START * 60 && mins <= WORK_END * 60;
}

module.exports = { getServiceById, generateSlots, getAvailableSlots, isSlotInPast, isServiceValid, isWithinBusinessHours };