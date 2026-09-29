import React from 'react';
import { Compass, ArrowLeft } from 'lucide-react';

interface NotFoundPageProps {
  onReturnToOperations: () => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onReturnToOperations }) => {
  return (
    <div className="min-h-screen w-screen bg-[#0B0D11] text-[#EAEAEA] flex items-center justify-center p-6 select-none font-sans">
      <div className="max-w-md w-full glass-panel p-8 rounded-2xl border border-white/15 bg-[#121418]/90 shadow-glass space-y-6 text-center">
        {/* DRISHTI Geometric Prism Emblem */}
        <div className="w-14 h-14 mx-auto rounded-2xl glass-panel-subtle flex items-center justify-center border border-white/15 text-neutral-300 shadow-card">
          <Compass className="w-7 h-7 text-amber-400" />
        </div>

        <div className="space-y-2">
          <div className="text-[11px] font-mono tracking-widest uppercase text-amber-400 font-semibold">
            Status 404 — Grid Coordinate Unresolved
          </div>
          <h1 className="font-serif text-2xl font-medium text-neutral-100">
            Page not found
          </h1>
          <p className="text-xs text-neutral-400 leading-relaxed">
            The requested DRISHTI resource or dispatch route could not be found within active mine telemetry sectors.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={onReturnToOperations}
            className="btn-chrome-primary w-full py-2.5 px-4 rounded-xl text-xs font-medium flex items-center justify-center gap-2 text-neutral-100"
            aria-label="Return to Operations Dashboard"
          >
            <ArrowLeft className="w-4 h-4 text-neutral-300" />
            <span>Return to Operations</span>
          </button>
        </div>

        <div className="text-[10.5px] font-mono text-neutral-500">
          DRISHTI Autonomous Mining Platform • Pit Alpha / Shaft Beta
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
