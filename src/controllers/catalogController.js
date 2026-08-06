const spaRepository = require('../repositories/spaRepository');

function list(req, res) {
  const spa = resolveSpa(req);
  if (!spa) {
    return res.status(404).json({ error: 'No hay spa configurado' });
  }
  const catalog = spaRepository.toCatalog(spa);
  res.json({
    spa_id: spa.id,
    count: catalog.length,
    services: catalog,
  });
}

function byId(req, res) {
  const spa = resolveSpa(req);
  if (!spa) {
    return res.status(404).json({ error: 'No hay spa configurado' });
  }
  const service = spaRepository.toCatalog(spa).find(s => s.id === req.params.id);
  if (!service) {
    return res.status(404).json({ error: 'Servicio no encontrado' });
  }
  res.json(service);
}

function resolveSpa(req) {
  const spaId = parseInt(req.query.spa_id, 10);
  if (spaId) {
    return spaRepository.findById(spaId);
  }
  return spaRepository.findFirstActive();
}

module.exports = { list, byId };
