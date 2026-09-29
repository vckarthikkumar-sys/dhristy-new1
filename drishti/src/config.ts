/**
 * DRISHTI Operational Configuration
 *
 * Controls whether the platform runs in LIVE MODE (showing exclusively externally connected
 * vehicles like HT-04 receiving real/mock Thermal Fog telemetry) or DEMO MODE (full simulated fleet).
 */
export type FleetDisplayMode = 'LIVE' | 'DEMO';

/**
 * Default Fleet Display Mode for DRISHTI.
 * Set to 'LIVE' for Thermal Fog integration testing (shows only HT-04).
 * Set to 'DEMO' to see all 8 simulated fleet vehicles.
 */
export const DEFAULT_FLEET_MODE: FleetDisplayMode = 'LIVE';

/**
 * The target vehicle connected to the Thermal Fog detection engine.
 */
export const LIVE_VEHICLE_ID = 'HT-04';
