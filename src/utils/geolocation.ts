/**
 * Geolocation utilities including Haversine distance calculation
 */

const EARTH_RADIUS_METERS = 6371000;

/**
 * Haversine formula to calculate distance between two geographic points
 * @param lat1 - Latitude of first point (degrees)
 * @param lon1 - Longitude of first point (degrees)
 * @param lat2 - Latitude of second point (degrees)
 * @param lon2 - Longitude of second point (degrees)
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_METERS * c;

  return distance;
}

/**
 * Calculate current speed based on distance and time delta
 * @param distanceDelta - Distance in meters
 * @param timeDelta - Time in seconds
 * @returns Speed in m/s
 */
export function calculateSpeed(
  distanceDelta: number,
  timeDelta: number,
): number {
  if (timeDelta === 0) return 0;
  return distanceDelta / timeDelta;
}

/**
 * Calculate pace from distance and total elapsed time
 * @param distance - Total distance in meters
 * @param elapsedTime - Total elapsed time in seconds
 * @returns Pace in minutes per kilometer
 */
export function calculatePace(distance: number, elapsedTime: number): number {
  if (distance === 0 || elapsedTime === 0) return 0;

  const distanceKm = distance / 1000;
  const timeMinutes = elapsedTime / 60;
  const paceMinPerKm = timeMinutes / distanceKm;

  return paceMinPerKm;
}

/**
 * Format distance from meters to kilometers
 * @param meters - Distance in meters
 * @returns Formatted distance string (e.g., "5.42 km")
 */
export function formatDistance(meters: number): string {
  const km = meters / 1000;
  return `${km.toFixed(2)}`;
}

/**
 * Format speed from m/s to km/h
 * @param mps - Speed in meters per second
 * @returns Speed in km/h
 */
export function speedMpsToKmh(mps: number): number {
  return mps * 3.6;
}

/**
 * Format pace from min/km to string
 * @param paceMinPerKm - Pace in minutes per kilometer
 * @returns Formatted pace string (e.g., "5:30")
 */
export function formatPace(paceMinPerKm: number): string {
  if (paceMinPerKm === 0) return "-- : --";

  const minutes = Math.floor(paceMinPerKm);
  const seconds = Math.round((paceMinPerKm - minutes) * 60);

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Parse geolocation error codes
 */
export function getGeolocationErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return "Location permission denied. Please enable location access.";
    case 2:
      return "Location unavailable. Check your GPS/network.";
    case 3:
      return "Location request timeout. Try again.";
    default:
      return "Unknown location error.";
  }
}
