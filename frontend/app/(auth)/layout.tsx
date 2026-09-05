'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { PublicRoute } from '@/components/public-route';
import { ShieldCheck, Stethoscope, Clock, Users, FileText, CheckCircle2, Sparkles } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isRegister = pathname?.includes('register-clinic');

  return (
    <PublicRoute>
      <div className="min-h-screen flex flex-col md:flex-row bg-[#F6F9FB]">
        {/* Left Side: Deep Navy + Clinical Teal Brand Panel (From Image Specification) */}
        <div className="hidden md:flex md:w-5/12 bg-[#0B2533] text-white p-10 lg:p-14 flex-col justify-between relative overflow-hidden shadow-2xl shrink-0">
          
          {/* Ambient luminous Teal and Soft Blue glowing accents */}
          <div className="absolute -right-16 -top-16 w-80 h-80 bg-[#087F8C]/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-80 h-80 bg-[#4FA8DB]/20 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand Logo */}
          <div className="flex items-center space-x-3.5 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-[#087F8C] text-white flex items-center justify-center shadow-lg">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-extrabold tracking-tight text-white block leading-none">Nisschay CMS</span>
              <span className="text-[11px] text-[#4FA8DB] uppercase font-bold tracking-widest block mt-1">Smart Healthcare System</span>
            </div>
          </div>

          {/* Central Showcase */}
          <div className="space-y-6 relative z-10 my-auto py-8 max-w-md">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-bold text-[#4FA8DB]">
              <Sparkles className="w-3.5 h-3.5 text-[#087F8C]" />
              <span>Practitioner Portal</span>
            </div>

            <div className="space-y-3">
              <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Modern clinical workflow, <br />
                <span className="text-[#4FA8DB]">built for healthcare.</span>
              </h2>
              <p className="text-sm text-[#E8EEF2]/80 leading-relaxed font-medium">
                Professional. Trustworthy. Calm. Live patient queues, 1-click prescription writing, and structured digital medical records.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="space-y-3 pt-2">
              {[
                { icon: Clock, title: 'Live Patient Queue & TV Lounge', desc: 'Manage token flow with 0 waiting chaos' },
                { icon: FileText, title: 'Smart 1-Click Prescriptions', desc: 'Auto diagnosis protocols & dosage fill' },
                { icon: Users, title: 'Secure Patient Medical Records', desc: 'Instant access to past visits and vitals' },
              ].map((item) => {
                const IconComponent = item.icon;
                return (
                  <div
                    key={item.title}
                    className="flex items-start space-x-3.5 p-3.5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-sm"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#087F8C]/30 border border-[#087F8C]/40 text-[#4FA8DB] flex items-center justify-center shrink-0 mt-0.5">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-white">{item.title}</h4>
                      <p className="text-[11px] text-[#E8EEF2]/75 font-medium">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Compliance Footer */}
          <div className="flex items-center space-x-2.5 text-xs font-semibold text-[#E8EEF2]/80 relative z-10 bg-white/5 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 self-start">
            <ShieldCheck className="w-4 h-4 text-[#22A06B]" />
            <span>Professional. Trustworthy. Calm. Built for Healthcare.</span>
          </div>
        </div>

        {/* Right Side: Form Panel on Cool White Background */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8 md:p-12 overflow-y-auto">
          <div className={`w-full ${isRegister ? 'max-w-xl' : 'max-w-md'} bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-[#E8EEF2] p-6 sm:p-10 transition-all duration-200`}>
            {/* Mobile Header Logo */}
            <div className="flex md:hidden items-center justify-center space-x-2.5 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#087F8C] text-white flex items-center justify-center shadow-md">
                <Stethoscope className="w-5 h-5" />
              </div>
              <span className="text-xl font-extrabold text-[#172B34] tracking-tight">Nisschay CMS</span>
            </div>

            {children}
          </div>
        </div>
      </div>
    </PublicRoute>
  );
}
