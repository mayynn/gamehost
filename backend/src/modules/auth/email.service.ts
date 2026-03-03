import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private transporter: nodemailer.Transporter | null = null;
    private smtpConfigured = false;

    constructor(private config: ConfigService) {
        const smtpHost = this.config.get('SMTP_HOST', '');
        const smtpUser = this.config.get('SMTP_USER', '');

        if (smtpHost && smtpUser) {
            this.transporter = nodemailer.createTransport({
                host: smtpHost,
                port: parseInt(this.config.get('SMTP_PORT', '587')),
                secure: this.config.get('SMTP_SECURE', 'false') === 'true',
                auth: {
                    user: smtpUser,
                    pass: this.config.get('SMTP_PASS', ''),
                },
            });
            this.smtpConfigured = true;
            this.logger.log(`SMTP configured: ${smtpHost}`);
        } else {
            this.logger.warn('SMTP not configured — emails will be logged to console only');
        }
    }

    async sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
        const appUrl = this.config.get('APP_URL', 'http://localhost:3000');
        const appName = this.config.get('APP_NAME', 'GameHost');
        const verifyUrl = `${appUrl}/verify-email?token=${token}`;

        if (!this.smtpConfigured || !this.transporter) {
            this.logger.warn(`[DEV] Verification email for ${to}: ${verifyUrl}`);
            return;
        }

        try {
            await this.transporter.sendMail({
                from: `"${appName}" <${this.config.get('SMTP_FROM', this.config.get('SMTP_USER', 'noreply@gamehost.com'))}>`,
                to,
                subject: `Verify your ${appName} account`,
                html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0e17;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:linear-gradient(135deg,#111827 0%,#1a1f2e 100%);border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
    <div style="padding:32px 40px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);">
      <h1 style="margin:0;font-size:24px;font-weight:700;color:#00d4ff;">⚡ ${appName}</h1>
    </div>
    <div style="padding:40px;">
      <h2 style="color:#ffffff;font-size:20px;margin:0 0 8px;">Hey ${name}! 👋</h2>
      <p style="color:#9ca3af;font-size:15px;line-height:1.6;margin:0 0 28px;">
        Welcome to ${appName}! Please verify your email address to activate your account and start deploying game servers.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${verifyUrl}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#00d4ff,#3b82f6);color:#ffffff;font-weight:600;font-size:15px;border-radius:12px;text-decoration:none;">
          Verify Email Address
        </a>
      </div>
      <p style="color:#6b7280;font-size:13px;line-height:1.5;margin:0;">
        This link expires in 24 hours. If you didn't create an account, ignore this email.
      </p>
      <div style="margin-top:24px;padding:16px;background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid rgba(255,255,255,0.05);">
        <p style="color:#6b7280;font-size:12px;margin:0;">Or copy this link:</p>
        <p style="color:#00d4ff;font-size:12px;word-break:break-all;margin:4px 0 0;">${verifyUrl}</p>
      </div>
    </div>
  </div>
</body>
</html>`,
            });
            this.logger.log(`Verification email sent to ${to}`);
        } catch (error) {
            this.logger.error(`Failed to send verification email to ${to}: ${error.message}`);
            // Don't throw — email failure shouldn't block user operations
        }
    }

    async sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
        const appUrl = this.config.get('APP_URL', 'http://localhost:3000');
        const appName = this.config.get('APP_NAME', 'GameHost');
        const resetUrl = `${appUrl}/reset-password?token=${token}`;

        if (!this.smtpConfigured || !this.transporter) {
            this.logger.warn(`[DEV] Password reset email for ${to}: ${resetUrl}`);
            return;
        }

        try {
            await this.transporter.sendMail({
                from: `"${appName}" <${this.config.get('SMTP_FROM', this.config.get('SMTP_USER', 'noreply@gamehost.com'))}>`,
                to,
                subject: `Reset your ${appName} password`,
                html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0e17;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:linear-gradient(135deg,#111827 0%,#1a1f2e 100%);border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
    <div style="padding:32px 40px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);">
      <h1 style="margin:0;font-size:24px;font-weight:700;color:#00d4ff;">⚡ ${appName}</h1>
    </div>
    <div style="padding:40px;">
      <h2 style="color:#ffffff;font-size:20px;margin:0 0 8px;">Password Reset</h2>
      <p style="color:#9ca3af;font-size:15px;line-height:1.6;margin:0 0 28px;">
        Hi ${name}, we received a request to reset your password. Click the button below to choose a new one.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${resetUrl}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#ffffff;font-weight:600;font-size:15px;border-radius:12px;text-decoration:none;">
          Reset Password
        </a>
      </div>
      <p style="color:#6b7280;font-size:13px;line-height:1.5;margin:0;">
        This link expires in 1 hour. If you didn't request a reset, ignore this email — your password remains unchanged.
      </p>
      <div style="margin-top:24px;padding:16px;background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid rgba(255,255,255,0.05);">
        <p style="color:#6b7280;font-size:12px;margin:0;">Or copy this link:</p>
        <p style="color:#7c3aed;font-size:12px;word-break:break-all;margin:4px 0 0;">${resetUrl}</p>
      </div>
    </div>
  </div>
</body>
</html>`,
            });
            this.logger.log(`Password reset email sent to ${to}`);
        } catch (error) {
            this.logger.error(`Failed to send password reset email to ${to}: ${error.message}`);
            // Don't throw — email failure shouldn't block user operations
        }
    }
}
