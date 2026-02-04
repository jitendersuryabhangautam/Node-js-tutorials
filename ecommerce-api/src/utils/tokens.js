import crypto from 'crypto';

export function generateRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}