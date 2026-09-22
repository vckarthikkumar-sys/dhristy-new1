import React from 'react';
import { ShieldCheck, AlertOctagon, Clock, Square } from 'lucide-react';
import { Vehicle, SiteInfo } from '../types';

interface PredictiveSafetyBarProps {
  site?: SiteInfo;
  vehicles: Vehicle[];
  onSelectVehicle: (vehicleId: string) => void;
  onEmergencyHalt: (vehicleId: string) => void;
}

export const PredictiveSafetyBar: React.FC<PredictiveSafetyBarProps> = ({
  site,
  vehicles,
  onSelectVehicle,
  onEmergencyHalt
}) => {
  const safeCount = vehicles.filter(v => v.predictiveRisk.tier === 'safe').length;
  const warningCount = vehicles.filter(v => v.predictiveRisk.tier === 'warning').length;
  const criticalCount = vehicles.filter(v => v.predictiveRisk.tier === 'critical').length;

  // Find vehicle with lowest positive TTZE
  const highestRiskVehicle = vehicles
    .filter(v => v.predictiveRisk.tier === 'critical' || v.predictiveRisk.tier === 'warning')
    .sort((a, b) => (a.predictiveRisk.timeToEntrySeconds ?? 999) - (b.predictiveRisk.timeToEntrySeconds ?? 999))[0];

  const hasCriticalTTZE = highestRiskVehicle &&
    highestRiskVehicle.predictiveRisk.timeToEntrySeconds !== null &&
    highestRiskVehicle.predictiveRisk.timeToEntrySeconds > 0;

  return (
    <div className="glass-panel border-x-0 border-t-0 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs select-none shrink-0 backdrop-blur-xl bg-[#121418]/70 border-b border-white/10">
      {/* Site Safety Index & Metric Pills */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="font-serif text-sm text-neutral-300 font-medium">Site Safety Index:</span>
          <span className="font-sans text-lg font-bold text-neutral-100 tabular-nums">
            {site ? `${site.overallSafetyIndex}%` : '94%'}
          </span>
          <span className="glass-panel-subtle text-[10px] font-mono px-2 py-0.5 rounded-lg text-emerald-400 border border-emerald-500/25 font-semibold tracking-wide uppercase">
            Nominal
          </span>
        </div>

        <div className="flex items-center gap-2 border-l border-white/10 pl-4 text-xs font-sans">
          <div className="glass-panel-subtle px-2.5 py-1 rounded-lg flex items-center gap-1.5 border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-neutral-400">Healthy:</span>
            <span className="text-neutral-200 font-semibold font-mono">{safeCount}</span>
          </div>

          <div className="glass-panel-subtle px-2.5 py-1 rounded-lg flex items-center gap-1.5 border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-neutral-400">Warning:</span>
            <span className="text-amber-300 font-semibold font-mono">{warningCount}</span>
          </div>

          <div className="glass-panel-subtle px-2.5 py-1 rounded-lg flex items-center gap-1.5 border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span className="text-neutral-400">Critical:</span>
            <span className="text-rose-300 font-bold font-mono">{criticalCount}</span>
          </div>
        </div>
      </div>

      {/* Operational Safety Zone Conflict Alert Banner */}
      {highestRiskVehicle && hasCriticalTTZE ? (
        <div className="glass-panel px-3.5 py-1.5 rounded-xl border border-rose-500/35 bg-rose-950/30 flex items-center gap-3 text-xs shadow-card">
          <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
          <div className="flex items-center gap-1.5 font-sans">
            <span className="font-serif text-rose-300 font-semibold tracking-wide">Safety Zone Conflict:</span>
            <button
              onClick={() => onSelectVehicle(highestRiskVehicle.id)}
              className="text-neutral-100 font-mono font-bold hover:underline"
            >
              Unit {highestRiskVehicle.id}
            </button>
            <span className="text-neutral-400">approaching</span>
            <span className="text-amber-300 font-semibold">{highestRiskVehicle.predictiveRisk.targetZoneName}</span>
          </div>

          <div className="glass-panel-subtle px-2.5 py-1 rounded-lg border border-rose-500/30 flex items-center gap-1.5 font-mono">
            <Clock className="w-3 h-3 text-rose-400" />
            <span className="text-neutral-400 text-[10px]">Time to Entry:</span>
            <span className="font-bold text-rose-300 text-xs tabular-nums">
              {highestRiskVehicle.predictiveRisk.timeToEntrySeconds}s
            </span>
          </div>

          <button
            onClick={() => onEmergencyHalt(highestRiskVehicle.id)}
            className="btn-chrome-danger flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold"
          >
            <Square className="w-3 h-3 fill-current" />
            <span>Emergency Halt</span>
          </button>
        </div>
      ) : (
        <div className="hidden lg:flex items-center gap-2 text-neutral-400 font-serif text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
          <span>Safety Zones Monitored • 30s Trajectory Forecasting Active • Proximity Armed</span>
        </div>
      )}
    </div>
  );
};

export default PredictiveSafetyBar;
