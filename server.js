const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
// Fixed origin for the Railway-host redirect. Only the path and query of the
// incoming request are carried over, so a crafted URL can never point off-site.
const CANONICAL_ROOT = 'https://seraphnganga.com/';
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self'",
  "frame-src 'none'",
  'upgrade-insecure-requests',
].join('; ');
// Read once at startup so a 404 never touches the disk.
const NOT_FOUND_PAGE = fs.readFileSync(path.join(PUBLIC_DIR, '404.html'));

function canonicalUrl(req) {
  const incoming = new URL(req.originalUrl, 'http://localhost');
  const target = new URL(CANONICAL_ROOT);
  target.pathname = incoming.pathname;
  target.search = incoming.search;
  return target.href;
}

app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  res.setHeader('X-Frame-Options', 'DENY');

  const host = (req.hostname || '').toLowerCase();

  if (host === 'www.seraphnganga.com' || host.endsWith('.up.railway.app')) {
    return res.redirect(301, canonicalUrl(req));
  }

  next();
});

app.use(express.static(PUBLIC_DIR));

// Anything not served above (any method) gets the House's 404 page.
app.use((req, res) => {
  res.status(404).type('html').send(NOT_FOUND_PAGE);
});

app.listen(PORT, () => {
  console.log(`The House of the Living Machine is open on port ${PORT}`);
});
