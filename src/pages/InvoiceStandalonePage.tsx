import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App as InvoiceApp } from '../../Invoice/src/App';
import '../../Invoice/src/index.css';
import '../../Invoice/src/App.css';
import { ArrowLeft } from 'lucide-react';

export const InvoiceStandalonePage: React.FC = () => {
  const navigate = useNavigate();
  const [isExiting, setIsExiting] = useState(false);

  // Return smoothly to the previous Setu workspace/dashboard
  const handleBackToSetu = () => {
    setIsExiting(true);
    setTimeout(() => {
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/admin/dashboard');
      }
    }, 200);
  };

  return (
    <div
      className={`relative min-h-screen w-full bg-[#f8fafc] overflow-x-hidden transition-all duration-200 ease-out ${
        isExiting
          ? 'opacity-0 scale-[0.99] pointer-events-none'
          : 'animate-in fade-in zoom-in-[0.99] duration-250 opacity-100 scale-100'
      }`}
    >
      {/* ========================================================================= */}
      {/* FIXED BACK TO SETU BUTTON (Top-Left)                                      */}
      {/* Always visible, professional dark aesthetic matching Deven Jha branding */}
      {/* Protected against printing / PDF exports via no-print class              */}
      {/* ========================================================================= */}
      <button
        type="button"
        onClick={handleBackToSetu}
        className="btn-back-to-setu-fixed no-print group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/95 hover:bg-black text-white shadow-lg hover:shadow-xl border border-slate-700/80 text-xs font-bold transition-all cursor-pointer select-none active:scale-95"
        title="Return to Deven Jha Productions Setu"
      >
        <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1 text-slate-300 group-hover:text-white" />
        <span>← Back to Setu</span>
      </button>

      {/* Independent Native Full-Screen Invoice Application */}
      <InvoiceApp onBackToSetu={handleBackToSetu} />
    </div>
  );
};

export default InvoiceStandalonePage;
