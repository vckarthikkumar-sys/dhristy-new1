import React, { useState, useEffect } from 'react';
import { Terminal, Truck, ShieldAlert, Layers, BarChart3, Activity, Zap, X } from 'lucide-react';
import { Vehicle, MineZone } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  zones: MineZone[];
  onSelectVehicle: (vehicleId: string) => void;
  onTriggerScenario: () => void;
  onOpenAnalytics: () => void;
  onOpenHealth: () => void;
  onSwitchSite: (siteId: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  vehicles,
  zones,
  onSelectVehicle,
  onTriggerScenario,
  onOpenAnalytics,
  onOpenHealth,
  onSwitchSite
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const filteredVehicles = vehicles.filter(v =>
    v.name.toLowerCase().includes(query.toLowerCase()) ||
    v.id.toLowerCase().includes(query.toLowerCase())
  );

  const filteredZones = zones.filter(z =>
    z.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4 select-none" role="dialog" aria-modal="true" aria-label="Operations Command Search Palette">
      <div className="w-full max-w-xl glass-panel rounded-2xl border border-white/15 shadow-glass overflow-hidden flex flex-col backdrop-blur-2xl bg-[#121418]/90">
        {/* Search Header */}
        <div className="p-3.5 border-b border-white/10 flex items-center gap-3 bg-white/[0.02]">
          <Terminal className="w-4 h-4 text-neutral-400" />
          <input
            autoFocus
            type="text"
            placeholder="Search vehicles, safety zones, or operations..."
            aria-label="Search vehicles, safety zones, or operations"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none font-sans"
          />
          <button
            onClick={onClose}
            aria-label="Close Command Palette"
            className="btn-chrome-secondary p-1 rounded-lg text-neutral-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Command Options List */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-3.5 text-xs">
          {/* Operational Actions */}
          <div className="space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 px-2">Operational Actions</div>
            <div className="space-y-1">
              <button
                onClick={() => { onTriggerScenario(); onClose(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl glass-panel-subtle hover:bg-white/[0.07] hover:border-white/15 text-neutral-200 transition-all text-left font-sans"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>Run Scenario Test (HT-04 Safety Zone Conflict)</span>
              </button>

              <button
                onClick={() => { onOpenAnalytics(); onClose(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl glass-panel-subtle hover:bg-white/[0.07] hover:border-white/15 text-neutral-200 transition-all text-left font-sans"
              >
                <BarChart3 className="w-4 h-4 text-neutral-300" />
                <span>Open Fleet Safety Analytics</span>
              </button>

              <button
                onClick={() => { onOpenHealth(); onClose(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl glass-panel-subtle hover:bg-white/[0.07] hover:border-white/15 text-neutral-200 transition-all text-left font-sans"
              >
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Open System Health & Diagnostics</span>
              </button>

              <button
                onClick={() => { onSwitchSite('site-underground-beta'); onClose(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl glass-panel-subtle hover:bg-white/[0.07] hover:border-white/15 text-neutral-200 transition-all text-left font-sans"
              >
                <Layers className="w-4 h-4 text-neutral-400" />
                <span>Switch Site: Shaft Beta — Sub-Level Decline</span>
              </button>
            </div>
          </div>

          {/* Vehicles Jump */}
          {filteredVehicles.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 px-2">Jump to Fleet Vehicle</div>
              <div className="space-y-1">
                {filteredVehicles.map(v => (
                  <button
                    key={v.id}
                    onClick={() => { onSelectVehicle(v.id); onClose(); }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl glass-panel-subtle hover:bg-white/[0.07] hover:border-white/15 text-neutral-200 transition-all text-left"
                  >
                    <div className="flex items-center gap-2.5 font-sans">
                      <Truck className="w-3.5 h-3.5 text-neutral-400" />
                      <span className="font-mono font-bold">{v.id}</span>
                      <span className="text-neutral-400 text-xs">— {v.name}</span>
                    </div>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-lg glass-panel-subtle text-neutral-400 border border-white/5">
                      {v.telemetry.speed.toFixed(0)} km/h
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Safety Zones */}
          {filteredZones.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 px-2">Safety Zones</div>
              <div className="space-y-1">
                {filteredZones.map(z => (
                  <div
                    key={z.id}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl glass-panel-subtle text-neutral-300"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    <span className="font-medium font-sans">{z.name}</span>
                    <span className="text-neutral-500 text-[10px] uppercase font-mono">({z.riskLevel})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 bg-white/[0.02] text-[11px] font-sans text-neutral-500 flex items-center justify-between px-4">
          <span>Navigate with click or Enter</span>
          <span className="font-mono text-[10px]">ESC to close</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
