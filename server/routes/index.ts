import { Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './authRoutes';
import botRoutes from './botRoutes';
import gatewayRoutes from './gatewayRoutes';

const router = Router();

// 1. Integrate Helmet middleware for standard secure HTTP headers
router.use(helmet());

// 2. Configure CORS middleware with custom origins and methods
router.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 3. Define and apply Rate Limiting middleware to prevent DDoS / brute-force
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});

router.use(apiLimiter);

// 4. Mount consolidated route paths
router.use('/auth', authRoutes);
router.use('/v1', gatewayRoutes);
router.use('/', botRoutes);

export default router;
