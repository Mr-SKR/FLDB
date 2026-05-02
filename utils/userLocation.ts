const geoSettingsHigh = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
};

const geoSettingsLow = {
  enableHighAccuracy: false,
  timeout: 10000,
  maximumAge: 60000,
};

const getLocationPermissionState = async (): Promise<string> => {
  const result = await navigator.permissions.query({ name: "geolocation" });
  // result.state can be "granted" or "prompt" or "denied"
  return result.state;
};

const getAccurateLocation = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    // Try high accuracy first
    navigator.geolocation.getCurrentPosition(
      resolve,
      (err) => {
        // If high accuracy fails or times out, try low accuracy fallback
        console.warn(`High accuracy geolocation failed (${err.message}), falling back to low accuracy...`);
        navigator.geolocation.getCurrentPosition(resolve, reject, geoSettingsLow);
      },
      geoSettingsHigh
    );
  });
};

export { getLocationPermissionState, getAccurateLocation };
