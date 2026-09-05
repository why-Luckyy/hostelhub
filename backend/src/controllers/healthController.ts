import { Request, Response } from 'express';
import { sendSuccess } from '../utils/apiResponse';
import { env } from '../config/env';

export const getHealth = (req: Request, res: Response) => {
  const healthData = {
    status: 'ONLINE',
    service: 'HostelHub API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: env.NODE_ENV,
    geofenceConfig: {
      latitude: env.CAMPUS.LATITUDE,
      longitude: env.CAMPUS.LONGITUDE,
      radiusMeters: env.CAMPUS.ALLOWED_RADIUS_METERS,
    },
  };

  return sendSuccess(res, healthData, 'HostelHub API is operational');
};
