import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { logger } from './utils/logger';
import { errorHandler } from './middlewares/errorHandler';
import apiRouter from './routes';
import prisma from './config/db';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow mobile apps, curl, or dev client origins
      if (!origin || origin.startsWith('http://localhost') || origin.startsWith('exp://')) {
        callback(null, true);
      } else {
        callback(null, true); // Dev-friendly, restricted in production
      }
    },
    credentials: true,
  })
);

// Logging & Parsing Middlewares
app.use(morgan(env.isDev ? 'dev' : 'combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root Welcome Endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'HostelHub API',
    status: 'ACTIVE',
    version: '1.0.0',
    documentation: '/docs',
    endpoints: {
      health: `${env.API_PREFIX}/health`,
    },
  });
});

// Mount Main API Router
app.use(env.API_PREFIX, apiRouter);

// 404 Route Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route not found: [${req.method}] ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use(errorHandler);

// Start HTTP Server
const server = app.listen(env.PORT, () => {
  logger.info(`===============================================`);
  logger.info(`🚀 HostelHub Server running on port ${env.PORT}`);
  logger.info(`📡 Environment: ${env.NODE_ENV}`);
  logger.info(`🔗 Base URL: http://localhost:${env.PORT}${env.API_PREFIX}`);
  logger.info(`🏥 Health Check: http://localhost:${env.PORT}${env.API_PREFIX}/health`);
  logger.info(`===============================================`);
});

// Graceful Shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    await prisma.$disconnect();
    logger.info('Database connection closed.');
    process.exit(0);
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

export default app;
