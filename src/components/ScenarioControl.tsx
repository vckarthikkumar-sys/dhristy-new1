import React from 'react';
import { Play, RotateCcw, ArrowRight, Square, Activity, CheckCircle2 } from 'lucide-react';
import { Vehicle } from '../types';

interface ScenarioControlProps {
  vehicles: Vehicle[];
  onTriggerScenario: () => void;
  onResetScenario: () => void;
  onEmergencyHalt: (vehicleId: string) => void;
}

export const ScenarioControl: React.FC<ScenarioControlProps> = ({
  vehicles,
  onTriggerScenario,
  onResetScenario,
  onEmergencyHalt
}) => {
  // Target vehicle for the breach simulation drill
  const targetVehicle = vehicles.find(v => v.id === 'HT-04') || vehicles.find(v => v.predictiveRisk.tier === 'critical') || vehicles[0];
  const isBreachApproaching = targetVehicle &&
    targetVehicle.predictiveRisk.timeToEntrySeconds !== null &&
    targetVehicle.predictiveRisk.timeToEntrySeconds > 0;
  const isHalted = targetVehicle?.activeStatus === 'emergency_halt';
  const isBreached = targetVehicle && targetVehicle.predictiveRisk.tier === 'critical' && (!targetVehicle.predictiveRisk.timeToEntrySeconds || targetVehicle.predictiveRisk.timeToEntrySeconds <= 0);

  return (
    <div className="glass-panel border-x-0 border-b-0 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs z-30 shrink-0 select-none backdrop-blur-xl bg-[#121418]/85 border-t border-white/10">
      {/* Simulation Scenario Sequence Progress */}
      <div className="flex items-center gap-3">
        <div className="glass-panel-subtle flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-neutral-200">
          <Activity className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-serif font-semibold text-xs text-neutral-100">Scenario Workflow:</span>
        </div>

        {/* 4-Step Operational Sequence */}
        <div className="hidden lg:flex items-center gap-2 text-xs font-sans">
          {/* Step 1: Vehicle Transit */}
          <div className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
            !isBreachApproaching && !isHalted
              ? 'glass-panel-active text-neutral-100 border border-white/20 font-medium'
              : 'text-neutral-400'
          }`}>
            <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-mono">1</span>
            <span>Vehicle Transit</span>
          </div>

          <ArrowRight className="w-3 h-3 text-neutral-600" />

          {/* Step 2: Path & TTZE Calculation */}
          <div className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
            isBreachApproaching && !isHalted
              ? 'glass-panel-active text-amber-300 border border-amber-500/30 font-medium bg-amber-950/20'
              : 'text-neutral-400'
          }`}>
            <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-mono">2</span>
            <span>Path & TTZE Calculation</span>
          </div>

          <ArrowRight className="w-3 h-3 text-neutral-600" />

          {/* Step 3: Safety Zone Conflict */}
          <div className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
            (isBreachApproaching || isBreached) && !isHalted
              ? 'glass-panel-active text-rose-300 border border-rose-500/40 font-medium bg-rose-950/30 animate-pulse'
              : 'text-neutral-400'
          }`}>
            <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-mono">3</span>
            <span>Safety Zone Conflict</span>
          </div>

          <ArrowRight className="w-3 h-3 text-neutral-600" />

          {/* Step 4: Emergency Intervention */}
          <div className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
            isHalted
              ? 'glass-panel-active text-emerald-300 border border-emerald-500/35 font-medium bg-emerald-950/25'
              : 'text-neutral-400'
          }`}>
            <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-mono">
              {isHalted ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : '4'}
            </span>
            <span>Emergency Intervention</span>
          </div>
        </div>
      </div>

      {/* Control Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onTriggerScenario}
          aria-label={`Run test scenario drill for Unit ${targetVehicle?.id || 'HT-04'}`}
          className="btn-chrome-secondary flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-sans text-neutral-200 hover:text-white"
          title="Run test drill: trigger HT-04 zone breach drill"
        >
          <Play className="w-3 h-3 text-amber-400/90 fill-current" />
          <span className="font-medium">Run Scenario ({targetVehicle?.id || 'HT-04'})</span>
        </button>

        {isBreachApproaching && !isHalted && targetVehicle && (
          <button
            onClick={() => onEmergencyHalt(targetVehicle.id)}
            aria-label={`Emergency halt Unit ${targetVehicle.id}`}
            className="btn-chrome-danger flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold animate-pulse"
          >
            <Square className="w-3 h-3 fill-current" />
            <span>Halt {targetVehicle.id} ({targetVehicle.predictiveRisk.timeToEntrySeconds}s)</span>
          </button>
        )}

        <button
          onClick={onResetScenario}
          aria-label="Reset fleet simulation positions"
          className="btn-chrome-secondary p-2 rounded-xl text-neutral-400 hover:text-white"
          title="Reset Simulation Positions"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default ScenarioControl;
