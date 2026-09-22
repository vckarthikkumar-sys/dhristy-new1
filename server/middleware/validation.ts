import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const TelemetryIngestSchema = z.object({
  siteId: z.string().min(1),
  vehicleId: z.string().min(1),
  position: z.object({
    x: z.number().min(0).max(1000),
    y: z.number().min(0).max(1000)
  }),
  speed: z.number().min(0).max(150),
  heading: z.number().min(0).max(360),
  payloadTons: z.number().min(0).max(500).optional().default(0),
  fuelBatteryLevel: z.number().min(0).max(100).optional().default(100),
  engineTemperatureC: z.number().min(0).max(200).optional().default(85),
  operatorStatus: z.enum(['alert', 'distracted', 'fatigued', 'autonomous']).optional().default('alert')
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
