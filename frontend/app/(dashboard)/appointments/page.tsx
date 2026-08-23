'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import { Appointment, User, Doctor } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarSheetView } from '@/components/calendar-sheet-view';
import { DailyTimeSheetView } from '@/components/daily-time-sheet-view';
import { DoctorPrescriptionNotepadModal } from '@/components/prescription-notepad-modal';
import { Clinic, PrescriptionSettings } from '@/types';
import {
  Calendar,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  Tv,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Users,
  LayoutGrid,
  List,
  Search,
  Printer,
  FileText,
  X,
  Phone,
  UserCheck,
  Building,
  Activity,
  AlertTriangle
} from 'lucide-react';

export default function AppointmentsSchedulerPage() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'timesheet' | 'calendar' | 'list'>('timesheet');

  // Doctor Consultation & Rx Note Pad Modal state
  const [consultingAppt, setConsultingAppt] = useState<Appointment | null>(null);

  // Default doctor select for DOCTOR role
  useEffect(() => {
    if (user && user.role === 'DOCTOR' && !selectedDoctorId) {
      setSelectedDoctorId(user.id);
    }
  }, [user, selectedDoctorId]);

  // Fetch clinic details for branding
  const { data: clinic } = useQuery<Clinic>({
    queryKey: ['clinic-me'],
    queryFn: async () => {
      const response = await apiClient.get('/clinics/me');
      return response.data;
    },
  });

  // Fetch prescription settings
  const { data: prescriptionSettings } = useQuery<PrescriptionSettings>({
    queryKey: ['prescription-settings'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/prescription-settings/me');
        return response.data;
      } catch {
        return null;
      }
    },
  });

  // Fetch doctors list
  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ['doctors-list-scheduler'],
    queryFn: async () => {
      const response = await apiClient.get('/doctors');
      return response.data;
    },
  });

  // Fetch appointments list
  const { data: appointments = [], isLoading, isError, error } = useQuery<Appointment[]>({
    queryKey: ['appointments', selectedDate, selectedDoctorId],
    queryFn: async () => {
      const response = await apiClient.get('/appointments', {
        params: {
          date: selectedDate,
          doctorId: selectedDoctorId || undefined,
        },
      });
      return response.data;
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiClient.patch(`/appointments/${id}/status`, null, {
        params: { status },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  const handleSetToday = () => {
    setSelectedDate(getTodayString());
  };

  const formatTime = (timeString: string) => {
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

  const getInitials = (name?: string) => {
    if (!name) return 'PT';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Metrics
  const totalToday = appointments.length;
  const checkedInCount = appointments.filter(a => a.status === 'CHECKED_IN').length;
  const inConsultCount = appointments.filter(a => a.status === 'IN_CONSULTATION').length;
  const completedCount = appointments.filter(a => a.status === 'COMPLETED').length;

  // Filtered List for Table/List view
  const filteredAppointments = useMemo(() => {
    return appointments.filter(a => {
      if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const patientMatch = a.patientName?.toLowerCase().includes(q);
        const phoneMatch = a.patientPhone?.toLowerCase().includes(q);
        const doctorMatch = a.doctorName?.toLowerCase().includes(q);
        const reasonMatch = a.reason?.toLowerCase().includes(q);
        return patientMatch || phoneMatch || doctorMatch || reasonMatch;
      }
      return true;
    });
  }, [appointments, statusFilter, searchTerm]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
            Scheduled
          </span>
        );
      case 'CHECKED_IN':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800">
            Checked In
          </span>
        );
      case 'IN_CONSULTATION':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 animate-pulse">
            In Chamber
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
            Completed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400">
            {status}
          </span>
        );
    }
  };

  const formattedDateHeader = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. EXECUTIVE HEADER BANNER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2.5 bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 rounded-2xl border border-teal-100 dark:border-teal-800">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Appointment Scheduler & OPD Calendar
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Schedule patient visits, manage doctor chamber queues, and review consultation timelines.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Link href="/queue">
            <Button variant="outline" className="h-10 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl flex items-center gap-2">
              <Tv className="w-4 h-4 text-amber-500" />
              <span>Waiting Lounge TV</span>
            </Button>
          </Link>

          <Link href="/appointments/new">
            <Button className="h-10 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs px-5 rounded-xl shadow-xs cursor-pointer flex items-center gap-2 border-0">
              <Plus className="w-4 h-4" />
              <span>Book Appointment</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* STATS CARDS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Bookings</span>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{totalToday}</div>
          </div>
          <div className="w-11 h-11 bg-slate-50 dark:bg-slate-850 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Checked In Lounge</span>
            <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">{checkedInCount}</div>
          </div>
          <div className="w-11 h-11 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">In Chamber</span>
            <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{inConsultCount}</div>
          </div>
          <div className="w-11 h-11 bg-amber-50 dark:bg-amber-950/50 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Stethoscope className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Completed</span>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{completedCount}</div>
          </div>
          <div className="w-11 h-11 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. DATE & DOCTOR CONTROLS TOOLBAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Date navigation controls */}
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={handlePrevDay}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleSetToday}
                className="px-3 py-1 text-xs font-bold rounded-lg text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-colors"
              >
                Today
              </button>
              <button
                type="button"
                onClick={handleNextDay}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <Input
              type="date"
              className="h-10 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-700 w-38 shrink-0"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />

            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 hidden sm:inline-block">
              {formattedDateHeader}
            </span>
          </div>

          {/* Doctor Filter & View Mode Switcher */}
          <div className="flex flex-wrap items-center gap-3 justify-end">
            <div className="w-full sm:w-56 shrink-0">
              <select
                className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                disabled={user?.role === 'DOCTOR'}
              >
                <option value="">All Assigned Doctors</option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    Dr. {doc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('timesheet')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'timesheet'
                    ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Daily Sheet</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'calendar'
                    ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Month Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Detailed List</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CALENDAR / TIMESHEET / LIST CONTENT */}
      {viewMode === 'timesheet' && (
        <DailyTimeSheetView
          appointments={appointments}
          selectedDate={selectedDate}
          selectedDoctorId={selectedDoctorId}
          doctors={doctors}
          onSelectDate={(dateStr) => setSelectedDate(dateStr)}
          onSelectDoctor={(docId) => setSelectedDoctorId(docId)}
        />
      )}

      {viewMode === 'calendar' && (
        <CalendarSheetView
          selectedDate={selectedDate}
          onSelectDate={(newDate) => {
            setSelectedDate(newDate);
            setViewMode('timesheet');
          }}
          onQuickBookDate={(newDate) => {
            router.push(`/appointments/new?date=${newDate}`);
          }}
          appointments={appointments}
        />
      )}

      {viewMode === 'list' && (
        <div className="space-y-4">
          {/* List Search & Status Tabs */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search appointments by patient, mobile, doctor, reason..."
                className="pl-9.5 pr-8 h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-700"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0 overflow-x-auto w-full md:w-auto">
              {['ALL', 'SCHEDULED', 'CHECKED_IN', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  {st === 'ALL' ? 'All Visits' : st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* List Table */}
          {isLoading ? (
            <div className="p-16 text-center text-slate-500 font-medium bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs">
              <div className="w-9 h-9 border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-3"></div>
              <span className="text-xs font-semibold">Loading appointments list...</span>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Appointments Recorded</h3>
              <p className="text-slate-400 text-xs max-w-sm mx-auto">
                No consultations found for this date and filter selection.
              </p>
              <Link href="/appointments/new">
                <Button className="bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs rounded-xl shadow-2xs mt-2">
                  Book New Appointment
                </Button>
              </Link>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3.5 px-5">Time Slot</th>
                      <th className="py-3.5 px-5">Patient Details</th>
                      <th className="py-3.5 px-5">Attending Doctor</th>
                      <th className="py-3.5 px-5">Reason / Chief Complaint</th>
                      <th className="py-3.5 px-5">Status</th>
                      <th className="py-3.5 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredAppointments.map((appt: Appointment) => (
                      <tr key={appt.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-5 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {formatTime(appt.startTime)} - {formatTime(appt.endTime)}
                        </td>

                        <td className="py-3.5 px-5">
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                              {getInitials(appt.patientName)}
                            </div>
                            <div>
                              <Link
                                href={`/patients/${appt.patientId}`}
                                className="font-bold text-slate-900 dark:text-white hover:text-teal-600 transition-colors block text-sm"
                              >
                                {appt.patientName || 'Walk-in Patient'}
                              </Link>
                              <span className="font-mono text-slate-400 text-[11px]">{appt.patientPhone}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-5 font-semibold text-slate-800 dark:text-slate-200">
                          Dr. {appt.doctorName}
                        </td>

                        <td className="py-3.5 px-5 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                          {appt.reason || 'General Consultation'}
                        </td>

                        <td className="py-3.5 px-5 whitespace-nowrap">
                          {getStatusBadge(appt.status)}
                        </td>

                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Open Doctor Prescription Note Pad Button */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setConsultingAppt(appt)}
                              className="h-8 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/50 font-bold text-xs rounded-lg px-2.5 flex items-center gap-1"
                              title="Open Doctor Prescription Note Pad"
                            >
                              <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                              <span>Rx Pad</span>
                            </Button>

                            {appt.status === 'SCHEDULED' && (
                              <Button
                                size="sm"
                                onClick={() => updateStatusMutation.mutate({ id: appt.id, status: 'CHECKED_IN' })}
                                className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg px-2.5"
                              >
                                Check In
                              </Button>
                            )}

                            {appt.status === 'CHECKED_IN' && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  updateStatusMutation.mutate({ id: appt.id, status: 'IN_CONSULTATION' });
                                  setConsultingAppt(appt);
                                }}
                                className="h-8 bg-amber-600 hover:bg-amber-700 text-white text-xs rounded-lg px-2.5"
                              >
                                Start
                              </Button>
                            )}

                            {appt.status === 'IN_CONSULTATION' && (
                              <Button
                                size="sm"
                                onClick={() => setConsultingAppt(appt)}
                                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg px-2.5"
                              >
                                Consult
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DOCTOR CONSULTATION & PRESCRIPTION NOTE PAD MODAL */}
      {consultingAppt && (
        <DoctorPrescriptionNotepadModal
          isOpen={!!consultingAppt}
          onClose={() => setConsultingAppt(null)}
          appointment={consultingAppt}
          clinic={clinic}
          settings={prescriptionSettings}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            queryClient.invalidateQueries({ queryKey: ['queue-appointments'] });
          }}
        />
      )}
    </div>
  );
}
