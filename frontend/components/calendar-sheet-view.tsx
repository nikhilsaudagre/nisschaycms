'use client';

import React, { useState } from 'react';
import { Appointment } from '@/types';
import { ChevronLeft, ChevronRight, Plus, Clock, User, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CalendarSheetViewProps {
  appointments: Appointment[];
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  onQuickBookDate: (dateStr: string) => void;
}

export const CalendarSheetView: React.FC<CalendarSheetViewProps> = ({
  appointments,
  selectedDate,
  onSelectDate,
  onQuickBookDate,
}) => {
  const [currentYear, setCurrentYear] = useState<number>(() => {
    const d = selectedDate ? new Date(selectedDate) : new Date();
    return d.getFullYear();
  });
  const [currentMonth, setCurrentMonth] = useState<number>(() => {
    const d = selectedDate ? new Date(selectedDate) : new Date();
    return d.getMonth(); // 0-indexed
  });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  // Generate matrix of days for currentMonth
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const calendarDays: Array<{
    dateStr: string;
    dayNum: number;
    isCurrentMonth: boolean;
    isToday: boolean;
  }> = [];

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Preceding month padding days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const prevDayNum = daysInPrevMonth - i;
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(prevDayNum).padStart(2, '0')}`;
    calendarDays.push({
      dateStr,
      dayNum: prevDayNum,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    calendarDays.push({
      dateStr,
      dayNum: day,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
    });
  }

  // Next month padding days to complete 35 or 42 grid cells
  const totalGridCells = calendarDays.length > 35 ? 42 : 35;
  const remainingCells = totalGridCells - calendarDays.length;
  for (let day = 1; day <= remainingCells; day++) {
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    calendarDays.push({
      dateStr,
      dayNum: day,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  // Map appointments to date strings for quick lookup
  const apptsByDate: Record<string, Appointment[]> = {};
  appointments.forEach((appt) => {
    const d = appt.appointmentDate;
    if (!apptsByDate[d]) {
      apptsByDate[d] = [];
    }
    apptsByDate[d].push(appt);
  });

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-5 shadow-xs space-y-4">
      {/* Month Navigation Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-extrabold text-slate-850 dark:text-slate-100 tracking-tight font-sans">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          <span className="text-xs font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 px-3 py-1 rounded-xl">
            Monthly Sheet View
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevMonth}
            className="h-9 w-9 rounded-xl border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setCurrentYear(today.getFullYear());
              setCurrentMonth(today.getMonth());
            }}
            className="h-9 px-3 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100"
          >
            Current Month
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextMonth}
            className="h-9 w-9 rounded-xl border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 7-Column Days of Week Header */}
      <div className="grid grid-cols-7 text-center border-b border-slate-200/80 dark:border-slate-800 pb-2">
        {daysOfWeek.map((day) => (
          <div key={day} className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* 7-Column Calendar Grid Sheet */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {calendarDays.map((cell, idx) => {
          const dayAppts = apptsByDate[cell.dateStr] || [];
          const isSelected = selectedDate === cell.dateStr;

          // Status dot counts
          const completedCount = dayAppts.filter((a) => a.status === 'COMPLETED').length;
          const scheduledCount = dayAppts.filter((a) => a.status === 'SCHEDULED' || a.status === 'CHECKED_IN').length;
          const inConsultCount = dayAppts.filter((a) => a.status === 'IN_CONSULTATION').length;

          return (
            <div
              key={idx}
              onClick={() => {
                onSelectDate(cell.dateStr);
              }}
              className={`min-h-[90px] sm:min-h-[105px] p-2 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between ${
                !cell.isCurrentMonth
                  ? 'bg-slate-50/40 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800/40 text-slate-300 dark:text-slate-700'
                  : isSelected
                  ? 'bg-teal-50/70 dark:bg-teal-950/40 border-teal-500 ring-2 ring-teal-500/40 shadow-sm'
                  : cell.isToday
                  ? 'bg-white dark:bg-slate-800 border-teal-400 shadow-2xs'
                  : 'bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800/80 hover:border-teal-400 hover:shadow-sm'
              }`}
            >
              {/* Day Header: Count Badge & Date Number */}
              <div className="flex items-center justify-between">
                {dayAppts.length > 0 ? (
                  <span className="bg-amber-500 text-white font-extrabold text-[10px] px-1.5 py-0.5 rounded-md font-mono shadow-2xs">
                    {String(dayAppts.length).padStart(2, '0')}
                  </span>
                ) : (
                  <span />
                )}
                <span
                  className={`text-xs font-mono font-bold ${
                    cell.isToday
                      ? 'w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center font-extrabold shadow-2xs'
                      : cell.isCurrentMonth
                      ? 'text-slate-800 dark:text-slate-200'
                      : 'text-slate-300 dark:text-slate-700'
                  }`}
                >
                  {cell.dayNum < 10 ? `0${cell.dayNum}` : cell.dayNum}
                </span>
              </div>

              {/* Status Indicator Dots */}
              <div className="flex items-center gap-1 flex-wrap my-1">
                {completedCount > 0 && (
                  <span
                    className="w-2 h-2 rounded-full bg-blue-500"
                    title={`${completedCount} Completed`}
                  />
                )}
                {inConsultCount > 0 && (
                  <span
                    className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"
                    title={`${inConsultCount} In Consult`}
                  />
                )}
                {scheduledCount > 0 && (
                  <span
                    className="w-2 h-2 rounded-full bg-amber-500"
                    title={`${scheduledCount} Scheduled/Checked-In`}
                  />
                )}
                {dayAppts.some((a) => a.type === 'EMERGENCY') && (
                  <span
                    className="w-2 h-2 rounded-full bg-rose-500"
                    title="Emergency Visit"
                  />
                )}
              </div>

              {/* Action Button: Quick Book On Date */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end pt-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickBookDate(cell.dateStr);
                  }}
                  className="bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-2xs flex items-center space-x-1"
                >
                  <Plus className="w-2.5 h-2.5" />
                  <span>Book</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
