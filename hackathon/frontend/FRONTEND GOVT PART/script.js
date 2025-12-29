// --- Global Variables ---
const API_URL = 'https://api.example.com/delhi_aqi'; 
// Use your local GeoJSON file now that the server path is fixed
const GEOJSON_PATH = 'delhi_wards.geojson'; 
const KML_PATH = 'delhi_ward.kml'; 
let map = null;
let wardsLayer = null;
let selectedWardLayer = null;

// --- UI Elements ---
const infoPanel = document.getElementById('infoPanel');
const locationTitle = document.getElementById('locationTitle');
const locationSub = document.getElementById('locationSub');
const aqiText = document.getElementById('aqiText');
const advisory = document.getElementById('advisory');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const closePanel = document.getElementById('closePanel');

// New UI elements for Tabbed Interface
const tabNavigation = document.getElementById('tabNavigation');
const tabButtons = tabNavigation.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// FIX: Set to true since the page is only reached after govt login
let isGovtLoggedIn = true; 

// --- Helper Functions ---

/**
 * Maps AQI value to a color and category.
 * @param {number} aqi - The Air Quality Index value.
 * @returns {{color: string, category: string, advisory: string}}
 */
function getAQIStyle(aqi) {
    let color, category, advisory;
    if (aqi === null || aqi === undefined) {
        color = '#555';
        category = 'No Data';
        advisory = 'Air quality data is currently unavailable for this area.';
    } else if (aqi <= 50) {
        color = '#00e400';
        category = 'Good';
        advisory = 'Air quality is considered satisfactory, and air pollution poses little or no risk.';
    } else if (aqi <= 100) {
        color = '#ffff00';
        category = 'Moderate';
        advisory = 'Air quality is acceptable. However, for some pollutants there may be a moderate health concern for a very small number of people who are unusually sensitive to air pollution.';
    } else if (aqi <= 150) {
        color = '#ff7e00';
        category = 'Unhealthy for Sensitive Groups';
        advisory = 'Members of sensitive groups may experience health effects. The general public is less likely to be affected.';
    } else if (aqi <= 200) {
        color = '#ff0000';
        category = 'Unhealthy';
        advisory = 'Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects.';
    } else if (aqi <= 300) {
        color = '#99004c';
        category = 'Very Unhealthy';
        advisory = 'Health warnings of emergency conditions. The entire population is more likely to be affected.';
    } else {
        color = '#7e0023';
        category = 'Hazardous';
        advisory = 'Health alert: everyone may experience more serious health effects.';
    }
    return { color, category, advisory };
}

/**
 * Sets the style for a Leaflet feature (ward boundary).
 * @param {object} feature - GeoJSON feature object.
 * @returns {object} Leaflet style object.
 */
function style(feature) {
    const aqi = feature.properties.AQI || 0; // Use mock data or a default value
    const { color } = getAQIStyle(aqi);

    return {
        fillColor: color,
        weight: 1,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7
    };
}

/**
 * Updates the information panel with ward data.
 * @param {object} properties - Properties of the clicked ward.
 */
function updateInfoPanel(properties) {
    const wardIdentifier = properties.unique || properties.id || 'N/A';
    const wardName = `Ward No: ${wardIdentifier}`;
    const district = properties.district || 'N/A';
    const aqi = properties.AQI || 'N/A';
    const { category, advisory, color } = getAQIStyle(aqi);

    // Update panel titles
    locationTitle.textContent = wardName;
    locationSub.textContent = `Zone: ${properties.zone || 'N/A'}, District: ${district}`; 

    // Update AQI Tab
    aqiText.textContent = `AQI: ${aqi}`;
    aqiText.style.color = color;
    advisory.textContent = `Category: ${category}. ${advisory}`;
    
    // Show the panel
    infoPanel.classList.remove('translate-x-full');
}

/**
 * Resets the highlight of the previously selected ward.
 * @param {object} e - Event object containing the target layer.
 */
function highlightFeature(e) {
    const layer = e.target;

    // Reset previous selection
    if (selectedWardLayer) {
        wardsLayer.resetStyle(selectedWardLayer);
    }
    
    // Highlight the new selection
    layer.setStyle({
        weight: 5,
        color: '#666',
        dashArray: '',
        fillOpacity: 0.9
    });

    // Store the new selection
    selectedWardLayer = layer;
    
    // Bring to front to ensure highlight is visible
    layer.bringToFront(); 

    // Update the panel with data
    updateInfoPanel(layer.feature.properties);
}


