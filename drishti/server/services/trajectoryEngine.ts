import { Position, MineZone, PredictedRisk, TrajectoryPoint } from '../../src/types/index.js';

// Convert km/h to coordinate units per second.
// Suppose 1000 coordinate units = 1000 meters. 1 km/h = 1000m / 3600s = 0.2778 units/sec.
const KMH_TO_UNITS_PER_SEC = 0.2778;

export interface VehicleVector {
  id: string;
  name: string;
  position: Position;
  speed: number; // km/h
  heading: number; // degrees 0-360, 0=North (up, -y), 90=East (+x), 180=South (+y), 270=West (-x)
}

/**
 * Check if a point is inside a polygon using ray-casting algorithm
 */
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

/**
 * Check distance from point to point
 */
export function distance(p1: Position, p2: Position): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/**
 * Trajectory-based predictive risk engine
 */
export class TrajectoryEngine {
  /**
   * Project future coordinates of a vehicle given constant velocity and heading
   */
  public static projectTrajectory(
    start: Position,
    speedKmh: number,
    headingDeg: number,
    timeOffsetsSec: number[] = [5, 10, 20, 30]
  ): TrajectoryPoint[] {
    const rad = (headingDeg * Math.PI) / 180;
    // 0 deg is North (dy < 0), 90 deg is East (dx > 0)
    const dxPerSec = Math.sin(rad) * speedKmh * KMH_TO_UNITS_PER_SEC;
    const dyPerSec = -Math.cos(rad) * speedKmh * KMH_TO_UNITS_PER_SEC;

    return timeOffsetsSec.map(t => ({
      x: Math.round((start.x + dxPerSec * t) * 10) / 10,
      y: Math.round((start.y + dyPerSec * t) * 10) / 10,
      timeOffsetSeconds: t
    }));
  }

  /**
   * Compute comprehensive risk evaluation for a vehicle against all zones
   */
  public static evaluateRisk(
    vehicle: VehicleVector,
    zones: MineZone[],
    allVehicles: VehicleVector[] = []
  ): PredictedRisk {
    const rad = (vehicle.heading * Math.PI) / 180;
    const speedUnitsPerSec = vehicle.speed * KMH_TO_UNITS_PER_SEC;
    const dxPerSec = Math.sin(rad) * speedUnitsPerSec;
    const dyPerSec = -Math.cos(rad) * speedUnitsPerSec;

    const projectedPath = this.projectTrajectory(vehicle.position, vehicle.speed, vehicle.heading, [5, 10, 15, 20, 30]);

    // 1. Check if vehicle is ALREADY inside any restricted zone
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

    // 2. Predictive Trajectory Intersection for Restricted Zones
    // Sample along the continuous path in 1-second steps up to 40 seconds
    if (vehicle.speed > 1.5) {
      for (let t = 1; t <= 40; t += 1) {
        const projectedPos: Position = {
          x: vehicle.position.x + dxPerSec * t,
          y: vehicle.position.y + dyPerSec * t
        };

        for (const zone of zones) {
          if (zone.riskLevel === 'restricted') {
            const willBeInside = zone.radius
              ? distance(projectedPos, zone.center) <= zone.radius
              : isPointInPolygon(projectedPos, zone.points);

            if (willBeInside) {
              // Found entry time t seconds
              const ttze = t;
              let score = 0;
              let tier: 'safe' | 'warning' | 'critical' = 'safe';

              if (ttze <= 12) {
                // Critical hazard: breach within 12 seconds
                score = Math.min(94, Math.max(75, Math.round(98 - ttze * 2)));
                tier = 'critical';
              } else if (ttze <= 28) {
                // Warning: approaching hazard within 28 seconds
                score = Math.min(74, Math.max(40, Math.round(75 - (ttze - 12) * 2)));
                tier = 'warning';
              } else {
                // Low risk approach
                score = Math.max(15, Math.round(38 - (ttze - 28)));
                tier = 'safe';
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

    // 3. Proximity Caution Buffer (near zone perimeter even if heading tangent)
    for (const zone of zones) {
      if (zone.riskLevel === 'restricted') {
        const d = distance(vehicle.position, zone.center);
        const threshold = (zone.radius || 80) + 40;
        if (d < threshold) {
          return {
            score: 45,
            tier: 'warning',
            targetZoneId: zone.id,
            targetZoneName: zone.name,
            timeToEntrySeconds: null,
            confidence: 0.88,
            hazardType: 'speed_violation',
            projectedPath
          };
        }
      }
    }

    // Nominal State
    return {
      score: Math.floor(Math.random() * 8) + 4, // baseline 4-12
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
