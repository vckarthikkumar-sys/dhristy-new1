export type VehicleType = 'haul_truck' | 'excavator' | 'drilling_rig' | 'light_vehicle';

export type RiskLevel = 'safe' | 'warning' | 'critical';

export interface Position {
  x: number;
  y: number;
  lat?: number;
  lon?: number;
  lng?: number;
}

export interface Breadcrumb {
  x: number;
  y: number;
  timestamp: number;
}

export interface TrajectoryPoint {
  x: number;
  y: number;
  timeOffsetSeconds: number; // e.g. 5, 10, 20s ahead
}

export interface PredictedRisk {
  score: number; // 0 - 100
  tier: RiskLevel;
  targetZoneId: string | null;
  targetZoneName: string | null;
  timeToEntrySeconds: number | null; // e.g. 14s (TTZE)
  confidence: number; // 0.0 - 1.0
  hazardType: 'zone_breach' | 'collision_course' | 'speed_violation' | 'none';
  projectedPath: TrajectoryPoint[];
}

export interface TelemetryData {
  speed: number; // km/h
  heading: number; // degrees 0-360
  payloadTons: number;
  fuelBatteryLevel: number; // percentage 0-100
  engineTemperatureC: number;
  operatorStatus: 'alert' | 'distracted' | 'fatigued' | 'autonomous';
  signalStrength: number; // 1 to 4 bars
  satelliteCount: number;
  lastUpdated: number; // epoch ms
  thermalVision?: ThermalVisionData;
}

export interface ThermalVisionData {
  fogScore: number;
  fogLevel: string;
  visibilityMeters: number;
  transmittanceTau?: number;
  threatLevel?: string;
  targetCount?: number;
  categoryCounts?: Record<string, number>;
  inferenceTimeMs?: number;
  timestamp?: number;
}

export interface Vehicle {
  id: string;
  name: string;
  siteId: string;
  type: VehicleType;
  position: Position;
  telemetry: TelemetryData;
  breadcrumbs: Breadcrumb[];
  predictiveRisk: PredictedRisk;
  activeStatus: 'active' | 'idle' | 'maintenance' | 'emergency_halt' | 'offline' | 'stale';
}

export type ZoneType = 'blast_zone' | 'restricted' | 'haul_corridor' | 'fuel_depot' | 'maintenance_bay';

export interface MineZone {
  id: string;
  siteId: string;
  name: string;
  type: ZoneType;
  riskLevel: 'restricted' | 'caution' | 'nominal';
  // Simplified polygon vertices (0-1000 coordinate space) or circular center/radius
  points: Position[];
  center: Position;
  radius?: number;
  activeUntil?: string;
  description: string;
}

export interface SafetyAlert {
  id: string;
  siteId: string;
  vehicleId: string;
  vehicleName: string;
  zoneId?: string;
  zoneName?: string;
  severity: RiskLevel;
  type: 'approaching_breach' | 'active_breach' | 'proximity_hazard' | 'telemetry_anomaly';
  message: string;
  timeToEntry?: number; // seconds remaining
  timestamp: number;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: number;
}

export interface SiteInfo {
  id: string;
  name: string;
  location: string;
  type: 'surface_copper' | 'underground_shaft';
  activeVehiclesCount: number;
  restrictedZonesCount: number;
  overallSafetyIndex: number; // 0 - 100
}

export interface SystemMetrics {
  eventsPerSecond: number;
  alertLatencyMs: number;
  activeWsConnections: number;
  telemetryQueueDepth: number;
  memoryUsageMb: number;
  cpuLoadPct: number;
  uptimeSeconds: number;
  predictiveCalculationsPerSec: number;
}

export interface ScenarioStep {
  id: string;
  title: string;
  description: string;
  durationMs: number;
}
