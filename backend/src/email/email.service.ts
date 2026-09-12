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
}
