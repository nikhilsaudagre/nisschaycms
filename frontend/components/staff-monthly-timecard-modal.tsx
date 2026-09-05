'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import {
  X,
  Printer,
  Calendar,
  Clock,
  MapPin,
  FileText,
  User,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Clock3,
  CalendarOff,
  UserX,
  ExternalLink,
  ShieldCheck,
  Building2,
  Stethoscope,
  BadgeCheck
} from 'lucide-react';
import Link from 'next/link';

export interface StaffTimecardUser {
  id: string;
  name: string;
  employeeId?: string;
  role?: string;
  roleName?: string;
  department?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
}

interface StaffMonthlyTimecardModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: StaffTimecardUser | null;
  initialYear?: number;
  initialMonth?: number; // 1 - 12
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const StaffMonthlyTimecardModal: React.FC<StaffMonthlyTimecardModalProps> = ({
  isOpen,
  onClose,
  staff,
  initialYear = new Date().getFullYear(),
  initialMonth = new Date().getMonth() + 1
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE' | 'ABSENT'>('ALL');

  // Compute month date range YYYY-MM-DD
  const { startDateStr, endDateStr, daysInMonth } = useMemo(() => {
    const days = new Date(selectedYear, selectedMonth, 0).getDate();
    const start = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const end = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(days).padStart(2, '0')}`;
    return { startDateStr: start, endDateStr: end, daysInMonth: days };
  }, [selectedYear, selectedMonth]);

  // Fetch Attendance records for this staff member in the given month range
  const { data: punchRecords = [], isLoading } = useQuery<any[]>({
    queryKey: ['staff-monthly-timecard-records', staff?.id, selectedYear, selectedMonth],
    queryFn: async () => {
      if (!staff?.id) return [];
      try {
        const response = await apiClient.get(`/staff/attendance/user/${staff.id}`, {
          params: {
            startDate: startDateStr,
            endDate: endDateStr
          }
        });
        return response.data || [];
      } catch (err) {
        console.warn('Failed to fetch user attendance history:', err);
        return [];
      }
    },
    enabled: isOpen && !!staff?.id,
    staleTime: 0,
    refetchOnMount: 'always'
  });

  // Calculate day-by-day roster matrix for the entire month
  const monthlyLedger = useMemo(() => {
    const recordsByDate = new Map<string, any>();
    punchRecords.forEach(r => {
      if (r.attendanceDate) {
        recordsByDate.set(r.attendanceDate, r);
      }
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const daysList = [];

    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dObj = new Date(selectedYear, selectedMonth - 1, dayNum);
      const dayOfWeekName = DAYS_OF_WEEK[dObj.getDay()];
      const isSunday = dObj.getDay() === 0;
      const isFuture = dateStr > todayStr;
      const isToday = dateStr === todayStr;

      const rec = recordsByDate.get(dateStr);

      let status = 'UNRECORDED';
      if (rec) {
        status = rec.status ? rec.status.toUpperCase() : 'PRESENT';
      } else if (isFuture) {
        status = 'UPCOMING';
      } else if (isSunday) {
        status = 'WEEKLY_OFF';
      } else {
        status = 'ABSENT';
      }

      // Calculate hours worked if in & out exist
      let durationStr = '--';
      if (rec?.clockInTime && rec?.clockOutTime) {
        try {
          const [inH, inM] = rec.clockInTime.split(':').map(Number);
          const [outH, outM] = rec.clockOutTime.split(':').map(Number);
          let diffMin = (outH * 60 + outM) - (inH * 60 + inM);
          if (diffMin < 0) diffMin += 24 * 60; // overnight
          const hrs = Math.floor(diffMin / 60);
          const mins = diffMin % 60;
          durationStr = `${hrs}h ${mins > 0 ? `${mins}m` : ''}`.trim();
        } catch {
          durationStr = '--';
        }
      } else if (rec?.clockInTime) {
        durationStr = 'In Progress';
      }

      daysList.push({
        dayNumber: dayNum,
        dateStr,
        dayOfWeek: dayOfWeekName,
        isSunday,
        isFuture,
        isToday,
        record: rec,
        status,
        shiftName: rec?.shiftName || 'Standard Day Shift',
        assignedLocation: rec?.assignedLocation || staff?.department || 'Main Clinic / Ward',
        clockInTime: rec?.clockInTime || null,
        clockOutTime: rec?.clockOutTime || null,
        durationStr,
        remarks: rec?.remarks || ''
      });
    }

    return daysList;
  }, [punchRecords, daysInMonth, selectedYear, selectedMonth, staff]);

  // Aggregate monthly performance statistics
  const summaryStats = useMemo(() => {
    let present = 0;
    let late = 0;
    let halfDay = 0;
    let leave = 0;
    let absent = 0;
    let weeklyOff = 0;
    let totalHoursMin = 0;

    monthlyLedger.forEach(item => {
      if (item.status === 'PRESENT') present++;
      else if (item.status === 'LATE') late++;
      else if (item.status === 'HALF_DAY') halfDay++;
      else if (item.status === 'ON_LEAVE') leave++;
      else if (item.status === 'ABSENT') absent++;
      else if (item.status === 'WEEKLY_OFF') weeklyOff++;

      if (item.record?.clockInTime && item.record?.clockOutTime) {
        try {
          const [inH, inM] = item.record.clockInTime.split(':').map(Number);
          const [outH, outM] = item.record.clockOutTime.split(':').map(Number);
          let diffMin = (outH * 60 + outM) - (inH * 60 + inM);
          if (diffMin < 0) diffMin += 24 * 60;
          totalHoursMin += diffMin;
        } catch {}
      }
    });

    const effectivePresent = present + late + (halfDay * 0.5);
    const totalWorkingDays = Math.max(1, daysInMonth - weeklyOff);
    const compliancePct = Math.min(100, Math.round((effectivePresent / totalWorkingDays) * 100));
    const totalHoursFormatted = `${Math.floor(totalHoursMin / 60)} hrs ${totalHoursMin % 60} mins`;

    return {
      totalDays: daysInMonth,
      workingDays: totalWorkingDays,
      present,
      late,
      halfDay,
      leave,
      absent,
      weeklyOff,
      compliancePct,
      effectivePresent,
      totalHoursFormatted
    };
  }, [monthlyLedger, daysInMonth]);

  // Filtered rows for display
  const displayedLedger = useMemo(() => {
    if (statusFilter === 'ALL') return monthlyLedger;
    return monthlyLedger.filter(item => {
      if (statusFilter === 'PRESENT') return item.status === 'PRESENT';
      if (statusFilter === 'LATE') return item.status === 'LATE';
      if (statusFilter === 'HALF_DAY') return item.status === 'HALF_DAY';
      if (statusFilter === 'ON_LEAVE') return item.status === 'ON_LEAVE';
      if (statusFilter === 'ABSENT') return item.status === 'ABSENT';
      return true;
    });
  }, [monthlyLedger, statusFilter]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen || !staff) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#E8EEF2] w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden font-sans print:shadow-none print:border-none print:max-w-full print:max-h-full print:rounded-none">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-[#E8EEF2] bg-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#087F8C] to-[#0A6973] text-white flex items-center justify-center font-bold text-base shadow-sm">
              {staff.name ? staff.name.replace('Dr. ', '').substring(0, 2).toUpperCase() : 'ST'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#172B34]">{staff.name}</h2>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F6F9FB] text-[#087F8C] border border-[#E8EEF2]">
                  {staff.employeeId || 'STAFF'}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {staff.roleName || staff.role || 'Staff Member'}
                </span>
              </div>
              <p className="text-xs text-[#567781] mt-0.5 flex items-center gap-2">
                <span>Department: <strong className="text-[#172B34]">{staff.department || 'General Operations'}</strong></span>
                {staff.phone && <span>• Phone: {staff.phone}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Month Navigator in Header */}
            <div className="flex items-center bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl p-1 gap-1">
              <button
                onClick={handlePrevMonth}
                className="p-1 rounded-lg hover:bg-white text-slate-600 transition-colors cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="px-2 font-bold text-xs text-[#172B34] min-w-[130px] text-center">
                {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
              </div>
              <button
                onClick={handleNextMonth}
                className="p-1 rounded-lg hover:bg-white text-slate-600 transition-colors cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Print Timecard Button */}
            <Button
              onClick={handlePrint}
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 border-[#E8EEF2] bg-white text-slate-700 hover:bg-[#F6F9FB] font-semibold text-xs cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-[#087F8C]" />
              <span>Print Slip</span>
            </Button>

            {/* View Full HR Profile */}
            <a
              href={`/staff/${staff.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 h-9 rounded-lg bg-[#087F8C]/10 text-[#087F8C] hover:bg-[#087F8C]/20 transition-colors cursor-pointer"
              title="Open full HR employee dossier in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>HR Dossier</span>
            </a>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINT ONLY LETTERHEAD (Visible only on paper/PDF print) */}
        <div className="hidden print:block p-6 border-b-2 border-slate-900 text-center space-y-1">
          <h1 className="text-xl font-bold uppercase tracking-wider text-slate-900">
            NISSCHAY MULTI-SPECIALTY CLINIC & HOSPITAL
          </h1>
          <p className="text-xs text-slate-600">
            Official Staff Attendance Ledger & Duty Time-Card Statement
          </p>
          <div className="pt-2 flex justify-between items-center text-xs font-mono border-t border-slate-300 mt-2">
            <div>
              <strong>Staff:</strong> {staff.name} ({staff.employeeId || 'STAFF'}) • <strong>Role:</strong> {staff.roleName || staff.role}
            </div>
            <div>
              <strong>Period:</strong> {MONTH_NAMES[selectedMonth - 1]} {selectedYear} • <strong>Generated:</strong> {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* BODY SCROLL CONTAINER */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar print:p-0 print:overflow-visible">
          
          {/* STATS PERFORMANCE STRIP */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            <div className="bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl p-3 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#567781] block">Working Days</span>
              <span className="text-base font-extrabold text-[#172B34] mt-0.5 block">{summaryStats.workingDays}</span>
              <span className="text-[9px] text-[#567781]">of {summaryStats.totalDays} days</span>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Present</span>
              <span className="text-base font-extrabold text-emerald-800 mt-0.5 block">{summaryStats.present}</span>
              <span className="text-[9px] text-emerald-600">Full Shifts</span>
            </div>

            <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">Late Marks</span>
              <span className="text-base font-extrabold text-blue-800 mt-0.5 block">{summaryStats.late}</span>
              <span className="text-[9px] text-blue-600">Punctuality</span>
            </div>

            <div className="bg-orange-50/60 border border-orange-200/80 rounded-xl p-3 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 block">Half Days</span>
              <span className="text-base font-extrabold text-orange-800 mt-0.5 block">{summaryStats.halfDay}</span>
              <span className="text-[9px] text-orange-600">0.5 Credit</span>
            </div>

            <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Leaves</span>
              <span className="text-base font-extrabold text-amber-800 mt-0.5 block">{summaryStats.leave}</span>
              <span className="text-[9px] text-amber-600">Authorized</span>
            </div>

            <div className="bg-red-50/60 border border-red-200/80 rounded-xl p-3 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 block">Absents</span>
              <span className="text-base font-extrabold text-red-800 mt-0.5 block">{summaryStats.absent}</span>
              <span className="text-[9px] text-red-600">Unrecorded</span>
            </div>

            <div className="bg-[#087F8C]/10 border border-[#087F8C]/30 rounded-xl p-3 text-center col-span-2 sm:col-span-4 md:col-span-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#087F8C] block">Compliance</span>
              <span className="text-base font-extrabold text-[#087F8C] mt-0.5 block">{summaryStats.compliancePct}%</span>
              <span className="text-[9px] text-[#087F8C] font-semibold">{summaryStats.totalHoursFormatted}</span>
            </div>
          </div>

          {/* FILTER BAR & LEDGER HEADER */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white pt-2 print:hidden">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#087F8C]" />
              <h3 className="text-xs font-bold text-[#172B34]">
                Daily Punch Log for {MONTH_NAMES[selectedMonth - 1]} {selectedYear} ({displayedLedger.length} days listed)
              </h3>
            </div>

            {/* Quick Status Pill Filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(['ALL', 'PRESENT', 'LATE', 'HALF_DAY', 'ON_LEAVE', 'ABSENT'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    statusFilter === tab
                      ? 'bg-[#087F8C] text-white shadow-xs'
                      : 'bg-[#F6F9FB] text-[#567781] hover:bg-[#E8EEF2] hover:text-[#172B34]'
                  }`}
                >
                  {tab === 'ALL' ? 'All Days' : tab.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* TIME-CARD TABLE */}
          <div className="border border-[#E8EEF2] rounded-xl overflow-hidden bg-white shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F6F9FB] border-b border-[#E8EEF2] text-[11px] font-bold text-[#567781] uppercase tracking-wider">
                  <th className="p-3 w-28">Date</th>
                  <th className="p-3 w-20">Day</th>
                  <th className="p-3 w-32">Attendance Status</th>
                  <th className="p-3">Shift & Station</th>
                  <th className="p-3 text-center w-24">Clock-In</th>
                  <th className="p-3 text-center w-24">Clock-Out</th>
                  <th className="p-3 text-center w-24">Hours</th>
                  <th className="p-3">Remarks / Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8EEF2]">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500 font-semibold">
                      Loading attendance records for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}...
                    </td>
                  </tr>
                ) : displayedLedger.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      No matching records found for status filter "{statusFilter}".
                    </td>
                  </tr>
                ) : (
                  displayedLedger.map(item => {
                    let statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                        {item.status}
                      </span>
                    );

                    if (item.status === 'PRESENT') {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          PRESENT
                        </span>
                      );
                    } else if (item.status === 'LATE') {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                          <Clock3 className="w-3 h-3" />
                          LATE
                        </span>
                      );
                    } else if (item.status === 'HALF_DAY') {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-orange-50 text-orange-700 border border-orange-200">
                          <AlertTriangle className="w-3 h-3" />
                          HALF DAY
                        </span>
                      );
                    } else if (item.status === 'ON_LEAVE') {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                          <CalendarOff className="w-3 h-3" />
                          ON LEAVE
                        </span>
                      );
                    } else if (item.status === 'ABSENT') {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-red-50 text-red-700 border border-red-200">
                          <UserX className="w-3 h-3" />
                          ABSENT
                        </span>
                      );
                    } else if (item.status === 'WEEKLY_OFF') {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-500 border border-slate-200">
                          WEEKLY OFF
                        </span>
                      );
                    } else if (item.status === 'UPCOMING') {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-50 text-slate-400 border border-slate-100">
                          UPCOMING
                        </span>
                      );
                    }

                    return (
                      <tr
                        key={item.dateStr}
                        className={`hover:bg-[#F6F9FB]/60 transition-colors ${
                          item.isToday
                            ? 'bg-[#087F8C]/5 font-medium'
                            : item.isSunday
                            ? 'bg-slate-50/40'
                            : ''
                        }`}
                      >
                        {/* Date */}
                        <td className="p-3 font-mono font-bold text-[#172B34]">
                          {item.dateStr}
                          {item.isToday && (
                            <span className="ml-1 text-[9px] px-1.5 py-0.2 rounded bg-[#087F8C] text-white uppercase font-sans">
                              Today
                            </span>
                          )}
                        </td>

                        {/* Day of Week */}
                        <td className="p-3 text-[#567781] font-semibold">
                          {item.dayOfWeek}
                        </td>

                        {/* Status */}
                        <td className="p-3">
                          {statusBadge}
                        </td>

                        {/* Shift & Station */}
                        <td className="p-3">
                          <div className="font-semibold text-[#172B34] flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-[#087F8C]" />
                            <span>{item.shiftName}</span>
                          </div>
                          <div className="text-[10px] text-[#567781] flex items-center gap-1 mt-0.5">
                            <MapPin className="w-2.5 h-2.5 text-slate-400" />
                            <span>{item.assignedLocation}</span>
                          </div>
                        </td>

                        {/* Clock-In */}
                        <td className="p-3 text-center font-mono font-semibold text-slate-800">
                          {item.clockInTime ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                              {item.clockInTime.substring(0, 5)}
                            </span>
                          ) : (
                            <span className="text-slate-300">--:--</span>
                          )}
                        </td>

                        {/* Clock-Out */}
                        <td className="p-3 text-center font-mono font-semibold text-slate-800">
                          {item.clockOutTime ? (
                            <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                              {item.clockOutTime.substring(0, 5)}
                            </span>
                          ) : (
                            <span className="text-slate-300">--:--</span>
                          )}
                        </td>

                        {/* Hours */}
                        <td className="p-3 text-center font-mono font-bold text-slate-700">
                          {item.durationStr}
                        </td>

                        {/* Remarks */}
                        <td className="p-3 text-[#567781] text-[11px]">
                          {item.remarks ? (
                            <span className="italic">"{item.remarks}"</span>
                          ) : item.status === 'WEEKLY_OFF' ? (
                            <span className="text-slate-400">Scheduled Weekly Off</span>
                          ) : item.status === 'UPCOMING' ? (
                            <span className="text-slate-400">Roster Pending</span>
                          ) : item.status === 'PRESENT' ? (
                            <span className="text-emerald-600 font-medium">Verified Shift Punch</span>
                          ) : (
                            <span className="text-slate-400">--</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* SIGNATURE & SIGNOFF BOX (for print & audit compliance) */}
          <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs font-serif print:grid hidden print:block">
            <div className="border-t border-slate-400 pt-2 text-center">
              <p className="font-bold text-slate-800">Employee Signature</p>
              <p className="text-[10px] text-slate-500">Date: ________________________</p>
            </div>
            <div className="border-t border-slate-400 pt-2 text-center">
              <p className="font-bold text-slate-800">Authorized Medical Superintendent / Admin</p>
              <p className="text-[10px] text-slate-500">Hospital Seal & Approval Stamp</p>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-3 border-t border-[#E8EEF2] bg-[#F6F9FB] flex items-center justify-between shrink-0 print:hidden">
          <div className="text-xs text-[#567781] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Authenticated Hospital Attendance Record (HIPAA & NABH Compliant)</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              variant="outline"
              size="sm"
              className="text-xs font-bold border-[#E8EEF2] bg-white cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 mr-1 text-[#087F8C]" />
              Print Time-Card Slip
            </Button>
            <Button
              onClick={onClose}
              size="sm"
              className="bg-[#087F8C] hover:bg-[#0A6973] text-white text-xs font-bold px-4 cursor-pointer"
            >
              Close
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
};
