const catalog = require('../data/catalog.json');

function list(req, res) {
  res.json({
    count: catalog.length,
    services: catalog,
  });
}

function byId(req, res) {
  const service = catalog.find(s => s.id === req.params.id);
  if (!service) {
    return res.status(404).json({ error: 'Servicio no encontrado' });
  }
  res.json(service);
}

module.exports = { list, byId };