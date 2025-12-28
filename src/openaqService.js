// openaqService.js - OpenAQ API Integration

const OPENAQ_BASE_URL = 'https://api.openaq.org/v2';

// Fetch latest measurements for Delhi
export const fetchDelhiAirQuality = async () => {
  try {
    const response = await fetch(
      `${OPENAQ_BASE_URL}/latest?country=IN&city=Delhi&limit=100`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    
    if (data.results) {
      return {
        success: true,
        stations: formatStations(data.results)
      };
    }
    
    return { success: false, error: 'No data available' };
  } catch (error) {
    console.error('OpenAQ API Error:', error);
    return { success: false, error: error.message };
  }
};

// Fetch specific location data
export const fetchLocationData = async (locationId) => {
  try {
    const response = await fetch(
      `${OPENAQ_BASE_URL}/latest/${locationId}`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    return data.results ? data.results[0] : null;
  } catch (error) {
    console.error('Error fetching location:', error);
    return null;
  }
};

// Get measurements for a specific location over time
export const fetchHistoricalData = async (locationId, dateFrom, dateTo) => {
  try {
    const response = await fetch(
      `${OPENAQ_BASE_URL}/measurements?location_id=${locationId}&date_from=${dateFrom}&date_to=${dateTo}&limit=1000`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return [];
  }
};

// Format station data for our app
const formatStations = (results) => {
  // Group by location
  const locationMap = new Map();
  
  results.forEach(result => {
    const locationId = result.location;
    
    if (!locationMap.has(locationId)) {
      locationMap.set(locationId, {
        id: result.locationId,
        name: result.location,
        city: result.city,
        country: result.country,
        coordinates: result.coordinates,
        measurements: {},
        lastUpdated: result.measurements[0]?.lastUpdated
      });
    }
    
    const location = locationMap.get(locationId);
    
    // Add measurements
    result.measurements.forEach(measurement => {
      const param = measurement.parameter;
      location.measurements[param] = {
        value: measurement.value,
        unit: measurement.unit,
        lastUpdated: measurement.lastUpdated
      };
    });
  });
  
  // Convert to array and calculate AQI
  return Array.from(locationMap.values()).map(station => ({
    ...station,
    aqi: calculateAQI(station.measurements),
    pollutants: {
      pm25: station.measurements.pm25?.value || null,
      pm10: station.measurements.pm10?.value || null,
      no2: station.measurements.no2?.value || null,
      so2: station.measurements.so2?.value || null,
      co: station.measurements.co?.value || null,
      o3: station.measurements.o3?.value || null,
    },
    lat: station.coordinates?.latitude || null,
    lng: station.coordinates?.longitude || null,
  }));
};

// Calculate AQI from pollutant measurements
const calculateAQI = (measurements) => {
  const aqiValues = [];
  
  // PM2.5 AQI calculation
  if (measurements.pm25) {
    aqiValues.push(calculatePM25AQI(measurements.pm25.value));
  }
  
  // PM10 AQI calculation
  if (measurements.pm10) {
    aqiValues.push(calculatePM10AQI(measurements.pm10.value));
  }
  
  // NO2 AQI calculation
  if (measurements.no2) {
    aqiValues.push(calculateNO2AQI(measurements.no2.value));
  }
  
  // O3 AQI calculation
  if (measurements.o3) {
    aqiValues.push(calculateO3AQI(measurements.o3.value));
  }
  
  // Return maximum AQI (dominant pollutant)
  return aqiValues.length > 0 ? Math.max(...aqiValues) : 0;
};

// PM2.5 AQI calculation (US EPA standard)
const calculatePM25AQI = (concentration) => {
  if (concentration <= 12.0) return linearScale(concentration, 0, 12.0, 0, 50);
  if (concentration <= 35.4) return linearScale(concentration, 12.1, 35.4, 51, 100);
  if (concentration <= 55.4) return linearScale(concentration, 35.5, 55.4, 101, 150);
  if (concentration <= 150.4) return linearScale(concentration, 55.5, 150.4, 151, 200);
  if (concentration <= 250.4) return linearScale(concentration, 150.5, 250.4, 201, 300);
  if (concentration <= 350.4) return linearScale(concentration, 250.5, 350.4, 301, 400);
  return linearScale(concentration, 350.5, 500.4, 401, 500);
};

// PM10 AQI calculation
const calculatePM10AQI = (concentration) => {
  if (concentration <= 54) return linearScale(concentration, 0, 54, 0, 50);
  if (concentration <= 154) return linearScale(concentration, 55, 154, 51, 100);
  if (concentration <= 254) return linearScale(concentration, 155, 254, 101, 150);
  if (concentration <= 354) return linearScale(concentration, 255, 354, 151, 200);
  if (concentration <= 424) return linearScale(concentration, 355, 424, 201, 300);
  if (concentration <= 504) return linearScale(concentration, 425, 504, 301, 400);
  return linearScale(concentration, 505, 604, 401, 500);
};

// NO2 AQI calculation (ppb to AQI)
const calculateNO2AQI = (concentration) => {
  if (concentration <= 53) return linearScale(concentration, 0, 53, 0, 50);
  if (concentration <= 100) return linearScale(concentration, 54, 100, 51, 100);
  if (concentration <= 360) return linearScale(concentration, 101, 360, 101, 150);
  if (concentration <= 649) return linearScale(concentration, 361, 649, 151, 200);
  if (concentration <= 1249) return linearScale(concentration, 650, 1249, 201, 300);
  return 301;
};

// O3 AQI calculation (ppb to AQI)
const calculateO3AQI = (concentration) => {
  if (concentration <= 54) return linearScale(concentration, 0, 54, 0, 50);
  if (concentration <= 70) return linearScale(concentration, 55, 70, 51, 100);
  if (concentration <= 85) return linearScale(concentration, 71, 85, 101, 150);
  if (concentration <= 105) return linearScale(concentration, 86, 105, 151, 200);
  if (concentration <= 200) return linearScale(concentration, 106, 200, 201, 300);
  return 301;
};

// Linear scale helper
const linearScale = (value, inLow, inHigh, outLow, outHigh) => {
  return Math.round(
    ((value - inLow) / (inHigh - inLow)) * (outHigh - outLow) + outLow
  );
};

// Get AQI category
export const getAQICategory = (aqi) => {
  if (aqi <= 50) return { level: 'Good', color: '#00e400' };
  if (aqi <= 100) return { level: 'Moderate', color: '#ffff00' };
  if (aqi <= 150) return { level: 'Unhealthy for Sensitive', color: '#ff7e00' };
  if (aqi <= 200) return { level: 'Unhealthy', color: '#ff0000' };
  if (aqi <= 300) return { level: 'Very Unhealthy', color: '#8f3f97' };
  return { level: 'Hazardous', color: '#7e0023' };
};

// Get dominant pollutant
export const getDominantPollutant = (measurements) => {
  const aqiMap = {
    pm25: measurements.pm25 ? calculatePM25AQI(measurements.pm25.value) : 0,
    pm10: measurements.pm10 ? calculatePM10AQI(measurements.pm10.value) : 0,
    no2: measurements.no2 ? calculateNO2AQI(measurements.no2.value) : 0,
    o3: measurements.o3 ? calculateO3AQI(measurements.o3.value) : 0,
  };
  
  const dominant = Object.entries(aqiMap).reduce((max, [key, value]) => 
    value > max.value ? { param: key, value } : max,
    { param: 'pm25', value: 0 }
  );
  
  return dominant.param;
};

export default {
  fetchDelhiAirQuality,
  fetchLocationData,
  fetchHistoricalData,
  getAQICategory,
  getDominantPollutant,
};