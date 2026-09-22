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

  constructor() {
    this.initializeSites();
    this.initializeZones();
    this.initializeVehicles();
    this.generateMockHistory();
  }

  private initializeSites() {
    this.sites.set('site-pit-alpha', {
      id: 'site-pit-alpha',
      name: 'Pit Alpha — Surface Copper',
      location: 'Atacama Basin, Sector 4',
      type: 'surface_copper',
      activeVehiclesCount: 8,
      restrictedZonesCount: 2,
      overallSafetyIndex: 94
    });

    this.sites.set('site-underground-beta', {
      id: 'site-underground-beta',
      name: 'Shaft Beta — Deep Sub-Level',
      location: 'Pilbara Deep Vein, Level -450m',
      type: 'underground_shaft',
      activeVehiclesCount: 5,
      restrictedZonesCount: 2,
      overallSafetyIndex: 91
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
      { id: 'HT-01', name: 'CAT 797F #01', type: 'haul_truck', pos: [475, 385], speed: 36, heading: 25 },
      { id: 'HT-02', name: 'CAT 797F #02', type: 'haul_truck', pos: [295, 240], speed: 34, heading: 135 },
      { id: 'HT-03', name: 'Komatsu 980E #03', type: 'haul_truck', pos: [815, 530], speed: 30, heading: 145 },
      { id: 'HT-04', name: 'CAT 797F #04 (Telemetry Test)', type: 'haul_truck', pos: [475, 385], speed: 38, heading: 80 },
      { id: 'EX-01', name: 'P&H 4100XPC Shovel', type: 'excavator', pos: [840, 390], speed: 0, heading: 190 },
      { id: 'DR-01', name: 'Sandvik DR410i Rig', type: 'drilling_rig', pos: [705, 230], speed: 0, heading: 120 },
      { id: 'LV-01', name: 'Safety Patrol Toyota LandCruiser', type: 'light_vehicle', pos: [345, 330], speed: 42, heading: 175 },
      { id: 'LV-02', name: 'Geotech Survey Rover', type: 'light_vehicle', pos: [345, 755], speed: 24, heading: 155 }
    ];

    vehiclesConfig.forEach(cfg => {
      const vehicle: Vehicle = {
        id: cfg.id,
        name: cfg.name,
        siteId: 'site-pit-alpha',
        type: cfg.type,
        position: { x: cfg.pos[0], y: cfg.pos[1] },
        telemetry: {
          speed: cfg.speed,
          heading: cfg.heading,
          payloadTons: cfg.type === 'haul_truck' ? 380 : (cfg.type === 'excavator' ? 95 : 0),
          fuelBatteryLevel: Math.floor(Math.random() * 30) + 70,
          engineTemperatureC: 84 + Math.floor(Math.random() * 8),
          operatorStatus: 'autonomous',
          signalStrength: 4,
          satelliteCount: 14,
          lastUpdated: Date.now()
        },
        breadcrumbs: [
          { x: cfg.pos[0] - 15, y: cfg.pos[1] + 10, timestamp: Date.now() - 6000 },
          { x: cfg.pos[0] - 8, y: cfg.pos[1] + 5, timestamp: Date.now() - 3000 },
          { x: cfg.pos[0], y: cfg.pos[1], timestamp: Date.now() }
        ],
        predictiveRisk: {
          score: 12,
          tier: 'safe',
          targetZoneId: null,
          targetZoneName: null,
          timeToEntrySeconds: null,
          confidence: 0.98,
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
    return Array.from(this.sites.values());
  }

  public getSite(siteId: string): SiteInfo | undefined {
    return this.sites.get(siteId);
  }

  public getZones(siteId: string): MineZone[] {
    return this.zones.get(siteId) || [];
  }

  public getVehicles(siteId: string): Vehicle[] {
    const fleet = this.vehicles.get(siteId);
    return fleet ? Array.from(fleet.values()) : [];
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
   * Main digital twin state evolution step (runs every 1000ms)
   */
  public updatePhysicsAndPredictions(): { updatedVehicles: Vehicle[]; newAlerts: SafetyAlert[] } {
    const startCalc = performance.now();
    const updatedVehicles: Vehicle[] = [];
    const newAlerts: SafetyAlert[] = [];

    // Loop through all sites
    for (const [siteId, fleet] of this.vehicles.entries()) {
      const zones = this.zones.get(siteId) || [];
      const vehiclesList = Array.from(fleet.values());

      for (const vehicle of vehiclesList) {
        // Skip physics if halted
        if (vehicle.activeStatus === 'emergency_halt') {
          continue;
        }

        // If scenario is NOT actively controlling this vehicle, apply natural patrol movement
        if (!this.activeScenario || this.activeScenario.targetVehicleId !== vehicle.id) {
          this.applyNaturalSimulationMovement(vehicle);
        }

        // Update breadcrumb trails (keep last 12 points)
        vehicle.breadcrumbs.push({
          x: Math.round(vehicle.position.x),
          y: Math.round(vehicle.position.y),
          timestamp: Date.now()
        });
        if (vehicle.breadcrumbs.length > 12) {
          vehicle.breadcrumbs.shift();
        }

        vehicle.telemetry.lastUpdated = Date.now();
        this.eventsProcessed++;

        // Prometheus Telemetry counter
        telemetryIngestCounter.inc({ site_id: siteId, vehicle_type: vehicle.type });

        // Trajectory Evaluation
        const evalStart = performance.now();
        const vector = {
          id: vehicle.id,
          name: vehicle.name,
          position: vehicle.position,
          speed: vehicle.telemetry.speed,
          heading: vehicle.telemetry.heading
        };

        const risk = TrajectoryEngine.evaluateRisk(vector, zones);
        vehicle.predictiveRisk = risk;

        const evalDuration = performance.now() - evalStart;
        trajectoryCalculationDuration.observe(evalDuration);
        riskScoreGauge.set({ site_id: siteId, vehicle_id: vehicle.id, tier: risk.tier }, risk.score);

        // Alert generation logic: trigger if risk is warning or critical and hasn't fired in last 12s
        if (risk.tier !== 'safe' && risk.targetZoneId) {
          const recentAlert = this.alerts.find(
            a => a.vehicleId === vehicle.id &&
                 a.zoneId === risk.targetZoneId &&
                 Date.now() - a.timestamp < 12000
          );

          if (!recentAlert) {
            const isEntryCountdown = risk.timeToEntrySeconds !== null;
            const alert: SafetyAlert = {
              id: `alt-${Date.now()}-${vehicle.id}`,
              siteId,
              vehicleId: vehicle.id,
              vehicleName: vehicle.name,
              zoneId: risk.targetZoneId,
              zoneName: risk.targetZoneName || 'Restricted Area',
              severity: risk.tier,
              type: isEntryCountdown ? 'approaching_breach' : 'active_breach',
              message: isEntryCountdown
                ? `CRITICAL VECTOR: ${vehicle.name} projected to breach ${risk.targetZoneName} in ${risk.timeToEntrySeconds}s!`
                : `ZONE BREACH DETECTED: ${vehicle.name} has crossed perimeter into ${risk.targetZoneName}`,
              timeToEntry: risk.timeToEntrySeconds || undefined,
              timestamp: Date.now(),
              acknowledged: false
            };

            this.alerts.push(alert);
            newAlerts.push(alert);
            alertCounter.inc({ site_id: siteId, severity: alert.severity, hazard_type: alert.type });
            logger.warn({ alert: alert.message, severity: alert.severity }, 'PREDICTIVE SAFETY ALERT FIRED');

            this.incidentHistory.push({
              timestamp: Date.now(),
              siteId,
              zoneId: risk.targetZoneId,
              severity: risk.tier,
              type: alert.type
            });
          }
        }

        updatedVehicles.push(vehicle);
      }
    }

    const totalDuration = performance.now() - startCalc;
    this.calculationTimes.push(totalDuration);
    if (this.calculationTimes.length > 50) this.calculationTimes.shift();

    return { updatedVehicles, newAlerts };
  }

  private applyNaturalSimulationMovement(v: Vehicle) {
    // If vehicle is a static rig or excavator, don't move along roads
    if (v.type === 'drilling_rig') return;
    if (v.type === 'excavator') {
      v.telemetry.heading = (v.telemetry.heading + 1) % 360;
      return;
    }

    const route = FLEET_ROAD_ROUTES[v.id];
    if (route && route.length > 1 && v.telemetry.speed > 0) {
      if (!this.routeStates[v.id]) {
        this.routeStates[v.id] = { currentIdx: 1, direction: 1 };
      }

      const state = this.routeStates[v.id];
      let targetWp = route[state.currentIdx];

      if (targetWp) {
        const d = Math.hypot(targetWp.x - v.position.x, targetWp.y - v.position.y);
        const step = v.telemetry.speed * 0.2778; // km/h to units per second (1 sec tick)

        if (d < Math.max(step * 1.5, 12)) {
          // Reached waypoint: advance along the road route
          state.currentIdx += state.direction;
          if (state.currentIdx >= route.length) {
            state.direction = -1;
            state.currentIdx = route.length - 2;
          } else if (state.currentIdx < 0) {
            state.direction = 1;
            state.currentIdx = 1;
          }
          targetWp = route[state.currentIdx];
        }

        if (targetWp) {
          const targetHeading = calculateRoadHeading(v.position, targetWp);
          // Smooth heading transition along road curvature
          let diff = (targetHeading - v.telemetry.heading) % 360;
          if (diff < -180) diff += 360;
          if (diff > 180) diff -= 360;
          v.telemetry.heading = (v.telemetry.heading + diff * 0.45 + 360) % 360;

          const rad = (v.telemetry.heading * Math.PI) / 180;
          const moveDist = Math.min(step, d);
          v.position.x += Math.sin(rad) * moveDist;
          v.position.y -= Math.cos(rad) * moveDist;
        }
      }
    }

    // Realistic telemetry noise
    v.telemetry.speed = Math.max(18, Math.min(48, v.telemetry.speed + (Math.random() * 1.6 - 0.8)));
    v.telemetry.engineTemperatureC = Math.round(84 + Math.random() * 4);
  }

  /**
   * Scripted Scenario Mode for pitch demonstrations
   */
  public startScenario(scenarioType: 'blast_breach' | 'collision_course'): string {
    logger.info({ scenarioType }, 'STARTING GUIDED DEMO SCENARIO');
    const targetId = 'HT-04';
    const vehicle = this.getVehicle('site-pit-alpha', targetId);
    if (!vehicle) return 'Target vehicle not found';

    // Position HT-04 at Central Hub (475, 385) facing toward Blasting Sector B-2
    vehicle.position = { x: 475, y: 385 };
    vehicle.telemetry.speed = 44;
    vehicle.telemetry.heading = calculateRoadHeading(vehicle.position, { x: 530, y: 375 });
    vehicle.activeStatus = 'active';

    this.routeStates[targetId] = { currentIdx: 1, direction: 1 };

    this.activeScenario = {
      name: scenarioType,
      stepIndex: 1,
      targetVehicleId: targetId
    };

    return 'Scenario started: HT-04 is accelerating along the road toward Active Blast Sector B-2.';
  }

  public resetScenario() {
    this.activeScenario = null;
    const vehicle = this.getVehicle('site-pit-alpha', 'HT-04');
    if (vehicle) {
      vehicle.position = { x: 475, y: 385 };
      vehicle.telemetry.speed = 32;
      vehicle.telemetry.heading = calculateRoadHeading({ x: 475, y: 385 }, { x: 530, y: 375 });
      vehicle.activeStatus = 'active';
      this.routeStates['HT-04'] = { currentIdx: 1, direction: 1 };
    }
  }
}

export const digitalTwin = new DigitalTwinStore();
