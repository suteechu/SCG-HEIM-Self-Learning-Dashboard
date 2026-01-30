import React from 'react';
import { LayoutDashboard, Table2, Building2, BarChartBig } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const menus = [
    { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
    { id: 'detail', icon: Table2, label: 'Records' },
    { id: 'dept', icon: Building2, label: 'Stats' },
    { id: 'dept-chart', icon: BarChartBig, label: 'Chart' }
  ];

  return (
    <div className="bg-slate-100/50 p-1 flex gap-1 rounded-lg">
      {menus.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-300 
            ${activeTab === tab.id 
              ? 'bg-white text-red-600 shadow-sm' 
              : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
            }`}
        >
          <tab.icon className="w-3.5 h-3.5" />
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}