import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  LayoutDashboard, Table2, Building2, BarChartBig, 
  Camera, Database, Trash2, Calendar, Clock, Search, 
  Zap, CheckCircle2, Activity, PieChart, UserX, 
  Trophy, Star, Download, ChevronLeft, ChevronRight, 
  Users, FileSpreadsheet, PlayCircle, X, RotateCcw,
  CloudLightning, Loader2, XCircle
} from 'lucide-react';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, 
  LineElement, BarElement, Title, Tooltip, Legend, Filler 
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Import Components
import { Button } from "./components/ui/button.jsx";
import { Card } from "./components/ui/card.jsx";
import { DataModal } from "./modal.jsx";

// Register ChartJS
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

// --- Constants ---
const SHEET_ID_MEMBERS = "18vVGso4DJ4QjY0OvgsAl5tcY4bFKAZKI";
const SHEET_ID_RECORDS = "1GbD89UfE2mIpW3HAMSGuIpwXlKa9ykkQ";

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
      setStatus(script.getAttribute("data-status") || "loading");
    }
  }, [src]);
  return status;
};

const normalizeKey = (key) => key.toLowerCase().trim().replace(/[\s\-_]/g, '');

// ✅ ฟังก์ชันจัดรูปแบบชื่อแผนก (Clean Data)
const normalizeDeptName = (deptName) => {
    if (!deptName) return "-";
    // เปลี่ยน / หรือ \ เป็น >
    let d = deptName.replace(/[/\\]+/g, " > ");
    // จัดช่องว่างหน้าหลัง > ให้สวยงาม
    d = d.replace(/\s*>\s*/g, " > ");
    return d.trim();
};

