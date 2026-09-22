import React from 'react';
import { X, Activity, ExternalLink, Cpu, HardDrive, Wifi } from 'lucide-react';
import { SystemMetrics } from '../types';

interface SystemHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  metrics: SystemMetrics | null;
}

export const SystemHealthModal: React.FC<SystemHealthModalProps> = ({ isOpen, onClose, metrics }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none" role="dialog" aria-modal="true" aria-labelledby="system-health-modal-title">
      <div className="w-full max-w-3xl glass-panel rounded-2xl border border-white/15 shadow-glass overflow-hidden flex flex-col backdrop-blur-2xl bg-[#121418]/90">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl glass-panel-subtle flex items-center justify-center border border-white/10 text-emerald-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h2 id="system-health-modal-title" className="font-serif text-lg font-medium text-neutral-100">
                System Health & Telemetry Diagnostics
              </h2>
              <p className="font-serif-body text-xs text-neutral-400">
                Real-time pipeline performance, worker latencies, and node resources
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close System Health Diagnostics Modal"
            className="btn-chrome-secondary p-1.5 rounded-xl text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Real-time Telemetry Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl glass-panel-subtle border border-white/10">
              <div className="flex items-center gap-1.5 text-neutral-400 text-[10px] font-mono uppercase tracking-wider">
                <Activity className="w-3.5 h-3.5 text-neutral-300" />
                <span>INGESTION RATE</span>
              </div>
              <div className="text-2xl font-sans font-bold text-neutral-100 mt-1.5 tabular-nums">
                {metrics?.eventsPerSecond ?? 22} <span className="text-xs font-sans text-neutral-500 font-normal">ev/s</span>
              </div>
            </div>

            <div className="p-4 rounded-xl glass-panel-subtle border border-white/10">
              <div className="flex items-center gap-1.5 text-neutral-400 text-[10px] font-mono uppercase tracking-wider">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>ALERT LATENCY</span>
              </div>
              <div className="text-2xl font-sans font-bold text-emerald-400 mt-1.5 tabular-nums">
                {metrics?.alertLatencyMs ?? 2.1} <span className="text-xs font-sans text-neutral-500 font-normal">ms</span>
              </div>
            </div>

            <div className="p-4 rounded-xl glass-panel-subtle border border-white/10">
              <div className="flex items-center gap-1.5 text-neutral-400 text-[10px] font-mono uppercase tracking-wider">
                <HardDrive className="w-3.5 h-3.5 text-amber-300" />
                <span>HEAP MEMORY</span>
              </div>
              <div className="text-2xl font-sans font-bold text-neutral-100 mt-1.5 tabular-nums">
                {metrics?.memoryUsageMb ?? 48} <span className="text-xs font-sans text-neutral-500 font-normal">MB</span>
              </div>
            </div>

            <div className="p-4 rounded-xl glass-panel-subtle border border-white/10">
              <div className="flex items-center gap-1.5 text-neutral-400 text-[10px] font-mono uppercase tracking-wider">
                <Cpu className="w-3.5 h-3.5 text-neutral-300" />
                <span>PREDICTIONS</span>
              </div>
              <div className="text-2xl font-sans font-bold text-neutral-100 mt-1.5 tabular-nums">
                {metrics?.predictiveCalculationsPerSec ?? 140} <span className="text-xs font-sans text-neutral-500 font-normal">/s</span>
              </div>
            </div>
          </div>

          {/* Infrastructure Endpoints */}
          <div className="space-y-3">
            <div className="font-serif text-sm font-medium text-neutral-200">
              Infrastructure Endpoints
            </div>

            <div className="space-y-2 font-mono text-xs">
              <div className="p-3 rounded-xl glass-panel-subtle border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-neutral-200">Prometheus Telemetry:</span>
                  <span className="text-neutral-400">/metrics</span>
                </div>
                <a
                  href="/metrics"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-neutral-300 hover:text-white transition-colors"
                >
                  <span>Endpoint</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="p-3 rounded-xl glass-panel-subtle border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-neutral-200">OpenAPI Documentation:</span>
                  <span className="text-neutral-400">/api/v1/docs</span>
                </div>
                <a
                  href="/api/v1/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-neutral-300 hover:text-white transition-colors"
                >
                  <span>Swagger Docs</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="p-3 rounded-xl glass-panel-subtle border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-neutral-200">WebSocket Ingestion:</span>
                  <span className="text-neutral-400">ws://localhost:4000</span>
                </div>
                <span className="glass-panel-subtle text-[10px] font-mono px-2 py-0.5 rounded-lg text-emerald-400 border border-emerald-500/20">
                  Connected
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-white/10 bg-white/[0.02] flex items-center justify-end">
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="btn-chrome-secondary px-4 py-1.5 rounded-xl text-xs font-sans text-neutral-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemHealthModal;
