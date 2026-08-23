import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { ConsultationMode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface OAuthStatePayload {
  consultantId: string;
  exp: number;
}

@Injectable()
export class VideoService {
  private readonly dailyApiKey?: string;
  private readonly zoomClientId?: string;
  private readonly zoomClientSecret?: string;
  private readonly zoomRedirectUri: string;
  private readonly googleClientId?: string;
  private readonly googleClientSecret?: string;
  private readonly googleRedirectUri: string;
  private readonly webAppUrl: string;
  private readonly stateSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.dailyApiKey = this.config.get<string>('DAILY_API_KEY') || undefined;
    this.zoomClientId = this.config.get<string>('ZOOM_CLIENT_ID') || undefined;
    this.zoomClientSecret = this.config.get<string>('ZOOM_CLIENT_SECRET') || undefined;
    this.zoomRedirectUri =
      this.config.get<string>('ZOOM_REDIRECT_URI') ??
      'http://localhost:3001/video/zoom/callback';
    this.googleClientId = this.config.get<string>('GOOGLE_CLIENT_ID') || undefined;
    this.googleClientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET') || undefined;
    this.googleRedirectUri =
      this.config.get<string>('GOOGLE_REDIRECT_URI') ??
      'http://localhost:3001/video/google/callback';
    this.webAppUrl = this.config.get<string>('WEB_APP_URL') ?? 'http://localhost:3000';
    // Reusing JWT_SECRET for the OAuth `state` param signature is fine here -
    // it's a different purpose than login tokens, but doesn't need its own
    // secret for an MVP, and keeps the .env surface smaller.
    this.stateSecret = this.config.get<string>('JWT_SECRET') ?? 'dev-fallback-secret';

    if (!this.dailyApiKey) {
      console.warn('[video] DAILY_API_KEY not set - in-app video rooms will fail until configured');
    }
    if (!this.zoomClientId || !this.zoomClientSecret) {
      console.warn('[video] ZOOM_CLIENT_ID/SECRET not set - Zoom connect will fail until configured');
    }
    if (!this.googleClientId || !this.googleClientSecret) {
      console.warn('[video] GOOGLE_CLIENT_ID/SECRET not set - Google Meet connect will fail until configured');
    }
  }

  // ---------- Signed OAuth state ----------
  //
  // Zoom/Google redirect the consultant's own browser straight back to our
  // callback URL - there's no Authorization header on that request, so we
  // can't rely on the JWT guard to know which consultant is completing the
  // flow. Instead we sign a short-lived, HMAC-verified state string when
  // starting the flow and verify it on the way back.

  private signState(consultantId: string): string {
    const payload: OAuthStatePayload = { consultantId, exp: Date.now() + 10 * 60 * 1000 };
    const json = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto.createHmac('sha256', this.stateSecret).update(json).digest('base64url');
    return `${json}.${sig}`;
  }

  private verifyState(state: string): string {
    const [json, sig] = (state ?? '').split('.');
    if (!json || !sig) throw new BadRequestException('Invalid or missing OAuth state');
    const expectedSig = crypto.createHmac('sha256', this.stateSecret).update(json).digest('base64url');
    if (sig !== expectedSig) throw new BadRequestException('OAuth state signature mismatch');
    const payload: OAuthStatePayload = JSON.parse(Buffer.from(json, 'base64url').toString());
    if (Date.now() > payload.exp) {
      throw new BadRequestException('OAuth state expired - please try connecting again');
    }
    return payload.consultantId;
  }

  // ---------- Status (for the onboarding "Video" step) ----------

  async getStatus(userId: string) {
    const profile = await this.prisma.consultantProfile.findUnique({
      where: { userId },
      select: { zoomRefreshToken: true, googleRefreshToken: true },
    });
    if (!profile) throw new NotFoundException('No consultant profile found');
    return {
      dailyEnabled: !!this.dailyApiKey, // no per-consultant setup needed at all
      zoomConnected: !!profile.zoomRefreshToken,
      googleConnected: !!profile.googleRefreshToken,
    };
  }

  // ---------- Zoom OAuth ----------

  getZoomAuthorizeUrl(consultantId: string): string {
    if (!this.zoomClientId) {
      throw new InternalServerErrorException(
        'Zoom integration is not configured (ZOOM_CLIENT_ID missing)',
      );
    }
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.zoomClientId,
      redirect_uri: this.zoomRedirectUri,
      state: this.signState(consultantId),
    });
    return `https://zoom.us/oauth/authorize?${params.toString()}`;
  }

  async handleZoomCallback(code: string, state: string): Promise<void> {
    const consultantId = this.verifyState(state);
    if (!this.zoomClientId || !this.zoomClientSecret) {
      throw new InternalServerErrorException('Zoom integration is not configured');
    }

    const basicAuth = Buffer.from(`${this.zoomClientId}:${this.zoomClientSecret}`).toString(
      'base64',
    );
    const res = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.zoomRedirectUri,
      }),
    });
    if (!res.ok) {
      throw new InternalServerErrorException(`Zoom token exchange failed: ${await res.text()}`);
    }
    const data = await res.json();

    await this.prisma.consultantProfile.update({
      where: { id: consultantId },
      data: {
        zoomAccessToken: data.access_token,
        zoomRefreshToken: data.refresh_token,
        zoomTokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
      },
    });
  }

  private async ensureZoomAccessToken(consultantId: string): Promise<string> {
    const profile = await this.prisma.consultantProfile.findUnique({
      where: { id: consultantId },
      select: { zoomAccessToken: true, zoomRefreshToken: true, zoomTokenExpiresAt: true },
    });
    if (!profile?.zoomRefreshToken) {
      throw new BadRequestException('Consultant has not connected Zoom');
    }
    const stillValid =
      profile.zoomTokenExpiresAt && profile.zoomTokenExpiresAt.getTime() > Date.now() + 60_000;
    if (stillValid && profile.zoomAccessToken) return profile.zoomAccessToken;

    if (!this.zoomClientId || !this.zoomClientSecret) {
      throw new InternalServerErrorException('Zoom integration is not configured');
    }
    const basicAuth = Buffer.from(`${this.zoomClientId}:${this.zoomClientSecret}`).toString(
      'base64',
    );
    const res = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: profile.zoomRefreshToken,
      }),
    });
    if (!res.ok) {
      throw new InternalServerErrorException(`Zoom token refresh failed: ${await res.text()}`);
    }
    const data = await res.json();
    await this.prisma.consultantProfile.update({
      where: { id: consultantId },
      data: {
        zoomAccessToken: data.access_token,
        // Zoom rotates the refresh token on every refresh - keep the new one.
        zoomRefreshToken: data.refresh_token ?? profile.zoomRefreshToken,
        zoomTokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
      },
    });
    return data.access_token;
  }

  private async createZoomMeeting(
    consultantId: string,
    booking: { scheduledAt: Date; durationMins: number; serviceType: { name: string } },
  ): Promise<string> {
    const accessToken = await this.ensureZoomAccessToken(consultantId);
    const res = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: `Advizlo: ${booking.serviceType.name}`,
        type: 2, // scheduled meeting
        start_time: booking.scheduledAt.toISOString(),
        duration: booking.durationMins,
        settings: { join_before_host: true, waiting_room: false },
      }),
    });
    if (!res.ok) {
      throw new InternalServerErrorException(`Zoom meeting creation failed: ${await res.text()}`);
    }
    const data = await res.json();
    return data.join_url;
  }

  // ---------- Google Meet OAuth (via Calendar API conferenceData) ----------

  getGoogleAuthorizeUrl(consultantId: string): string {
    if (!this.googleClientId) {
      throw new InternalServerErrorException(
        'Google integration is not configured (GOOGLE_CLIENT_ID missing)',
      );
    }
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.googleClientId,
      redirect_uri: this.googleRedirectUri,
      access_type: 'offline', // required to get a refresh_token back
      prompt: 'consent', // forces refresh_token on repeat connects too
      scope: 'https://www.googleapis.com/auth/calendar.events',
      state: this.signState(consultantId),
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleGoogleCallback(code: string, state: string): Promise<void> {
    const consultantId = this.verifyState(state);
    if (!this.googleClientId || !this.googleClientSecret) {
      throw new InternalServerErrorException('Google integration is not configured');
    }
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.googleClientId,
        client_secret: this.googleClientSecret,
        redirect_uri: this.googleRedirectUri,
      }),
    });
    if (!res.ok) {
      throw new InternalServerErrorException(`Google token exchange failed: ${await res.text()}`);
    }
    const data = await res.json();
    await this.prisma.consultantProfile.update({
      where: { id: consultantId },
      data: {
        googleAccessToken: data.access_token,
        // Google only sends refresh_token on the FIRST consent (or when
        // prompt=consent forces re-consent, which we always pass above) -
        // if it's missing here for some reason, keep whatever we had.
        googleRefreshToken: data.refresh_token,
        googleTokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
      },
    });
  }

  private async ensureGoogleAccessToken(consultantId: string): Promise<string> {
    const profile = await this.prisma.consultantProfile.findUnique({
      where: { id: consultantId },
      select: { googleAccessToken: true, googleRefreshToken: true, googleTokenExpiresAt: true },
    });
    if (!profile?.googleRefreshToken) {
      throw new BadRequestException('Consultant has not connected Google Meet');
    }
    const stillValid =
      profile.googleTokenExpiresAt && profile.googleTokenExpiresAt.getTime() > Date.now() + 60_000;
    if (stillValid && profile.googleAccessToken) return profile.googleAccessToken;

    if (!this.googleClientId || !this.googleClientSecret) {
      throw new InternalServerErrorException('Google integration is not configured');
    }
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: profile.googleRefreshToken,
        client_id: this.googleClientId,
        client_secret: this.googleClientSecret,
      }),
    });
    if (!res.ok) {
      throw new InternalServerErrorException(`Google token refresh failed: ${await res.text()}`);
    }
    const data = await res.json();
    await this.prisma.consultantProfile.update({
      where: { id: consultantId },
      data: {
        googleAccessToken: data.access_token,
        googleTokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
      },
    });
    return data.access_token;
  }

  private async createGoogleMeetEvent(
    consultantId: string,
    booking: { id: string; scheduledAt: Date; durationMins: number; serviceType: { name: string } },
  ): Promise<string> {
    const accessToken = await this.ensureGoogleAccessToken(consultantId);
    const end = new Date(booking.scheduledAt.getTime() + booking.durationMins * 60_000);

    const res = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: `Advizlo: ${booking.serviceType.name}`,
          start: { dateTime: booking.scheduledAt.toISOString() },
          end: { dateTime: end.toISOString() },
          conferenceData: {
            createRequest: {
              requestId: booking.id,
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          },
        }),
      },
    );
    if (!res.ok) {
      throw new InternalServerErrorException(
        `Google Calendar event creation failed: ${await res.text()}`,
      );
    }
    const data = await res.json();
    const meetLink: string | undefined =
      data.hangoutLink ??
      data.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === 'video')?.uri;
    if (!meetLink) throw new InternalServerErrorException('Google did not return a Meet link');
    return meetLink;
  }

  // ---------- Daily.co (in-app video - no per-consultant setup at all) ----------

  private async createDailyRoom(booking: {
    id: string;
    scheduledAt: Date;
    durationMins: number;
  }): Promise<string> {
    if (!this.dailyApiKey) {
      throw new InternalServerErrorException('DAILY_API_KEY is not configured');
    }
    // Joinable from 10 minutes early until an hour after the appointment ends,
    // then Daily auto-expires the room - no manual cleanup job needed.
    const nbf = Math.floor(booking.scheduledAt.getTime() / 1000) - 600;
    const exp = Math.floor(booking.scheduledAt.getTime() / 1000) + booking.durationMins * 60 + 3600;

    const res = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.dailyApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `advizlo-${booking.id}`,
        properties: { nbf, exp, enable_chat: true, enable_screenshare: true },
      }),
    });
    if (!res.ok) {
      throw new InternalServerErrorException(`Daily room creation failed: ${await res.text()}`);
    }
    const data = await res.json();
    return data.url;
  }

  // ---------- Central dispatcher ----------
  //
  // Called once a booking is confirmed - immediately for free bookings
  // (bookings.service.ts), or from the Stripe webhook once payment succeeds
  // (payments.service.ts). Idempotent: does nothing if a link already exists.

  async confirmMeetingForBooking(bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { serviceType: true },
    });
    if (!booking || booking.meetingLink) return;

    let meetingLink: string | null = null;
    try {
      switch (booking.consultationMode) {
        case ConsultationMode.IN_APP_VIDEO:
          meetingLink = await this.createDailyRoom(booking);
          break;
        case ConsultationMode.ZOOM:
          meetingLink = await this.createZoomMeeting(booking.consultantId, booking);
          break;
        case ConsultationMode.GOOGLE_MEET:
          meetingLink = await this.createGoogleMeetEvent(booking.consultantId, booking);
          break;
        default:
          return; // PHONE / IN_PERSON never need a generated link
      }
    } catch (err) {
      // A video-provider outage (or a missing API key in dev) shouldn't block
      // booking creation or payment confirmation - log it and leave
      // meetingLink null. The UI shows "meeting link pending" rather than a
      // broken link. A retry job would be the natural next step; not built.
      console.error(`[video] failed to create meeting link for booking ${bookingId}:`, err);
      return;
    }

    if (meetingLink) {
      await this.prisma.booking.update({ where: { id: bookingId }, data: { meetingLink } });
    }
  }
}
