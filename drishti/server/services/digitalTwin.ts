import { Vehicle, MineZone, SafetyAlert, SiteInfo, SystemMetrics } from '../../src/types/index.js';
import { TrajectoryEngine } from './trajectoryEngine.js';
import { telemetryIngestCounter, alertCounter, trajectoryCalculationDuration, riskScoreGauge } from '../metrics/prometheus.js';
import { FLEET_ROAD_ROUTES, calculateRoadHeading } from '../../src/services/mineRoadNetwork.js';
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

export class DigitalTwinStore {
  private sites: Map<string, SiteInfo> = new Map();
  private zones: Map<string, MineZone[]> = new Map();
  private vehicles: Map<string, Map<string, Vehicle>> = new Map();
  private alerts: SafetyAlert[] = [];
  private incidentHistory: Array<{ timestamp: number; siteId: string; zoneId?: string; severity: string; type: string }> = [];
  private eventsProcessed: number = 0;
  private calculationTimes: number[] = [];
  private startTime: number = Date.now();
  private routeStates: Record<string, { currentIdx: number; direction: 1 | -1 }> = {};
  private activeScenario: {
    name: string;
    stepIndex: number;
    timer?: NodeJS.Timeout;
    targetVehicleId: string;
  } | null = null;
  private fleetMode: 'LIVE' | 'DEMO' = 'LIVE';

  constructor() {
    this.initializeSites();
    this.initializeZones();
    this.initializeVehicles();
  }

  private initializeSites() {
    this.sites.set('site-pit-alpha', {
      id: 'site-pit-alpha',
      name: 'Pit Alpha — Surface Copper',
      location: 'Atacama Basin, Sector 4',
      type: 'surface_copper',
      activeVehiclesCount: 0,
      restrictedZonesCount: 2,
      overallSafetyIndex: 98
    });

    this.sites.set('site-underground-beta', {
      id: 'site-underground-beta',
      name: 'Shaft Beta — Deep Sub-Level',
      location: 'Pilbara Deep Vein, Level -450m',
      type: 'underground_shaft',
      activeVehiclesCount: 0,
      restrictedZonesCount: 2,
      overallSafetyIndex: 96
    });
  }

  private initializeZones() {
    // Zones for Pit Alpha
    const alphaZones: MineZone[] = [
      {
        id: 'zone-blast-alpha',
        siteId: 'site-pit-alpha',
        name: 'Active Blasting Sector B-2',
        type: 'blast_zone',
        riskLevel: 'restricted',
        center: { x: 655, y: 415 },
        radius: 115,
        points: [
          { x: 545, y: 305 },
          { x: 765, y: 305 },
          { x: 765, y: 525 },
          { x: 545, y: 525 }
        ],
        activeUntil: '18:30 UTC',
        description: 'Scheduled ANFO charge detonation window. NO UNAUTHORIZED ENTRY.'
      },
      {
        id: 'zone-highwall-alpha',
        siteId: 'site-pit-alpha',
        name: 'Highwall Geotech Hazard',
        type: 'restricted',
        riskLevel: 'restricted',
        center: { x: 370, y: 275 },
        radius: 85,
        points: [],
        description: 'Micro-seismic sensor alert: Rockfall instability margin.'
      },
      {
        id: 'zone-haul-corridor',
        siteId: 'site-pit-alpha',
        name: 'Primary Haulage Express Route',
        type: 'haul_corridor',
        riskLevel: 'nominal',
        center: { x: 455, y: 480 },
        radius: 160,
        points: [],
        description: 'Heavy 400-ton autonomous haul truck transit corridor. 40 km/h nominal.'
      },
      {
        id: 'zone-crusher-depot',
        siteId: 'site-pit-alpha',
        name: 'Gyratory Crusher & Fuel Depot',
        type: 'fuel_depot',
        riskLevel: 'caution',
        center: { x: 345, y: 755 },
        radius: 85,
        points: [],
        description: 'Automated dumping pocket and diesel replenishment station.'
      }
    ];

    // Zones for Underground Beta
    const betaZones: MineZone[] = [
      {
        id: 'zone-shaft-restricted',
        siteId: 'site-underground-beta',
        name: 'Shaft #1 Air Ventilation Borehole',
        type: 'restricted',
        riskLevel: 'restricted',
        center: { x: 500, y: 450 },
        radius: 90,
        points: [
          { x: 410, y: 360 },
          { x: 590, y: 360 },
          { x: 590, y: 540 },
          { x: 410, y: 540 }
        ],
        description: 'High air suction hazard area. Autonomous vehicles must stay clear.'
      },
      {
        id: 'zone-beta-haulway',
        siteId: 'site-underground-beta',
        name: 'Sub-Level Decline Drift A',
        type: 'haul_corridor',
        riskLevel: 'nominal',
        center: { x: 300, y: 600 },
        radius: 150,
        points: [],
        description: 'Low-clearance underground tramming corridor.'
      }
    ];

    this.zones.set('site-pit-alpha', alphaZones);
    this.zones.set('site-underground-beta', betaZones);
  }

