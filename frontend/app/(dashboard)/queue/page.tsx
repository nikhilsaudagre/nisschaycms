'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import { Appointment, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QueueTokenCard } from '@/components/queue-token-card';
import { WaitingLoungeTv } from '@/components/waiting-lounge-tv';
import { DoctorPrescriptionNotepadModal } from '@/components/prescription-notepad-modal';
import { Clinic, Doctor, PrescriptionSettings } from '@/types';
import {
  Users2,
  Clock,
  Tv,
  Plus,
  Search,
  Stethoscope,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Activity,
  ChevronLeft,
  ChevronRight,
  Volume2,
  RefreshCw,
  UserCheck,
  X,
  ShieldAlert
} from 'lucide-react';

export default function QueueManagementPage() {
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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isTvMode, setIsTvMode] = useState<boolean>(false);
  const [queueSortOrder, setQueueSortOrder] = useState<'asc' | 'desc'>('asc');

  // Active consultation modal appointment
  const [consultingAppt, setConsultingAppt] = useState<Appointment | null>(null);

  // Audio speech calling state
  const [callingToken, setCallingToken] = useState<string | null>(null);
  const [callingAppt, setCallingAppt] = useState<Appointment | null>(null);

  // Auto-set doctor filter if user is DOCTOR role
  useEffect(() => {
    if (user && user.role === 'DOCTOR' && !selectedDoctorId) {
      setSelectedDoctorId(user.id);
    }
  }, [user, selectedDoctorId]);

  // Fetch doctors list
  const { data: doctors = [] } = useQuery<User[]>({
    queryKey: ['doctors-users'],
    queryFn: async () => {
      const response = await apiClient.get('/users/doctors');
      return response.data;
    },
  });

  // Fetch appointments for queue
  const {
    data: appointments = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<Appointment[]>({
    queryKey: ['queue-appointments', selectedDate, selectedDoctorId],
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
      queryClient.invalidateQueries({ queryKey: ['queue-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  // Fetch clinic branding
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

  // Handle Token Speech Callout
  const handleCallToken = (appointment: Appointment, tokenNumber: string) => {
    setCallingToken(tokenNumber);
    setCallingAppt(appointment);

    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const text = `Attention please. Token number ${tokenNumber}, ${appointment.patientName}, please proceed to doctor chamber.`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch {}
    }

    setTimeout(() => {
      setCallingToken(null);
      setCallingAppt(null);
    }, 4500);
  };

  // Derive Token Numbers & Map
  const appointmentTokenMap = useMemo(() => {
    const map = new Map<string, string>();
    appointments.forEach((appt, index) => {
      map.set(appt.id, `T-${String(index + 1).padStart(2, '0')}`);
    });
    return map;
  }, [appointments]);

  // Statistics calculation
  const stats = useMemo(() => {
    const waiting = appointments.filter((a) => a.status === 'CHECKED_IN').length;
    const inConsult = appointments.filter((a) => a.status === 'IN_CONSULTATION').length;
    const completed = appointments.filter((a) => a.status === 'COMPLETED').length;
    const total = appointments.length;
    const emergency = appointments.filter((a) => a.type === 'EMERGENCY' && a.status !== 'COMPLETED').length;
    const avgWaitMinutes = waiting > 0 ? Math.min(45, Math.max(10, waiting * 12)) : 0;

    return { waiting, inConsult, completed, total, emergency, avgWaitMinutes };
  }, [appointments]);

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    const list = appointments.filter((appt) => {
      if (statusFilter === 'WAITING' && appt.status !== 'CHECKED_IN') return false;
      if (statusFilter === 'IN_CONSULTATION' && appt.status !== 'IN_CONSULTATION') return false;
      if (statusFilter === 'SCHEDULED' && appt.status !== 'SCHEDULED') return false;
      if (statusFilter === 'COMPLETED' && appt.status !== 'COMPLETED') return false;
      if (statusFilter === 'EMERGENCY' && appt.type !== 'EMERGENCY') return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const token = appointmentTokenMap.get(appt.id)?.toLowerCase() || '';
        const nameMatches = appt.patientName.toLowerCase().includes(query);
        const phoneMatches = appt.patientPhone?.toLowerCase().includes(query);
        const doctorMatches = appt.doctorName?.toLowerCase().includes(query);
        const tokenMatches = token.includes(query);
        return nameMatches || phoneMatches || doctorMatches || tokenMatches;
      }

      return true;
    });

    list.sort((a, b) => {
      const tokenA = appointmentTokenMap.get(a.id) || '';
      const tokenB = appointmentTokenMap.get(b.id) || '';
      const cmp = tokenA.localeCompare(tokenB, undefined, { numeric: true });
      return queueSortOrder === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [appointments, statusFilter, searchQuery, appointmentTokenMap, queueSortOrder]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Fullscreen TV Lounge Overlay */}
      {isTvMode && (
        <WaitingLoungeTv
          appointments={appointments}
          activeCallingToken={callingToken}
          activeCallingAppt={callingAppt}
          onCloseTvMode={() => setIsTvMode(false)}
        />
      )}

      {/* Doctor Prescription Note Pad Modal */}
      {consultingAppt && (
        <DoctorPrescriptionNotepadModal
          isOpen={!!consultingAppt}
          onClose={() => setConsultingAppt(null)}
          appointment={consultingAppt}
          clinic={clinic}
          settings={prescriptionSettings}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['queue-appointments'] });
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
          }}
        />
      )}

      {/* 1. EXECUTIVE HEADER BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-[#E8EEF2] shadow-2xs p-5 sm:p-6 transition-all space-y-4">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-[#087F8C]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-10 w-48 h-48 bg-[#4FA8DB]/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#087F8C]/10 text-[#087F8C] border border-[#087F8C]/20 flex items-center justify-center font-bold shrink-0 shadow-2xs">
              <Users2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#172B34] tracking-tight">
                  Patient Queue
                </h1>
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#087F8C]/10 text-[#087F8C] border border-[#087F8C]/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#087F8C] animate-ping" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-[#567781] font-medium mt-0.5">
                Live patient OPD queue, token sequence, audio announcements, and waiting room display.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 w-full md:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTvMode(true)}
              className="h-10 border-[#E8EEF2] bg-[#F6F9FB] hover:bg-white text-[#172B34] font-bold text-xs px-3.5 sm:px-4 rounded-xl shadow-2xs cursor-pointer flex items-center gap-2 transition-all"
            >
              <Tv className="w-4 h-4 text-[#087F8C]" />
              <span>TV Display</span>
            </Button>

            <Link href="/appointments/new">
              <Button
                size="sm"
                className="h-10 bg-[#087F8C] hover:bg-[#076b77] text-white font-semibold text-xs px-4.5 rounded-xl shadow-md shadow-[#087F8C]/20 cursor-pointer flex items-center gap-2 border-0 transition-all active:scale-98"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>Book Appointment</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* STATS CARDS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Waiting */}
        <div className="bg-white border border-[#E8EEF2] rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between transition-all hover:border-[#087F8C]/40">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-[#567781] uppercase tracking-wider">Waiting</span>
            <div className="text-2xl font-extrabold text-[#172B34]">{stats.waiting} <span className="text-xs font-semibold text-[#567781]">Patients</span></div>
          </div>
          <div className="w-10 h-10 bg-[#087F8C]/10 border border-[#087F8C]/20 rounded-xl flex items-center justify-center text-[#087F8C] shrink-0 shadow-2xs">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        {/* In Consult */}
        <div className="bg-white border border-[#E8EEF2] rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between transition-all hover:border-amber-500/40">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">In Consult</span>
            <div className="text-2xl font-extrabold text-amber-600">{stats.inConsult} <span className="text-xs font-semibold text-[#567781]">Active</span></div>
          </div>
          <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-600 shrink-0 shadow-2xs">
            <Stethoscope className="w-5 h-5" />
          </div>
        </div>

        {/* Wait Time */}
        <div className="bg-white border border-[#E8EEF2] rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between transition-all hover:border-[#087F8C]/40">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-[#567781] uppercase tracking-wider">Avg. Wait</span>
            <div className="text-2xl font-extrabold text-[#172B34]">~{stats.avgWaitMinutes} <span className="text-xs font-semibold text-[#567781]">Mins</span></div>
          </div>
          <div className="w-10 h-10 bg-[#087F8C]/10 border border-[#087F8C]/20 rounded-xl flex items-center justify-center text-[#087F8C] shrink-0 shadow-2xs">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white border border-[#E8EEF2] rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between transition-all hover:border-[#22A06B]/40">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-[#22A06B] uppercase tracking-wider">Completed</span>
            <div className="text-2xl font-extrabold text-[#22A06B]">{stats.completed} <span className="text-xs font-semibold text-[#567781]">Visits</span></div>
          </div>
          <div className="w-10 h-10 bg-[#22A06B]/10 border border-[#22A06B]/20 rounded-xl flex items-center justify-center text-[#22A06B] shrink-0 shadow-2xs">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. SEARCH & CONTROLS TOOLBAR */}
      <div className="bg-white border border-[#E8EEF2] p-3.5 sm:p-4 rounded-2xl shadow-xs space-y-3 sm:space-y-4">
        <div className="flex flex-col lg:flex-row gap-2.5 sm:gap-3 items-stretch lg:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#567781] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search queue by Token (T-01), patient name, mobile..."
              className="pl-9.5 pr-8 h-10 text-xs rounded-xl bg-[#F6F9FB] border-[#E8EEF2] text-[#172B34] placeholder:text-[#567781]/60 focus:border-[#087F8C]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#567781] hover:text-[#172B34] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Doctor Filter */}
          <div className="w-full lg:w-56 shrink-0">
            <select
              className="w-full h-10 px-3 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] text-xs font-semibold text-[#172B34] focus:outline-none focus:border-[#087F8C]"
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

          {/* Status Filter Tabs */}
          <div className="flex bg-[#F6F9FB] border border-[#E8EEF2] p-1 rounded-xl shrink-0 overflow-x-auto custom-scrollbar">
            {[
              { key: 'ALL', label: `All (${appointments.length})` },
              { key: 'WAITING', label: `Waiting (${stats.waiting})` },
              { key: 'IN_CONSULTATION', label: `In Consult (${stats.inConsult})` },
              { key: 'COMPLETED', label: `Done (${stats.completed})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === tab.key
                    ? 'bg-white text-[#172B34] shadow-xs'
                    : 'text-[#567781] hover:text-[#172B34]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-10 text-xs font-semibold rounded-xl border-[#E8EEF2] bg-white text-[#567781] hover:text-[#087F8C] hover:bg-[#F6F9FB] px-3 cursor-pointer shadow-2xs"
            title="Refresh Queue"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-[#087F8C]' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 3. QUEUE TOKENS GRID */}
      {isLoading ? (
        <div className="p-16 text-center text-[#567781] font-medium bg-white border border-[#E8EEF2] rounded-3xl shadow-xs">
          <div className="w-9 h-9 border-3 border-[#087F8C]/20 border-t-[#087F8C] rounded-full animate-spin mx-auto mb-3"></div>
          <span className="text-xs font-semibold">Synchronizing live queue tokens...</span>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-[#E8EEF2] shadow-xs space-y-3">
          <Users2 className="w-12 h-12 text-[#567781]/30 mx-auto" />
          <h3 className="text-base font-bold text-[#172B34]">No Patients in OPD Queue</h3>
          <p className="text-[#567781] text-xs max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'ALL'
              ? 'No tokens matched your filter criteria.'
              : 'There are no active patients waiting in the clinic queue for this date.'}
          </p>
          <Link href="/appointments/new">
            <Button className="bg-[#087F8C] hover:bg-[#076b77] text-white font-medium text-xs rounded-xl shadow-2xs mt-2 border-0">
              Add Patient to Queue
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredAppointments.map((appt) => {
            const tokenNumber = appointmentTokenMap.get(appt.id) || 'T-00';
            const isCurrentlyCalling = callingToken === tokenNumber;

            return (
              <QueueTokenCard
                key={appt.id}
                appointment={appt}
                tokenNumber={tokenNumber}
                isCalling={isCurrentlyCalling}
                onCallToken={() => handleCallToken(appt, tokenNumber)}
                onUpdateStatus={(id, status) => updateStatusMutation.mutate({ id, status })}
                onOpenConsultation={(appointment) => setConsultingAppt(appointment)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
