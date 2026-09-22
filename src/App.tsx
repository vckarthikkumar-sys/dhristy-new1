import React, { useState, useEffect, useRef } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useSoundEffects } from './hooks/useSoundEffects';
import { Header } from './components/Header';
import { PredictiveSafetyBar } from './components/PredictiveSafetyBar';
import { VehicleList } from './components/VehicleList';
import { MineMap } from './components/MineMap';
import { VehicleDetails } from './components/VehicleDetails';
import { AlertFeed } from './components/AlertFeed';
import { ScenarioControl } from './components/ScenarioControl';
import { CommandPalette } from './components/CommandPalette';
import { AnalyticsModal } from './components/AnalyticsModal';
import { SystemHealthModal } from './components/SystemHealthModal';
import { NotFoundPage } from './components/NotFoundPage';
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Truck, AlertOctagon } from 'lucide-react';

export const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('site-pit-alpha');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>('HT-02');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isFleetDrawerOpen, setIsFleetDrawerOpen] = useState<boolean>(true);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState<boolean>(true);
  const [activeRightTab, setActiveRightTab] = useState<'vehicle' | 'alerts'>('vehicle');

  // Modals
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState<boolean>(false);
  const [isHealthOpen, setIsHealthOpen] = useState<boolean>(false);

  // Real-time WebSocket hook
  const {
    isConnected,
    pingMs,
    sites,
    zones,
    vehicles,
    alerts,
    metrics,
    acknowledgeAlert,
    sendVehicleCommand,
    triggerScenario,
    resetScenario
  } = useWebSocket(selectedSiteId);

  // Web Audio synthetic sound effects
  const { playCriticalAlert, playWarningChime, playAcknowledgeTone } = useSoundEffects(soundEnabled);
  const prevAlertCountRef = useRef<number>(0);

  // Global keyboard shortcut for Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle browser back/forward and routing
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Update dynamic page title
  useEffect(() => {
    if (currentPath !== '/' && currentPath !== '' && !currentPath.startsWith('/#')) {
      document.title = 'DRISHTI — Resource Not Found';
    } else {
      document.title = 'DRISHTI — Mining Operations';
    }
  }, [currentPath]);

  const handleReturnToOperations = () => {
    window.history.pushState({}, '', '/');
    setCurrentPath('/');
  };

  // Play audio alert on new incidents
  useEffect(() => {
    if (alerts.length > prevAlertCountRef.current && prevAlertCountRef.current > 0) {
      const latestAlert = alerts[alerts.length - 1];
      if (latestAlert.severity === 'critical') {
        playCriticalAlert();
      } else if (latestAlert.severity === 'warning') {
        playWarningChime();
      }
    }
    prevAlertCountRef.current = alerts.length;
  }, [alerts, playCriticalAlert, playWarningChime]);

  if (currentPath !== '/' && currentPath !== '' && !currentPath.startsWith('/#')) {
    return <NotFoundPage onReturnToOperations={handleReturnToOperations} />;
  }

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId) || null;
  const currentSite = sites.find(s => s.id === selectedSiteId);
  const unacknowledgedAlertCount = alerts.filter(a => !a.acknowledged).length;

  const handleSelectVehicle = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setActiveRightTab('vehicle');
    setIsRightDrawerOpen(true);
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    playAcknowledgeTone();
    acknowledgeAlert(alertId);
  };

  const handleEmergencyHalt = (vehicleId: string) => {
    sendVehicleCommand(vehicleId, 'emergency_halt');
    playAcknowledgeTone();
  };

  const handleTriggerScenario = () => {
    triggerScenario('blast_breach');
    setSelectedVehicleId('HT-04');
    setActiveRightTab('vehicle');
    setIsRightDrawerOpen(true);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[var(--bg-canvas)] text-[#EAEAEA] overflow-hidden select-none font-sans">
      {/* 1. Frosted Glass Header Bar */}
      <Header
        sites={sites}
        selectedSiteId={selectedSiteId}
        onSelectSite={setSelectedSiteId}
        isConnected={isConnected}
        pingMs={pingMs}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(prev => !prev)}
        onOpenAnalytics={() => setIsAnalyticsOpen(true)}
        onOpenHealth={() => setIsHealthOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onTriggerScenario={handleTriggerScenario}
        onResetScenario={resetScenario}
      />

      {/* 2. Predictive Safety Annunciator Strip */}
      <PredictiveSafetyBar
        site={currentSite}
        vehicles={vehicles}
        onSelectVehicle={handleSelectVehicle}
        onEmergencyHalt={handleEmergencyHalt}
      />

      {/* 3. Main Workspace Area — Map Dominant */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Fleet Status Roster */}
        {isFleetDrawerOpen && (
          <VehicleList
            vehicles={vehicles}
            selectedVehicleId={selectedVehicleId}
            onSelectVehicle={handleSelectVehicle}
          />
        )}

        {/* Center: Primary Cartographic CAD Mine Map */}
        <div className="flex-1 relative h-full">
          {/* Left Drawer Toggle */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-1">
            <button
              onClick={() => setIsFleetDrawerOpen(prev => !prev)}
              className="p-2 rounded-xl glass-panel text-neutral-400 hover:text-white border border-white/10 shadow-glass transition-all"
              title={isFleetDrawerOpen ? "Collapse Fleet Status" : "Expand Fleet Status"}
              aria-label={isFleetDrawerOpen ? "Collapse Fleet Status" : "Expand Fleet Status"}
            >
              {isFleetDrawerOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>
          </div>

          <MineMap
            vehicles={vehicles}
            zones={zones}
            selectedVehicleId={selectedVehicleId}
            onSelectVehicle={handleSelectVehicle}
          />

          {/* Right Drawer Toggle */}
          <div className="absolute top-4 right-16 z-20 flex items-center gap-1">
            <button
              onClick={() => setIsRightDrawerOpen(prev => !prev)}
              className="p-2 rounded-xl glass-panel text-neutral-400 hover:text-white border border-white/10 shadow-glass transition-all"
              title={isRightDrawerOpen ? "Collapse Operations Panel" : "Expand Operations Panel"}
              aria-label={isRightDrawerOpen ? "Collapse Operations Panel" : "Expand Operations Panel"}
            >
              {isRightDrawerOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Right Operations Drawer: Dual Tabbed (Vehicle Details / Active Alerts) */}
        {isRightDrawerOpen && (
          <div className="w-80 h-full glass-panel border-l border-y-0 border-r-0 border-white/10 flex flex-col z-20 shrink-0 select-none backdrop-blur-xl bg-[#121418]/70">
            {/* Tab Selector Header */}
            <div className="flex items-center border-b border-white/10 bg-white/[0.02] text-xs font-sans">
              <button
                onClick={() => setActiveRightTab('vehicle')}
                disabled={!selectedVehicle}
                aria-label={selectedVehicle ? `Inspect Unit ${selectedVehicle.id} telemetry` : "Vehicle inspector (no vehicle selected)"}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 border-r border-white/10 transition-all font-medium ${
                  activeRightTab === 'vehicle' && selectedVehicle
                    ? 'glass-panel-active text-neutral-100 border-b-2 border-b-white/40'
                    : (selectedVehicle ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 cursor-not-allowed')
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>{selectedVehicle ? `Unit ${selectedVehicle.id}` : 'Vehicle'}</span>
              </button>

              <button
                onClick={() => setActiveRightTab('alerts')}
                aria-label={`Active alerts feed (${unacknowledgedAlertCount} unacknowledged)`}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 transition-all font-medium ${
                  activeRightTab === 'alerts' || !selectedVehicle
                    ? 'glass-panel-active text-neutral-100 border-b-2 border-b-white/40'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                <span>Active Alerts</span>
                {unacknowledgedAlertCount > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-bold">
                    {unacknowledgedAlertCount}
                  </span>
                )}
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {activeRightTab === 'vehicle' && selectedVehicle ? (
                <VehicleDetails
                  vehicle={selectedVehicle}
                  onClose={() => {
                    setSelectedVehicleId(null);
                    setActiveRightTab('alerts');
                  }}
                  onSendCommand={sendVehicleCommand}
                />
              ) : (
                <AlertFeed
                  alerts={alerts}
                  onAcknowledgeAlert={handleAcknowledgeAlert}
                  onSelectVehicle={handleSelectVehicle}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. Frosted Glass Scenario Control Bar */}
      <ScenarioControl
        vehicles={vehicles}
        onTriggerScenario={handleTriggerScenario}
        onResetScenario={resetScenario}
        onEmergencyHalt={handleEmergencyHalt}
      />

      {/* 5. Command Search Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        vehicles={vehicles}
        zones={zones}
        onSelectVehicle={handleSelectVehicle}
        onTriggerScenario={handleTriggerScenario}
        onOpenAnalytics={() => setIsAnalyticsOpen(true)}
        onOpenHealth={() => setIsHealthOpen(true)}
        onSwitchSite={setSelectedSiteId}
      />

      {/* 6. Fleet Safety Analytics Modal */}
      <AnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
      />

      {/* 7. System Health Diagnostics Modal */}
      <SystemHealthModal
        isOpen={isHealthOpen}
        onClose={() => setIsHealthOpen(false)}
        metrics={metrics}
      />
    </div>
  );
};

export default App;
