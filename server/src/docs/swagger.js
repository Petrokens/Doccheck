const path = require('path');
const express = require('express');
const swaggerUiDist = require('swagger-ui-dist');
const { buildOpenApiSpec } = require('./openapi');
const { isProduction } = require('../security/httpErrors');

function swaggerEnabled() {
  const flag = String(process.env.ENABLE_SWAGGER || '').toLowerCase();
  if (flag === 'true' || flag === '1') return true;
  if (flag === 'false' || flag === '0') return false;
  return !isProduction();
}

function publicOrigin(req) {
  const forwarded = String(req.get('x-forwarded-proto') || '').split(',')[0].trim();
  const proto = forwarded || req.protocol || 'http';
  return `${proto}://${req.get('host')}`;
}

function mountSwagger(app) {
  if (!swaggerEnabled()) {
    console.log('Swagger UI disabled (set ENABLE_SWAGGER=true to expose /api/docs)');
    return;
  }

  const assets = swaggerUiDist.getAbsoluteFSPath();
  const docs = express.Router();

  docs.get('/docs.json', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json(buildOpenApiSpec({ serverUrl: publicOrigin(req) }));
  });

  docs.get('/docs', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'swagger-ui.html'));
  });
  docs.get('/docs/', (_req, res) => {
    res.redirect(302, '/api/docs');
  });

  docs.use('/docs', express.static(assets, { index: false, maxAge: '1d' }));
  app.use('/api', docs);
  console.log('Swagger UI available at /api/docs');
}

module.exports = { mountSwagger, swaggerEnabled };
