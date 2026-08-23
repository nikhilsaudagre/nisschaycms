'use client';

import React, { useState, useEffect } from 'react';
import { Appointment } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Volume2,
  Tv,
  X,
  Stethoscope,
  Clock,
  Building2,
  Maximize2,
  Minimize2,
  Users,
  Zap,
  Sparkles,
  Activity,
} from 'lucide-react';

interface WaitingLoungeTvProps {
  appointments: Appointment[];
  activeCallingToken: string | null;
  activeCallingAppt: Appointment | null;
  onCloseTvMode: () => void;
}

export const WaitingLoungeTv: React.FC<WaitingLoungeTvProps> = ({
  appointments,
  activeCallingToken,
  activeCallingAppt,
  onCloseTvMode,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      );
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  // Group appointments into active / up next
  const currentlyServing = appointments.filter(
    (a) => a.status === 'IN_CONSULTATION'
  );
  const upNextQueue = appointments.filter(
    (a) => a.status === 'CHECKED_IN' || a.status === 'SCHEDULED'
  );

  // Derive token label helper
  const getTokenLabel = (appt: Appointment) => {
    const idx = appointments.findIndex((a) => a.id === appt.id);
    const num = idx >= 0 ? idx + 1 : 1;
    return `TK-${String(num).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      {/* Top TV Broadcast Header */}
      <header className="h-20 bg-slate-900/90 border-b border-slate-800/80 px-8 flex items-center justify-between shadow-2xl relative z-10 backdrop-blur-md">
        {/* Left Branding */}
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-teal-900/40 ring-1 ring-white/20">
            <Stethoscope className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none">
              NISSCHAY CLINICAL LOUNGE
            </h1>
            <p className="text-xs font-bold text-teal-400 uppercase tracking-widest mt-1 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping inline-block" />
              <span>LIVE QUEUE DISPLAY MONITOR</span>
            </p>
          </div>
        </div>

        {/* Center Announcer Indicator (if active) */}
        {activeCallingToken && (
          <div className="animate-pulse bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-slate-950 px-6 py-2 rounded-2xl shadow-xl flex items-center space-x-3 font-extrabold text-sm sm:text-base border border-amber-300">
            <Volume2 className="w-6 h-6 animate-bounce" />
            <span>
              NOW CALLING TOKEN {activeCallingToken} — {activeCallingAppt?.patientName}
            </span>
          </div>
        )}

        {/* Right Time & Control Actions */}
        <div className="flex items-center space-x-6">
          {/* Digital Clock */}
          <div className="text-right">
            <div className="font-mono text-2xl font-black text-white tracking-wider leading-none">
              {currentTime || '10:00 AM'}
            </div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
              {currentDate}
            </div>
          </div>

          <div className="flex items-center space-x-2 border-l border-slate-800 pl-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="h-10 w-10 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onCloseTvMode}
              className="h-10 w-10 text-slate-400 hover:text-white hover:bg-rose-950/60 hover:text-rose-400 rounded-xl"
              title="Exit TV Lounge Mode"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* TV Screen Main Grid Layout */}
      <main className="flex-1 p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-hidden">
        {/* Left Column: Big "NOW SERVING" Stage Hero (7 cols) */}
        <section className="lg:col-span-7 flex flex-col space-y-6 min-h-0">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-widest text-emerald-400 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>NOW INSIDE DOCTOR CHAMBERS</span>
            </h2>
            <span className="text-xs font-bold text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
              {currentlyServing.length} Active Consultations
            </span>
          </div>

          {currentlyServing.length > 0 ? (
            <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              {currentlyServing.map((appt) => {
                const token = getTokenLabel(appt);
                return (
                  <div
                    key={appt.id}
                    className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/30 border-2 border-emerald-500/50 shadow-2xl shadow-emerald-950/50 flex flex-col justify-between overflow-hidden group"
                  >
                    {/* Ambient Glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="flex items-start justify-between gap-4 relative z-10">
                      <div>
                        {/* Token Pill Header */}
                        <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl bg-emerald-500 text-slate-950 font-mono font-black text-xl sm:text-2xl shadow-lg shadow-emerald-950">
                          <span className="text-xs font-sans font-bold opacity-80 uppercase">TOKEN</span>
                          <span>{token}</span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-3">
                          {appt.patientName}
                        </h3>
                      </div>

                      <div className="text-right">
                        <span className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold bg-emerald-950 text-emerald-300 border border-emerald-800">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                          <span>In Session</span>
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between relative z-10">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-950 border border-teal-800 flex items-center justify-center text-teal-400">
                          <Stethoscope className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-400 uppercase">Consulting Doctor</div>
                          <div className="text-base font-extrabold text-teal-300">
                            {appt.doctorName || 'Dr. Practitioner'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                        <Building2 className="w-5 h-5 text-emerald-400" />
                        <span className="text-sm font-extrabold text-white">Chamber 1</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 rounded-3xl bg-slate-900/50 border border-dashed border-slate-800 p-8 flex flex-col items-center justify-center text-center">
              <Activity className="w-12 h-12 text-slate-700 mb-3" />
              <h3 className="text-lg font-bold text-slate-300">No Doctor Consultations Active</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Token announcements will highlight here as doctors call patients into their consultation rooms.
              </p>
            </div>
          )}
        </section>

        {/* Right Column: "UP NEXT" Upcoming Queue (5 cols) */}
        <section className="lg:col-span-5 flex flex-col space-y-6 min-h-0 bg-slate-900/60 p-6 rounded-3xl border border-slate-800/80 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-widest text-teal-400 flex items-center space-x-2">
              <Users className="w-4 h-4 text-teal-400" />
              <span>UP NEXT IN WAITING LOUNGE</span>
            </h2>
            <span className="text-xs font-bold text-slate-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
              {upNextQueue.length} Waiting
            </span>
          </div>

          {upNextQueue.length > 0 ? (
            <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
              {upNextQueue.map((appt, i) => {
                const token = getTokenLabel(appt);
                const isNext = i === 0;
                return (
                  <div
                    key={appt.id}
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isNext
                        ? 'bg-gradient-to-r from-teal-950/80 to-slate-900 border-teal-500/60 ring-1 ring-teal-500/30'
                        : 'bg-slate-900/90 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5 min-w-0">
                      {/* Token Pill */}
                      <div
                        className={`px-3 py-1.5 rounded-xl font-mono text-sm sm:text-base font-black shrink-0 ${
                          isNext
                            ? 'bg-teal-400 text-slate-950 shadow-md shadow-teal-950'
                            : 'bg-slate-800 text-white border border-slate-700'
                        }`}
                      >
                        {token}
                      </div>

                      {/* Name */}
                      <div className="min-w-0">
                        <div className="text-sm sm:text-base font-extrabold text-white truncate">
                          {appt.patientName}
                        </div>
                        <div className="text-xs text-slate-400 truncate mt-0.5">
                          Assigned: <span className="text-teal-300 font-semibold">{appt.doctorName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0 text-right">
                      {isNext ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-teal-950 text-teal-300 border border-teal-800 animate-pulse">
                          <Zap className="w-3 h-3 text-teal-400 fill-teal-400" />
                          <span>UP NEXT</span>
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-500">
                          ~{(i + 1) * 12} mins
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 rounded-2xl bg-slate-950/50 border border-dashed border-slate-800/80 p-6 flex flex-col items-center justify-center text-center">
              <Clock className="w-10 h-10 text-slate-700 mb-2" />
              <h3 className="text-sm font-bold text-slate-400">Waiting Lounge Queue is Clear</h3>
              <p className="text-xs text-slate-500 mt-1">All checked-in patients have been served.</p>
            </div>
          )}

          {/* Bottom Broadcast Ticker */}
          <div className="pt-3 border-t border-slate-800/80 text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span className="truncate">📢 Please keep your token receipt ready when your number is called.</span>
            <span className="text-teal-400 font-bold shrink-0">Nisschay CMS</span>
          </div>
        </section>
      </main>
    </div>
  );
};
