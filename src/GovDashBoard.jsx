import React, { useState, useEffect } from 'react';
import { 
  Activity, AlertTriangle, TrendingUp, TrendingDown, MapPin, Users, 
  Factory, Shield, Bell, Zap, Wind, Target, Radio, LogOut, ArrowRight, BarChart3
} from 'lucide-react';

const GovDashBoard = () => {
  const [time, setTime] = useState(new Date());
  const [selectedWard, setSelectedWard] = useState(null);
  const [hoveredWard, setHoveredWard] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const wards = [
    { id: 1, name: 'Anand Vihar', aqi: 425, lat: 28.6469, lng: 77.3162, zone: 'East', trend: 'up' },
    { id: 2, name: 'Shahdara', aqi: 378, lat: 28.68, lng: 77.28, zone: 'NE', trend: 'stable' },
    { id: 3, name: 'Chandni Chowk', aqi: 365, lat: 28.65, lng: 77.23, zone: 'Central', trend: 'down' },
    { id: 4, name: 'Rohini', aqi: 356, lat: 28.74, lng: 77.11, zone: 'NW', trend: 'up' },
    { id: 5, name: 'Narela', aqi: 387, lat: 28.85, lng: 77.09, zone: 'North', trend: 'up' },
    { id: 6, name: 'Dwarka', aqi: 276, lat: 28.59, lng: 77.04, zone: 'West', trend: 'down' },
    { id: 7, name: 'Saket', aqi: 234, lat: 28.52, lng: 77.21, zone: 'South', trend: 'stable' },
  ];

  const getAQIColor = (aqi) => {
    if (aqi >= 400) return '#8B0000';
    if (aqi >= 300) return '#cc0000';
    if (aqi >= 200) return '#ff3333';
    if (aqi >= 150) return '#ff6600';
    return '#00cc66';
  };

  const criticalZones = wards.filter(w => w.aqi > 300).length;
  const avgAQI = Math.round(wards.reduce((sum, w) => sum + w.aqi, 0) / wards.length);

  const systemAlerts = [
    { id: 1, time: '12:34:21', level: 'CRITICAL', message: 'Anand Vihar AQI exceeded 400', action: 'DEPLOY' },
    { id: 2, time: '11:45:08', level: 'WARNING', message: 'Shahdara trending upward +12%', action: 'MONITOR' },
    { id: 3, time: '10:22:45', level: 'INFO', message: 'Saket showing improvement -8%', action: 'TRACK' },
  ];

  const quickActions = [
    { id: 1, label: 'DEPLOY SPRINKLERS', icon: <Zap size={16} />, status: 'ready' },
    { id: 2, label: 'ODD-EVEN SCHEME', icon: <Shield size={16} />, status: 'pending' },
    { id: 3, label: 'FACTORY INSPECTION', icon: <Factory size={16} />, status: 'active' },
  ];

  return (
    <div style={s.container}>
      {/* Status Bar */}
      <div style={s.statusBar}>
        <div style={s.statusLeft}>
          <div style={s.statusDot} />
          <span>SYSTEM ACTIVE</span>
          <span style={s.divider}>|</span>
          <span style={s.time}>{time.toLocaleTimeString('en-IN', { hour12: false })} IST</span>
        </div>
        <div style={s.statusRight}>
          <Radio size={14} style={{animation: 'pulse 2s infinite'}} />
          <span>LIVE DATA FEED</span>
          <LogOut size={14} style={{cursor: 'pointer', marginLeft: '20px'}} onClick={() => window.location.href = '/'} />
        </div>
      </div>

      {/* Header */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.logo}><Wind size={32} /></div>
          <div>
            <h1 style={s.title}>DELHI AIR QUALITY COMMAND CENTER</h1>
            <p style={s.subtitle}>Real-time Atmospheric Monitoring & Control System</p>
          </div>
        </div>
        <div style={s.headerStats}>
          <div style={s.headerStat}>
            <span style={s.statLabel}>STATUS</span>
            <span style={{...s.statVal, color: '#00ff00'}}>OPERATIONAL</span>
          </div>
          <div style={s.headerStat}>
            <span style={s.statLabel}>LATENCY</span>
            <span style={{...s.statVal, color: '#00ff00'}}>0.8s</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={s.statsGrid}>
        <div style={{...s.statCard, borderLeft: '3px solid #cc0000'}}>
          <div style={s.statHeader}>
            <AlertTriangle size={20} color="#cc0000" />
            <span>CRITICAL ZONES</span>
          </div>
          <div style={s.statValue}>{criticalZones}</div>
          <div style={s.statFooter}>AQI {'>'} 300</div>
        </div>
        
        <div style={{...s.statCard, borderLeft: '3px solid #4a9eff'}}>
          <div style={s.statHeader}>
            <Target size={20} color="#4a9eff" />
            <span>AVG AQI</span>
          </div>
          <div style={{...s.statValue, color: getAQIColor(avgAQI)}}>{avgAQI}</div>
          <div style={s.statFooter}>+12% vs yesterday</div>
        </div>
        
        <div style={{...s.statCard, borderLeft: '3px solid #8f3f97'}}>
          <div style={s.statHeader}>
            <MapPin size={20} color="#8f3f97" />
            <span>STATIONS</span>
          </div>
          <div style={s.statValue}>{wards.length}</div>
          <div style={s.statFooter}>All online</div>
        </div>
      </div>

      {/* Main Grid */}
      <div style={s.mainGrid}>
        {/* Map */}
        <div style={s.mapSection}>
          <div style={s.sectionHeader}>
            <span style={s.sectionTitle}><MapPin size={18} /> LIVE SITUATION MAP</span>
          </div>
          
          <div style={s.mapContainer}>
            <svg viewBox="0 0 1000 800" style={s.svg}>
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* Grid */}
              <g opacity="0.1">
                {[...Array(25)].map((_, i) => (
                  <React.Fragment key={i}>
                    <line x1={i * 40} y1="0" x2={i * 40} y2="800" stroke="#00ff00" strokeWidth="0.5"/>
                    <line x1="0" y1={i * 32} x2="1000" y2={i * 32} stroke="#00ff00" strokeWidth="0.5"/>
                  </React.Fragment>
                ))}
              </g>

              {/* Markers */}
              {wards.map(ward => {
                const x = (ward.lng - 76.85) * 1400;
                const y = 800 - (ward.lat - 28.4) * 1500;
                const isHovered = hoveredWard === ward.id;
                const radius = isHovered ? 20 : 14;

                return (
                  <g key={ward.id}>
                    {ward.aqi > 350 && (
                      <circle cx={x} cy={y} r={radius + 12} fill={getAQIColor(ward.aqi)} opacity="0.2" style={{animation: 'pulse 2s infinite'}}/>
                    )}
                    
                    <circle
                      cx={x} cy={y} r={radius}
                      fill={getAQIColor(ward.aqi)}
                      stroke="#00ff00"
                      strokeWidth={isHovered ? "2" : "1"}
                      style={{cursor: 'pointer', transition: 'all 0.3s', filter: isHovered ? 'url(#glow)' : 'none'}}
                      onMouseEnter={() => setHoveredWard(ward.id)}
                      onMouseLeave={() => setHoveredWard(null)}
                      onClick={() => setSelectedWard(ward)}
                    />
                    
                    <text x={x} y={y + 4} textAnchor="middle" fill="#000" fontSize="10" fontWeight="bold" fontFamily="monospace" pointerEvents="none">
                      {ward.aqi}
                    </text>

                    {isHovered && (
                      <g>
                        <rect x={x - 50} y={y - radius - 40} width="100" height="32" rx="4" fill="#000" stroke="#00ff00" strokeWidth="1" opacity="0.95"/>
                        <text x={x} y={y - radius - 24} textAnchor="middle" fill="#00ff00" fontSize="10" fontFamily="monospace" fontWeight="bold">{ward.name}</text>
                        <text x={x} y={y - radius - 12} textAnchor="middle" fill={getAQIColor(ward.aqi)} fontSize="11" fontFamily="monospace" fontWeight="bold">AQI: {ward.aqi}</text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            <div style={s.legend}>
              <div style={s.legendTitle}>THREAT LEVELS</div>
              {[
                { label: 'CRITICAL', color: '#cc0000', range: '300+' },
                { label: 'UNHEALTHY', color: '#ff6600', range: '200-300' },
                { label: 'GOOD', color: '#00cc66', range: '0-100' },
              ].map(item => (
                <div key={item.label} style={s.legendItem}>
                  <div style={{...s.legendDot, background: item.color}} />
                  <span style={s.legendLabel}>{item.label}</span>
                  <span style={s.legendRange}>{item.range}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div style={s.rightPanel}>
          {/* Alerts */}
          <div style={s.alertsSection}>
            <div style={s.sectionHeader}>
              <span style={s.sectionTitle}><Bell size={18} /> LIVE ALERTS</span>
              <div style={{...s.statusDot, animation: 'pulse 1s infinite'}} />
            </div>
            <div style={s.alertsList}>
              {systemAlerts.map(alert => (
                <div key={alert.id} style={{
                  ...s.alertItem,
                  borderLeft: `3px solid ${alert.level === 'CRITICAL' ? '#ff3333' : alert.level === 'WARNING' ? '#ffaa00' : '#4a9eff'}`
                }}>
                  <div style={s.alertHeader}>
                    <span style={s.alertTime}>[{alert.time}]</span>
                    <span style={{...s.alertLevel, color: alert.level === 'CRITICAL' ? '#ff3333' : '#ffaa00'}}>{alert.level}</span>
                  </div>
                  <p style={s.alertMessage}>{alert.message}</p>
                  <button style={s.alertBtn}>{alert.action} <ArrowRight size={12} /></button>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={s.actionsSection}>
            <div style={s.sectionHeader}>
              <span style={s.sectionTitle}><Zap size={18} /> QUICK ACTIONS</span>
            </div>
            <div style={s.actionsList}>
              {quickActions.map(action => (
                <button key={action.id} style={{
                  ...s.actionBtn,
                  borderLeft: `3px solid ${action.status === 'active' ? '#00ff00' : '#4a9eff'}`
                }}>
                  <div style={s.actionIcon}>{action.icon}</div>
                  <span style={s.actionLabel}>{action.label}</span>
                  <div style={{...s.actionStatus, background: action.status === 'active' ? '#00ff0020' : '#4a9eff20', color: action.status === 'active' ? '#00ff00' : '#4a9eff'}}>
                    {action.status.toUpperCase()}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};

const s = {
  container: { minHeight: '100vh', background: '#000', color: '#00ff00', fontFamily: '"Courier New", monospace' },
  statusBar: { background: '#0a0a0a', borderBottom: '1px solid #00ff0030', padding: '8px 20px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', letterSpacing: '0.5px' },
  statusLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
  statusRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  statusDot: { width: '8px', height: '8px', borderRadius: '50%', background: '#ff3333', boxShadow: '0 0 8px #ff3333' },
  divider: { color: '#00ff0050', margin: '0 8px' },
  time: { color: '#4a9eff', fontWeight: '700' },
  header: { padding: '20px 40px', borderBottom: '2px solid #00ff0050', display: 'flex', justifyContent: 'space-between', background: 'linear-gradient(180deg, #0a0a0a 0%, #000 100%)' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '20px' },
  logo: { width: '56px', height: '56px', background: 'linear-gradient(135deg, #00ff00 0%, #00cc66 100%)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', boxShadow: '0 0 20px #00ff0050' },
  title: { fontSize: '24px', fontWeight: '700', margin: 0, letterSpacing: '2px', textShadow: '0 0 10px #00ff0050' },
  subtitle: { fontSize: '12px', color: '#00ff0080', margin: '4px 0 0 0', letterSpacing: '1px' },
  headerStats: { display: 'flex', gap: '24px' },
  headerStat: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' },
  statLabel: { fontSize: '10px', color: '#00ff0080', marginBottom: '4px' },
  statVal: { fontSize: '16px', fontWeight: '700' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', padding: '20px 40px' },
  statCard: { background: '#0a0a0a', border: '1px solid #00ff0020', borderRadius: '4px', padding: '16px' },
  statHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '10px', color: '#00ff00' },
  statValue: { fontSize: '32px', fontWeight: '700', color: '#fff', marginBottom: '8px', textShadow: '0 0 10px currentColor' },
  statFooter: { fontSize: '11px', color: '#00ff0080' },
  mainGrid: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', padding: '20px 40px' },
  mapSection: { background: '#0a0a0a', border: '1px solid #00ff0030', borderRadius: '4px', overflow: 'hidden' },
  sectionHeader: { padding: '12px 16px', borderBottom: '1px solid #00ff0030', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '1px' },
  mapContainer: { position: 'relative', padding: '20px', minHeight: '600px' },
  svg: { width: '100%', height: 'auto' },
  legend: { position: 'absolute', top: '30px', right: '30px', background: '#000', border: '1px solid #00ff00', borderRadius: '4px', padding: '12px' },
  legendTitle: { fontSize: '10px', fontWeight: '700', marginBottom: '12px', color: '#00ff00' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '10px' },
  legendDot: { width: '12px', height: '12px', borderRadius: '50%' },
  legendLabel: { flex: 1 },
  legendRange: { color: '#00ff0080' },
  rightPanel: { display: 'flex', flexDirection: 'column', gap: '20px' },
  alertsSection: { background: '#0a0a0a', border: '1px solid #00ff0030', borderRadius: '4px' },
  alertsList: { padding: '12px', maxHeight: '300px', overflowY: 'auto' },
  alertItem: { background: '#000', border: '1px solid #00ff0020', borderRadius: '4px', padding: '12px', marginBottom: '8px' },
  alertHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' },
  alertTime: { fontSize: '10px', color: '#00ff0080' },
  alertLevel: { fontSize: '10px', fontWeight: '700' },
  alertMessage: { fontSize: '11px', margin: '0 0 8px 0', lineHeight: '1.4' },
  alertBtn: { background: '#ff333320', border: '1px solid #ff3333', borderRadius: '4px', padding: '6px 12px', color: '#ff3333', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700', letterSpacing: '0.5px' },
  actionsSection: { background: '#0a0a0a', border: '1px solid #00ff0030', borderRadius: '4px' },
  actionsList: { padding: '12px' },
  actionBtn: { width: '100%', background: '#000', border: '1px solid #00ff0020', borderRadius: '4px', padding: '12px', marginBottom: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.3s', fontFamily: 'inherit', color: 'inherit' },
  actionIcon: { width: '32px', height: '32px', background: '#00ff0010', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  actionLabel: { flex: 1, fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px', textAlign: 'left' },
  actionStatus: { padding: '4px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: '700', letterSpacing: '0.5px' },
};

export default GovDashBoard;