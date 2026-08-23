'use client';

import React from 'react';
import { PublicRoute } from '@/components/public-route';
import { ShieldAlert } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <PublicRoute>
      <div className="min-h-screen flex flex-col md:flex-row bg-slate-50/60">
        {/* Brand/Marketing Sidebar Panel (Visible on Desktop) */}
        <div className="hidden md:flex md:w-5/12 bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 text-white p-12 flex-col justify-between relative overflow-hidden shadow-2xl">
          <div className="flex items-center space-x-3 relative z-10">
            <div className="bg-white/15 p-2.5 rounded-2xl backdrop-blur-md border border-white/20 shadow-md">
              <svg
                className="w-7 h-7 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <div>
              <span className="text-2xl font-extrabold tracking-tight text-white block">Nisschay CMS</span>
              <span className="text-[10px] text-sky-200 uppercase font-bold tracking-widest block">Clinical Platform</span>
            </div>
          </div>

          <div className="space-y-6 relative z-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight">
              Simplified Clinic Operations & Digital Health Workspace.
            </h2>
            <p className="text-base text-sky-100/90 leading-relaxed font-medium">
              Designed for quick patient check-in, smooth EMR consultation recording, structured prescription writing, and financial analytics.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-bold text-sky-100/80 relative z-10 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/15 self-start">
            <ShieldAlert className="w-4 h-4 text-emerald-300" />
            <span>Compliant with Indian Healthcare Digital Standards</span>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xs border border-slate-200/80 p-8 sm:p-10">
            {/* Logo for mobile view */}
            <div className="flex md:hidden items-center justify-center space-x-2.5 mb-8">
              <div className="bg-sky-600 p-2 rounded-xl text-white shadow-xs">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
              <span className="text-xl font-extrabold text-slate-800 tracking-tight">Nisschay CMS</span>
            </div>
            {children}
          </div>
        </div>
      </div>
    </PublicRoute>
  );
}
