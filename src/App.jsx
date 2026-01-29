import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  LayoutDashboard, Table2, Building2, BarChartBig, 
  Camera, Database, Trash2, Calendar, Clock, Search, 
  Zap, CheckCircle2, Activity, PieChart, UserX, 
  Trophy, Star, Download, ChevronLeft, ChevronRight, 
  Users, FileSpreadsheet, PlayCircle, X, RotateCcw,
  CloudLightning, Loader2
} from 'lucide-react';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, 
  LineElement, BarElement, Title, Tooltip, Legend, Filler 
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register ChartJS
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

// --- Constants ---
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const COLORS = {
  red: '#ED1C24',
  dark: '#0F172A',
  emerald: '#10B981',
  blue: '#3B82F6',
  purple: '#A855F7',
  orange: '#F97316',
  slate: '#64748B'
};

// ** TARGET GOOGLE SHEET IDs **
const SHEET_ID_RECORDS = "1GbD89UfE2mIpW3HAMSGuIpwXlKa9ykkQ";
const SHEET_ID_MEMBERS = "18vVGso4DJ4QjY0OvgsAl5tcY4bFKAZKI";

// --- Helper: CDN Loader ---
const useScript = (src) => {
  const [status, setStatus] = useState(src ? "loading" : "idle");
  useEffect(() => {
    if (!src) { setStatus("idle"); return; }
    let script = document.querySelector(`script[src="${src}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.setAttribute("data-status", "loading");
      document.body.appendChild(script);
      const setAttributeFromEvent = (event) => {
        script.setAttribute("data-status", event.type === "load" ? "ready" : "error");
        setStatus(event.type === "load" ? "ready" : "error");
      };
      script.addEventListener("load", setAttributeFromEvent);
      script.addEventListener("error", setAttributeFromEvent);
    } else {
      setStatus(script.getAttribute("data-status"));
    }
    const setStateFromEvent = (event) => setStatus(event.type === "load" ? "ready" : "error");
    script.addEventListener("load", setStateFromEvent);
    script.addEventListener("error", setStateFromEvent);
    return () => {
      if (script) {
        script.removeEventListener("load", setStateFromEvent);
        script.removeEventListener("error", setStateFromEvent);
      }
    };
  }, [src]);
  return status;
};

// --- Helper Functions ---
const normalizeKey = (key) => key.toLowerCase().trim().replace(/[\s\-_]/g, '');

// --- COMPACT CARD COMPONENT (Rounded XL) ---
const Card = ({ children, className = "" }) => (
  <div className={`bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 relative rounded-xl ${className}`}>
    {children}
  </div>
);

// --- Main App Component ---
export default function App() {
  // Load Libraries
  const xlsxStatus = useScript('https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js');
  useScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
  useScript('https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js');

  // State
  const [activeTab, setActiveTab] = useState('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [members, setMembers] = useState([]);
  const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState({ year: '2026', month: 'ALL', dept: 'All', search: '' });
  const [chartMode, setChartMode] = useState('user');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  
  // Refs
  const captureRef = useRef(null);
  const membersRef = useRef([]); 
  const isInitialized = useRef(false);

  useEffect(() => {
    membersRef.current = members;
  }, [members]);

  // --- Core Data Processing ---
  const processData = useCallback((arrayBuffer, type, currentMembers = []) => {
    if (!window.XLSX) return null;
    const wb = window.XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    const raw = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

    if (type === 'members') {
      const newMembers = raw.map(row => {
        const keys = Object.keys(row);
        const nameKey = keys.find(k => normalizeKey(k).includes('name') || normalizeKey(k).includes('ชื่อ'));
        const deptNewKey = keys.find(k => normalizeKey(k).includes('departmentnew'));
        const deptKey = keys.find(k => normalizeKey(k) === 'department' || normalizeKey(k) === 'แผนก');
        const deptOldKey = keys.find(k => normalizeKey(k).includes('olddepartment'));
        const finalDeptKey = deptNewKey || deptKey || deptOldKey;
        
        return { name: String(row[nameKey] || "").trim(), dept: String(row[finalDeptKey] || "").trim() };
      }).filter(m => m.name && m.name !== "undefined");
      
      setMembers(newMembers);
      localStorage.setItem('scg_heim_members_v9', JSON.stringify(newMembers));
      return newMembers;
    } 
    else if (type === 'records') {
      const refMembers = currentMembers.length > 0 ? currentMembers : membersRef.current;
      
      const newRecords = raw.map(row => {
        const keys = Object.keys(row);
        const nameKey = keys.find(k => normalizeKey(k).includes('name') || normalizeKey(k).includes('ชื่อ'));
        const deptKey = keys.find(k => normalizeKey(k).includes('dept') || normalizeKey(k).includes('แผนก'));
        const dateKey = keys.find(k => normalizeKey(k).includes('createddatetime') || normalizeKey(k).includes('time') || normalizeKey(k).includes('date'));
        const topicKey = keys.find(k => normalizeKey(k).includes('topic') || normalizeKey(k).includes('subject'));

        let dateStr = row[dateKey], formattedDate = "";
        if (typeof dateStr === 'number') {
            formattedDate = new Date((dateStr - (25567 + 2)) * 86400 * 1000).toISOString().split('T')[0];
        } else if (dateStr instanceof Date) {
            formattedDate = dateStr.toISOString().split('T')[0];
        } else if (dateStr) {
            formattedDate = String(dateStr).trim().split(' ')[0];
        }

        let rName = String(row[nameKey] || "").trim();
        let rDept = String(row[deptKey] || "").trim();

        const match = refMembers.find(m => m.name === rName);
        if (match) rDept = match.dept;

        return { Name: rName, Department: rDept, CreatedDateTime: formattedDate, Topic: String(row[topicKey] || "-") };
      }).filter(r => r.Name && r.Name !== "undefined");
      
      setRecords(newRecords);
      localStorage.setItem('scg_heim_records_v9', JSON.stringify(newRecords));
      return newRecords;
    }
  }, []);

  const handleCloudSync = useCallback(async (isAuto = false) => {
    if (!window.XLSX) return; 
    setIsSyncing(true);

    const fetchSheet = async (id, name) => {
      const target = `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`;
      const proxies = [
        `https://corsproxy.io/?${encodeURIComponent(target)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
        target 
      ];
      
      for (const url of proxies) {
        try {
          const res = await fetch(url);
          if (res.ok) return await res.arrayBuffer();
        } catch (e) { console.warn(`Proxy fail ${name}:`, e); }
      }
      throw new Error(`Could not fetch ${name}`);
    };

    try {
      const [memBlob, recBlob] = await Promise.all([
        fetchSheet(SHEET_ID_MEMBERS, 'Members'),
        fetchSheet(SHEET_ID_RECORDS, 'Records')
      ]);

      const loadedMembers = processData(memBlob, 'members');
      processData(recBlob, 'records', loadedMembers);

      if (!isAuto) {
        setIsModalOpen(false);
        if (window.confetti) window.confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: [COLORS.red, '#fff', COLORS.dark] });
      }
    } catch (err) {
      console.error("Sync Error:", err);
      if (!isAuto) alert(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  }, [processData]);

  useEffect(() => {
    if (isInitialized.current || xlsxStatus !== 'ready') return;
    isInitialized.current = true;

    const init = async () => {
        let hasLocal = false;
        try {
            const m = localStorage.getItem('scg_heim_members_v9');
            const r = localStorage.getItem('scg_heim_records_v9');
            if (m && r) {
                setMembers(JSON.parse(m));
                setRecords(JSON.parse(r));
                hasLocal = true;
            }
        } catch (e) { console.error("Local load error", e); }

        if (!hasLocal) {
            handleCloudSync(true);
        }
    };
    init();
  }, [xlsxStatus, handleCloudSync]);

  const { filteredRecords, effectiveMembers, targetPool, deptStats, champion, earlyBird, pendingList } = useMemo(() => {
    const filtered = records.filter(r => {
      if (!r.CreatedDateTime) return false;
      const dt = String(r.CreatedDateTime);
      const matchYear = dt.startsWith(filters.year);
      const matchMonth = filters.month === 'ALL' || dt.includes(`-${filters.month}-`);
      const matchDept = filters.dept === 'All' || r.Department === filters.dept;
      const matchSearch = filters.search === '' || r.Name.toLowerCase().includes(filters.search.toLowerCase());
      return matchYear && matchMonth && matchDept && matchSearch;
    });

    let effMembers = members;
    if (members.length === 0 && records.length > 0) {
      const uniqueMap = new Map();
      records.forEach(r => { if (!uniqueMap.has(r.Name)) uniqueMap.set(r.Name, { name: r.Name, dept: r.Department }); });
      effMembers = Array.from(uniqueMap.values());
    }

    const pool = effMembers.filter(m => filters.dept === 'All' || m.dept === filters.dept);
    const activeNames = new Set(filtered.map(r => r.Name));
    const pending = pool.filter(m => !activeNames.has(m.name));

    const stats = {};
    const allDepts = [...new Set(effMembers.map(m => m.dept))];
    allDepts.forEach(d => stats[d] = { total: 0, active: 0 });
    effMembers.forEach(m => { if (stats[m.dept]) stats[m.dept].total++; });
    
    const activeInContext = new Set();
    records.filter(r => {
        const dt = String(r.CreatedDateTime);
        return dt.startsWith(filters.year) && (filters.month === 'ALL' || dt.includes(`-${filters.month}-`));
    }).forEach(r => {
        const user = effMembers.find(m => m.name === r.Name);
        if (user && !activeInContext.has(user.name)) {
            activeInContext.add(user.name);
            if (stats[user.dept]) stats[user.dept].active++;
        }
    });

    const sortedDeptStats = Object.entries(stats)
      .map(([name, s]) => ({ name, ...s, rate: s.total > 0 ? (s.active / s.total * 100) : 0 }))
      .sort((a, b) => b.rate - a.rate);

    const counts = {}; filtered.forEach(r => counts[r.Name] = (counts[r.Name] || 0) + 1);
    const sortedUsers = Object.entries(counts).map(([name, count]) => ({ name, count, dept: effMembers.find(m => m.name === name)?.dept || 'N/A' })).sort((a, b) => b.count - a.count);
    const sortedTime = [...filtered].sort((a, b) => new Date(a.CreatedDateTime) - new Date(b.CreatedDateTime));

    return {
      filteredRecords: filtered,
      effectiveMembers: effMembers,
      targetPool: pool,
      deptStats: sortedDeptStats,
      champion: sortedUsers[0] || null,
      earlyBird: sortedTime[0] || null,
      pendingList: pending
    };
  }, [records, members, filters]);

  const deptOptions = useMemo(() => {
    const allDepts = ["All", ...new Set([...members.map(m => m.dept), ...records.map(r => r.Department)])].filter(d => d).sort();
    const groups = { "All": ["All"], "Others": [] };
    allDepts.forEach(d => {
      if (d === "All") return;
      let group = "Others";
      if (d.includes(" > ")) group = d.split(" > ")[0].trim();
      else if (d.includes("/")) { const parts = d.split(/\/+/); if (parts.length > 1) group = parts[0].trim(); }
      if (!groups[group]) groups[group] = [];
      groups[group].push(d);
    });
    return groups;
  }, [members, records]);

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      processData(evt.target.result, type);
      setIsModalOpen(false);
      if(window.confetti) window.confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: [COLORS.red, '#fff', COLORS.dark] });
    };
    reader.readAsArrayBuffer(file);
  };

  const loadDemo = () => {
    const depts = ["Sales > Retail", "Management > HR", "IT > Support", "Production > Line 1", "Logistics"];
    const demoM = Array.from({ length: 50 }, (_, i) => ({ name: `User ${i+1}`, dept: depts[Math.floor(Math.random() * depts.length)] }));
    const demoR = Array.from({ length: 150 }, () => {
      const m = demoM[Math.floor(Math.random() * demoM.length)];
      return { Name: m.name, Department: m.dept, CreatedDateTime: '2026-01-15', Topic: 'Demo Training' };
    });
    setMembers(demoM); setRecords(demoR);
    setIsModalOpen(false);
  };

  const exportData = () => {
    if (!window.XLSX) return;
    const wb = window.XLSX.utils.book_new();
    const ws1 = window.XLSX.utils.json_to_sheet(pendingList.map(p => ({ Name: p.name, "Department (New)": p.dept, Status: "Pending" })));
    window.XLSX.utils.book_append_sheet(wb, ws1, "Pending List");
    const ws2 = window.XLSX.utils.json_to_sheet(records);
    window.XLSX.utils.book_append_sheet(wb, ws2, "All Records");
    window.XLSX.writeFile(wb, "HEIM_Export.xlsx");
  };

  const captureScreen = async () => { if (captureRef.current && window.html2canvas) { const canvas = await window.html2canvas(captureRef.current, { scale: 2, backgroundColor: '#F8FAFC' }); const link = document.createElement('a'); link.download = 'SCG-HEIM-Dashboard.png'; link.href = canvas.toDataURL('image/png'); link.click(); } };

  // --- Charts ---
  const chartData = useMemo(() => {
    if (chartMode === 'user') {
      const counts = {};
      filteredRecords.forEach(r => counts[r.Name] = (counts[r.Name] || 0) + 1);
      const top10 = Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);
      return { labels: top10.map(u => u.name), datasets: [{ label: 'Records', data: top10.map(u => u.count), backgroundColor: COLORS.red, borderRadius: 6, barThickness: 15 }] };
    } else {
      const topDepts = deptStats.slice(0, 8);
      return { labels: topDepts.map(d => d.name.length > 20 ? d.name.substring(0, 20) + '...' : d.name), datasets: [{ label: 'Completion %', data: topDepts.map(d => d.rate), backgroundColor: COLORS.blue, borderRadius: 6, barThickness: 15 }] };
    }
  }, [filteredRecords, deptStats, chartMode]);

  const comparisonChartData = useMemo(() => {
    const top15 = deptStats.slice(0, 15);
    return {
      labels: top15.map(d => d.name.length > 30 ? d.name.substring(0, 30) + '...' : d.name),
      datasets: [{ label: 'Completion Rate (%)', data: top15.map(d => d.rate), backgroundColor: top15.map(d => d.rate >= 80 ? COLORS.emerald : (d.rate >= 50 ? COLORS.blue : COLORS.orange)), borderRadius: 6, barThickness: 18 }]
    };
  }, [deptStats]);

  // --- Render ---
  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-800 font-sans text-xs">
       <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
       <style>{`body { font-family: 'IBM Plex Sans Thai', sans-serif; }`}</style>
      
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 z-50 flex-none h-14">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => window.location.reload()}>
            <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-500 flex items-center justify-center text-white shadow-md rounded-lg"><Zap className="w-4 h-4 fill-current" /></div>
            <div><h1 className="text-lg font-bold tracking-tight text-slate-800 uppercase leading-none">SCG HEIM</h1><span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">Dashboard V9.1</span></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-slate-100/50 p-1 flex gap-1 rounded-lg">
              {[{ id: 'overview', icon: LayoutDashboard, label: 'Overview' }, { id: 'detail', icon: Table2, label: 'Records' }, { id: 'dept', icon: Building2, label: 'Stats' }, { id: 'dept-chart', icon: BarChartBig, label: 'Chart' }].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-300 ${activeTab === tab.id ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}><tab.icon className="w-3.5 h-3.5" /><span>{tab.label}</span></button>
              ))}
            </div>
            <div className="w-px h-6 bg-slate-200"></div>
            <div className="flex items-center gap-2">
              <button onClick={captureScreen} className="p-2 border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 rounded-lg transition-all" title="Capture"><Camera className="w-4 h-4" /></button>
              <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-bold hover:bg-slate-800 transition-all shadow-md rounded-lg">{isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CloudLightning className="w-3.5 h-3.5" />} Data Hub</button>
            </div>
          </div>
        </div>
      </header>

      <main ref={captureRef} className="flex-1 max-w-7xl mx-auto w-full p-4 flex flex-col gap-4 overflow-hidden">
        <div className="bg-white border border-slate-200 p-3 flex items-center gap-3 flex-none rounded-xl shadow-sm">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative w-28"><Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" /><select value={filters.year} onChange={e => setFilters({...filters, year: e.target.value})} className="w-full bg-slate-50 border border-slate-100 py-1.5 pl-8 pr-4 text-[11px] font-bold text-slate-700 outline-none focus:border-red-500 rounded-lg cursor-pointer"><option value="2026">2026</option><option value="2025">2025</option><option value="2024">2024</option></select></div>
            <div className="relative w-32"><Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" /><select value={filters.month} onChange={e => setFilters({...filters, month: e.target.value})} className="w-full bg-slate-50 border border-slate-100 py-1.5 pl-8 pr-4 text-[11px] font-bold text-slate-700 outline-none focus:border-red-500 rounded-lg cursor-pointer"><option value="ALL">All Months</option>{MONTH_NAMES.map((m, i) => <option key={i} value={String(i+1).padStart(2,'0')}>{m}</option>)}</select></div>
            <div className="relative flex-1"><Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" /><select value={filters.dept} onChange={e => setFilters({...filters, dept: e.target.value})} className="w-full bg-slate-50 border border-slate-100 py-1.5 pl-8 pr-4 text-[11px] font-bold text-slate-700 outline-none focus:border-red-500 rounded-lg cursor-pointer"><option value="All">All Departments (New)</option>{Object.entries(deptOptions).map(([grp, opts]) => (grp !== 'All' && <optgroup key={grp} label={grp}>{opts.map(d => <option key={d} value={d}>{d}</option>)}</optgroup>))}</select></div>
          </div>
          <div className="relative w-56"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" /><input type="text" placeholder="Search..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} className="w-full bg-slate-50 border border-slate-100 py-1.5 pl-8 pr-4 text-[11px] font-bold text-slate-700 outline-none focus:border-red-500 rounded-lg" /></div>
          <button onClick={() => setFilters({year: '2026', month: 'ALL', dept: 'All', search: ''})} className="w-8 h-8 flex items-center justify-center bg-slate-50 border border-slate-100 text-slate-400 hover:text-red-500 rounded-lg transition-all"><RotateCcw className="w-3.5 h-3.5" /></button>
        </div>

        {activeTab === 'overview' && (
          <div className="flex-1 flex flex-col gap-4 overflow-hidden animate-[fadeInUp_0.4s_ease-out]">
            <div className="grid grid-cols-5 gap-3 flex-none">
              <Card className="p-4 flex items-center gap-3"><div className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-500 rounded-lg"><Database className="w-5 h-5"/></div><div><p className="text-[9px] font-bold text-slate-400 uppercase">Total</p><h3 className="text-xl font-bold text-slate-800">{filteredRecords.length}</h3></div></Card>
              <Card className="p-4 flex items-center gap-3"><div className="w-10 h-10 flex items-center justify-center bg-emerald-50 text-emerald-500 rounded-lg"><CheckCircle2 className="w-5 h-5"/></div><div><p className="text-[9px] font-bold text-slate-400 uppercase">Completed</p><h3 className="text-xl font-bold text-emerald-600">{targetPool.length - pendingList.length}</h3></div></Card>
              <Card className="p-4 flex items-center gap-3"><div className="w-10 h-10 flex items-center justify-center bg-blue-50 text-blue-500 rounded-lg"><Activity className="w-5 h-5"/></div><div><p className="text-[9px] font-bold text-slate-400 uppercase">Avg.</p><h3 className="text-xl font-bold text-blue-600">{(targetPool.length - pendingList.length) > 0 ? (filteredRecords.length / (targetPool.length - pendingList.length)).toFixed(1) : "0.0"}</h3></div></Card>
              <Card className="p-4 flex items-center gap-3"><div className="w-10 h-10 flex items-center justify-center bg-purple-50 text-purple-500 rounded-lg"><PieChart className="w-5 h-5"/></div><div><p className="text-[9px] font-bold text-slate-400 uppercase">Rate</p><h3 className="text-xl font-bold text-purple-600">{`${targetPool.length > 0 ? Math.round(((targetPool.length - pendingList.length) / targetPool.length) * 100) : 0}%`}</h3></div></Card>
              <div className="bg-slate-800 p-4 rounded-xl shadow-sm flex items-center gap-3 relative overflow-hidden group"><div className="w-10 h-10 bg-white/10 flex items-center justify-center text-red-400 relative z-10 rounded-lg"><UserX className="w-5 h-5" /></div><div className="relative z-10"><p className="text-[9px] font-bold text-slate-400 uppercase">Pending</p><h3 className="text-xl font-bold text-white">{pendingList.length}</h3></div></div>
            </div>
            <div className="flex-1 grid grid-cols-12 gap-4 overflow-hidden">
              <div className="col-span-8 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4 h-[140px] flex-none">
                  <div className="bg-white border border-red-100 p-4 rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between"><Trophy className="absolute top-2 right-2 w-16 h-16 text-red-50 rotate-12" /><div><span className="px-2 py-0.5 bg-red-50 text-red-600 text-[9px] font-bold uppercase rounded-md">Champion</span><h2 className="text-2xl font-bold italic truncate mt-1 text-slate-800">{champion ? champion.name : '-'}</h2><p className="text-slate-400 text-[10px] truncate">{champion ? champion.dept : '-'}</p></div><div className="flex justify-between items-end border-t border-red-50 pt-2"><div><p className="text-[9px] text-slate-400 uppercase">Total</p><h3 className="text-xl font-bold text-red-600">{champion ? champion.count : 0}</h3></div></div></div>
                  <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between"><div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full -mr-8 -mt-8"></div><div className="relative z-10"><span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-bold uppercase rounded-md">Speed Star</span><h2 className="text-2xl font-bold italic truncate mt-1 text-slate-800">{earlyBird ? earlyBird.Name : '-'}</h2><p className="text-slate-400 text-[10px] truncate">{earlyBird ? earlyBird.CreatedDateTime : '-'}</p></div></div>
                </div>
                <Card className="flex-1 p-4 flex flex-col min-h-0 relative"><div className="flex items-center justify-between mb-2 flex-none"><h3 className="text-xs font-bold uppercase tracking-wide text-slate-800">Top Learners</h3><div className="flex gap-1 bg-slate-50 p-0.5 rounded-lg"><button onClick={() => setChartMode('user')} className={`px-2 py-1 text-[9px] font-bold uppercase rounded-md transition-all ${chartMode === 'user' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}>User</button><button onClick={() => setChartMode('dept')} className={`px-2 py-1 text-[9px] font-bold uppercase rounded-md transition-all ${chartMode === 'dept' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}>Dept</button></div></div><div className="flex-1 min-h-0 relative"><Bar data={chartData} options={{ indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { ticks: { font: { size: 9, family: 'IBM Plex Sans Thai' } }, grid: { display: false } } } }} /></div></Card>
              </div>
              <Card className="col-span-4 p-4 flex flex-col overflow-hidden h-full"><div className="flex items-center justify-between mb-3 flex-none"><h3 className="text-xs font-bold uppercase tracking-wide text-slate-800 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Pending List</h3><button onClick={exportData} className="p-1.5 bg-slate-50 text-slate-600 hover:text-emerald-600 rounded-lg transition-all"><Download className="w-3.5 h-3.5" /></button></div><div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">{pendingList.length > 0 ? pendingList.slice(0, 100).map((m, i) => (<div key={i} className="flex justify-between p-2 bg-slate-50/50 border border-slate-100 rounded-lg"><div className="truncate pr-2"><p className="text-[10px] font-bold text-slate-700 truncate">{m.name}</p><p className="text-[8px] text-slate-400 uppercase mt-0.5 truncate">{m.dept}</p></div></div>)) : <div className="h-full flex items-center justify-center text-slate-300 text-[10px] font-bold">All Good!</div>}</div></Card>
            </div>
          </div>
        )}

        {/* View: Detail Table */}
        {activeTab === 'detail' && (
          <Card className="flex-1 flex flex-col overflow-hidden animate-[fadeInUp_0.4s_ease-out]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-none bg-white z-10"><div><h3 className="text-sm font-bold uppercase text-slate-800">Records</h3><p className="text-[10px] text-slate-400">All history</p></div><div className="flex items-center gap-2"><span className="text-[10px] font-bold text-slate-400">Page {currentPage}</span><div className="flex gap-1"><button onClick={() => setCurrentPage(p => Math.max(1, p-1))} className="p-1 rounded-lg border hover:bg-slate-50"><ChevronLeft className="w-3.5 h-3.5"/></button><button onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredRecords.length/itemsPerPage), p+1))} className="p-1 rounded-lg border hover:bg-slate-50"><ChevronRight className="w-3.5 h-3.5"/></button></div></div></div>
            <div className="flex-1 overflow-auto custom-scrollbar"><table className="w-full text-left"><thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-100"><tr><th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase">Date</th><th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase">Name</th><th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase">Dept</th><th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase">Topic</th></tr></thead><tbody>{filteredRecords.slice((currentPage-1)*itemsPerPage, currentPage*itemsPerPage).map((r, i) => (<tr key={i} className="hover:bg-slate-50/50 border-b border-slate-50"><td className="px-4 py-2 text-[10px] font-bold text-slate-600 whitespace-nowrap">{r.CreatedDateTime}</td><td className="px-4 py-2 text-[10px] font-bold text-slate-800">{r.Name}</td><td className="px-4 py-2 text-[10px] text-slate-500 truncate max-w-[150px]">{r.Department}</td><td className="px-4 py-2 text-[10px] text-slate-400 truncate max-w-[200px]">{r.Topic}</td></tr>))}</tbody></table></div>
          </Card>
        )}

        {/* View: Dept Stats */}
        {activeTab === 'dept' && (
          <Card className="flex-1 flex flex-col overflow-hidden animate-[fadeInUp_0.4s_ease-out]">
            <div className="p-4 border-b border-slate-100 flex-none"><h3 className="text-sm font-bold uppercase text-slate-800">Stats Table</h3></div>
            <div className="flex-1 overflow-auto custom-scrollbar p-4"><div className="border border-slate-100 rounded-lg overflow-hidden"><table className="w-full text-left"><thead className="bg-slate-50"><tr><th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase">Department</th><th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase text-center">Total</th><th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase text-center">Done</th><th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase text-right">%</th></tr></thead><tbody>{deptStats.map((d, i) => (<tr key={i} className="hover:bg-slate-50 border-b border-slate-50"><td className="px-4 py-2 text-[10px] font-bold text-slate-700">{d.name}</td><td className="px-4 py-2 text-[10px] text-slate-500 text-center">{d.total}</td><td className="px-4 py-2 text-[10px] text-emerald-600 font-bold text-center">{d.active}</td><td className={`px-4 py-2 text-[10px] font-black text-right ${d.rate >= 80 ? 'text-emerald-500' : 'text-orange-500'}`}>{d.rate.toFixed(0)}%</td></tr>))}</tbody></table></div></div>
          </Card>
        )}

        {/* View: Chart */}
        {activeTab === 'dept-chart' && (
          <Card className="flex-1 flex flex-col overflow-hidden animate-[fadeInUp_0.4s_ease-out]">
            <div className="p-4 border-b border-slate-100 flex-none"><h3 className="text-sm font-bold uppercase text-slate-800">Comparison</h3></div>
            <div className="flex-1 p-4 relative"><Bar data={comparisonChartData} options={{ indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { ticks: { font: { size: 9, family: 'IBM Plex Sans Thai' } }, grid: { display: false } } } }} /></div>
          </Card>
        )}
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white w-full max-w-sm border border-slate-200 shadow-xl p-6 relative rounded-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between mb-6"><div><h3 className="text-lg font-bold text-slate-800 uppercase">Data Hub</h3><p className="text-[10px] text-slate-400">Import Files</p></div><button onClick={() => setIsModalOpen(false)}><X className="w-4 h-4 text-slate-400" /></button></div>
            <button onClick={() => handleCloudSync(false)} disabled={isSyncing} className="w-full mb-4 py-2.5 bg-emerald-600 text-white text-xs font-bold uppercase rounded-lg flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all">{isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <CloudLightning className="w-3.5 h-3.5"/>} Sync Google Sheets</button>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div onClick={() => document.getElementById('file-members').click()} className="bg-slate-50 p-3 border border-dashed border-slate-200 hover:border-slate-400 cursor-pointer text-center rounded-lg"><Users className="w-5 h-5 mx-auto text-slate-400 mb-1"/><p className="text-[9px] font-bold text-slate-600">MEMBERS</p><input type="file" id="file-members" className="hidden" accept=".xlsx,.csv" onChange={(e) => handleFileUpload(e, 'members')} /></div>
              <div onClick={() => document.getElementById('file-records').click()} className="bg-slate-50 p-3 border border-dashed border-slate-200 hover:border-slate-400 cursor-pointer text-center rounded-lg"><FileSpreadsheet className="w-5 h-5 mx-auto text-slate-400 mb-1"/><p className="text-[9px] font-bold text-slate-600">RECORDS</p><input type="file" id="file-records" className="hidden" accept=".xlsx,.csv" onChange={(e) => handleFileUpload(e, 'records')} /></div>
            </div>
            <div className="text-center"><button onClick={loadDemo} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase">Load Demo</button></div>
          </div>
        </div>
      )}
    </div>
  );
}