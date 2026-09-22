import React from 'react';
import { Vehicle } from '../types';
import { X, ShieldAlert, Square, Navigation, Play, AlertTriangle } from 'lucide-react';
import { VehicleEquipmentIcon } from './VehicleEquipmentIcon';

interface VehicleDetailsProps {
  vehicle: Vehicle | null;
  onClose: () => void;
  onSendCommand: (vehicleId: string, command: string) => void;
}

export const VehicleDetails: React.FC<VehicleDetailsProps> = ({
  vehicle,
  onClose,
  onSendCommand
}) => {
  if (!vehicle) return null;

  const isCritical = vehicle.predictiveRisk.tier === 'critical';
  const isWarning = vehicle.predictiveRisk.tier === 'warning';
  const hasTTZE = vehicle.predictiveRisk.timeToEntrySeconds !== null && vehicle.predictiveRisk.timeToEntrySeconds > 0;

  // Cardinal direction label for heading
  const headingDeg = vehicle.telemetry.heading;
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const cardinal = directions[Math.round(headingDeg / 45) % 8];

  return (
    <div className="w-full h-full flex flex-col select-none overflow-y-auto p-4 space-y-4">
      {/* Inspector Top Header */}
      <div className="space-y-2 pb-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <span className="font-serif text-xs text-neutral-400 font-medium tracking-wide">Vehicle Details</span>
          <button
            onClick={onClose}
            className="btn-chrome-secondary p-1 rounded-lg text-neutral-400 hover:text-white"
            title="Close Inspector"
            aria-label="Close Vehicle Inspector"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-start justify-between pt-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl glass-panel flex items-center justify-center border border-white/15 bg-white/[0.04]">
              <VehicleEquipmentIcon
                type={vehicle.type}
                className="w-5 h-5 text-neutral-200"
              />
            </div>
            <div>
              <h2 className="font-mono text-xl font-bold text-neutral-100 tracking-tight">
                {vehicle.id}
              </h2>
              <div className="font-serif text-xs text-neutral-300">
                {vehicle.name}
              </div>
            </div>
          </div>

          <span className={`text-[10.5px] font-sans px-2.5 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
            vehicle.activeStatus === 'emergency_halt'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/35'
              : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
          }`}>
            {vehicle.activeStatus === 'emergency_halt' ? 'Halted' : 'Active'}
          </span>
        </div>
      </div>

      {/* Safety Risk Assessment */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className={`w-3.5 h-3.5 ${isCritical ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'}`} />
            <span className="font-serif text-sm text-neutral-200 font-medium">Safety Risk</span>
          </div>
          <span className="font-sans text-base font-semibold text-neutral-100 tabular-nums">
            {vehicle.predictiveRisk.score} <span className="font-sans text-xs text-neutral-500 font-normal">/ 100</span>
          </span>
        </div>

        {/* Minimal Metallic Progress Bar */}
        <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/10 p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isCritical
                ? 'bg-rose-500'
                : isWarning
                ? 'bg-amber-400'
                : 'bg-emerald-400'
            }`}
            style={{ width: `${Math.max(4, vehicle.predictiveRisk.score)}%` }}
          />
        </div>

        {/* Operational Time to Zone Entry Callout */}
        {hasTTZE && (
          <div className="mt-3 p-3 rounded-xl glass-panel-subtle border border-rose-500/35 bg-rose-950/25 flex items-start gap-2.5 shadow-card">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <div className="text-xs font-serif text-rose-200 font-semibold">Safety Zone Conflict</div>
              <div className="text-xs font-sans text-neutral-200">
                Approaching <span className="font-semibold text-white">{vehicle.predictiveRisk.targetZoneName}</span>
              </div>
              <div className="text-xs font-mono text-rose-300 font-bold pt-0.5">
                Time to entry: {vehicle.predictiveRisk.timeToEntrySeconds}s
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Telemetry Section with Clean Vertical Spacing */}
      <div className="space-y-2 pt-2 border-t border-white/10">
        <div className="font-serif text-sm text-neutral-300 font-medium">
          Telemetry
        </div>

        <div className="space-y-1.5 font-sans text-xs">
          <div className="flex items-center justify-between py-1.5 border-b border-white/5">
            <span className="text-neutral-400">Speed</span>
            <span className="font-mono text-neutral-200 font-medium tabular-nums">{vehicle.telemetry.speed.toFixed(1)} km/h</span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-white/5">
            <span className="text-neutral-400">Heading</span>
            <span className="font-mono text-neutral-200 font-medium tabular-nums">{vehicle.telemetry.heading.toFixed(0)}° {cardinal}</span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-white/5">
            <span className="text-neutral-400">Fuel / Battery</span>
            <span className="font-mono text-neutral-200 font-medium tabular-nums">{vehicle.telemetry.fuelBatteryLevel}%</span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-white/5">
            <span className="text-neutral-400">Engine Temp</span>
            <span className="font-mono text-neutral-200 font-medium tabular-nums">{vehicle.telemetry.engineTemperatureC}°C</span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-white/5">
            <span className="text-neutral-400">Payload</span>
            <span className="font-mono text-neutral-200 font-medium tabular-nums">{vehicle.telemetry.payloadTons} t</span>
          </div>
        </div>
      </div>

      {/* Coordinates */}
      <div className="space-y-1.5 pt-1 border-t border-white/10">
        <div className="font-serif text-xs text-neutral-400">
          Mine Coordinates
        </div>
        <div className="glass-panel-subtle px-3 py-2 rounded-xl border border-white/10 font-mono text-xs text-neutral-300 flex items-center justify-between">
          <span>E {vehicle.position.x.toFixed(1)}</span>
          <span className="text-neutral-600">|</span>
          <span>N {vehicle.position.y.toFixed(1)}</span>
        </div>
      </div>

      {/* Operator Actions */}
      <div className="space-y-2 pt-2 border-t border-white/10 mt-auto">
        <div className="font-serif text-xs text-neutral-400">
          Operator Actions
        </div>

        <button
          onClick={() => onSendCommand(vehicle.id, 'emergency_halt')}
          aria-label={`Emergency halt Unit ${vehicle.id}`}
          className="btn-chrome-danger w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
          <span>Emergency halt</span>
        </button>

        <button
          onClick={() => onSendCommand(vehicle.id, 'divert_corridor_b')}
          aria-label={`Divert route for Unit ${vehicle.id}`}
          className="btn-chrome-secondary w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium"
        >
          <Navigation className="w-3.5 h-3.5 text-neutral-300" />
          <span>Divert route</span>
        </button>

        {vehicle.activeStatus === 'emergency_halt' && (
          <button
            onClick={() => onSendCommand(vehicle.id, 'resume_nominal')}
            aria-label={`Resume autonomous operations for Unit ${vehicle.id}`}
            className="btn-chrome-primary w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium text-emerald-300 border-emerald-500/30"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Resume autonomous</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default VehicleDetails;
