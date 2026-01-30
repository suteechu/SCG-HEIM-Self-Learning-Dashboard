import React from 'react';
import { Database, CheckCircle2, Activity, PieChart, UserX } from 'lucide-react';

const Card = ({ children, className = "" }) => (
  <div className={`bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex items-center gap-3 ${className}`}>
    {children}
  </div>
);

export default function KpiCards({ stats, pendingCount }) {
  return (
    <div className="grid grid-cols-5 gap-3 flex-none">
      <Card>
        <div className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-500 rounded-lg"><Database className="w-5 h-5"/></div>
        <div><p className="text-[9px] font-bold text-slate-400 uppercase">Total</p><h3 className="text-xl font-bold">{stats.totalRecords}</h3></div>
      </Card>
      <Card>
        <div className="w-10 h-10 flex items-center justify-center bg-emerald-50 text-emerald-500 rounded-lg"><CheckCircle2 className="w-5 h-5"/></div>
        <div><p className="text-[9px] font-bold text-slate-400 uppercase">Completed</p><h3 className="text-xl font-bold text-emerald-600">{stats.completed}</h3></div>
      </Card>
      <Card>
        <div className="w-10 h-10 flex items-center justify-center bg-blue-50 text-blue-500 rounded-lg"><Activity className="w-5 h-5"/></div>
        <div><p className="text-[9px] font-bold text-slate-400 uppercase">Avg.</p><h3 className="text-xl font-bold text-blue-600">{stats.avg}</h3></div>
      </Card>
      <Card>
        <div className="w-10 h-10 flex items-center justify-center bg-purple-50 text-purple-500 rounded-lg"><PieChart className="w-5 h-5"/></div>
        <div><p className="text-[9px] font-bold text-slate-400 uppercase">Rate</p><h3 className="text-xl font-bold text-purple-600">{stats.rate}%</h3></div>
      </Card>
      <div className="bg-slate-800 p-4 rounded-xl shadow-sm flex items-center gap-3 relative overflow-hidden">
        <div className="w-10 h-10 bg-white/10 flex items-center justify-center text-red-400 rounded-lg"><UserX className="w-5 h-5" /></div>
        <div className="relative z-10"><p className="text-[9px] font-bold text-slate-400 uppercase">Pending</p><h3 className="text-xl font-bold text-white">{pendingCount}</h3></div>
      </div>
    </div>
  );
}