'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { PublicRoute } from '@/components/public-route';
import {
  ShieldCheck,
  Stethoscope,
  Activity,
  BedDouble,
  Pill,
  Sparkles,
  Lock,
} from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isRegister = pathname?.includes('register-clinic');

  return (
    <PublicRoute>
      <div className="h-screen w-full flex flex-col md:flex-row overflow-hidden bg-[#F6F9FB]">
        {/* Left Side: Original Nisschay Clinical Intelligence Showcase */}
        <div className="hidden md:flex md:w-[42%] lg:w-[40%] xl:w-[38%] bg-[#0A1A22] text-white p-6 lg:p-10 flex-col justify-between relative overflow-hidden shadow-2xl shrink-0">
          {/* Subtle Ambient Radial Glows */}
          <div className="absolute -right-24 -top-24 w-80 h-80 bg-[#087F8C]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-24 -bottom-24 w-80 h-80 bg-[#22A06B]/15 rounded-full blur-3xl pointer-events-none" />

          {/* Header Brand */}
          <div className="flex items-center space-x-3 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#087F8C] to-[#0AA0B0] text-white flex items-center justify-center shadow-lg shadow-[#087F8C]/30 ring-1 ring-white/20 shrink-0">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-white block leading-tight">
                  Nisschay CMS
                </span>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#087F8C]/30 text-[#4FA8DB] border border-[#087F8C]/50 tracking-wider">
                  Live
                </span>
              </div>
              <span className="text-[10.5px] text-[#567781] font-semibold tracking-wide block mt-0.5">
                Hospital & Practice Operating System
              </span>
            </div>
          </div>

          {/* Central Showcase: Real Nisschay Live Micro-Widgets */}
          <div className="space-y-4 relative z-10 my-auto py-2 max-w-sm w-full">
            <div className="space-y-1.5">
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-[10.5px] font-bold text-[#4FA8DB]">
                <Sparkles className="w-3 h-3 text-[#087F8C]" />
                <span>Unified Clinical Workflow</span>
              </div>
              <h2 className="text-2xl lg:text-[26px] font-black tracking-tight text-white leading-tight">
                Empowering modern <br />
                <span className="bg-gradient-to-r from-[#087F8C] via-[#4FA8DB] to-[#22A06B] bg-clip-text text-transparent">
                  hospitals & practices
                </span>
              </h2>
            </div>

            {/* Live Interactive Platform Widgets */}
            <div className="space-y-2.5">
              {/* Widget 1: Live OPD Token */}
              <div className="p-3 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 shadow-xs flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#087F8C]/20 border border-[#087F8C]/40 flex items-center justify-center text-[#4FA8DB] shrink-0">
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Token #14</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#22A06B] animate-pulse" />
                      <span className="text-[10px] text-[#22A06B] font-semibold">In Consultation</span>
                    </div>
                    <span className="text-[10px] text-white/50">OPD Queue & TV Lounge Synced</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-white/90">
                  Room 01
                </span>
              </div>

              {/* Widget 2: IPD Bed & 12h Tariff Ledger */}
              <div className="p-3 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 shadow-xs flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#22A06B]/20 border border-[#22A06B]/40 flex items-center justify-center text-[#22A06B] shrink-0">
                    <BedDouble className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Deluxe Bed 108 • Active Stay</div>
                    <span className="text-[10px] text-white/50">Auto 12-Hour Tariff & Doctor Rounds</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#22A06B] px-2 py-0.5 rounded bg-[#22A06B]/20">
                  ₹0 Dues
                </span>
              </div>

              {/* Widget 3: Pharmacy Indent & Rx Notepad */}
              <div className="p-3 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 shadow-xs flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#4FA8DB]/20 border border-[#4FA8DB]/40 flex items-center justify-center text-[#4FA8DB] shrink-0">
                    <Pill className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Smart Digital Rx & Pharmacy Indent</div>
                    <span className="text-[10px] text-white/50">Instant Inventory Match & Billing</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#4FA8DB] px-2 py-0.5 rounded bg-[#4FA8DB]/20">
                  100% Stock
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Security Badge */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10 text-[11px] text-white/60 relative z-10">
            <div className="flex items-center space-x-1.5 font-medium">
              <Lock className="w-3.5 h-3.5 text-[#22A06B]" />
              <span>Isolated Multi-Tenant Security</span>
            </div>
            <span className="text-[10px] font-mono text-white/40">v1.0.0 Live</span>
          </div>
        </div>

        {/* Right Side: Form Viewport */}
        <div className="flex-1 h-full overflow-y-auto flex items-center justify-center p-4 sm:p-6 lg:p-8">
          <div
            className={`w-full ${
              isRegister ? 'max-w-2xl' : 'max-w-md'
            } bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-[#E8EEF2] p-6 sm:p-8 transition-all duration-200 my-auto`}
          >
            {/* Mobile Header Logo */}
            <div className="flex md:hidden items-center justify-center space-x-2.5 mb-5 pb-3 border-b border-[#E8EEF2]">
              <div className="w-8 h-8 rounded-lg bg-[#087F8C] text-white flex items-center justify-center shadow-xs">
                <Stethoscope className="w-4 h-4" />
              </div>
              <span className="text-lg font-black text-[#172B34] tracking-tight">Nisschay CMS</span>
            </div>

            {children}
          </div>
        </div>
      </div>
    </PublicRoute>
  );
}
