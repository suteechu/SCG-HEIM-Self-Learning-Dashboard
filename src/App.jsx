import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Camera, CloudLightning, Loader2, XCircle, 
  Calendar, Clock, Search, RotateCcw, Download, Zap,
  Building2, Info, Lightbulb, TrendingUp, Copy, CheckCircle,
  Hourglass, Activity, FileSpreadsheet, Lock, Phone,
  PieChart, UserX, Trophy, Flame, AlertCircle, CheckCircle2, UploadCloud, BarChart2, Users,
  Sun, Moon
} from 'lucide-react';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, 
  LineElement, BarElement, Title, Tooltip, Legend, Filler 
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

// --- Components ---

import Sidebar from "./components/Sidebar.jsx";       
import DetailTable from "./components/DetailTable.jsx"; 

// Register ChartJS
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

// ==========================================
// ✅ รวบระบบ useGoogleSheets มาไว้ที่นี่เพื่อให้ไฟล์เดียวจบ 
// ==========================================
const SHEET_ID_MEMBERS = "1MaQBFxzMAU3IM4S2fV4lfAEPzQK7NKP5iEkaH_3riqE";
const SHEET_ID_RECORDS = "1MaQBFxzMAU3IM4S2fV4lfAEPzQK7NKP5iEkaH_3riqE"; 

const normalizeKey = (key) => key.toLowerCase().trim().replace(/[\s\-_()]/g, '');

const normalizeDeptName = (deptName) => {
    if (!deptName) return "-";
    let d = deptName.replace(/[/\\]+/g, " > ");
    d = d.replace(/\s*>\s*/g, " > ");
    return d.trim();
};

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

function useGoogleSheets() {
  const xlsxStatus = useScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
  useScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
  useScript('https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js');

  const [members, setMembers] = useState([]);
  const [records, setRecords] = useState([]);
  const [isSyncing, setIsSyncing] = useState(true);
  const [syncStatusText, setSyncStatusText] = useState("Connecting to Cloud...");
  const isInitialized = useRef(false);

  const processData = useCallback((arrayBuffer, type, contextMembers = []) => {
    if (!window.XLSX) return null;
    const wb = window.XLSX.read(new Uint8Array(arrayBuffer), { type: 'array', codepage: 65001 });
    const raw = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

    const findKey = (row, ...candidates) => {
        const keys = Object.keys(row);
        for (const candidate of candidates) {
            const normCandidate = normalizeKey(candidate);
            const exact = keys.find(k => normalizeKey(k) === normCandidate);
            if (exact) return exact;
            const found = keys.find(k => normalizeKey(k).includes(normCandidate));
            if (found) return found;
        }
        return null;
    };

    if (type === 'members') {
      const newMembers = raw.map(row => {
        const emailKey = findKey(row, 'emailaddressbusiness', 'emailaddress', 'email');
        const rawEmail = emailKey ? String(row[emailKey] || "").trim() : "";
        const email = rawEmail.toLowerCase();

        const empIdKey = findKey(row, 'scgemployeeid', 'employeeid');
        const prefixKey = findKey(row, 'nameprefixthai', 'nameprefix', 'prefix');
        const fNameKey = findKey(row, 'firstnamethai', 'firstname');
        const lNameKey = findKey(row, 'lastnamethai', 'lastname');
        const fullNameKey = findKey(row, 'name', 'fullname', 'ชื่อ-สกุล');
        const posKey = findKey(row, 'positionnamethai', 'positionname', 'position');
        const sectionKey = findKey(row, 'sectionthai', 'section');
        const deptKey = findKey(row, 'departmentthai', 'department');
        const divKey = findKey(row, 'divisionthai', 'division');
        const compKey = findKey(row, 'companythai', 'company');

        let name = "-";
        if (fNameKey && row[fNameKey]) {
            name = String(row[fNameKey]).trim() + (lNameKey && row[lNameKey] ? " " + String(row[lNameKey]).trim() : "");
        } else if (fullNameKey && row[fullNameKey]) {
            name = String(row[fullNameKey]).trim();
        }

        let dept = "-";
        const dStr = deptKey ? String(row[deptKey] || "").trim() : "";
        const sStr = sectionKey ? String(row[sectionKey] || "").trim() : "";
        const divStr = divKey ? String(row[divKey] || "").trim() : "";

        // ✅ ปรับให้ใช้ชื่อ Department เป็นหลัก
        if (dStr) dept = dStr;
        else if (sStr) dept = sStr;
        else if (divStr) dept = divStr;

        return { 
            name, 
            dept: normalizeDeptName(dept), 
            email,
            rawEmail,
            empId: empIdKey ? String(row[empIdKey] || "").trim() : "",
            prefix: prefixKey ? String(row[prefixKey] || "").trim() : "",
            firstName: fNameKey ? String(row[fNameKey] || "").trim() : "",
            lastName: lNameKey ? String(row[lNameKey] || "").trim() : "",
            position: posKey ? String(row[posKey] || "").trim() : "",
            sectionRaw: sectionKey ? String(row[sectionKey] || "").trim() : "",
            departmentRaw: deptKey ? String(row[deptKey] || "").trim() : "",
            divisionRaw: divKey ? String(row[divKey] || "").trim() : "",
            companyRaw: compKey ? String(row[compKey] || "").trim() : ""
        };
      }).filter(m => m.name !== "-" && m.email !== "");
      
      setMembers(newMembers);
      // ✅ เปลี่ยน Cache Version เป็น V20 เพื่อล้างความจำเดิมทิ้ง
      localStorage.setItem('scg_heim_members_v20', JSON.stringify(newMembers));
      return newMembers; 

    } else {
      const memberMapByEmail = new Map();
      const memberMapByName = new Map();
      
      contextMembers.forEach(m => {
          if (m.email && m.email !== "-") memberMapByEmail.set(m.email, m);
          if (m.name && m.name !== "-") memberMapByName.set(m.name.toLowerCase(), m);
      });

      const newRecords = raw.map(row => {
        const emailKey = findKey(row, 'emailaddress', 'email', 'e-mail', 'username');
        const rawEmail = emailKey ? String(row[emailKey] || "").trim().toLowerCase() : "";
        
        const nameKey = findKey(row, 'name', 'ชื่อ');
        const rawName = String(row[nameKey] || "").trim();

        let finalName = rawName;
        let finalDept = "-";

        const matchedMember = (rawEmail && memberMapByEmail.get(rawEmail)) || (rawName && memberMapByName.get(rawName.toLowerCase()));

        if (matchedMember) {
            finalName = matchedMember.name; 
            finalDept = matchedMember.dept;
        } else {
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
            Name: finalName || "-",
            Email: rawEmail || "-",
            Department: finalDept,
            CreatedDateTime: formattedDate,
            Topic: String(row[topicKey] || "-")
        };
      }).filter(r => r.Name !== "-");

      setRecords(newRecords);
      localStorage.setItem('scg_heim_records_v20', JSON.stringify(newRecords));
    }
  }, []);

  const handleCloudSync = useCallback(async (isAuto = false) => {
    setIsSyncing(true);
    setSyncStatusText("Syncing data...");

    const safetyTimeout = setTimeout(() => {
        console.warn("Sync Timeout Check...");
    }, 15000);

    const loadLocalData = () => {
        const m = localStorage.getItem('scg_heim_members_v20');
        const r = localStorage.getItem('scg_heim_records_v20');
        if (m && r) {
            setMembers(JSON.parse(m));
            setRecords(JSON.parse(r));
        }
    };

    const fetchSheet = async (id, name, gid = "") => {
      const exportUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv${gid ? `&gid=${gid}` : ''}`;
      const urls = [
          exportUrl, 
          `https://api.allorigins.win/raw?url=${encodeURIComponent(exportUrl)}`,
          `https://corsproxy.io/?${encodeURIComponent(exportUrl)}`
      ];

      for (const url of urls) {
          try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 15000);
              const res = await fetch(url, { signal: controller.signal });
              clearTimeout(timeoutId);
              if (res.ok) {
                  const blob = await res.arrayBuffer();
                  if (blob.byteLength > 100) return blob; 
              }
          } catch (e) {
              console.warn(`Attempt failed for ${name}`);
          }
      }
      throw new Error(`Failed to fetch ${name}`);
    };

    try {
      const [memBlob, recBlob] = await Promise.all([
          fetchSheet(SHEET_ID_MEMBERS, "Members", "449028493"), 
          fetchSheet(SHEET_ID_RECORDS, "Records") 
      ]);
      const loadedMembers = processData(memBlob, 'members');
      processData(recBlob, 'records', loadedMembers);
      if (!isAuto && window.confetti) window.confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    } catch (err) {
      console.error("❌ Sync Error:", err);
      loadLocalData();
    } finally {
      clearTimeout(safetyTimeout);
      setIsSyncing(false); 
    }
  }, [processData]);

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

  return { members, records, isSyncing, syncStatusText, handleCloudSync };
}


