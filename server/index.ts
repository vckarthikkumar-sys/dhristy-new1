import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import pino from 'pino';
import { apiRouter } from './routes/api.js';
import { docsRouter } from './routes/docs.js';
import { digitalTwin } from './services/digitalTwin.js';
import { register, activeWebsocketClientsGauge } from './metrics/prometheus.js';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors());
app.use(express.json());

// Prometheus Metrics Endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Swagger/OpenAPI Documentation
app.use('/api/v1', docsRouter);

// API v1 Router
app.use('/api/v1', apiRouter);

// WebSocket Connections
const clients = new Set<WebSocket>();

wss.on('connection', (ws) => {
  clients.add(ws);
  activeWebsocketClientsGauge.set(clients.size);
  logger.info({ activeClients: clients.size }, 'WebSocket client connected');

  // Send initial handshake state
  ws.send(JSON.stringify({
    type: 'INITIAL_STATE',
    sites: digitalTwin.getSites(),
    zones: digitalTwin.getZones('site-pit-alpha'),
    vehicles: digitalTwin.getVehicles('site-pit-alpha'),
    alerts: digitalTwin.getAlerts('site-pit-alpha'),
    metrics: digitalTwin.getMetrics()
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'ACKNOWLEDGE_ALERT') {
        digitalTwin.acknowledgeAlert(data.alertId, data.acknowledgedBy || 'Operator');
      } else if (data.type === 'VEHICLE_COMMAND') {
        digitalTwin.sendVehicleCommand(data.siteId || 'site-pit-alpha', data.vehicleId, data.command);
      } else if (data.type === 'TRIGGER_SCENARIO') {
        digitalTwin.startScenario(data.scenarioType || 'blast_breach');
      } else if (data.type === 'RESET_SCENARIO') {
        digitalTwin.resetScenario();
      }
    } catch (err) {
      logger.error({ err }, 'Failed to parse incoming WebSocket message');
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    activeWebsocketClientsGauge.set(clients.size);
    logger.info({ activeClients: clients.size }, 'WebSocket client disconnected');
  });
});

// Digital Twin simulation loop (1 Hz physics & predictive calculation)
setInterval(() => {
  const { updatedVehicles, newAlerts } = digitalTwin.updatePhysicsAndPredictions();

  if (clients.size > 0) {
    const payload = JSON.stringify({
      type: 'TELEMETRY_BATCH',
      timestamp: Date.now(),
      vehicles: updatedVehicles,
      alerts: digitalTwin.getAlerts(),
      newAlerts,
      metrics: digitalTwin.getMetrics()
    });

    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }
}, 1000);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  logger.info(`DRISHTI Enterprise Server running on port ${PORT}`);
  logger.info(`REST API: http://localhost:${PORT}/api/v1`);
  logger.info(`OpenAPI Docs: http://localhost:${PORT}/api/v1/docs`);
  logger.info(`Prometheus Metrics: http://localhost:${PORT}/metrics`);
  logger.info(`WebSocket Gateway: ws://localhost:${PORT}/ws`);
});
