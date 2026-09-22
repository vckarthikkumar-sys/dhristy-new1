import React from 'react';
import { SafetyAlert } from '../types';
import { AlertOctagon, CheckCircle2 } from 'lucide-react';

interface AlertFeedProps {
  alerts: SafetyAlert[];
  onAcknowledgeAlert: (alertId: string) => void;
  onSelectVehicle: (vehicleId: string) => void;
}

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 4) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  return `${Math.floor(diffMin / 60)}h ago`;
}

export const AlertFeed: React.FC<AlertFeedProps> = ({
  alerts,
  onAcknowledgeAlert,
  onSelectVehicle
}) => {
  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;

  return (
    <div className="w-full h-full flex flex-col select-none overflow-hidden">
      {/* Feed Sub-Header */}
      <div className="p-3.5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-neutral-400" />
          <span className="font-serif font-medium text-sm text-neutral-200">
            Active Alerts Feed
          </span>
        </div>
        {unacknowledgedCount > 0 ? (
          <span className="glass-panel-subtle text-[10px] font-mono px-2 py-0.5 rounded-lg text-rose-300 border border-rose-500/20 font-medium">
            {unacknowledgedCount} Unread
          </span>
        ) : (
          <span className="glass-panel-subtle text-[10px] font-mono px-2 py-0.5 rounded-lg text-emerald-400 border border-emerald-500/20 font-medium">
            All Clear
          </span>
        )}
      </div>

      {/* Alerts Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {alerts.length === 0 ? (
          <div className="text-center py-12 text-xs font-serif text-neutral-400 flex flex-col items-center">
            <CheckCircle2 className="w-7 h-7 text-emerald-400/60 mb-2" />
            <span className="font-medium text-neutral-200">No Active Alerts</span>
            <span className="text-[11px] text-neutral-500 mt-1">Safety zone monitoring active</span>
          </div>
        ) : (
          [...alerts].reverse().map(alert => {
            const isCritical = alert.severity === 'critical';
            const isWarning = alert.severity === 'warning';

            return (
              <div
                key={alert.id}
                className={`p-3 rounded-xl border transition-all duration-200 space-y-2 ${
                  alert.acknowledged
                    ? 'glass-panel-subtle border-white/5 opacity-60'
                    : isCritical
                    ? 'glass-panel-subtle border-rose-500/30 bg-rose-950/20'
                    : isWarning
                    ? 'glass-panel-subtle border-amber-500/30 bg-amber-950/20'
                    : 'glass-panel-subtle border-white/10'
                }`}
              >
                {/* Header: Status Dot, Severity, Unit ID, Timestamp */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-400'
                    }`} />
                    <button
                      onClick={() => onSelectVehicle(alert.vehicleId)}
                      className="font-mono font-bold text-xs text-neutral-100 hover:text-white hover:underline transition-colors"
                      title="Inspect Vehicle Telemetry"
                    >
                      Unit {alert.vehicleId}
                    </button>
                    <span className={`text-[9px] font-sans uppercase px-1.5 py-0.2 rounded-full ${
                      isCritical ? 'text-rose-300' : isWarning ? 'text-amber-300' : 'text-emerald-300'
                    }`}>
                      {alert.severity}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-neutral-500 tabular-nums">
                    {formatRelativeTime(alert.timestamp)}
                  </span>
                </div>

                {/* Alert Message */}
                <div className="text-xs text-neutral-300 font-sans leading-relaxed">
                  {alert.message}
                </div>

                {/* Footer: TTZE / Zone and Acknowledge Button */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                  {alert.timeToEntry !== undefined ? (
                    <span className="font-mono text-rose-300 font-medium text-[11px]">
                      Entry: {alert.timeToEntry}s
                    </span>
                  ) : (
                    <span className="font-serif text-neutral-400 text-[11px]">
                      {alert.zoneName || 'Perimeter'}
                    </span>
                  )}

                  {!alert.acknowledged ? (
                    <button
                      onClick={() => onAcknowledgeAlert(alert.id)}
                      aria-label={`Acknowledge ${alert.severity} alert for Unit ${alert.vehicleId}`}
                      className="btn-chrome-secondary ml-auto px-2.5 py-1 rounded-lg text-[11px] font-sans text-neutral-200"
                    >
                      Acknowledge
                    </button>
                  ) : (
                    <span className="ml-auto text-neutral-500 font-sans text-[11px] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Acknowledged</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AlertFeed;
