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
}

export const TimeSlotGrid: React.FC<TimeSlotGridProps> = ({
  selectedTime,
  onSelectSlot,
  bookedTime24List = [],
  bookedRanges = [],
  slotDurationMinutes = 15,
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

  // Generate slots dynamically based on the doctor's custom slot duration
  const dynamicSlots = useMemo(() => {
    const result: TimeSlot[] = [];

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

    // Morning: 09:00 AM (540 mins) to 12:30 PM (750 mins)
    generateRange(540, 750, 'MORNING');

    // Afternoon: 12:30 PM (750 mins) to 04:30 PM (990 mins)
    generateRange(750, 990, 'AFTERNOON');

    // Evening: 04:30 PM (990 mins) to 08:30 PM (1230 mins)
    generateRange(990, 1230, 'EVENING');

    return result;
  }, [duration]);

  const morningSlots = dynamicSlots.filter((s) => s.category === 'MORNING');
  const afternoonSlots = dynamicSlots.filter((s) => s.category === 'AFTERNOON');
  const eveningSlots = dynamicSlots.filter((s) => s.category === 'EVENING');

  const renderSlotCategory = (
    title: string,
    icon: React.ReactNode,
    slots: TimeSlot[],
    headerBadgeColor: string
  ) => (
    <div className="space-y-3">
      <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
        <span className={`p-1 rounded-md ${headerBadgeColor}`}>{icon}</span>
        <span>{title}</span>
        <span className="text-[10px] text-slate-400 font-medium">({slots.length} slots)</span>
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
                  ? 'bg-rose-50/60 dark:bg-rose-950/20 text-rose-400 dark:text-rose-500/70 border-rose-200/60 dark:border-rose-900/40 cursor-not-allowed pointer-events-none opacity-80'
                  : isSelected
                  ? 'bg-teal-600 text-white border-teal-600 ring-2 ring-teal-400/50 shadow-md scale-[1.02] cursor-pointer'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-teal-500 hover:bg-teal-50/50 dark:hover:bg-teal-950/30 cursor-pointer'
              }`}
            >
              <div className="flex items-center space-x-1">
                {isSelected ? (
                  <Check className="w-3.5 h-3.5 text-white" />
                ) : isBooked ? (
                  <Lock className="w-3 h-3 text-rose-400 dark:text-rose-500" />
                ) : null}
                <span className={isBooked ? 'line-through text-rose-500/80 dark:text-rose-400/80' : ''}>
                  {slot.time12}
                </span>
              </div>
              {isBooked ? (
                <span className="text-[9px] font-sans no-underline font-extrabold text-rose-600 dark:text-rose-400 uppercase tracking-tighter">
                  Booked
                </span>
              ) : isSelected ? (
                <span className="text-[9px] font-sans font-extrabold text-teal-100 uppercase tracking-tighter">
                  Selected
                </span>
              ) : (
                <span className="text-[9px] font-sans font-medium text-slate-400 uppercase tracking-tighter">
                  Available
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 bg-slate-50/80 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
      <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-3 flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 font-sans">
            Interactive Timing Sheet Grid
          </h3>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 shadow-2xs">
            ⏱️ {duration} Mins / Slot
          </span>
        </div>
        <div className="flex items-center space-x-3 text-[11px] font-bold">
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
            <span className="text-slate-600 dark:text-slate-300">Selected</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-300"></span>
            <span className="text-slate-600 dark:text-slate-300">Open</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span className="text-rose-600 dark:text-rose-400 font-bold">Booked</span>
          </div>
        </div>
      </div>

      {renderSlotCategory(
        'Morning Slots (09:00 AM - 12:30 PM)',
        <Sun className="w-3.5 h-3.5 text-amber-500" />,
        morningSlots,
        'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400'
      )}

      {renderSlotCategory(
        'Afternoon Slots (12:30 PM - 04:30 PM)',
        <Sunset className="w-3.5 h-3.5 text-orange-500" />,
        afternoonSlots,
        'bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400'
      )}

      {renderSlotCategory(
        'Evening Slots (04:30 PM - 08:30 PM)',
        <Moon className="w-3.5 h-3.5 text-indigo-500" />,
        eveningSlots,
        'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400'
      )}
    </div>
  );
};
