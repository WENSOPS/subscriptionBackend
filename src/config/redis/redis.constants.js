// Centralized Redis constants
// Change limits here without touching controller logic

export const OTP_EXPIRY       = 10 * 60;  // 10 minutes
export const MAX_ATTEMPTS     = 5;         // wrong OTP attempts before block
export const BLOCK_DURATION   = 30 * 60;  // blocked for 30 minutes
export const RESEND_LIMIT     = 5;         // max resend requests
export const RESEND_EXPIRY    = 60 * 60;  // resend count resets in 1 hour