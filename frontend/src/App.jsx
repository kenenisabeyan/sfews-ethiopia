import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Activity, Radio, AlertTriangle, CheckCircle, Droplet, 
  CloudRain, Battery, Signal, Zap, AlertOctagon, Send
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

// Subcomponents
const MetricCard = ({ title, value, icon: Icon, colorClass }) => (
  <div className="group bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center space-x-4 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:border-transparent hover:shadow-[0_0_20px_rgba(45,212,191,0.2)] relative overflow-hidden">
    {/* Gradient interactive background state */}
    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
    
    <div className={`relative z-10 p-4 rounded-xl ${colorClass} bg-opacity-10 backdrop-blur-md`}>
      <Icon className={`w-8 h-8 ${colorClass.replace('bg-', 'text-')}`} />
    </div>
    <div>
      <p className="text-slate-400 text-sm font-medium tracking-wide uppercase">{title}</p>
      <h3 className="text-3xl font-extrabold text-white mt-1">{value}</h3>
    </div>
  </div>
);

const StationCard = ({ node, onBroadcast }) => {
  const isCritical = node.flood_probability > 0.7;
  const isWarning = node.flood_probability > 0.4 && !isCritical;
  const isOffline = node.status === 'offline';

  let stateColor = "emerald";
  let stateText = "Safe";
  if (isOffline) {
    stateColor = "slate";
    stateText = "Offline";
  } else if (isCritical) {
    stateColor = "red";
    stateText = "Critical";
  } else if (isWarning) {
    stateColor = "amber";
    stateText = "Warning";
  }

  return (
    <div className={`group relative bg-slate-900 border ${isCritical ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-slate-800'} rounded-2xl p-6 overflow-hidden flex flex-col justify-between transition-all duration-300 hover:border-transparent hover:shadow-[0_0_20px_rgba(45,212,191,0.2)] hover:-translate-y-1`}>
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none" />
      {isCritical && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-3xl rounded-full animate-pulse pointer-events-none" />
      )}
      
      <div>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center">
              {node.location_name}
              {isOffline ? (
                <Signal className="w-4 h-4 ml-2 text-slate-500" />
              ) : (
                <Signal className="w-4 h-4 ml-2 text-emerald-400" />
              )}
            </h3>
            <p className="text-slate-500 text-sm font-mono mt-1">{node.node_id}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center ${
            isCritical ? 'bg-red-500/20 text-red-400' :
            isWarning ? 'bg-amber-500/20 text-amber-400' :
            isOffline ? 'bg-slate-700/50 text-slate-400' :
            'bg-emerald-500/20 text-emerald-400'
          }`}>
            {isCritical && <span className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse" />}
            {stateText}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 my-6">
          <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
            <p className="text-slate-400 text-xs flex items-center mb-1"><Droplet className="w-3 h-3 mr-1"/> Water Level</p>
            <p className="text-lg font-semibold text-white">{node.water_level_cm} cm</p>
          </div>
          <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
            <p className="text-slate-400 text-xs flex items-center mb-1"><CloudRain className="w-3 h-3 mr-1"/> Rainfall</p>
            <p className="text-lg font-semibold text-white">{node.rainfall_mm} mm</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center space-x-2 text-sm text-slate-400">
          <Battery className={`w-4 h-4 ${node.battery_level < 20 ? 'text-red-400' : 'text-emerald-400'}`} />
          <span>{node.battery_level}%</span>
        </div>
        
        {isCritical && (
          <button 
            onClick={() => onBroadcast(node.node_id)}
            className="flex items-center px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-red-500/20"
          >
            <Send className="w-4 h-4 mr-2" />
            Send Alert
          </button>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alertStatus, setAlertStatus] = useState(null);

  const fetchDashboardData = async () => {
    try {
      // Direct relative connection to FastAPI Backend
      const response = await axios.get('http://127.0.0.1:8000/api/v1/dashboard');
      setData(response.data);
      setError(null);
    } catch (err) {
      console.error("Dashboard Fetch Error:", err);
      setError("Unable to connect to the SFEWS Backend API. Database might be offline.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleBroadcast = async (nodeId) => {
    try {
      await axios.post('http://127.0.0.1:8000/api/v1/broadcast', {
        node_id: nodeId,
        message: `EMERGENCY: Critical flood levels detected at ${nodeId}. Evacuate immediately.`
      });
      setAlertStatus(`SMS Alert dispatched for ${nodeId}`);
      setTimeout(() => setAlertStatus(null), 5000);
    } catch (err) {
      console.error("Broadcast Error:", err);
      setAlertStatus(`Failed to send alert for ${nodeId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Activity className="w-12 h-12 text-blue-500 animate-spin mb-4" />
          <h2 className="text-xl font-bold text-slate-300">Initializing SFEWS Engine...</h2>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-red-500/30 p-8 rounded-2xl max-w-lg text-center">
          <AlertOctagon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">System Offline</h2>
          <p className="text-slate-400">{error}</p>
          <button 
            onClick={fetchDashboardData}
            className="mt-6 px-6 py-2 bg-slate-800 hover:bg-gradient-to-r hover:from-blue-500 hover:via-cyan-400 hover:to-emerald-400 text-white rounded-xl transition-all duration-300 shadow-lg"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const { metrics, nodes, history } = data;

  return (
    <div className="min-h-screen bg-[#030712] text-slate-300 p-4 md:p-8 font-sans">
      
      {/* Toast Notification */}
      {alertStatus && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-xl flex items-center animate-bounce">
          <CheckCircle className="w-5 h-5 mr-2" />
          {alertStatus}
        </div>
      )}

      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 mb-2">
            SFEWS Command Center
          </h1>
          <p className="text-slate-500 text-lg">Smart Flood Early Warning System • Ethiopia</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl shadow-inner">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-sm font-mono text-emerald-400">API Connected</span>
        </div>
      </header>

      {/* Component A: Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <MetricCard 
          title="Monitored Nodes" 
          value={`${metrics.active_nodes} / ${metrics.total_nodes}`} 
          icon={Radio} 
          colorClass="bg-blue-500" 
        />
        <MetricCard 
          title="Active Alerts" 
          value={metrics.critical_alerts} 
          icon={AlertTriangle} 
          colorClass={metrics.critical_alerts > 0 ? "bg-red-500" : "bg-emerald-500"} 
        />
        <MetricCard 
          title="System Health" 
          value={metrics.system_health} 
          icon={Zap} 
          colorClass={
            metrics.system_health === 'Critical' ? 'bg-red-500' :
            metrics.system_health === 'Warning' ? 'bg-amber-500' : 'bg-emerald-500'
          } 
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Component B: Station Cards (Left Column) */}
        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-2xl font-bold text-white mb-6">River Node Stations</h2>
          <div className="space-y-6 max-h-[800px] overflow-y-auto pr-2">
            {nodes.map(node => (
              <StationCard key={node.node_id} node={node} onBroadcast={handleBroadcast} />
            ))}
          </div>
        </div>

        {/* Component C: Historical Trends (Right Column) */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl h-full flex flex-col">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white">24-Hour Hydrological Trends</h2>
              <p className="text-slate-500 mt-1">Aggregated water levels (cm) and rainfall (mm) across all active nodes.</p>
            </div>
            
            <div className="flex-grow min-h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRain" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} tickMargin={10} />
                  <YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="waterLevel" 
                    name="Water Level (cm)" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorWater)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="rainfall" 
                    name="Rainfall (mm)" 
                    stroke="#2dd4bf" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorRain)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
