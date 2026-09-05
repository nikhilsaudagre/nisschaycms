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
    refetchInterval: 2500,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
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
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#4FA8DB]/10 text-[#4FA8DB] border border-[#4FA8DB]/20 uppercase font-mono">
            Scheduled
          </span>
        );
      case 'CHECKED_IN':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#E9A23B]/10 text-[#E9A23B] border border-[#E9A23B]/20 uppercase font-mono">
            Waiting
          </span>
        );
      case 'IN_CONSULTATION':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#087F8C]/10 text-[#087F8C] border border-[#087F8C]/20 uppercase font-mono animate-pulse">
            With Doctor
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#22A06B]/10 text-[#22A06B] border border-[#22A06B]/20 uppercase font-mono">
            Finished
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#D64545]/10 text-[#D64545] border border-[#D64545]/20 uppercase font-mono">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#F6F9FB] text-[#567781] border border-[#E8EEF2] uppercase font-mono">
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
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. EXECUTIVE HEADER BANNER - Glass Transparent Island */}
      <div className="relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-5 sm:p-6 transition-all">
        {/* Subtle ambient luminous glows behind the glass */}
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-[#087F8C]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-10 w-48 h-48 bg-[#4FA8DB]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#172B34] tracking-tight">
              Appointments
            </h1>
            <p className="text-xs sm:text-sm font-medium text-[#567781] mt-1">
              View, schedule, and manage patient visits and doctor schedules.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link href="/appointments/new" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto bg-[#087F8C] hover:bg-[#076b77] text-white font-semibold rounded-xl shadow-md shadow-[#087F8C]/20 text-xs h-10 px-4.5 transition-all duration-200 active:scale-98 flex items-center justify-center gap-2 border-0 cursor-pointer">
                <Plus className="w-4 h-4 text-white" />
                <span>Book Appointment</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. EXECUTIVE METRICS ROW - iPad & Mobile Optimized */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4.5 min-w-0">
        {/* Total Booked */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-[#E8EEF2] p-4.5 sm:p-5.5 shadow-xs hover:border-[#087F8C]/40 hover:shadow-sm transition-all duration-200 group relative flex flex-col justify-between min-w-0 w-full overflow-hidden">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-xs font-semibold text-[#567781] truncate">
              Total Booked
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#087F8C]/10 text-[#087F8C] border border-[#087F8C]/20 flex items-center justify-center shrink-0 shadow-2xs">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2 sm:my-2.5">
            <div className="text-2xl sm:text-3xl lg:text-3.5xl font-extrabold text-[#172B34] tracking-tight leading-none truncate">
              {totalToday}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold mt-0.5 min-w-0">
            <Calendar className="w-3.5 h-3.5 text-[#087F8C] shrink-0" />
            <span className="text-[#087F8C] truncate">
              Scheduled for today
            </span>
          </div>
        </div>

        {/* Waiting in Clinic */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-[#E8EEF2] p-4.5 sm:p-5.5 shadow-xs hover:border-[#E9A23B]/40 hover:shadow-sm transition-all duration-200 group relative flex flex-col justify-between min-w-0 w-full overflow-hidden">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-xs font-semibold text-[#567781] truncate">
              Waiting in Clinic
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#E9A23B]/10 text-[#E9A23B] border border-[#E9A23B]/20 flex items-center justify-center shrink-0 shadow-2xs">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2 sm:my-2.5">
            <div className="text-2xl sm:text-3xl lg:text-3.5xl font-extrabold text-[#172B34] tracking-tight leading-none truncate">
              {checkedInCount}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold mt-0.5 min-w-0">
            <Clock className="w-3.5 h-3.5 text-[#E9A23B] shrink-0" />
            <span className="text-[#E9A23B] truncate">
              Checked in at desk
            </span>
          </div>
        </div>

        {/* With Doctor */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-[#E8EEF2] p-4.5 sm:p-5.5 shadow-xs hover:border-[#087F8C]/40 hover:shadow-sm transition-all duration-200 group relative flex flex-col justify-between min-w-0 w-full overflow-hidden">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-xs font-semibold text-[#567781] truncate">
              With Doctor
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#087F8C]/10 text-[#087F8C] border border-[#087F8C]/20 flex items-center justify-center shrink-0 shadow-2xs">
              <Stethoscope className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2 sm:my-2.5">
            <div className="text-2xl sm:text-3xl lg:text-3.5xl font-extrabold text-[#172B34] tracking-tight leading-none truncate">
              {inConsultCount}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold mt-0.5 min-w-0">
            <Stethoscope className="w-3.5 h-3.5 text-[#087F8C] shrink-0" />
            <span className="text-[#087F8C] truncate">
              In consultation room
            </span>
          </div>
        </div>

        {/* Finished */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-[#E8EEF2] p-4.5 sm:p-5.5 shadow-xs hover:border-[#22A06B]/40 hover:shadow-sm transition-all duration-200 group relative flex flex-col justify-between min-w-0 w-full overflow-hidden">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-xs font-semibold text-[#567781] truncate">
              Finished
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#22A06B]/10 text-[#22A06B] border border-[#22A06B]/20 flex items-center justify-center shrink-0 shadow-2xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2 sm:my-2.5">
            <div className="text-2xl sm:text-3xl lg:text-3.5xl font-extrabold text-[#172B34] tracking-tight leading-none truncate">
              {completedCount}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold mt-0.5 min-w-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#22A06B] shrink-0" />
            <span className="text-[#22A06B] truncate">
              Completed consultations
            </span>
          </div>
        </div>
      </div>

      {/* 3. DATE & DOCTOR CONTROLS TOOLBAR */}
      <div className="bg-white border border-[#E8EEF2] p-3.5 sm:p-4 rounded-2xl shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Date navigation controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex bg-[#F6F9FB] border border-[#E8EEF2] p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={handlePrevDay}
                className="p-1.5 rounded-lg text-[#567781] hover:text-[#172B34] hover:bg-white transition-colors cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleSetToday}
                className="px-3 py-1 text-xs font-bold rounded-lg text-[#172B34] hover:bg-white transition-colors cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={handleNextDay}
                className="p-1.5 rounded-lg text-[#567781] hover:text-[#172B34] hover:bg-white transition-colors cursor-pointer"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <Input
              type="date"
              className="h-10 text-xs font-semibold rounded-xl bg-[#F6F9FB] border-[#E8EEF2] text-[#172B34] w-38 shrink-0 focus:border-[#087F8C]"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />

            <span className="text-xs font-bold text-[#172B34] hidden sm:inline-block">
              {formattedDateHeader}
            </span>
          </div>

          {/* Doctor Filter & View Mode Switcher */}
          <div className="flex flex-wrap items-center gap-2.5 justify-end">
            <div className="w-full sm:w-56 shrink-0">
              <select
                className="w-full h-10 px-3 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] text-xs font-semibold text-[#172B34] focus:outline-none focus:border-[#087F8C] transition-colors"
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                disabled={user?.role === 'DOCTOR'}
              >
                <option value="">All Doctors</option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    Dr. {doc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex bg-[#F6F9FB] border border-[#E8EEF2] p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('timesheet')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'timesheet'
                    ? 'bg-[#087F8C] text-white shadow-2xs'
                    : 'text-[#567781] hover:text-[#172B34]'
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
                    ? 'bg-[#087F8C] text-white shadow-2xs'
                    : 'text-[#567781] hover:text-[#172B34]'
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
                    ? 'bg-[#087F8C] text-white shadow-2xs'
                    : 'text-[#567781] hover:text-[#172B34]'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>List View</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. CALENDAR / TIMESHEET / LIST CONTENT */}
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
          <div className="bg-white border border-[#E8EEF2] p-3.5 sm:p-4 rounded-2xl shadow-2xs flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-[#567781] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by patient, phone, doctor, or reason..."
                className="pl-9.5 pr-8 h-10 text-xs rounded-xl bg-[#F6F9FB] border-[#E8EEF2] text-[#172B34] placeholder-[#567781] focus:border-[#087F8C]"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#567781] hover:text-[#172B34] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex bg-[#F6F9FB] border border-[#E8EEF2] p-1 rounded-xl shrink-0 overflow-x-auto w-full md:w-auto custom-scrollbar">
              {['ALL', 'SCHEDULED', 'CHECKED_IN', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-[#087F8C] text-white shadow-2xs'
                      : 'text-[#567781] hover:text-[#172B34]'
                  }`}
                >
                  {st === 'ALL' ? 'All Visits' : st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* List Table */}
          {isLoading ? (
            <div className="p-16 text-center text-[#567781] bg-white border border-[#E8EEF2] rounded-2xl shadow-2xs">
              <div className="w-8 h-8 border-3 border-[#087F8C]/20 border-t-[#087F8C] rounded-full animate-spin mx-auto mb-3"></div>
              <span className="text-xs font-semibold">Loading appointments...</span>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="p-16 text-center bg-white rounded-2xl border border-[#E8EEF2] shadow-2xs space-y-3">
              <Calendar className="w-12 h-12 text-[#567781]/30 mx-auto" />
              <h3 className="text-sm sm:text-base font-bold text-[#172B34]">No Appointments Found</h3>
              <p className="text-[#567781] text-xs max-w-sm mx-auto">
                No consultations found for this date and filter selection.
              </p>
              <Link href="/appointments/new">
                <Button className="bg-[#087F8C] hover:bg-[#076b77] text-white font-semibold text-xs rounded-xl shadow-xs mt-2 px-4 h-9">
                  Book New Appointment
                </Button>
              </Link>
            </div>
          ) : (
            <div className="bg-white border border-[#E8EEF2] rounded-2xl shadow-2xs overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead className="bg-[#F6F9FB] border-b border-[#E8EEF2] text-[#567781] uppercase font-bold text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3.5 px-5 font-bold">Time Slot</th>
                      <th className="py-3.5 px-5 font-bold">Patient Details</th>
                      <th className="py-3.5 px-5 font-bold">Attending Doctor</th>
                      <th className="py-3.5 px-5 font-bold">Reason</th>
                      <th className="py-3.5 px-5 font-bold">Status</th>
                      <th className="py-3.5 px-5 text-right font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8EEF2] bg-white">
                    {filteredAppointments.map((appt: Appointment) => (
                      <tr key={appt.id} className="hover:bg-[#F6F9FB]/60 transition-colors">
                        <td className="py-3.5 px-5 font-mono font-bold text-[#172B34] whitespace-nowrap">
                          {formatTime(appt.startTime)} - {formatTime(appt.endTime)}
                        </td>

                        <td className="py-3.5 px-5">
                          <div className="flex items-center space-x-3">
                            <div className="w-8.5 h-8.5 rounded-xl bg-[#087F8C] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                              {getInitials(appt.patientName)}
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/patients/${appt.patientId}`}
                                className="font-bold text-[#172B34] hover:text-[#087F8C] transition-colors block text-xs sm:text-sm truncate"
                              >
                                {appt.patientName || 'Walk-in Patient'}
                              </Link>
                              <span className="font-mono text-[#567781] text-[11px] block">{appt.patientPhone}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-5 font-medium text-[#172B34]">
                          Dr. {appt.doctorName}
                        </td>

                        <td className="py-3.5 px-5 text-[#567781] font-medium max-w-xs truncate" title={appt.reason || ''}>
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
                              className="h-8 border-[#087F8C]/30 text-[#087F8C] hover:bg-[#087F8C]/10 font-bold text-xs rounded-lg px-2.5 flex items-center gap-1 cursor-pointer"
                              title="Open Doctor Prescription Note Pad"
                            >
                              <Stethoscope className="w-3.5 h-3.5 text-[#087F8C]" />
                              <span>Rx Pad</span>
                            </Button>

                            {appt.status === 'SCHEDULED' && (
                              <Button
                                size="sm"
                                onClick={() => updateStatusMutation.mutate({ id: appt.id, status: 'CHECKED_IN' })}
                                className="h-8 bg-[#087F8C] hover:bg-[#076b77] text-white text-xs font-bold rounded-lg px-2.5 cursor-pointer"
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
                                className="h-8 bg-[#E9A23B] hover:bg-[#d4902f] text-white text-xs font-bold rounded-lg px-2.5 cursor-pointer"
                              >
                                Start
                              </Button>
                            )}

                            {appt.status === 'IN_CONSULTATION' && (
                              <Button
                                size="sm"
                                onClick={() => setConsultingAppt(appt)}
                                className="h-8 bg-[#087F8C] hover:bg-[#076b77] text-white text-xs font-bold rounded-lg px-2.5 cursor-pointer"
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
