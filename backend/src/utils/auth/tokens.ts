import { randomBytes, createHash } from 'crypto';
import speakeasy from 'speakeasy';

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Hash a token for storage
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Generate email verification token
 */
export function generateEmailVerificationToken(): {
  token: string;
  hashedToken: string;
  expiresAt: Date;
} {
  const token = generateSecureToken();
  const hashedToken = hashToken(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  return { token, hashedToken, expiresAt };
}

/**
 * Generate password reset token
 */
export function generatePasswordResetToken(): {
  token: string;
  hashedToken: string;
  expiresAt: Date;
} {
  const token = generateSecureToken();
  const hashedToken = hashToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  return { token, hashedToken, expiresAt };
}

/**
 * Generate backup codes for 2FA
 */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric codes
    const code = randomBytes(6).toString('base64')
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 8)
      .toUpperCase();
    codes.push(code);
  }

  return codes;
}

/**
 * Generate TOTP secret for 2FA
 */
export function generate2FASecret(email: string, appName: string = 'Todo App'): {
  secret: string;
  qrCodeUrl: string;
} {
  const secret = speakeasy.generateSecret({
    name: `${appName} (${email})`,
    length: 32,
  });

  return {
    secret: secret.base32,
    qrCodeUrl: secret.otpauth_url || '',
  };
}

/**
 * Verify TOTP token
 */
export function verifyTOTP(token: string, secret: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2, // Allow 2 time steps before/after for clock skew
  });
}

/**
 * Generate API key
 */
export function generateApiKey(): {
  key: string;
  hashedKey: string;
} {
  // Format: tk_live_<random32chars>
  const prefix = 'tk_live_';
  const randomPart = generateSecureToken(16);
  const key = `${prefix}${randomPart}`;
  const hashedKey = hashToken(key);

  return { key, hashedKey };
}