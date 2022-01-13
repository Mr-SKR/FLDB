const revokePermission = () => {
  navigator.permissions.revoke({ name: "geolocation" }).then(function (result) {
    console.log(`Permission: ${result.state}`);
  });
};

const geoSettings = {
  enableHighAccuracy: true,
};

const getLocationPermissionState = async () => {
  const result = await navigator.permissions.query({ name: "geolocation" });
  // result.state can be "granted" or "prompt" or "denied"
  return result.state;
};

// const LocationError = (err) => {
//   console.error(`ERROR(${err.code}): ${err.message}`);
// };

const getAccurateLocation = () => {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, geoSettings);
  });
};

export { getLocationPermissionState, revokePermission, getAccurateLocation };
