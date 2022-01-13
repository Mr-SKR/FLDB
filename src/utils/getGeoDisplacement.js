const deg2rad = (deg) => {
  return deg * (Math.PI / 180);
};

// Calculate displacement using Haversine formula: https://en.wikipedia.org/wiki/Haversine_formula
const getDisplacementFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(parseFloat(lat2) - parseFloat(lat1)); // deg2rad below
  const dLon = deg2rad(parseFloat(lon2) - parseFloat(lon1));
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(parseFloat(lat1))) *
      Math.cos(deg2rad(parseFloat(lat2))) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

export { getDisplacementFromLatLonInKm };
