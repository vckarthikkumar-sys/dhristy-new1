import { Vehicle, MineZone, SafetyAlert, SiteInfo, SystemMetrics, Position, TrajectoryPoint, PredictedRisk } from '../types';
import { FLEET_ROAD_ROUTES, calculateRoadHeading } from './mineRoadNetwork';

const KMH_TO_UNITS_PER_SEC = 0.2778;

export function isPointInPolygon(point: Position, vs: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i].x, yi = vs[i].y;
    const xj = vs[j].x, yj = vs[j].y;

    const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function distance(p1: Position, p2: Position): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

export class LocalTrajectoryEngine {
  public static projectTrajectory(
    start: Position,
    speedKmh: number,
    headingDeg: number,
    timeOffsetsSec: number[] = [5, 10, 20, 30]
  ): TrajectoryPoint[] {
    const rad = (headingDeg * Math.PI) / 180;
    const dxPerSec = Math.sin(rad) * speedKmh * KMH_TO_UNITS_PER_SEC;
    const dyPerSec = -Math.cos(rad) * speedKmh * KMH_TO_UNITS_PER_SEC;

    return timeOffsetsSec.map(t => ({
      x: Math.round((start.x + dxPerSec * t) * 10) / 10,
      y: Math.round((start.y + dyPerSec * t) * 10) / 10,
      timeOffsetSeconds: t
    }));
  }

  public static projectRoadTrajectory(
    vehicleId: string,
    currentPos: Position,
    speedKmh: number,
    headingDeg: number
  ): TrajectoryPoint[] {
    const route = FLEET_ROAD_ROUTES[vehicleId];
    if (!route || route.length <= 1 || speedKmh < 2) {
      return this.projectTrajectory(currentPos, speedKmh, headingDeg, [5, 10, 20, 30]);
    }

    // Find closest segment or forward waypoint along road route
    let closestIdx = 0;
    let minDist = Infinity;
    for (let i = 0; i < route.length; i++) {
      const d = distance(currentPos, route[i]);
      if (d < minDist) {
        minDist = d;
        closestIdx = i;
      }
    }

    const projected: TrajectoryPoint[] = [];
    const count = Math.min(4, route.length);
    for (let step = 1; step <= count; step++) {
      const idx = (closestIdx + step) % route.length;
      projected.push({
        x: route[idx].x,
        y: route[idx].y,
        timeOffsetSeconds: step * 8
      });
    }

    return projected;
  }

  public static evaluateRisk(
    vehicle: { id: string; name: string; position: Position; speed: number; heading: number },
    zones: MineZone[]
  ): PredictedRisk {
    const projectedPath = this.projectRoadTrajectory(vehicle.id, vehicle.position, vehicle.speed, vehicle.heading);

    // 1. Inside restricted zone
    for (const zone of zones) {
      if (zone.riskLevel === 'restricted') {
        const currentlyInside = zone.radius
          ? distance(vehicle.position, zone.center) <= zone.radius
          : isPointInPolygon(vehicle.position, zone.points);

        if (currentlyInside) {
          return {
            score: 96,
            tier: 'critical',
            targetZoneId: zone.id,
            targetZoneName: zone.name,
            timeToEntrySeconds: 0,
            confidence: 0.99,
            hazardType: 'zone_breach',
            projectedPath
          };
        }
      }
    }

    // 2. Projected path check along road
    if (vehicle.speed > 1.5) {
      for (const pt of projectedPath) {
        for (const zone of zones) {
          if (zone.riskLevel === 'restricted') {
            const willBeInside = zone.radius
              ? distance(pt, zone.center) <= zone.radius
              : isPointInPolygon(pt, zone.points);

            if (willBeInside) {
              const ttze = pt.timeOffsetSeconds;
              let score = 76;
              let tier: 'safe' | 'warning' | 'critical' = 'warning';

              if (ttze <= 15) {
                score = Math.min(94, Math.max(75, Math.round(98 - ttze * 1.8)));
                tier = 'critical';
              } else {
                score = Math.min(74, Math.max(45, Math.round(75 - (ttze - 15) * 1.5)));
                tier = 'warning';
              }

              return {
                score,
                tier,
                targetZoneId: zone.id,
                targetZoneName: zone.name,
                timeToEntrySeconds: ttze,
                confidence: Math.max(0.85, Number((1 - ttze / 60).toFixed(2))),
                hazardType: 'zone_breach',
                projectedPath
              };
            }
          }
        }
      }
    }

    // 3. Proximity Buffer check
    for (const zone of zones) {
      if (zone.riskLevel === 'restricted') {
        const d = distance(vehicle.position, zone.center);
        const threshold = (zone.radius || 80) + 35;
        if (d < threshold) {
          return {
            score: 45,
            tier: 'warning',
            targetZoneId: zone.id,
            targetZoneName: zone.name,
            timeToEntrySeconds: 16,
            confidence: 0.88,
            hazardType: 'zone_breach',
            projectedPath
          };
        }
      }
    }

    return {
      score: Math.floor(Math.random() * 4) + 6,
      tier: 'safe',
      targetZoneId: null,
      targetZoneName: null,
      timeToEntrySeconds: null,
      confidence: 0.98,
      hazardType: 'none',
      projectedPath
    };
  }
}

