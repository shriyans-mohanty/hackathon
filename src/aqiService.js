// aqiService.js - Real-time AQI Data Service (FINAL VERSION)

const AQICN_TOKEN = '68086de3edc42e96c1d735c945305df90d445e82';
const BASE_URL = 'https://api.waqi.info';

// Delhi monitoring stations with their actual IDs from AQICN
const DELHI_STATIONS = [
  { id: '@8872', name: 'Anand Vihar', zone: 'East', lat: 28.6469, lng: 77.3162 },
  { id: '@8873', name: 'Ashok Vihar', zone: 'North', lat: 28.6952, lng: 77.1822 },
  { id: '@8874', name: 'Aya Nagar', zone: 'South', lat: 28.4707, lng: 77.1099 },
  { id: '@8875', name: 'Bawana', zone: 'North-West', lat: 28.7951, lng: 77.0391 },
  { id: '@8876', name: 'Dwarka', zone: 'West', lat: 28.5921, lng: 77.0460 },
  { id: '@8877', name: 'ITO', zone: 'Central', lat: 28.6289, lng: 77.2496 },
  { id: '@8878', name: 'Jahangirpuri', zone: 'North', lat: 28.7330, lng: 77.1636 },
  { id: '@8879', name: 'Lodhi Road', zone: 'Central', lat: 28.5918, lng: 77.2273 },
  { id: '@8880', name: 'Mandir Marg', zone: 'Central', lat: 28.6369, lng: 77.2015 },
  { id: '@8881', name: 'Mundka', zone: 'West', lat: 28.6842, lng: 77.0352 },
  { id: '@8882', name: 'Najafgarh', zone: 'South-West', lat: 28.6093, lng: 76.9798 },
  { id: '@8883', name: 'Nehru Nagar', zone: 'East', lat: 28.5675, lng: 77.2505 },
  { id: '@8884', name: 'Okhla Phase-2', zone: 'South', lat: 28.5304, lng: 77.2707 },
  { id: '@8885', name: 'Patparganj', zone: 'East', lat: 28.6254, lng: 77.3084 },
  { id: '@8886', name: 'Punjabi Bagh', zone: 'West', lat: 28.6743, lng: 77.1311 },
  { id: '@8887', name: 'RK Puram', zone: 'South', lat: 28.5631, lng: 77.1827 },
  { id: '@8888', name: 'Rohini', zone: 'North-West', lat: 28.7417, lng: 77.1167 },
  { id: '@8889', name: 'Shadipur', zone: 'West', lat: 28.6517, lng: 77.1584 },
  { id: '@8890', name: 'Sirifort', zone: 'South', lat: 28.5494, lng: 77.2177 },
  { id: '@8891', name: 'Sonia Vihar', zone: 'North-East', lat: 28.7178, lng: 77.2497 },
  { id: '@8892', name: 'Vivek Vihar', zone: 'East', lat: 28.6725, lng: 77.3150 },
  { id: '@8893', name: 'Wazirpur', zone: 'North', lat: 28.6995, lng: 77.1640 },
];

// Fetch real-time AQI data for a specific station
export const fetchStationData = async (stationId) => {
  try {
    const response = await fetch(`${BASE_URL}/feed/${stationId}/?token=${AQICN_TOKEN}`);
    const data = await response.json();
    
    if (data.status === 'ok' && data.data) {
      return {
        success: true,
        data: {
          aqi: data.data.aqi,
          station: data.data.city?.name || 'Unknown',
          time: data.data.time?.s || new Date().toISOString(),
          pollutants: {
            pm25: data.data.iaqi?.pm25?.v || null,
            pm10: data.data.iaqi?.pm10?.v || null,
            no2: data.data.iaqi?.no2?.v || null,
            so2: data.data.iaqi?.so2?.v || null,
            co: data.data.iaqi?.co?.v || null,
            o3: data.data.iaqi?.o3?.v || null,
          },
          dominantPollutant: data.data.dominentpol || 'pm25',
          location: {
            lat: data.data.city?.geo?.[0] || null,
            lng: data.data.city?.geo?.[1] || null,
          },
          forecast: data.data.forecast || null,
        }
      };
    }
    
    return { success: false, error: 'No data available' };
  } catch (error) {
    console.error('Error fetching station data:', error);
    return { success: false, error: error.message };
  }
};

// Fetch data for all Delhi stations
export const fetchAllDelhiStations = async () => {
  try {
    const promises = DELHI_STATIONS.map(station => 
      fetchStationData(station.id)
        .then(result => {
          if (result.success && result.data && result.data.aqi) {
            return {
              ...station,
              aqi: result.data.aqi,
              pollutants: result.data.pollutants,
              time: result.data.time,
              dominantPollutant: result.data.dominantPollutant,
              success: true
            };
          }
          return { ...station, success: false, aqi: null };
        })
        .catch(err => {
          console.error(`Error fetching ${station.name}:`, err);
          return { ...station, success: false, aqi: null };
        })
    );
    
    const results = await Promise.all(promises);
    
    // Filter out failed stations and those with invalid AQI
    const validStations = results.filter(r => 
      r.success && 
      r.aqi && 
      r.aqi !== '-' && 
      !isNaN(r.aqi) && 
      r.aqi > 0
    );
    
    return validStations;
  } catch (error) {
    console.error('Error fetching all stations:', error);
    return [];
  }
};

// Get AQI category and color
export const getAQICategory = (aqi) => {
  if (!aqi || isNaN(aqi)) return { level: 'Unknown', color: '#666' };
  
  if (aqi <= 50) return { level: 'Good', color: '#00e400' };
  if (aqi <= 100) return { level: 'Moderate', color: '#ffff00' };
  if (aqi <= 150) return { level: 'Unhealthy for Sensitive', color: '#ff7e00' };
  if (aqi <= 200) return { level: 'Unhealthy', color: '#ff0000' };
  if (aqi <= 300) return { level: 'Very Unhealthy', color: '#8f3f97' };
  return { level: 'Hazardous', color: '#7e0023' };
};

// Calculate cigarette equivalence from PM2.5 levels
export const calculateCigaretteEquivalence = (pm25) => {
  if (!pm25 || isNaN(pm25)) return 0;
  // Formula: 22 μg/m³ of PM2.5 = 1 cigarette
  return Math.round(pm25 / 22);
};

// Get Delhi stations list
export const getDelhiStations = () => DELHI_STATIONS;

export default {
  fetchStationData,
  fetchAllDelhiStations,
  getAQICategory,
  calculateCigaretteEquivalence,
  getDelhiStations,
};