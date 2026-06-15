// Shared OTP store using globalThis to ensure the same Map instance
// is shared across different API route handlers

interface OtpEntry {
  otp: string;
  expires: number;
  attempts: number;
}

// Use globalThis so the store survives HMR and is shared across modules
const globalForOtp = globalThis as unknown as {
  __otpStore: Map<string, OtpEntry> | undefined;
};

export const otpStore: Map<string, OtpEntry> =
  globalForOtp.__otpStore ?? new Map<string, OtpEntry>();

if (process.env.NODE_ENV !== 'production') {
  globalForOtp.__otpStore = otpStore;
}

// Key can be phone number OR email address
export function setOtp(key: string, otp: string, expiresInMs: number = 5 * 60 * 1000) {
  otpStore.set(key, { otp, expires: Date.now() + expiresInMs, attempts: 0 });
}

export function getOtp(key: string): OtpEntry | undefined {
  return otpStore.get(key);
}

export function deleteOtp(key: string) {
  otpStore.delete(key);
}

export function incrementAttempts(key: string): number {
  const entry = otpStore.get(key);
  if (entry) {
    entry.attempts += 1;
    return entry.attempts;
  }
  return 0;
}

export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
