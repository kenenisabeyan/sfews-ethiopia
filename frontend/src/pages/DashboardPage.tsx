import React from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import Header from '../components/layout/Header';
import KpiGrid from '../components/dashboard/KpiGrid';
import SensorList from '../components/dashboard/SensorList';
import HydroChart from '../components/dashboard/HydroChart';
import ChatPanel from '../components/chat/ChatPanel';

const DashboardPage: React.FC = () => {
  const { payload, isConnected } = useWebSocket();

  return (
    <div className="min-h-screen bg-[#030712] text-slate-200 font-sans p-4 md:p-8 selection:bg-cyan-500/30">
      <Header isWsConnected={isConnected} />

      {/* KPI Cards */}
      {payload ? (
        <KpiGrid summary={payload.summary} />
      ) : (
        // Loading skeleton for KPI cards
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[#090d16] border border-slate-800/50 rounded-2xl p-7 h-32 animate-pulse" />
          ))}
        </div>
      )}

      {/* Main content: Sensor list + Chart */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left column: Sensor nodes */}
        <div className="xl:col-span-1 space-y-5">
          <h2 className="text-lg font-bold text-slate-200 border-b border-slate-800/80 pb-3 tracking-wide uppercase">
            Pilot River Nodes
          </h2>

          {payload ? (
            <SensorList nodes={payload.nodes} />
          ) : (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 bg-[#090d16] border border-slate-800/50 rounded-2xl" />
              ))}
            </div>
          )}
        </div>

        {/* Right column: Hydrological chart */}
        <div className="xl:col-span-2">
          {payload ? (
            <HydroChart history={payload.history} />
          ) : (
            <div className="bg-[#090d16] border border-slate-800/50 rounded-2xl h-[500px] animate-pulse" />
          )}
        </div>
      </div>

      {/* AI Chat Panel (floating) */}
      <ChatPanel />
    </div>
  );
};

export default DashboardPage;
