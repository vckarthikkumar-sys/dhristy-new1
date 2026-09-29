import React from 'react';
import { X, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart as ReBarChart, Bar, Cell } from 'recharts';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 24-hour historical safety events data
const timeTrendData = [
  { time: '00:00', incidents: 2, warnings: 5 },
  { time: '04:00', incidents: 1, warnings: 3 },
  { time: '08:00', incidents: 4, warnings: 9 },
  { time: '12:00', incidents: 6, warnings: 12 },
  { time: '16:00', incidents: 3, warnings: 8 },
  { time: '20:00', incidents: 2, warnings: 4 },
];

const zoneRiskData = [
  { zone: 'Blast Sector B-2', count: 18, color: '#FB7185' },
  { zone: 'Vent Shaft Borehole', count: 11, color: '#FBBF24' },
  { zone: 'Crusher Hopper Incline', count: 7, color: '#E0E0E0' },
  { zone: 'Fuel Depot Perimeter', count: 4, color: '#34D399' },
];

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none" role="dialog" aria-modal="true" aria-labelledby="analytics-modal-title">
      <div className="w-full max-w-4xl glass-panel rounded-2xl border border-white/15 shadow-glass overflow-hidden flex flex-col max-h-[90vh] backdrop-blur-2xl bg-[#121418]/90">
        {/* Modal Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl glass-panel-subtle flex items-center justify-center border border-white/10 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 id="analytics-modal-title" className="font-serif text-lg font-medium text-neutral-100">
                Fleet Safety Analytics
              </h2>
              <p className="font-serif-body text-xs text-neutral-400">
                24-hour safety metrics and safety zone event frequency
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Fleet Safety Analytics Modal"
            className="btn-chrome-secondary p-1.5 rounded-xl text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Top KPI Cards in Frosted Glass */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl glass-panel-subtle border border-white/10 flex flex-col">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">PREDICTED CONFLICTS</span>
              <span className="text-2xl font-sans font-bold text-neutral-100 mt-1 tabular-nums">42</span>
              <span className="text-[11px] font-sans text-emerald-400 mt-1">100% Intercepted</span>
            </div>

            <div className="p-4 rounded-xl glass-panel-subtle border border-white/10 flex flex-col">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">AVG TIME TO ZONE ENTRY</span>
              <span className="text-2xl font-sans font-bold text-neutral-100 mt-1 tabular-nums">14.2s</span>
              <span className="text-[11px] font-sans text-neutral-400 mt-1">Braking Window</span>
            </div>

            <div className="p-4 rounded-xl glass-panel-subtle border border-white/10 flex flex-col">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">FLEET COMPLIANCE</span>
              <span className="text-2xl font-sans font-bold text-emerald-400 mt-1 tabular-nums">99.4%</span>
              <span className="text-[11px] font-sans text-neutral-400 mt-1">Standard Operations</span>
            </div>

            <div className="p-4 rounded-xl glass-panel-subtle border border-white/10 flex flex-col">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">AVG RESPONSE TIME</span>
              <span className="text-2xl font-sans font-bold text-amber-300 mt-1 tabular-nums">2.8s</span>
              <span className="text-[11px] font-sans text-neutral-400 mt-1">Operator Response</span>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Trend Chart */}
            <div className="p-4 rounded-xl glass-panel-subtle border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-serif text-sm font-medium text-neutral-200">
                  Incident Rate Timeline (24h)
                </span>
                <span className="text-[10px] font-mono text-neutral-400">Hourly Frequency</span>
              </div>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeTrendData}>
                    <defs>
                      <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FB7185" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#FB7185" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" stroke="#757575" fontSize={10} />
                    <YAxis stroke="#757575" fontSize={10} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(18, 20, 24, 0.95)', borderColor: 'rgba(255, 255, 255, 0.15)', borderRadius: '12px', fontSize: '11px', color: '#EAEAEA' }}
                    />
                    <Area type="monotone" dataKey="incidents" stroke="#FB7185" strokeWidth={1.5} fillOpacity={1} fill="url(#colorInc)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Zone Risk Distribution Bar Chart */}
            <div className="p-4 rounded-xl glass-panel-subtle border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-serif text-sm font-medium text-neutral-200">
                  Incidents by Safety Zone
                </span>
                <span className="text-[10px] font-mono text-neutral-400">24h Breaches</span>
              </div>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ReBarChart data={zoneRiskData}>
                    <XAxis dataKey="zone" stroke="#757575" fontSize={9} />
                    <YAxis stroke="#757575" fontSize={10} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(18, 20, 24, 0.95)', borderColor: 'rgba(255, 255, 255, 0.15)', borderRadius: '12px', fontSize: '11px', color: '#EAEAEA' }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {zoneRiskData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </ReBarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
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

export default AnalyticsModal;
