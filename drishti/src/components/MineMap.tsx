import React, { useState, useRef, useCallback } from 'react';
import { Vehicle, MineZone } from '../types';
import { ZoomIn, ZoomOut, Maximize2, Compass, Crosshair } from 'lucide-react';
import { MAP_DIMENSIONS, DEFAULT_PSNA_PIXEL, gpsToPixel } from '../utils/mapCalibration';

interface MineMapProps {
  vehicles: Vehicle[];
  zones: MineZone[];
  selectedVehicleId: string | null;
  onSelectVehicle: (vehicleId: string) => void;
}

export const MineMap: React.FC<MineMapProps> = ({
  vehicles,
  zones: _zones,
  selectedVehicleId,
  onSelectVehicle
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Resolve pixel position on the 1024 x 405 PSNA campus map
  const getVehiclePixel = useCallback((v: Vehicle): { x: number; y: number } | null => {
    const lat = v.position.lat ?? (v.position as any).latitude;
    const lon = v.position.lon ?? v.position.lng ?? (v.position as any).longitude;

    if (typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon)) {
      const calibrated = gpsToPixel(lat, lon);
      if (calibrated) return calibrated;
    }

    if (typeof v.position.x === 'number' && typeof v.position.y === 'number' && (v.position.x !== 0 || v.position.y !== 0)) {
      return { x: v.position.x, y: v.position.y };
    }

    return null;
  }, []);

  const validVehicles = vehicles
    .map(v => ({ vehicle: v, pixel: getVehiclePixel(v) }))
    .filter((item): item is { vehicle: Vehicle; pixel: { x: number; y: number } } => item.pixel !== null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).tagName === 'svg' ||
      (e.target as HTMLElement).id === 'map-background' ||
      (e.target as HTMLElement).tagName === 'image' ||
      (e.target as HTMLElement).tagName === 'rect'
    ) {
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

  const handleZoomIn = () => setZoom(prev => Math.min(3.0, prev + 0.25));
  const handleZoomOut = () => setZoom(prev => Math.max(0.6, prev - 0.25));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleLocateVehicle = () => {
    const target = validVehicles.find(item => item.vehicle.id === selectedVehicleId) || validVehicles[0];
    if (target) {
      const centerX = MAP_DIMENSIONS.width / 2;
      const centerY = MAP_DIMENSIONS.height / 2;
      setPan({
        x: (centerX - target.pixel.x) * zoom,
        y: (centerY - target.pixel.y) * zoom
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
      {/* Floating Status: Awaiting Live Telemetry State */}
      {validVehicles.length === 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 glass-panel px-4 py-2 rounded-xl border border-white/10 shadow-glass flex items-center gap-2.5 text-xs font-sans text-neutral-300">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>Awaiting Live Vehicle Telemetry</span>
        </div>
      )}

      {/* Primary Static Map Canvas (1024 x 405 Native Aspect Ratio) */}
      <svg
        viewBox={`0 0 ${MAP_DIMENSIONS.width} ${MAP_DIMENSIONS.height}`}
        className="w-full h-full"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.15s ease-out'
        }}
      >
        {/* Base Layer: Dark Canvas Backing & Static PSNA Campus Map */}
        <g id="campus-map-base-layer">
          <rect width={MAP_DIMENSIONS.width} height={MAP_DIMENSIONS.height} fill="#0E1217" />
          <image
            href="/assets/psna-campus-map.png"
            x="0"
            y="0"
            width={MAP_DIMENSIONS.width}
            height={MAP_DIMENSIONS.height}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Campus map of PSNA College of Engineering and Technology"
          >
            <title>PSNA College Campus Map</title>
          </image>
        </g>

        {/* Live Stationary Vehicle Markers (Direct Pixel Placement — No Fake Movement) */}
        {validVehicles.map(({ vehicle: v, pixel }) => {
          const isSelected = v.id === selectedVehicleId;
          const isCritical = v.predictiveRisk.tier === 'critical';
          const isWarning = v.predictiveRisk.tier === 'warning';
          const statusColor = isCritical ? '#E11D48' : (isWarning ? '#F59E0B' : '#10B981');
          const heading = v.telemetry.heading || 0;

          const isExcavator = v.type?.toLowerCase().includes('excavator') || v.id.startsWith('EX-');
          const isDrill = v.type?.toLowerCase().includes('drill') || v.id.startsWith('DR-');
          const isLightVehicle = v.type?.toLowerCase().includes('light') || v.id.startsWith('LV-');

          return (
            <g
              key={v.id}
              transform={`translate(${pixel.x.toFixed(2)}, ${pixel.y.toFixed(2)})`}
              onClick={(e) => {
                e.stopPropagation();
                onSelectVehicle(v.id);
              }}
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
              {/* Precision Selection Reticle Brackets */}
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
              <g transform={`rotate(${heading})`}>
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
                fillOpacity="0.94"
                stroke={isSelected ? '#FFFFFF' : statusColor}
                strokeWidth={isSelected ? 2 : 1.5}
              />

              {/* Equipment Vector Silhouette Icon */}
              <g transform="translate(-7, -7)" stroke={isSelected ? '#FFFFFF' : statusColor} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
                {isExcavator ? (
                  <>
                    <rect x="1" y="10" width="10" height="3" rx="1" />
                    <path d="M2 10V7H7V10" />
                    <path d="M6 7L10 3L13 5" />
                    <path d="M13 5L14 8L12 7" fill={statusColor} fillOpacity="0.5" />
                  </>
                ) : isDrill ? (
                  <>
                    <rect x="2" y="10" width="9" height="3" rx="1" />
                    <path d="M3 10V7H7V10" />
                    <line x1="8" y1="2" x2="8" y2="10" strokeWidth="1.8" />
                    <line x1="6.5" y1="3" x2="9.5" y2="3" />
                  </>
                ) : isLightVehicle ? (
                  <>
                    <path d="M1 9H3L4.5 5H9L10.5 9H13V11H1V9Z" />
                    <circle cx="3.5" cy="11.5" r="1.5" />
                    <circle cx="10.5" cy="11.5" r="1.5" />
                    <line x1="12" y1="9" x2="12" y2="3" />
                  </>
                ) : (
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
                  x="-24"
                  y="0"
                  width="48"
                  height="15"
                  rx="3.5"
                  fill="#0E1116"
                  fillOpacity="0.92"
                  stroke={isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.22)'}
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="11"
                  textAnchor="middle"
                  fill="#EAEAEA"
                  fontSize="9"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="600"
                >
                  {v.id}
                </text>
              </g>
            </g>
          );
        })}
      </svg>

      {/* Floating Top-Right: Map Navigation & Control Stack */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
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
            aria-label="Reset map view"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Industrial Compass in Frosted Glass */}
        <div className="glass-panel p-2.5 rounded-2xl flex flex-col items-center justify-center border border-white/10 shadow-glass text-neutral-400">
          <Compass className="w-4 h-4 text-neutral-300" />
          <span className="text-[9px] font-mono mt-0.5 text-neutral-300 font-medium">N 0°</span>
        </div>
      </div>

      {/* Floating Bottom-Left: Cartographic Legend */}
      <div className="absolute bottom-4 left-4 z-20 glass-panel px-4 py-2 rounded-full border border-white/10 flex items-center gap-3.5 text-xs font-sans text-neutral-300 shadow-glass">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-neutral-200">Healthy</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-neutral-200">Warning</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span className="text-neutral-200">Critical</span>
        </div>
      </div>
    </div>
  );
};

export default MineMap;
