'use client';

import React, { useMemo } from 'react';
import { Sun, Sunset, Moon, Clock, Check, Lock } from 'lucide-react';

export interface TimeSlot {
  time24: string; // e.g. "09:00"
  time12: string; // e.g. "09:00 AM"
  category: 'MORNING' | 'AFTERNOON' | 'EVENING';
  isBooked?: boolean;
}

export interface BookedTimeRange {
  startTime: string; // "09:00" or "09:00:00"
  endTime?: string;   // "09:15" or "09:30:00"
}

interface TimeSlotGridProps {
  selectedTime: string; // "09:00"
  onSelectSlot: (startTime24: string, endTime24: string) => void;
  bookedTime24List?: string[]; // e.g. ["10:00", "14:15"]
  bookedRanges?: BookedTimeRange[];
  slotDurationMinutes?: number;
  morningStartTime?: string;
  morningEndTime?: string;
  eveningStartTime?: string;
  eveningEndTime?: string;
  isClosedToday?: boolean;
  closedReason?: string;
}

export const TimeSlotGrid: React.FC<TimeSlotGridProps> = ({
  selectedTime,
  onSelectSlot,
  bookedTime24List = [],
  bookedRanges = [],
  slotDurationMinutes = 15,
  morningStartTime,
  morningEndTime,
  eveningStartTime,
  eveningEndTime,
  isClosedToday = false,
  closedReason,
}) => {
  const duration = Math.max(5, Number(slotDurationMinutes) || 15);

  const calculateEndTime = (start24: string): string => {
    const [h, m] = start24.split(':').map(Number);
    const totalMinutes = h * 60 + m + duration;
    const endH = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const endM = String(totalMinutes % 60).padStart(2, '0');
    return `${endH}:${endM}`;
  };

  // Helper to check if a slot interval [slotStart, slotEnd) overlaps with any booked range
  const isSlotOccupied = (slotStart24: string): boolean => {
    // 1. Direct match with booked start times list
    if (bookedTime24List.includes(slotStart24)) {
      return true;
    }

    // 2. Overlap collision check with booked ranges
    if (bookedRanges && bookedRanges.length > 0) {
      const [sh, sm] = slotStart24.split(':').map(Number);
      const slotStartMins = sh * 60 + sm;
      const slotEndMins = slotStartMins + duration;

      return bookedRanges.some((range) => {
        if (!range.startTime) return false;
        const [rsh, rsm] = range.startTime.substring(0, 5).split(':').map(Number);
        const rangeStartMins = rsh * 60 + rsm;
        
        let rangeEndMins = rangeStartMins + duration;
        if (range.endTime) {
          const [reh, rem] = range.endTime.substring(0, 5).split(':').map(Number);
          const computedEnd = reh * 60 + rem;
          if (computedEnd > rangeStartMins) {
            rangeEndMins = computedEnd;
          }
        }

        // Two intervals [A_start, A_end) and [B_start, B_end) overlap if:
        // A_start < B_end && B_start < A_end
        return slotStartMins < rangeEndMins && rangeStartMins < slotEndMins;
      });
    }

    return false;
  };

  // Generate slots dynamically based on the clinic's real multi-session shifts
  const dynamicSlots = useMemo(() => {
    if (isClosedToday) return [];

    const result: TimeSlot[] = [];

    const timeToMins = (t: string | undefined, fallback: number): number => {
      if (!t) return fallback;
      const [h, m] = t.substring(0, 5).split(':').map(Number);
      return !isNaN(h) && !isNaN(m) ? h * 60 + m : fallback;
    };

    const mStartMins = timeToMins(morningStartTime, 540); // 09:00
    const mEndMins = timeToMins(morningEndTime, 780);    // 13:00
    const eStartMins = timeToMins(eveningStartTime, 1020); // 17:00
    const eEndMins = timeToMins(eveningEndTime, 1260);    // 21:00

    const generateRange = (
      startMinutes: number,
      endMinutes: number,
      category: 'MORNING' | 'AFTERNOON' | 'EVENING'
    ) => {
      for (let m = startMinutes; m < endMinutes; m += duration) {
        const h = Math.floor(m / 60);
        const mins = m % 60;
        const time24 = `${String(h).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        const time12 = `${String(h12).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${ampm}`;
        result.push({
          time24,
          time12,
          category,
        });
      }
    };

    // 1. Morning Shift
    if (mEndMins > mStartMins) {
      generateRange(mStartMins, mEndMins, 'MORNING');
    }

    // 2. Evening Shift
    if (eEndMins > eStartMins) {
      generateRange(eStartMins, eEndMins, 'EVENING');
    }

    return result;
  }, [duration, morningStartTime, morningEndTime, eveningStartTime, eveningEndTime, isClosedToday]);

  if (isClosedToday) {
    return (
      <div className="bg-[#D64545]/10 border border-[#D64545]/30 rounded-2xl p-6 text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-[#D64545]/10 border border-[#D64545]/20 flex items-center justify-center text-[#D64545] mx-auto shadow-2xs">
          <Lock className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-extrabold text-[#D64545]">Clinic Closed On Selected Date</h4>
        <p className="text-xs text-[#567781] font-medium max-w-md mx-auto">
          {closedReason || 'The clinic is closed on this date as per the operating schedule. No appointment slots are open for booking.'}
        </p>
      </div>
    );
  }

  const morningSlots = dynamicSlots.filter((s) => s.category === 'MORNING');
  const afternoonSlots = dynamicSlots.filter((s) => s.category === 'AFTERNOON');
  const eveningSlots = dynamicSlots.filter((s) => s.category === 'EVENING');

  const renderSlotCategory = (
    title: string,
    icon: React.ReactNode,
    slots: TimeSlot[],
    headerBadgeColor: string
  ) => (
    <div className="space-y-2.5">
      <div className="flex items-center space-x-2 text-xs font-bold text-[#172B34] uppercase tracking-wider">
        <span className={`p-1 rounded-md ${headerBadgeColor}`}>{icon}</span>
        <span>{title}</span>
        <span className="text-[10px] text-[#567781] font-medium">({slots.length} slots)</span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {slots.map((slot) => {
          const isBooked = isSlotOccupied(slot.time24);
          const isSelected = selectedTime === slot.time24 && !isBooked;

          return (
            <button
              key={slot.time24}
              type="button"
              disabled={isBooked}
              aria-disabled={isBooked}
              onClick={() => {
                if (isBooked) return;
                const endTime24 = calculateEndTime(slot.time24);
                onSelectSlot(slot.time24, endTime24);
              }}
              className={`h-11 px-2.5 rounded-xl text-xs font-bold font-mono transition-all flex flex-col items-center justify-center relative shadow-2xs border ${
                isBooked
                  ? 'bg-[#D64545]/5 text-[#D64545] border-[#D64545]/20 cursor-not-allowed pointer-events-none'
                  : isSelected
                  ? 'bg-[#087F8C] text-white border-[#087F8C] ring-2 ring-[#087F8C]/30 shadow-xs scale-[1.02] cursor-pointer'
                  : 'bg-white text-[#172B34] border-[#E8EEF2] hover:border-[#087F8C] hover:bg-[#F6F9FB] cursor-pointer'
              }`}
            >
              <div className="flex items-center space-x-1">
                {isSelected ? (
                  <Check className="w-3.5 h-3.5 text-white" />
                ) : isBooked ? (
                  <Lock className="w-3 h-3 text-[#D64545]" />
                ) : null}
                <span className={isBooked ? 'line-through text-[#D64545]' : ''}>
                  {slot.time12}
                </span>
              </div>
              {isBooked ? (
                <span className="text-[9px] font-sans no-underline font-extrabold text-[#D64545] uppercase tracking-tighter">
                  Booked
                </span>
              ) : isSelected ? (
                <span className="text-[9px] font-sans font-extrabold text-white/90 uppercase tracking-tighter">
                  Selected
                </span>
              ) : (
                <span className="text-[9px] font-sans font-medium text-[#567781] uppercase tracking-tighter">
                  Open
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-5 bg-[#F6F9FB] p-4 sm:p-5 rounded-2xl border border-[#E8EEF2]">
      <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-3 flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-[#087F8C]" />
          <h3 className="text-xs sm:text-sm font-bold text-[#172B34]">
            Select Consultation Slot
          </h3>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#087F8C]/10 text-[#087F8C] border border-[#087F8C]/20 shadow-2xs font-mono">
            ⏱️ {duration} Mins / Slot
          </span>
        </div>
        <div className="flex items-center space-x-3 text-[11px] font-bold">
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#087F8C]"></span>
            <span className="text-[#567781]">Selected</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-white border border-[#E8EEF2]"></span>
            <span className="text-[#567781]">Open</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D64545]"></span>
            <span className="text-[#D64545] font-bold">Booked</span>
          </div>
        </div>
      </div>

      {renderSlotCategory(
        'Morning Slots (09:00 AM - 12:30 PM)',
        <Sun className="w-3.5 h-3.5 text-[#E9A23B]" />,
        morningSlots,
        'bg-[#E9A23B]/10 text-[#E9A23B] border border-[#E9A23B]/20'
      )}

      {renderSlotCategory(
        'Afternoon Slots (12:30 PM - 04:30 PM)',
        <Sunset className="w-3.5 h-3.5 text-[#087F8C]" />,
        afternoonSlots,
        'bg-[#087F8C]/10 text-[#087F8C] border border-[#087F8C]/20'
      )}

      {renderSlotCategory(
        'Evening Slots (04:30 PM - 08:30 PM)',
        <Moon className="w-3.5 h-3.5 text-[#4FA8DB]" />,
        eveningSlots,
        'bg-[#4FA8DB]/10 text-[#4FA8DB] border border-[#4FA8DB]/20'
      )}
    </div>
  );
};
