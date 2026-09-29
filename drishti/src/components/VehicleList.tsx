import React, { useState } from 'react';
import { Vehicle, RiskLevel } from '../types';
import { Truck, Search, Clock } from 'lucide-react';
import { VehicleEquipmentIcon } from './VehicleEquipmentIcon';

interface VehicleListProps {
  vehicles: Vehicle[];
  selectedVehicleId: string | null;
  onSelectVehicle: (vehicleId: string) => void;
}

export const VehicleList: React.FC<VehicleListProps> = ({
  vehicles,
  selectedVehicleId,
  onSelectVehicle
}) => {
  const [filterTier, setFilterTier] = useState<RiskLevel | 'all'>('all');
  const [search, setSearch] = useState('');

  const safeCount = vehicles.filter(v => v.predictiveRisk.tier === 'safe').length;
  const warningCount = vehicles.filter(v => v.predictiveRisk.tier === 'warning').length;
  const criticalCount = vehicles.filter(v => v.predictiveRisk.tier === 'critical').length;

  const filtered = vehicles.filter(v => {
    const matchesTier = filterTier === 'all' || v.predictiveRisk.tier === filterTier;
    const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase()) ||
                          v.id.toLowerCase().includes(search.toLowerCase());
    return matchesTier && matchesSearch;
  });

  return (
    <div className="w-80 h-full glass-panel border-r border-y-0 border-l-0 border-white/10 flex flex-col z-20 shrink-0 select-none backdrop-blur-xl bg-[#121418]/80">
      {/* Fleet Status Header */}
      <div className="p-3.5 border-b border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-neutral-400" />
            <span className="font-serif font-medium text-base text-neutral-100">
              Fleet Status
            </span>
          </div>
          <span className="glass-panel-subtle text-[10px] font-mono px-2 py-0.5 rounded-lg text-neutral-300 border border-white/10">
            {vehicles.length} Units
          </span>
        </div>

        {/* Minimal Frosted Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search callsign or model..."
            aria-label="Search vehicles by callsign or model"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full glass-panel-subtle border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-white/25 transition-all"
          />
        </div>

        {/* Filter Segmented Control with Counts */}
        <div className="grid grid-cols-4 gap-1">
          {([
            { tier: 'all', label: `All (${vehicles.length})` },
            { tier: 'safe', label: `Healthy (${safeCount})` },
            { tier: 'warning', label: `Warn (${warningCount})` },
            { tier: 'critical', label: `Crit (${criticalCount})` }
          ] as const).map(({ tier, label }) => {
            const isSelected = filterTier === tier;
            return (
              <button
                key={tier}
                onClick={() => setFilterTier(tier)}
                aria-label={`Filter fleet roster by ${tier} tier`}
                className={`py-1 text-[10.5px] font-sans rounded-lg transition-all text-center ${
                  isSelected
                    ? 'glass-panel-active text-neutral-100 font-medium border border-white/25 shadow-card'
                    : 'glass-panel-subtle text-neutral-400 hover:text-neutral-200 hover:border-white/10 border border-white/5'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Vehicle List Cards */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-xs font-serif text-neutral-500">
            No vehicles match filter criteria
          </div>
        ) : (
          filtered.map(v => {
            const isSelected = v.id === selectedVehicleId;
            const isCritical = v.predictiveRisk.tier === 'critical';
            const isWarning = v.predictiveRisk.tier === 'warning';
            const hasCountdown = v.predictiveRisk.timeToEntrySeconds !== null && v.predictiveRisk.timeToEntrySeconds > 0;

            const accentBorderColor = isSelected
              ? 'border-l-cyan-400'
              : isCritical
              ? 'border-l-rose-500'
              : isWarning
              ? 'border-l-amber-400'
              : 'border-l-emerald-500';

            return (
              <div
                key={v.id}
                role="button"
                tabIndex={0}
                aria-label={`Select vehicle ${v.id}, ${v.name}, status ${v.activeStatus}, speed ${v.telemetry.speed.toFixed(0)} km/h`}
                onClick={() => onSelectVehicle(v.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectVehicle(v.id);
                  }
                }}
                className={`p-3 rounded-xl border border-l-[3.5px] transition-all duration-200 cursor-pointer select-none relative ${accentBorderColor} ${
                  isSelected
                    ? 'glass-panel-active border-white/30 bg-white/[0.08] shadow-glass ring-1 ring-white/15'
                    : isCritical
                    ? 'glass-panel-subtle border-rose-500/25 hover:border-rose-500/40 bg-rose-950/15'
                    : isWarning
                    ? 'glass-panel-subtle border-amber-500/25 hover:border-amber-500/40 bg-amber-950/15'
                    : 'glass-panel-subtle border-white/[0.06] hover:border-white/20 hover:bg-white/[0.05]'
                }`}
              >
                {/* Top row: Status Dot, Silhouette, ID, Signal, Status Pill */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      isCritical ? 'bg-rose-500 animate-pulse' : (isWarning ? 'bg-amber-400' : 'bg-emerald-400')
                    }`} aria-hidden="true" />
                    <VehicleEquipmentIcon
                      type={v.type}
                      className="w-4 h-4 text-neutral-400"
                    />
                    <span className="font-mono font-bold text-xs text-neutral-100">{v.id}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Signal bars */}
                    <div className="flex items-end gap-0.5 h-3" title={`Signal: ${v.telemetry.signalStrength}/4`} aria-label={`Signal strength: ${v.telemetry.signalStrength} of 4`}>
                      {[1, 2, 3, 4].map(bar => (
                        <div
                          key={bar}
                          className={`w-0.5 rounded-t ${bar <= v.telemetry.signalStrength ? 'bg-neutral-300' : 'bg-neutral-700'}`}
                          style={{ height: `${bar * 25}%` }}
                        />
                      ))}
                    </div>

                    {/* Status Badge */}
                    <span className={`text-[10px] font-sans px-2 py-0.5 rounded-lg uppercase tracking-wider font-medium ${
                      isCritical
                        ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        : isWarning
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {isCritical ? 'Critical' : isWarning ? 'Warning' : 'Healthy'}
                    </span>
                  </div>
                </div>

                {/* Sub row: Machine title & operating status */}
                <div className="flex items-center justify-between text-xs text-neutral-400 mt-1.5 font-sans">
                  <span className="truncate pr-2">{v.name}</span>
                  <span className={`text-[9.5px] uppercase font-mono px-1.5 py-0.2 rounded ${
                    v.activeStatus === 'emergency_halt'
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-white/5 text-neutral-400'
                  }`}>
                    {v.activeStatus === 'emergency_halt' ? 'Halted' : v.activeStatus}
                  </span>
                </div>

                {/* Bottom row: Speed, Heading, Payload */}
                <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mt-2.5 pt-2 border-t border-white/5">
                  <span>
                    Speed: <strong className="text-neutral-200 font-medium">{v.telemetry.speed.toFixed(0)} km/h</strong>
                  </span>
                  <span>
                    Hdg: <strong className="text-neutral-200 font-medium">{v.telemetry.heading.toFixed(0)}°</strong>
                  </span>
                  <span>
                    Load: <strong className="text-neutral-200 font-medium">{v.telemetry.payloadTons}t</strong>
                  </span>
                </div>

                {/* Operational Safety Zone Conflict Alert */}
                {hasCountdown && (
                  <div className="mt-2.5 flex items-center justify-between glass-panel-subtle border border-rose-500/30 bg-rose-950/20 rounded-lg px-2.5 py-1 text-[11px] font-mono text-rose-300">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-rose-400" />
                      <span>Time to Zone Entry:</span>
                    </div>
                    <strong className="text-rose-200 font-bold">{v.predictiveRisk.timeToEntrySeconds}s</strong>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default VehicleList;
