import { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// ─── Color Scales ────────────────────────────────────────────────────────────

const getLSTColor = (lst) => {
  if (lst > 45) return '#800026';
  if (lst > 40) return '#BD0026';
  if (lst > 35) return '#E31A1C';
  if (lst > 30) return '#FC4E2A';
  if (lst > 25) return '#FD8D3C';
  if (lst > 20) return '#FEB24C';
  return '#FFEDA0';
};

const getNDBIColor = (ndbi) => {
  if (ndbi > 0.3)  return '#7f0000';
  if (ndbi > 0.2)  return '#b30000';
  if (ndbi > 0.1)  return '#d7301f';
  if (ndbi > 0.0)  return '#ef6548';
  if (ndbi > -0.1) return '#fc8d59';
  if (ndbi > -0.2) return '#fdbb84';
  return '#fdd49e';
};

const getNDVIColor = (ndvi) => {
  if (ndvi > 0.5)  return '#006837';
  if (ndvi > 0.4)  return '#1a9850';
  if (ndvi > 0.3)  return '#66bd63';
  if (ndvi > 0.2)  return '#a6d96a';
  if (ndvi > 0.1)  return '#d9ef8b';
  if (ndvi > 0.0)  return '#fee08b';
  return '#d73027';
};

// ─── View Definitions ────────────────────────────────────────────────────────

const VIEW_MODES = [
  { id: 'original', label: 'Original Map', icon: '🗺️' },
  { id: 'lst',      label: 'LST',          icon: '🌡️' },
  { id: 'ndbi',     label: 'NDBI',         icon: '🏗️' },
  { id: 'ndvi',     label: 'NDVI',         icon: '🌿' },
];

const LEGENDS = {
  lst: {
    title: 'Surface Temp (°C)',
    items: [
      { color: '#800026', label: '> 45°' },
      { color: '#BD0026', label: '40 – 45°' },
      { color: '#E31A1C', label: '35 – 40°' },
      { color: '#FC4E2A', label: '30 – 35°' },
      { color: '#FD8D3C', label: '25 – 30°' },
      { color: '#FEB24C', label: '20 – 25°' },
      { color: '#FFEDA0', label: '< 20°' },
    ],
  },
  ndbi: {
    title: 'Built-up Index',
    items: [
      { color: '#7f0000', label: '> 0.3' },
      { color: '#b30000', label: '0.2 – 0.3' },
      { color: '#d7301f', label: '0.1 – 0.2' },
      { color: '#ef6548', label: '0.0 – 0.1' },
      { color: '#fc8d59', label: '-0.1 – 0.0' },
      { color: '#fdbb84', label: '-0.2 – -0.1' },
      { color: '#fdd49e', label: '< -0.2' },
    ],
  },
  ndvi: {
    title: 'Vegetation Index',
    items: [
      { color: '#006837', label: '> 0.5' },
      { color: '#1a9850', label: '0.4 – 0.5' },
      { color: '#66bd63', label: '0.3 – 0.4' },
      { color: '#a6d96a', label: '0.2 – 0.3' },
      { color: '#d9ef8b', label: '0.1 – 0.2' },
      { color: '#fee08b', label: '0.0 – 0.1' },
      { color: '#d73027', label: '< 0.0' },
    ],
  },
};

// ─── App ─────────────────────────────────────────────────────────────────────

function App() {
  const [data, setData] = useState([]);
  const [baselineAvg, setBaselineAvg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('lst');

  const [ndviDelta, setNdviDelta] = useState(0);
  const [albedoDelta, setAlbedoDelta] = useState(0);
  const [ndbiDelta, setNdbiDelta] = useState(0);

  useEffect(() => {
    fetchBaseline();
  }, []);



  const fetchBaseline = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/baseline');
      const baselineData = res.data.data;
      setData(baselineData);

      if (baselineData.length > 0) {
        const avg = baselineData.reduce((sum, p) => sum + p.LST, 0) / baselineData.length;
        setBaselineAvg(avg);
      }
    } catch (err) {
      setError('Failed to fetch baseline data.');
    }
    setLoading(false);
  };

  const handleSimulate = async () => {
    setLoading(true);
    try {
      const res = await axios.post('http://127.0.0.1:8000/api/simulate', {
        delta_ndvi_percent: parseFloat(ndviDelta),
        delta_albedo: parseFloat(albedoDelta) / 100.0,
        delta_ndbi_percent: parseFloat(ndbiDelta),
      });
      setData(res.data.data);
    } catch (err) {
      setError('Failed to run simulation.');
    }
    setLoading(false);
  };

  const handleReset = () => {
    setNdviDelta(0);
    setAlbedoDelta(0);
    setNdbiDelta(0);
    fetchBaseline();
  };

  // ── Derived values ──
  const currentAvg = data.length > 0 ? data.reduce((sum, p) => sum + p.LST, 0) / data.length : null;
  const tempChange = baselineAvg !== null && currentAvg !== null ? currentAvg - baselineAvg : 0;

  // Resolve color per point depending on view
  const getPointColor = (point) => {
    if (viewMode === 'lst')  return getLSTColor(point.LST);
    if (viewMode === 'ndbi') return getNDBIColor(point.NDBI);
    if (viewMode === 'ndvi') return getNDVIColor(point.NDVI);
    return '#60a5fa'; // fallback (original view won't hit this)
  };

  const getPopupContent = (point) => {
    if (viewMode === 'lst')  return `LST: ${point.LST.toFixed(2)} °C`;
    if (viewMode === 'ndbi') return `NDBI: ${point.NDBI.toFixed(4)}`;
    if (viewMode === 'ndvi') return `NDVI: ${point.NDVI.toFixed(4)}`;
    return '';
  };

  const showOverlay = viewMode !== 'original';
  const currentLegend = LEGENDS[viewMode] || null;

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      background: '#0f172a',
      color: '#e2e8f0',
      overflow: 'hidden',
    }}>
      {/* ─── Sidebar ─── */}
      <div style={{
        width: 380,
        minWidth: 380,
        background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
        padding: 28,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
        zIndex: 2000,
        position: 'relative',
        overflowY: 'auto',
        borderRight: '1px solid rgba(148,163,184,0.08)',
      }}>
        {/* Logo / Title */}
        <div style={{ marginBottom: 8 }}>
          <h1 style={{
            fontSize: 22,
            fontWeight: 800,
            margin: 0,
            background: 'linear-gradient(135deg, #2dd4bf, #3b82f6, #8b5cf6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
          }}>
            Karachi UHI Simulator
          </h1>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '6px 0 0', lineHeight: 1.5 }}>
            XGBoost-powered prediction — simulate greening, cool roofs &amp; urbanization impacts.
          </p>
        </div>

        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #334155, transparent)', margin: '20px 0' }} />

        {/* Metrics Card */}
        <div style={{
          background: 'rgba(30,41,59,0.7)',
          border: '1px solid rgba(148,163,184,0.12)',
          backdropFilter: 'blur(12px)',
          padding: 20,
          borderRadius: 14,
          marginBottom: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Current Average</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#f8fafc', marginTop: 4, letterSpacing: '-0.03em' }}>
                {currentAvg ? currentAvg.toFixed(2) : '--'}
                <span style={{ fontSize: 16, color: '#64748b', fontWeight: 400, marginLeft: 4 }}>°C</span>
              </div>
            </div>
            {Math.abs(tempChange) > 0.01 && (
              <div style={{
                fontSize: 18,
                fontWeight: 700,
                color: tempChange < 0 ? '#2dd4bf' : '#f87171',
                background: tempChange < 0 ? 'rgba(45,212,191,0.1)' : 'rgba(248,113,113,0.1)',
                padding: '6px 12px',
                borderRadius: 10,
                border: `1px solid ${tempChange < 0 ? 'rgba(45,212,191,0.2)' : 'rgba(248,113,113,0.2)'}`,
              }}>
                {tempChange > 0 ? '+' : ''}{tempChange.toFixed(2)} °C
              </div>
            )}
          </div>
        </div>

        {/* Policy Impact */}
        {Math.abs(tempChange) > 0.05 && (
          <div style={{
            padding: 16,
            borderRadius: 14,
            marginBottom: 20,
            border: `1px solid ${tempChange < 0 ? 'rgba(45,212,191,0.2)' : 'rgba(248,113,113,0.2)'}`,
            background: tempChange < 0 ? 'rgba(45,212,191,0.06)' : 'rgba(248,113,113,0.06)',
          }}>
            <h3 style={{ fontWeight: 600, fontSize: 13, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
              {tempChange < 0 ? '📉 Cooling Impact' : '📈 Warming Impact'}
            </h3>
            <p style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>
              {tempChange < 0 ? (
                <>
                  This scenario reduces average temperatures by <b>{Math.abs(tempChange).toFixed(2)}°C</b>.
                  This translates to approximately a <b>{(Math.abs(tempChange) * 4).toFixed(1)}%</b> drop in peak cooling energy demand,
                  significantly lowering heat-stress risks for vulnerable populations.
                </>
              ) : (
                <>
                  This scenario increases average temperatures by <b>{Math.abs(tempChange).toFixed(2)}°C</b>.
                  This could spike peak cooling energy demand by <b>{(Math.abs(tempChange) * 4).toFixed(1)}%</b> and
                  exacerbate heat-related illnesses across the urban core.
                </>
              )}
            </p>
          </div>
        )}

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#fca5a5',
            padding: 12,
            borderRadius: 10,
            marginBottom: 16,
            fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {/* Sliders */}
        <div style={{ flex: 1 }}>
          <SliderControl
            label="Vegetation (NDVI)"
            value={ndviDelta}
            onChange={setNdviDelta}
            min={-100} max={100} step={5}
            color="#2dd4bf"
            unit="%"
            showSign
          />
          <SliderControl
            label="Cool Roofs (Albedo)"
            value={albedoDelta}
            onChange={setAlbedoDelta}
            min={0} max={100} step={5}
            color="#60a5fa"
            unit="%"
            prefix="+"
          />
          <SliderControl
            label="Urbanization (NDBI)"
            value={ndbiDelta}
            onChange={setNdbiDelta}
            min={-100} max={100} step={5}
            color="#fb923c"
            unit="%"
            showSign
          />
        </div>

        {/* Buttons */}
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            id="btn-simulate"
            onClick={handleSimulate}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px 0',
              background: loading ? '#334155' : 'linear-gradient(135deg, #14b8a6, #3b82f6)',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 14,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(20,184,166,0.3)',
              transition: 'all 0.3s ease',
              letterSpacing: '0.01em',
            }}
          >
            {loading ? '⏳ Simulating...' : '▶ Run Simulation'}
          </button>
          <button
            id="btn-reset"
            onClick={handleReset}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 0',
              background: 'rgba(51,65,85,0.5)',
              color: '#94a3b8',
              border: '1px solid rgba(148,163,184,0.15)',
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 13,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.3s ease',
            }}
          >
            ↺ Reset Baseline
          </button>
        </div>

        {/* Model Badge */}
        <div style={{
          marginTop: 20,
          padding: '10px 14px',
          background: 'rgba(139,92,246,0.08)',
          border: '1px solid rgba(139,92,246,0.2)',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: 14 }}>🤖</span>
          <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 600, letterSpacing: '0.03em' }}>
            Model: XGBoost Regressor
          </span>
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        background: '#0f172a',
        zIndex: 10,
      }}>
        {/* Map Area */}
        <div style={{ flex: 1, position: 'relative' }}>
          <MapContainer
            center={[24.9, 67.08]}
            zoom={11}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {showOverlay && data.map((point, idx) => (
              <CircleMarker
                key={`${viewMode}-${idx}-${point.LST}`}
                center={[point.latitude, point.longitude]}
                radius={4}
                pathOptions={{
                  fillColor: getPointColor(point),
                  color: getPointColor(point),
                  weight: 1,
                  opacity: 0.85,
                  fillOpacity: 0.75,
                }}
              >
                <Popup>
                  <div style={{ color: '#1e293b', fontFamily: "'Inter', sans-serif", fontSize: 13 }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>{getPopupContent(point)}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>
                      {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>

          {/* ─── View Mode Selector (floating pills) ─── */}
          <div style={{
            position: 'absolute',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            display: 'flex',
            gap: 4,
            background: 'rgba(15,23,42,0.85)',
            backdropFilter: 'blur(16px)',
            padding: 5,
            borderRadius: 16,
            border: '1px solid rgba(148,163,184,0.15)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}>
            {VIEW_MODES.map((mode) => (
              <button
                key={mode.id}
                id={`view-${mode.id}`}
                onClick={() => setViewMode(mode.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: viewMode === mode.id ? 700 : 500,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  background: viewMode === mode.id
                    ? 'linear-gradient(135deg, rgba(45,212,191,0.25), rgba(59,130,246,0.25))'
                    : 'transparent',
                  color: viewMode === mode.id ? '#f8fafc' : '#64748b',
                  boxShadow: viewMode === mode.id
                    ? '0 0 0 1px rgba(45,212,191,0.3), inset 0 1px 0 rgba(255,255,255,0.05)'
                    : 'none',
                }}
              >
                <span style={{ fontSize: 15 }}>{mode.icon}</span>
                {mode.label}
              </button>
            ))}
          </div>

          {/* ─── Legend ─── */}
          {currentLegend && (
            <div style={{
              position: 'absolute',
              bottom: 24,
              right: 24,
              background: 'rgba(15,23,42,0.88)',
              backdropFilter: 'blur(16px)',
              padding: '16px 20px',
              borderRadius: 14,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              border: '1px solid rgba(148,163,184,0.12)',
              zIndex: 1000,
            }}>
              <h3 style={{
                fontSize: 12,
                fontWeight: 700,
                margin: '0 0 12px',
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}>
                {currentLegend.title}
              </h3>
              {currentLegend.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < currentLegend.items.length - 1 ? 6 : 0 }}>
                  <span style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: item.color,
                    display: 'inline-block',
                    boxShadow: `0 0 8px ${item.color}40`,
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 12, color: '#cbd5e1' }}>{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>


      </div>
    </div>
  );
}

// ─── Slider Component ────────────────────────────────────────────────────────

function SliderControl({ label, value, onChange, min, max, step, color, unit, showSign, prefix }) {
  const displayValue = () => {
    let v = `${value}${unit}`;
    if (showSign && value > 0) v = `+${v}`;
    if (prefix) v = `${prefix}${v}`;
    return v;
  };

  return (
    <div style={{ marginBottom: 22 }}>
      <label style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 13,
        fontWeight: 500,
        marginBottom: 10,
        color: '#e2e8f0',
      }}>
        <span>{label}</span>
        <span style={{ color, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{displayValue()}</span>
      </label>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          height: 6,
          borderRadius: 3,
          appearance: 'none',
          background: `linear-gradient(90deg, ${color}40, ${color})`,
          cursor: 'pointer',
          outline: 'none',
          accentColor: color,
        }}
      />
    </div>
  );
}

export default App;
