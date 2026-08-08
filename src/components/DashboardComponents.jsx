import React from 'react';
import { 
  BarChart2, TrendingUp, Building2, Users, FileSpreadsheet, 
  XCircle, ChevronLeft, ChevronRight, Trophy, Clock, 
  CheckCircle2, Zap, AlertCircle, PieChart 
} from 'lucide-react';
import { Bar } from 'react-chartjs-2';

export const Sidebar = ({ activeTab, setActiveTab }) => {
  const menus = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'insights', label: 'Insights', icon: TrendingUp },
    { id: 'dept', label: 'Sector Performance', icon: Building2 },
    { id: 'users', label: 'Individual Performance', icon: Users },
    { id: 'detail', label: 'Learning Logs', icon: FileSpreadsheet },
  ];

  return (
    <nav className="flex items-center gap-1">
      {menus.map((menu) => {
        const Icon = menu.icon;
        return (
          <button
            key={menu.id}
            onClick={() => setActiveTab(menu.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all uppercase tracking-wider ${
              activeTab === menu.id 
                ? 'bg-[var(--c-emerald-bg)] text-[var(--c-emerald)] border border-[var(--c-emerald-bd)] shadow-sm' 
                : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{menu.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export const DetailTable = ({ data, currentPage, setCurrentPage, itemsPerPage, setActiveTab, setFilters }) => {
  const totalPages = Math.ceil(data.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = data.slice(startIndex, startIndex + itemsPerPage);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--text-faint)] py-20">
        <XCircle className="w-12 h-12 mb-4 opacity-20" />
        <p className="text-sm font-bold uppercase tracking-widest">No Records Found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[var(--bg-base)] border-b border-[var(--border-main)] sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-4 py-2 text-[9px] font-bold text-[var(--text-faint)] uppercase">Date</th>
              <th className="px-4 py-2 text-[9px] font-bold text-[var(--text-faint)] uppercase">Name</th>
              <th className="px-4 py-2 text-[9px] font-bold text-[var(--text-faint)] uppercase">Department</th>
              <th className="px-4 py-2 text-[9px] font-bold text-[var(--text-faint)] uppercase">Topic</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-main)]">
            {currentItems.map((item, i) => (
              <tr key={i} className="hover:bg-[var(--bg-hover)] transition-colors group">
                <td className="px-4 py-3 text-[10px] font-mono text-[var(--text-muted)]">{item.CreatedDateTime}</td>
                <td className="px-4 py-3 text-[11px] font-medium text-[var(--text-main)]">
                   <button
                     onClick={() => {
                       if (setActiveTab) setActiveTab('users');
                       if (setFilters) setFilters(prev => ({ ...prev, search: item.Name }));
                     }}
                     className="text-left text-[var(--text-main)] hover:text-[var(--c-blue)] hover:underline transition-colors outline-none"
                     title="คลิกเพื่อดูข้อมูลผู้ใช้งานในหน้า Individual Performance"
                   >
                     {item.Name}
                   </button>
                </td>
                <td className="px-4 py-3 text-[10px] text-[var(--text-muted)] uppercase">{item.Department}</td>
                <td className="px-4 py-3 text-[10px] text-[var(--text-main)]">{item.Topic}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-3 border-t border-[var(--border-main)] bg-[var(--bg-base)] flex items-center justify-between flex-none">
        <span className="text-[10px] font-medium text-[var(--text-muted)]">
          Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, data.length)} of {data.length} entries
        </span>
        <div className="flex items-center gap-2">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="p-1.5 border border-[var(--border-main)] rounded disabled:opacity-30 hover:bg-[var(--bg-hover)] transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-[10px] font-bold font-mono">Page {currentPage} / {totalPages}</span>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="p-1.5 border border-[var(--border-main)] rounded disabled:opacity-30 hover:bg-[var(--bg-hover)] transition-colors"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
};

export const Leaderboard = ({ champion, earlyBird, chartData, chartMode, setChartMode, themeVars }) => {
  return (
    <div className="col-span-8 p-4 bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-lg flex flex-col h-full shadow-sm overflow-hidden transition-colors duration-300">
       <div className="flex justify-between items-center mb-5 flex-none">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-main)] flex items-center gap-2"><BarChart2 className="w-4 h-4 text-[var(--c-emerald)]" /> TOP PERFORMERS</h3>
          <div className="flex bg-[var(--bg-base)] rounded border border-[var(--border-main)] p-0.5">
             <button onClick={() => setChartMode('user')} className={`px-3 py-1 text-[9px] font-bold uppercase rounded transition-all ${chartMode === 'user' ? 'bg-[var(--bg-panel)] text-[var(--c-emerald)] shadow-sm' : 'text-[var(--text-faint)] hover:text-[var(--text-muted)]'}`}>Users</button>
             <button onClick={() => setChartMode('dept')} className={`px-3 py-1 text-[9px] font-bold uppercase rounded transition-all ${chartMode === 'dept' ? 'bg-[var(--bg-panel)] text-[var(--c-emerald)] shadow-sm' : 'text-[var(--text-faint)] hover:text-[var(--text-muted)]'}`}>Departments</button>
          </div>
       </div>
       <div className="grid grid-cols-2 gap-4 mb-5 flex-none">
          <div className="bg-[var(--bg-base)] border border-[var(--border-main)] rounded-lg p-3 flex items-center gap-3 hover:border-[var(--c-amber-bd)] transition-all">
             <div className="p-2.5 bg-[var(--c-amber-bg)] rounded-full text-[var(--c-amber)]"><Trophy className="w-5 h-5" /></div>
             <div className="overflow-hidden w-full">
                <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Top Learner</p>
                <p className="text-sm font-bold text-[var(--text-main)] truncate leading-normal py-[2px]">{champion ? `${champion.prefix ? champion.prefix + ' ' : ''}${champion.name}` : '-'}</p>
                <p className="text-[10px] text-[var(--c-amber)] font-mono mt-0.5">{champion ? `${champion.count} Topics Completed` : ''}</p>
             </div>
          </div>
          <div className="bg-[var(--bg-base)] border border-[var(--border-main)] rounded-lg p-3 flex items-center gap-3 hover:border-[var(--c-blue-bd)] transition-all">
             <div className="p-2.5 bg-[var(--c-blue-bg)] rounded-full text-[var(--c-blue)]"><Clock className="w-5 h-5" /></div>
             <div className="overflow-hidden w-full">
                <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Early Bird</p>
                <p className="text-sm font-bold text-[var(--text-main)] truncate leading-normal py-[2px]">{earlyBird ? `${earlyBird.prefix ? earlyBird.prefix + ' ' : ''}${earlyBird.Name}` : '-'}</p>
                <p className="text-[10px] text-[var(--c-blue)] font-mono mt-0.5 truncate leading-normal py-[1px]">{earlyBird ? earlyBird.CreatedDateTime : ''}</p>
             </div>
          </div>
       </div>
       <div className="flex-1 min-h-0 relative">
          <Bar 
             data={chartData} 
             options={{ 
                indexAxis: 'y', 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { 
                   legend: { display: false }, 
                   tooltip: { backgroundColor: themeVars.tooltipBg, borderColor: themeVars.tooltipBorder, borderWidth: 1, titleColor: themeVars.tooltipTitle, bodyColor: themeVars.tooltipBody, titleFont: { family: 'Prompt', size: 11 }, bodyFont: { family: 'JetBrains Mono', size: 11 }, padding: 10, displayColors: false } 
                }, 
                scales: { 
                   x: { beginAtZero: true, grid: { color: themeVars.grid }, border: { dash: [4,4] }, ticks: { color: themeVars.textFaint, font: { family: 'JetBrains Mono', size: 10 } } }, 
                   y: { grid: { display: false }, ticks: { color: themeVars.textMuted, font: { family: 'Prompt', size: 10 } } } 
                } 
             }} 
          />
       </div>
    </div>
  );
};

export const StatCard = ({ title, value, subValue, icon: Icon, valueColor, iconColor, delay }) => (
  <div className="bg-[var(--bg-panel)] border border-[var(--border-main)] p-2.5 rounded-lg hover:border-[var(--border-hover)] transition-all duration-300 flex items-center justify-between cursor-default animate-[fadeInUp_0.5s_ease-out] min-w-0" style={{ animationDelay: `${delay}ms` }}>
    <div className="flex flex-col gap-0.5 min-w-0 pr-1">
      <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">{title}</p>
      <div className="flex flex-col">
        <div className="flex items-baseline gap-1 mt-0.5"><h3 className={`text-lg font-black tracking-tight ${valueColor} leading-normal font-mono`}>{typeof value === 'object' ? '-' : (value || "-")}</h3>{title === "Avg. Sub." && <span className="text-[9px] font-medium text-[var(--text-faint)]">/User</span>}</div>
        {subValue && <span className={`flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded w-fit mt-1 border max-w-full ${subValue.style}`}>{subValue.text || subValue}</span>}
      </div>
    </div>
    <div className="p-2 rounded bg-[var(--bg-base)] border border-[var(--border-main)] flex-none"><Icon className={`w-4 h-4 ${iconColor}`} /></div>
  </div>
);

export const KpiCards = ({ stats }) => {
  const TARGET_AVG = 1.0; 
  const currentAvg = parseFloat(stats.avg || 0);
  const isAvgPassed = currentAvg >= TARGET_AVG;
  return (
    <div className="grid grid-cols-3 gap-3 flex-none">
      <StatCard title="Completed" value={stats.completed} subValue={{ text: "Users Checked", style: "bg-[var(--bg-hover)] text-[var(--text-muted)] border-[var(--border-hover)]" }} icon={CheckCircle2} valueColor="text-[var(--text-main)]" iconColor="text-[var(--c-emerald)]" delay={0} />
      <StatCard title="Avg. Sub." value={stats.avg} subValue={ isAvgPassed ? { text: "Pass Criteria ✅", style: "bg-[var(--c-emerald-bg)] text-[var(--c-emerald)] border-[var(--c-emerald-bd)]" } : { text: `Target person: ${TARGET_AVG}`, style: "bg-[var(--c-amber-bg)] text-[var(--c-amber)] border-[var(--c-amber-bd)]" } } icon={isAvgPassed ? Zap : AlertCircle} valueColor={isAvgPassed ? "text-[var(--c-emerald)]" : "text-[var(--c-amber)]"} iconColor={isAvgPassed ? "text-[var(--c-emerald)]" : "text-[var(--c-amber)]"} delay={100} />
      <StatCard title="Comp. Rate" value={`${stats.rate}%`} subValue={{ text: "Overall Progress", style: "bg-[var(--c-blue-bg)] text-[var(--c-blue)] border-[var(--c-blue-bd)]" }} icon={PieChart} valueColor="text-[var(--c-blue)]" iconColor="text-[var(--c-blue)]" delay={200} />
    </div>
  );
};