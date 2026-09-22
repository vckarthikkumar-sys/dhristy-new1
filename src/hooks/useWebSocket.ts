import { useEffect, useRef, useState, useCallback } from 'react';
import { Vehicle, MineZone, SafetyAlert, SiteInfo, SystemMetrics } from '../types';
import { clientTwin } from '../services/digitalTwinSimulator';

interface WebSocketState {
  isConnected: boolean;
  pingMs: number;
  sites: SiteInfo[];
  zones: MineZone[];
  vehicles: Vehicle[];
  alerts: SafetyAlert[];
  metrics: SystemMetrics | null;
}

export function useWebSocket(selectedSiteId: string) {
  const [state, setState] = useState<WebSocketState>({
    isConnected: true,
    pingMs: 24,
    sites: clientTwin.sites,
    zones: clientTwin.zones[selectedSiteId] || clientTwin.zones['site-pit-alpha'],
    vehicles: clientTwin.vehicles[selectedSiteId] || [],
    alerts: clientTwin.alerts,
    metrics: null
  });

  const wsRef = useRef<WebSocket | null>(null);
  const isWsActiveRef = useRef<boolean>(false);
  const localTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to backend WebSocket if available
  useEffect(() => {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalhost) {
      // Running hosted (e.g. on Vercel) -> directly use fast in-memory Digital Twin engine
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const wsUrl = `${protocol}//${host}:4000/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        isWsActiveRef.current = true;
        setState(prev => ({ ...prev, isConnected: true }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'INITIAL_STATE') {
            setState(prev => ({
              ...prev,
              sites: data.sites || prev.sites,
              zones: data.zones || prev.zones,
              vehicles: data.vehicles || prev.vehicles,
              alerts: data.alerts || prev.alerts,
              metrics: data.metrics || prev.metrics
            }));
          } else if (data.type === 'TELEMETRY_BATCH') {
            setState(prev => ({
              ...prev,
              vehicles: data.vehicles || prev.vehicles,
              alerts: data.alerts || prev.alerts,
              metrics: data.metrics || prev.metrics
            }));
          }
        } catch {
          // ignore parsing error
        }
      };

      ws.onclose = () => {
        isWsActiveRef.current = false;
      };

      ws.onerror = () => {
        isWsActiveRef.current = false;
      };
    } catch {
      isWsActiveRef.current = false;
    }

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // Update site zones when site changes
  useEffect(() => {
    setState(prev => ({
      ...prev,
      zones: clientTwin.zones[selectedSiteId] || prev.zones,
      vehicles: clientTwin.vehicles[selectedSiteId] || prev.vehicles
    }));
  }, [selectedSiteId]);

  // Autonomous Digital-Twin Simulation tick (always guarantees live animated map on Vercel or standalone)
  useEffect(() => {
    localTimerRef.current = setInterval(() => {
      if (!isWsActiveRef.current) {
        const { vehicles, alerts, metrics } = clientTwin.tick(selectedSiteId);
        setState(prev => ({
          ...prev,
          isConnected: true,
          vehicles,
          alerts,
          metrics,
          pingMs: Math.round(16 + Math.random() * 8)
        }));
      }
    }, 1000);

    return () => {
      if (localTimerRef.current) clearInterval(localTimerRef.current);
    };
  }, [selectedSiteId]);

  const acknowledgeAlert = useCallback((alertId: string) => {
    clientTwin.acknowledgeAlert(alertId);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'ACKNOWLEDGE_ALERT',
        alertId,
        acknowledgedBy: 'Chief Safety Controller'
      }));
    }
    setState(prev => ({
      ...prev,
      alerts: prev.alerts.map(a => a.id === alertId ? { ...a, acknowledged: true, acknowledgedBy: 'Chief Safety Controller' } : a)
    }));
  }, []);

  const sendVehicleCommand = useCallback((vehicleId: string, command: string) => {
    clientTwin.sendCommand(selectedSiteId, vehicleId, command);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'VEHICLE_COMMAND',
        siteId: selectedSiteId,
        vehicleId,
        command
      }));
    }
  }, [selectedSiteId]);

  const triggerScenario = useCallback((scenarioType: string = 'blast_breach') => {
    clientTwin.triggerScenario();
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'TRIGGER_SCENARIO',
        scenarioType
      }));
    }
  }, []);

  const resetScenario = useCallback(() => {
    clientTwin.resetScenario();
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'RESET_SCENARIO'
      }));
    }
  }, []);

  return {
    ...state,
    acknowledgeAlert,
    sendVehicleCommand,
    triggerScenario,
    resetScenario
  };
}
