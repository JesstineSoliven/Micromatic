import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method not allowed' });
  }

  const { from_name, from_email, company, service, message } = req.body;

  if (!from_name || !from_email || !message ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from_email)) {
    return res.status(400).json({ ok: false, error: 'invalid input' });
  }

  const to = process.env.SMTP_TO || process.env.SMTP_USER;

  try {
    await Promise.all([
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

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('SMTP error:', err.message);
    res.status(500).json({ ok: false });
  }
}
