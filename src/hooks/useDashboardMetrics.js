import { useMemo } from 'react';

const formatShortName = (fullName) => {
  if (!fullName) return "-";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length > 1) {
    return `${parts[0]} ${parts[1].substring(0, 1)}.`; 
  }
  return fullName;
};

export function useDashboardMetrics(records, members, filters, themeVars, chartMode) {
  
  // 1. คำนวณข้อมูลหลัก (Filtered Records, Watchlist, Dept Stats)
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
    }))
    .filter(u => filters.search === '' || u.name.toLowerCase().includes(filters.search.toLowerCase()) || u.email.toLowerCase().includes(filters.search.toLowerCase()))
    .sort((a, b) => {
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

    return { filteredRecords: filtered, targetPool: pool, deptStats: sortedDeptStats, champion: sortedUsers[0] || null, earlyBird: earlyBirdObj, pendingList: pending, todayCount: todayRecs, latestActivity: latestRecs, allUserStats: rankedUsers };
  }, [records, members, filters]);

  // 2. คำนวณ Insights (Top Topics, Readiness Score, Trend Chart)
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
    
    return { topTopics, readinessScore, trendChart: { labels: sortedDates.map(d => d.split('-').slice(1).join('/')), datasets: [{ label: 'Volume', data: sortedDates.map(d => dailyTrend[d]), borderColor: themeVars.emerald, backgroundColor: themeVars.emeraldBg, fill: true, tension: 0.3, pointRadius: 2, pointBackgroundColor: themeVars.emerald }] } };
  }, [filteredRecords, targetPool, pendingList, themeVars]);

  // 3. คำนวณตัวเลือกแผนก
  const deptOptions = useMemo(() => {
    const rawDepts = [...members.map(m => m.dept), ...records.map(r => r.Department)];
    const thaiDeptsOnly = Array.from(new Set(rawDepts))
      .filter(d => d && /[ก-๙]/.test(d)) // กรองเอาเฉพาะชื่อที่มีตัวอักษรภาษาไทย
      .sort();
    return ["All", ...thaiDeptsOnly];
  }, [members, records]);

  // 4. ข้อมูลกราฟแท่ง
  const chartData = useMemo(() => {
    if (chartMode === 'user') { const counts = {}; filteredRecords.forEach(r => counts[r.Name] = (counts[r.Name] || 0) + 1); const top10 = Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10); return { labels: top10.map(u => formatShortName(u.name)), datasets: [{ label: 'Records', data: top10.map(u => u.count), backgroundColor: themeVars.blue, borderRadius: 4, barThickness: 10 }] }; } else { const topDepts = deptStats.slice(0, 8); return { labels: topDepts.map(d => d.name.length > 20 ? d.name.substring(0, 20) + '...' : d.name), datasets: [{ label: 'Completion %', data: topDepts.map(d => d.rate), backgroundColor: themeVars.emerald, borderRadius: 4, barThickness: 10 }] }; }
  }, [filteredRecords, deptStats, chartMode, themeVars]);

  // 5. ข้อมูลกราฟเปรียบเทียบแผนก
  const comparisonChartData = useMemo(() => { const top15 = deptStats.slice(0, 15); return { labels: top15.map(d => d.name.length > 30 ? d.name.substring(0, 30) + '...' : d.name), datasets: [{ label: 'Completion Rate (%)', data: top15.map(d => d.rate), backgroundColor: top15.map(d => d.rate >= 100 ? themeVars.emerald : (d.rate >= 50 ? themeVars.blue : themeVars.amber)), borderRadius: 4, barThickness: 12 }] }; }, [deptStats, themeVars]);

  return { filteredRecords, targetPool, deptStats, champion, earlyBird, pendingList, todayCount, latestActivity, allUserStats, insightsData, deptOptions, chartData, comparisonChartData };
}