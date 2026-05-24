// Find nearest IMS stations with radiation sensor capability
const config = $('Load Config').first().json;
const items = $input.all();
const stations = items.map(item => item.json);

const LATITUDE = config.location.latitude;
const LONGITUDE = config.location.longitude;

// Filter stations with valid location data
const validStations = stations.filter(s =>
  s.location && s.location.latitude != null && s.location.longitude != null
);

// Sort by Euclidean distance from home coordinates
const sorted = validStations.map(s => {
  const dist = Math.sqrt(
    Math.pow(s.location.latitude - LATITUDE, 2) +
    Math.pow(s.location.longitude - LONGITUDE, 2)
  );
  return { station: s, distance: dist };
}).sort((a, b) => a.distance - b.distance);

// Return top N candidates
const candidates = sorted.slice(0, config.weather.stationSearchCount).map(s => ({
  stationId: s.station.stationId,
  name: s.station.name,
  distance: s.distance
}));

return [{ json: { candidates } }];
