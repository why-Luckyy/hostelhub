import { z } from 'zod';

export const verifyPresenceSchema = z.object({
  latitude: z.coerce
    .number({ required_error: 'Latitude is required' })
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  longitude: z.coerce
    .number({ required_error: 'Longitude is required' })
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
  accuracyMeters: z.coerce
    .number({ required_error: 'Accuracy in meters is required' })
    .positive('Accuracy must be greater than 0 meters')
    .max(
      100,
      'GPS accuracy uncertainty exceeds the 100m threshold. Please wait for a better GPS lock.'
    ),
  clientTimestamp: z.coerce
    .date()
    .refine(
      (d) => Math.abs(Date.now() - d.getTime()) <= 5 * 60 * 1000,
      'Location timestamp is stale or skewed beyond the 5-minute tolerance.'
    )
    .optional(),
});

export type VerifyPresenceInput = z.infer<typeof verifyPresenceSchema>;

export const createGeofenceSchema = z.object({
  name: z
    .string({ required_error: 'Campus geofence name is required' })
    .trim()
    .min(3, 'Geofence name must be at least 3 characters')
    .max(100, 'Geofence name cannot exceed 100 characters'),
  latitude: z.coerce
    .number({ required_error: 'Center latitude is required' })
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  longitude: z.coerce
    .number({ required_error: 'Center longitude is required' })
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
  radiusMeters: z.coerce
    .number({ required_error: 'Radius in meters is required' })
    .positive('Radius must be greater than 0')
    .min(10, 'Radius must be at least 10 meters')
    .max(50000, 'Radius cannot exceed 50,000 meters'),
  isActive: z.boolean().optional().default(true),
});

export type CreateGeofenceInput = z.infer<typeof createGeofenceSchema>;

export const updateGeofenceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Geofence name must be at least 3 characters')
    .max(100, 'Geofence name cannot exceed 100 characters')
    .optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  radiusMeters: z.coerce
    .number()
    .positive('Radius must be greater than 0')
    .min(10, 'Radius must be at least 10 meters')
    .max(50000, 'Radius cannot exceed 50,000 meters')
    .optional(),
  isActive: z.boolean().optional(),
});

export type UpdateGeofenceInput = z.infer<typeof updateGeofenceSchema>;

export const queryPresenceSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  isInside: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  studentType: z.enum(['HOSTELER', 'DAY_SCHOLAR']).optional(),
  search: z.string().trim().optional(),
});

export type QueryPresenceInput = z.infer<typeof queryPresenceSchema>;
