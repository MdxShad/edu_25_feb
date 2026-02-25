import crypto from 'crypto';

export function hashValue(value: string): string {
  const salt = process.env.SECURITY_HASH_SALT?.trim() || 'educonnect-local-salt';
  return crypto.createHash('sha256').update(`${salt}:${value}`).digest('hex');
}

export function getClientIpFromForwarded(forwardedForHeader: string | null): string {
  if (!forwardedForHeader) return 'unknown';
  return forwardedForHeader.split(',')[0]?.trim() || 'unknown';
}