  private initializeVehicles() {
    const alphaFleet = new Map<string, Vehicle>();

    const vehiclesConfig: Array<{ id: string; name: string; type: Vehicle['type']; pos: [number, number]; speed: number; heading: number }> = [
      { id: 'HT-01', name: 'CAT 797F #01', type: 'haul_truck', pos: [10.4165, 77.9005], speed: 0, heading: 0 },
      { id: 'HT-02', name: 'CAT 797F #02', type: 'haul_truck', pos: [10.4165, 77.9005], speed: 0, heading: 0 },
      { id: 'HT-03', name: 'Komatsu 980E #03', type: 'haul_truck', pos: [10.4165, 77.9005], speed: 0, heading: 0 },
      { id: 'HT-04', name: 'CAT 797F #04', type: 'haul_truck', pos: [10.4165, 77.9005], speed: 0, heading: 85 },
      { id: 'EX-01', name: 'P&H 4100XPC Shovel', type: 'excavator', pos: [10.4165, 77.9005], speed: 0, heading: 0 },
      { id: 'DR-01', name: 'Sandvik DR410i Rig', type: 'drilling_rig', pos: [10.4165, 77.9005], speed: 0, heading: 0 },
      { id: 'LV-01', name: 'Safety Patrol Toyota LandCruiser', type: 'light_vehicle', pos: [10.4165, 77.9005], speed: 0, heading: 0 },
      { id: 'LV-02', name: 'Geotech Survey Rover', type: 'light_vehicle', pos: [10.4165, 77.9005], speed: 0, heading: 0 }
    ];

    vehiclesConfig.forEach(cfg => {
      const isHT04 = cfg.id === 'HT-04';
      const vehicle: Vehicle = {
        id: cfg.id,
        name: cfg.name,
        siteId: 'site-pit-alpha',
        type: cfg.type,
        position: {
          lat: cfg.pos[0],
          lon: cfg.pos[1],
          lng: cfg.pos[1],
          x: isHT04 ? 498 : 0,
          y: isHT04 ? 223 : 0
        },
        telemetry: {
          speed: cfg.speed,
          heading: cfg.heading,
          payloadTons: cfg.type === 'haul_truck' ? 380 : (cfg.type === 'excavator' ? 95 : 0),
          fuelBatteryLevel: isHT04 ? 95 : 100,
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
      alphaFleet.set(cfg.id, vehicle);
    });

    this.vehicles.set('site-pit-alpha', alphaFleet);

    // Underground Beta fleet
    const betaFleet = new Map<string, Vehicle>();
    const betaConfig = [
      { id: 'UG-LHD-01', name: 'Sandvik LH517i LHD', type: 'haul_truck' as const, pos: [280, 590] as [number, number], speed: 20, heading: 90 },
      { id: 'UG-TRK-02', name: 'Toro TH551i Hauler', type: 'haul_truck' as const, pos: [610, 620] as [number, number], speed: 18, heading: 270 },
      { id: 'UG-DRILL-03', name: 'Epiroc Boomer M2C', type: 'drilling_rig' as const, pos: [390, 420] as [number, number], speed: 0, heading: 45 }
    ];

    betaConfig.forEach(cfg => {
      const v: Vehicle = {
        id: cfg.id,
        name: cfg.name,
        siteId: 'site-underground-beta',
        type: cfg.type,
        position: { x: cfg.pos[0], y: cfg.pos[1] },
        telemetry: {
          speed: cfg.speed,
          heading: cfg.heading,
          payloadTons: 45,
          fuelBatteryLevel: 88,
          engineTemperatureC: 82,
          operatorStatus: 'autonomous',
          signalStrength: 3,
          satelliteCount: 8,
          lastUpdated: Date.now()
        },
        breadcrumbs: [],
        predictiveRisk: {
          score: 8,
          tier: 'safe',
          targetZoneId: null,
          targetZoneName: null,
          timeToEntrySeconds: null,
          confidence: 0.99,
          hazardType: 'none',
          projectedPath: []
        },
        activeStatus: 'active'
      };
      betaFleet.set(cfg.id, v);
    });

    this.vehicles.set('site-underground-beta', betaFleet);
  }

  private generateMockHistory() {
    const now = Date.now();
    for (let i = 24; i >= 0; i--) {
      const count = Math.floor(Math.sin(i / 3) * 3 + 4);
      for (let j = 0; j < count; j++) {
        this.incidentHistory.push({
          timestamp: now - i * 3600000 + j * 400000,
          siteId: 'site-pit-alpha',
          zoneId: j % 2 === 0 ? 'zone-blast-alpha' : 'zone-highwall-alpha',
          severity: j % 3 === 0 ? 'critical' : 'warning',
          type: 'approaching_breach'
        });
      }
    }
  }

  public getSites(): SiteInfo[] {
    const list = Array.from(this.sites.values());
    if (this.fleetMode === 'LIVE') {
      return list.map(s => ({
        ...s,
        activeVehiclesCount: s.id === 'site-pit-alpha' ? 1 : 0
      }));
    }
    return list;
  }

  public getSite(siteId: string): SiteInfo | undefined {
    return this.sites.get(siteId);
  }

  public getZones(siteId: string): MineZone[] {
    return this.zones.get(siteId) || [];
  }

  public getVehicles(siteId: string): Vehicle[] {
    const fleet = this.vehicles.get(siteId);
    if (!fleet) return [];
    const all = Array.from(fleet.values());
    if (this.fleetMode === 'LIVE') {
      // In LIVE mode, show exclusively vehicles that have received external telemetry
      return all.filter(v => this.externalTelemetryVehicles.has(v.id));
    }
    return all;
  }

  public setFleetMode(mode: 'LIVE' | 'DEMO') {
    this.fleetMode = mode;
    logger.info({ fleetMode: this.fleetMode }, 'Fleet mode updated');
  }

  public getFleetMode(): 'LIVE' | 'DEMO' {
    return this.fleetMode;
  }

  public getVehicle(siteId: string, vehicleId: string): Vehicle | undefined {
    return this.vehicles.get(siteId)?.get(vehicleId);
  }

  public getAlerts(siteId?: string): SafetyAlert[] {
    if (!siteId) return this.alerts.slice(-40);
    return this.alerts.filter(a => a.siteId === siteId).slice(-40);
  }

  public getIncidentHistory() {
    return this.incidentHistory;
  }

  public getMetrics(): SystemMetrics {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const avgCalc = this.calculationTimes.length > 0
      ? this.calculationTimes.reduce((a, b) => a + b, 0) / this.calculationTimes.length
      : 1.2;

    return {
      eventsPerSecond: Math.round(18 + Math.random() * 5),
      alertLatencyMs: Number((1.8 + Math.random() * 0.8).toFixed(1)),
      activeWsConnections: 1,
      telemetryQueueDepth: Math.floor(Math.random() * 4),
      memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      cpuLoadPct: Math.round(8 + Math.random() * 6),
      uptimeSeconds: uptime,
      predictiveCalculationsPerSec: Math.round(120 + Math.random() * 20)
    };
  }

  public acknowledgeAlert(alertId: string, acknowledgedBy: string = 'Operator'): SafetyAlert | null {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = Date.now();
      logger.info({ alertId, acknowledgedBy }, 'Safety Alert Acknowledged');
      return alert;
    }
    return null;
  }

  private externalTelemetryVehicles: Map<string, number> = new Map([['HT-04', Date.now()]]);

  public sendVehicleCommand(siteId: string, vehicleId: string, command: string): boolean {
    const vehicle = this.getVehicle(siteId, vehicleId);
    if (!vehicle) return false;

    if (command === 'emergency_halt') {
      vehicle.telemetry.speed = 0;
      vehicle.activeStatus = 'emergency_halt';
      vehicle.predictiveRisk = {
        ...vehicle.predictiveRisk,
        score: 10,
        tier: 'safe',
        timeToEntrySeconds: null,
        hazardType: 'none'
      };
      logger.warn({ vehicleId, command }, 'EMERGENCY HALT EXECUTED');
    } else if (command === 'divert_corridor_b') {
      // Divert heading 90 degrees away from blast zone
      vehicle.telemetry.heading = (vehicle.telemetry.heading + 120) % 360;
      vehicle.telemetry.speed = 22;
      vehicle.activeStatus = 'active';
      logger.info({ vehicleId, heading: vehicle.telemetry.heading }, 'Vehicle Diverted to Safety Corridor');
    } else if (command === 'resume_nominal') {
      vehicle.activeStatus = 'active';
      vehicle.telemetry.speed = 35;
    }
    return true;
  }

  /**
   * Ingests real-time vehicle telemetry and thermal perception data from external systems.
   */
  public ingestTelemetry(data: {
    siteId: string;
    vehicleId: string;
    position: { lat?: number; lon?: number; lng?: number; x?: number; y?: number };
    speed: number;
    heading: number;
    payloadTons?: number;
    fuelBatteryLevel?: number;
    engineTemperatureC?: number;
    operatorStatus?: 'alert' | 'distracted' | 'fatigued' | 'autonomous';
    thermalVision?: any;
  }): { success: boolean; vehicle?: Vehicle; alert?: SafetyAlert } {
    const siteId = data.siteId || 'site-pit-alpha';
    const vehicle = this.getVehicle(siteId, data.vehicleId);
    if (!vehicle) {
      logger.warn({ siteId, vehicleId: data.vehicleId }, 'Ingest Telemetry: Vehicle not found');
      return { success: false };
    }

    // Mark vehicle as actively driven by external telemetry
    this.externalTelemetryVehicles.set(vehicle.id, Date.now());

    // Update position and kinematics directly from real telemetry
    const lat = data.position.lat;
    const lon = data.position.lon ?? data.position.lng;
    vehicle.position = {
      lat,
      lon,
      lng: lon,
      x: data.position.x ?? 0,
      y: data.position.y ?? 0
    };
    vehicle.telemetry.speed = Number(data.speed);
    vehicle.telemetry.heading = Number(data.heading);
    if (data.payloadTons !== undefined) vehicle.telemetry.payloadTons = Number(data.payloadTons);
    if (data.fuelBatteryLevel !== undefined) vehicle.telemetry.fuelBatteryLevel = Number(data.fuelBatteryLevel);
    if (data.engineTemperatureC !== undefined) vehicle.telemetry.engineTemperatureC = Number(data.engineTemperatureC);
    if (data.operatorStatus !== undefined) vehicle.telemetry.operatorStatus = data.operatorStatus;
    if (data.thermalVision !== undefined) vehicle.telemetry.thermalVision = data.thermalVision;
    vehicle.telemetry.lastUpdated = Date.now();

    // No fake breadcrumbs or fake planned route
    vehicle.breadcrumbs = [];
    vehicle.predictiveRisk = {
      score: 0,
      tier: 'safe',
      targetZoneId: null,
      targetZoneName: null,
      timeToEntrySeconds: null,
      confidence: 1,
      hazardType: 'none',
      projectedPath: []
    };

    let visionAlert: SafetyAlert | undefined;
    // Check for Thermal Fog vision alerts (e.g. HIGH HAZARD ALERT or dense fog >= 70%)
    if (data.thermalVision && (data.thermalVision.threatLevel === 'HIGH HAZARD ALERT' || (data.thermalVision.fogScore && data.thermalVision.fogScore >= 70))) {
      const recentAlert = this.alerts.find(
        a => a.vehicleId === vehicle.id &&
             a.type === 'telemetry_anomaly' &&
             Date.now() - a.timestamp < 10000
      );
      if (!recentAlert) {
        visionAlert = {
          id: `alt-vision-${Date.now()}-${vehicle.id}`,
          siteId,
          vehicleId: vehicle.id,
          vehicleName: vehicle.name,
          severity: 'critical',
          type: 'telemetry_anomaly',
          message: `THERMAL VISION HAZARD: ${vehicle.name} reports ${data.thermalVision.fogLevel || 'LOW VISIBILITY'} (${data.thermalVision.fogScore}% fog, vis: ${data.thermalVision.visibilityMeters}m, ${data.thermalVision.targetCount || 0} obstacles)`,
          timestamp: Date.now(),
          acknowledged: false
        };
        this.alerts.push(visionAlert);
        alertCounter.inc({ site_id: siteId, severity: 'critical', hazard_type: 'telemetry_anomaly' });
        logger.warn({ alert: visionAlert.message }, 'THERMAL VISION HAZARD ALERT GENERATED');
      }
    }

    logger.info(
      { vehicleId: vehicle.id, pos: vehicle.position, speed: vehicle.telemetry.speed, fog: data.thermalVision?.fogScore },
      'Ingested vehicle telemetry via API'
    );

    return { success: true, vehicle, alert: visionAlert };
  }

  /**
   * Main digital twin state evolution step (runs every 1000ms)
   * Strictly acts as a pass-through in REAL mode without generating fake movement or fake alerts.
   */
  public updatePhysicsAndPredictions(): { updatedVehicles: Vehicle[]; newAlerts: SafetyAlert[] } {
    const updatedVehicles: Vehicle[] = [];
    const newAlerts: SafetyAlert[] = [];

    // Loop through all sites
    for (const [siteId, fleet] of this.vehicles.entries()) {
      const vehiclesList = Array.from(fleet.values());

      for (const vehicle of vehiclesList) {
        // Zero simulated movement, zero fake breadcrumbs, zero fake alerts
        updatedVehicles.push(vehicle);
      }
    }

    const returnedVehicles = this.fleetMode === 'LIVE'
      ? updatedVehicles.filter(v => this.externalTelemetryVehicles.has(v.id))
      : updatedVehicles;

    return { updatedVehicles: returnedVehicles, newAlerts };
  }

  private applyNaturalSimulationMovement(v: Vehicle) {
    // Disabled in REAL mode
    return;
  }

  /**
   * Scripted Scenario Mode - Disabled in REAL mode
   */
  public startScenario(scenarioType: 'blast_breach' | 'collision_course'): string {
    logger.info('Scenario drill disabled in REAL mode');
    return 'Scenarios are disabled in REAL mode';
  }

  public resetScenario() {
    this.activeScenario = null;
  }
}

export const digitalTwin = new DigitalTwinStore();
