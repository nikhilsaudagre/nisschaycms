import React from 'react';
import { Stethoscope } from 'lucide-react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-50 z-50">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-sky-100"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-teal-600 animate-spin"></div>
          <Stethoscope className="w-6 h-6 text-teal-600" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Nisschay CMS</h1>
        <p className="text-xs text-slate-500 font-medium">Opening your clinic workspace...</p>
      </div>
    </div>
  );
};
