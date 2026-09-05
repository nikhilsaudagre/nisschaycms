'use client';

import React, { useState } from 'react';
import { Appointment } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Volume2,
  Stethoscope,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Activity,
  Heart,
  Thermometer,
  ChevronRight,
  MoreVertical,
  Check,
  UserCheck,
  Zap,
} from 'lucide-react';

interface QueueTokenCardProps {
  appointment: Appointment;
  tokenNumber: string;
  isCalling?: boolean;
  onUpdateStatus: (id: string, status: string) => void;
  onCallToken: (appointment: Appointment, tokenNumber: string) => void;
  onOpenConsultation?: (appointment: Appointment) => void;
}

export const QueueTokenCard: React.FC<QueueTokenCardProps> = ({
  appointment,
  tokenNumber,
  isCalling = false,
  onUpdateStatus,
  onCallToken,
  onOpenConsultation,
}) => {
  const [isAnnouncing, setIsAnnouncing] = useState(false);

  const getInitials = (name: string) => {
    if (!name) return 'P';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getAvatarColors = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return {
      bg: `hsl(${h}, 70%, 92%)`,
      text: `hsl(${h}, 85%, 26%)`,
      border: `hsl(${h}, 60%, 80%)`,
    };
  };

  const colors = getAvatarColors(appointment.patientName || 'Patient');

  const handleCallClick = () => {
    setIsAnnouncing(true);
    onCallToken(appointment, tokenNumber);
    setTimeout(() => setIsAnnouncing(false), 4000);
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return '';
    try {
      const parts = timeString.split(':');
      const hours = parseInt(parts[0], 10);
      const minutes = parts[1];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 || 12;
      return `${formattedHours}:${minutes} ${ampm}`;
    } catch {
      return timeString;
    }
  };

  const isEmergency = appointment.type === 'EMERGENCY';
  const isInConsultation = appointment.status === 'IN_CONSULTATION';
  const isCheckedIn = appointment.status === 'CHECKED_IN';
  const isCompleted = appointment.status === 'COMPLETED';

  // Card Border and Glow based on status & emergency
  const getCardStyle = () => {
    if (isEmergency && !isCompleted) {
      return 'border-[#D64545]/80 bg-gradient-to-br from-rose-50/90 via-white to-rose-50/30 shadow-lg shadow-rose-500/10 ring-2 ring-[#D64545]/40';
    }
    if (isInConsultation) {
      return 'border-[#087F8C] bg-gradient-to-br from-[#087F8C]/5 via-white to-[#087F8C]/5 shadow-md shadow-[#087F8C]/10 ring-1 ring-[#087F8C]/30';
    }
    if (isCalling || isAnnouncing) {
      return 'border-amber-500 bg-gradient-to-br from-amber-50 via-white to-amber-50/30 shadow-xl shadow-amber-500/20 ring-2 ring-amber-500 animate-pulse';
    }
    if (isCheckedIn) {
      return 'border-[#087F8C]/40 bg-white shadow-xs hover:border-[#087F8C] hover:shadow-sm';
    }
    if (isCompleted) {
      return 'border-[#E8EEF2] bg-[#F6F9FB]/70 opacity-75';
    }
    return 'border-[#E8EEF2] bg-white shadow-2xs hover:border-[#087F8C]/40 hover:shadow-xs';
  };

  return (
    <div
      className={`relative rounded-2xl border p-4 sm:p-5 transition-all duration-300 group overflow-hidden ${getCardStyle()}`}
    >
      {/* Background ambient glow for active consultation */}
      {isInConsultation && (
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#087F8C]/15 rounded-full blur-2xl pointer-events-none" />
      )}

      {/* Top Banner Row: Token Badge + Status Tag */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center space-x-2.5">
          {/* Token Pill */}
          <div
            className={`px-3 py-1.5 rounded-xl font-mono text-xs sm:text-sm font-black tracking-wider shadow-2xs border flex items-center space-x-1.5 ${
              isEmergency
                ? 'bg-[#D64545] text-white border-[#D64545] shadow-rose-900/30'
                : isInConsultation
                ? 'bg-[#087F8C] text-white border-[#087F8C] shadow-teal-900/30'
                : isCheckedIn
                ? 'bg-[#087F8C] text-white border-[#087F8C]'
                : 'bg-[#172B34] text-white border-[#172B34]'
            }`}
          >
            <span className="text-[10px] opacity-75 font-sans font-semibold">TOKEN</span>
            <span className="text-sm sm:text-base font-extrabold">{tokenNumber}</span>
          </div>

          {/* Emergency Pill */}
          {isEmergency && (
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-[#D64545] border border-rose-300 animate-bounce">
              <Zap className="w-3 h-3 text-[#D64545] fill-[#D64545]" />
              <span>Priority Triage</span>
            </span>
          )}
        </div>

        {/* Status Pill */}
        <div>
          {isInConsultation ? (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#087F8C]/10 text-[#087F8C] border border-[#087F8C]/30">
              <span className="w-2 h-2 rounded-full bg-[#087F8C] animate-ping" />
              <span>In Doctor Room</span>
            </span>
          ) : isCheckedIn ? (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#087F8C]/10 text-[#087F8C] border border-[#087F8C]/20">
              <Clock className="w-3.5 h-3.5" />
              <span>Waiting in Lounge</span>
            </span>
          ) : isCompleted ? (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#22A06B]/10 text-[#22A06B] border border-[#22A06B]/20">
              <Check className="w-3.5 h-3.5 text-[#22A06B]" />
              <span>Consultation Done</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20">
              <Clock className="w-3.5 h-3.5" />
              <span>Scheduled</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Content: Patient Details & Doctor Assignment */}
      <div className="flex items-start justify-between gap-3 mb-3.5">
        <div className="flex items-center space-x-3 min-w-0">
          {/* Avatar */}
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center font-extrabold text-sm shrink-0 border shadow-2xs"
            style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }}
          >
            {getInitials(appointment.patientName)}
          </div>

          {/* Details */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-sm sm:text-base font-extrabold text-[#172B34] truncate">
                {appointment.patientName}
              </h3>
              {appointment.type === 'EMERGENCY' ? (
                <span className="text-[10px] font-black uppercase tracking-wider text-[#D64545] bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                  Emergency
                </span>
              ) : appointment.type === 'FOLLOW_UP' ? (
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#087F8C] bg-[#087F8C]/10 px-2 py-0.5 rounded-md border border-[#087F8C]/20">
                  Follow Up
                </span>
              ) : appointment.startTime ? (
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#087F8C] bg-[#087F8C]/10 px-2 py-0.5 rounded-md border border-[#087F8C]/20">
                  Scheduled Appt
                </span>
              ) : (
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#4FA8DB] bg-[#4FA8DB]/10 px-2 py-0.5 rounded-md border border-[#4FA8DB]/20">
                  Direct Walk-In
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 text-xs text-[#567781] mt-0.5">
              <span className="font-medium">{appointment.patientPhone || 'No Phone'}</span>
              <span>•</span>
              <span className="font-semibold text-[#172B34]">
                {formatTime(appointment.startTime)}
              </span>
            </div>
          </div>
        </div>

        {/* Assigned Doctor Badge */}
        <div className="text-right shrink-0">
          <div className="text-[11px] font-medium text-[#567781]">Assigned Doctor</div>
          <div className="text-xs font-bold text-[#087F8C] flex items-center justify-end space-x-1">
            <Stethoscope className="w-3.5 h-3.5 text-[#087F8C]" />
            <span className="max-w-[120px] truncate">{appointment.doctorName || 'Doctor'}</span>
          </div>
        </div>
      </div>

      {/* Vitals & Complaint Bar (if available) */}
      {(appointment.reason || appointment.bpSystolic || appointment.pulse || appointment.temperature) && (
        <div className="mb-3.5 p-2.5 rounded-xl bg-[#F6F9FB] border border-[#E8EEF2] text-xs space-y-1.5">
          {appointment.reason && (
            <div className="text-[#172B34] font-medium truncate flex items-center space-x-1.5">
              <span className="text-[10px] uppercase font-bold text-[#567781] shrink-0">Complaint:</span>
              <span className="truncate italic">&quot;{appointment.reason}&quot;</span>
            </div>
          )}

          {(appointment.bpSystolic || appointment.pulse || appointment.temperature) && (
            <div className="flex flex-wrap items-center gap-2 text-[11px] pt-1 border-t border-[#E8EEF2]">
              {appointment.bpSystolic && (
                <span className="inline-flex items-center space-x-1 text-[#172B34] font-bold bg-white px-2 py-0.5 rounded border border-[#E8EEF2]">
                  <Activity className="w-3 h-3 text-[#D64545]" />
                  <span>BP {appointment.bpSystolic}/{appointment.bpDiastolic || '?'}</span>
                </span>
              )}
              {appointment.pulse && (
                <span className="inline-flex items-center space-x-1 text-[#172B34] font-bold bg-white px-2 py-0.5 rounded border border-[#E8EEF2]">
                  <Heart className="w-3 h-3 text-[#D64545]" />
                  <span>{appointment.pulse} bpm</span>
                </span>
              )}
              {appointment.temperature && (
                <span className="inline-flex items-center space-x-1 text-[#172B34] font-bold bg-white px-2 py-0.5 rounded border border-[#E8EEF2]">
                  <Thermometer className="w-3 h-3 text-amber-500" />
                  <span>{appointment.temperature}°F</span>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions Footer Bar */}
      <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[#E8EEF2]">
        {/* Left Side: Call Audio Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleCallClick}
          disabled={isCompleted}
          className={`h-9 px-3 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer ${
            isAnnouncing
              ? 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-400 animate-pulse'
              : 'hover:bg-amber-50 text-amber-800 border-amber-200'
          }`}
        >
          <Volume2 className={`w-4 h-4 ${isAnnouncing ? 'animate-bounce' : 'text-amber-600'}`} />
          <span>{isAnnouncing ? 'Calling...' : 'Call Token'}</span>
        </Button>

        {/* Right Side: Status Progression Buttons */}
        <div className="flex items-center space-x-1.5">
          {/* Open Rx Consultation Note Pad Button */}
          {onOpenConsultation && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenConsultation(appointment)}
              className="h-9 px-3 border-[#087F8C]/30 text-[#087F8C] bg-white hover:bg-[#087F8C]/10 font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1 cursor-pointer"
              title="Open Doctor Prescription Note Pad"
            >
              <Stethoscope className="w-3.5 h-3.5 text-[#087F8C]" />
              <span>Rx Pad</span>
            </Button>
          )}

          {!isCheckedIn && !isInConsultation && !isCompleted && (
            <Button
              size="sm"
              onClick={() => onUpdateStatus(appointment.id, 'CHECKED_IN')}
              className="h-9 px-3 bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs rounded-xl shadow-2xs cursor-pointer border-0"
            >
              <UserCheck className="w-3.5 h-3.5 mr-1" />
              <span>Check In</span>
            </Button>
          )}

          {isCheckedIn && !isInConsultation && (
            <Button
              size="sm"
              onClick={() => {
                onUpdateStatus(appointment.id, 'IN_CONSULTATION');
                if (onOpenConsultation) onOpenConsultation(appointment);
              }}
              className="h-9 px-3.5 bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer border-0"
            >
              <Stethoscope className="w-3.5 h-3.5 mr-1" />
              <span>Start Consult</span>
            </Button>
          )}

          {isInConsultation && (
            <Button
              size="sm"
              onClick={() => {
                if (onOpenConsultation) {
                  onOpenConsultation(appointment);
                } else {
                  onUpdateStatus(appointment.id, 'COMPLETED');
                }
              }}
              className="h-9 px-3.5 bg-[#22A06B] hover:bg-[#1e8d5e] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer border-0"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              <span>Complete Consult</span>
            </Button>
          )}

          {isCompleted && (
            <span className="text-xs font-semibold text-[#567781] italic px-2">Completed</span>
          )}
        </div>
      </div>
    </div>
  );
};
