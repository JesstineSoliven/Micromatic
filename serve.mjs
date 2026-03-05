import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;
const ROOT = __dirname;

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // STARTTLS on port 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Escape HTML to prevent injection in email body
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const MIME = {
  '.html':  'text/html',
  '.css':   'text/css',
  '.js':    'application/javascript',
  '.mjs':   'application/javascript',
  '.json':  'application/json',
  '.png':   'image/png',
  '.jpg':   'image/jpeg',
  '.jpeg':  'image/jpeg',
  '.svg':   'image/svg+xml',
  '.ico':   'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff':  'font/woff',
};

http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

  // ── POST /api/contact ──────────────────────────────────────
  if (req.method === 'POST' && urlPath === '/api/contact') {
    const MAX = 10_000;
    let body = '', size = 0;

    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX) { req.destroy(); return; }
      body += chunk;
    });

    req.on('end', () => {
      (async () => {
        try {
          const { from_name, from_email, company, service, message } =
            JSON.parse(body);

          if (!from_name || !from_email || !message ||
              !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from_email)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ ok: false, error: 'invalid input' }));
          }

          const to = process.env.SMTP_TO || process.env.SMTP_USER;

          await Promise.all([
            // Notification to owner
            transporter.sendMail({
              from:    `"MicroMatic Contact" <${process.env.SMTP_USER}>`,
              to,
              replyTo: from_email,
              subject: `New Enquiry from ${esc(from_name)} — MicroMatic`,
              html: `
                <h2 style="color:#5B57E7">New Contact Form Submission</h2>
                <p><strong>Name:</strong> ${esc(from_name)}</p>
                <p><strong>Email:</strong> ${esc(from_email)}</p>
                <p><strong>Company:</strong> ${esc(company) || '—'}</p>
                <p><strong>Service:</strong> ${esc(service) || '—'}</p>
                <p><strong>Message:</strong></p>
                <p style="white-space:pre-line">${esc(message)}</p>
              `,
            }),
            // Auto-reply to submitter
            transporter.sendMail({
              from:    `"MicroMatic" <${process.env.SMTP_USER}>`,
              to:      from_email,
              subject: 'Thanks for reaching out — MicroMatic',
              html: `
                <p>Hi ${esc(from_name)},</p>
                <p>Thank you for getting in touch with <strong>MicroMatic</strong>!
                We've received your enquiry and will get back to you within
                <strong>24 hours</strong>.</p>
                <p>Best regards,<br>The MicroMatic Team</p>
              `,
            }),
          ]);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        } catch (err) {
          console.error('SMTP error:', err.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false }));
        }
      })();
    });
    return;
  }

  // ── Static file serving ────────────────────────────────────
  const staticPath = urlPath === '/' ? '/index.html' : urlPath;
  const filePath = path.join(ROOT, staticPath);
  const ext = path.extname(filePath);
  const mime = MIME[ext] || 'text/plain';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`MicroMatic server running at http://localhost:${PORT}`);
});
