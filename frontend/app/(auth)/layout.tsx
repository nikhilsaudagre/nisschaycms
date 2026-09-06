'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { PublicRoute } from '@/components/public-route';
import { ClinicWorkspaceSvg } from '@/components/clinic-workspace-svg';
import {
  Stethoscope,
  Activity,
  BedDouble,
  Pill,
  Scissors,
  Receipt,
  Sparkles,
  Lock,
  CheckCircle2,
  Users,
  ShieldCheck
} from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isRegister = pathname?.includes('register-clinic');

  return (
    <PublicRoute>
      <div className="min-h-screen w-full flex flex-col md:flex-row overflow-x-hidden bg-[#F6F9FB]">
        {/* Left Side: Rich Nisschay Clinical Intelligence Showcase */}
        <div className="w-full md:w-[46%] lg:w-[48%] xl:w-[45%] bg-[#0A1A22] text-white p-6 sm:p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden shadow-2xl shrink-0">
          {/* Subtle Ambient Radial Glows */}
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-[#087F8C]/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-[#22A06B]/20 rounded-full blur-3xl pointer-events-none" />

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
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[#087F8C]/30 text-[#4FA8DB] border border-[#087F8C]/50 tracking-wider">
                  Live v1.0
                </span>
              </div>
              <span className="text-[11px] text-[#88A5B2] font-semibold tracking-wide block mt-0.5">
                Hospital & Practice Operating System
              </span>
            </div>
          </div>

          {/* Main Showcase Center */}
          <div className="space-y-4 relative z-10 my-4 max-w-lg w-full">
            {/* Tagline */}
            <div className="space-y-1.5">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-[11px] font-bold text-[#4FA8DB]">
                <Sparkles className="w-3.5 h-3.5 text-[#087F8C]" />
                <span>Next-Gen Healthcare Management</span>
              </div>
              <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-white leading-tight">
                One Unified Suite for <br />
                <span className="bg-gradient-to-r from-[#087F8C] via-[#4FA8DB] to-[#22A06B] bg-clip-text text-transparent">
                  OPD, IPD, OT & Pharmacy
                </span>
              </h2>
            </div>

            {/* SVG Vector Clinic Workspace Illustration */}
            <div className="py-1 px-2 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xs shadow-inner">
              <ClinicWorkspaceSvg className="w-full h-auto max-h-[190px] object-contain drop-shadow-md" />
            </div>

            {/* Core Features Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#087F8C]/20 border border-[#087F8C]/40 flex items-center justify-center text-[#4FA8DB] shrink-0">
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-white text-[11px]">Live OPD Queue</div>
                  <span className="text-[9.5px] text-white/50 block">Token Sync & TV Lounge</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#22A06B]/20 border border-[#22A06B]/40 flex items-center justify-center text-[#22A06B] shrink-0">
                  <BedDouble className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-white text-[11px]">IPD & 12h Tariff</div>
                  <span className="text-[9.5px] text-white/50 block">Auto Bed Stay & Rounds</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#4FA8DB]/20 border border-[#4FA8DB]/40 flex items-center justify-center text-[#4FA8DB] shrink-0">
                  <Pill className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-white text-[11px]">Smart Rx & Indent</div>
                  <span className="text-[9.5px] text-white/50 block">100% Stock Match & POS</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <Receipt className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-white text-[11px]">POS Ledger & Billing</div>
                  <span className="text-[9.5px] text-white/50 block">Split Invoicing & Dossier</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Security Badge */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10 text-[11px] text-white/60 relative z-10">
            <div className="flex items-center space-x-1.5 font-medium">
              <ShieldCheck className="w-4 h-4 text-[#22A06B]" />
              <span>Multi-Tenant Partitioning • HIPAA / DISHA Aligned</span>
            </div>
            <span className="text-[10px] font-mono text-white/40">99.99% Uptime</span>
          </div>
        </div>

        {/* Right Side: Form Viewport */}
        <div className="flex-1 min-h-full flex items-center justify-center p-4 sm:p-8 lg:p-12 bg-[#F6F9FB]">
          <div
            className={`w-full ${
              isRegister ? 'max-w-2xl' : 'max-w-lg'
            } bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-[#E8EEF2] p-6 sm:p-10 transition-all duration-200 my-auto`}
          >
            {/* Mobile Header Logo */}
            <div className="flex md:hidden items-center justify-center space-x-2.5 mb-6 pb-3 border-b border-[#E8EEF2]">
              <div className="w-9 h-9 rounded-xl bg-[#087F8C] text-white flex items-center justify-center shadow-xs">
                <Stethoscope className="w-5 h-5" />
              </div>
              <span className="text-xl font-black text-[#172B34] tracking-tight">Nisschay CMS</span>
            </div>

            {children}
          </div>
        </div>
      </div>
    </PublicRoute>
  );
}