// --- Constants ---
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/1SeL-3oosOKaeqN1MGxJdKduE6pKmEe356BDKakf_uR1f-G9feVALKHG1/exec"; 

const getDaysToNextSync = () => {
  const today = new Date();
  const currentDay = today.getDate();
  if (currentDay === 16 || currentDay === 29) return "Today!";
  if (currentDay < 16) return `${16 - currentDay} Days left`;
  if (currentDay < 29) return `${29 - currentDay} Days left`;
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return `${(daysInMonth - currentDay) + 16} Days left`;
};

const formatShortName = (fullName) => {
  if (!fullName) return "-";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length > 1) {
    return `${parts[0]} ${parts[1].substring(0, 1)}.`; 
  }
  return fullName;
};

// ==========================================
// Components
// ==========================================
const Leaderboard = ({ champion, earlyBird, chartData, chartMode, setChartMode, themeVars }) => {
  return (
    <div className="col-span-8 p-4 bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-lg flex flex-col h-full shadow-sm overflow-hidden transition-colors duration-300">
       <div className="flex justify-between items-center mb-5 flex-none">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-main)] flex items-center gap-2">
             <BarChart2 className="w-4 h-4 text-[var(--c-emerald)]" /> TOP PERFORMERS
          </h3>
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
                <p className="text-sm font-bold text-[var(--text-main)] truncate">
                  {champion ? `${champion.prefix ? champion.prefix + ' ' : ''}${champion.name}` : '-'}
                </p>
                <p className="text-[10px] text-[var(--c-amber)] font-mono mt-0.5">{champion ? `${champion.count} Topics Completed` : ''}</p>
             </div>
          </div>
          <div className="bg-[var(--bg-base)] border border-[var(--border-main)] rounded-lg p-3 flex items-center gap-3 hover:border-[var(--c-blue-bd)] transition-all">
             <div className="p-2.5 bg-[var(--c-blue-bg)] rounded-full text-[var(--c-blue)]"><Clock className="w-5 h-5" /></div>
             <div className="overflow-hidden w-full">
                <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Early Bird</p>
                <p className="text-sm font-bold text-[var(--text-main)] truncate">
                  {earlyBird ? `${earlyBird.prefix ? earlyBird.prefix + ' ' : ''}${earlyBird.Name}` : '-'}
                </p>
                <p className="text-[10px] text-[var(--c-blue)] font-mono mt-0.5 truncate">{earlyBird ? earlyBird.CreatedDateTime : ''}</p>
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

const StatCard = ({ title, value, subValue, icon: Icon, valueColor, iconColor, delay }) => (
  <div 
    className="bg-[var(--bg-panel)] border border-[var(--border-main)] p-2.5 rounded-lg hover:border-[var(--border-hover)] transition-all duration-300 flex items-center justify-between cursor-default animate-[fadeInUp_0.5s_ease-out] min-w-0"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="flex flex-col gap-0.5 min-w-0 pr-1 overflow-hidden">
      <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider truncate">{title}</p>
      <div className="flex flex-col">
        <div className="flex items-baseline gap-1 mt-0.5">
            <h3 className={`text-lg font-black tracking-tight ${valueColor} truncate leading-tight font-mono`}>
              {typeof value === 'object' ? '-' : (value || "-")}
            </h3>
            {title === "Avg. Sub." && <span className="text-[9px] font-medium text-[var(--text-faint)]">/User</span>}
        </div>
        {subValue && (
          <span className={`flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded w-fit mt-1 border truncate max-w-full ${subValue.style}`}>
            {subValue.text || subValue}
          </span>
        )}
      </div>
    </div>
    <div className={`p-2 rounded bg-[var(--bg-base)] border border-[var(--border-main)] flex-none`}>
      <Icon className={`w-4 h-4 ${iconColor}`} />
    </div>
  </div>
);

const KpiCards = ({ stats }) => {
  const TARGET_AVG = 1.0; 
  const currentAvg = parseFloat(stats.avg || 0);
  const isAvgPassed = currentAvg >= TARGET_AVG;

  return (
    <div className="grid grid-cols-3 gap-3 flex-none">
      <StatCard 
        title="Completed" value={stats.completed} 
        subValue={{ text: "Users Checked", style: "bg-[var(--bg-hover)] text-[var(--text-muted)] border-[var(--border-hover)]" }}
        icon={CheckCircle2} valueColor="text-[var(--text-main)]" iconColor="text-[var(--c-emerald)]" delay={0}
      />
      <StatCard 
        title="Avg. Sub." value={stats.avg} 
        subValue={
          isAvgPassed 
            ? { text: "Pass Criteria ✅", style: "bg-[var(--c-emerald-bg)] text-[var(--c-emerald)] border-[var(--c-emerald-bd)]" }
            : { text: `Target person: ${TARGET_AVG}`, style: "bg-[var(--c-amber-bg)] text-[var(--c-amber)] border-[var(--c-amber-bd)]" }
        }
        icon={isAvgPassed ? Zap : AlertCircle} 
        valueColor={isAvgPassed ? "text-[var(--c-emerald)]" : "text-[var(--c-amber)]"} 
        iconColor={isAvgPassed ? "text-[var(--c-emerald)]" : "text-[var(--c-amber)]"} delay={100}
      />
      <StatCard 
        title="Comp. Rate" value={`${stats.rate}%`} 
        subValue={{ text: "Overall Progress", style: "bg-[var(--c-blue-bg)] text-[var(--c-blue)] border-[var(--c-blue-bd)]" }}
        icon={PieChart} valueColor="text-[var(--c-blue)]" iconColor="text-[var(--c-blue)]" delay={200}
      />
    </div>
  );
};

