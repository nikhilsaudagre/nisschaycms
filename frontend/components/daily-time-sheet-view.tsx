'use client';

import React, { useState, useMemo } from 'react';
import { Appointment, User, PatientListResponse, Doctor } from '@/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  Sun,
  Sunset,
  Moon,
  Clock,
  Plus,
  Check,
  User as UserIcon,
  Search,
  X,
  AlertCircle,
  Loader2,
  Calendar as CalendarIcon,
  Stethoscope,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface TimeSlotDef {
  time24: string; // "09:00"
  time12: string; // "09:00 AM"
  category: 'MORNING' | 'AFTERNOON' | 'EVENING';
}

interface DailyTimeSheetViewProps {
  appointments: Appointment[];
  doctors: (User | Doctor)[];
  selectedDate: string;
  selectedDoctorId: string;
  onSelectDate: (dateStr: string) => void;
  onSelectDoctor: (doctorId: string) => void;
}

export const DailyTimeSheetView: React.FC<DailyTimeSheetViewProps> = ({
  appointments,
  doctors,
  selectedDate,
  selectedDoctorId,
  onSelectDate,
  onSelectDoctor,
}) => {
  const queryClient = useQueryClient();

  // Active doctor and custom slot duration
  const activeDoctor = useMemo(() => {
    return doctors.find((d) => d.id === selectedDoctorId) as Doctor | undefined;
  }, [doctors, selectedDoctorId]);

  const activeSlotDuration = Math.max(5, activeDoctor?.slotDuration || 15);

  // Dynamic slot generation based on doctor's slotDuration
  const dynamicSlots = useMemo(() => {
    const duration = activeSlotDuration;
    const result: TimeSlotDef[] = [];

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
  }, [activeSlotDuration]);

  // Booking Modal State
  const [bookingSlot, setBookingSlot] = useState<TimeSlotDef | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedPatientName, setSelectedPatientName] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [visitType, setVisitType] = useState('CONSULTATION');
  const [visitReason, setVisitReason] = useState('');
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  // Generate 7-day date strip
  const dateStrip = useMemo(() => {
    const active = selectedDate ? new Date(selectedDate) : new Date();
    const days: Array<{ dateStr: string; dayName: string; dayNum: string; isToday: boolean }> = [];

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    for (let i = -3; i <= 3; i++) {
      const d = new Date(active);
      d.setDate(active.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayName: d.toLocaleDateString(undefined, { weekday: 'short' }),
        dayNum: String(d.getDate()).padStart(2, '0'),
        isToday: dateStr === todayStr,
      });
    }
    return days;
  }, [selectedDate]);

  // Check if a slot interval is occupied by any active appointment
  const findOccupyingAppt = (slotTime24: string): Appointment | undefined => {
    const [sh, sm] = slotTime24.split(':').map(Number);
    const slotStartMins = sh * 60 + sm;
    const slotEndMins = slotStartMins + activeSlotDuration;

    return appointments.find((appt) => {
      if (appt.status === 'CANCELLED' || !appt.startTime) return false;
      const [ash, asm] = appt.startTime.substring(0, 5).split(':').map(Number);
      const apptStartMins = ash * 60 + asm;
      let apptEndMins = apptStartMins + activeSlotDuration;
      if (appt.endTime) {
        const [aeh, aem] = appt.endTime.substring(0, 5).split(':').map(Number);
        if (aeh * 60 + aem > apptStartMins) apptEndMins = aeh * 60 + aem;
      }
      return slotStartMins < apptEndMins && apptStartMins < slotEndMins;
    });
  };

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(patientSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  // Patient search query
  const { data: patientsData, isLoading: loadingPatients } = useQuery<PatientListResponse>({
    queryKey: ['patients-search', debouncedSearch],
    queryFn: async () => {
      const res = await apiClient.get('/patients', {
        params: { search: debouncedSearch, page: 0, size: 5 },
      });
      return res.data;
    },
    enabled: debouncedSearch.length >= 2,
  });

  // Create Appointment Mutation
  const createMutation = useMutation({
    mutationFn: async (data: {
      patientId: string;
      doctorId: string;
      appointmentDate: string;
      startTime: string;
      endTime: string;
      type: string;
      reason: string;
    }) => {
      await apiClient.post('/appointments', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setBookingSuccess('✓ Appointment registered successfully!');
      setTimeout(() => {
        setBookingSlot(null);
        setBookingSuccess(null);
        setSelectedPatientId('');
        setSelectedPatientName('');
        setPatientSearch('');
        setVisitReason('');
      }, 1200);
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { message?: string; error?: string } }; message?: string };
      const msg = axiosErr?.response?.data?.message || axiosErr?.response?.data?.error || axiosErr?.message;
      setBookingError(msg || 'Failed to schedule appointment.');
    },
  });

  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingSlot) return;
    if (!selectedPatientId) {
      setBookingError('Please search and select a registered patient.');
      return;
    }
    const docId = selectedDoctorId || (doctors.length > 0 ? doctors[0].id : '');
    if (!docId) {
      setBookingError('Please select a doctor for this appointment.');
      return;
    }

    // Check collision before booking
    const occupying = findOccupyingAppt(bookingSlot.time24);
    if (occupying) {
      setBookingError(`This slot (${bookingSlot.time24}) is already booked for Dr. ${occupying.doctorName || 'the doctor'}. Please select an open slot.`);
      return;
    }

    // Dynamically calculate end time based on doctor's slot duration
    const [h, m] = bookingSlot.time24.split(':').map(Number);
    const totalMinutes = h * 60 + m + activeSlotDuration;
    const endH = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const endM = String(totalMinutes % 60).padStart(2, '0');
    const endTime24 = `${endH}:${endM}:00`;
    const startTime24 = `${bookingSlot.time24}:00`;

    setBookingError(null);
    createMutation.mutate({
      patientId: selectedPatientId,
      doctorId: docId,
      appointmentDate: selectedDate,
      startTime: startTime24,
      endTime: endTime24,
      type: visitType,
      reason: visitReason,
    });
  };

  const renderSection = (
    title: string,
    icon: React.ReactNode,
    slots: TimeSlotDef[],
    headerBadgeClass: string
  ) => (
    <div className="space-y-3">
      <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
        <span className={`p-1 rounded-md ${headerBadgeClass}`}>{icon}</span>
        <span>{title}</span>
        <span className="text-[10px] text-slate-400 font-medium">({slots.length} slots)</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {slots.map((slot) => {
          const bookedAppt = findOccupyingAppt(slot.time24);
          const isBooked = Boolean(bookedAppt);

          return (
            <div
              key={slot.time24}
              onClick={() => {
                if (isBooked) return;
                setBookingSlot(slot);
                setBookingError(null);
                setBookingSuccess(null);
              }}
              className={`p-3 rounded-xl border transition-all flex flex-col justify-between min-h-[90px] relative group ${
                isBooked
                  ? 'bg-[#D64545]/5 border-[#D64545]/15 text-[#567781] cursor-not-allowed'
                  : 'bg-white border-[#E8EEF2] hover:border-[#087F8C] hover:shadow-xs text-[#172B34] cursor-pointer'
              }`}
            >
              {/* Slot Header: Time */}
              <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-1.5">
                <span className="text-xs font-mono font-bold text-[#172B34] flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#087F8C]" />
                  {slot.time12}
                </span>
                {isBooked ? (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#E9A23B]/10 text-[#E9A23B] border border-[#E9A23B]/20">
                    Booked
                  </span>
                ) : (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#087F8C]/10 text-[#087F8C] border border-[#087F8C]/20 opacity-0 group-hover:opacity-100 transition-opacity">
                    Open
                  </span>
                )}
              </div>

              {/* Slot Content */}
              {isBooked && bookedAppt ? (
                <div className="pt-2 space-y-0.5">
                  <div className="text-xs font-bold text-[#172B34] truncate flex items-center gap-1">
                    <UserIcon className="w-3 h-3 text-[#087F8C] shrink-0" />
                    <span>{bookedAppt.patientName}</span>
                  </div>
                  <span className="text-[10px] text-[#567781] font-semibold block truncate">
                    Dr. {bookedAppt.doctorName}
                  </span>
                  <span className="text-[9px] font-mono text-[#567781]/70 block">
                    {bookedAppt.startTime?.substring(0, 5)} - {bookedAppt.endTime?.substring(0, 5)}
                  </span>
                </div>
              ) : (
                <div className="pt-2 text-center">
                  <span className="text-[11px] font-bold text-[#087F8C] group-hover:underline flex items-center justify-center gap-1">
                    <Plus className="w-3.5 h-3.5" />
                    Book Slot
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Upper Date Strip Selector Header */}
      <div className="bg-white border border-[#E8EEF2] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-3 flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-4 h-4 text-[#087F8C]" />
            <h3 className="text-xs sm:text-sm font-bold text-[#172B34]">
              Select Appointment Date
            </h3>
          </div>
          <span className="text-xs font-mono font-medium text-[#567781]">
            Selected: <strong className="text-[#087F8C] font-bold">{selectedDate}</strong>
          </span>
        </div>

        {/* 7-Day Date Pill Selector Strip */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {dateStrip.map((day) => {
            const isSelected = selectedDate === day.dateStr;
            return (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => onSelectDate(day.dateStr)}
                className={`p-2 sm:p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                  isSelected
                    ? 'bg-[#087F8C] text-white border-[#087F8C] shadow-xs'
                    : day.isToday
                    ? 'bg-[#087F8C]/10 text-[#087F8C] border-[#087F8C]/30'
                    : 'bg-[#F6F9FB] text-[#172B34] border-[#E8EEF2] hover:bg-white hover:border-[#087F8C]/40'
                }`}
              >
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                  {day.dayName}
                </span>
                <span className="text-base sm:text-lg font-mono font-extrabold">{day.dayNum}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Timing Sheet Grid for Selected Date */}
      <div className="bg-white border border-[#E8EEF2] rounded-2xl p-4 sm:p-6 shadow-2xs space-y-6">
        <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-3 flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-[#087F8C]" />
            <h3 className="text-xs sm:text-sm font-bold text-[#172B34]">
              {activeDoctor ? `Dr. ${activeDoctor.name}'s Consultation Timesheet` : 'All Doctors Consultation Timesheet'}
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#087F8C]/10 text-[#087F8C] border border-[#087F8C]/20 shadow-2xs font-mono">
              ⏱️ {activeSlotDuration} Mins / Slot
            </span>
          </div>
        </div>

        {renderSection(
          'Morning Timing Sheet (09:00 AM - 12:30 PM)',
          <Sun className="w-3.5 h-3.5 text-[#E9A23B]" />,
          dynamicSlots.filter((s) => s.category === 'MORNING'),
          'bg-[#E9A23B]/10 text-[#E9A23B] border border-[#E9A23B]/20'
        )}

        {renderSection(
          'Afternoon Timing Sheet (12:30 PM - 04:30 PM)',
          <Sunset className="w-3.5 h-3.5 text-[#087F8C]" />,
          dynamicSlots.filter((s) => s.category === 'AFTERNOON'),
          'bg-[#087F8C]/10 text-[#087F8C] border border-[#087F8C]/20'
        )}

        {renderSection(
          'Evening Timing Sheet (04:30 PM - 08:30 PM)',
          <Moon className="w-3.5 h-3.5 text-[#4FA8DB]" />,
          dynamicSlots.filter((s) => s.category === 'EVENING'),
          'bg-[#4FA8DB]/10 text-[#4FA8DB] border border-[#4FA8DB]/20'
        )}
      </div>

      {/* Quick 1-Click Slot Booking Pop-up Modal */}
      {bookingSlot && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-teal-600" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Book Slot: {bookingSlot.time12}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBookingSlot(null);
                  setBookingError(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmBooking} className="p-6 space-y-4">
              {bookingError && (
                <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{bookingError}</span>
                </div>
              )}

              {bookingSuccess && (
                <div className="p-3 bg-sky-50 text-teal-700 border border-sky-200 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{bookingSuccess}</span>
                </div>
              )}

              {/* Slot & Doctor Summary Banner */}
              <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Slot Time</span>
                  <span className="font-mono font-extrabold text-teal-600 dark:text-teal-400 text-sm">
                    {bookingSlot.time24} ({activeSlotDuration} Mins)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Date</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedDate}</span>
                </div>
              </div>

              {/* Patient Search Input */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Patient *</Label>
                {selectedPatientId ? (
                  <div className="flex items-center justify-between p-3 bg-sky-50/70 dark:bg-teal-950/40 border border-sky-200 dark:border-teal-800 rounded-xl text-xs">
                    <div>
                      <p className="font-extrabold text-slate-900 dark:text-white">{selectedPatientName}</p>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">Registered Patient File Selected</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedPatientId('');
                        setSelectedPatientName('');
                        setPatientSearch('');
                      }}
                      className="h-7 text-xs rounded-lg font-bold"
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      placeholder="Type patient name or mobile..."
                      value={patientSearch}
                      onChange={(e) => {
                        setPatientSearch(e.target.value);
                        setShowPatientDropdown(true);
                      }}
                      onFocus={() => setShowPatientDropdown(true)}
                      className="pl-9 h-10 text-xs rounded-xl"
                    />

                    {/* Patient search dropdown */}
                    {showPatientDropdown && debouncedSearch.length >= 2 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto p-1 space-y-1">
                        {loadingPatients ? (
                          <div className="p-3 text-center text-xs text-slate-400">Searching...</div>
                        ) : patientsData?.content?.length === 0 ? (
                          <div className="p-3 text-center text-xs text-slate-400">No patient found</div>
                        ) : (
                          patientsData?.content?.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setSelectedPatientId(p.id);
                                setSelectedPatientName(p.name || p.phone);
                                setShowPatientDropdown(false);
                              }}
                              className="w-full text-left p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex justify-between"
                            >
                              <span>{p.name}</span>
                              <span className="text-slate-400 font-mono">{p.phone}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Doctor Assignment */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Assign Doctor</Label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => onSelectDoctor(e.target.value)}
                  className="w-full h-10 px-3 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs font-semibold text-[#172B34] focus:outline-none focus:border-[#087F8C]"
                >
                  <option value="">Choose Doctor...</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.name} ({(d as Doctor).specialization || 'General'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Consultation Type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#172B34]">Visit Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'CONSULTATION', label: 'Consult' },
                    { id: 'FOLLOW_UP', label: 'Follow Up' },
                    { id: 'EMERGENCY', label: 'Emergency' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setVisitType(t.id)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                        visitType === t.id
                          ? t.id === 'EMERGENCY'
                            ? 'bg-[#D64545] text-white border-[#D64545]'
                            : 'bg-[#087F8C] text-white border-[#087F8C]'
                          : 'bg-[#F6F9FB] border-[#E8EEF2] text-[#567781] hover:text-[#172B34]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#172B34]">Chief Complaints / Reason for Visit (Optional)</Label>
                <Input
                  placeholder="e.g. Fever, Routine checkup"
                  value={visitReason}
                  onChange={(e) => setVisitReason(e.target.value)}
                  className="h-10 text-xs rounded-xl bg-[#F6F9FB] border-[#E8EEF2] text-[#172B34] focus:border-[#087F8C]"
                />
              </div>

              <div className="pt-3 border-t border-[#E8EEF2] flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBookingSlot(null)}
                  className="rounded-xl text-xs font-bold border-[#E8EEF2] text-[#567781]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-[#087F8C] hover:bg-[#076b77] text-white rounded-xl text-xs font-bold px-5 shadow-xs"
                >
                  {createMutation.isPending ? 'Registering...' : 'Confirm Booking'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
