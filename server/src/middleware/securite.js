// Durcissement (threat model : exposition internet 12/16)
//  * en-têtes de sécurité HTTP (dont une CSP stricte)
const { HttpError } = require('../utils/http');

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'", // Leaflet pose des styles en ligne
  "img-src 'self' data: https://tile.openstreetmap.org https://*.tile.openstreetmap.org",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ');

function entetesSecurite(req, res, next) {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  next();
}

function limiteDebit({ fenetreMs, max }) {
  const appels = new Map(); 

  setInterval(() => {
    const limite = Date.now() - fenetreMs;
    for (const [ip, liste] of appels) {
      const recents = liste.filter(t => t > limite);
      if (recents.length === 0) appels.delete(ip);
      else appels.set(ip, recents);
    }
  }, fenetreMs).unref();

  return (req, res, next) => {
    const maintenant = Date.now();
    const recents = (appels.get(req.ip) || []).filter(t => t > maintenant - fenetreMs);

    if (recents.length >= max) {
      res.setHeader('Retry-After', Math.ceil(fenetreMs / 1000));
      return next(new HttpError(429, 'Trop de requêtes, réessayez dans un instant.'));
    }
    recents.push(maintenant);
    appels.set(req.ip, recents);
    next();
  };
}

module.exports = { entetesSecurite, limiteDebit };
