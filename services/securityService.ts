/**
 * GeoSick AI Sovereign Security & Defense Service
 * Handles client-side input sanitization, password entropy verification,
 * login brute-force rate-limiting, and session expiry enforcement.
 */

const RATE_LIMIT_PREFIX = 'geosick_sec_ratelimit_';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 1000; // 30 seconds

export interface PasswordStrengthResult {
  score: number; // 0 to 4
  isValid: boolean;
  label: 'Too Weak' | 'Weak' | 'Medium' | 'Strong';
  color: string;
  feedback: string[];
}

export interface RateLimitStatus {
  allowed: boolean;
  attempts: number;
  remainingSeconds: number;
}

/**
 * Strips HTML tags, script execution vectors, and control characters to prevent XSS.
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '')
    .trim();
}

/**
 * Validates password entropy and returns an actionable checklist.
 */
export function validatePasswordStrength(password: string): PasswordStrengthResult {
  const p = password || '';
  const feedback: string[] = [];

  let score = 0;

  if (p.length >= 8) {
    score += 1;
  } else {
    feedback.push('Must be at least 8 characters long');
  }

  if (/[0-9]/.test(p)) {
    score += 1;
  } else {
    feedback.push('Must contain at least 1 number (0-9)');
  }

  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) {
    score += 1;
  } else {
    feedback.push('Must include both uppercase and lowercase letters');
  }

  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p)) {
    score += 1;
  } else {
    feedback.push('Must include at least 1 special symbol (!@#$%...)');
  }

  let label: PasswordStrengthResult['label'] = 'Too Weak';
  let color = 'bg-red-500';

  if (score === 2) {
    label = 'Weak';
    color = 'bg-amber-500';
  } else if (score === 3) {
    label = 'Medium';
    color = 'bg-yellow-400';
  } else if (score === 4) {
    label = 'Strong';
    color = 'bg-emerald-500';
  }

  return {
    score,
    isValid: score >= 3 && p.length >= 8,
    label,
    color,
    feedback,
  };
}

/**
 * Brute-Force Rate Limiter for Authentication
 */
export function checkRateLimit(identifier: string): RateLimitStatus {
  if (!identifier) return { allowed: true, attempts: 0, remainingSeconds: 0 };
  const key = RATE_LIMIT_PREFIX + sanitizeInput(identifier.toLowerCase());
  
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { allowed: true, attempts: 0, remainingSeconds: 0 };

    const record = JSON.parse(raw);
    const now = Date.now();

    if (record.lockedUntil && record.lockedUntil > now) {
      const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return {
        allowed: false,
        attempts: record.attempts,
        remainingSeconds,
      };
    }

    // Reset lockout window if more than 5 minutes have elapsed
    if (now - record.lastAttempt > 5 * 60 * 1000) {
      localStorage.removeItem(key);
      return { allowed: true, attempts: 0, remainingSeconds: 0 };
    }

    return {
      allowed: true,
      attempts: record.attempts,
      remainingSeconds: 0,
    };
  } catch {
    return { allowed: true, attempts: 0, remainingSeconds: 0 };
  }
}

/**
 * Records a failed authentication attempt and locks out if threshold reached.
 */
export function recordFailedAttempt(identifier: string): RateLimitStatus {
  if (!identifier) return { allowed: true, attempts: 0, remainingSeconds: 0 };
  const key = RATE_LIMIT_PREFIX + sanitizeInput(identifier.toLowerCase());
  const now = Date.now();

  try {
    const raw = localStorage.getItem(key);
    let attempts = 1;

    if (raw) {
      const record = JSON.parse(raw);
      attempts = (record.attempts || 0) + 1;
    }

    let lockedUntil: number | null = null;
    let remainingSeconds = 0;

    if (attempts >= MAX_FAILED_ATTEMPTS) {
      lockedUntil = now + LOCKOUT_DURATION_MS;
      remainingSeconds = Math.ceil(LOCKOUT_DURATION_MS / 1000);
    }

    localStorage.setItem(
      key,
      JSON.stringify({
        attempts,
        lastAttempt: now,
        lockedUntil,
      })
    );

    return {
      allowed: !lockedUntil,
      attempts,
      remainingSeconds,
    };
  } catch {
    return { allowed: true, attempts: 1, remainingSeconds: 0 };
  }
}

/**
 * Resets the failed attempts counter on successful login.
 */
export function resetRateLimit(identifier: string): void {
  if (!identifier) return;
  const key = RATE_LIMIT_PREFIX + sanitizeInput(identifier.toLowerCase());
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage issues
  }
}

/**
 * Checks if a session has exceeded the 24-hour inactivity limit.
 */
export function isSessionExpired(lastActiveTimestampMs: number, maxAgeHours: number = 24): boolean {
  if (!lastActiveTimestampMs) return true;
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  return Date.now() - lastActiveTimestampMs > maxAgeMs;
}