export default function App() {
  const { members, records, isSyncing, syncStatusText, handleCloudSync } = useGoogleSheets();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');

  const [activeTab, setActiveTab] = useState('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isUploadingToCloud, setIsUploadingToCloud] = useState(false);
  
  const [isDarkMode, setIsDarkMode] = useState(false);
  const fileInputRef = useRef(null);
  
  const [filters, setFilters] = useState({ 
    year: '2026', 
    month: currentMonth, 
    dept: 'All', 
    search: '' 
  });
  
  const [chartMode, setChartMode] = useState('user');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const captureRef = useRef(null);

  useEffect(() => {
    document.title = "HEIM-Self-Learning-Dashboard";
    document.body.style.backgroundColor = isDarkMode ? '#0B0E0D' : '#F9FAFB'; 
    document.body.style.transition = 'background-color 0.3s ease';
  }, [isDarkMode]);

  const themeVars = useMemo(() => isDarkMode ? {
    emerald: '#00E676', emeraldBg: 'rgba(0, 230, 118, 0.1)',
    blue: '#29B6F6', amber: '#FFC400', red: '#FF3D00',
    grid: '#1E2723', textMuted: '#8B9C94', textFaint: '#5E6C65',
    tooltipBg: '#121715', tooltipBorder: '#1E2723', tooltipTitle: '#FFFFFF', tooltipBody: '#8B9C94', baseBg: '#0B0E0D'
  } : {
    emerald: '#10B981', emeraldBg: 'rgba(16, 185, 129, 0.15)',
    blue: '#0EA5E9', amber: '#F59E0B', red: '#EF4444',
    grid: '#F3F4F6', textMuted: '#6B7280', textFaint: '#9CA3AF',
    tooltipBg: '#FFFFFF', tooltipBorder: '#E5E7EB', tooltipTitle: '#1F2937', tooltipBody: '#4B5563', baseBg: '#F9FAFB'
  }, [isDarkMode]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!GAS_WEB_APP_URL) {
       alert("⚠️ โปรดนำ URL ของ Apps Script มาใส่ในโค้ดก่อนใช้งานฟีเจอร์นี้ครับ!");
       return;
    }
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target.result;
      setIsUploadingToCloud(true);
      try {
        await fetch(GAS_WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: text });
        setTimeout(() => {
           alert("✅ ส่งข้อมูลขึ้น Google Sheets สำเร็จแล้ว! (ระบบจะรีเฟรชเพื่อแสดงข้อมูลล่าสุด)");
           window.location.reload(); 
        }, 1500);
      } catch(error) {
        alert("❌ เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ โปรดตรวจสอบอินเทอร์เน็ต: " + error.message);
        setIsUploadingToCloud(false);
      } finally {
        if(fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const { filteredRecords, targetPool, deptStats, champion, earlyBird, pendingList, todayCount, latestActivity, allUserStats } = useMemo(() => {
    const filtered = records.filter(r => {
      if (!r.CreatedDateTime) return false;
      const dt = String(r.CreatedDateTime);
      const matchYear = dt.startsWith(filters.year);
      const matchMonth = filters.month === 'ALL' || dt.includes(`-${filters.month}-`);
      const matchDept = filters.dept === 'All' || r.Department === filters.dept;
      const searchLower = filters.search.toLowerCase();
      const matchSearch = filters.search === '' || r.Name.toLowerCase().includes(searchLower) || (r.Topic && r.Topic.toLowerCase().includes(searchLower));
      return matchYear && matchMonth && matchDept && matchSearch;
    });

    let effMembers = members;
    if (members.length === 0 && records.length > 0) {
      const uniqueMap = new Map();
      records.forEach(r => { if (!uniqueMap.has(r.Name)) uniqueMap.set(r.Name, { name: r.Name, dept: r.Department, email: r.Email || "-" }); });
      effMembers = Array.from(uniqueMap.values());
    }

    const pool = effMembers.filter(m => filters.dept === 'All' || m.dept === filters.dept);
    const activeNames = new Set(filtered.map(r => r.Name));
    const pending = pool.filter(m => !activeNames.has(m.name));

    const stats = {};
    const allDepts = [...new Set(effMembers.map(m => m.dept))];
    allDepts.forEach(d => stats[d] = { total: 0, active: 0, totalRecords: 0 });
    effMembers.forEach(m => { if (stats[m.dept]) stats[m.dept].total++; });
    
    const activeInContext = new Set();
    records.filter(r => {
        const dt = String(r.CreatedDateTime);
        return dt.startsWith(filters.year) && (filters.month === 'ALL' || dt.includes(`-${filters.month}-`));
    }).forEach(r => {
        const user = effMembers.find(m => m.name === r.Name);
        if (user) {
            if (stats[user.dept]) {
                stats[user.dept].totalRecords++; 
                if (!activeInContext.has(user.name)) {
                    activeInContext.add(user.name);
                    stats[user.dept].active++;
                }
            }
        }
    });

    const sortedDeptStats = Object.entries(stats).map(([name, s]) => ({ 
        name, 
        ...s, 
        rate: s.total > 0 ? (s.active / s.total * 100) : 0,
        avgSub: s.total > 0 ? (s.totalRecords / s.total).toFixed(1) : "0.0" 
    })).sort((a, b) => b.rate - a.rate);

    const counts = {}; filtered.forEach(r => counts[r.Name] = (counts[r.Name] || 0) + 1);
    
    const sortedUsers = Object.entries(counts).map(([name, count]) => {
        const m = effMembers.find(x => x.name === name);
        return { name, prefix: m?.prefix || "", count, dept: m?.dept || 'N/A' };
    }).sort((a, b) => b.count - a.count);
    
    const rankedUsers = pool.map(m => ({
        name: m.name,
        prefix: m.prefix || "",
        dept: m.dept,
        email: m.email || "-",
        rawEmail: m.rawEmail || "",
        empId: m.empId || "",
        firstName: m.firstName || "",
        lastName: m.lastName || "",
        position: m.position || "",
        sectionRaw: m.sectionRaw || "",
        departmentRaw: m.departmentRaw || "",
        divisionRaw: m.divisionRaw || "",
        companyRaw: m.companyRaw || "",
        count: counts[m.name] || 0
    })).sort((a, b) => {
        if (a.count !== b.count) return a.count - b.count; 
        return a.name.localeCompare(b.name); 
    });

    const sortedTime = [...filtered].sort((a, b) => new Date(a.CreatedDateTime) - new Date(b.CreatedDateTime));
    const earlyBirdRec = sortedTime[0] || null;
    const earlyBirdMember = earlyBirdRec ? effMembers.find(m => m.name === earlyBirdRec.Name) : null;
    const earlyBirdObj = earlyBirdRec ? { ...earlyBirdRec, prefix: earlyBirdMember?.prefix || "" } : null;

    const todayStr = new Date().toISOString().split('T')[0];
    const todayRecs = filtered.filter(r => r.CreatedDateTime && r.CreatedDateTime.startsWith(todayStr)).length;
    
    const latestRecs = [...filtered].reverse().slice(0, 4).map(r => {
        const m = effMembers.find(x => x.name === r.Name);
        return { ...r, prefix: m?.prefix || "" };
    });

    return { 
        filteredRecords: filtered, 
        targetPool: pool, 
        deptStats: sortedDeptStats, 
        champion: sortedUsers[0] || null, 
        earlyBird: earlyBirdObj, 
        pendingList: pending, 
        todayCount: todayRecs, 
        latestActivity: latestRecs, 
        allUserStats: rankedUsers 
    };
  }, [records, members, filters]);

  const insightsData = useMemo(() => {
    const topicCounts = {};
    filteredRecords.forEach(r => { topicCounts[r.Topic || "Other"] = (topicCounts[r.Topic || "Other"] || 0) + 1; });
    const topTopics = Object.entries(topicCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
    const dailyTrend = {};
    filteredRecords.forEach(r => { 
      if (r.CreatedDateTime) {
         const dateOnly = r.CreatedDateTime.split(' ')[0]; 
         dailyTrend[dateOnly] = (dailyTrend[dateOnly] || 0) + 1; 
      }
    });
    const sortedDates = Object.keys(dailyTrend).sort();
    const readinessScore = targetPool.length > 0 ? Math.round(((targetPool.length - pendingList.length) / targetPool.length) * 100) : 0;
    
    return {
      topTopics, readinessScore,
      trendChart: {
        labels: sortedDates.map(d => d.split('-').slice(1).join('/')),
        datasets: [{
          label: 'Volume',
          data: sortedDates.map(d => dailyTrend[d]),
          borderColor: themeVars.emerald,
          backgroundColor: themeVars.emeraldBg,
          fill: true, tension: 0.3, pointRadius: 2, pointBackgroundColor: themeVars.emerald
        }]
      }
    };
  }, [filteredRecords, targetPool, pendingList, themeVars]);

  const handleEditData = () => {
    const pin = prompt("🔐 Enter Security PIN to Edit Data:");
    if (pin === "0000") { window.open(`https://docs.google.com/spreadsheets/d/${SHEET_ID_RECORDS}/edit`, "_blank"); } 
    else if (pin !== null) { alert("❌ Incorrect PIN! Access Denied."); }
  };

  const copyReminder = () => {
    const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const monthText = filters.month !== 'ALL' ? `เดือน ${THAI_MONTHS[parseInt(filters.month) - 1]} ${filters.year}` : `ปี ${filters.year}`;
    
    let deptName = filters.dept === 'All' ? 'All Departments' : filters.dept;
    if (deptName === 'Product Development and Supply Chain Department') {
        deptName = 'Product&Supply Chain';
    }

    let text = `@All สรุป Self learning ${monthText}\n*Departments ${deptName}*\n`;

    if (pendingList.length > 0) {
      text += `รายชื่อ PENDING WATCHLIST\n` + pendingList.map((m, i) => `${i+1}. ${m.prefix ? m.prefix + ' ' : ''}${m.firstName && m.lastName ? `${m.firstName} ${m.lastName}` : m.name} ${m.email && m.email !== '-' ? `(${m.email})` : ''}`).join('\n');
    } else {
      text += `✅ สมาชิกทุกคนเข้าเรียนรู้ครบถ้วน 100% แล้วครับ เยี่ยมมาก! 🎉`;
    }
      
    navigator.clipboard.writeText(text);
    alert('📋 ก๊อปปี้ข้อความสำหรับส่ง LINE เรียบร้อย!');
  };

  const exportDeptData = () => {
    const csvRows = [];
    csvRows.push("Sector/Department,Base (Total),Volume (Active),Pending,Avg. Sub.,Yield (%)");
    
    deptStats.forEach(d => {
      const pending = d.total - d.active;
      csvRows.push(`"${d.name}",${d.total},${d.active},${pending},${d.avgSub},${d.rate.toFixed(2)}%`);
    });

    const csvContent = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `Sector_Performance_${filters.year}_${filters.month}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ✅ ระบบดาวน์โหลด CSV จัดเรียงให้ตรงตามต้นฉบับ members-Heim 100%
  const exportData = () => {
    const csvRows = [];
    csvRows.push("Email Address Business,SCG Employee ID,Name Prefix (Thai),First Name (Thai),Last Name (Thai),Position Name (Thai),Section (Thai),Department (Thai),Division (Thai),Company (Thai),Status");
    
    pendingList.forEach(p => {
      csvRows.push(`"${p.rawEmail || ''}","${p.empId || ''}","${p.prefix || ''}","${p.firstName || ''}","${p.lastName || ''}","${p.position || ''}","${p.sectionRaw || ''}","${p.departmentRaw || ''}","${p.divisionRaw || ''}","${p.companyRaw || ''}","WAITING"`);
    });

    const csvContent = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `Pending_List_${filters.year}_${filters.month}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportUserData = () => {
    const csvRows = [];
    csvRows.push("Email Address Business,SCG Employee ID,Name Prefix (Thai),First Name (Thai),Last Name (Thai),Position Name (Thai),Section (Thai),Department (Thai),Division (Thai),Company (Thai),Topics Completed,Status");
    
    allUserStats.forEach((u) => {
        const statusText = u.count === 0 ? 'WAITING' : 'COMPLETED';
        csvRows.push(`"${u.rawEmail || ''}","${u.empId || ''}","${u.prefix || ''}","${u.firstName || ''}","${u.lastName || ''}","${u.position || ''}","${u.sectionRaw || ''}","${u.departmentRaw || ''}","${u.divisionRaw || ''}","${u.companyRaw || ''}",${u.count},"${statusText}"`);
    });

    const csvContent = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `User_Ranking_${filters.year}_${filters.month}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportRecordsData = () => {
    const csvRows = [];
    // ✅ อัปเดตคอลัมน์ EXPORT ALL LOGS ให้เหมือนกับส่วนอื่นๆ แบบเป๊ะๆ
    csvRows.push("Date,Email Address Business,SCG Employee ID,Name Prefix (Thai),First Name (Thai),Last Name (Thai),Position Name (Thai),Section (Thai),Department (Thai),Division (Thai),Company (Thai),Topic");
    
    filteredRecords.forEach(r => {
      // ดึงข้อมูลสมาชิกมาประกอบให้ครบ
      const m = members.find(x => x.email === r.Email.toLowerCase() || x.name === r.Name) || {};
      csvRows.push(`"${r.CreatedDateTime}","${m.rawEmail || r.Email || ''}","${m.empId || ''}","${m.prefix || ''}","${m.firstName || ''}","${m.lastName || ''}","${m.position || ''}","${m.sectionRaw || ''}","${m.departmentRaw || ''}","${m.divisionRaw || ''}","${m.companyRaw || ''}","${r.Topic}"`);
    });

    const csvContent = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `Learning_Records_${filters.year}_${filters.month}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportViewersSummary = () => {
    const csvRows = [];
    csvRows.push("Email Address Business,SCG Employee ID,Name Prefix (Thai),First Name (Thai),Last Name (Thai),Position Name (Thai),Section (Thai),Department (Thai),Division (Thai),Company (Thai),Topics Completed,Status");
    
    const viewers = allUserStats.filter(u => u.count > 0);
    
    viewers.forEach(u => {
      const statusText = u.count === 0 ? 'WAITING' : 'COMPLETED';
      csvRows.push(`"${u.rawEmail || ''}","${u.empId || ''}","${u.prefix || ''}","${u.firstName || ''}","${u.lastName || ''}","${u.position || ''}","${u.sectionRaw || ''}","${u.departmentRaw || ''}","${u.divisionRaw || ''}","${u.companyRaw || ''}",${u.count},"${statusText}"`);
    });

    const csvContent = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `Viewers_Summary_${filters.year}_${filters.month}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const captureScreen = async () => { 
    if (captureRef.current && window.html2canvas) { 
      const element = captureRef.current;
      const scrollElements = element.querySelectorAll('.overflow-hidden, .overflow-y-auto, .overflow-auto, .h-full, .flex-1, .custom-scrollbar');
      const originalStyles = [];
      const origMainOverflow = element.style.getPropertyValue('overflow');
      const origMainHeight = element.style.getPropertyValue('height');
      element.style.setProperty('overflow', 'visible', 'important');
      element.style.setProperty('height', 'max-content', 'important');

      scrollElements.forEach(el => {
        originalStyles.push({
          el, overflow: el.style.getPropertyValue('overflow'), height: el.style.getPropertyValue('height'), maxHeight: el.style.getPropertyValue('max-height')
        });
        el.style.setProperty('overflow', 'visible', 'important');
        el.style.setProperty('height', 'max-content', 'important');
        el.style.setProperty('max-height', 'none', 'important');
      });

      await new Promise(r => setTimeout(r, 500));
      await document.fonts.ready;

      const canvas = await window.html2canvas(element, { scale: 2, backgroundColor: themeVars.baseBg, useCORS: true, scrollY: -window.scrollY }); 
      
      if (origMainOverflow) element.style.setProperty('overflow', origMainOverflow); else element.style.removeProperty('overflow');
      if (origMainHeight) element.style.setProperty('height', origMainHeight); else element.style.removeProperty('height');

      originalStyles.forEach(item => {
        if (item.overflow) item.el.style.setProperty('overflow', item.overflow); else item.el.style.removeProperty('overflow');
        if (item.height) item.el.style.setProperty('height', item.height); else item.el.style.removeProperty('height');
        if (item.maxHeight) item.el.style.setProperty('max-height', item.maxHeight); else item.el.style.removeProperty('max-height');
      });

      const link = document.createElement('a'); 
      link.download = 'Terminal-Dashboard.png'; 
      link.href = canvas.toDataURL('image/png'); 
      link.click(); 
    } 
  };

  // ✅ ปรับ Filter Department ให้แสดงเป็นลิสต์แบบตรงๆ ตัด <optgroup label="Others"> ออก
  const deptOptions = useMemo(() => {
    // รวบรวมชื่อ Department ทั้งหมดแบบไม่ซ้ำ และกรองค่าว่างออก
    const allDepts = ["All", ...new Set([...members.map(m => m.dept), ...records.map(r => r.Department)])]
      .filter(d => d && d !== "-" && d !== "All")
      .sort();
      
    return ["All", ...Array.from(new Set(allDepts))];
  }, [members, records]);

  const chartData = useMemo(() => {
    if (chartMode === 'user') {
      const counts = {}; filteredRecords.forEach(r => counts[r.Name] = (counts[r.Name] || 0) + 1);
      const top10 = Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);
      return { labels: top10.map(u => formatShortName(u.name)), datasets: [{ label: 'Records', data: top10.map(u => u.count), backgroundColor: themeVars.blue, borderRadius: 4, barThickness: 10 }] };
    } else {
      const topDepts = deptStats.slice(0, 8);
      return { labels: topDepts.map(d => d.name.length > 20 ? d.name.substring(0, 20) + '...' : d.name), datasets: [{ label: 'Completion %', data: topDepts.map(d => d.rate), backgroundColor: themeVars.emerald, borderRadius: 4, barThickness: 10 }] };
    }
  }, [filteredRecords, deptStats, chartMode, themeVars]);

  const comparisonChartData = useMemo(() => {
    const top15 = deptStats.slice(0, 15);
    return {
      labels: top15.map(d => d.name.length > 30 ? d.name.substring(0, 30) + '...' : d.name),
      datasets: [{ label: 'Completion Rate (%)', data: top15.map(d => d.rate), backgroundColor: top15.map(d => d.rate >= 100 ? themeVars.emerald : (d.rate >= 50 ? themeVars.blue : themeVars.amber)), borderRadius: 4, barThickness: 12 }]
    };
  }, [deptStats, themeVars]);

  if (isSyncing || isUploadingToCloud) {
    return (
      <div className="fixed inset-0 bg-[var(--bg-panel)]/95 backdrop-blur z-[999] flex flex-col items-center justify-center font-sans text-xs transition-colors duration-300">
        <div className="relative">
          <div className="w-16 h-16 bg-[var(--bg-base)] border border-[var(--border-main)] rounded-2xl shadow-xl flex items-center justify-center mb-6 animate-pulse">
             {isUploadingToCloud ? <UploadCloud className="w-8 h-8 text-[var(--c-blue)] fill-current" /> : <Zap className="w-8 h-8 text-[var(--c-emerald)] fill-current" />}
          </div>
          <div className="absolute -bottom-2 -right-2 bg-[var(--bg-panel)] rounded-full p-1 border-2 border-[var(--bg-base)]">
             <Loader2 className={`w-4 h-4 animate-spin ${isUploadingToCloud ? 'text-[var(--c-blue)]' : 'text-[var(--c-emerald)]'}`} />
          </div>
        </div>
        <h2 className="text-xl font-black text-[var(--text-main)] tracking-widest mb-1 uppercase">
           {isUploadingToCloud ? "UPLOADING TO DATABASE..." : "ESTABLISHING CONNECTION..."}
        </h2>
        <p className={`text-[10px] font-medium uppercase tracking-widest animate-pulse ${isUploadingToCloud ? 'text-[var(--c-blue)]' : 'text-[var(--c-emerald)]'}`}>
           {isUploadingToCloud ? "Please wait while we push data to Google Sheets" : syncStatusText}
        </p>
      </div>
    );
  }

  return (
    <div className={`${isDarkMode ? 'dark-mode' : 'light-mode'} flex flex-col h-screen bg-[var(--bg-base)] text-[var(--text-main)] font-sans text-xs overflow-hidden transition-colors duration-300`}>
       
       <style>{`
          :root {
            --bg-base: #F9FAFB;
            --bg-panel: #FFFFFF;
            --bg-hover: #F3F4F6;
            --border-main: #E5E7EB;
            --border-hover: #D1D5DB;
            --text-main: #1F2937;
            --text-muted: #6B7280;
            --text-faint: #9CA3AF;
            --c-emerald: #10B981;
            --c-emerald-bg: rgba(16,185,129,0.1);
            --c-emerald-bd: rgba(16,185,129,0.2);
            --c-amber: #F59E0B;
            --c-amber-bg: rgba(245,158,11,0.1);
            --c-amber-bd: rgba(245,158,11,0.2);
            --c-blue: #3B82F6;
            --c-blue-bg: rgba(59,130,246,0.1);
            --c-blue-bd: rgba(59,130,246,0.2);
            --c-red: #EF4444;
            --c-red-bg: rgba(239,68,68,0.1);
            --c-red-bd: rgba(239,68,68,0.2);
          }
          .dark-mode {
            --bg-base: #0B0E0D;
            --bg-panel: #121715;
            --bg-hover: #1A221E;
            --border-main: #1E2723;
            --border-hover: #2C3833;
            --text-main: #FFFFFF;
            --text-muted: #8B9C94;
            --text-faint: #5E6C65;
            --c-emerald: #00E676;
            --c-emerald-bg: rgba(0,230,118,0.1);
            --c-emerald-bd: rgba(0,230,118,0.2);
            --c-amber: #FFC400;
            --c-amber-bg: rgba(255,196,0,0.1);
            --c-amber-bd: rgba(255,196,0,0.2);
            --c-blue: #29B6F6;
            --c-blue-bg: rgba(41,182,246,0.1);
            --c-blue-bd: rgba(41,182,246,0.2);
            --c-red: #FF3D00;
            --c-red-bg: rgba(255,61,0,0.1);
            --c-red-bd: rgba(255,61,0,0.2);
          }
          body { font-family: 'Prompt', sans-serif; background-color: var(--bg-base); transition: background-color 0.3s; } 
          .font-mono { font-family: 'JetBrains Mono', monospace; }
          .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; } 
          .custom-scrollbar::-webkit-scrollbar-track { background: var(--bg-base); } 
          .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-main); border-radius: 4px; } 
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--border-hover); }
       `}</style>
      
      <header className="bg-[var(--bg-panel)] border-b border-[var(--border-main)] z-50 flex-none h-14 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.location.reload()}>
            <div className="w-8 h-8 bg-[var(--bg-base)] border border-[var(--border-main)] flex items-center justify-center text-[var(--c-emerald)] rounded transition-all group-hover:bg-[var(--bg-hover)] group-hover:border-[var(--c-emerald)]">
              <span className="font-black text-lg leading-none font-mono">S</span>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-widest text-[var(--text-main)] uppercase leading-none">SCG HEIM</h1>
              <span className="text-[9px] text-[var(--c-emerald)] font-medium uppercase tracking-widest font-mono">TERMINAL OPS</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
            <div className="w-px h-6 bg-[var(--border-main)]"></div>
            <div className="flex items-center gap-2">
              
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)} 
                className="flex items-center justify-center w-8 h-8 bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--border-hover)] transition-all rounded group" 
                title="Toggle Dark/Light Mode"
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
              <button 
                onClick={() => fileInputRef.current.click()}
                className="flex items-center gap-2 px-3 py-1.5 bg-[var(--c-blue-bg)] border border-[var(--c-blue-bd)] text-[var(--c-blue)] text-[10px] font-bold hover:bg-[var(--bg-hover)] transition-all rounded group"
                title="Upload & Sync CSV to Google Sheets"
              >
                <UploadCloud className="w-3 h-3" />
                SYNC CLOUD DB
              </button>

              <button onClick={captureScreen} className="p-2 bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--border-hover)] rounded transition-all" title="Capture Screen"><Camera className="w-4 h-4" /></button>
              
              <button 
                onClick={handleEditData}
                className="flex items-center gap-2 px-3 py-1.5 bg-[var(--c-amber-bg)] border border-[var(--c-amber-bd)] text-[var(--c-amber)] text-[10px] font-bold hover:bg-[var(--bg-hover)] transition-all rounded group"
              >
                <Lock className="w-3 h-3" />
                EDIT DATA
              </button>
            </div>
          </div>
        </div>
      </header>

      <main ref={captureRef} className="flex-1 max-w-7xl mx-auto w-full p-4 flex flex-col gap-4 overflow-hidden">
        
        <div className="bg-[var(--bg-panel)] border border-[var(--border-main)] p-2 flex items-center gap-3 flex-none rounded-lg shadow-sm transition-colors duration-300">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative w-28"><Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)] w-3.5 h-3.5" /><select value={filters.year} onChange={e => setFilters({...filters, year: e.target.value})} className="w-full bg-[var(--bg-panel)] border border-[var(--border-main)] h-8 pl-8 pr-4 text-[11px] font-medium text-[var(--text-main)] outline-none focus:border-[var(--c-emerald)] rounded cursor-pointer hover:border-[var(--border-hover)] transition-all"><option value="2026">2026</option><option value="2025">2025</option><option value="2024">2024</option></select></div>
            <div className="relative w-32"><Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)] w-3.5 h-3.5" /><select value={filters.month} onChange={e => setFilters({...filters, month: e.target.value})} className="w-full bg-[var(--bg-panel)] border border-[var(--border-main)] h-8 pl-8 pr-4 text-[11px] font-medium text-[var(--text-main)] outline-none focus:border-[var(--c-emerald)] rounded cursor-pointer hover:border-[var(--border-hover)] transition-all"><option value="ALL">All Months</option>{MONTH_NAMES.map((m, i) => <option key={i} value={String(i+1).padStart(2,'0')}>{m}</option>)}</select></div>
            <div className="relative flex-1">
                <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)] w-3.5 h-3.5" />
                {/* ✅ เปลี่ยนเป็น Dropdown แผนกแบบตรงๆ ไม่มีจัดกลุ่ม <optgroup> ให้เกะกะ */}
                <select value={filters.dept} onChange={e => setFilters({...filters, dept: e.target.value})} className="w-full bg-[var(--bg-panel)] border border-[var(--border-main)] h-8 pl-8 pr-4 text-[11px] font-medium text-[var(--text-main)] outline-none focus:border-[var(--c-emerald)] rounded cursor-pointer hover:border-[var(--border-hover)] transition-all">
                    {deptOptions.map(d => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
                </select>
            </div>
          </div>
          <div className="relative w-56"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)] w-3.5 h-3.5" /><input type="text" placeholder="Search Symbol..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} className="w-full bg-[var(--bg-base)] border border-[var(--border-main)] h-8 pl-8 pr-4 text-[11px] font-medium text-[var(--text-main)] outline-none focus:bg-[var(--bg-panel)] focus:border-[var(--c-emerald)] rounded placeholder-[var(--text-faint)] transition-all" /></div>
          
          <button 
            onClick={() => setFilters({
              year: '2026', 
              month: currentMonth, 
              dept: 'All', 
              search: ''
            })} 
            className="w-8 h-8 flex items-center justify-center bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--c-emerald)] hover:border-[var(--c-emerald)] rounded transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="flex-1 flex flex-col gap-4 overflow-hidden animate-[fadeInUp_0.4s_ease-out]">
            <KpiCards 
                stats={{
                    totalRecords: filteredRecords.length,
                    completed: targetPool.length - pendingList.length,
                    avg: targetPool.length > 0 ? (filteredRecords.length / targetPool.length).toFixed(1) : "0.0",
                    rate: targetPool.length > 0 ? Math.round(((targetPool.length - pendingList.length) / targetPool.length) * 100) : 0
                }}
            />

            <div className="flex-1 grid grid-cols-12 gap-4 overflow-hidden">
                
                <div className="col-span-8 flex flex-col h-full overflow-hidden">
                    <Leaderboard 
                        champion={champion} earlyBird={earlyBird} chartData={chartData} chartMode={chartMode} setChartMode={setChartMode} themeVars={themeVars}
                    />
                </div>
                
                <div className="col-span-4 flex flex-col rounded-lg bg-[var(--bg-panel)] border border-[var(--border-main)] shadow-sm overflow-hidden h-full transition-colors duration-300">
                    <div className="flex items-center justify-between p-3 border-b border-[var(--border-main)] flex-none bg-[var(--bg-base)]">
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-main)] flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--c-red)] animate-pulse"></span> PENDING WATCHLIST
                        </h3>
                        <div className="flex gap-1">
                          <button onClick={copyReminder} className="p-1 bg-[var(--bg-panel)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--c-blue)] rounded transition-colors" title="Copy to LINE"><Copy className="w-3.5 h-3.5" /></button>
                          <button onClick={exportData} className="p-1 bg-[var(--bg-panel)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--c-emerald)] rounded transition-colors" title="Export CSV"><Download className="w-3.5 h-3.5" /></button>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 px-3 py-1.5 bg-[var(--bg-hover)] border-b border-[var(--border-main)] text-[9px] font-bold text-[var(--text-faint)] uppercase flex-none">
                       <span className="col-span-2">Name / Symbol</span>
                       <span className="text-center">Dept</span>
                       <span className="text-right">Signal</span>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {pendingList.length > 0 ? pendingList.map((m, i) => (
                            <div key={i} className="group grid grid-cols-4 items-center px-3 py-2 border-b border-[var(--border-main)] hover:bg-[var(--bg-base)] transition-all">
                                <div className="col-span-2 flex items-center gap-2 pr-2 overflow-hidden">
                                    <div className="w-1 h-full min-h-[12px] bg-[var(--c-red)] rounded-full flex-none opacity-80"></div>
                                    <div className="truncate flex flex-col justify-center">
                                      <p className="text-[11px] font-medium text-[var(--text-main)] truncate leading-tight">
                                        {m.prefix ? m.prefix + ' ' : ''}{m.firstName && m.lastName ? `${m.firstName} ${m.lastName}` : m.name}
                                      </p>
                                      {m.email && m.email !== "-" && (
                                        <p className="text-[8px] text-[var(--text-faint)] truncate leading-tight mt-0.5">{m.email}</p>
                                      )}
                                    </div>
                                </div>
                                <div className="text-[9px] text-[var(--text-muted)] text-center uppercase truncate">{m.dept}</div>
                                <div className="text-right">
                                   <span className="inline-block px-1.5 py-0.5 bg-[var(--c-red-bg)] border border-[var(--c-red-bd)] text-[var(--c-red)] text-[8px] rounded font-mono font-bold">WAITING</span>
                                </div>
                            </div>
                        )) : (
                          <div className="h-full min-h-[100px] flex flex-col items-center justify-center text-[var(--text-faint)]">
                             <CheckCircle className="w-8 h-8 mb-2 opacity-30 text-[var(--c-emerald)]" />
                             <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--c-emerald)]">ALL CLEAR</p>
                          </div>
                        )}
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* Insights Tab */}
        {activeTab === 'insights' && (
          <div className="flex-1 flex flex-col gap-4 overflow-hidden animate-[fadeInUp_0.4s_ease-out]">
            <div className="grid grid-cols-12 gap-4 h-full overflow-hidden">
              <div className="col-span-4 flex flex-col gap-4">
                <div className="bg-gradient-to-br from-[var(--bg-panel)] to-[var(--bg-base)] border border-[var(--border-main)] p-5 rounded-lg shadow-sm transition-colors duration-300">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-widest">NPD Index</p>
                      <h3 className="text-4xl font-black text-[var(--text-main)] mt-1 tracking-tighter font-mono">
                        {insightsData.readinessScore}<span className="text-sm text-[var(--text-faint)] ml-1">pts</span>
                      </h3>
                    </div>
                    <div className={`px-2 py-1 rounded-md text-[9px] font-bold border font-mono ${insightsData.readinessScore >= 80 ? 'bg-[var(--c-emerald-bg)] text-[var(--c-emerald)] border-[var(--c-emerald-bd)]' : 'bg-[var(--c-amber-bg)] text-[var(--c-amber)] border-[var(--c-amber-bd)]'}`}>
                      {insightsData.readinessScore >= 80 ? 'BULLISH' : 'NEUTRAL'}
                    </div>
                  </div>
                  <div className="mt-6 w-full bg-[var(--bg-base)] border border-[var(--border-main)] h-2 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-1000 ${insightsData.readinessScore >= 80 ? 'bg-[var(--c-emerald)] shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-[var(--c-amber)]'}`} style={{ width: `${insightsData.readinessScore}%` }}></div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col p-4 bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-lg shadow-sm overflow-hidden transition-colors duration-300">
                  <h3 className="text-[11px] font-bold uppercase text-[var(--text-main)] mb-4 flex items-center gap-2 flex-none">
                    <Flame className="w-3.5 h-3.5 text-[var(--c-red)]" /> TOP GAINERS (TOPICS)
                  </h3>
                  <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-1">
                    {insightsData.topTopics.map((topic, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-[10px] mb-1.5">
                          <span className="font-medium text-[var(--text-main)] truncate max-w-[180px]">{topic.name}</span>
                          <span className="text-[var(--c-emerald)] font-medium font-mono">+{topic.count} Vol</span>
                        </div>
                        <div className="w-full bg-[var(--bg-base)] border border-[var(--border-main)] h-1.5 rounded-full overflow-hidden">
                          <div className="bg-[var(--c-emerald)] h-full transition-all duration-1000" style={{ width: `${(topic.count / insightsData.topTopics[0].count) * 100}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="col-span-8 flex flex-col p-4 bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-lg shadow-sm overflow-hidden transition-colors duration-300">
                <div className="flex justify-between items-center mb-6 flex-none">
                  <div>
                    <h3 className="text-[11px] font-bold uppercase text-[var(--text-main)] flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[var(--c-emerald)]" /> MARKET MOMENTUM
                    </h3>
                    <p className="text-[9px] text-[var(--text-muted)] mt-1 font-medium tracking-widest uppercase">Daily Volume Index</p>
                  </div>
                  <div className="flex gap-2">
                     <span className="px-2 py-1 bg-[var(--c-emerald-bg)] text-[var(--c-emerald)] border border-[var(--c-emerald-bd)] text-[9px] font-bold rounded-md font-mono">LIVE</span>
                  </div>
                </div>
                <div className="flex-1 min-h-0">
                  <Line 
                    data={insightsData.trendChart} 
                    options={{
                      responsive: true, maintainAspectRatio: false,
                      plugins: { legend: { display: false }, tooltip: { backgroundColor: themeVars.tooltipBg, borderColor: themeVars.tooltipBorder, borderWidth: 1, titleColor: themeVars.tooltipTitle, bodyColor: themeVars.tooltipBody, titleFont: { family: 'Prompt', size: 10 }, bodyFont: { family: 'JetBrains Mono', size: 10 }, padding: 10 } },
                      scales: {
                        y: { beginAtZero: true, grid: { color: themeVars.grid }, border: { dash: [4, 4] }, ticks: { font: { family: 'JetBrains Mono', size: 9 }, color: themeVars.textFaint } },
                        x: { grid: { display: false }, ticks: { font: { family: 'Prompt', size: 9 }, color: themeVars.textFaint } }
                      }
                    }} 
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ✅ Detail Tab (เพิ่ม Export CSV ของข้อมูลคนดู แผนก ยอดรวม ประวัติทั้งหมด) */}
        {activeTab === 'detail' && (
          <div className="flex-1 flex flex-col overflow-hidden animate-[fadeInUp_0.4s_ease-out] bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-lg shadow-sm transition-colors duration-300">
            <div className="p-3 border-b border-[var(--border-main)] flex-none bg-[var(--bg-base)] flex justify-between items-center">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-main)] flex items-center gap-2">
                 <FileSpreadsheet className="w-4 h-4 text-[var(--c-blue)]" /> LEARNING RECORDS (ALL VIEWS)
              </h3>
              <div className="flex gap-2 items-center">
                 <span className="text-[9px] text-[var(--text-muted)] uppercase font-mono mr-2">Total: {filteredRecords.length} Records</span>
                 
                 <button onClick={exportViewersSummary} className="flex items-center gap-1.5 px-2 py-1 bg-[var(--c-emerald-bg)] border border-[var(--c-emerald-bd)] text-[var(--c-emerald)] hover:bg-[var(--c-emerald)] hover:text-white rounded transition-colors" title="Export เฉพาะคนที่ดูแล้วและยอดรวม">
                    <Download className="w-3 h-3" /> <span className="text-[9px] font-bold">EXPORT SUMMARY</span>
                 </button>

                 <button onClick={exportRecordsData} className="flex items-center gap-1.5 px-2 py-1 bg-[var(--bg-panel)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--c-blue)] hover:border-[var(--c-blue)] rounded transition-colors" title="Export Records Data to CSV">
                    <Download className="w-3 h-3" /> <span className="text-[9px] font-bold">EXPORT ALL LOGS</span>
                 </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden relative">
               <DetailTable data={filteredRecords} currentPage={currentPage} setCurrentPage={setCurrentPage} itemsPerPage={itemsPerPage} />
            </div>
          </div>
        )}

        {/* Dept Tab */}
        {activeTab === 'dept' && (
          <div className="flex-1 flex flex-col overflow-hidden animate-[fadeInUp_0.4s_ease-out] bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-lg shadow-sm transition-colors duration-300">
            <div className="p-3 border-b border-[var(--border-main)] flex-none bg-[var(--bg-base)] flex justify-between items-center">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-main)] flex items-center gap-2">
                 <Building2 className="w-4 h-4 text-[var(--c-blue)]" /> SECTOR PERFORMANCE
              </h3>
              <div className="flex gap-3 items-center">
                 <span className="text-[9px] text-[var(--text-muted)] uppercase">Ranked by Yield %</span>
                 <button onClick={exportDeptData} className="flex items-center gap-1.5 px-2 py-1 bg-[var(--bg-panel)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--c-emerald)] hover:border-[var(--c-emerald)] rounded transition-colors" title="Export Sector Data to CSV">
                    <Download className="w-3 h-3" /> <span className="text-[9px] font-bold">EXPORT CSV</span>
                 </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[var(--bg-base)] border-b border-[var(--border-main)] sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-2 text-[9px] font-bold text-[var(--text-faint)] uppercase">Sector</th>
                    <th className="px-4 py-2 text-[9px] font-bold text-[var(--text-faint)] uppercase text-center">Base</th>
                    <th className="px-4 py-2 text-[9px] font-bold text-[var(--text-faint)] uppercase text-center">Vol.</th>
                    <th className="px-4 py-2 text-[9px] font-bold text-[var(--text-faint)] uppercase text-center">Pending</th>
                    <th className="px-4 py-2 text-[9px] font-bold text-[var(--text-faint)] uppercase text-center">Avg. Sub.</th>
                    <th className="px-4 py-2 text-[9px] font-bold text-[var(--text-faint)] uppercase text-left w-1/4">Trend</th>
                    <th className="px-4 py-2 text-[9px] font-bold text-[var(--text-faint)] uppercase text-right">Yield %</th>
                    <th className="px-4 py-2 text-[9px] font-bold text-[var(--text-faint)] uppercase text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-main)]">
                  {deptStats.map((d, i) => {
                    const pending = d.total - d.active;
                    let statusColor = d.rate >= 100 ? 'text-[var(--c-emerald)] bg-[var(--c-emerald-bg)] border-[var(--c-emerald-bd)]' : (d.rate >= 50 ? 'text-[var(--c-blue)] bg-[var(--c-blue-bg)] border-[var(--c-blue-bd)]' : 'text-[var(--c-amber)] bg-[var(--c-amber-bg)] border-[var(--c-amber-bd)]');
                    let statusText = d.rate >= 100 ? 'COMPLETED' : (d.rate >= 50 ? 'ON TRACK' : 'AT RISK');
                    
                    return (
                    <tr key={i} className="hover:bg-[var(--bg-hover)] transition-colors group">
                      <td className="px-4 py-3 text-[11px] font-medium text-[var(--text-main)] relative max-w-[200px] truncate" title={d.name}>
                        {d.name}
                        {i === 0 && <span className="ml-2 text-[8px] px-1 bg-[var(--c-amber-bg)] text-[var(--c-amber)] rounded border border-[var(--c-amber-bd)] font-mono">TOP</span>}
                      </td>
                      <td className="px-4 py-3 text-[10px] text-[var(--text-muted)] text-center font-mono">{d.total}</td>
                      <td className="px-4 py-3 text-[10px] text-[var(--text-main)] text-center font-mono font-bold">{d.active}</td>
                      <td className="px-4 py-3 text-[10px] text-[var(--c-red)] text-center font-mono">{pending}</td>
                      <td className={`px-4 py-3 text-[10px] text-center font-mono font-bold ${parseFloat(d.avgSub) >= 1.0 ? 'text-[var(--c-emerald)]' : 'text-[var(--c-blue)]'}`}>
                        {d.avgSub}
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-full h-1.5 bg-[var(--bg-base)] rounded-full overflow-hidden border border-[var(--border-main)]">
                          <div 
                            className={`h-full transition-all duration-1000 ${d.rate >= 100 ? 'bg-[var(--c-emerald)]' : (d.rate >= 50 ? 'bg-[var(--c-blue)]' : 'bg-[var(--c-amber)]')}`} 
                            style={{ width: `${d.rate}%` }}
                          ></div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                         <span className={`text-[11px] font-bold font-mono ${d.rate >= 100 ? 'text-[var(--c-emerald)]' : (d.rate >= 50 ? 'text-[var(--c-blue)]' : 'text-[var(--c-amber)]')}`}>
                            {d.rate >= 100 ? '★' : (d.rate >= 50 ? '▲' : '▶')} {d.rate.toFixed(0)}%
                         </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                         <span className={`inline-block px-1.5 py-0.5 text-[8px] rounded font-mono font-bold border ${statusColor}`}>
                           {statusText}
                         </span>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="flex-1 flex flex-col overflow-hidden animate-[fadeInUp_0.4s_ease-out] bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-lg shadow-sm transition-colors duration-300">
            <div className="p-3 border-b border-[var(--border-main)] flex-none bg-[var(--bg-base)] flex justify-between items-center">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-main)] flex items-center gap-2">
                 <Users className="w-4 h-4 text-[var(--c-blue)]" /> INDIVIDUAL PERFORMANCE
              </h3>
              <div className="flex gap-2 items-center">
                 <span className="text-[9px] text-[var(--text-muted)] uppercase mr-2">Ranked by Lowest Volume</span>
                 
                 <button onClick={exportViewersSummary} className="flex items-center gap-1.5 px-2 py-1 bg-[var(--c-emerald-bg)] border border-[var(--c-emerald-bd)] text-[var(--c-emerald)] hover:bg-[var(--c-emerald)] hover:text-white rounded transition-colors" title="Export เฉพาะคนที่ดูแล้ว">
                    <Download className="w-3 h-3" /> <span className="text-[9px] font-bold">EXPORT ACTIVE</span>
                 </button>

                 <button onClick={exportUserData} className="flex items-center gap-1.5 px-2 py-1 bg-[var(--bg-panel)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--c-blue)] hover:border-[var(--c-blue)] rounded transition-colors" title="Export Users Data to CSV">
                    <Download className="w-3 h-3" /> <span className="text-[9px] font-bold">EXPORT ALL</span>
                 </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[var(--bg-base)] border-b border-[var(--border-main)] sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-2 text-[9px] font-bold text-[var(--text-faint)] uppercase w-12 text-center">No.</th>
                    <th className="px-4 py-2 text-[9px] font-bold text-[var(--text-faint)] uppercase">Name</th>
                    <th className="px-4 py-2 text-[9px] font-bold text-[var(--text-faint)] uppercase">Department</th>
                    <th className="px-4 py-2 text-[9px] font-bold text-[var(--text-faint)] uppercase text-center">Topics Completed</th>
                    <th className="px-4 py-2 text-[9px] font-bold text-[var(--text-faint)] uppercase text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-main)]">
                  {allUserStats.map((u, i) => {
                    const isZero = u.count === 0;
                    return (
                    <tr key={i} className="hover:bg-[var(--bg-hover)] transition-colors group">
                      <td className="px-4 py-3 text-[10px] text-[var(--text-muted)] text-center font-mono">{i + 1}</td>
                      <td className="px-4 py-3 text-[11px] font-medium text-[var(--text-main)]">
                         {u.prefix ? u.prefix + ' ' : ''}{u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.name}
                         {u.email && u.email !== "-" && <span className="block text-[9px] text-[var(--text-faint)] mt-0.5">{u.email}</span>}
                      </td>
                      <td className="px-4 py-3 text-[9px] text-[var(--text-muted)] uppercase truncate max-w-[300px]" title={u.dept}>{u.dept}</td>
                      <td className={`px-4 py-3 text-[11px] text-center font-mono font-bold ${isZero ? 'text-[var(--c-red)]' : 'text-[var(--c-emerald)]'}`}>{u.count}</td>
                      <td className="px-4 py-3 text-center">
                         <span className={`inline-block px-1.5 py-0.5 text-[8px] rounded font-mono font-bold border ${isZero ? 'text-[var(--c-red)] bg-[var(--c-red-bg)] border-[var(--c-red-bd)]' : 'text-[var(--c-emerald)] bg-[var(--c-emerald-bg)] border-[var(--c-emerald-bd)]'}`}>
                           {isZero ? 'WAITING' : 'COMPLETED'}
                         </span>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Dept Chart Tab */}
        {activeTab === 'dept-chart' && (
          <div className="flex-1 flex flex-col overflow-hidden animate-[fadeInUp_0.4s_ease-out] p-4 bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-lg shadow-sm transition-colors duration-300">
            <div className="mb-4 flex-none"><h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-main)]">YIELD COMPARISON</h3></div>
            <div className="flex-1 relative min-h-0"><Bar data={comparisonChartData} options={{ indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { ticks: { font: { family: 'Prompt', size: 9 }, color: themeVars.textMuted }, grid: { display: false } } } }} /></div>
          </div>
        )}
      </main>

      {/* ✅ Notification Box */}
      <div className="px-4 pb-2 flex-none z-40">
        <div className="flex items-center justify-between gap-4 px-3 py-2 bg-[var(--c-amber-bg)] border border-[var(--c-amber-bd)] rounded-lg shadow-sm animate-[fadeInUp_0.3s_ease-out]">
            <div className="flex items-center gap-3">
              <div className="animate-pulse">
                 <AlertCircle className="w-4 h-4 flex-none text-[var(--c-amber)]" />
              </div>
              <span className="text-[10px] font-medium text-[var(--text-main)] uppercase tracking-widest">
                <span className="text-[var(--c-amber)] font-bold">SYSTEM NOTICE:</span> Next Market Update <span className="underline decoration-[var(--c-amber)]">16th</span>, <span className="underline decoration-[var(--c-amber)]">29th</span> 
                <span className="ml-3 inline-flex items-center gap-1 text-[var(--c-red)] border border-[var(--c-red-bd)] bg-[var(--bg-panel)] px-1.5 py-0.5 rounded font-mono shadow-sm">
                  <Phone className="w-3 h-3" /> URGENT: CONTACT HR
                </span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[var(--bg-panel)] border border-[var(--border-main)] rounded shadow-sm">
              <Hourglass className="w-3 h-3 text-[var(--text-faint)]" />
              <span className="text-[9px] font-mono font-bold text-[var(--text-muted)] uppercase">{getDaysToNextSync()}</span>
            </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex-none px-4 py-1.5 border-t border-[var(--border-main)] bg-[var(--bg-panel)] flex items-center justify-between gap-4 transition-colors duration-300">
          <div className="flex items-center gap-2 text-[var(--text-faint)]">
            <Info className="w-3 h-3" />
            <span className="text-[9px] font-mono uppercase tracking-widest">SERVER: G-SHEETS-V4 // SECURE CONNECTION</span>
          </div>

          {latestActivity.length > 0 && (
            <div className="flex items-center gap-3 flex-1 justify-end overflow-hidden">
               <span className="text-[9px] font-bold text-[var(--c-emerald)] uppercase flex items-center gap-1 flex-none animate-pulse">
                 <Activity className="w-3 h-3" /> LIVE TICKER:
               </span>
               <div className="flex gap-4 overflow-hidden">
                  {latestActivity.map((r, i) => (
                     <span key={i} className="text-[10px] text-[var(--text-main)] flex items-center gap-1.5 font-mono animate-[fadeInUp_0.5s_ease-out]" style={{ animationDelay: `${i*200}ms` }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--c-emerald)]"></span>
                        <span className="font-medium">{r.prefix ? r.prefix + ' ' : ''}{r.Name.substring(0, 15)}</span>
                        <span className="text-[9px] text-[var(--text-faint)]">[{r.CreatedDateTime.split('-').slice(1).join('/')}]</span>
                     </span>
                  ))}
               </div>
            </div>
          )}
      </footer>

      <DataModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} isSyncing={isSyncing} onCloudSync={handleCloudSync} onFileUpload={() => {}} onLoadDemo={() => {}} />
    </div>
  );
}