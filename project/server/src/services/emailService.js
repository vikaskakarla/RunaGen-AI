import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail', // e.g., 'gmail'
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Default sender if strict SMTP not configured
const NOREPLY_EMAIL = 'noreply@runagen.ai';

export const sendOTP = async (email, otp) => {
    // Check if we have valid credentials for real sending
    const hasCredentials = process.env.EMAIL_USER && process.env.EMAIL_PASS;

    // Premium HTML Template
    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
          .header { background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); padding: 32px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; opacity: 0.95; letter-spacing: 1px; }
          .content { padding: 40px 32px; color: #374151; }
          .greeting { font-size: 18px; margin-bottom: 24px; color: #111827; }
          .message { line-height: 1.6; margin-bottom: 32px; }
          .otp-box { background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px; }
          .otp-code { font-family: 'Monaco', 'Menlo', monospace; font-size: 36px; font-weight: 700; color: #0891b2; letter-spacing: 8px; }
          .expiry { font-size: 14px; color: #64748b; margin-top: 12px; }
          .footer { background-color: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>RunaGen AI</h1>
          </div>
          <div class="content">
            <p class="greeting">Hello,</p>
            <p class="message">
              We received a request to reset the password for your account associated with <strong>${email}</strong>.
              Please enter the code below to verify your identity.
            </p>
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
              <div class="expiry">Expires in 10 minutes</div>
            </div>
            <p class="message" style="margin-bottom: 0;">
              If you didn't request this, you can safely ignore this email. Your Account remains secure.
            </p>
          </div>
          <div class="footer">
            <p>Sent from ${NOREPLY_EMAIL}</p>
            <p>&copy; ${new Date().getFullYear()} RunaGen AI. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // DEV/SIMULATION MODE: If no credentials, just log deeply formatted output
    if (!hasCredentials) {
        console.log('\n');
        console.log('\x1b[36m%s\x1b[0m', '┌──────────────────────────────────────────────────────────────┐');
        console.log('\x1b[36m%s\x1b[0m', '│                 RUNAGEN AI - NOREPLY SIMULATION              │');
        console.log('\x1b[36m%s\x1b[0m', '├──────────────────────────────────────────────────────────────┤');
        console.log(`│ From:    ${NOREPLY_EMAIL}                         `);
        console.log(`│ To:      ${email}`);
        console.log(`│ Subject: Your Password Reset OTP - RunaGen AI                 `);
        console.log('\x1b[36m%s\x1b[0m', '├──────────────────────────────────────────────────────────────┤');
        console.log(`│                                                              `);
        console.log(`│   Your Verification Code is:                                 `);
        console.log(`│                                                              `);
        console.log('\x1b[1m\x1b[32m%s\x1b[0m', `│   ${otp}                                                     `);
        console.log(`│                                                              `);
        console.log(`│   (Expires in 10 minutes)                                    `);
        console.log(`│                                                              `);
        console.log('\x1b[36m%s\x1b[0m', '└──────────────────────────────────────────────────────────────┘');
        console.log('\n');
        return true;
    }

    const mailOptions = {
        from: `RunaGen AI <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your Password Reset OTP - RunaGen AI',
        html: htmlTemplate,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};
