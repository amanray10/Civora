const axios = require('axios');

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const MAX_RADIUS_METERS = 4000;
const MAX_RESULTS = 6;

function haversineMeters(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusMeters = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function facilityType(tags = {}) {
  if (tags.amenity === 'fire_station' || tags.emergency === 'fire_station') return 'Fire Station';
  if (tags.amenity === 'hospital') return 'Hospital';
  if (tags.amenity === 'clinic' || tags.amenity === 'doctors') return 'Clinic';
  if (tags.amenity === 'pharmacy') return 'Pharmacy';
  if (tags.amenity === 'police') return 'Police Station';
  if (tags.emergency === 'ambulance_station') return 'Ambulance Station';
  if (tags.man_made === 'water_works') return 'Water Works';
  if (tags.power === 'substation') return 'Electricity Substation';
  if (tags.amenity === 'townhall') return 'Town Hall';
  if (tags.amenity === 'community_centre') return 'Community Centre';
  if (tags.amenity === 'waste_transfer_station') return 'Waste Facility';
  return tags.amenity || tags.emergency || tags.man_made || tags.power || 'Facility';
}

function facilityName(tags = {}) {
  return tags.name || tags.brand || tags.operator || facilityType(tags);
}

function elementCoordinates(element) {
  if (typeof element.lat === 'number' && typeof element.lon === 'number') {
    return { latitude: element.lat, longitude: element.lon };
  }
  if (element.center && typeof element.center.lat === 'number' && typeof element.center.lon === 'number') {
    return { latitude: element.center.lat, longitude: element.center.lon };
  }
  return null;
}

async function getNearbyFacilities(latitude, longitude, radius = MAX_RADIUS_METERS) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];

  const query = `
[out:json][timeout:25];
(
  node(around:${radius},${lat},${lon})["amenity"~"hospital|clinic|doctors|pharmacy|police|fire_station|townhall|community_centre|waste_transfer_station"];
  way(around:${radius},${lat},${lon})["amenity"~"hospital|clinic|doctors|pharmacy|police|fire_station|townhall|community_centre|waste_transfer_station"];
  relation(around:${radius},${lat},${lon})["amenity"~"hospital|clinic|doctors|pharmacy|police|fire_station|townhall|community_centre|waste_transfer_station"];
  node(around:${radius},${lat},${lon})["emergency"~"fire_station|ambulance_station"];
  way(around:${radius},${lat},${lon})["emergency"~"fire_station|ambulance_station"];
  relation(around:${radius},${lat},${lon})["emergency"~"fire_station|ambulance_station"];
  node(around:${radius},${lat},${lon})["man_made"="water_works"];
  way(around:${radius},${lat},${lon})["man_made"="water_works"];
  relation(around:${radius},${lat},${lon})["man_made"="water_works"];
  node(around:${radius},${lat},${lon})["power"="substation"];
  way(around:${radius},${lat},${lon})["power"="substation"];
  relation(around:${radius},${lat},${lon})["power"="substation"];
);
out center tags;`;

  const { data } = await axios.post(OVERPASS_URL, query, {
    timeout: 25000,
    headers: { 'Content-Type': 'text/plain' }
  });

  const seen = new Set();
  const facilities = [];

  for (const element of data.elements || []) {
    const coords = elementCoordinates(element);
    if (!coords) continue;

    const tags = element.tags || {};
    const name = facilityName(tags);
    const key = `${name}|${coords.latitude.toFixed(5)}|${coords.longitude.toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    facilities.push({
      name,
      type: facilityType(tags),
      latitude: coords.latitude,
      longitude: coords.longitude,
      distanceMeters: Math.round(haversineMeters(lat, lon, coords.latitude, coords.longitude))
    });
  }

  return facilities
    .filter((facility) => facility.distanceMeters <= radius)
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, MAX_RESULTS);
}

module.exports = { getNearbyFacilities };
