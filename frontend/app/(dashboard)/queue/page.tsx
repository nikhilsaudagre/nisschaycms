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
    refetchInterval: 10000,
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2.5 bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 rounded-2xl border border-teal-100 dark:border-teal-800">
              <Users2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  OPD Queue & Waiting Lounge
                </h1>
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Live token sequencing, audio callouts, patient check-ins, and waiting room TV broadcast.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button
            onClick={() => setIsTvMode(true)}
            className="h-10 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-4 rounded-xl shadow-xs cursor-pointer flex items-center gap-2 border-0"
          >
            <Tv className="w-4 h-4" />
            <span>Launch TV Lounge</span>
          </Button>

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
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">In Waiting Lounge</span>
            <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">{stats.waiting} Patients</div>
          </div>
          <div className="w-11 h-11 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">In Chamber</span>
            <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{stats.inConsult} Active</div>
          </div>
          <div className="w-11 h-11 bg-amber-50 dark:bg-amber-950/50 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Stethoscope className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Est. Wait Time</span>
            <div className="text-2xl font-extrabold text-teal-600 dark:text-teal-400">~{stats.avgWaitMinutes} Mins</div>
          </div>
          <div className="w-11 h-11 bg-teal-50 dark:bg-teal-950/50 rounded-xl flex items-center justify-center text-teal-600 dark:text-teal-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Done Today</span>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{stats.completed} Visits</div>
          </div>
          <div className="w-11 h-11 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. SEARCH & CONTROLS TOOLBAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search live queue by Token (T-01), patient name, mobile, doctor..."
              className="pl-9.5 pr-8 h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-700"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Doctor Filter */}
          <div className="w-full lg:w-56 shrink-0">
            <select
              className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              disabled={user?.role === 'DOCTOR'}
            >
              <option value="">All Doctor Chambers</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  Dr. {doc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0 overflow-x-auto">
            {[
              { key: 'ALL', label: `All (${appointments.length})` },
              { key: 'WAITING', label: `Waiting (${stats.waiting})` },
              { key: 'IN_CONSULTATION', label: `In Chamber (${stats.inConsult})` },
              { key: 'COMPLETED', label: `Done (${stats.completed})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === tab.key
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
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
            className="h-10 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-700 px-3"
            title="Refresh Queue"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-teal-600' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 3. QUEUE TOKENS GRID */}
      {isLoading ? (
        <div className="p-16 text-center text-slate-500 font-medium bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs">
          <div className="w-9 h-9 border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-3"></div>
          <span className="text-xs font-semibold">Synchronizing live queue tokens...</span>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <Users2 className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Patients in OPD Queue</h3>
          <p className="text-slate-400 text-xs max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'ALL'
              ? 'No tokens matched your filter criteria.'
              : 'There are no active patients waiting in the clinic queue for this date.'}
          </p>
          <Link href="/appointments/new">
            <Button className="bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs rounded-xl shadow-2xs mt-2">
              Add Patient to Queue
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
