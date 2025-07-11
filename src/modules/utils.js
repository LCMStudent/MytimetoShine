/**
 * Shared utility functions for the Solarized app.
 */

/**
 * Converts azimuth angle to a compass direction.
 * @param {number} azimuth - The azimuth angle (0-360).
 * @returns {string} The compass direction (e.g., 'North', 'Southeast').
 */
export function getAzimuthDirection(azimuth) {
  const directions = [
    { min: 337.5, max: 360, name: 'North' },
    { min: 0, max: 22.5, name: 'North' },
    { min: 22.5, max: 67.5, name: 'Northeast' },
    { min: 67.5, max: 112.5, name: 'East' },
    { min: 112.5, max: 157.5, name: 'Southeast' },
    { min: 157.5, max: 202.5, name: 'South' },
    { min: 202.5, max: 247.5, name: 'Southwest' },
    { min: 247.5, max: 292.5, name: 'West' },
    { min: 292.5, max: 337.5, name: 'Northwest' },
  ];

  const normalizedAzimuth = ((azimuth % 360) + 360) % 360;
  const direction = directions.find(d => normalizedAzimuth >= d.min && normalizedAzimuth < d.max);
  return direction ? direction.name : 'Unknown';
}
