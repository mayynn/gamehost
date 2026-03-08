// ─── Application Constants ───────────────────────────────
// Centralized configuration values used across the platform.
// Avoids magic numbers scattered throughout services.

// ─── Authentication ──────────────────────────────────────

export const BCRYPT_SALT_ROUNDS = 12;
export const JWT_DEFAULT_EXPIRY = '7d';
export const JWT_MIN_SECRET_LENGTH = 32;

// ─── Token Expiry ────────────────────────────────────────

export const EMAIL_VERIFY_EXPIRY_MS = 24 * 60 * 60 * 1000;     // 24 hours
export const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000;         // 1 hour

// ─── Caching ─────────────────────────────────────────────

export const USER_SESSION_CACHE_TTL = 60;    // seconds
export const STATS_CACHE_TTL = 60_000;       // milliseconds

// ─── Server Lifecycle ────────────────────────────────────

export const FREE_SERVER_RENEWAL_DAYS = 7;
export const PAID_SERVER_RENEWAL_DAYS = 30;
export const SUSPENSION_DELETE_THRESHOLD_HOURS = 48;
export const RENEWAL_REMINDER_DAYS = 7;
export const AUTO_RENEWAL_THRESHOLD_DAYS = 3;
export const RESOURCE_FETCH_TIMEOUT_MS = 5000;

// ─── Cookie ──────────────────────────────────────────────

export const AUTH_COOKIE_NAME = 'token';
export const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;  // 7 days

// ─── Rate Limits ─────────────────────────────────────────

export const GLOBAL_RATE_LIMIT = 100;
export const GLOBAL_RATE_TTL_MS = 60_000;

export const AUTH_RATE_LIMIT = 20;
export const LOGIN_RATE_LIMIT = 10;
export const REGISTER_RATE_LIMIT = 5;
export const FORGOT_PASSWORD_RATE_LIMIT = 3;

// ─── Payment ─────────────────────────────────────────────

export const MIN_PAYMENT_AMOUNT = 1;
export const MAX_PAYMENT_AMOUNT = 100_000;
export const MIN_UTR_LENGTH = 6;

// ─── Pterodactyl ─────────────────────────────────────────

export const PTERODACTYL_API_TIMEOUT_MS = 15_000;
export const MAX_ALLOCATION_PAGES = 50;

// ─── Redis Lock TTLs ────────────────────────────────────

export const BILLING_CRON_LOCK_TTL = 300;    // 5 minutes
export const CREDITS_CRON_LOCK_TTL = 180;    // 3 minutes
