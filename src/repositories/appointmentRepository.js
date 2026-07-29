const { getDatabase } = require('../config/database');

function create(data) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO appointments (client_name, client_phone, client_email, service_id, service_name, appointment_date, appointment_time, duration_minutes, notes)
    VALUES (@client_name, @client_phone, @client_email, @service_id, @service_name, @appointment_date, @appointment_time, @duration_minutes, @notes)
  `);
  const result = stmt.run(data);
  return result.lastInsertRowid;
}

function findByPhone(phone) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM appointments WHERE client_phone = ? ORDER BY appointment_date DESC, appointment_time DESC').all(phone);
}

function findByDate(date) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM appointments WHERE appointment_date = ? ORDER BY appointment_time').all(date);
}

function findById(id) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
}

function updateStatus(id, status) {
  const db = getDatabase();
  db.prepare("UPDATE appointments SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
}

function findConflictingSlot(date, time, durationMinutes) {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT appointment_time, duration_minutes FROM appointments
    WHERE appointment_date = ? AND status = 'confirmed'
    ORDER BY appointment_time
  `).all(date);

  const requestedStart = timeToMinutes(time);
  const requestedEnd = requestedStart + durationMinutes;

  for (const row of rows) {
    const existingStart = timeToMinutes(row.appointment_time);
    const existingEnd = existingStart + row.duration_minutes;

    if (requestedStart < existingEnd && requestedEnd > existingStart) {
      return true;
    }
  }
  return false;
}

function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function deleteOlderThan(days) {
  const db = getDatabase();
  const stmt = db.prepare("DELETE FROM appointments WHERE created_at < datetime('now', '-' || ? || ' days')");
  return stmt.run(days);
}

module.exports = { create, findByPhone, findByDate, findById, updateStatus, findConflictingSlot, deleteOlderThan };