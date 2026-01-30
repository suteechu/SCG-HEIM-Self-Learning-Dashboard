import React from 'react';

export const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 ${className}`}>
    {children}
  </div>
);