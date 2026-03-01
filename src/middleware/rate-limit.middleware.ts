import rateLimit from 'express-rate-limit';

// ─── Rate Limiters ──────────────────────────────────────────────────────────

/** AI generation endpoint — expensive, burns Groq quota */
export const aiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many requests. Please wait 15 minutes before trying again.',
    },
});

/** Form creation endpoint — creates real Google Forms */
export const formRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many form creation requests. Please wait before trying again.',
    },
});

/** Auth endpoints — prevent brute force */
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many authentication attempts. Please wait before trying again.',
    },
});

/** Reminder creation — heavy (Drive + Calendar) */
export const reminderCreateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many reminder creation requests. Please wait before trying again.',
    },
});
