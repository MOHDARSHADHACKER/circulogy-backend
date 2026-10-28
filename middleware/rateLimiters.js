import rateLimit from 'express-rate-limit';

const make = (max, message, skipSuccessfulRequests = false) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    message: { message },
  });

// Brute-force protection for the credential endpoints.
const loginLimiter = make(10, 'Too many sign-in attempts. Try again in 15 minutes.', true);
const changePasswordLimiter = make(5, 'Too many password change attempts. Try again in 15 minutes.', true);
const apiLimiter = make(300, 'Too many requests. Please slow down.');

export { loginLimiter, changePasswordLimiter, apiLimiter };
