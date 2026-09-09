import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import landRoutes from './routes/land';
import userRoutes from './routes/user';
import { startBlockchainSyncListener } from './services/blockchainSync';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Security & Middleware Configuration
app.use(helmet());
app.use(cors({
  origin: '*', // Allow all origins for API access in dev/prod blueprint
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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