/**
 * Sets up event listeners for each ward layer.
 * @param {object} feature - GeoJSON feature object.
 * @param {object} layer - Leaflet layer object.
 */
function onEachFeature(feature, layer) {
    // Add dummy data for visualization (replace with API data later)
    if (!feature.properties.AQI) {
        // Mock data for demonstration purposes
        feature.properties.AQI = Math.floor(Math.random() * (400 - 50 + 1)) + 50;
        feature.properties.district = 'Central Delhi';
    }

    const wardIdentifier = feature.properties.unique || feature.properties.id || 'Ward';
    
    // Bind popup
    layer.bindPopup(`<b>Ward No: ${wardIdentifier}</b><br>AQI: ${feature.properties.AQI}`);

    // Add click listener
    layer.on({
        click: highlightFeature
    });
    
    // Add permanent ward number/name label at the centroid
    if (feature.geometry && feature.geometry.coordinates) {
        const centroid = turf.centroid(feature);
        const coords = centroid.geometry.coordinates;
        
        // Use the 'unique' property for the permanent label
        const labelText = feature.properties.unique || feature.properties.id || 'N/A'; 
        
        const wardLabel = L.divIcon({
            className: 'ward-label', 
            html: `<span>${labelText}</span>`,
            iconSize: [40, 20], 
            iconAnchor: [20, 10] 
        });
        
        // Place the marker at the centroid (Latitude, Longitude)
        L.marker([coords[1], coords[0]], { icon: wardLabel }).addTo(map);
    }
}

// --- Main Map Initialization ---

/**
 * Initializes the Leaflet map and loads GeoJSON data.
 */
function initMap() {
    // 1. Map Initialization
    map = L.map('map', {
        minZoom: 9 
    }).setView([28.7041, 77.1025], 12); // Center on Delhi

    // 2. Add Tile Layer (Switch to Dark Theme tiles)
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd'
}).addTo(map);

    // 3. Fetch and Load GeoJSON Data
    fetch(GEOJSON_PATH) 
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch GeoJSON. Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            wardsLayer = L.geoJSON(data, {
                style: style, 
                onEachFeature: onEachFeature 
            }).addTo(map);

            map.fitBounds(wardsLayer.getBounds());
        })
        .catch(error => {
            console.error('Error loading GeoJSON data:', error);
        });
        
    // 4. Invalidate Size (Keep this fix, as it prevents rendering issues)
    setTimeout(() => {
        map.invalidateSize();
        console.log("Map size forcefully re-evaluated.");
    }, 500); 
}

// --- Dashboard Functionality ---

/**
 * Handles the logic for searching and sorting wards.
 */
function handleSearch() {
    const query = searchInput.value.trim().toLowerCase();
    
    if (!wardsLayer) return;

    if (query === 'sort aqi') {
        // Future: Implement sorting logic (e.g., reorder panel list, change map style)
        alert('Sorting AQI functionality coming soon!');
    } else {
        // Search by Ward ID ('unique' property)
        let found = false;
        wardsLayer.eachLayer(layer => {
            const identifier = layer.feature.properties.unique ? layer.feature.properties.unique.toLowerCase() : '';
            if (identifier.includes(query)) {
                // Focus the map on the found ward and click it
                map.fitBounds(layer.getBounds());
                layer.fire('click');
                found = true;
            }
        });

        if (!found && query) {
            alert(`Ward '${query}' not found. Search must match the Ward ID/Unique Code.`);
        }
    }
}

/**
 * Handles tab switching in the info panel.
 * @param {Event} e - Click event object.
 */
function handleTabSwitch(e) {
    if (e.target.classList.contains('tab-btn')) {
        const targetTab = e.target.getAttribute('data-tab');

        // Remove active class from all buttons and contents
        tabButtons.forEach(btn => btn.classList.remove('active', 'bg-white/20'));
        tabContents.forEach(content => content.classList.add('hidden'));

        // Add active class to the clicked button
        e.target.classList.add('active', 'bg-white/20');

        // Show the corresponding content
        document.querySelector(`[data-content="${targetTab}"]`).classList.remove('hidden');
    }
}


// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', initMap);

searchBtn.addEventListener('click', handleSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSearch();
    }
});

closePanel.addEventListener('click', () => {
    infoPanel.classList.add('translate-x-full');
    
    // Reset highlight on the map
    if (selectedWardLayer) {
        wardsLayer.resetStyle(selectedWardLayer);
        selectedWardLayer = null; // Clear selection
    }
});

tabNavigation.addEventListener('click', handleTabSwitch);

// Initial call to start the map
