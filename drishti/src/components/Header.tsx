import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, BarChart3, Terminal, Activity, MapPin, Play, RotateCcw, Clock, ChevronDown } from 'lucide-react';
import { SiteInfo } from '../types';

interface HeaderProps {
  sites: SiteInfo[];
  selectedSiteId: string;
  onSelectSite: (siteId: string) => void;
  isConnected: boolean;
  pingMs: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenAnalytics: () => void;
  onOpenHealth: () => void;
  onOpenCommandPalette: () => void;
  fleetMode: 'LIVE' | 'DEMO';
  onToggleFleetMode: () => void;
  onSendTestGpsFix?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  sites,
  selectedSiteId,
  onSelectSite,
  isConnected,
  pingMs,
  soundEnabled,
  onToggleSound,
  onOpenAnalytics,
  onOpenHealth,
  onOpenCommandPalette,
  fleetMode,
  onToggleFleetMode,
  onSendTestGpsFix
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [utcStr, setUtcStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour12: false }));
      setUtcStr(now.toUTCString().slice(17, 25) + ' UTC');
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-14 glass-panel border-x-0 border-t-0 px-4 sm:px-6 flex items-center justify-between z-40 shrink-0 select-none backdrop-blur-xl bg-[#121418]/85 border-b border-white/10">
      {/* Left: Brand Identity & Site Selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          {/* Geometrical Minimal Diamond Prism Emblem */}
          <div className="w-8 h-8 rounded-xl glass-panel-subtle flex items-center justify-center text-neutral-100 shrink-0 border border-white/15 shadow-card bg-white/[0.04]">
            <svg 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              className="w-4 h-4 text-neutral-200"
              strokeWidth="1.7" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>

          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="font-serif font-semibold tracking-tight text-lg text-neutral-100">
                DRISHTI
              </span>
            </div>
            <span className="text-[8.5px] tracking-[0.22em] uppercase text-neutral-400 font-sans font-semibold -mt-0.5">
              Autonomous Operations
            </span>
          </div>
        </div>

        {/* Translucent Site Selector Capsule */}
        <div className="hidden sm:flex items-center gap-1.5 glass-panel-subtle rounded-xl px-3 py-1.5 border border-white/10 relative">
          <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" aria-hidden="true" />
          <select
            id="site-selector"
            aria-label="Select Operational Mine Site"
            value={selectedSiteId}
            onChange={(e) => onSelectSite(e.target.value)}
            className="bg-transparent text-xs text-neutral-200 focus:outline-none cursor-pointer pr-4 font-medium font-sans appearance-none"
          >
            {sites.map(site => (
              <option key={site.id} value={site.id} className="bg-[#14161A] text-neutral-200">
                {site.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3 h-3 text-neutral-500 absolute right-2 pointer-events-none" aria-hidden="true" />
        </div>
      </div>

      {/* Center: Shift Clock & Quick Scenario Actions */}
      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 text-xs font-mono glass-panel-subtle border border-white/10 rounded-xl px-3.5 py-1.5 shadow-card" role="timer" aria-label={`Current Operations Clock: ${timeStr} Local, ${utcStr}`}>
          <Clock className="w-3.5 h-3.5 text-neutral-400" aria-hidden="true" />
          <span className="text-neutral-100 font-semibold tabular-nums">{timeStr}</span>
          <span className="text-neutral-600">|</span>
          <span className="text-neutral-400 tabular-nums">{utcStr}</span>
        </div>

        {/* Operational Scenario Drill Controls */}
        <div className="flex items-center gap-1.5">
          {/* Fleet Display Mode Toggle: LIVE (Thermal Fog) vs DEMO (Simulated) */}
          <button
            onClick={onToggleFleetMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-sans font-medium border transition-all ${
              fleetMode === 'LIVE'
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
                : 'btn-chrome-secondary text-neutral-300 border-white/10 hover:text-white'
            }`}
            title={`Current: ${fleetMode} MODE. Click to toggle between LIVE (HT-04 only) and DEMO (full simulated fleet)`}
            aria-label={`Toggle Fleet Mode: currently ${fleetMode} mode`}
          >
            <span className={`w-2 h-2 rounded-full ${fleetMode === 'LIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'}`} />
            <span>{fleetMode === 'LIVE' ? 'LIVE (HT-04)' : 'DEMO MODE'}</span>
          </button>

          {onSendTestGpsFix && (
            <button
              onClick={onSendTestGpsFix}
              className="btn-chrome-secondary flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/10 hover:border-cyan-400 transition-all shadow-sm"
              title="Transmit stationary PSNA College GPS fix (speed: 0 km/h)"
              aria-label="Send PSNA GPS Fix (Test Telemetry)"
            >
              <MapPin className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
              <span className="font-medium font-sans">Send PSNA GPS Fix</span>
            </button>
          )}
        </div>
      </div>

      {/* Right: Telemetry Health, Modals, Audio & Controller Profile */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Quick Command Jump (Ctrl+K) */}
        <button
          onClick={onOpenCommandPalette}
          className="btn-chrome-secondary hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs text-neutral-300"
          title="Command Search (Ctrl+K)"
          aria-label="Command Search Palette (Ctrl+K)"
        >
          <Terminal className="w-3.5 h-3.5 text-neutral-400" aria-hidden="true" />
          <span className="font-mono text-[10px] text-neutral-400">Ctrl+K</span>
        </button>

        {/* Fleet Safety Analytics */}
        <button
          onClick={onOpenAnalytics}
          className="btn-chrome-secondary flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-neutral-300"
          title="Fleet Analytics & Incidents"
          aria-label="Open Fleet Safety Analytics"
        >
          <BarChart3 className="w-3.5 h-3.5 text-neutral-300" aria-hidden="true" />
          <span className="hidden xl:inline font-sans">Analytics</span>
        </button>

        {/* System Health */}
        <button
          onClick={onOpenHealth}
          className="btn-chrome-secondary flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-neutral-300"
          title="System Health & Diagnostics"
          aria-label="Open System Health and Diagnostics"
        >
          <Activity className="w-3.5 h-3.5 text-neutral-300" aria-hidden="true" />
          <span className="hidden xl:inline font-sans">Health</span>
        </button>

        {/* Sound toggle */}
        <button
          onClick={onToggleSound}
          className={`btn-chrome-secondary p-2 rounded-xl transition-all ${
            soundEnabled ? 'text-neutral-200' : 'text-neutral-500'
          }`}
          title={soundEnabled ? 'Mute Alert Audio' : 'Enable Alert Audio'}
          aria-label={soundEnabled ? 'Mute Alert Audio' : 'Enable Alert Audio'}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" aria-hidden="true" /> : <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />}
        </button>

        {/* Connection Status Pill */}
        <div
          className="glass-panel-subtle flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono text-[11px] text-neutral-300 border border-white/10 shadow-card"
          role="status"
          aria-label={`Connection status: ${isConnected ? 'Online' : 'Offline'}, latency: ${pingMs}ms`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} aria-hidden="true" />
          <span className={isConnected ? 'text-neutral-200 font-medium' : 'text-rose-400'}>
            {isConnected ? 'ONLINE' : 'OFFLINE'}
          </span>
          <span className="text-neutral-600">|</span>
          <span className="text-neutral-400 tabular-nums">{pingMs}ms</span>
        </div>

        {/* Controller Avatar Capsule */}
        <div
          className="w-8 h-8 rounded-full glass-panel flex items-center justify-center border border-white/20 bg-white/[0.06] text-neutral-200 text-xs font-mono font-bold shadow-card"
          title="Operations Dispatcher Console"
          aria-label="Operations Dispatcher Console"
          role="img"
        >
          OP
        </div>
      </div>
    </header>
  );
};

export default Header;