export default function App() {
  // Load Libraries
  const xlsxStatus = useScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
  useScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
  useScript('https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js');

  // State
  const [activeTab, setActiveTab] = useState('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);
  const [syncStatusText, setSyncStatusText] = useState("Connecting to Cloud...");

  const [members, setMembers] = useState([]);
  const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState({ year: '2026', month: 'ALL', dept: 'All', search: '' });
  const [chartMode, setChartMode] = useState('user');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  
  const captureRef = useRef(null);
  const isInitialized = useRef(false);

  // --- LOGIC: PROCESS DATA ---
  const processData = useCallback((arrayBuffer, type, contextMembers = []) => {
    if (!window.XLSX) return null;
    const wb = window.XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    const raw = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

    // Helper หาชื่อคอลัมน์แบบยืดหยุ่น
    const findKey = (row, ...candidates) => {
        const keys = Object.keys(row);
        for (const candidate of candidates) {
            // หาแบบตรงตัวก่อน
            const exact = keys.find(k => normalizeKey(k) === normalizeKey(candidate));
            if (exact) return exact;
            // หาแบบคล้าย
            const found = keys.find(k => normalizeKey(k).includes(normalizeKey(candidate)));
            if (found) return found;
        }
        return null;
    };

    if (type === 'members') {
      const newMembers = raw.map(row => {
        const nameKey = findKey(row, 'name', 'ชื่อ');
        // ✅ เจาะจงหา Department New ตามไฟล์ของคุณ
        const deptNewKey = findKey(row, 'department new', 'departmentnew'); 
        
        // ถ้าไม่เจอ Department New ให้หา Department ธรรมดา (Backup)
        const deptKey = deptNewKey || findKey(row, 'department', 'แผนก');

        return { 
            name: String(row[nameKey] || "").trim(), 
            dept: normalizeDeptName(String(row[deptKey] || "").trim())
        };
      }).filter(m => m.name);

      setMembers(newMembers);
      localStorage.setItem('scg_heim_members_v9', JSON.stringify(newMembers));
      return newMembers; // ส่งออกไปใช้ต่อ
    } 
    else {
      // --- Process Records (ใช้ VLOOKUP) ---
      // 1. สร้าง Dictionary ของ Members ไว้ค้นหาเร็วๆ (Name -> Dept New)
      const memberMap = new Map();
      contextMembers.forEach(m => memberMap.set(m.name.toLowerCase(), m.dept));

      const newRecords = raw.map(row => {
        const nameKey = findKey(row, 'name', 'ชื่อ');
        const rawName = String(row[nameKey] || "").trim();
        
        // ✅ VLOOKUP: ค้นหาชื่อใน Members เพื่อเอา Department New
        let finalDept = "-";
        const matchedDept = memberMap.get(rawName.toLowerCase());

        if (matchedDept) {
            finalDept = matchedDept; // เจอ! ใช้ Department New เลย
        } else {
            // ไม่เจอ: ใช้ Department เดิมในไฟล์ Records ไปก่อน
            const recDeptKey = findKey(row, 'department', 'dept', 'แผนก');
            finalDept = normalizeDeptName(String(row[recDeptKey] || "").trim());
        }

        const dateKey = findKey(row, 'createddatetime', 'time', 'date', 'วันที่');
        const topicKey = findKey(row, 'topic', 'subject', 'หัวข้อ', 'เรื่อง');

        let dateStr = row[dateKey];
        let formattedDate = "";
        if (typeof dateStr === 'number') {
             formattedDate = new Date((dateStr - (25567 + 2)) * 86400 * 1000).toISOString().split('T')[0];
        } else if (dateStr) {
             formattedDate = String(dateStr).split(' ')[0];
        }

        return {
            Name: rawName,
            Department: finalDept, // ค่านี้จะเป็น Department New แล้ว
            CreatedDateTime: formattedDate,
            Topic: String(row[topicKey] || "-")
        };
      }).filter(r => r.Name);

      setRecords(newRecords);
      localStorage.setItem('scg_heim_records_v9', JSON.stringify(newRecords));
    }
  }, []);

  // --- LOGIC: CLOUD SYNC ---
  const handleCloudSync = useCallback(async (isAuto = false) => {
    setIsSyncing(true);
    setSyncStatusText("Syncing data...");

    const safetyTimeout = setTimeout(() => {
        if (isSyncing) {
            console.warn("Sync Timeout! Loading local data...");
            loadLocalData();
            setIsSyncing(false);
        }
    }, 15000);

    const loadLocalData = () => {
        const m = localStorage.getItem('scg_heim_members_v9');
        const r = localStorage.getItem('scg_heim_records_v9');
        if (m && r) {
            setMembers(JSON.parse(m));
            setRecords(JSON.parse(r));
        }
    };

    const fetchSheet = async (id, name) => {
        const driveUrl = `https://docs.google.com/uc?export=download&id=${id}`;
        const proxies = [
            `https://api.allorigins.win/raw?url=${encodeURIComponent(driveUrl)}`,
            `https://corsproxy.io/?${encodeURIComponent(driveUrl)}`
        ];

        for (const proxy of proxies) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);
                const res = await fetch(proxy, { signal: controller.signal });
                clearTimeout(timeoutId);
                if (res.ok) return await res.arrayBuffer();
            } catch (e) {
                console.warn(`Proxy failed for ${name}`);
            }
        }
        throw new Error(`Failed to fetch ${name}`);
    };

    try {
      const [memBlob, recBlob] = await Promise.all([
          fetchSheet(SHEET_ID_MEMBERS, "Members"), 
          fetchSheet(SHEET_ID_RECORDS, "Records")
      ]);
      
      // ✅ Step 1: โหลด Members ให้เสร็จก่อน
      const loadedMembers = processData(memBlob, 'members');
      
      // ✅ Step 2: โหลด Records แล้วส่ง Members เข้าไปทำ VLOOKUP
      processData(recBlob, 'records', loadedMembers);

      if (!isAuto && window.confetti) window.confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    } catch (err) {
      console.error("❌ Sync Error:", err);
      loadLocalData();
    } finally {
      clearTimeout(safetyTimeout);
      setTimeout(() => setIsSyncing(false), 500);
    }
  }, [processData, isSyncing]);

  useEffect(() => {
    if (isInitialized.current) return;
    if (xlsxStatus === 'ready') {
        isInitialized.current = true;
        handleCloudSync(true);
    } else {
        const fallbackTimer = setTimeout(() => {
            if (!isInitialized.current) {
                isInitialized.current = true;
                handleCloudSync(true);
            }
        }, 3000);
        return () => clearTimeout(fallbackTimer);
    }
  }, [xlsxStatus, handleCloudSync]);

  // --- LOGIC: CALCULATIONS ---
  const { filteredRecords, targetPool, deptStats, champion, earlyBird, pendingList } = useMemo(() => {
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
      targetPool: pool,
      deptStats: sortedDeptStats,
      champion: sortedUsers[0] || null,
      earlyBird: sortedTime[0] || null,
      pendingList: pending
    };
  }, [records, members, filters]);

  // Dept Options
  const deptOptions = useMemo(() => {
    const allDepts = ["All", ...new Set([...members.map(m => m.dept), ...records.map(r => r.Department)])].filter(d => d).sort();
    const groups = { "All": ["All"], "Others": [] };
    
    allDepts.forEach(d => {
      if (d === "All") return;
      let groupName = "Others";
      if (d.includes(" > ")) {
          groupName = d.split(" > ")[0].trim();
      }
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(d);
    });

    if (groups["Others"].length === 0) delete groups["Others"];
    return groups;
  }, [members, records]);

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

  if (isSyncing) {
    return (
      <div className="fixed inset-0 bg-slate-50 z-[999] flex flex-col items-center justify-center font-sans">
        <div className="relative">
          <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6 animate-bounce">
             <Zap className="w-10 h-10 text-red-600 fill-current" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-emerald-500 rounded-full p-1.5 border-4 border-slate-50">
             <Loader2 className="w-5 h-5 text-white animate-spin" />
          </div>
        </div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tighter mb-1">HEIM OPS</h2>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">{syncStatusText}</p>
        <button onClick={() => setIsSyncing(false)} className="mt-8 px-4 py-2 bg-white border border-slate-200 text-slate-400 text-[10px] font-bold rounded-xl hover:text-red-500 hover:border-red-200 transition-colors flex items-center gap-2">
            <XCircle className="w-3 h-3" /> Skip & Use Offline Data
        </button>
      </div>
    );
  }

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
            <div className="relative flex-1">
                <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                <select value={filters.dept} onChange={e => setFilters({...filters, dept: e.target.value})} className="w-full bg-slate-50 border border-slate-100 py-1.5 pl-8 pr-4 text-[11px] font-bold text-slate-700 outline-none focus:border-red-500 rounded-lg cursor-pointer">
                    {Object.keys(deptOptions).length === 0 ? <option value="All">Loading...</option> : Object.entries(deptOptions).map(([group, depts]) => (<optgroup key={group} label={group}>{depts.map(d => <option key={d} value={d}>{d}</option>)}</optgroup>))}
                </select>
            </div>
          </div>
          <div className="relative w-56"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" /><input type="text" placeholder="Search..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} className="w-full bg-slate-50 border border-slate-100 py-1.5 pl-8 pr-4 text-[11px] font-bold text-slate-700 outline-none focus:border-red-500 rounded-lg" /></div>
          <button onClick={() => setFilters({year: '2025', month: 'ALL', dept: 'All', search: ''})} className="w-8 h-8 flex items-center justify-center bg-slate-50 border border-slate-100 text-slate-400 hover:text-red-500 rounded-lg transition-all"><RotateCcw className="w-3.5 h-3.5" /></button>
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

      <DataModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        isSyncing={isSyncing} 
        onCloudSync={handleCloudSync}
        onFileUpload={() => {}} 
        onLoadDemo={() => {}}   
      />
    </div>
  );
}