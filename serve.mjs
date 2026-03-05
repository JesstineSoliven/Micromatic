import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;
const ROOT = __dirname;

// EmailJS credentials injected from environment variables.
// Run with: node --env-file=.env serve.mjs  (or: npm start)
const ENV = {
  EMAILJS_PUBLIC_KEY:               process.env.EMAILJS_PUBLIC_KEY               || '',
  EMAILJS_SERVICE_ID:               process.env.EMAILJS_SERVICE_ID               || '',
  EMAILJS_NOTIFICATION_TEMPLATE_ID: process.env.EMAILJS_NOTIFICATION_TEMPLATE_ID || '',
  EMAILJS_AUTOREPLY_TEMPLATE_ID:    process.env.EMAILJS_AUTOREPLY_TEMPLATE_ID    || '',
};

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(ROOT, urlPath);
  const ext = path.extname(filePath);
  const mime = MIME[ext] || 'text/plain';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime });
    if (ext === '.html') {
      const html = data.toString('utf8')
        .replace(/%%EMAILJS_PUBLIC_KEY%%/g,               ENV.EMAILJS_PUBLIC_KEY)
        .replace(/%%EMAILJS_SERVICE_ID%%/g,               ENV.EMAILJS_SERVICE_ID)
        .replace(/%%EMAILJS_NOTIFICATION_TEMPLATE_ID%%/g, ENV.EMAILJS_NOTIFICATION_TEMPLATE_ID)
        .replace(/%%EMAILJS_AUTOREPLY_TEMPLATE_ID%%/g,    ENV.EMAILJS_AUTOREPLY_TEMPLATE_ID);
      res.end(html);
    } else {
      res.end(data);
    }
  });
}).listen(PORT, () => {
  console.log(`MicroMatic server running at http://localhost:${PORT}`);
});
