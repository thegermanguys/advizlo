import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendPasswordResetEmail(to: string, resetLink: string) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');

    if (!apiKey) {
      // No email provider configured yet - log the link so this is still
      // testable end to end. Set RESEND_API_KEY to send real emails.
      this.logger.warn(
        `RESEND_API_KEY not set - password reset link for ${to}: ${resetLink}`,
      );
      return;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.config.get<string>('RESEND_FROM_EMAIL') ?? 'Advizlo <onboarding@resend.dev>',
        to,
        subject: 'Reset your Advizlo password',
        html: `
          <p>We received a request to reset your Advizlo password.</p>
          <p><a href="${resetLink}">Click here to choose a new password</a>. This link expires in 1 hour.</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        `,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Resend API error (${response.status}): ${body}`);
    }
  }

  // Signup must succeed even when mail is not configured or Resend errors.
  // The message is a link only — never the account password.
  async sendEmailVerificationEmail(to: string, verifyLink: string) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');

    if (!apiKey) {
      this.logger.warn(
        `RESEND_API_KEY not set - email verification for ${to} was not sent. Signup still succeeded. Link: ${verifyLink}`,
      );
      return;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.config.get<string>('RESEND_FROM_EMAIL') ?? 'Advizlo <onboarding@resend.dev>',
          to,
          subject: 'Verify your Advizlo email',
          html: `
            <p>Confirm your email address to book on Advizlo.</p>
            <p><a href="${this.escapeHtml(verifyLink)}">Verify your email</a>. This link expires in 24 hours.</p>
            <p>If you did not create an account, you can ignore this email.</p>
          `,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(
          `Resend API error (${response.status}) sending verification email to ${to}: ${body}`,
        );
      }
    } catch (err) {
      this.logger.error(`Failed to send verification email to ${to}: ${err}`);
    }
  }

  // Signup must succeed even when mail is not configured or Resend errors.
  async notifyAdminOfNewAccount(account: { email: string; role: string }) {
    const adminEmail = this.config.get<string>('ADMIN_EMAIL')?.trim();
    const accountType = account.role === 'CONSULTANT' ? 'consultant' : 'client';

    if (!adminEmail) {
      this.logger.warn(
        `ADMIN_EMAIL not set - new ${accountType} account waiting (${account.email}) was not emailed`,
      );
      return;
    }

    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        `RESEND_API_KEY not set - new ${accountType} account waiting: ${account.email} (would email ${adminEmail})`,
      );
      return;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.config.get<string>('RESEND_FROM_EMAIL') ?? 'Advizlo <onboarding@resend.dev>',
          to: adminEmail,
          subject: 'New Advizlo account waiting',
          html: `
            <p>A new account is waiting.</p>
            <p>Account type: ${accountType}</p>
            <p>Email: ${this.escapeHtml(account.email)}</p>
          `,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(
          `Resend API error (${response.status}) notifying admin of new ${accountType} account: ${body}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Failed to email admin about new ${accountType} account ${account.email}: ${err}`,
      );
    }
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
