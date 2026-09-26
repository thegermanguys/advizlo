import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import * as express from 'express';

export const PROFILE_PHOTO_MAX_BYTES = 1_500_000;

export const PROFILE_PHOTO_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type ProfilePhotoMime = (typeof PROFILE_PHOTO_MIMES)[number];

const TOO_LARGE = 'Profile photo must be 1.5 MB or smaller.';
const BAD_TYPE = 'Use a JPEG, PNG, or WebP image.';

// Raw body for PUT /users/me/photo and PUT /consultants/me/photo. Memory only —
// Vercel functions have no durable disk, and this app has no object store.
export function profilePhotoBodyParser() {
  const raw = express.raw({
    type: [...PROFILE_PHOTO_MIMES],
    limit: PROFILE_PHOTO_MAX_BYTES,
  });
  return (req: Request, res: Response, next: NextFunction) => {
    raw(req, res, (err: { status?: number; type?: string } | undefined) => {
      if (!err) return next();
      if (err.status === 413 || err.type === 'entity.too.large') {
        res.status(413).json({ message: TOO_LARGE });
        return;
      }
      next(err);
    });
  };
}

export function readProfilePhoto(
  body: unknown,
  contentType: string | undefined,
): { bytes: Buffer; mime: ProfilePhotoMime } {
  const bytes = toBuffer(body);
  if (!bytes || bytes.length === 0) {
    throw new BadRequestException(BAD_TYPE);
  }
  if (bytes.length > PROFILE_PHOTO_MAX_BYTES) {
    throw new PayloadTooLargeException(TOO_LARGE);
  }
  const header = contentType?.split(';')[0]?.trim().toLowerCase();
  const mime = detectMime(bytes);
  if (!mime || header !== mime) {
    throw new BadRequestException(BAD_TYPE);
  }
  return { bytes, mime };
}

function toBuffer(body: unknown): Buffer | null {
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  return null;
}

function detectMime(bytes: Buffer): ProfilePhotoMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    bytes.length >= 12 &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}
