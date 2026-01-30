import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function DetailTable({ data, currentPage, setCurrentPage, itemsPerPage }) {
  const maxPage = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const pageData = data.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden animate-[fadeInUp_0.4s_ease-out] flex-1">
      {/* Table Header / Pagination Control */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-none bg-white z-10">
        <div>
          <h3 className="text-sm font-bold uppercase text-slate-800">Learning Records</h3>
          <p className="text-[10px] text-slate-400 font-medium">Total {data.length} entries</p>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400">Page {currentPage} of {maxPage || 1}</span>
          <div className="flex gap-1">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-lg border hover:bg-slate-50 disabled:opacity-30"
            >
              <ChevronLeft className="w-3.5 h-3.5"/>
            </button>
            <button 
              onClick={() => setCurrentPage(p => Math.min(maxPage, p + 1))}
              disabled={currentPage === maxPage}
              className="p-1 rounded-lg border hover:bg-slate-50 disabled:opacity-30"
            >
              <ChevronRight className="w-3.5 h-3.5"/>
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Table Content */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-100">
            <tr>
              <th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase">Date</th>
              <th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase">Name</th>
              <th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase">Dept</th>
              <th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase">Topic</th>
            </tr>
          </thead>
          <tbody>
            {pageData.length > 0 ? (
              pageData.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50/50 border-b border-slate-50 transition-colors">
                  <td className="px-4 py-2 text-[10px] font-bold text-slate-600 whitespace-nowrap">{r.CreatedDateTime}</td>
                  <td className="px-4 py-2 text-[10px] font-bold text-slate-800">{r.Name}</td>
                  <td className="px-4 py-2 text-[10px] text-slate-500 truncate max-w-[150px]">{r.Department}</td>
                  <td className="px-4 py-2 text-[10px] text-slate-400 truncate max-w-[200px]">{r.Topic}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="px-4 py-10 text-center text-slate-400 font-bold">No records found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}