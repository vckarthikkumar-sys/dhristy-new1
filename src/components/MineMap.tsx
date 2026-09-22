import React, { useState, useRef, useEffect } from 'react';
import { Vehicle, MineZone } from '../types';
import { ZoomIn, ZoomOut, Maximize2, Compass, Crosshair, Layers } from 'lucide-react';
import { getHaulRoadNetworkSvgPaths } from '../services/mineRoadNetwork';

interface MineMapProps {
  vehicles: Vehicle[];
  zones: MineZone[];
  selectedVehicleId: string | null;
  onSelectVehicle: (vehicleId: string) => void;
}

interface VehicleAnimState {
  currentX: number;
  currentY: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  currentHeading: number;
  startHeading: number;
  targetHeading: number;
  startTime: number;
  duration: number;
}

export const MineMap: React.FC<MineMapProps> = ({
  vehicles,
  zones,
  selectedVehicleId,
  onSelectVehicle
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [mapMode, setMapMode] = useState<'map' | 'satellite' | 'terrain'>('satellite');
  const [showLayersMenu, setShowLayersMenu] = useState(false);
  const [showGeofences, setShowGeofences] = useState(true);
  const [showRoads, setShowRoads] = useState(true);
  const [showTrajectories, setShowTrajectories] = useState(true);

  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const haulRoadPaths = getHaulRoadNetworkSvgPaths();

  // Smooth Vehicle Animation Refs (zero React re-renders during interpolation)
  const animStateRef = useRef<Record<string, VehicleAnimState>>({});
  const vehicleRefs = useRef<Record<string, SVGGElement | null>>({});
  const chevronRefs = useRef<Record<string, SVGGElement | null>>({});
  const trajRefs = useRef<Record<string, SVGPathElement | null>>({});
  const routeRefs = useRef<Record<string, SVGPathElement | null>>({});
  const trailRefs = useRef<Record<string, SVGPathElement | null>>({});
  const rafIdRef = useRef<number | null>(null);
  const lastTelemetryTimeRef = useRef<number>(0);
  const vehiclesRef = useRef<Vehicle[]>(vehicles);

  // Synchronize latest vehicle data for the animation loop
  vehiclesRef.current = vehicles;

  // Single efficient requestAnimationFrame loop
  const animateLoop = (time: number) => {
    let stillAnimating = false;
    const currentVehicles = vehiclesRef.current;

    for (let i = 0; i < currentVehicles.length; i++) {
      const v = currentVehicles[i];
      const anim = animStateRef.current[v.id];
      if (!anim) continue;

      const el = vehicleRefs.current[v.id];
      const chevronEl = chevronRefs.current[v.id];
      const trajEl = trajRefs.current[v.id];
      const routeEl = routeRefs.current[v.id];

      const elapsed = time - anim.startTime;
      const rawProgress = elapsed / anim.duration;
      // Soft extrapolation (up to 1.15) to smoothly bridge minor network jitter without pausing
      const progress = Math.min(1.15, rawProgress);

      const newX = anim.startX + (anim.targetX - anim.startX) * progress;
      const newY = anim.startY + (anim.targetY - anim.startY) * progress;

      // Shortest angular path interpolation for heading (0-360 degrees)
      let diff = (anim.targetHeading - anim.startHeading) % 360;
      if (diff < -180) diff += 360;
      if (diff > 180) diff -= 360;
      const newHeading = (anim.startHeading + diff * Math.min(1, rawProgress) + 360) % 360;

      anim.currentX = newX;
      anim.currentY = newY;
      anim.currentHeading = newHeading;

      // Direct SVG DOM manipulation for maximum 60/120fps performance
      if (el) {
        el.setAttribute('transform', `translate(${newX.toFixed(2)}, ${newY.toFixed(2)})`);
      }
      if (chevronEl) {
        chevronEl.setAttribute('transform', `rotate(${newHeading.toFixed(2)})`);
      }
      if (trajEl && v.predictiveRisk.projectedPath && v.predictiveRisk.projectedPath.length > 0) {
        const pathD = `M ${newX.toFixed(2)} ${newY.toFixed(2)} ` +
          v.predictiveRisk.projectedPath.map(p => `L ${p.x} ${p.y}`).join(' ');
        trajEl.setAttribute('d', pathD);
      }
      if (routeEl && v.predictiveRisk.projectedPath && v.predictiveRisk.projectedPath.length > 0) {
        const routeD = `M ${newX.toFixed(2)} ${newY.toFixed(2)} ` +
          v.predictiveRisk.projectedPath.map(p => `L ${p.x} ${p.y}`).join(' ');
        routeEl.setAttribute('d', routeD);
      }
      const trailEl = trailRefs.current[v.id];
      if (trailEl && v.breadcrumbs && v.breadcrumbs.length > 0) {
        const trailD = `M ${v.breadcrumbs.map(b => `${b.x} ${b.y}`).join(' L ')} L ${newX.toFixed(2)} ${newY.toFixed(2)}`;
        trailEl.setAttribute('d', trailD);
      }

      const distRemaining = Math.hypot(anim.targetX - anim.currentX, anim.targetY - anim.currentY);
      if (distRemaining > 0.05 || rawProgress < 1.0) {
        stillAnimating = true;
      }
    }

    if (stillAnimating) {
      rafIdRef.current = requestAnimationFrame(animateLoop);
    } else {
      rafIdRef.current = null;
    }
  };

  // Interpolate vehicle positions on telemetry updates
  useEffect(() => {
    const now = performance.now();
    const interval = lastTelemetryTimeRef.current ? (now - lastTelemetryTimeRef.current) : 1000;
    lastTelemetryTimeRef.current = now;
    const clampedDuration = Math.max(250, Math.min(2500, interval));

    let hasPendingMovement = false;

    for (const v of vehicles) {
      let anim = animStateRef.current[v.id];
      if (!anim) {
        // Initialize vehicle position at first sighting
        anim = {
          currentX: v.position.x,
          currentY: v.position.y,
          startX: v.position.x,
          startY: v.position.y,
          targetX: v.position.x,
          targetY: v.position.y,
          currentHeading: v.telemetry.heading,
          startHeading: v.telemetry.heading,
          targetHeading: v.telemetry.heading,
          startTime: now,
          duration: clampedDuration,
        };
        animStateRef.current[v.id] = anim;

        // Apply immediately to avoid flash
        const el = vehicleRefs.current[v.id];
        if (el) el.setAttribute('transform', `translate(${v.position.x.toFixed(2)}, ${v.position.y.toFixed(2)})`);
        const chEl = chevronRefs.current[v.id];
        if (chEl) chEl.setAttribute('transform', `rotate(${v.telemetry.heading.toFixed(2)})`);
      } else {
        const dx = v.position.x - anim.targetX;
        const dy = v.position.y - anim.targetY;
        const dHeading = Math.abs(v.telemetry.heading - anim.targetHeading);
        const distFromCurrent = Math.hypot(v.position.x - anim.currentX, v.position.y - anim.currentY);

        // If large displacement (scenario reset or teleport), snap immediately without interpolation
        if (distFromCurrent > 180) {
          anim.currentX = v.position.x;
          anim.currentY = v.position.y;
          anim.startX = v.position.x;
          anim.startY = v.position.y;
          anim.targetX = v.position.x;
          anim.targetY = v.position.y;
          anim.currentHeading = v.telemetry.heading;
          anim.startHeading = v.telemetry.heading;
          anim.targetHeading = v.telemetry.heading;
          anim.startTime = now;
          anim.duration = clampedDuration;

          const el = vehicleRefs.current[v.id];
          if (el) el.setAttribute('transform', `translate(${v.position.x.toFixed(2)}, ${v.position.y.toFixed(2)})`);
          const chEl = chevronRefs.current[v.id];
          if (chEl) chEl.setAttribute('transform', `rotate(${v.telemetry.heading.toFixed(2)})`);
        } else if (dx !== 0 || dy !== 0 || dHeading > 0.1) {
          // Continuous smooth interpolation: preserve CURRENT rendered position as start
          anim.startX = anim.currentX;
          anim.startY = anim.currentY;
          anim.targetX = v.position.x;
          anim.targetY = v.position.y;
          anim.startHeading = anim.currentHeading;
          anim.targetHeading = v.telemetry.heading;
          anim.startTime = now;
          anim.duration = clampedDuration;
          hasPendingMovement = true;
        }
      }
    }

    // Clean up vehicles no longer present
    const activeIds = new Set(vehicles.map(v => v.id));
    for (const id of Object.keys(animStateRef.current)) {
      if (!activeIds.has(id)) {
        delete animStateRef.current[id];
        delete vehicleRefs.current[id];
        delete chevronRefs.current[id];
        delete trajRefs.current[id];
        delete routeRefs.current[id];
        delete trailRefs.current[id];
      }
    }

    // Trigger single animation loop if not currently running
    if (hasPendingMovement && !rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(animateLoop);
    }
  }, [vehicles]);

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).id === 'map-background' || (e.target as HTMLElement).tagName === 'image') {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(2.8, prev + 0.25));
  const handleZoomOut = () => setZoom(prev => Math.max(0.6, prev - 0.25));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleLocateVehicle = () => {
    if (selectedVehicleId) {
      const anim = animStateRef.current[selectedVehicleId];
      const curVehicle = vehicles.find(v => v.id === selectedVehicleId);
      const targetX = anim ? anim.currentX : (curVehicle ? curVehicle.position.x : 500);
      const targetY = anim ? anim.currentY : (curVehicle ? curVehicle.position.y : 500);
      // Pan so vehicle is centered
      setPan({
        x: (500 - targetX) * zoom,
        y: (500 - targetY) * zoom
      });
    } else {
      handleResetView();
    }
  };

  return (
    <div
      className="relative w-full h-full bg-[#0B0D11] overflow-hidden select-none cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      id="map-background"
    >
      {/* Primary CAD & Satellite Map Canvas */}
      <svg
        viewBox="0 0 1000 1000"
        className="w-full h-full"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.15s ease-out'
        }}
      >
        <defs>
          {/* Subtle Grid Pattern (50m engineering grid) */}
          <pattern id="mine-grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.035)" strokeWidth="0.75" />
          </pattern>

          {/* Major Engineering Grid Pattern (200m grid) */}
          <pattern id="major-grid" width="200" height="200" patternUnits="userSpaceOnUse">
            <path d="M 200 0 L 0 0 0 200" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          </pattern>

          {/* Industrial Hazard Zone Striped Pattern (Cross-hatching) */}
          <pattern id="hazard-hatch" width="16" height="16" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="16" stroke="rgba(244, 63, 94, 0.32)" strokeWidth="3.5" />
          </pattern>

          <pattern id="caution-hatch" width="16" height="16" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="16" stroke="rgba(245, 158, 11, 0.25)" strokeWidth="3" />
          </pattern>

          <pattern id="info-hatch" width="16" height="16" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="16" stroke="rgba(16, 185, 129, 0.18)" strokeWidth="2.5" />
          </pattern>

          {/* Glow filter for planned route highlights */}
          <filter id="route-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. Base Layer */}
        {mapMode === 'satellite' ? (
          <g id="satellite-base-layer">
            {/* Dark background beneath image */}
            <rect width="1000" height="1000" fill="#0E1217" />
            {/* Realistic High-Resolution Aerial Mine Satellite Terrain */}
            <image
              href="/assets/mine-satellite-terrain.jpg"
              x="0"
              y="0"
              width="1000"
              height="1000"
              preserveAspectRatio="none"
              style={{ filter: 'brightness(0.92) contrast(1.08)' }}
              role="img"
              aria-label="Aerial satellite terrain map of Pit Alpha open-pit copper mine"
            >
              <title>Pit Alpha Aerial Satellite Terrain Map</title>
            </image>
            {/* Subtle engineering grid overlay for CAD positioning */}
            <rect width="1000" height="1000" fill="url(#mine-grid)" opacity="0.6" />
          </g>
        ) : mapMode === 'terrain' ? (
          <g id="terrain-contour-layer">
            <rect width="1000" height="1000" fill="#11141A" />
            <rect width="1000" height="1000" fill="url(#mine-grid)" />
            <rect width="1000" height="1000" fill="url(#major-grid)" />

            {/* Topographic Contour Elevation Benches */}
            <g opacity="0.5" stroke="rgba(255,255,255,0.18)" strokeWidth="1" fill="none">
              {/* Bench Elevation - Level 1 (+240m Crest) */}
              <path d="M 120 180 C 300 80, 750 90, 890 220 C 940 380, 910 750, 780 880 C 620 940, 280 920, 140 820 C 60 680, 50 320, 120 180 Z" />
              {/* Bench Elevation - Level 2 (+180m Mid-Ramp) */}
              <path d="M 180 240 C 340 160, 700 170, 820 280 C 860 420, 840 700, 720 810 C 580 860, 320 840, 200 750 C 130 630, 120 360, 180 240 Z" strokeDasharray="4 4" />
              {/* Bench Elevation - Level 3 (+120m Bench 3) */}
              <path d="M 250 310 C 380 240, 650 250, 740 340 C 780 460, 760 640, 660 730 C 540 770, 370 760, 270 680 C 200 580, 200 400, 250 310 Z" />
              {/* Bench Elevation - Level 4 (+60m Pit Bottom) */}
              <path d="M 340 400 C 440 350, 580 350, 650 420 C 680 500, 660 590, 590 640 C 510 670, 410 660, 350 610 C 300 550, 300 450, 340 400 Z" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
            </g>
          </g>
        ) : (
          <g id="map-cad-layer">
            <rect width="1000" height="1000" fill="#0B0D11" />
            <rect width="1000" height="1000" fill="url(#mine-grid)" />
            <rect width="1000" height="1000" fill="url(#major-grid)" />
          </g>
        )}

        {/* 2. Brown Haul Road Network Overlay */}
        {showRoads && (
          <g id="haul-road-network" strokeLinecap="round" strokeLinejoin="round">
            {/* Underlay Road Shoulder & Base */}
            {haulRoadPaths.map((pathD, idx) => (
              <path
                key={`road-base-${idx}`}
                d={pathD}
                fill="none"
                stroke={mapMode === 'satellite' ? 'rgba(195, 155, 105, 0.28)' : 'rgba(215, 175, 125, 0.35)'}
                strokeWidth="22"
              />
            ))}

            {/* Road Bed Core */}
            {haulRoadPaths.map((pathD, idx) => (
              <path
                key={`road-core-${idx}`}
                d={pathD}
                fill="none"
                stroke={mapMode === 'satellite' ? 'rgba(230, 190, 140, 0.18)' : 'rgba(240, 200, 150, 0.25)'}
                strokeWidth="15"
              />
            ))}

            {/* Subtle Road Centerline Markings */}
            {haulRoadPaths.map((pathD, idx) => (
              <path
                key={`road-center-${idx}`}
                d={pathD}
                fill="none"
                stroke="rgba(255, 255, 255, 0.20)"
                strokeWidth="1.2"
                strokeDasharray="7 9"
              />
            ))}
          </g>
        )}

        {/* 3. Engineering Grid Coordinates */}
        <g fill="#8E929B" fontSize="9" fontFamily="monospace" opacity="0.75">
          <text x="50" y="24">E 420,000</text>
          <text x="250" y="24">E 420,200</text>
          <text x="450" y="24">E 420,400</text>
          <text x="650" y="24">E 420,600</text>
          <text x="850" y="24">E 420,800</text>

          <text x="14" y="200" transform="rotate(-90 14 200)">N 7,810,200</text>
          <text x="14" y="500" transform="rotate(-90 14 500)">N 7,810,500</text>
          <text x="14" y="800" transform="rotate(-90 14 800)">N 7,810,800</text>
        </g>

        {/* 4. Geofenced Safety Hazard Zones */}
        {showGeofences && zones.map((zone) => {
          const isRestricted = zone.riskLevel === 'restricted';
          const isCaution = zone.riskLevel === 'caution';

          return (
            <g key={zone.id}>
              {/* Zone Area with Pattern Fill */}
              {zone.radius ? (
                <>
                  <circle
                    cx={zone.center.x}
                    cy={zone.center.y}
                    r={zone.radius}
                    fill={isRestricted ? 'url(#hazard-hatch)' : (isCaution ? 'url(#caution-hatch)' : 'url(#info-hatch)')}
                    stroke={isRestricted ? '#F43F5E' : (isCaution ? '#F59E0B' : '#10B981')}
                    strokeWidth={isRestricted ? 2 : 1.5}
                    strokeDasharray={isRestricted ? '8 5' : (isCaution ? '6 4' : '4 4')}
                  />
                  {/* Outer Safety Buffer Ring */}
                  {isRestricted && (
                    <circle
                      cx={zone.center.x}
                      cy={zone.center.y}
                      r={zone.radius + 18}
                      fill="none"
                      stroke="#F43F5E"
                      strokeWidth="0.8"
                      strokeDasharray="3 5"
                      opacity="0.5"
                    />
                  )}
                </>
              ) : zone.points && zone.points.length > 0 ? (
                <polygon
                  points={zone.points.map(p => `${p.x},${p.y}`).join(' ')}
                  fill={isRestricted ? 'url(#hazard-hatch)' : 'url(#caution-hatch)'}
                  stroke={isRestricted ? '#F43F5E' : '#F59E0B'}
                  strokeWidth="2"
                  strokeDasharray={isRestricted ? '8 5' : 'none'}
                />
              ) : null}

              {/* Frosted Geofence Identification Label Capsule */}
              <g transform={`translate(${zone.center.x}, ${zone.center.y - (zone.radius ? zone.radius * 0.55 : 0)})`}>
                <rect
                  x="-85"
                  y="-12"
                  width="170"
                  height="24"
                  rx="7"
                  fill="#0F1216"
                  fillOpacity="0.88"
                  stroke={isRestricted ? '#F43F5E' : (isCaution ? '#F59E0B' : 'rgba(255, 255, 255, 0.2)')}
                  strokeWidth="1.2"
                />
                <circle
                  cx="-70"
                  cy="0"
                  r="3"
                  fill={isRestricted ? '#F43F5E' : (isCaution ? '#F59E0B' : '#10B981')}
                />
                <text
                  x="-60"
                  y="4"
                  fill={isRestricted ? '#FFE4E6' : (isCaution ? '#FEF3C7' : '#EAEAEA')}
                  fontSize="10"
                  fontWeight="600"
                  fontFamily="Inter, sans-serif"
                >
                  {zone.name}
                </text>
              </g>
            </g>
          );
        })}

        {/* 5. Planned Haul Route & Trajectory Forecasting */}
        {showTrajectories && vehicles.map((v) => {
          const isSelected = v.id === selectedVehicleId;
          const isCritical = v.predictiveRisk.tier === 'critical';
          const isWarning = v.predictiveRisk.tier === 'warning';
          const strokeColor = isCritical ? '#FB7185' : (isWarning ? '#FBBF24' : '#38BDF8');

          return (
            <g key={`route-group-${v.id}`}>
              {/* Cyan Dashed Planned Route Ahead along Haul Network */}
              {v.predictiveRisk.projectedPath && v.predictiveRisk.projectedPath.length > 0 && (
                <>
                  <path
                    ref={el => {
                      routeRefs.current[v.id] = el;
                      if (el) {
                        const anim = animStateRef.current[v.id];
                        const curX = anim ? anim.currentX : v.position.x;
                        const curY = anim ? anim.currentY : v.position.y;
                        const pathD = `M ${curX.toFixed(2)} ${curY.toFixed(2)} ` +
                          v.predictiveRisk.projectedPath.map(p => `L ${p.x} ${p.y}`).join(' ');
                        el.setAttribute('d', pathD);
                      }
                    }}
                    fill="none"
                    stroke={isSelected ? '#38BDF8' : strokeColor}
                    strokeWidth={isSelected ? '2.5' : '1.8'}
                    strokeDasharray={isCritical ? '4 3' : '6 4'}
                    opacity={isSelected ? 0.95 : 0.7}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter={isSelected ? 'url(#route-glow)' : undefined}
                  />

                  {/* Projected Destination / Waypoint Nodes */}
                  {v.predictiveRisk.projectedPath.map((pt, pIdx) => (
                    <circle
                      key={`pt-${v.id}-${pIdx}`}
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? (pIdx === v.predictiveRisk.projectedPath.length - 1 ? '4' : '2.5') : '2'}
                      fill={isSelected ? '#38BDF8' : strokeColor}
                      stroke="#0F1216"
                      strokeWidth="1"
                      opacity={0.9}
                    />
                  ))}
                </>
              )}

              {/* Continuous Travelled Path Behind Moving Vehicle Along Road Network */}
              {v.breadcrumbs && v.breadcrumbs.length > 0 && (
                <path
                  ref={el => {
                    trailRefs.current[v.id] = el;
                    if (el) {
                      const anim = animStateRef.current[v.id];
                      const curX = anim ? anim.currentX : v.position.x;
                      const curY = anim ? anim.currentY : v.position.y;
                      const trailD = `M ${v.breadcrumbs.map(b => `${b.x} ${b.y}`).join(' L ')} L ${curX.toFixed(2)} ${curY.toFixed(2)}`;
                      el.setAttribute('d', trailD);
                    }
                  }}
                  fill="none"
                  stroke={isSelected ? '#38BDF8' : (isCritical ? '#F43F5E' : 'rgba(214, 211, 209, 0.40)')}
                  strokeWidth={isSelected ? '2.5' : '1.8'}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={isSelected ? 'none' : '4 3'}
                  opacity={isSelected ? 0.9 : 0.6}
                />
              )}

              {/* Discrete Historical Breadcrumbs */}
              {v.breadcrumbs.map((crumb, idx) => (
                <circle
                  key={`crumb-${v.id}-${idx}`}
                  cx={crumb.x}
                  cy={crumb.y}
                  r={isSelected ? '2' : '1.5'}
                  fill={isCritical ? '#F43F5E' : (isSelected ? '#38BDF8' : '#A1A1AA')}
                  opacity={((idx + 1) / v.breadcrumbs.length) * 0.55}
                />
              ))}
            </g>
          );
        })}

        {/* 6. Vehicle Markers with Silhouettes, Heading Pointers & TTZE Badges */}
        {vehicles.map((v) => {
          const isSelected = v.id === selectedVehicleId;
          const isCritical = v.predictiveRisk.tier === 'critical';
          const isWarning = v.predictiveRisk.tier === 'warning';
          const hasCountdown = v.predictiveRisk.timeToEntrySeconds !== null && v.predictiveRisk.timeToEntrySeconds > 0;

          const statusColor = isCritical ? '#E11D48' : (isWarning ? '#F59E0B' : '#10B981');
          const isExcavator = v.type?.toLowerCase().includes('excavator') || v.id.startsWith('EX-');
          const isDrill = v.type?.toLowerCase().includes('drill') || v.id.startsWith('DR-');
          const isLightVehicle = v.type?.toLowerCase().includes('light') || v.id.startsWith('LV-');

          return (
            <g
              key={v.id}
              ref={el => {
                vehicleRefs.current[v.id] = el;
                if (el) {
                  const anim = animStateRef.current[v.id];
                  const curX = anim ? anim.currentX : v.position.x;
                  const curY = anim ? anim.currentY : v.position.y;
                  el.setAttribute('transform', `translate(${curX.toFixed(2)}, ${curY.toFixed(2)})`);
                }
              }}
              onClick={() => onSelectVehicle(v.id)}
              className="cursor-pointer focus:outline-none"
              role="button"
              tabIndex={0}
              aria-label={`Unit ${v.id} (${v.name}), status ${v.activeStatus}, speed ${v.telemetry.speed.toFixed(0)} km/h`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectVehicle(v.id);
                }
              }}
            >
              {/* Refined Selection Reticle with Corner Precision Brackets */}
              {isSelected && (
                <g stroke="#FFFFFF" strokeWidth="1.6" fill="none" opacity="0.9">
                  <path d="M -18 -12 L -18 -18 L -12 -18" />
                  <path d="M 12 -18 L 18 -18 L 18 -12" />
                  <path d="M 18 12 L 18 18 L 12 18" />
                  <path d="M -12 18 L -18 18 L -18 12" />
                  <circle cx="0" cy="0" r="22" stroke="#FFFFFF" strokeWidth="0.75" strokeDasharray="3 3" opacity="0.35" />
                </g>
              )}

              {/* Rotatable Vehicle Direction Pointer / Chevron */}
              <g
                ref={el => {
                  chevronRefs.current[v.id] = el;
                  if (el) {
                    const anim = animStateRef.current[v.id];
                    const heading = anim ? anim.currentHeading : v.telemetry.heading;
                    el.setAttribute('transform', `rotate(${heading.toFixed(2)})`);
                  }
                }}
              >
                {/* Heading Arrow */}
                <path
                  d="M 0 -17 L 6 -10 L 0 -12 L -6 -10 Z"
                  fill={statusColor}
                  stroke="#0F1216"
                  strokeWidth="1.2"
                />
                <circle cx="0" cy="-16" r="1.5" fill="#FFFFFF" />
              </g>

              {/* Equipment Silhouette Marker Capsule */}
              <circle
                cx="0"
                cy="0"
                r="13"
                fill="#12151B"
                fillOpacity="0.92"
                stroke={isSelected ? '#FFFFFF' : statusColor}
                strokeWidth={isSelected ? 2 : 1.5}
              />

              {/* Equipment Vector Silhouette Icon */}
              <g transform="translate(-7, -7)" stroke={isSelected ? '#FFFFFF' : statusColor} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
                {isExcavator ? (
                  // Excavator / Shovel
                  <>
                    <rect x="1" y="10" width="10" height="3" rx="1" />
                    <path d="M2 10V7H7V10" />
                    <path d="M6 7L10 3L13 5" />
                    <path d="M13 5L14 8L12 7" fill={statusColor} fillOpacity="0.5" />
                  </>
                ) : isDrill ? (
                  // Rotary Drill Rig
                  <>
                    <rect x="2" y="10" width="9" height="3" rx="1" />
                    <path d="M3 10V7H7V10" />
                    <line x1="8" y1="2" x2="8" y2="10" strokeWidth="1.8" />
                    <line x1="6.5" y1="3" x2="9.5" y2="3" />
                  </>
                ) : isLightVehicle ? (
                  // Utility Pickup
                  <>
                    <path d="M1 9H3L4.5 5H9L10.5 9H13V11H1V9Z" />
                    <circle cx="3.5" cy="11.5" r="1.5" />
                    <circle cx="10.5" cy="11.5" r="1.5" />
                    <line x1="12" y1="9" x2="12" y2="3" />
                  </>
                ) : (
                  // Ultra-Class Haul Truck (CAT 797F)
                  <>
                    <path d="M1 10V7H3L4.5 4H7V10" />
                    <path d="M3 4H9L13 6V10H6" />
                    <circle cx="3.5" cy="11.5" r="1.5" />
                    <circle cx="10.5" cy="11.5" r="1.5" />
                  </>
                )}
              </g>

              {/* Equipment Callsign Monospace Badge */}
              <g transform="translate(0, 15)">
                <rect
                  x="-25"
                  y="0"
                  width="50"
                  height="16"
                  rx="4"
                  fill="#0E1116"
                  fillOpacity="0.9"
                  stroke={isSelected ? '#FFFFFF' : (isCritical ? '#E11D48' : 'rgba(255,255,255,0.18)')}
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="11.5"
                  textAnchor="middle"
                  fill="#EAEAEA"
                  fontSize="9.5"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="600"
                >
                  {v.id}
                </text>
              </g>

              {/* Operational TTZE Hazard Countdown Badge */}
              {hasCountdown && (
                <g transform="translate(0, -26)">
                  <rect
                    x="-40"
                    y="-9"
                    width="80"
                    height="18"
                    rx="5"
                    fill="#881326"
                    stroke="#F43F5E"
                    strokeWidth="1.2"
                  />
                  <text
                    x="0"
                    y="3.5"
                    textAnchor="middle"
                    fill="#FFE4E8"
                    fontSize="9.5"
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight="700"
                  >
                    TTZE: {v.predictiveRisk.timeToEntrySeconds}s
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Floating Top-Left: Map Mode Segmented Capsule */}
      <div className="absolute top-4 left-16 z-10 glass-panel p-1 rounded-2xl border border-white/10 shadow-glass flex items-center gap-1">
        {(['map', 'satellite', 'terrain'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setMapMode(mode)}
            aria-label={`Switch to ${mode} map view`}
            className={`px-3 py-1 text-xs font-sans capitalize rounded-xl transition-all ${
              mapMode === mode
                ? 'glass-panel-active text-neutral-100 font-medium border border-white/20 shadow-card'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            {mode === 'satellite' ? 'Satellite' : mode === 'terrain' ? 'Terrain' : 'Map'}
          </button>
        ))}
      </div>

      {/* Floating Top-Right: Map Navigation & Control Stack */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <div className="glass-panel flex flex-col rounded-2xl overflow-hidden border border-white/10 shadow-glass">
          <button
            onClick={handleLocateVehicle}
            className="p-2.5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors"
            title="Locate & Focus Vehicle"
            aria-label="Locate and focus selected vehicle on map"
          >
            <Crosshair className="w-4 h-4" />
          </button>
          <div className="h-px bg-white/10" />
          <button
            onClick={handleZoomIn}
            className="p-2.5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors"
            title="Zoom In"
            aria-label="Zoom in map"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="h-px bg-white/10" />
          <button
            onClick={handleZoomOut}
            className="p-2.5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors"
            title="Zoom Out"
            aria-label="Zoom out map"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="h-px bg-white/10" />
          <button
            onClick={handleResetView}
            className="p-2.5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors"
            title="Reset Map View"
            aria-label="Reset map view to default"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <div className="h-px bg-white/10" />
          <button
            onClick={() => setShowLayersMenu(prev => !prev)}
            className={`p-2.5 hover:bg-white/10 transition-colors ${showLayersMenu ? 'text-white bg-white/15' : 'text-neutral-300'}`}
            title="Toggle Map Overlays"
            aria-label="Toggle map overlay layers"
            aria-expanded={showLayersMenu}
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>

        {/* Layers Popover Menu */}
        {showLayersMenu && (
          <div className="glass-panel p-2.5 rounded-2xl border border-white/15 shadow-glass flex flex-col gap-2 text-xs font-sans text-neutral-200 w-36">
            <label className="flex items-center gap-2 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={showGeofences}
                onChange={e => setShowGeofences(e.target.checked)}
                className="rounded text-rose-500 focus:ring-0"
              />
              <span>Geofences</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={showRoads}
                onChange={e => setShowRoads(e.target.checked)}
                className="rounded text-amber-500 focus:ring-0"
              />
              <span>Haul Roads</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={showTrajectories}
                onChange={e => setShowTrajectories(e.target.checked)}
                className="rounded text-cyan-500 focus:ring-0"
              />
              <span>Trajectories</span>
            </label>
          </div>
        )}

        {/* Industrial Compass in Frosted Glass */}
        <div className="glass-panel p-2.5 rounded-2xl flex flex-col items-center justify-center border border-white/10 shadow-glass text-neutral-400">
          <Compass className="w-4 h-4 text-neutral-300" />
          <span className="text-[9px] font-mono mt-0.5 text-neutral-300 font-medium">N 0°</span>
        </div>
      </div>

      {/* Floating Bottom-Left: Cartographic Legend in Frosted Capsule */}
      <div className="absolute bottom-4 left-4 glass-panel px-4 py-2 rounded-full border border-white/10 flex items-center gap-3.5 text-xs font-sans text-neutral-300 shadow-glass">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-neutral-200">Healthy</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-neutral-200">Warning</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-400" />
          <span className="text-neutral-200">Critical</span>
        </div>
        <div className="flex items-center gap-1.5 border-l border-white/10 pl-3">
          <span className="w-3.5 h-0.5 border-t-2 border-dashed border-cyan-400" />
          <span className="text-neutral-200">Planned Route</span>
        </div>
        <div className="flex items-center gap-1.5 border-l border-white/10 pl-3">
          <span className="w-3.5 h-2.5 bg-rose-500/20 border border-rose-500/60 border-dashed rounded-xs" />
          <span className="text-neutral-200">Safety Zone</span>
        </div>
      </div>

      {/* Floating Bottom-Right: Engineering Scale Bar Capsule */}
      <div className="absolute bottom-4 right-4 glass-panel px-3.5 py-1.5 rounded-xl border border-white/10 shadow-glass flex flex-col items-end gap-1 font-mono text-[10px] text-neutral-300">
        <div className="flex items-center justify-between w-28 text-[9px] text-neutral-400">
          <span>0</span>
          <span>250</span>
          <span>500 m</span>
        </div>
        <div className="w-28 h-1.5 border-x border-b border-white/40 flex">
          <div className="w-1/2 h-full border-r border-white/25 bg-white/15" />
          <div className="w-1/2 h-full bg-white/5" />
        </div>
        <span className="text-[9px] text-neutral-400 font-sans tracking-wide">Scale 1:5,000 • WGS84 UTM 50S</span>
      </div>
    </div>
  );
};

export default MineMap;
