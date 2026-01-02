import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Users, Factory, Car, Construction, Wind, Cigarette, Shield, ClipboardCheck, TrendingUp, Camera, ChevronRight } from 'lucide-react';

const WardDetailModal = ({ location, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);

  const UNSPLASH_KEY = 'nTZch3uQ7OSWzzF8gPHeAlBHOov-uCop1glkEu5t7Fg';
  const NEWS_API_KEY = '52f61a6415334192bd573e9e4a948498';

  useEffect(() => {
    fetchImages();
    fetchNews();
  }, []);

  const fetchImages = async () => {
    try {
      const queries = ['delhi air pollution', 'smog india', 'industrial pollution delhi', 'traffic pollution'];
      const query = queries[Math.floor(Math.random() * queries.length)];
      
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${query}&per_page=6&client_id=${UNSPLASH_KEY}`
      );
      const data = await response.json();
      setImages(data.results || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching images:', error);
      setLoading(false);
    }
  };

  const fetchNews = async () => {
    try {
      // Create location-specific search query
      const locationKeywords = `${location.name} OR ${location.zone} Delhi`;
      const pollutionKeywords = 'air pollution OR AQI OR smog OR air quality OR pollution';
      const combinedQuery = `(${locationKeywords}) AND (${pollutionKeywords})`;
      
      // First try: Location-specific news
      let response = await fetch(
        `https://newsapi.org/v2/everything?q=${encodeURIComponent(combinedQuery)}&language=en&sortBy=publishedAt&pageSize=15&apiKey=${NEWS_API_KEY}`
      );
      let data = await response.json();
      
      // If no location-specific news, fall back to Delhi-wide pollution news
      if (data.status === 'ok' && data.articles && data.articles.length === 0) {
        const fallbackQuery = 'Delhi air pollution OR Delhi AQI OR Delhi smog';
        response = await fetch(
          `https://newsapi.org/v2/everything?q=${encodeURIComponent(fallbackQuery)}&language=en&sortBy=publishedAt&pageSize=15&apiKey=${NEWS_API_KEY}`
        );
        data = await response.json();
      }
      
      if (data.status === 'ok') {
        setNews(data.articles || []);
      }
      setNewsLoading(false);
    } catch (error) {
      console.error('Error fetching news:', error);
      setNewsLoading(false);
    }
  };

  const calculateCigarettes = (aqi) => {
    // More accurate: use PM2.5 if available, otherwise estimate from AQI
    if (location.pollutants?.pm25) {
      return Math.round(location.pollutants.pm25 / 22);
    }
    return Math.round(aqi / 22);
  };

  const getAQIColor = (aqi) => {
    if (aqi <= 50) return '#00e400';
    if (aqi <= 100) return '#ffff00';
    if (aqi <= 150) return '#ff7e00';
    if (aqi <= 200) return '#ff0000';
    if (aqi <= 300) return '#8f3f97';
    return '#7e0023';
  };

  const wardData = {
    narela: {
      safetyPrecautions: {
        general: [
          'Stay indoors as much as possible',
          'Keep windows and doors closed',
          'Use air purifiers if available',
          'Wear N95/N99 masks when going outside',
          'Avoid outdoor exercise completely'
        ],
        sensitive: [
          'Children and elderly should not go outside',
          'Asthma patients must keep inhalers ready',
          'Pregnant women should avoid any outdoor exposure',
          'Those with heart conditions should monitor symptoms closely'
        ]
      },
      authorityActions: {
        immediate: [
          'Shut down non-compliant industrial units immediately',
          'Implement odd-even vehicle scheme',
          'Deploy water sprinklers on main roads',
          'Ban all construction activities',
          'Set up emergency health camps'
        ],
        longTerm: [
          'Relocate polluting industries outside city limits',
          'Improve public transportation infrastructure',
          'Plant 10,000 trees in the ward',
          'Install real-time air quality monitors',
          'Strict enforcement of BS-VI norms'
        ]
      },
      citizenActions: [
        'Report polluting industries via Delhi govt app',
        'Use public transport or carpool',
        'Plant trees in your neighborhood',
        'Avoid burning waste or leaves',
        'Install air purifiers at home',
        'Participate in local clean air campaigns',
        'Pressure local MLAs for action',
        'Monitor and share AQI data on social media'
      ]
    }
  };

  // DYNAMIC POLLUTION SOURCES based on real-time pollutant data
  const calculatePollutionSources = () => {
    const pollutants = location.pollutants || {};
    const dominantPollutant = location.dominantPollutant || 'pm25';
    
    // Initialize base percentages
    let sources = {
      industrial: 25,
      vehicular: 25,
      construction: 20,
      biomass: 15,
      residential: 15
    };

    // Adjust based on dominant pollutant
    if (dominantPollutant === 'pm25' || dominantPollutant === 'pm10') {
      // High particulate matter = industrial + construction
      sources.industrial = 35;
      sources.construction = 25;
      sources.vehicular = 20;
      sources.biomass = 12;
      sources.residential = 8;
    } else if (dominantPollutant === 'no2') {
      // High NO2 = vehicular emissions
      sources.vehicular = 45;
      sources.industrial = 25;
      sources.construction = 15;
      sources.biomass = 8;
      sources.residential = 7;
    } else if (dominantPollutant === 'so2') {
      // High SO2 = industrial/coal burning
      sources.industrial = 50;
      sources.vehicular = 20;
      sources.residential = 15;
      sources.construction = 10;
      sources.biomass = 5;
    } else if (dominantPollutant === 'co') {
      // High CO = vehicular + biomass burning
      sources.vehicular = 40;
      sources.biomass = 25;
      sources.industrial = 20;
      sources.residential = 10;
      sources.construction = 5;
    } else if (dominantPollutant === 'o3') {
      // High O3 = photochemical smog from vehicles
      sources.vehicular = 50;
      sources.industrial = 25;
      sources.construction = 12;
      sources.biomass = 8;
      sources.residential = 5;
    }

    // Fine-tune based on PM2.5 vs PM10 ratio if both available
    if (pollutants.pm25 && pollutants.pm10) {
      const ratio = pollutants.pm25 / pollutants.pm10;
      if (ratio > 0.7) {
        // High PM2.5/PM10 ratio = combustion sources (vehicles, biomass)
        sources.vehicular += 5;
        sources.biomass += 5;
        sources.construction -= 5;
        sources.residential -= 5;
      } else if (ratio < 0.5) {
        // Low ratio = more coarse particles (construction, road dust)
        sources.construction += 8;
        sources.vehicular -= 4;
        sources.biomass -= 4;
      }
    }

    // Check for elevated SO2 (industrial activity)
    if (pollutants.so2 && pollutants.so2 > 40) {
      sources.industrial += 10;
      sources.construction -= 5;
      sources.residential -= 5;
    }

    // Check for elevated NO2 (traffic)
    if (pollutants.no2 && pollutants.no2 > 80) {
      sources.vehicular += 10;
      sources.industrial -= 5;
      sources.biomass -= 5;
    }

    // Ensure percentages add up to 100
    const total = Object.values(sources).reduce((a, b) => a + b, 0);
    Object.keys(sources).forEach(key => {
      sources[key] = Math.round((sources[key] / total) * 100);
    });

    // Convert to array format with icons and colors
    return [
      { 
        icon: <Factory size={24} />, 
        name: 'Industrial Emissions', 
        contribution: sources.industrial, 
        color: '#ff4444',
        description: 'Factories, power plants, manufacturing units'
      },
      { 
        icon: <Car size={24} />, 
        name: 'Vehicular Pollution', 
        contribution: sources.vehicular, 
        color: '#ff7e00',
        description: 'Cars, trucks, buses, two-wheelers'
      },
      { 
        icon: <Construction size={24} />, 
        name: 'Construction Dust', 
        contribution: sources.construction, 
        color: '#ffaa00',
        description: 'Building construction, road work, demolition'
      },
      { 
        icon: <Wind size={24} />, 
        name: 'Biomass Burning', 
        contribution: sources.biomass, 
        color: '#8f3f97',
        description: 'Crop residue, wood burning, waste burning'
      },
      { 
        icon: <Wind size={24} />, 
        name: 'Residential Sources', 
        contribution: sources.residential, 
        color: '#666',
        description: 'Cooking, heating, household activities'
      },
    ].sort((a, b) => b.contribution - a.contribution); // Sort by contribution
  };

  const data = wardData.narela;
  const majorCauses = calculatePollutionSources(); // Dynamic calculation!
  const cigaretteEquiv = calculateCigarettes(location.aqi);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <AlertTriangle size={18} /> },
    { id: 'causes', label: 'Pollution Sources', icon: <Factory size={18} /> },
    { id: 'safety', label: 'Safety Guide', icon: <Shield size={18} /> },
    { id: 'images', label: 'Ground Reality', icon: <Camera size={18} /> },
    { id: 'authority', label: 'Authority Action', icon: <ClipboardCheck size={18} /> },
    { id: 'news', label: 'Live News', icon: <TrendingUp size={18} /> },
    { id: 'citizens', label: 'What You Can Do', icon: <Users size={18} /> },
  ];

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div>
              <h2 style={styles.wardName}>{location.name}</h2>
              <p style={styles.wardZone}>{location.zone} Delhi</p>
            </div>
            <div style={{...styles.aqiBadge, background: getAQIColor(location.aqi)}}>
              <span style={styles.aqiValue}>{location.aqi}</span>
            </div>
          </div>
          <button style={styles.closeButton} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Cigarette Warning */}
        <div style={styles.cigaretteWarning}>
          <Cigarette size={24} color="#ff4444" />
          <div>
            <p style={styles.cigaretteText}>
              <strong>Breathing this air = Smoking {cigaretteEquiv} cigarettes per day</strong>
            </p>
            <p style={styles.cigaretteSubtext}>Based on PM2.5 levels and WHO guidelines</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              style={{
                ...styles.tab,
                ...(activeTab === tab.id ? styles.tabActive : {})
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Air Quality Overview</h3>
              <div style={styles.overviewGrid}>
                <div style={styles.overviewCard}>
                  <AlertTriangle size={32} color="#ff4444" />
                  <h4 style={styles.overviewCardTitle}>Health Alert</h4>
                  <p style={styles.overviewCardText}>
                    {location.aqi > 300 ? 'Hazardous air quality. Serious health effects expected for everyone.' :
                     location.aqi > 200 ? 'Very unhealthy. Health alert: everyone may experience serious effects.' :
                     location.aqi > 150 ? 'Unhealthy. Everyone may begin to experience health effects.' :
                     location.aqi > 100 ? 'Unhealthy for sensitive groups. Limit prolonged outdoor exertion.' :
                     'Air quality is acceptable for most people.'}
                  </p>
                </div>
                <div style={styles.overviewCard}>
                  <Users size={32} color="#4a9eff" />
                  <h4 style={styles.overviewCardTitle}>Dominant Pollutant</h4>
                  <p style={styles.overviewCardText}>
                    {location.dominantPollutant ? location.dominantPollutant.toUpperCase() : 'PM2.5'} is the primary contributor to current AQI levels
                  </p>
                </div>
              </div>
              
              <div style={styles.pollutantGrid}>
                {location.pollutants && Object.entries(location.pollutants)
                  .filter(([key, value]) => value !== null && value !== undefined)
                  .map(([name, value]) => {
                    const limits = {
                      pm25: 60,
                      pm10: 100,
                      no2: 80,
                      so2: 80,
                      co: 4.0,
                      o3: 100
                    };
                    const limit = limits[name] || 100;
                    const isExceeded = value > limit;
                    
                    return (
                      <div key={name} style={styles.pollutantCard}>
                        <div style={styles.pollutantHeader}>
                          <span style={styles.pollutantName}>{name.toUpperCase()}</span>
                          <span style={{
                            ...styles.pollutantStatus,
                            color: isExceeded ? '#ff4444' : '#00e400'
                          }}>
                            {isExceeded ? 'Exceeded' : 'Normal'}
                          </span>
                        </div>
                        <p style={styles.pollutantValue}>
                          {value} {name === 'co' ? 'mg/m³' : 'µg/m³'}
                        </p>
                        <p style={styles.pollutantLimit}>
                          Safe limit: {limit} {name === 'co' ? 'mg/m³' : 'µg/m³'}
                        </p>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Causes Tab */}
          {activeTab === 'causes' && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Major Pollution Sources</h3>
              <p style={styles.sectionDescription}>
                Based on real-time pollutant analysis from {location.name}
              </p>
              
              <div style={styles.pollutantInsight}>
                <p style={styles.pollutantInsightText}>
                  <strong>Dominant Pollutant:</strong> {location.dominantPollutant ? location.dominantPollutant.toUpperCase() : 'PM2.5'}
                </p>
                <p style={styles.pollutantInsightSubtext}>
                  The percentages below are calculated based on current pollutant levels and composition
                </p>
              </div>

              {majorCauses.map((cause, idx) => (
                <div key={idx} style={styles.causeCard}>
                  <div style={{...styles.causeIcon, background: cause.color + '20'}}>
                    {React.cloneElement(cause.icon, { color: cause.color })}
                  </div>
                  <div style={styles.causeContent}>
                    <h4 style={styles.causeName}>{cause.name}</h4>
                    <p style={styles.causeDescription}>{cause.description}</p>
                    <div style={styles.causeBar}>
                      <div style={{
                        ...styles.causeFill,
                        width: `${cause.contribution}%`,
                        background: cause.color
                      }} />
                    </div>
                    <p style={styles.causePercent}>{cause.contribution}% estimated contribution</p>
                  </div>
                </div>
              ))}
              
              <div style={styles.insightBox}>
                <h4 style={styles.insightTitle}>Analysis Method</h4>
                <p style={styles.insightText}>
                  These percentages are dynamically calculated based on the current pollutant composition at {location.name}. 
                  High PM2.5 and PM10 indicate industrial and construction sources, high NO₂ suggests vehicular emissions, 
                  and elevated SO₂ points to industrial or coal burning. The analysis updates with each new measurement.
                </p>
              </div>
            </div>
          )}

          {/* Safety Tab */}
          {activeTab === 'safety' && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Safety Precautions</h3>
              
              <div style={styles.safetySection}>
                <h4 style={styles.safetySubtitle}>For General Public</h4>
                {data.safetyPrecautions.general.map((item, idx) => (
                  <div key={idx} style={styles.safetyItem}>
                    <ChevronRight size={18} color="#4a9eff" />
                    <p style={styles.safetyText}>{item}</p>
                  </div>
                ))}
              </div>

              <div style={styles.safetySection}>
                <h4 style={styles.safetySubtitle}>For Sensitive Groups</h4>
                {data.safetyPrecautions.sensitive.map((item, idx) => (
                  <div key={idx} style={styles.safetyItem}>
                    <AlertTriangle size={18} color="#ff4444" />
                    <p style={styles.safetyText}>{item}</p>
                  </div>
                ))}
              </div>

              <div style={styles.emergencyBox}>
                <h4 style={styles.emergencyTitle}>Emergency Contacts</h4>
                <div style={styles.emergencyGrid}>
                  <div style={styles.emergencyItem}>
                    <p style={styles.emergencyLabel}>Ambulance</p>
                    <p style={styles.emergencyNumber}>102</p>
                  </div>
                  <div style={styles.emergencyItem}>
                    <p style={styles.emergencyLabel}>Pollution Control</p>
                    <p style={styles.emergencyNumber}>1800-11-0007</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Images Tab */}
          {activeTab === 'images' && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Ground Reality - Pollution Evidence</h3>
              <p style={styles.sectionDescription}>
                Visual documentation of air pollution in Delhi and similar industrial areas
              </p>
              {loading ? (
                <div style={styles.loadingState}>
                  <p>Loading images...</p>
                </div>
              ) : (
                <div style={styles.imageGrid}>
                  {images.slice(0, 6).map((image, idx) => (
                    <div key={idx} style={styles.imageCard}>
                      <img
                        src={image.urls.small}
                        alt={image.alt_description || 'Air pollution'}
                        style={styles.image}
                      />
                      <div style={styles.imageOverlay}>
                        <p style={styles.imageCredit}>Photo by {image.user.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Authority Action Tab */}
          {activeTab === 'authority' && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Required Authority Action</h3>
              
              <div style={styles.actionSection}>
                <div style={styles.actionHeader}>
                  <AlertTriangle size={20} color="#ff4444" />
                  <h4 style={styles.actionTitle}>Immediate Actions Required</h4>
                </div>
                {data.authorityActions.immediate.map((action, idx) => (
                  <div key={idx} style={styles.actionItem}>
                    <div style={styles.actionBullet}>!</div>
                    <p style={styles.actionText}>{action}</p>
                  </div>
                ))}
              </div>

              <div style={styles.actionSection}>
                <div style={styles.actionHeader}>
                  <TrendingUp size={20} color="#4a9eff" />
                  <h4 style={styles.actionTitle}>Long-term Solutions</h4>
                </div>
                {data.authorityActions.longTerm.map((action, idx) => (
                  <div key={idx} style={styles.actionItem}>
                    <div style={{...styles.actionBullet, background: '#4a9eff'}}>→</div>
                    <p style={styles.actionText}>{action}</p>
                  </div>
                ))}
              </div>

              <div style={styles.accountabilityBox}>
                <h4 style={styles.accountabilityTitle}>Accountability Tracker</h4>
                <p style={styles.accountabilityText}>
                  Current status: <strong style={{color: '#ff4444'}}>DELAYED</strong>
                </p>
                <p style={styles.accountabilityText}>
                  No concrete action taken in the last 30 days despite AQI remaining above 300.
                </p>
              </div>
            </div>
          )}

          {/* News Tab */}
          {activeTab === 'news' && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Live Pollution News - {location.name}</h3>
              <p style={styles.sectionDescription}>
                Latest news about air pollution and air quality in {location.name} and {location.zone} Delhi
              </p>
              
              {newsLoading ? (
                <div style={styles.loadingState}>
                  <p>Loading latest news for {location.name}...</p>
                </div>
              ) : news.length > 0 ? (
                <>
                  <div style={styles.newsInfo}>
                    <p style={styles.newsInfoText}>
                      📍 Showing {news.length} articles related to {location.name} and Delhi air quality
                    </p>
                  </div>
                  <div style={styles.newsGrid}>
                    {news.slice(0, 12).map((article, idx) => (
                      <div key={idx} style={styles.newsCard}>
                        {article.urlToImage && (
                          <div style={styles.newsImageContainer}>
                            <img
                              src={article.urlToImage}
                              alt={article.title}
                              style={styles.newsImage}
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        <div style={styles.newsContent}>
                          <div style={styles.newsHeader}>
                            <span style={styles.newsSource}>{article.source.name}</span>
                            <span style={styles.newsTime}>
                              {new Date(article.publishedAt).toLocaleDateString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <h4 style={styles.newsTitle}>{article.title}</h4>
                          <p style={styles.newsDescription}>
                            {article.description?.substring(0, 120)}
                            {article.description?.length > 120 ? '...' : ''}
                          </p>
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={styles.newsLink}
                          >
                            Read Full Article →
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={styles.emptyNewsState}>
                  <p style={styles.emptyNewsText}>
                    No recent news articles found for {location.name}. 
                    This could mean the area hasn't been in recent pollution news.
                  </p>
                  <button 
                    style={styles.refreshNewsBtn}
                    onClick={fetchNews}
                  >
                    Retry Search
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Past Actions Tab - REMOVED */}
          {activeTab === 'past' && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Historical Actions & Outcomes</h3>
              
              {data.pastActions.map((action, idx) => (
                <div key={idx} style={styles.pastActionCard}>
                  <div style={styles.pastActionHeader}>
                    <span style={styles.pastActionYear}>{action.year}</span>
                    <span style={{
                      ...styles.pastActionStatus,
                      background: action.status === 'Successful' ? '#00e40020' : 
                                 action.status === 'Partially Successful' ? '#ff7e0020' : '#ff444420',
                      color: action.status === 'Successful' ? '#00e400' : 
                             action.status === 'Partially Successful' ? '#ff7e00' : '#ff4444'
                    }}>
                      {action.status}
                    </span>
                  </div>
                  <h4 style={styles.pastActionTitle}>{action.action}</h4>
                  <p style={styles.pastActionImpact}><strong>Impact:</strong> {action.impact}</p>
                  <p style={styles.pastActionBudget}><strong>Budget:</strong> {action.budget}</p>
                </div>
              ))}

              <div style={styles.analysisBox}>
                <h4 style={styles.analysisTitle}>Analysis</h4>
                <p style={styles.analysisText}>
                  Out of 3 major initiatives in the past 3 years, only 1 was fully successful. 
                  Budget utilization rate: 76%. Key issue: Lack of sustained monitoring and enforcement. 
                  Short-term reactive measures are not addressing root causes.
                </p>
              </div>
            </div>
          )}

          {/* Citizens Tab */}
          {activeTab === 'citizens' && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>What Citizens Can Do</h3>
              <p style={styles.sectionDescription}>
                Individual and collective actions to combat air pollution
              </p>

              <div style={styles.citizenGrid}>
                {data.citizenActions.map((action, idx) => (
                  <div key={idx} style={styles.citizenCard}>
                    <div style={styles.citizenNumber}>{idx + 1}</div>
                    <p style={styles.citizenText}>{action}</p>
                  </div>
                ))}
              </div>

              <div style={styles.activismBox}>
                <h4 style={styles.activismTitle}>Raise Your Voice</h4>
                <p style={styles.activismText}>
                  Contact your local representatives and demand action. Air quality is a fundamental right.
                </p>
                <div style={styles.contactInfo}>
                  <p><strong>MLA Contact:</strong> +91-XXXX-XXXXXX</p>
                  <p><strong>Pollution Control Board:</strong> 1800-11-0007</p>
                  <p><strong>CM Helpline:</strong> 1031</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    background: '#1a1a1a',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '1200px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid #333',
    overflow: 'hidden',
  },
  header: {
    padding: '24px 32px',
    borderBottom: '1px solid #333',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  wardName: {
    fontSize: '28px',
    fontWeight: '700',
    margin: 0,
    color: '#fff',
  },
  wardZone: {
    fontSize: '14px',
    color: '#999',
    margin: '4px 0 0 0',
  },
  aqiBadge: {
    padding: '12px 24px',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '32px',
    color: '#fff',
  },
  aqiValue: {
    textShadow: '0 2px 8px rgba(0,0,0,0.3)',
  },
  closeButton: {
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    borderRadius: '12px',
    padding: '10px',
    cursor: 'pointer',
    color: '#fff',
    transition: 'all 0.3s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cigaretteWarning: {
    padding: '20px 32px',
    background: 'rgba(255, 68, 68, 0.1)',
    borderBottom: '1px solid rgba(255, 68, 68, 0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  cigaretteText: {
    fontSize: '16px',
    color: '#fff',
    margin: 0,
  },
  cigaretteSubtext: {
    fontSize: '13px',
    color: '#999',
    margin: '4px 0 0 0',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    padding: '16px 32px',
    borderBottom: '1px solid #333',
    overflowX: 'auto',
    background: '#0a0a0a',
  },
  tab: {
    padding: '10px 16px',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    color: '#999',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    whiteSpace: 'nowrap',
  },
  tabActive: {
    background: '#4a9eff',
    color: '#fff',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '32px',
  },
  section: {
    animation: 'fadeIn 0.3s',
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '8px',
    color: '#fff',
  },
  sectionDescription: {
    fontSize: '14px',
    color: '#999',
    marginBottom: '24px',
  },
  overviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  },
  overviewCard: {
    padding: '24px',
    background: 'rgba(26, 26, 26, 0.8)',
    border: '1px solid #333',
    borderRadius: '12px',
  },
  overviewCardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    margin: '16px 0 8px',
    color: '#fff',
  },
  overviewCardText: {
    fontSize: '14px',
    color: '#999',
    lineHeight: '1.6',
    margin: 0,
  },
  pollutantGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
  },
  pollutantCard: {
    padding: '16px',
    background: '#0a0a0a',
    border: '1px solid #333',
    borderRadius: '12px',
  },
  pollutantHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  pollutantName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#fff',
  },
  pollutantStatus: {
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  pollutantValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#fff',
    margin: '8px 0 4px',
  },
  pollutantLimit: {
    fontSize: '12px',
    color: '#666',
    margin: 0,
  },
  causeCard: {
    display: 'flex',
    gap: '16px',
    padding: '20px',
    background: '#0a0a0a',
    border: '1px solid #333',
    borderRadius: '12px',
    marginBottom: '16px',
  },
  causeIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  causeContent: {
    flex: 1,
  },
  causeName: {
    fontSize: '18px',
    fontWeight: '600',
    margin: '0 0 8px 0',
    color: '#fff',
  },
  causeDescription: {
    fontSize: '13px',
    color: '#999',
    margin: '0 0 12px 0',
    lineHeight: '1.4',
  },
  causeBar: {
    width: '100%',
    height: '8px',
    background: '#2a2a2a',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  causeFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.5s ease',
  },
  causePercent: {
    fontSize: '13px',
    color: '#999',
    margin: 0,
  },
  pollutantInsight: {
    padding: '16px',
    background: 'rgba(74, 158, 255, 0.1)',
    border: '1px solid rgba(74, 158, 255, 0.3)',
    borderRadius: '12px',
    marginBottom: '24px',
  },
  pollutantInsightText: {
    fontSize: '14px',
    color: '#4a9eff',
    margin: '0 0 8px 0',
  },
  pollutantInsightSubtext: {
    fontSize: '12px',
    color: '#999',
    margin: 0,
    lineHeight: '1.5',
  },
  insightBox: {
    marginTop: '24px',
    padding: '20px',
    background: 'rgba(74, 158, 255, 0.1)',
    border: '1px solid rgba(74, 158, 255, 0.3)',
    borderRadius: '12px',
  },
  insightTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#4a9eff',
  },
  insightText: {
    fontSize: '14px',
    color: '#fff',
    lineHeight: '1.6',
    margin: 0,
  },
  safetySection: {
    marginBottom: '32px',
  },
  safetySubtitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#fff',
  },
  safetyItem: {
    display: 'flex',
    gap: '12px',
    marginBottom: '12px',
    alignItems: 'flex-start',
  },
  safetyText: {
    fontSize: '14px',
    color: '#fff',
    margin: 0,
    lineHeight: '1.6',
  },
  emergencyBox: {
    padding: '20px',
    background: 'rgba(255, 68, 68, 0.1)',
    border: '1px solid rgba(255, 68, 68, 0.3)',
    borderRadius: '12px',
  },
  emergencyTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#ff4444',
  },
  emergencyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  emergencyItem: {
    padding: '12px',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '8px',
  },
  emergencyLabel: {
    fontSize: '12px',
    color: '#999',
    margin: '0 0 4px 0',
  },
  emergencyNumber: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#fff',
    margin: 0,
  },
  imageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '16px',
  },
  imageCard: {
    position: 'relative',
    borderRadius: '12px',
    overflow: 'hidden',
    aspectRatio: '16/10',
    border: '1px solid #333',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '12px',
    background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
  },
  imageCredit: {
    fontSize: '11px',
    color: '#fff',
    margin: 0,
  },
  loadingState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#999',
  },
  actionSection: {
    marginBottom: '32px',
  },
  actionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  actionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#fff',
    margin: 0,
  },
  actionItem: {
    display: 'flex',
    gap: '12px',
    marginBottom: '12px',
    alignItems: 'flex-start',
  },
  actionBullet: {
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    background: '#ff4444',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '700',
    flexShrink: 0,
  },
  actionText: {
    fontSize: '14px',
    color: '#fff',
    margin: 0,
    lineHeight: '1.6',
  },
  accountabilityBox: {
    padding: '20px',
    background: 'rgba(255, 126, 0, 0.1)',
    border: '1px solid rgba(255, 126, 0, 0.3)',
    borderRadius: '12px',
  },
  accountabilityTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#ff7e00',
  },
  accountabilityText: {
    fontSize: '14px',
    color: '#fff',
    lineHeight: '1.6',
    marginBottom: '8px',
  },
  pastActionCard: {
    padding: '20px',
    background: '#0a0a0a',
    border: '1px solid #333',
    borderRadius: '12px',
    marginBottom: '16px',
  },
  pastActionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  pastActionYear: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#4a9eff',
  },
  pastActionStatus: {
    padding: '4px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
  },
  pastActionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#fff',
  },
  pastActionImpact: {
    fontSize: '14px',
    color: '#999',
    marginBottom: '4px',
  },
  pastActionBudget: {
    fontSize: '14px',
    color: '#999',
    margin: 0,
  },
  analysisBox: {
    padding: '20px',
    background: 'rgba(74, 158, 255, 0.1)',
    border: '1px solid rgba(74, 158, 255, 0.3)',
    borderRadius: '12px',
    marginTop: '24px',
  },
  analysisTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#4a9eff',
  },
  analysisText: {
    fontSize: '14px',
    color: '#fff',
    lineHeight: '1.6',
    margin: 0,
  },
  citizenGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },
  citizenCard: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    background: '#0a0a0a',
    border: '1px solid #333',
    borderRadius: '12px',
  },
  citizenNumber: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: '#4a9eff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '700',
    flexShrink: 0,
  },
  citizenText: {
    fontSize: '14px',
    color: '#fff',
    margin: 0,
    lineHeight: '1.6',
  },
  activismBox: {
    padding: '24px',
    background: 'rgba(74, 158, 255, 0.1)',
    border: '1px solid rgba(74, 158, 255, 0.3)',
    borderRadius: '12px',
  },
  activismTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#4a9eff',
  },
  activismText: {
    fontSize: '14px',
    color: '#fff',
    lineHeight: '1.6',
    marginBottom: '16px',
  },
  contactInfo: {
    fontSize: '14px',
    color: '#999',
    lineHeight: '1.8',
  },
  newsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
  },
  newsCard: {
    background: '#0a0a0a',
    border: '1px solid #333',
    borderRadius: '12px',
    overflow: 'hidden',
    transition: 'all 0.3s',
    cursor: 'pointer',
  },
  newsImageContainer: {
    width: '100%',
    height: '180px',
    overflow: 'hidden',
    background: '#1a1a1a',
  },
  newsImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  newsContent: {
    padding: '16px',
  },
  newsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  newsSource: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#4a9eff',
    textTransform: 'uppercase',
  },
  newsTime: {
    fontSize: '11px',
    color: '#666',
  },
  newsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    marginBottom: '8px',
    lineHeight: '1.4',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  newsDescription: {
    fontSize: '14px',
    color: '#999',
    lineHeight: '1.5',
    marginBottom: '12px',
  },
  newsLink: {
    fontSize: '13px',
    color: '#4a9eff',
    textDecoration: 'none',
    fontWeight: '600',
    display: 'inline-block',
    transition: 'all 0.3s',
  },
  emptyNewsState: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyNewsText: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '20px',
    lineHeight: '1.6',
  },
  newsInfo: {
    padding: '12px 16px',
    background: 'rgba(74, 158, 255, 0.1)',
    border: '1px solid rgba(74, 158, 255, 0.3)',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  newsInfoText: {
    fontSize: '13px',
    color: '#4a9eff',
    margin: 0,
  },
  refreshNewsBtn: {
    padding: '10px 20px',
    background: '#4a9eff',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
};

export default WardDetailModal;
