import { Router, Request, Response } from 'express';
import { digitalTwin } from '../services/digitalTwin.js';
import { validateBody, TelemetryIngestSchema, AcknowledgeAlertSchema, VehicleCommandSchema } from '../middleware/validation.js';

export const apiRouter = Router();

// Sites (Multi-tenancy)
apiRouter.get('/sites', (req: Request, res: Response) => {
  res.json({
    data: digitalTwin.getSites(),
    timestamp: Date.now()
  });
});

apiRouter.get('/sites/:siteId', (req: Request, res: Response) => {
  const site = digitalTwin.getSite(String(req.params.siteId));
  if (!site) return res.status(404).json({ error: 'Site not found' });
  res.json({ data: site });
});

// Vehicles
apiRouter.get('/vehicles', (req: Request, res: Response) => {
  const siteId = (req.query.siteId as string) || 'site-pit-alpha';
  const vehicles = digitalTwin.getVehicles(siteId);
  res.json({
    siteId,
    count: vehicles.length,
    data: vehicles
  });
});

apiRouter.get('/vehicles/:id', (req: Request, res: Response) => {
  const siteId = (req.query.siteId as string) || 'site-pit-alpha';
  const vehicle = digitalTwin.getVehicle(siteId, String(req.params.id));
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  res.json({ data: vehicle });
});

// Telemetry Ingestion (MQTT bridge or HTTP webhook)
apiRouter.post('/telemetry/ingest', validateBody(TelemetryIngestSchema), (req: Request, res: Response) => {
  const result = digitalTwin.ingestTelemetry(req.body);
  if (!result.success) {
    return res.status(404).json({ error: 'Vehicle or site not found', vehicleId: req.body.vehicleId });
  }
  res.json({
    status: 'INGESTED',
    vehicleId: result.vehicle?.id,
    position: result.vehicle?.position,
    speed: result.vehicle?.telemetry.speed,
    heading: result.vehicle?.telemetry.heading,
    hasThermalVision: !!result.vehicle?.telemetry.thermalVision,
    predictiveRisk: result.vehicle?.predictiveRisk,
    alertGenerated: !!result.alert,
    timestamp: Date.now()
  });
});

// Fleet Display Mode (LIVE vs DEMO)
apiRouter.get('/fleet/mode', (req: Request, res: Response) => {
  res.json({ mode: digitalTwin.getFleetMode() });
});

apiRouter.post('/fleet/mode', (req: Request, res: Response) => {
  const { mode } = req.body;
  if (mode === 'LIVE' || mode === 'DEMO') {
    digitalTwin.setFleetMode(mode);
    return res.json({ status: 'MODE_UPDATED', mode });
  }
  res.status(400).json({ error: 'Invalid mode. Must be LIVE or DEMO' });
});

// Vehicle Intervention Command
apiRouter.post('/vehicles/:id/command', (req: Request, res: Response) => {
  const siteId = (req.body.siteId as string) || 'site-pit-alpha';
  const { command } = req.body;
  const success = digitalTwin.sendVehicleCommand(siteId, String(req.params.id), command);
  if (!success) return res.status(404).json({ error: 'Vehicle not found' });
  res.json({ status: 'COMMAND_DISPATCHED', vehicleId: String(req.params.id), command });
});

// Zones
apiRouter.get('/zones', (req: Request, res: Response) => {
  const siteId = (req.query.siteId as string) || 'site-pit-alpha';
  res.json({
    siteId,
    data: digitalTwin.getZones(siteId)
  });
});

// Alerts
apiRouter.get('/alerts', (req: Request, res: Response) => {
  const siteId = req.query.siteId as string | undefined;
  res.json({
    data: digitalTwin.getAlerts(siteId)
  });
});

apiRouter.post('/alerts/:id/acknowledge', (req: Request, res: Response) => {
  const acknowledgedBy = req.body.acknowledgedBy || 'Safety Controller';
  const alert = digitalTwin.acknowledgeAlert(String(req.params.id), acknowledgedBy);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  res.json({ status: 'ACKNOWLEDGED', alert });
});

// Analytics & History
apiRouter.get('/analytics/history', (req: Request, res: Response) => {
  res.json({
    data: digitalTwin.getIncidentHistory()
  });
});

// System Metrics
apiRouter.get('/metrics/health', (req: Request, res: Response) => {
  res.json({
    status: 'HEALTHY',
    metrics: digitalTwin.getMetrics()
  });
});

// Pitch Scenario Trigger
apiRouter.post('/scenarios/trigger', (req: Request, res: Response) => {
  const scenarioType = req.body.scenarioType || 'blast_breach';
  const message = digitalTwin.startScenario(scenarioType);
  res.json({ status: 'SCENARIO_STARTED', message });
});

apiRouter.post('/scenarios/reset', (req: Request, res: Response) => {
  digitalTwin.resetScenario();
  res.json({ status: 'SCENARIO_RESET' });
});

// Mock Auth Token (demonstrates JWT auth flow readiness)
apiRouter.post('/auth/token', (req: Request, res: Response) => {
  const { role = 'Chief_Safety_Officer', siteId = 'site-pit-alpha' } = req.body;
  res.json({
    token_type: 'Bearer',
    access_token: `mock-jwt-token.${Buffer.from(JSON.stringify({ role, siteId, exp: Date.now() + 3600000 })).toString('base64')}.sig`,
    expires_in: 3600,
    role,
    siteId
  });
});
