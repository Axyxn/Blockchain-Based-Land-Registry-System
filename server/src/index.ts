import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import notificationRoutes from './routes/notifications';
import landRoutes from './routes/land';
import userRoutes from './routes/user';
import authRoutes from './routes/auth';
import { startBlockchainSyncListener } from './services/blockchainSync';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Simple rate limiter middleware
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 min
const MAX_REQUESTS_PER_WINDOW = 100;

const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const userRecord = requestCounts.get(ip);

  if (!userRecord || now > userRecord.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }

  if (userRecord.count >= MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  userRecord.count++;
  return next();
};

// Security & Middleware Configuration
app.use(helmet());
app.use(rateLimiter);
app.use(cors({
  origin: '*', // Allow all origins for API access in dev/prod blueprint
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Land Registry API Service'
  });
});

// API Routes
app.use('/api/land', landRoutes);
app.use('/api/user', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/notifications', notificationRoutes);

// Centralized Error Handling Middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Global API Error Handler]:', err.stack || err.message);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred.'
  });
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 Land Registry API Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`==================================================`);

  // Start background blockchain event syncing listener
  try {
    startBlockchainSyncListener();
  } catch (syncErr) {
    console.warn('[Sync Warning] Event listener initialization deferred until RPC connection is established.');
  }
});
