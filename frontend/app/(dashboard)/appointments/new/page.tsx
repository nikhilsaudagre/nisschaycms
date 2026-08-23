'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { appointmentSchema, AppointmentInput } from '@/lib/validations';
import { apiClient } from '@/lib/api-client';
import { PatientListResponse, User, Appointment, Doctor } from '@/types';
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
} from 'lucide-react';

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

  const activeSlotDuration = selectedDoctor?.slotDuration || 15;

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
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Book Appointment</h1>
        <p className="text-slate-500 font-medium mt-1">Schedule consulting slot calendars for clinic patients.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-2xl text-sm text-red-700 font-bold shadow-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Card 1: Patient Selection */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3">
            <span className="p-1.5 bg-sky-50 rounded-lg text-sky-600 border border-sky-100">
              <UserIcon className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-extrabold text-slate-800">1. Patient Profile Select</h2>
          </div>

          <div className="space-y-2 relative">
            <Label className="text-slate-700 text-sm font-bold">Search Registered Patient *</Label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 z-10 pointer-events-none" />
              <Input
                type="text"
                placeholder="Type Patient Name or Mobile Number to search..."
                className={`pl-11 h-11 text-base border-slate-200 focus-visible:ring-blue-500 rounded-xl`}
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
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1.5 bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-lg text-xs font-bold shadow-sm z-10">
                  <Check className="w-3.5 h-3.5" />
                  <span>Selected</span>
                </div>
              )}
            </div>

            {/* Dropdown search results */}
            {showDropdown && patientSearch.length >= 2 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50 divide-y divide-slate-100">
                {loadingPatients ? (
                  <div className="p-4 text-center text-slate-500 text-sm font-medium flex items-center justify-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Searching patient database...</span>
                  </div>
                ) : !patientsData || patientsData.content.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-sm font-medium">
                    No matching patients found.
                  </div>
                ) : (
                  patientsData.content.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between text-sm transition-colors"
                      onClick={() => {
                        setValue('patientId', p.id, { shouldValidate: true });
                        setSelectedPatientName(p.name || '');
                        setPatientSearch(p.name || '');
                        setShowDropdown(false);
                      }}
                    >
                      <div>
                        <strong className="text-slate-800 font-bold block">{p.name}</strong>
                        <span className="text-xs text-slate-400 font-bold font-mono tracking-wider">Mobile: {p.phone}</span>
                      </div>
                      <span className="text-xs text-blue-600 font-bold uppercase tracking-wider">Select</span>
                    </button>
                  ))
                )}
              </div>
            )}
            {errors.patientId && (
              <p className="text-red-500 text-xs font-bold mt-1">{errors.patientId.message}</p>
            )}
          </div>
        </div>

        {/* Card 2: Date & Slots */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3">
            <span className="p-1.5 bg-blue-50 rounded-lg text-blue-600 border border-blue-100">
              <Calendar className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-extrabold text-slate-800">2. Doctor & Schedule Slot</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <Label htmlFor="doctorId" className="text-slate-700 text-sm font-bold">Assign Doctor *</Label>
              <select
                id="doctorId"
                className={`w-full h-11 px-3 bg-white rounded-xl border text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  errors.doctorId ? 'border-red-400 focus:ring-red-400' : 'border-slate-200 focus:ring-blue-500'
                }`}
                {...register('doctorId')}
              >
                <option value="">Select Doctor</option>
                {loadingDocs ? (
                  <option disabled>Loading doctors...</option>
                ) : (
                  doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      Dr. {doc.name}
                    </option>
                  ))
                )}
              </select>
              {errors.doctorId && (
                <p className="text-red-500 text-xs font-bold mt-1">{errors.doctorId.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="appointmentDate" className="text-slate-700 text-sm font-bold">Appointment Date *</Label>
              <Input
                id="appointmentDate"
                type="date"
                className={`h-11 text-base border-slate-200 focus-visible:ring-blue-500 rounded-xl`}
                {...register('appointmentDate')}
              />
              {errors.appointmentDate && (
                <p className="text-red-500 text-xs font-bold mt-1">{errors.appointmentDate.message}</p>
              )}
            </div>
          </div>

          {/* Interactive Timing Sheet Grid */}
          <div className="pt-2">
            <TimeSlotGrid
              selectedTime={selectedStartTimeWatch}
              bookedTime24List={bookedTimeList}
              bookedRanges={bookedRanges}
              slotDurationMinutes={activeSlotDuration}
              onSelectSlot={(start24, end24) => {
                setValue('startTime', start24, { shouldValidate: true });
                setValue('endTime', end24, { shouldValidate: true });
              }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="startTime" className="text-slate-700 text-sm font-bold flex items-center">
                <Clock className="w-4 h-4 mr-1 inline shrink-0 text-teal-600" />
                <span>Selected Start Time</span>
              </Label>
              <Input
                id="startTime"
                type="time"
                className={`h-11 text-base border-slate-200 focus-visible:ring-teal-500 rounded-xl font-mono font-bold bg-slate-50`}
                {...register('startTime')}
              />
              {errors.startTime && (
                <p className="text-red-500 text-xs font-bold mt-1">{errors.startTime.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="endTime" className="text-slate-700 text-sm font-bold flex items-center">
                <Clock className="w-4 h-4 mr-1 inline shrink-0 text-teal-600" />
                <span>Selected End Time</span>
              </Label>
              <Input
                id="endTime"
                type="time"
                className={`h-11 text-base border-slate-200 focus-visible:ring-teal-500 rounded-xl font-mono font-bold bg-slate-50`}
                {...register('endTime')}
              />
              {errors.endTime && (
                <p className="text-red-500 text-xs font-bold mt-1">{errors.endTime.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Consultation Details */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3">
            <span className="p-1.5 bg-blue-50 rounded-lg text-blue-600 border border-blue-100">
              <AlertTriangle className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-extrabold text-slate-800">3. Consultation Details</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <Label htmlFor="type" className="text-slate-700 text-sm font-bold">Consultation Type *</Label>
              <select
                id="type"
                className={`w-full h-11 px-3 bg-white rounded-xl border text-base focus-visible:outline-none focus:ring-2 focus:ring-blue-500`}
                {...register('type')}
              >
                <option value="CONSULTATION">First Consultation</option>
                <option value="FOLLOW_UP">Follow Up</option>
                <option value="EMERGENCY">Emergency</option>
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="reason" className="text-slate-700 text-sm font-bold">Reason for Visit</Label>
              <Input
                id="reason"
                placeholder="e.g. High fever, annual health check, follow-up on diabetes"
                className="h-11 text-base border-slate-200 rounded-xl"
                {...register('reason')}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-slate-700 text-sm font-bold">Internal Receptionist/Nursing Notes</Label>
            <Input
              id="notes"
              placeholder="e.g. Patient requested Dr. Suresh specifically"
              className="h-11 text-base border-slate-200 rounded-xl"
              {...register('notes')}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4 justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-11 font-bold px-6 text-base border-slate-350 rounded-xl transition-all duration-150 active:scale-95 bg-white"
            onClick={() => router.push('/appointments')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 text-base rounded-xl shadow-sm transition-all duration-150 active:scale-95"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Booking Slot...' : 'Book Appointment'}
          </Button>
        </div>
      </form>
    </div>
  );
}
