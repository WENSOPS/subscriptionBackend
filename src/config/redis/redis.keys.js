// Centralized Redis key management
// All keys in one place — easy to change later

export const OTP_KEY          = (phone) => `otp:${phone}`;
export const OTP_ATTEMPTS_KEY = (phone) => `otp:attempts:${phone}`;
export const OTP_BLOCKED_KEY  = (phone) => `otp:blocked:${phone}`;
export const OTP_RESEND_KEY   = (phone) => `otp:resend:${phone}`;