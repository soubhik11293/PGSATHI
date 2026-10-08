import crypto from 'node:crypto';
import type { Request } from 'express';
import type { User } from './db';

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
const DEV_AUTH_SECRET = 'pg-saathi-development-secret-change-me';
const revokedTokens = new Set<string>();

function authSecret(): string {
  const secret = process.env.AUTH_SECRET || DEV_AUTH_SECRET;
  if (process.env.NODE_ENV === 'production' && secret === DEV_AUTH_SECRET) {
    throw new Error('AUTH_SECRET must be configured in production.');
  }
  return secret;
}

function base64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function sign(value: string): string {
  return crypto.createHmac('sha256', authSecret()).update(value).digest('base64url');
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derivedKey}`;
}

export function verifyPassword(password: string, encodedHash?: string): boolean {
  if (!encodedHash) return false;

  const [algorithm, salt, expectedHex] = encodedHash.split('$');
  if (algorithm !== 'scrypt' || !salt || !expectedHex) return false;

  try {
    const expected = Buffer.from(expectedHex, 'hex');
    const actual = crypto.scryptSync(password, salt, expected.length);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export interface AuthClaims {
  sub: string;
  iat: number;
  exp: number;
}

export function createAccessToken(userId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: AuthClaims = { sub: userId, iat: now, exp: now + TOKEN_TTL_SECONDS };
  const encodedPayload = base64Url(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyAccessToken(token?: string): AuthClaims | null {
  if (!token) return null;
  const tokenFingerprint = crypto.createHash('sha256').update(token).digest('hex');
  if (revokedTokens.has(tokenFingerprint)) return null;

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;

  const expectedSignature = sign(encodedPayload);
  const expectedBuffer = Buffer.from(expectedSignature);
  const actualBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== actualBuffer.length || !crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
    return null;
  }

  try {
    const claims = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as AuthClaims;
    if (!claims.sub || !claims.exp || claims.exp <= Math.floor(Date.now() / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
}

export function revokeAccessToken(token?: string): void {
  if (!token) return;
  revokedTokens.add(crypto.createHash('sha256').update(token).digest('hex'));
}

export function getBearerToken(req: Request): string | undefined {
  const value = req.headers.authorization;
  if (!value?.startsWith('Bearer ')) return undefined;
  return value.slice('Bearer '.length).trim() || undefined;
}

export function publicUser(user: User): Omit<User, 'passwordHash'> {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

export function demoModeEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.DEMO_MODE !== 'false';
}