export class ClientDigitalTwinEngine {
  public sites: SiteInfo[] = [
    {
      id: 'site-pit-alpha',
      name: 'Pit Alpha — Surface Copper',
      location: 'Atacama Basin, Sector 4',
      type: 'surface_copper',
      activeVehiclesCount: 8,
      restrictedZonesCount: 2,
      overallSafetyIndex: 94
    },
    {
      id: 'site-underground-beta',
      name: 'Shaft Beta — Deep Sub-Level',
      location: 'Pilbara Deep Vein, Level -450m',
      type: 'underground_shaft',
      activeVehiclesCount: 3,
      restrictedZonesCount: 2,
      overallSafetyIndex: 91
    }
  ];

  public zones: Record<string, MineZone[]> = {
    'site-pit-alpha': [
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
        description: 'Heavy 400-ton autonomous haul truck transit corridor.'
      },
      {
        id: 'zone-crusher-depot',
        siteId: 'site-pit-alpha',
        name: 'Crusher & Fuel Depot',
        type: 'fuel_depot',
        riskLevel: 'caution',
        center: { x: 345, y: 755 },
        radius: 85,
        points: [],
        description: 'Automated dumping pocket and diesel replenishment station.'
      }
    ],
    'site-underground-beta': [
      {
        id: 'zone-shaft-restricted',
        siteId: 'site-underground-beta',
        name: 'Shaft #1 Air Ventilation Borehole',
        type: 'restricted',
        riskLevel: 'restricted',
        center: { x: 500, y: 450 },
        radius: 90,
        points: [],
        description: 'High air suction hazard area.'
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
        description: 'Underground tramming corridor.'
      }
    ]
  };

  public vehicles: Record<string, Vehicle[]> = {
    'site-pit-alpha': [
      {
        id: 'HT-01',
        name: 'CAT 797F #01',
        siteId: 'site-pit-alpha',
        type: 'haul_truck',
        position: { x: 475, y: 385 },
        telemetry: { speed: 36, heading: 25, payloadTons: 380, fuelBatteryLevel: 84, engineTemperatureC: 85, operatorStatus: 'autonomous', signalStrength: 4, satelliteCount: 14, lastUpdated: Date.now() },
        breadcrumbs: [],
        predictiveRisk: { score: 10, tier: 'safe', targetZoneId: null, targetZoneName: null, timeToEntrySeconds: null, confidence: 0.98, hazardType: 'none', projectedPath: [] },
        activeStatus: 'active'
      },
      {
        id: 'HT-02',
        name: 'CAT 797F #02',
        siteId: 'site-pit-alpha',
        type: 'haul_truck',
        position: { x: 345, y: 330 },
        telemetry: { speed: 34, heading: 135, payloadTons: 380, fuelBatteryLevel: 73, engineTemperatureC: 86, operatorStatus: 'autonomous', signalStrength: 4, satelliteCount: 12, lastUpdated: Date.now() },
        breadcrumbs: [],
        predictiveRisk: { score: 45, tier: 'warning', targetZoneId: 'zone-highwall-alpha', targetZoneName: 'Highwall Geotech Hazard', timeToEntrySeconds: 15, confidence: 0.92, hazardType: 'zone_breach', projectedPath: [] },
        activeStatus: 'active'
      },
      {
        id: 'HT-03',
        name: 'Komatsu 980E #03',
        siteId: 'site-pit-alpha',
        type: 'haul_truck',
        position: { x: 815, y: 530 },
        telemetry: { speed: 30, heading: 145, payloadTons: 380, fuelBatteryLevel: 90, engineTemperatureC: 84, operatorStatus: 'autonomous', signalStrength: 3, satelliteCount: 11, lastUpdated: Date.now() },
        breadcrumbs: [],
        predictiveRisk: { score: 12, tier: 'safe', targetZoneId: null, targetZoneName: null, timeToEntrySeconds: null, confidence: 0.98, hazardType: 'none', projectedPath: [] },
        activeStatus: 'active'
      },
      {
        id: 'HT-04',
        name: 'CAT 797F #04',
        siteId: 'site-pit-alpha',
        type: 'haul_truck',
        position: { x: 530, y: 375 },
        telemetry: { speed: 44, heading: 80, payloadTons: 380, fuelBatteryLevel: 88, engineTemperatureC: 85, operatorStatus: 'autonomous', signalStrength: 4, satelliteCount: 14, lastUpdated: Date.now() },
        breadcrumbs: [],
        predictiveRisk: { score: 78, tier: 'critical', targetZoneId: 'zone-blast-alpha', targetZoneName: 'Active Blasting Sector B-2', timeToEntrySeconds: 11, confidence: 0.98, hazardType: 'zone_breach', projectedPath: [] },
        activeStatus: 'active'
      },
      {
        id: 'EX-01',
        name: 'P&H 4100XPC Shovel',
        siteId: 'site-pit-alpha',
        type: 'excavator',
        position: { x: 840, y: 390 },
        telemetry: { speed: 0, heading: 190, payloadTons: 95, fuelBatteryLevel: 96, engineTemperatureC: 80, operatorStatus: 'autonomous', signalStrength: 4, satelliteCount: 16, lastUpdated: Date.now() },
        breadcrumbs: [],
        predictiveRisk: { score: 8, tier: 'safe', targetZoneId: null, targetZoneName: null, timeToEntrySeconds: null, confidence: 0.99, hazardType: 'none', projectedPath: [] },
        activeStatus: 'active'
      },
      {
        id: 'DR-01',
        name: 'Sandvik DR410i Rig',
        siteId: 'site-pit-alpha',
        type: 'drilling_rig',
        position: { x: 705, y: 230 },
        telemetry: { speed: 0, heading: 120, payloadTons: 0, fuelBatteryLevel: 91, engineTemperatureC: 78, operatorStatus: 'autonomous', signalStrength: 4, satelliteCount: 15, lastUpdated: Date.now() },
        breadcrumbs: [],
        predictiveRisk: { score: 45, tier: 'warning', targetZoneId: null, targetZoneName: null, timeToEntrySeconds: null, confidence: 0.99, hazardType: 'none', projectedPath: [] },
        activeStatus: 'active'
      },
      {
        id: 'LV-01',
        name: 'Toyota LandCruiser',
        siteId: 'site-pit-alpha',
        type: 'light_vehicle',
        position: { x: 345, y: 330 },
        telemetry: { speed: 42, heading: 175, payloadTons: 0, fuelBatteryLevel: 94, engineTemperatureC: 82, operatorStatus: 'alert', signalStrength: 4, satelliteCount: 14, lastUpdated: Date.now() },
        breadcrumbs: [],
        predictiveRisk: { score: 14, tier: 'safe', targetZoneId: null, targetZoneName: null, timeToEntrySeconds: null, confidence: 0.95, hazardType: 'none', projectedPath: [] },
        activeStatus: 'active'
      },
      {
        id: 'LV-02',
        name: 'Geotech Survey Rover',
        siteId: 'site-pit-alpha',
        type: 'light_vehicle',
        position: { x: 345, y: 755 },
        telemetry: { speed: 24, heading: 155, payloadTons: 0, fuelBatteryLevel: 92, engineTemperatureC: 81, operatorStatus: 'autonomous', signalStrength: 4, satelliteCount: 13, lastUpdated: Date.now() },
        breadcrumbs: [],
        predictiveRisk: { score: 12, tier: 'safe', targetZoneId: null, targetZoneName: null, timeToEntrySeconds: null, confidence: 0.96, hazardType: 'none', projectedPath: [] },
        activeStatus: 'active'
      }
    ],
    'site-underground-beta': [
      {
        id: 'UG-LHD-01',
        name: 'Sandvik LH517i LHD',
        siteId: 'site-underground-beta',
        type: 'haul_truck',
        position: { x: 280, y: 590 },
        telemetry: { speed: 20, heading: 90, payloadTons: 45, fuelBatteryLevel: 88, engineTemperatureC: 82, operatorStatus: 'autonomous', signalStrength: 3, satelliteCount: 8, lastUpdated: Date.now() },
        breadcrumbs: [],
        predictiveRisk: { score: 8, tier: 'safe', targetZoneId: null, targetZoneName: null, timeToEntrySeconds: null, confidence: 0.99, hazardType: 'none', projectedPath: [] },
        activeStatus: 'active'
      },
      {
        id: 'UG-TRK-02',
        name: 'Toro TH551i Hauler',
        siteId: 'site-underground-beta',
        type: 'haul_truck',
        position: { x: 610, y: 620 },
        telemetry: { speed: 18, heading: 270, payloadTons: 50, fuelBatteryLevel: 84, engineTemperatureC: 83, operatorStatus: 'autonomous', signalStrength: 3, satelliteCount: 8, lastUpdated: Date.now() },
        breadcrumbs: [],
        predictiveRisk: { score: 9, tier: 'safe', targetZoneId: null, targetZoneName: null, timeToEntrySeconds: null, confidence: 0.99, hazardType: 'none', projectedPath: [] },
        activeStatus: 'active'
      },
      {
        id: 'UG-DRILL-03',
        name: 'Epiroc Boomer M2C',
        siteId: 'site-underground-beta',
        type: 'drilling_rig',
        position: { x: 390, y: 420 },
        telemetry: { speed: 0, heading: 45, payloadTons: 0, fuelBatteryLevel: 94, engineTemperatureC: 76, operatorStatus: 'autonomous', signalStrength: 3, satelliteCount: 7, lastUpdated: Date.now() },
        breadcrumbs: [],
        predictiveRisk: { score: 6, tier: 'safe', targetZoneId: null, targetZoneName: null, timeToEntrySeconds: null, confidence: 0.99, hazardType: 'none', projectedPath: [] },
        activeStatus: 'active'
      }
    ]
  };

  public alerts: SafetyAlert[] = [
    {
      id: 'alt-init-ht04',
      siteId: 'site-pit-alpha',
      vehicleId: 'HT-04',
      vehicleName: 'CAT 797F #04',
      zoneId: 'zone-blast-alpha',
      zoneName: 'Active Blasting Sector B-2',
      severity: 'critical',
      type: 'approaching_breach',
      message: 'Approaching Active Blasting Sector B-2. Immediate intervention recommended.',
      timeToEntry: 11,
      timestamp: Date.now() - 3000,
      acknowledged: false
    },
    {
      id: 'alt-init-ht02',
      siteId: 'site-pit-alpha',
      vehicleId: 'HT-02',
      vehicleName: 'CAT 797F #02',
      zoneId: 'zone-highwall-alpha',
      zoneName: 'Highwall Geotech Hazard',
      severity: 'warning',
      type: 'approaching_breach',
      message: 'Transit in Highwall buffer zone. Rockfall instability margin.',
      timeToEntry: 15,
      timestamp: Date.now() - 8000,
      acknowledged: false
    },
    {
      id: 'alt-init-dr01',
      siteId: 'site-pit-alpha',
      vehicleId: 'DR-01',
      vehicleName: 'Sandvik DR410i Rig',
      zoneId: 'zone-blast-alpha',
      zoneName: 'Bench #4 Rim Buffer',
      severity: 'warning',
      type: 'telemetry_anomaly',
      message: 'Drill rig stationary on bench perimeter.',
      timeToEntry: undefined,
      timestamp: Date.now() - 25000,
      acknowledged: true
    }
  ];

  public activeScenario: { targetId: string } | null = null;
  private routeStates: Record<string, { currentIdx: number; direction: 1 | -1 }> = {};

  public tick(siteId: string): { vehicles: Vehicle[]; alerts: SafetyAlert[]; metrics: SystemMetrics } {
    const fleet = this.vehicles[siteId] || [];
    const zones = this.zones[siteId] || [];

    for (const v of fleet) {
      if (v.activeStatus === 'emergency_halt') continue;

      const route = FLEET_ROAD_ROUTES[v.id];

      // Road-based waypoint movement
      if (route && route.length > 1 && v.telemetry.speed > 0) {
        if (!this.routeStates[v.id]) {
          this.routeStates[v.id] = { currentIdx: 1, direction: 1 };
        }

        const state = this.routeStates[v.id];
        let targetWp = route[state.currentIdx];

        if (targetWp) {
          const d = distance(v.position, targetWp);
          const step = v.telemetry.speed * KMH_TO_UNITS_PER_SEC;

          if (d < Math.max(step * 1.5, 10)) {
            // Reached waypoint: advance to next waypoint along road
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
            const heading = calculateRoadHeading(v.position, targetWp);
            v.telemetry.heading = heading;

            const rad = (heading * Math.PI) / 180;
            v.position.x += Math.sin(rad) * Math.min(step, d);
            v.position.y -= Math.cos(rad) * Math.min(step, d);
          }
        }
      } else if (v.type === 'excavator') {
        v.telemetry.heading = (v.telemetry.heading + 1) % 360;
      }

      // Breadcrumbs trail
      v.breadcrumbs.push({ x: Math.round(v.position.x), y: Math.round(v.position.y), timestamp: Date.now() });
      if (v.breadcrumbs.length > 10) v.breadcrumbs.shift();

      // Trajectory & Risk evaluation
      const risk = LocalTrajectoryEngine.evaluateRisk(
        { id: v.id, name: v.name, position: v.position, speed: v.telemetry.speed, heading: v.telemetry.heading },
        zones
      );
      v.predictiveRisk = risk;

      // Real-time alert dispatch
      if (risk.tier !== 'safe' && risk.targetZoneId) {
        const recent = this.alerts.find(a => a.vehicleId === v.id && a.zoneId === risk.targetZoneId && Date.now() - a.timestamp < 15000);
        if (!recent) {
          const isCountdown = risk.timeToEntrySeconds !== null;
          const alt: SafetyAlert = {
            id: `alt-${Date.now()}-${v.id}`,
            siteId,
            vehicleId: v.id,
            vehicleName: v.name,
            zoneId: risk.targetZoneId,
            zoneName: risk.targetZoneName || 'Restricted Area',
            severity: risk.tier,
            type: isCountdown ? 'approaching_breach' : 'active_breach',
            message: isCountdown
              ? `Approaching ${risk.targetZoneName}. Time to entry: ${risk.timeToEntrySeconds}s.`
              : `ZONE BREACH: ${v.name} crossed perimeter into ${risk.targetZoneName}`,
            timeToEntry: risk.timeToEntrySeconds || undefined,
            timestamp: Date.now(),
            acknowledged: false
          };
          this.alerts.push(alt);
        }
      }
    }

    const metrics: SystemMetrics = {
      eventsPerSecond: Math.round(20 + Math.random() * 4),
      alertLatencyMs: Number((1.8 + Math.random() * 0.6).toFixed(1)),
      activeWsConnections: 1,
      telemetryQueueDepth: Math.floor(Math.random() * 3),
      memoryUsageMb: 42,
      cpuLoadPct: Math.round(8 + Math.random() * 4),
      uptimeSeconds: 3600,
      predictiveCalculationsPerSec: 145
    };

    return { vehicles: [...fleet], alerts: [...this.alerts].slice(-30), metrics };
  }

  public triggerScenario() {
    const v = this.vehicles['site-pit-alpha']?.find(veh => veh.id === 'HT-04');
    if (v) {
      v.position = { x: 475, y: 385 };
      v.telemetry.speed = 44;
      v.telemetry.heading = calculateRoadHeading(v.position, { x: 530, y: 375 });
      v.activeStatus = 'active';
      this.routeStates['HT-04'] = { currentIdx: 1, direction: 1 };
      this.activeScenario = { targetId: 'HT-04' };
    }
  }

  public resetScenario() {
    this.activeScenario = null;
    const v = this.vehicles['site-pit-alpha']?.find(veh => veh.id === 'HT-04');
    if (v) {
      v.position = { x: 475, y: 385 };
      v.telemetry.speed = 34;
      v.telemetry.heading = calculateRoadHeading({ x: 475, y: 385 }, { x: 530, y: 375 });
      v.activeStatus = 'active';
      this.routeStates['HT-04'] = { currentIdx: 1, direction: 1 };
    }
  }

  public sendCommand(siteId: string, vehicleId: string, command: string) {
    const v = this.vehicles[siteId]?.find(veh => veh.id === vehicleId);
    if (!v) return;
    if (command === 'emergency_halt') {
      v.telemetry.speed = 0;
      v.activeStatus = 'emergency_halt';
      v.predictiveRisk.score = 10;
      v.predictiveRisk.tier = 'safe';
      v.predictiveRisk.timeToEntrySeconds = null;
    } else if (command === 'divert_route' || command === 'divert_corridor_b') {
      v.telemetry.heading = (v.telemetry.heading + 110) % 360;
      v.telemetry.speed = 28;
      v.activeStatus = 'active';
      if (this.routeStates[vehicleId]) {
        this.routeStates[vehicleId].direction = -1;
      }
    } else if (command === 'resume_nominal') {
      v.activeStatus = 'active';
      v.telemetry.speed = 37;
    }
  }

  public acknowledgeAlert(alertId: string) {
    const a = this.alerts.find(alt => alt.id === alertId);
    if (a) {
      a.acknowledged = true;
      a.acknowledgedBy = 'Chief Safety Officer';
      a.acknowledgedAt = Date.now();
    }
  }
}

export const clientTwin = new ClientDigitalTwinEngine();
