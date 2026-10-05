const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const CANONICAL_ORIGIN = 'https://seraphnganga.com';
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

app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);

  const host = (req.get('host') || '').toLowerCase();

  if (host.endsWith('.up.railway.app')) {
    return res.redirect(301, `${CANONICAL_ORIGIN}${req.originalUrl}`);
  }

  next();
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(PORT, () => {
  console.log(`The House of the Living Machine is open on port ${PORT}`);
});
