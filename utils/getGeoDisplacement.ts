const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
};

// Calculate displacement using Haversine formula: https://en.wikipedia.org/wiki/Haversine_formula
const getDisplacementFromLatLonInKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1); // deg2rad below
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

/**
 * Rounds a distance to what is actually shown to a reader: one decimal place.
 *
 * Shared by the feed cards and the "Restaurants nearby" list so the two cannot disagree
 * about the same pair of coordinates. The feed used `Math.ceil`, which rendered every
 * distance under a kilometre as "1 km away", so a place across the street and one a
 * fifteen-minute walk away were indistinguishable, on the one screen whose entire purpose
 * is proximity.
 */
const roundDistanceKm = (km: number): number => Math.round(km * 10) / 10;

export { getDisplacementFromLatLonInKm, roundDistanceKm };
