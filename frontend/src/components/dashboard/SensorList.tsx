import React from 'react';
import type { SensorNode } from '../../types';
import SensorCard from './SensorCard';

interface SensorListProps {
  nodes: SensorNode[];
}

const SensorList: React.FC<SensorListProps> = ({ nodes }) => {
  if (nodes.length === 0) {
    return (
      <div className="bg-[#090d16] border border-slate-800/70 rounded-2xl p-10 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-800/50 mb-4">
          <svg className="w-7 h-7 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
          </svg>
        </div>
        <h3 className="text-slate-400 font-bold text-sm mb-1">No Sensors Registered</h3>
        <p className="text-slate-600 text-xs font-medium">
          Awaiting edge device registration via the IoT gateway.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-y-auto max-h-[800px] pr-2 pb-10 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
      {nodes.map((node) => (
        <SensorCard key={node.id} node={node} />
      ))}
    </div>
  );
};

export default SensorList;
