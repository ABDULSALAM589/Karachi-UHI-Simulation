import { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const getLSTColor = (lst) => {
  if (lst > 45) return '#800026';
  if (lst > 40) return '#BD0026';
  if (lst > 35) return '#E31A1C';
  if (lst > 30) return '#FC4E2A';
  if (lst > 25) return '#FD8D3C';
  if (lst > 20) return '#FEB24C';
  return '#FFEDA0';
};

function App() {
  const [data, setData] = useState([]);
  const [baselineAvg, setBaselineAvg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
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
        // Albedo slider is 0-100%, we pass it as a fraction 0-1 to match previous backend scale
        delta_albedo: parseFloat(albedoDelta) / 100.0,
        delta_ndbi_percent: parseFloat(ndbiDelta)
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

  const currentAvg = data.length > 0 ? data.reduce((sum, p) => sum + p.LST, 0) / data.length : null;
  const tempChange = (baselineAvg !== null && currentAvg !== null) ? currentAvg - baselineAvg : 0;

  return (
    <div className="flex h-screen font-sans bg-gray-900 text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div className="w-96 bg-gray-800 p-6 flex flex-col shadow-2xl z-[2000] relative overflow-y-auto">
        <h1 className="text-2xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">
          Karachi UHI Simulator
        </h1>
        <p className="text-sm text-gray-400 mb-6">Predict the impact of greening and cool roofs on Urban Heat Islands.</p>

        {/* Core Metrics */}
        <div className="bg-gray-700/50 border border-gray-600 p-4 rounded-lg mb-6 shadow-inner">
          <div className="flex justify-between items-end mb-2">
            <div>
              <div className="text-sm text-gray-400">Current Average</div>
              <div className="text-3xl font-bold text-white mt-1">
                {currentAvg ? currentAvg.toFixed(2) : '--'} <span className="text-lg text-gray-400 font-normal">°C</span>
              </div>
            </div>
            {Math.abs(tempChange) > 0.01 && (
              <div className={`text-lg font-bold ${tempChange < 0 ? 'text-teal-400' : 'text-red-400'}`}>
                {tempChange > 0 ? '+' : ''}{tempChange.toFixed(2)} °C
              </div>
            )}
          </div>
        </div>

        {/* Policy Impact Panel */}
        {Math.abs(tempChange) > 0.05 && (
          <div className={`p-4 rounded-lg mb-6 border ${tempChange < 0 ? 'bg-teal-900/30 border-teal-700/50' : 'bg-red-900/30 border-red-700/50'}`}>
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              {tempChange < 0 ? '📉 Cooling Impact' : '📈 Warming Impact'}
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              {tempChange < 0 ? (
                <>
                  This scenario reduces average temperatures by <b>{Math.abs(tempChange).toFixed(2)}°C</b>. 
                  This translates to approximately an <b>{(Math.abs(tempChange) * 4).toFixed(1)}%</b> drop in peak cooling energy demand, 
                  significantly lowering heat-stress risks for vulnerable populations in dense areas.
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

        {error && <div className="bg-red-900 text-red-200 p-3 rounded mb-4 text-sm">{error}</div>}

        <div className="flex-1 space-y-6">
          <div className="space-y-2">
            <label className="flex justify-between text-sm font-medium">
              <span>Vegetation (NDVI)</span>
              <span className="text-teal-400">{ndviDelta > 0 ? '+' : ''}{ndviDelta}%</span>
            </label>
            <input 
              type="range" 
              min="-100" max="100" step="5"
              value={ndviDelta} 
              onChange={(e) => setNdviDelta(e.target.value)}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
            />
          </div>

          <div className="space-y-2">
            <label className="flex justify-between text-sm font-medium">
              <span>Cool Roofs (Albedo Coverage)</span>
              <span className="text-blue-400">+{albedoDelta}%</span>
            </label>
            <input 
              type="range" 
              min="0" max="100" step="5"
              value={albedoDelta} 
              onChange={(e) => setAlbedoDelta(e.target.value)}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="flex justify-between text-sm font-medium">
              <span>Urbanization (NDBI)</span>
              <span className="text-orange-400">{ndbiDelta > 0 ? '+' : ''}{ndbiDelta}%</span>
            </label>
            <input 
              type="range" 
              min="-100" max="100" step="5"
              value={ndbiDelta} 
              onChange={(e) => setNdbiDelta(e.target.value)}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
          </div>
        </div>

        <div className="space-y-3 mt-8">
          <button 
            onClick={handleSimulate}
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-teal-500/30 disabled:opacity-50"
          >
            {loading ? 'Simulating...' : 'Run Simulation'}
          </button>
          
          <button 
            onClick={handleReset}
            disabled={loading}
            className="w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all"
          >
            Reset Baseline
          </button>
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative bg-gray-900 z-10">
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
          {data.map((point, idx) => (
            <CircleMarker
              key={`${idx}-${point.LST}`}
              center={[point.latitude, point.longitude]}
              radius={4}
              pathOptions={{
                fillColor: getLSTColor(point.LST),
                color: getLSTColor(point.LST),
                weight: 1,
                opacity: 0.8,
                fillOpacity: 0.7
              }}
            >
              <Popup>
                <div className="text-gray-900">
                  <p className="font-bold">LST: {point.LST.toFixed(2)} °C</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
        
        {/* Legend */}
        <div className="absolute bottom-8 right-8 bg-gray-800/90 backdrop-blur p-4 rounded-xl shadow-xl border border-gray-700 z-[1000]">
          <h3 className="text-sm font-medium mb-3 text-gray-200">Surface Temp (°C)</h3>
          <div className="flex items-center gap-2 mb-1"><span className="w-4 h-4 rounded-full bg-[#800026]"></span> <span className="text-xs text-gray-300">&gt; 45°</span></div>
          <div className="flex items-center gap-2 mb-1"><span className="w-4 h-4 rounded-full bg-[#BD0026]"></span> <span className="text-xs text-gray-300">40 - 45°</span></div>
          <div className="flex items-center gap-2 mb-1"><span className="w-4 h-4 rounded-full bg-[#E31A1C]"></span> <span className="text-xs text-gray-300">35 - 40°</span></div>
          <div className="flex items-center gap-2 mb-1"><span className="w-4 h-4 rounded-full bg-[#FC4E2A]"></span> <span className="text-xs text-gray-300">30 - 35°</span></div>
          <div className="flex items-center gap-2 mb-1"><span className="w-4 h-4 rounded-full bg-[#FD8D3C]"></span> <span className="text-xs text-gray-300">25 - 30°</span></div>
          <div className="flex items-center gap-2 mb-1"><span className="w-4 h-4 rounded-full bg-[#FEB24C]"></span> <span className="text-xs text-gray-300">20 - 25°</span></div>
          <div className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-[#FFEDA0]"></span> <span className="text-xs text-gray-300">&lt; 20°</span></div>
        </div>
      </div>
    </div>
  );
}

export default App;
