import React from 'react';
import { X, CloudLightning, Loader2, Users, FileSpreadsheet, PlayCircle } from 'lucide-react';

// ✅ แก้ไขตรงนี้: ชี้ไปที่โฟลเดอร์ components/ui ตามรูปที่คุณจัด
import { Button } from './components/ui/button.jsx'; 

export const DataModal = ({ isOpen, onClose, isSyncing, onCloudSync, onFileUpload, onLoadDemo }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white w-full max-w-sm border border-slate-200 shadow-xl p-6 relative rounded-3xl animate-fade-in-up" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-lg font-black text-slate-800 uppercase italic">Data Hub</h3>
            <p className="text-[10px] text-slate-400 font-bold">Manage your data sources</p>
          </div>
          <Button variant="ghost" className="w-8 h-8 p-0" onClick={onClose} icon={X} />
        </div>

        {/* Cloud Sync Button */}
        <Button 
          variant="success" 
          className="w-full mb-6 py-3" 
          onClick={() => onCloudSync(false)} 
          disabled={isSyncing}
          icon={isSyncing ? Loader2 : CloudLightning}
        >
          {isSyncing ? "SYNCING..." : "SYNC FROM GOOGLE"}
        </Button>

        {/* File Upload Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div 
            onClick={() => document.getElementById('file-members').click()} 
            className="bg-slate-50 p-4 border-2 border-dashed border-slate-100 hover:border-emerald-400 hover:bg-emerald-50 cursor-pointer text-center rounded-2xl transition-all group"
          >
            <Users className="w-6 h-6 mx-auto text-slate-300 group-hover:text-emerald-500 mb-2"/>
            <p className="text-[10px] font-black text-slate-600 uppercase">Members</p>
            <input 
              type="file" 
              id="file-members" 
              className="hidden" 
              accept=".xlsx,.csv" 
              onChange={(e) => onFileUpload(e, 'members')} 
            />
          </div>

          <div 
            onClick={() => document.getElementById('file-records').click()} 
            className="bg-slate-50 p-4 border-2 border-dashed border-slate-100 hover:border-emerald-400 hover:bg-emerald-50 cursor-pointer text-center rounded-2xl transition-all group"
          >
            <FileSpreadsheet className="w-6 h-6 mx-auto text-slate-300 group-hover:text-emerald-500 mb-2"/>
            <p className="text-[10px] font-black text-slate-600 uppercase">Records</p>
            <input 
              type="file" 
              id="file-records" 
              className="hidden" 
              accept=".xlsx,.csv" 
              onChange={(e) => onFileUpload(e, 'records')} 
            />
          </div>
        </div>

        {/* Demo Data Option */}
        <div className="text-center">
          <button 
            onClick={onLoadDemo} 
            className="text-[10px] font-bold text-slate-300 hover:text-slate-500 uppercase tracking-widest flex items-center justify-center gap-2 mx-auto transition-colors"
          >
            <PlayCircle className="w-3 h-3" /> Load Demo Data
          </button>
        </div>
      </div>
    </div>
  );
};