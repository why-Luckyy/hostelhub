import { PrismaClient } from '@prisma/client';
import { env } from './env';

// Prevent multiple PrismaClient instances during hot-reloading in development
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ||
  new PrismaClient({
    log: env.isDev ? ['query', 'info', 'warn', 'error'] : ['error'],
  });

if (env.isDev) {
  global.__prisma = prisma;
}

export default prisma;
