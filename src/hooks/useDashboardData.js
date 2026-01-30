import { useMemo } from 'react';
import { COLORS } from '../constants/dashboardConfig'; // เพิ่มบรรทัดนี้

export const useDashboardData = (records, members, filters) => {
  return useMemo(() => {
    // 1. Filter Records
    const filtered = records.filter(r => {
      if (!r.CreatedDateTime) return false;
      const dt = String(r.CreatedDateTime);
      const matchYear = dt.startsWith(filters.year);
      const matchMonth = filters.month === 'ALL' || dt.includes(`-${filters.month}-`);
      const matchDept = filters.dept === 'All' || r.Department === filters.dept;
      const matchSearch = filters.search === '' || r.Name.toLowerCase().includes(filters.search.toLowerCase());
      return matchYear && matchMonth && matchDept && matchSearch;
    });

    // 2. Process Members
    let effMembers = members;
    if (members.length === 0 && records.length > 0) {
      const uniqueMap = new Map();
      records.forEach(r => { if (!uniqueMap.has(r.Name)) uniqueMap.set(r.Name, { name: r.Name, dept: r.Department }); });
      effMembers = Array.from(uniqueMap.values());
    }

    const targetPool = effMembers.filter(m => filters.dept === 'All' || m.dept === filters.dept);
    const activeNames = new Set(filtered.map(r => r.Name));
    const pending = targetPool.filter(m => !activeNames.has(m.name));

    // 3. Department Stats
    const stats = {};
    effMembers.forEach(m => { 
        if (!stats[m.dept]) stats[m.dept] = { total: 0, active: 0 };
        stats[m.dept].total++; 
    });

    const activeInContext = new Set();
    filtered.forEach(r => {
        const user = effMembers.find(m => m.name === r.Name);
        if (user && !activeInContext.has(user.name)) {
            activeInContext.add(user.name);
            if (stats[user.dept]) stats[user.dept].active++;
        }
    });

    const sortedDeptStats = Object.entries(stats)
      .map(([name, s]) => ({ name, ...s, rate: s.total > 0 ? (s.active / s.total * 100) : 0 }))
      .sort((a, b) => b.rate - a.rate);

    // 4. Rankings
    const counts = {}; filtered.forEach(r => counts[r.Name] = (counts[r.Name] || 0) + 1);
    const sortedUsers = Object.entries(counts)
      .map(([name, count]) => ({ name, count, dept: effMembers.find(m => m.name === name)?.dept || 'N/A' }))
      .sort((a, b) => b.count - a.count);
    
    const sortedTime = [...filtered].sort((a, b) => new Date(a.CreatedDateTime) - new Date(b.CreatedDateTime));

    // 5. Chart Data (FIXED STRUCTURE)
    const userChartData = { 
        labels: sortedUsers.slice(0, 10).map(u => u.name), 
        datasets: [{
            label: 'Records',
            data: sortedUsers.slice(0, 10).map(u => u.count),
            backgroundColor: COLORS.red,
            borderRadius: 6,
            barThickness: 15
        }]
    };

    const deptChartData = {
        labels: sortedDeptStats.slice(0, 8).map(d => d.name),
        datasets: [{
            label: 'Completion %',
            data: sortedDeptStats.slice(0, 8).map(d => d.rate),
            backgroundColor: sortedDeptStats.slice(0, 8).map(d => d.rate >= 80 ? COLORS.emerald : (d.rate >= 50 ? COLORS.blue : COLORS.orange)),
            borderRadius: 6,
            barThickness: 15
        }]
    };

    return {
      filteredRecords: filtered,
      deptStats: sortedDeptStats,
      champion: sortedUsers[0] || null,
      earlyBird: sortedTime[0] || null,
      pendingList: pending,
      targetPool,
      userChartData,
      deptChartData
    };
  }, [records, members, filters]);
};