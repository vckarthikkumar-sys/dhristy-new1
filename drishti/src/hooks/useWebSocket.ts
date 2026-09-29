import { useEffect, useRef, useState, useCallback } from 'react';
import { Vehicle, MineZone, SafetyAlert, SiteInfo, SystemMetrics } from '../types';

interface WebSocketState {
  isConnected: boolean;
  pingMs: number;
  sites: SiteInfo[];
  zones: MineZone[];
  vehicles: Vehicle[];
  alerts: SafetyAlert[];
  metrics: SystemMetrics | null;
}

export const INITIAL_STATIONARY_HT04: Vehicle = {
  id: 'HT-04',
  name: 'CAT 797F #04',
  siteId: 'site-pit-alpha',
  type: 'haul_truck',
  position: {
    lat: 10.4165,
    lon: 77.9005,
    lng: 77.9005,
    x: 498,
    y: 223
  },
  telemetry: {
    speed: 0,
    heading: 85,
    payloadTons: 380,
    fuelBatteryLevel: 95,
    engineTemperatureC: 84,
    operatorStatus: 'autonomous',
    signalStrength: 4,
    satelliteCount: 14,
    lastUpdated: Date.now()
  },
  breadcrumbs: [],
  predictiveRisk: {
    score: 0,
    tier: 'safe',
    targetZoneId: null,
    targetZoneName: null,
    timeToEntrySeconds: null,
    confidence: 1,
    hazardType: 'none',
    projectedPath: []
  },
  activeStatus: 'active'
};

export function useWebSocket(selectedSiteId: string) {
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    pingMs: 24,
    sites: [
      {
        id: 'site-pit-alpha',
        name: 'PSNA Campus Operations',
        location: 'PSNA College of Eng & Tech, Dindigul',
        type: 'surface_copper',
        activeVehiclesCount: 1,
        restrictedZonesCount: 0,
        overallSafetyIndex: 100
      }
    ],
    zones: [],
    vehicles: [INITIAL_STATIONARY_HT04],
    alerts: [],
    metrics: null
  });

  const wsRef = useRef<WebSocket | null>(null);

  // Connect to backend WebSocket if available
  useEffect(() => {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalhost) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const wsUrl = `${protocol}//${host}:4000/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
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
              vehicles: (data.vehicles && data.vehicles.length > 0) ? data.vehicles : prev.vehicles,
              alerts: data.alerts || prev.alerts,
              metrics: data.metrics || prev.metrics
            }));
          } else if (data.type === 'TELEMETRY_BATCH') {
            setState(prev => ({
              ...prev,
              vehicles: (data.vehicles && data.vehicles.length > 0) ? data.vehicles : prev.vehicles,
              alerts: data.alerts || prev.alerts,
              metrics: data.metrics || prev.metrics
            }));
          }
        } catch {
          // ignore parsing error
        }
      };

      ws.onclose = () => {
        setState(prev => ({ ...prev, isConnected: false }));
      };

      ws.onerror = () => {
        setState(prev => ({ ...prev, isConnected: false }));
      };
    } catch {
      setState(prev => ({ ...prev, isConnected: false }));
    }

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const acknowledgeAlert = useCallback((alertId: string) => {
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
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'VEHICLE_COMMAND',
        siteId: selectedSiteId,
        vehicleId,
        command
      }));
    }
  }, [selectedSiteId]);

  /**
   * Sends a fixed, stationary GPS test fix near PSNA College (10.4165, 77.9005) with 0 km/h speed.
   * Zero simulated movement is generated.
   */
  const sendTestGpsFix = useCallback((lat: number = 10.4165, lon: number = 77.9005) => {
    const payload = {
      siteId: selectedSiteId || 'site-pit-alpha',
      vehicleId: 'HT-04',
      position: { lat, lon, lng: lon },
      speed: 0,
      heading: 85,
      payloadTons: 380,
      fuelBatteryLevel: 95,
      engineTemperatureC: 84,
      operatorStatus: 'autonomous' as const
    };

    const testVehicle: Vehicle = {
      id: 'HT-04',
      name: 'CAT 797F #04',
      siteId: selectedSiteId || 'site-pit-alpha',
      type: 'haul_truck',
      position: { lat, lon, lng: lon, x: 498, y: 223 },
      telemetry: {
        speed: 0,
        heading: 85,
        payloadTons: 380,
        fuelBatteryLevel: 95,
        engineTemperatureC: 84,
        operatorStatus: 'autonomous',
        signalStrength: 4,
        satelliteCount: 14,
        lastUpdated: Date.now()
      },
      breadcrumbs: [],
      predictiveRisk: {
        score: 0,
        tier: 'safe',
        targetZoneId: null,
        targetZoneName: null,
        timeToEntrySeconds: null,
        confidence: 1,
        hazardType: 'none',
        projectedPath: []
      },
      activeStatus: 'active'
    };

    setState(prev => {
      const exists = prev.vehicles.some(v => v.id === 'HT-04');
      return {
        ...prev,
        vehicles: exists
          ? prev.vehicles.map(v => v.id === 'HT-04' ? testVehicle : v)
          : [...prev.vehicles, testVehicle]
      };
    });

    fetch('/api/v1/telemetry/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {});
  }, [selectedSiteId]);

  return {
    ...state,
    acknowledgeAlert,
    sendVehicleCommand,
    sendTestGpsFix
  };
}
