import { useState, useEffect, useCallback, useRef } from 'react';

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

export function useGoogleSheets() {
  const xlsxStatus = useScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
  useScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
  useScript('https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js');

  const [members, setMembers] = useState([]);
  const [records, setRecords] = useState([]);
  const [isSyncing, setIsSyncing] = useState(true);
  const [syncStatusText, setSyncStatusText] = useState("กำลังเตรียมดึงข้อมูล...");
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
    setSyncStatusText("กำลังซิงค์ข้อมูลล่าสุด...");

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