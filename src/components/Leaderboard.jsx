import React from 'react';
import { Trophy, Star } from 'lucide-react';
import { Bar } from 'react-chartjs-2';

export default function Leaderboard({ champion, earlyBird, chartData, chartMode, setChartMode }) {
  return (
    <div className="flex-1 grid grid-cols-12 gap-4 overflow-hidden">
      <div className="col-span-8 flex flex-col gap-4">
        {/* Champions Row */}
        <div className="grid grid-cols-2 gap-4 h-[140px] flex-none">
          <div className="bg-white border border-red-100 p-4 rounded-xl relative overflow-hidden flex flex-col justify-between">
            <Trophy className="absolute top-2 right-2 w-16 h-16 text-red-50 rotate-12" />
            <div>
              <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[9px] font-bold uppercase rounded-md">Champion</span>
              <h2 className="text-2xl font-bold italic truncate mt-1 text-slate-800">{champion?.name || '-'}</h2>
              <p className="text-slate-400 text-[10px] truncate">{champion?.dept || '-'}</p>
            </div>
            <div className="border-t border-red-50 pt-2">
              <p className="text-[9px] text-slate-400 uppercase">Total: <span className="text-red-600 font-bold">{champion?.count || 0}</span></p>
            </div>
          </div>
          <div className="bg-white border border-slate-100 p-4 rounded-xl relative overflow-hidden flex flex-col justify-between">
            <div className="relative z-10">
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-bold uppercase rounded-md">Speed Star</span>
              <h2 className="text-2xl font-bold italic truncate mt-1 text-slate-800">{earlyBird?.Name || '-'}</h2>
              <p className="text-slate-400 text-[10px] truncate">{earlyBird?.CreatedDateTime || '-'}</p>
            </div>
          </div>
        </div>

        {/* Chart Section */}
        <div className="flex-1 bg-white border border-slate-200 p-4 rounded-xl flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase text-slate-800">Top Performers</h3>
            <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg">
              <button onClick={() => setChartMode('user')} className={`px-2 py-1 text-[9px] font-bold rounded ${chartMode === 'user' ? 'bg-white shadow-sm' : 'text-slate-400'}`}>User</button>
              <button onClick={() => setChartMode('dept')} className={`px-2 py-1 text-[9px] font-bold rounded ${chartMode === 'dept' ? 'bg-white shadow-sm' : 'text-slate-400'}`}>Dept</button>
            </div>
          </div>
          <div className="flex-1 min-h-0"><Bar data={chartData} options={{ indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} /></div>
        </div>
      </div>
    </div>
  );
}