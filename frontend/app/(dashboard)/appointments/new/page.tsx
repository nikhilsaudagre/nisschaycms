'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { appointmentSchema, AppointmentInput } from '@/lib/validations';
import { apiClient } from '@/lib/api-client';
import { PatientListResponse, User, Appointment, Doctor, Clinic } from '@/types';
import { TimeSlotGrid } from '@/components/time-slot-grid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Calendar,
  Clock,
  User as UserIcon,
  Search,
  Check,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Stethoscope,
  FileText,
} from 'lucide-react';
import Link from 'next/link';

export default function NewAppointmentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedPatientName, setSelectedPatientName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Debounce patient search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(patientSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentInput>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientId: '',
      doctorId: '',
      appointmentDate: (() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      })(),
      startTime: '09:00',
      endTime: '09:30',
      type: 'CONSULTATION',
      reason: '',
      notes: '',
    },
  });

  // Fetch doctors list
  const { data: doctors = [], isLoading: loadingDocs } = useQuery<Doctor[]>({
    queryKey: ['doctors-list-booking'],
    queryFn: async () => {
      const response = await apiClient.get('/doctors');
      return response.data;
    },
  });

  // Pre-select doctor if logged-in user is a doctor
  useEffect(() => {
    if (user && doctors.length > 0) {
      const isDoctor = doctors.some((doc) => doc.id === user.id);
      if (isDoctor) {
        setValue('doctorId', user.id);
      }
    }
  }, [user, doctors, setValue]);

  const selectedPatientId = watch('patientId');
  const selectedDoctorIdWatch = watch('doctorId');
  const selectedDateWatch = watch('appointmentDate');
  const selectedStartTimeWatch = watch('startTime');

  const selectedDoctor = useMemo(() => {
    return doctors.find((d) => d.id === selectedDoctorIdWatch);
  }, [doctors, selectedDoctorIdWatch]);

  // Fetch clinic profile for operating hours, holidays, and weekly schedule
  const { data: clinic } = useQuery<Clinic>({
    queryKey: ['clinic-profile-schedule'],
    queryFn: async () => {
      const res = await apiClient.get('/clinics/me');
      return res.data;
    },
  });

  // Determine if clinic is scheduled closed on selected date
  const { isClosedOnSelectedDate, closedReason } = useMemo(() => {
    if (!selectedDateWatch || !clinic) return { isClosedOnSelectedDate: false, closedReason: '' };

    // 1. Check weekly closed days (e.g. Sunday)
    if (clinic.closedDays) {
      const [year, month, day] = selectedDateWatch.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[dateObj.getDay()];

      const closedList = clinic.closedDays.split(',').map((d) => d.trim().toLowerCase());
      if (closedList.includes(dayName.toLowerCase())) {
        return {
          isClosedOnSelectedDate: true,
          closedReason: `The clinic is scheduled CLOSED on ${dayName}s as per weekly operating hours.`,
        };
      }
    }

    // 2. Check scheduled holidays / clinic closures
    if (clinic.holidayDates) {
      const holidays = clinic.holidayDates.split(',').map((d) => d.trim());
      if (holidays.includes(selectedDateWatch)) {
        return {
          isClosedOnSelectedDate: true,
          closedReason: `The clinic is scheduled CLOSED on ${selectedDateWatch} for a scheduled holiday.`,
        };
      }
    }

    return { isClosedOnSelectedDate: false, closedReason: '' };
  }, [selectedDateWatch, clinic]);

  const activeSlotDuration = selectedDoctor?.slotDuration || clinic?.appointmentSlotDuration || 15;

  // Auto compute end time when start time or doctor changes
  useEffect(() => {
    if (selectedStartTimeWatch) {
      const [h, m] = selectedStartTimeWatch.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        const totalM = h * 60 + m + activeSlotDuration;
        const endH = String(Math.floor(totalM / 60)).padStart(2, '0');
        const endM = String(totalM % 60).padStart(2, '0');
        setValue('endTime', `${endH}:${endM}`, { shouldValidate: true });
      }
    }
  }, [selectedStartTimeWatch, activeSlotDuration, setValue]);

  // Fetch matching patients
  const { data: patientsData, isLoading: loadingPatients } = useQuery<PatientListResponse>({
    queryKey: ['patients-search', debouncedSearch],
    queryFn: async () => {
      const response = await apiClient.get('/patients', {
        params: {
          search: debouncedSearch,
          page: 0,
          size: 5,
        },
      });
      return response.data;
    },
    enabled: debouncedSearch.length >= 2,
  });

  // Fetch booked slots for the selected doctor & date
  const { data: existingAppts = [] } = useQuery<Appointment[]>({
    queryKey: ['existing-appts', selectedDoctorIdWatch, selectedDateWatch],
    queryFn: async () => {
      if (!selectedDoctorIdWatch || !selectedDateWatch) return [];
      const res = await apiClient.get<Appointment[]>('/appointments', {
        params: { doctorId: selectedDoctorIdWatch, date: selectedDateWatch },
      });
      return res.data;
    },
    enabled: Boolean(selectedDoctorIdWatch && selectedDateWatch),
  });

  const activeAppts = useMemo(() => {
    return existingAppts.filter((a) => a.status !== 'CANCELLED');
  }, [existingAppts]);

  const bookedTimeList = useMemo(() => {
    return activeAppts.map((a) => (a.startTime ? a.startTime.substring(0, 5) : ''));
  }, [activeAppts]);

  const bookedRanges = useMemo(() => {
    return activeAppts.map((a) => ({ startTime: a.startTime, endTime: a.endTime }));
  }, [activeAppts]);

  const onSubmit = async (data: AppointmentInput) => {
    setError(null);
    try {
      // 1. Guard against booking on closed days / holidays
      if (isClosedOnSelectedDate) {
        setError(closedReason || 'The clinic is closed on the selected date. Please pick an open working day.');
        return;
      }

      // Check for slot collision on client
      const [sh, sm] = data.startTime.split(':').map(Number);
      const startMins = sh * 60 + sm;
      const endMins = startMins + activeSlotDuration;

      const hasConflict = bookedRanges.some((range) => {
        if (!range.startTime) return false;
        const [rsh, rsm] = range.startTime.substring(0, 5).split(':').map(Number);
        const rangeStartMins = rsh * 60 + rsm;
        let rangeEndMins = rangeStartMins + activeSlotDuration;
        if (range.endTime) {
          const [reh, rem] = range.endTime.substring(0, 5).split(':').map(Number);
          if (reh * 60 + rem > rangeStartMins) rangeEndMins = reh * 60 + rem;
        }
        return startMins < rangeEndMins && rangeStartMins < endMins;
      });

      if (hasConflict) {
        setError(`The time slot ${data.startTime} is already booked for this doctor. Please select another slot.`);
        return;
      }

      // Append seconds if Next.js HTML time inputs omit them (Spring LocalTime requires HH:MM:SS or HH:MM)
      const formattedData = {
        ...data,
        startTime: data.startTime.length === 5 ? `${data.startTime}:00` : data.startTime,
        endTime: data.endTime.length === 5 ? `${data.endTime}:00` : data.endTime,
      };
      await apiClient.post('/appointments', formattedData);
      router.push('/appointments');
      router.refresh();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string; error?: string } }; message?: string };
      const msg = axiosError?.response?.data?.message || axiosError?.response?.data?.error || axiosError?.message;
      setError(msg || 'Failed to schedule appointment. Slot may be occupied.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* 1. Glass Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-5 sm:p-6 transition-all">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-[#087F8C]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-10 w-48 h-48 bg-[#4FA8DB]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/appointments"
              className="p-2 rounded-xl bg-white border border-[#E8EEF2] text-[#567781] hover:text-[#087F8C] hover:border-[#087F8C]/40 transition-colors shadow-2xs cursor-pointer"
              title="Back to Appointments"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#172B34] tracking-tight">
                Book Appointment
              </h1>
              <p className="text-xs sm:text-sm font-medium text-[#567781] mt-0.5">
                Schedule a consultation slot for registered or walk-in patients.
              </p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-[#D64545]/10 border border-[#D64545]/20 rounded-2xl text-xs text-[#D64545] font-bold shadow-2xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Card 1: Patient Selection */}
        <div className="bg-white rounded-2xl border border-[#E8EEF2] shadow-2xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center space-x-2.5 border-b border-[#E8EEF2] pb-3">
            <span className="p-1.5 bg-[#087F8C]/10 rounded-xl text-[#087F8C] border border-[#087F8C]/20">
              <UserIcon className="w-4 h-4" />
            </span>
            <h2 className="text-sm font-bold text-[#172B34] uppercase tracking-wide">1. Select Patient</h2>
          </div>

          <div className="space-y-1.5 relative">
            <Label className="text-[#172B34] text-xs font-bold">Search Registered Patient *</Label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#567781] w-4 h-4 z-10 pointer-events-none" />
              <Input
                type="text"
                placeholder="Type patient name or mobile number..."
                className="pl-10 h-10 text-xs rounded-xl bg-[#F6F9FB] border-[#E8EEF2] text-[#172B34] placeholder-[#567781] focus:border-[#087F8C]"
                value={patientSearch}
                onChange={(e) => {
                  setPatientSearch(e.target.value);
                  setShowDropdown(true);
                  if (selectedPatientId) {
                    setValue('patientId', '');
                    setSelectedPatientName('');
                  }
                }}
                onFocus={() => setShowDropdown(true)}
              />
              {selectedPatientName && (
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center space-x-1 bg-[#22A06B]/10 text-[#22A06B] border border-[#22A06B]/20 px-2.5 py-0.5 rounded-lg text-xs font-bold shadow-2xs z-10">
                  <Check className="w-3 h-3" />
                  <span>Selected</span>
                </div>
              )}
            </div>

            {/* Dropdown search results */}
            {showDropdown && patientSearch.length >= 2 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#E8EEF2] rounded-xl shadow-lg overflow-hidden z-50 divide-y divide-[#E8EEF2] max-h-56 overflow-y-auto custom-scrollbar">
                {loadingPatients ? (
                  <div className="p-4 text-center text-[#567781] text-xs font-medium flex items-center justify-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#087F8C]" />
                    <span>Searching patient database...</span>
                  </div>
                ) : !patientsData || patientsData.content.length === 0 ? (
                  <div className="p-4 text-center text-[#567781] text-xs font-medium">
                    No matching patients found.
                  </div>
                ) : (
                  patientsData.content.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full text-left px-4 py-2.5 hover:bg-[#F6F9FB] flex items-center justify-between text-xs transition-colors cursor-pointer"
                      onClick={() => {
                        setValue('patientId', p.id, { shouldValidate: true });
                        setSelectedPatientName(p.name || '');
                        setPatientSearch(p.name || '');
                        setShowDropdown(false);
                      }}
                    >
                      <div>
                        <strong className="text-[#172B34] font-bold block">{p.name}</strong>
                        <span className="text-[11px] text-[#567781] font-mono">Mobile: {p.phone}</span>
                      </div>
                      <span className="text-[11px] text-[#087F8C] font-bold uppercase tracking-wider">Select</span>
                    </button>
                  ))
                )}
              </div>
            )}
            {errors.patientId && (
              <p className="text-[#D64545] text-xs font-bold mt-1">{errors.patientId.message}</p>
            )}
          </div>
        </div>

        {/* Card 2: Date & Slots */}
        <div className="bg-white rounded-2xl border border-[#E8EEF2] shadow-2xs p-5 sm:p-6 space-y-5">
          <div className="flex items-center space-x-2.5 border-b border-[#E8EEF2] pb-3">
            <span className="p-1.5 bg-[#087F8C]/10 rounded-xl text-[#087F8C] border border-[#087F8C]/20">
              <Calendar className="w-4 h-4" />
            </span>
            <h2 className="text-sm font-bold text-[#172B34] uppercase tracking-wide">2. Doctor & Schedule Timing</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="doctorId" className="text-[#172B34] text-xs font-bold">Assign Doctor *</Label>
              <select
                id="doctorId"
                className={`w-full h-10 px-3 bg-[#F6F9FB] rounded-xl border text-xs font-semibold text-[#172B34] focus:outline-none focus:border-[#087F8C] transition-colors ${
                  errors.doctorId ? 'border-[#D64545]' : 'border-[#E8EEF2]'
                }`}
                {...register('doctorId')}
              >
                <option value="">Choose Doctor...</option>
                {loadingDocs ? (
                  <option disabled>Loading doctors...</option>
                ) : (
                  doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      Dr. {doc.name} ({(doc as Doctor).specialization || 'General'})
                    </option>
                  ))
                )}
              </select>
              {errors.doctorId && (
                <p className="text-[#D64545] text-xs font-bold mt-1">{errors.doctorId.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="appointmentDate" className="text-[#172B34] text-xs font-bold">Appointment Date *</Label>
              <Input
                id="appointmentDate"
                type="date"
                className="h-10 text-xs rounded-xl bg-[#F6F9FB] border-[#E8EEF2] text-[#172B34] focus:border-[#087F8C]"
                {...register('appointmentDate')}
              />
              {errors.appointmentDate && (
                <p className="text-[#D64545] text-xs font-bold mt-1">{errors.appointmentDate.message}</p>
              )}
            </div>
          </div>

          {/* Interactive Timing Sheet Grid */}
          <div className="pt-1">
            <TimeSlotGrid
              selectedTime={selectedStartTimeWatch}
              bookedTime24List={bookedTimeList}
              bookedRanges={bookedRanges}
              slotDurationMinutes={activeSlotDuration}
              morningStartTime={clinic?.morningStartTime}
              morningEndTime={clinic?.morningEndTime}
              eveningStartTime={clinic?.eveningStartTime}
              eveningEndTime={clinic?.eveningEndTime}
              isClosedToday={isClosedOnSelectedDate}
              closedReason={closedReason}
              onSelectSlot={(start24, end24) => {
                setValue('startTime', start24, { shouldValidate: true });
                setValue('endTime', end24, { shouldValidate: true });
              }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="startTime" className="text-[#172B34] text-xs font-bold flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1 inline shrink-0 text-[#087F8C]" />
                <span>Selected Start Time</span>
              </Label>
              <Input
                id="startTime"
                type="time"
                className="h-10 text-xs rounded-xl bg-[#F6F9FB] border-[#E8EEF2] text-[#172B34] font-mono font-bold focus:border-[#087F8C]"
                {...register('startTime')}
              />
              {errors.startTime && (
                <p className="text-[#D64545] text-xs font-bold mt-1">{errors.startTime.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="endTime" className="text-[#172B34] text-xs font-bold flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1 inline shrink-0 text-[#087F8C]" />
                <span>Selected End Time</span>
              </Label>
              <Input
                id="endTime"
                type="time"
                className="h-10 text-xs rounded-xl bg-[#F6F9FB] border-[#E8EEF2] text-[#172B34] font-mono font-bold focus:border-[#087F8C]"
                {...register('endTime')}
              />
              {errors.endTime && (
                <p className="text-[#D64545] text-xs font-bold mt-1">{errors.endTime.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Consultation Details */}
        <div className="bg-white rounded-2xl border border-[#E8EEF2] shadow-2xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center space-x-2.5 border-b border-[#E8EEF2] pb-3">
            <span className="p-1.5 bg-[#087F8C]/10 rounded-xl text-[#087F8C] border border-[#087F8C]/20">
              <Stethoscope className="w-4 h-4" />
            </span>
            <h2 className="text-sm font-bold text-[#172B34] uppercase tracking-wide">3. Consultation Details</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="type" className="text-[#172B34] text-xs font-bold">Visit Type *</Label>
              <select
                id="type"
                className="w-full h-10 px-3 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] text-xs font-semibold text-[#172B34] focus:outline-none focus:border-[#087F8C]"
                {...register('type')}
              >
                <option value="CONSULTATION">First Consultation</option>
                <option value="FOLLOW_UP">Follow Up</option>
                <option value="EMERGENCY">Emergency</option>
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="reason" className="text-[#172B34] text-xs font-bold">Reason for Visit</Label>
              <Input
                id="reason"
                placeholder="e.g. Fever, routine checkup, diabetes follow-up..."
                className="h-10 text-xs rounded-xl bg-[#F6F9FB] border-[#E8EEF2] text-[#172B34] focus:border-[#087F8C]"
                {...register('reason')}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-[#172B34] text-xs font-bold">Internal Notes (Optional)</Label>
            <Input
              id="notes"
              placeholder="e.g. Patient requested doctor specifically, wheelchair required..."
              className="h-10 text-xs rounded-xl bg-[#F6F9FB] border-[#E8EEF2] text-[#172B34] focus:border-[#087F8C]"
              {...register('notes')}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2 justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-10 font-bold px-5 text-xs border-[#E8EEF2] text-[#567781] hover:text-[#172B34] rounded-xl bg-[#F6F9FB] hover:bg-white cursor-pointer"
            onClick={() => router.push('/appointments')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="h-10 bg-[#087F8C] hover:bg-[#076b77] text-white font-bold px-6 text-xs rounded-xl shadow-md shadow-[#087F8C]/20 transition-all duration-150 active:scale-98 cursor-pointer border-0"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Booking Slot...</span>
              </span>
            ) : (
              'Book Appointment'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
