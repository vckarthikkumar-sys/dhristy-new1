import { describe, it, expect } from 'vitest';
import { TrajectoryEngine, isPointInPolygon, distance } from './trajectoryEngine.js';
import { MineZone } from '../../src/types/index.js';

describe('TrajectoryEngine & Geofencing Math', () => {
  const restrictedBlastZone: MineZone = {
    id: 'zone-blast-test',
    siteId: 'site-pit-alpha',
    name: 'Blast Zone 1',
    type: 'blast_zone',
    riskLevel: 'restricted',
    center: { x: 500, y: 500 },
    radius: 100,
    points: [
      { x: 400, y: 400 },
      { x: 600, y: 400 },
      { x: 600, y: 600 },
      { x: 400, y: 600 }
    ],
    description: 'Test blast zone'
  };

  it('correctly calculates distance between two points', () => {
    const d = distance({ x: 0, y: 0 }, { x: 30, y: 40 });
    expect(d).toBe(50);
  });

  it('correctly determines whether point is inside polygon', () => {
    expect(isPointInPolygon({ x: 500, y: 500 }, restrictedBlastZone.points)).toBe(true);
    expect(isPointInPolygon({ x: 200, y: 200 }, restrictedBlastZone.points)).toBe(false);
  });

  it('projects future coordinates forward along heading vector', () => {
    // Heading 90 degrees = East (+x). Speed 36 km/h = 10 units/sec.
    const start = { x: 100, y: 100 };
    const projected = TrajectoryEngine.projectTrajectory(start, 36, 90, [5, 10]);

    expect(projected[0].timeOffsetSeconds).toBe(5);
    // At 10 units/s, in 5s it moves +50 units in x:
    expect(Math.round(projected[0].x)).toBe(150);
    expect(Math.round(projected[0].y)).toBe(100);

    // In 10s:
    expect(Math.round(projected[1].x)).toBe(200);
    expect(Math.round(projected[1].y)).toBe(100);
  });

  it('evaluates vehicle already inside restricted zone as CRITICAL with TTZE = 0', () => {
    const vehicle = {
      id: 'V-01',
      name: 'Haul Truck 1',
      position: { x: 500, y: 500 },
      speed: 25,
      heading: 90
    };

    const risk = TrajectoryEngine.evaluateRisk(vehicle, [restrictedBlastZone]);
    expect(risk.tier).toBe('critical');
    expect(risk.timeToEntrySeconds).toBe(0);
    expect(risk.score).toBeGreaterThanOrEqual(90);
  });

  it('predicts approaching zone breach before entry and provides TTZE countdown', () => {
    // Blast zone is at center (500, 500), radius 100 -> boundary starts at x = 400.
    // Vehicle at (300, 500), heading 90 deg (moving towards x=400 at 36 km/h = 10 units/sec)
    // Distance to boundary = 100 units. Expected TTZE = 100 / 10 = ~10 seconds.
    const vehicle = {
      id: 'V-02',
      name: 'Haul Truck 2',
      position: { x: 300, y: 500 },
      speed: 36,
      heading: 90
    };

    const risk = TrajectoryEngine.evaluateRisk(vehicle, [restrictedBlastZone]);
    expect(risk.tier).toBe('critical'); // <= 12s is critical
    expect(risk.timeToEntrySeconds).toBeDefined();
    expect(risk.timeToEntrySeconds).toBeLessThanOrEqual(12);
    expect(risk.targetZoneId).toBe(restrictedBlastZone.id);
  });

  it('flags moving away or distant vehicles as safe', () => {
    // Vehicle at (200, 500), moving West (heading 270 deg, away from blast zone)
    const vehicle = {
      id: 'V-03',
      name: 'Haul Truck 3',
      position: { x: 200, y: 500 },
      speed: 36,
      heading: 270
    };

    const risk = TrajectoryEngine.evaluateRisk(vehicle, [restrictedBlastZone]);
    expect(risk.tier).toBe('safe');
    expect(risk.score).toBeLessThan(30);
  });
});
