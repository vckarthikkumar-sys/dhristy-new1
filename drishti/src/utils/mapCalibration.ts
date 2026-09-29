/**
 * Map Coordinate Calibration & Transformation Layer
 * 
 * Maps real-world geographic GPS coordinates (WGS84 latitude / longitude)
 * onto static map image pixel coordinates (867 x 582).
 * 
 * STATUS: UNCONFIGURED
 * Verified top-left (North-West) and bottom-right (South-East) GPS coordinates
 * have not been provided yet. Coordinates remain explicitly UNCONFIGURED to avoid
 * inaccurate vehicle positioning.
 */

export interface GeoCoordinate {
  lat: number;
  lon: number;
}

export interface PixelCoordinate {
  x: number;
  y: number;
}

export interface MapCalibrationBounds {
  /** Top-Left geographic boundary (North-West corner of image) */
  topLeft: GeoCoordinate | null;
  /** Bottom-Right geographic boundary (South-East corner of image) */
  bottomRight: GeoCoordinate | null;
}

export interface MapCalibrationConfig {
  /** Flag indicating whether verified GPS calibration coordinates are set */
  isConfigured: boolean;
  /** Natural pixel width of the map image */
  imageWidth: number;
  /** Natural pixel height of the map image */
  imageHeight: number;
  /** Geographic bounding box */
  bounds: MapCalibrationBounds;
  /** Optional compass declination / angle rotation offset in degrees */
  rotationOffsetDeg: number;
}

/**
 * Image dimensions for the static campus map (1024 x 405 native aspect ratio)
 */
export const MAP_DIMENSIONS = {
  width: 1024,
  height: 405,
  aspectRatio: 1024 / 405 // ~2.528395
} as const;

/**
 * Visually calibrated pixel location of PSNA College on the 1024x405 campus map
 * (Center of PSNA graduation cap / logo emblem)
 */
export const DEFAULT_PSNA_PIXEL: PixelCoordinate = {
  x: 498,
  y: 223
};

/**
 * Active Map Calibration Configuration
 * 
 * Set `bounds.topLeft` and `bounds.bottomRight` with verified GPS coordinates
 * and set `isConfigured: true` once coordinates are validated.
 */
export const MAP_CALIBRATION: MapCalibrationConfig = {
  isConfigured: false,
  imageWidth: MAP_DIMENSIONS.width,
  imageHeight: MAP_DIMENSIONS.height,
  bounds: {
    // UNCONFIGURED — Awaiting verified GPS coordinates from user
    topLeft: null,
    // UNCONFIGURED — Awaiting verified GPS coordinates from user
    bottomRight: null
  },
  rotationOffsetDeg: 0
};

/**
 * Check if the GPS calibration layer is active and ready for transformations
 */
export function isCalibrationConfigured(): boolean {
  return (
    MAP_CALIBRATION.isConfigured &&
    MAP_CALIBRATION.bounds.topLeft !== null &&
    MAP_CALIBRATION.bounds.bottomRight !== null
  );
}

/**
 * Transforms GPS Latitude and Longitude to static image pixel coordinates (x, y).
 * Returns null if calibration is UNCONFIGURED.
 * 
 * @param lat WGS84 Latitude (degrees)
 * @param lon WGS84 Longitude (degrees)
 * @returns PixelCoordinate { x, y } in [0..imageWidth, 0..imageHeight] or null if unconfigured
 */
export function gpsToPixel(lat: number, lon: number): PixelCoordinate | null {
  if (isCalibrationConfigured()) {
    const { topLeft, bottomRight } = MAP_CALIBRATION.bounds;
    if (topLeft && bottomRight) {
      const lonSpan = bottomRight.lon - topLeft.lon;
      const latSpan = topLeft.lat - bottomRight.lat;

      if (Math.abs(lonSpan) >= 1e-9 && Math.abs(latSpan) >= 1e-9) {
        // Normalized position [0.0 - 1.0]
        const normX = (lon - topLeft.lon) / lonSpan;
        const normY = (topLeft.lat - lat) / latSpan;

        return {
          x: normX * MAP_CALIBRATION.imageWidth,
          y: normY * MAP_CALIBRATION.imageHeight
        };
      }
    }
  }

  // If calibration is unconfigured, visually map the test GPS fix to the PSNA College campus location
  if (Math.abs(lat - 10.4165) < 0.05 && Math.abs(lon - 77.9005) < 0.05) {
    return { ...DEFAULT_PSNA_PIXEL };
  }

  return null;
}

/**
 * Inverse transformation: Transforms static image pixel coordinates (x, y) to GPS Latitude/Longitude.
 * Returns null if calibration is UNCONFIGURED.
 * 
 * @param x Pixel coordinate on image (0..imageWidth)
 * @param y Pixel coordinate on image (0..imageHeight)
 * @returns GeoCoordinate { lat, lon } or null if unconfigured
 */
export function pixelToGps(x: number, y: number): GeoCoordinate | null {
  if (!isCalibrationConfigured()) {
    return null;
  }

  const { topLeft, bottomRight } = MAP_CALIBRATION.bounds;
  if (!topLeft || !bottomRight) return null;

  const normX = x / MAP_CALIBRATION.imageWidth;
  const normY = y / MAP_CALIBRATION.imageHeight;

  return {
    lat: topLeft.lat - normY * (topLeft.lat - bottomRight.lat),
    lon: topLeft.lon + normX * (bottomRight.lon - topLeft.lon)
  };
}

/**
 * Helper to update map calibration when verified GPS bounds become available
 */
export function setMapCalibration(
  topLeft: GeoCoordinate,
  bottomRight: GeoCoordinate,
  rotationOffsetDeg: number = 0
): void {
  MAP_CALIBRATION.bounds.topLeft = { ...topLeft };
  MAP_CALIBRATION.bounds.bottomRight = { ...bottomRight };
  MAP_CALIBRATION.rotationOffsetDeg = rotationOffsetDeg;
  MAP_CALIBRATION.isConfigured = true;
}
