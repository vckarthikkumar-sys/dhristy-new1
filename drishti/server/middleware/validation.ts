import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const TelemetryIngestSchema = z.object({
  siteId: z.string().min(1),
  vehicleId: z.string().min(1),
  position: z.object({
    lat: z.number().optional(),
    lon: z.number().optional(),
    lng: z.number().optional(),
    x: z.number().optional(),
    y: z.number().optional()
  }),
  speed: z.number().min(0).max(150),
  heading: z.number().min(0).max(360),
  payloadTons: z.number().min(0).max(500).optional().default(0),
  fuelBatteryLevel: z.number().min(0).max(100).optional().default(100),
  engineTemperatureC: z.number().min(0).max(200).optional().default(85),
  operatorStatus: z.enum(['alert', 'distracted', 'fatigued', 'autonomous']).optional().default('alert'),
  thermalVision: z.object({
    fogScore: z.number().min(0).max(100),
    fogLevel: z.string().optional().default('CLEAR'),
    visibilityMeters: z.number().min(0),
    transmittanceTau: z.number().min(0).max(1).optional(),
    threatLevel: z.string().optional(),
    targetCount: z.number().min(0).optional().default(0),
    categoryCounts: z.record(z.string(), z.number()).optional(),
    inferenceTimeMs: z.number().optional(),
    timestamp: z.number().optional()
  }).optional()
});

export const AcknowledgeAlertSchema = z.object({
  alertId: z.string().min(1),
  acknowledgedBy: z.string().min(1).default('Chief Safety Officer')
});

export const VehicleCommandSchema = z.object({
  command: z.enum(['emergency_halt', 'speed_limit_20', 'divert_corridor_b', 'resume_nominal']),
  reason: z.string().optional()
});

export function validateBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'VALIDATION_FAILED',
        message: 'Invalid payload structure',
        details: result.error.errors
      });
    }
    req.body = result.data;
    next();
  };
}
