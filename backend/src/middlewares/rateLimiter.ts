import rateLimit from 'express-rate-limit';
import { HTTP_STATUS } from '../constants/httpStatus';
import { sendError } from '../utils/apiResponse';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 requests per window
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: () => process.env.NODE_ENV === 'test',
  handler: (req, res) => {
    return sendError(
      res,
      'Too many authentication requests from this IP. Please try again after 15 minutes.',
      HTTP_STATUS.BAD_REQUEST, // Or 429
      { code: 'RATE_LIMIT_EXCEEDED' }
    );
  },
});
