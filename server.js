const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// Shared Tree: Adam's geometry, Seraph's proposed local world names.
const MATRIX = JSON.parse(fs.readFileSync(path.join(PUBLIC_DIR,'matrix','tree.json'),'utf8'));
const MATRIX_STATIONS = new Map(MATRIX.stations.map(station => [station.id, station]));
const MATRIX_PATHS = new Map(MATRIX.paths.map(edge => [String(edge.n), edge]));
const MATRIX_ROOM_TEMPLATE = fs.readFileSync(path.join(__dirname,'templates','matrix-room.html'),'utf8');
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
}[char]));
function matrixRoom(values) {
  return MATRIX_ROOM_TEMPLATE.replace(/\{\{([A-Z]+)\}\}/g, (_,key)=>escapeHtml(values[key]??''));
}

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

// Unlinked structural pages. They remain accessible by direct URL but are
// explicitly excluded from search. No route creates travel or game state.
app.get('/matrix/stations/:id', (req,res,next)=>{
  const station=MATRIX_STATIONS.get(req.params.id);
  if(!station)return next();
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.type('html').send(matrixRoom({
    EYEBROW:station.sefirah.toUpperCase()+' · STATION '+station.n,
    NUMBER:String(station.n).padStart(2,'0'),
    TITLE:station.title,
    SUBTITLE:'Proposed world · House of Living Iron',
    COPY:station.summary
  }));
});
app.get('/matrix/paths/:number', (req,res,next)=>{
  const edge=MATRIX_PATHS.get(req.params.number);
  if(!edge)return next();
  const from=MATRIX_STATIONS.get(edge.from),to=MATRIX_STATIONS.get(edge.to);
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.type('html').send(matrixRoom({
    EYEBROW:'PATH '+edge.n+' · UNWRITTEN CROSSING',
    NUMBER:String(edge.n),
    TITLE:'Path '+edge.n,
    SUBTITLE:'Connecting '+from.title+' and '+to.title,
    COPY:'One of the twenty-two shared Tree connections. The meaning and conditions of this road are still being written.'
  }));
});

app.use(express.static(PUBLIC_DIR));

// Anything not served above (any method) gets the House's 404 page.
app.use((req, res) => {
  res.status(404).type('html').send(NOT_FOUND_PAGE);
});

module.exports = app;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`The House of the Living Machine is open on port ${PORT}`);
  });
}
