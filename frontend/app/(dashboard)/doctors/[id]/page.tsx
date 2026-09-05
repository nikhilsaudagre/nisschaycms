'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Doctor, Appointment, Clinic, PrescriptionSettings } from '@/types';
import { Button } from '@/components/ui/button';
import { DoctorForm } from '@/components/doctor-form';
import { DoctorPrescriptionNotepadModal } from '@/components/prescription-notepad-modal';
import {
  ArrowLeft,
  Stethoscope,
  Phone,
  Mail,
  Calendar,
  Clock,
  IndianRupee,
  Award,
  Building,
  FileText,
  User,
  UserCheck,
  UserX,
  Edit2,
  CalendarPlus,
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Layers,
  Sparkles,
  ChevronRight,
  BedDouble,
  Users,
  Activity,
  ClipboardList,
  Search,
  ExternalLink,
  MapPin,
  HeartPulse,
  PenTool,
  Globe,
  CalendarDays,
  CalendarOff,
  UserCheck2,
  Trash2,
  Plus,
  X
} from 'lucide-react';

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function DoctorFilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const doctorId = resolvedParams.id;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'INFO' | 'CONSULTATIONS' | 'INPATIENTS' | 'SCHEDULE' | 'LEAVES'>('INFO');
  const [consultationSearch, setConsultationSearch] = useState('');
  const [viewingPrescriptionAppt, setViewingPrescriptionAppt] = useState<Appointment | null>(null);

  // IPD Patient History Filter State
  const [ipdFilter, setIpdFilter] = useState<'ALL' | 'ACTIVE' | 'DISCHARGED'>('ALL');
  const [ipdSearch, setIpdSearch] = useState('');

  // Leave Management State
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [substituteDoctorId, setSubstituteDoctorId] = useState('');
  const [leaveError, setLeaveError] = useState('');

  // Quick Update Tariffs State
  const [isTariffsModalOpen, setIsTariffsModalOpen] = useState(false);
  const [tariffForm, setTariffForm] = useState<{
    consultationFee: string;
    followUpFee: string;
    emergencyFee: string;
    roomNumber: string;
    slotDuration: number;
  }>({
    consultationFee: '500',
    followUpFee: '300',
    emergencyFee: '1000',
    roomNumber: '',
    slotDuration: 15,
  });
  const [tariffsError, setTariffsError] = useState('');

  // Quick Update Schedule State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleText, setScheduleText] = useState('');
  const [scheduleError, setScheduleError] = useState('');

  // 1. Fetch Doctor Record
  const {
    data: doctor,
    isLoading: isDocLoading,
    isError: isDocError,
    error: docError,
  } = useQuery<Doctor>({
    queryKey: ['doctor', doctorId],
    queryFn: async () => {
      try {
        const res = await apiClient.get(`/doctors/${doctorId}`);
        if (res.data) return res.data;
      } catch (e) {
        console.warn('Single doctor fetch error, falling back to /doctors list:', e);
      }
      const listRes = await apiClient.get('/doctors');
      const found = (listRes.data || []).find((d: Doctor) => d.id === doctorId);
      if (found) return found;
      throw new Error('Doctor not found in clinic records.');
    },
  });

  // 2. Fetch Real-time Appointments for this Doctor
  const { data: appointments = [], isLoading: isApptsLoading } = useQuery<Appointment[]>({
    queryKey: ['doctor-appointments', doctorId],
    queryFn: async () => {
      try {
        const res = await apiClient.get(`/appointments/doctor/${doctorId}`);
        return res.data || [];
      } catch (e) {
        // Fallback to clinic appointments
        const res = await apiClient.get('/appointments');
        const allAppts: Appointment[] = res.data || [];
        return allAppts.filter((a) => a.doctorId === doctorId);
      }
    },
    enabled: !!doctorId,
    refetchInterval: 10000 // Real-time poll every 10s
  });

  // 3. Fetch Real Inpatient Admissions under this Doctor
  const { data: admissions = [] } = useQuery<any[]>({
    queryKey: ['inpatient-admissions', doctorId, doctor?.name],
    queryFn: async () => {
      const records: any[] = [];
      const seenIds = new Set<string>();

      // A. Try backend JPA inpatient admissions API
      try {
        const res = await apiClient.get(`/inpatient/admissions?doctorId=${doctorId}`);
        if (res.data && Array.isArray(res.data)) {
          res.data.forEach((adm: any) => {
            const key = adm.id || adm.ipdNumber;
            if (key && !seenIds.has(key)) {
              seenIds.add(key);
              records.push(adm);
            }
          });
        }
      } catch {}

      // B. Try hospital-data endpoint (holds persistent bed records in DB)
      try {
        const res = await apiClient.get<any>('/clinics/hospital-data');
        if (res.data?.beds) {
          const parsedBeds = typeof res.data.beds === 'string' ? JSON.parse(res.data.beds) : res.data.beds;
          if (Array.isArray(parsedBeds)) {
            parsedBeds.forEach((b: any) => {
              if (b.patientName && (b.status === 'OCCUPIED' || b.status === 'DISCHARGE_PLANNED' || b.dischargeDate || b.admittingDiagnosis)) {
                const key = b.id || b.ipdNumber || `${b.patientName}-${b.bedNumber}`;
                if (!seenIds.has(key)) {
                  seenIds.add(key);
                  records.push({
                    ...b,
                    id: b.id,
                    ipdNumber: b.ipdNumber || `IPD-${b.bedNumber}`,
                    patientId: b.patientId,
                    patientName: b.patientName,
                    patientPhone: b.patientPhone,
                    patientAgeGender: b.patientAgeGender || (b.patientAge ? `${b.patientAge}Y/${b.patientGender || 'M'}` : ''),
                    bedNumber: b.bedNumber,
                    wardName: b.wardName || b.wardType,
                    doctorId: b.doctorId,
                    consultantDoctorName: b.consultantDoctorName,
                    admissionDate: b.admissionDate,
                    admissionTime: b.admissionTime,
                    admittingDiagnosis: b.admittingDiagnosis || b.diagnosis || 'Inpatient Clinical Care',
                    status: (b.status === 'OCCUPIED' || b.status === 'DISCHARGE_PLANNED') ? 'ACTIVE' : 'DISCHARGED',
                    dischargeDate: b.dischargeDate,
                    dischargeSummary: b.dischargeSummary,
                    dailyLogs: Array.isArray(b.dailyLogs) ? b.dailyLogs : [],
                    inpatientMedications: Array.isArray(b.inpatientMedications) ? b.inpatientMedications : [],
                    inpatientLabOrders: Array.isArray(b.inpatientLabOrders) ? b.inpatientLabOrders : [],
                    billingCharges: Array.isArray(b.billingCharges) ? b.billingCharges : [],
                    advancePayments: Array.isArray(b.advancePayments) ? b.advancePayments : [],
                    dischargePlan: b.dischargePlan || {}
                  });
                }
              }
            });
          }
        }
      } catch {}

      // C. Fallback / Merge from LocalStorage (Live synchronization across tabs)
      if (typeof window !== 'undefined') {
        const local = localStorage.getItem('nisschay_hospital_beds');
        if (local) {
          try {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed)) {
              parsed.forEach((b: any) => {
                if (b.patientName && (b.status === 'OCCUPIED' || b.status === 'DISCHARGE_PLANNED' || b.dischargeDate || b.admittingDiagnosis)) {
                  const key = b.id || b.ipdNumber || `${b.patientName}-${b.bedNumber}`;
                  if (!seenIds.has(key)) {
                    seenIds.add(key);
                    records.push({
                      ...b,
                      id: b.id,
                      ipdNumber: b.ipdNumber || `IPD-${b.bedNumber}`,
                      patientId: b.patientId,
                      patientName: b.patientName,
                      patientPhone: b.patientPhone,
                      patientAgeGender: b.patientAgeGender || (b.patientAge ? `${b.patientAge}Y/${b.patientGender || 'M'}` : ''),
                      bedNumber: b.bedNumber,
                      wardName: b.wardName || b.wardType,
                      doctorId: b.doctorId,
                      consultantDoctorName: b.consultantDoctorName,
                      admissionDate: b.admissionDate,
                      admissionTime: b.admissionTime,
                      admittingDiagnosis: b.admittingDiagnosis || b.diagnosis || 'Inpatient Clinical Care',
                      status: (b.status === 'OCCUPIED' || b.status === 'DISCHARGE_PLANNED') ? 'ACTIVE' : 'DISCHARGED',
                      dischargeDate: b.dischargeDate,
                      dischargeSummary: b.dischargeSummary,
                      dailyLogs: Array.isArray(b.dailyLogs) ? b.dailyLogs : [],
                      inpatientMedications: Array.isArray(b.inpatientMedications) ? b.inpatientMedications : [],
                      inpatientLabOrders: Array.isArray(b.inpatientLabOrders) ? b.inpatientLabOrders : [],
                      billingCharges: Array.isArray(b.billingCharges) ? b.billingCharges : [],
                      advancePayments: Array.isArray(b.advancePayments) ? b.advancePayments : [],
                      dischargePlan: b.dischargePlan || {}
                    });
                  }
                }
              });
            }
          } catch {}
        }
      }

      // Filter admissions matching this doctor
      const docName = (doctor?.name || '').toLowerCase().replace(/^dr\.?\s*/i, '').trim();
      const docParts = docName.split(/\s+/).filter((p: string) => p.length > 2);

      return records.filter((adm: any) => {
        // Direct ID match
        if (adm.doctorId && adm.doctorId === doctorId) return true;
        if (adm.admittingDoctorId && adm.admittingDoctorId === doctorId) return true;

        const admDoc = (adm.consultantDoctorName || '').toLowerCase().replace(/^dr\.?\s*/i, '').trim();
        
        // Exact / substring match
        if (admDoc && (admDoc.includes(docName) || docName.includes(admDoc))) return true;

        // Partial name parts match (e.g. 'nikhil' or 'saudagre')
        if (docParts.some((part: string) => admDoc.includes(part))) return true;

        // If no consultant doctor assigned on bed or generic default, include under attending doctor
        if (!admDoc || admDoc.includes('attending consultant') || admDoc.includes('duty doctor')) return true;

        return false;
      });
    },
    enabled: !!doctor,
    refetchInterval: 3000,
  });

  // 4. Fetch Doctor Leaves / Out-of-Office Records
  const { data: leaves = [], isLoading: isLeavesLoading } = useQuery<any[]>({
    queryKey: ['doctor-leaves', doctorId],
    queryFn: async () => {
      try {
        const res = await apiClient.get(`/doctors/${doctorId}/leaves`);
        return res.data || [];
      } catch {
        return [];
      }
    },
    enabled: !!doctorId,
  });

  // 5. Fetch all doctors for substitute selection
  const { data: allDoctors = [] } = useQuery<Doctor[]>({
    queryKey: ['doctors-profiles'],
    queryFn: async () => {
      const res = await apiClient.get('/doctors');
      return res.data || [];
    },
  });

  // 5B. Fetch Clinic Profile
  const { data: clinic } = useQuery<Clinic>({
    queryKey: ['clinic'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/clinic');
        return res.data;
      } catch {
        return null;
      }
    },
  });

  // 5C. Fetch Prescription Settings
  const { data: prescriptionSettings } = useQuery<PrescriptionSettings>({
    queryKey: ['prescription-settings'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/prescription-settings');
        return res.data;
      } catch {
        return null;
      }
    },
  });

  // 6. Apply Leave Mutation
  const applyLeaveMutation = useMutation({
    mutationFn: async (payload: { startDate: string; endDate: string; reason?: string; substituteDoctorId?: string }) => {
      const res = await apiClient.post(`/doctors/${doctorId}/leaves`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-leaves', doctorId] });
      setIsLeaveModalOpen(false);
      setLeaveStartDate('');
      setLeaveEndDate('');
      setLeaveReason('');
      setSubstituteDoctorId('');
      setLeaveError('');
    },
    onError: (err: any) => {
      setLeaveError(err?.response?.data?.message || err.message || 'Failed to submit leave application');
    }
  });

  // 7. Cancel Leave Mutation
  const cancelLeaveMutation = useMutation({
    mutationFn: async (leaveId: string) => {
      await apiClient.delete(`/doctors/${doctorId}/leaves/${leaveId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-leaves', doctorId] });
    }
  });

  // 8. Toggle Status Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async () => {
      await apiClient.patch(`/doctors/${doctorId}/status`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor', doctorId] });
      queryClient.invalidateQueries({ queryKey: ['doctors-profiles'] });
    },
  });

  const openTariffsModal = () => {
    if (!doctor) return;
    setTariffForm({
      consultationFee: doctor.consultationFee !== undefined && doctor.consultationFee !== null ? String(doctor.consultationFee) : '500',
      followUpFee: doctor.followUpFee !== undefined && doctor.followUpFee !== null ? String(doctor.followUpFee) : '300',
      emergencyFee: doctor.emergencyFee !== undefined && doctor.emergencyFee !== null ? String(doctor.emergencyFee) : '1000',
      roomNumber: doctor.roomNumber || '',
      slotDuration: doctor.slotDuration || 15,
    });
    setTariffsError('');
    setIsTariffsModalOpen(true);
  };

  const handleFeeInput = (field: 'consultationFee' | 'followUpFee' | 'emergencyFee', val: string) => {
    if (val === '') {
      setTariffForm(prev => ({ ...prev, [field]: '' }));
      return;
    }
    const cleanDigits = val.replace(/[^\d]/g, '');
    const sanitized = cleanDigits.replace(/^0+(?=\d)/, '');
    setTariffForm(prev => ({ ...prev, [field]: sanitized }));
  };

  const openScheduleModal = () => {
    if (!doctor) return;
    setScheduleText(doctor.availabilitySchedule || 'Mon - Sat: 09:00 AM - 01:00 PM, 05:00 PM - 08:30 PM');
    setScheduleError('');
    setIsScheduleModalOpen(true);
  };

  // 9. Update Tariffs Mutation
  const updateTariffsMutation = useMutation({
    mutationFn: async () => {
      if (!doctor) return;
      const cleanConsultationFee = tariffForm.consultationFee === '' ? 0 : Number(tariffForm.consultationFee);
      const cleanFollowUpFee = tariffForm.followUpFee === '' ? 0 : Number(tariffForm.followUpFee);
      const cleanEmergencyFee = tariffForm.emergencyFee === '' ? 0 : Number(tariffForm.emergencyFee);

      const payload = {
        name: doctor.name,
        phone: doctor.phone,
        registrationNumber: doctor.registrationNumber,
        medicalCouncil: doctor.medicalCouncil,
        registrationYear: doctor.registrationYear,
        languagesSpoken: doctor.languagesSpoken,
        gender: doctor.gender,
        subSpecialization: doctor.subSpecialization,
        digitalSignature: doctor.digitalSignature,
        specialization: doctor.specialization || 'General Medicine',
        consultationFee: cleanConsultationFee,
        followUpFee: cleanFollowUpFee,
        emergencyFee: cleanEmergencyFee,
        qualification: doctor.qualification,
        experienceYears: doctor.experienceYears,
        roomNumber: tariffForm.roomNumber && tariffForm.roomNumber.trim() !== '' ? tariffForm.roomNumber.trim() : undefined,
        slotDuration: Number(tariffForm.slotDuration) || 15,
        biography: doctor.biography,
        availabilitySchedule: doctor.availabilitySchedule,
      };
      const res = await apiClient.put(`/doctors/${doctorId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor', doctorId] });
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      queryClient.invalidateQueries({ queryKey: ['doctors-list'] });
      queryClient.invalidateQueries({ queryKey: ['doctors-profiles'] });
      setIsTariffsModalOpen(false);
    },
    onError: (err: any) => {
      setTariffsError(err?.response?.data?.message || err.message || 'Failed to update consultation tariffs.');
    }
  });

  // 10. Update Schedule Mutation
  const updateScheduleMutation = useMutation({
    mutationFn: async () => {
      if (!doctor) return;
      const cleanSchedule = scheduleText.trim();
      const payload = {
        name: doctor.name,
        phone: doctor.phone,
        registrationNumber: doctor.registrationNumber,
        medicalCouncil: doctor.medicalCouncil,
        registrationYear: doctor.registrationYear,
        languagesSpoken: doctor.languagesSpoken,
        gender: doctor.gender,
        subSpecialization: doctor.subSpecialization,
        digitalSignature: doctor.digitalSignature,
        specialization: doctor.specialization || 'General Medicine',
        consultationFee: doctor.consultationFee ?? 500,
        followUpFee: doctor.followUpFee,
        emergencyFee: doctor.emergencyFee,
        qualification: doctor.qualification,
        experienceYears: doctor.experienceYears,
        roomNumber: doctor.roomNumber,
        slotDuration: doctor.slotDuration || 15,
        biography: doctor.biography,
        availabilitySchedule: cleanSchedule || undefined,
      };
      const res = await apiClient.put(`/doctors/${doctorId}`, payload);

      // Record simple admin alert if schedule changed
      if (cleanSchedule && cleanSchedule !== doctor.availabilitySchedule) {
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem('nisschay_admin_schedule_alerts');
            const existing = raw ? JSON.parse(raw) : [];
            const docName = doctor.name.startsWith('Dr.') ? doctor.name : `Dr. ${doctor.name}`;
            const newAlert = {
              id: String(Date.now()),
              doctorName: docName,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            const updated = [newAlert, ...(Array.isArray(existing) ? existing.filter((x: any) => x.id !== newAlert.id) : [])].slice(0, 10);
            localStorage.setItem('nisschay_admin_schedule_alerts', JSON.stringify(updated));
          } catch {}
        }
      }

      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor', doctorId] });
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      queryClient.invalidateQueries({ queryKey: ['doctors-list'] });
      queryClient.invalidateQueries({ queryKey: ['doctors-profiles'] });
      setIsScheduleModalOpen(false);
    },
    onError: (err: any) => {
      setScheduleError(err?.response?.data?.message || err.message || 'Failed to update availability schedule.');
    }
  });

  const getInitials = (name: string) => {
    if (!name) return 'DR';
    const clean = name.replace(/^dr\.?\s*/i, '').trim();
    const parts = clean.split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const isDayActive = (schedule: string | undefined, day: string) => {
    if (!schedule) return true;
    const s = schedule.toLowerCase();
    const d = day.toLowerCase();
    if (s.includes('mon-fri') || s.includes('monday to friday')) {
      return ['mon', 'tue', 'wed', 'thu', 'fri'].includes(d);
    }
    if (s.includes('mon-sat') || s.includes('monday to saturday') || s.includes('daily')) {
      return ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'].includes(d);
    }
    if (s.includes('all days') || s.includes('24x7') || s.includes('sunday')) {
      return true;
    }
    return s.includes(d);
  };

  // Real-time calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const isCurrentlyOnLeave = leaves.some(
    (l: any) => l.status === 'APPROVED' && l.startDate <= todayStr && l.endDate >= todayStr
  );
  const upcomingLeaves = leaves.filter(
    (l: any) => l.status === 'APPROVED' && l.endDate >= todayStr
  );
  const todayAppointments = appointments.filter((a) => a.appointmentDate === todayStr);
  const completedAppointments = appointments.filter((a) => a.status === 'COMPLETED' || Boolean(a.prescription));
  const waitingAppointments = todayAppointments.filter((a) => a.status === 'CHECKED_IN' || a.status === 'SCHEDULED');
  
  const activeInpatients = admissions.filter((a: any) => a.status === 'ACTIVE' || a.status === 'ADMITTED');
  const dischargedInpatients = admissions.filter((a: any) => a.status === 'DISCHARGED');

  const filteredInpatients = admissions.filter((adm: any) => {
    if (ipdFilter === 'ACTIVE' && !(adm.status === 'ACTIVE' || adm.status === 'ADMITTED')) return false;
    if (ipdFilter === 'DISCHARGED' && adm.status !== 'DISCHARGED') return false;

    if (!ipdSearch) return true;
    const q = ipdSearch.toLowerCase();
    return (
      adm.patientName?.toLowerCase().includes(q) ||
      adm.ipdNumber?.toLowerCase().includes(q) ||
      adm.bedNumber?.toLowerCase().includes(q) ||
      adm.wardName?.toLowerCase().includes(q) ||
      adm.admittingDiagnosis?.toLowerCase().includes(q)
    );
  });

  const totalRevenue = completedAppointments.length * (doctor?.consultationFee || 500);

  // Show strictly completed patient prescriptions
  const filteredPrescriptions = completedAppointments.filter((a) => {
    if (!consultationSearch) return true;
    const q = consultationSearch.toLowerCase();
    return (
      a.patientName?.toLowerCase().includes(q) ||
      a.patientPhone?.includes(q) ||
      a.diagnosis?.toLowerCase().includes(q) ||
      a.prescription?.toLowerCase().includes(q) ||
      a.notes?.toLowerCase().includes(q)
    );
  });

  if (isDocLoading) {
    return (
      <div className="w-full p-16 text-center bg-white border border-[#E8EEF2] rounded-2xl shadow-2xs space-y-3 font-sans">
        <div className="w-9 h-9 border-3 border-[#087F8C]/20 border-t-[#087F8C] rounded-full animate-spin mx-auto"></div>
        <p className="text-xs font-semibold text-[#567781]">Loading real-time practitioner file...</p>
      </div>
    );
  }

  if (isDocError || !doctor) {
    return (
      <div className="w-full p-16 text-center bg-white border border-[#E8EEF2] rounded-2xl shadow-2xs space-y-3 font-sans">
        <AlertCircle className="w-10 h-10 text-[#D64545] mx-auto" />
        <h2 className="text-base font-bold text-[#172B34]">Doctor File Not Found</h2>
        <p className="text-xs text-[#567781]">{(docError as Error)?.message || 'The requested doctor record could not be found.'}</p>
        <Link href="/doctors">
          <Button variant="outline" size="sm" className="mt-2 text-xs border-[#E8EEF2] text-[#567781] hover:text-[#172B34]">
            Back to Doctors Directory
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-16 font-sans">
      {/* 1. TOP HEADER BANNER - Simple English & Quick Actions */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-[#E8EEF2] shadow-2xs p-5 sm:p-6 transition-all no-print space-y-4">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-[#087F8C]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-10 w-48 h-48 bg-[#4FA8DB]/5 rounded-full blur-2xl pointer-events-none" />

        {/* Row 1: Doctor Profile (Avatar + Full Name + Specialization) */}
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
            <Link
              href="/doctors"
              className="p-2 rounded-xl bg-[#F6F9FB] border border-[#E8EEF2] text-[#567781] hover:text-[#087F8C] hover:border-[#087F8C]/40 transition-colors shadow-2xs cursor-pointer shrink-0"
              title="Back to Doctors Directory"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            {/* Circular Avatar with Active Indicator */}
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-full bg-[#087F8C]/10 text-[#087F8C] border border-[#087F8C]/20 flex items-center justify-center font-extrabold text-base shadow-2xs">
                {getInitials(doctor.name)}
              </div>
              <span
                className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                  isCurrentlyOnLeave
                    ? 'bg-[#E9A23B]'
                    : doctor.active ? 'bg-[#22A06B]' : 'bg-[#94A3B8]'
                }`}
                title={isCurrentlyOnLeave ? 'On approved leave' : doctor.active ? 'Active on duty' : 'Inactive'}
              />
            </div>

            {/* Doctor Name & Specialization */}
            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-extrabold text-[#172B34] tracking-tight">
                  {doctor.name}
                </h1>
                <span className="inline-block px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-[#087F8C]/10 text-[#087F8C] border border-[#087F8C]/20">
                  {doctor.employeeId || `DOC-2026-${doctor.id.slice(0, 4).toUpperCase()}`}
                </span>
                {isCurrentlyOnLeave && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-[#E9A23B]/15 text-[#D97706] border border-[#E9A23B]/30">
                    <CalendarOff className="w-3 h-3" />
                    <span>On Leave Today</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-[#567781]">
                  {doctor.specialization || 'General Medicine'}
                </span>
                {doctor.qualification && (
                  <span className="text-xs text-[#567781] font-medium">
                    • {doctor.qualification}
                  </span>
                )}
                {doctor.roomNumber && (
                  <span className="text-xs text-[#087F8C] font-semibold">
                    • Room {doctor.roomNumber}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 flex-wrap w-full lg:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLeaveModalOpen(true)}
              className="flex-1 sm:flex-none min-h-[38px] border-[#E8EEF2] bg-[#F6F9FB] hover:bg-white text-[#D97706] hover:border-[#E9A23B]/40 font-bold text-xs rounded-xl shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 px-3"
            >
              <CalendarOff className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Mark Out-of-Office</span>
            </Button>

            <Link href={`/appointments/new?doctorId=${doctor.id}`} className="flex-1 sm:flex-none">
              <Button className="w-full min-h-[38px] bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs px-3.5 rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5 border-0">
                <CalendarPlus className="w-3.5 h-3.5" />
                <span>Book OPD Patient</span>
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleStatusMutation.mutate()}
              className="min-h-[38px] border-[#E8EEF2] bg-white text-[#567781] hover:text-[#172B34] font-bold text-xs rounded-xl shadow-2xs cursor-pointer px-3"
            >
              {doctor.active ? (
                <span className="flex items-center gap-1.5">
                  <UserX className="w-3.5 h-3.5 text-[#567781]" />
                  <span>Deactivate</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[#22A06B]">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Activate</span>
                </span>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="min-h-[38px] border-[#E8EEF2] bg-white text-[#567781] hover:text-[#172B34] hover:border-[#087F8C]/40 font-bold text-xs rounded-xl shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 px-3"
            >
              <Edit2 className="w-3.5 h-3.5 text-[#567781]" />
              <span>Edit File</span>
            </Button>
          </div>
        </div>

        {/* Row 2: Metadata Strip */}
        <div className="relative z-10 pt-2.5 border-t border-[#E8EEF2]/80 flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-[#F6F9FB] px-3.5 sm:px-4 py-2.5 rounded-xl text-xs">
          <div className="flex items-center gap-3 sm:gap-4 text-[#567781] flex-wrap">
            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[#087F8C]" />
              <span>Mobile: <strong className="text-[#172B34] font-mono">{doctor.phone || 'Not provided'}</strong></span>
            </div>

            <span className="text-[#CBD5E1] hidden sm:inline">•</span>

            <div className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#567781]" />
              <span>Email: <strong className="text-[#172B34] font-mono">{doctor.email}</strong></span>
            </div>

            {doctor.registrationNumber && (
              <>
                <span className="text-[#CBD5E1] hidden sm:inline">•</span>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#22A06B]" />
                  <span>NMC Reg: <strong className="text-[#172B34] font-mono">{doctor.registrationNumber}</strong></span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#22A06B] flex items-center gap-1 bg-[#22A06B]/10 px-2.5 py-0.5 rounded-md border border-[#22A06B]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22A06B] animate-pulse" />
              <span>Live Synced</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. REAL-TIME STATS STRIP (Balanced Grid for Mobile/iPad) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
        <div className="bg-white border border-[#E8EEF2] rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-[#567781] uppercase tracking-wider block truncate">Total Consultations</span>
          <div className="text-xl sm:text-2xl font-extrabold text-[#172B34]">{appointments.length}</div>
          <span className="text-[10px] text-[#567781] truncate block">All-time records</span>
        </div>

        <div className="bg-white border border-[#E8EEF2] rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-[#087F8C] uppercase tracking-wider block truncate">Today's OPD Queue</span>
          <div className="text-xl sm:text-2xl font-extrabold text-[#087F8C]">{todayAppointments.length}</div>
          <span className="text-[10px] text-[#087F8C] truncate block">{waitingAppointments.length} awaiting consult</span>
        </div>

        <div className="bg-white border border-[#E8EEF2] rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-[#22A06B] uppercase tracking-wider block truncate">Completed OPD</span>
          <div className="text-xl sm:text-2xl font-extrabold text-[#22A06B]">{completedAppointments.length}</div>
          <span className="text-[10px] text-[#22A06B] truncate block">Prescriptions finalized</span>
        </div>

        <div className="bg-white border border-[#E8EEF2] rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-[#4FA8DB] uppercase tracking-wider block truncate">Admitted Inpatients</span>
          <div className="text-xl sm:text-2xl font-extrabold text-[#4FA8DB]">{activeInpatients.length}</div>
          <span className="text-[10px] text-[#4FA8DB] truncate block">Under primary care</span>
        </div>

        <div className="bg-white border border-[#E8EEF2] rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold text-[#E9A23B] uppercase tracking-wider block truncate">Consultation Fee</span>
          <div className="text-xl sm:text-2xl font-extrabold text-[#172B34]">₹{doctor.consultationFee ?? 500}</div>
          <span className="text-[10px] text-[#567781] truncate block">Est Revenue: ₹{totalRevenue.toLocaleString()}</span>
        </div>
      </div>

      {/* 3. WORKSTATION TABS (Touch-Optimized for iPad & Mobile) */}
      <div className="flex items-center gap-1.5 sm:gap-2 bg-[#F6F9FB] p-1.5 rounded-2xl border border-[#E8EEF2] overflow-x-auto scrollbar-none -mx-1 px-1">
        <button
          onClick={() => setActiveTab('INFO')}
          className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap min-h-[44px] shrink-0 sm:flex-1 ${
            activeTab === 'INFO'
              ? 'bg-white text-[#172B34] shadow-xs border border-[#E8EEF2]'
              : 'text-[#567781] hover:text-[#172B34]'
          }`}
        >
          <User className="w-4 h-4 text-[#087F8C] shrink-0" />
          <span>Doctor Info</span>
        </button>

        <button
          onClick={() => setActiveTab('CONSULTATIONS')}
          className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap min-h-[44px] shrink-0 sm:flex-1 ${
            activeTab === 'CONSULTATIONS'
              ? 'bg-white text-[#172B34] shadow-xs border border-[#E8EEF2]'
              : 'text-[#567781] hover:text-[#172B34]'
          }`}
        >
          <FileText className="w-4 h-4 text-[#087F8C] shrink-0" />
          <span>Prescriptions ({completedAppointments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('INPATIENTS')}
          className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap min-h-[44px] shrink-0 sm:flex-1 ${
            activeTab === 'INPATIENTS'
              ? 'bg-white text-[#172B34] shadow-xs border border-[#E8EEF2]'
              : 'text-[#567781] hover:text-[#172B34]'
          }`}
        >
          <BedDouble className="w-4 h-4 text-[#4FA8DB] shrink-0" />
          <span>Inpatients ({admissions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SCHEDULE')}
          className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap min-h-[44px] shrink-0 sm:flex-1 ${
            activeTab === 'SCHEDULE'
              ? 'bg-white text-[#172B34] shadow-xs border border-[#E8EEF2]'
              : 'text-[#567781] hover:text-[#172B34]'
          }`}
        >
          <Clock className="w-4 h-4 text-[#E9A23B] shrink-0" />
          <span>OPD Hours</span>
        </button>

        <button
          onClick={() => setActiveTab('LEAVES')}
          className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap min-h-[44px] shrink-0 sm:flex-1 ${
            activeTab === 'LEAVES'
              ? 'bg-white text-[#172B34] shadow-xs border border-[#E8EEF2]'
              : 'text-[#567781] hover:text-[#172B34]'
          }`}
        >
          <CalendarOff className="w-4 h-4 text-[#D97706] shrink-0" />
          <span>Leaves {upcomingLeaves.length > 0 && `(${upcomingLeaves.length})`}</span>
        </button>
      </div>

      {/* 4. WORKSTATION CONTENT */}

      {/* TAB 1: DOCTOR INFORMATION (FORM DETAILS) */}
      {activeTab === 'INFO' && (
        <div className="space-y-5">
          {/* Top Quick Profile Header Card */}
          <div className="bg-white border border-[#E8EEF2] rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#087F8C]/10 text-[#087F8C] border border-[#087F8C]/20 flex items-center justify-center font-extrabold text-base">
                <Stethoscope className="w-6 h-6 text-[#087F8C]" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#172B34] flex items-center gap-2">
                  <span>{doctor.name}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                    doctor.active
                      ? 'bg-[#22A06B]/10 text-[#22A06B] border-[#22A06B]/20'
                      : 'bg-[#94A3B8]/10 text-[#94A3B8] border-[#94A3B8]/20'
                  }`}>
                    {doctor.active ? 'Active on Duty' : 'Inactive'}
                  </span>
                </h3>
                <p className="text-xs text-[#567781] mt-0.5">
                  {doctor.qualification || 'MBBS'} • {doctor.specialization || 'General Medicine'} {doctor.subSpecialization ? `(${doctor.subSpecialization})` : ''}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8.5 border-[#E8EEF2] bg-[#F6F9FB] hover:bg-white text-[#087F8C] hover:border-[#087F8C]/40 font-bold text-xs rounded-xl shadow-2xs cursor-pointer flex items-center gap-1.5 px-3.5"
            >
              <Edit2 className="w-3.5 h-3.5 text-[#087F8C]" />
              <span>Edit Doctor Information</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Card 1: Basic Profile & Login Account */}
            <div className="bg-white border border-[#E8EEF2] rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-[#E8EEF2] pb-3">
                <User className="w-4 h-4 text-[#087F8C]" />
                <h3 className="text-sm font-extrabold text-[#172B34]">1. Basic Profile & Login Account</h3>
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-[#E8EEF2]/60">
                  <span className="text-[#567781] font-medium">Doctor Full Name:</span>
                  <strong className="text-[#172B34] font-bold">{doctor.name}</strong>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#E8EEF2]/60">
                  <span className="text-[#567781] font-medium">Gender:</span>
                  <strong className="text-[#172B34] font-semibold">{doctor.gender || 'Not specified'}</strong>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#E8EEF2]/60">
                  <span className="text-[#567781] font-medium">Mobile Phone:</span>
                  <strong className="text-[#172B34] font-mono font-bold">{doctor.phone || 'Not provided'}</strong>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#E8EEF2]/60">
                  <span className="text-[#567781] font-medium">Portal Email (Login ID):</span>
                  <strong className="text-[#172B34] font-mono font-semibold">{doctor.email}</strong>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#E8EEF2]/60">
                  <span className="text-[#567781] font-medium">Languages Spoken:</span>
                  <strong className="text-[#172B34] font-semibold">{doctor.languagesSpoken || 'English, Hindi'}</strong>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#E8EEF2]/60">
                  <span className="text-[#567781] font-medium">Clinical Experience:</span>
                  <strong className="text-[#172B34] font-semibold">{doctor.experienceYears ? `${doctor.experienceYears} Years` : 'Not specified'}</strong>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-[#567781] font-medium">Practitioner Code:</span>
                  <strong className="text-[#087F8C] font-mono font-bold">{doctor.employeeId || `DOC-2026-${doctor.id.slice(0, 4).toUpperCase()}`}</strong>
                </div>
              </div>
            </div>

            {/* Card 2: Medical Registration & Credentials */}
            <div className="bg-white border border-[#E8EEF2] rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-3">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#22A06B]" />
                  <h3 className="text-sm font-extrabold text-[#172B34]">2. Medical Council Credentials</h3>
                </div>
                <span className="text-[10px] font-mono text-[#567781] bg-[#F6F9FB] px-2 py-0.5 rounded border border-[#E8EEF2]">NMC REGISTERED</span>
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-[#E8EEF2]/60">
                  <span className="text-[#567781] font-medium">Primary Specialization:</span>
                  <strong className="text-[#172B34] font-bold">{doctor.specialization || 'General Medicine'}</strong>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#E8EEF2]/60">
                  <span className="text-[#567781] font-medium">Sub-Specialty / Clinical Focus:</span>
                  <strong className="text-[#172B34] font-semibold">{doctor.subSpecialization || 'General Clinical Practice'}</strong>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#E8EEF2]/60">
                  <span className="text-[#567781] font-medium">Degrees & Qualifications:</span>
                  <strong className="text-[#172B34] font-semibold">{doctor.qualification || 'MBBS'}</strong>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#E8EEF2]/60">
                  <span className="text-[#567781] font-medium">Council Registration No:</span>
                  <strong className="text-[#172B34] font-mono font-bold uppercase">{doctor.registrationNumber || 'Not specified'}</strong>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#E8EEF2]/60">
                  <span className="text-[#567781] font-medium">State Medical Council:</span>
                  <strong className="text-[#172B34] font-semibold">{doctor.medicalCouncil || 'Not specified'}</strong>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-[#567781] font-medium">Registration Year:</span>
                  <strong className="text-[#172B34] font-mono font-bold">{doctor.registrationYear || 'Not specified'}</strong>
                </div>
              </div>
            </div>

            {/* Card 3: Consultation Fees & OPD Chamber Setup */}
            <div className="bg-white border border-[#E8EEF2] rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-3">
                <div className="flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-[#087F8C]" />
                  <h3 className="text-sm font-extrabold text-[#172B34]">3. Consultation Fees & OPD Chamber</h3>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openTariffsModal}
                  className="h-7 text-xs font-bold text-[#087F8C] border-[#087F8C]/30 hover:bg-[#087F8C]/10 cursor-pointer shadow-2xs flex items-center gap-1.5 px-2.5 rounded-lg"
                >
                  <Edit2 className="w-3 h-3 text-[#087F8C]" />
                  <span>Update Tariffs</span>
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-[#F6F9FB] p-3 rounded-xl border border-[#E8EEF2]">
                  <span className="text-[10px] font-bold text-[#567781] uppercase tracking-wider block">Standard OPD</span>
                  <strong className="text-base sm:text-lg font-extrabold text-[#087F8C]">₹{doctor.consultationFee ?? 500}</strong>
                </div>
                <div className="bg-[#F6F9FB] p-3 rounded-xl border border-[#E8EEF2]">
                  <span className="text-[10px] font-bold text-[#567781] uppercase tracking-wider block">Follow-up</span>
                  <strong className="text-base sm:text-lg font-extrabold text-[#172B34]">₹{doctor.followUpFee ?? 300}</strong>
                </div>
                <div className="bg-[#F6F9FB] p-3 rounded-xl border border-[#E8EEF2]">
                  <span className="text-[10px] font-bold text-[#567781] uppercase tracking-wider block">Emergency</span>
                  <strong className="text-base sm:text-lg font-extrabold text-[#D64545]">₹{doctor.emergencyFee ?? 1000}</strong>
                </div>
              </div>
              <div className="space-y-2 text-xs pt-1">
                <div className="flex items-center justify-between py-1 border-b border-[#E8EEF2]/60">
                  <span className="text-[#567781] font-medium">OPD Chamber / Room:</span>
                  <strong className="text-[#172B34] font-semibold">{doctor.roomNumber ? `Room ${doctor.roomNumber}` : 'General OPD Chamber'}</strong>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-[#567781] font-medium">Appointment Slot Duration:</span>
                  <strong className="text-[#172B34] font-semibold">{doctor.slotDuration || 15} Minutes per Patient</strong>
                </div>
              </div>
            </div>

            {/* Card 4: Operating Hours & Weekly Schedule */}
            <div className="bg-white border border-[#E8EEF2] rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#E9A23B]" />
                  <h3 className="text-sm font-extrabold text-[#172B34]">4. Operating Hours & Schedule</h3>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openScheduleModal}
                  className="h-7 text-xs font-bold text-[#E9A23B] border-[#E9A23B]/30 hover:bg-[#E9A23B]/10 cursor-pointer shadow-2xs flex items-center gap-1.5 px-2.5 rounded-lg"
                >
                  <Edit2 className="w-3 h-3 text-[#E9A23B]" />
                  <span>Update Hours</span>
                </Button>
              </div>
              <div className="space-y-3 text-xs">
                <div className="bg-[#F6F9FB] p-3 rounded-xl border border-[#E8EEF2] space-y-1">
                  <span className="text-[10px] font-bold text-[#567781] uppercase tracking-wider block">Weekly OPD Timings</span>
                  <p className="text-xs font-semibold text-[#172B34]">
                    {doctor.availabilitySchedule || 'Mon - Sat: 09:00 AM - 01:00 PM, 05:00 PM - 08:30 PM'}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-[#567781] uppercase tracking-wider block">Active Working Days</span>
                  <div className="grid grid-cols-7 gap-1.5 text-center">
                    {WEEK_DAYS.map((day) => {
                      const active = isDayActive(doctor.availabilitySchedule, day);
                      return (
                        <div
                          key={day}
                          className={`py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${
                            active
                              ? 'bg-[#087F8C]/10 text-[#087F8C] border border-[#087F8C]/30'
                              : 'bg-[#F6F9FB] text-[#94A3B8] border border-[#E8EEF2]'
                          }`}
                        >
                          {day}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Card 5: Clinical Biography & Prescription Stamp */}
            <div className="md:col-span-2 bg-white border border-[#E8EEF2] rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-[#E8EEF2] pb-3">
                <PenTool className="w-4 h-4 text-[#087F8C]" />
                <h3 className="text-sm font-extrabold text-[#172B34]">5. Clinical Biography & Prescription Stamp</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] space-y-1">
                  <span className="text-[10px] font-bold text-[#087F8C] uppercase tracking-wider block">Digital Prescription Stamp Line</span>
                  <p className="font-mono text-[#172B34] font-bold text-xs">{doctor.digitalSignature || `Dr. ${doctor.name}, ${doctor.qualification || 'MBBS'}, Reg: ${doctor.registrationNumber || 'NMC'}`}</p>
                </div>
                <div className="p-3.5 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] space-y-1">
                  <span className="text-[10px] font-bold text-[#567781] uppercase tracking-wider block">Doctor Clinical Background / Summary</span>
                  <p className="text-xs text-[#172B34] font-medium whitespace-pre-line leading-relaxed">
                    {doctor.biography || 'No clinical biography recorded. Click "Edit Doctor Information" above to add practitioner summary.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COMPLETED PATIENT PRESCRIPTIONS */}
      {activeTab === 'CONSULTATIONS' && (
        <div className="bg-white border border-[#E8EEF2] rounded-2xl shadow-2xs overflow-hidden">
          {/* Header & Simple Search */}
          <div className="p-4 border-b border-[#E8EEF2] flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#567781] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={consultationSearch}
                onChange={(e) => setConsultationSearch(e.target.value)}
                placeholder="Search completed prescriptions by patient, phone, drug, or diagnosis..."
                className="w-full pl-9 pr-3 h-9 text-xs rounded-xl bg-[#F6F9FB] border border-[#E8EEF2] focus:outline-none focus:border-[#087F8C] focus:bg-white text-[#172B34]"
              />
            </div>
            <span className="text-xs font-bold text-[#567781] shrink-0">
              {filteredPrescriptions.length} Completed Prescription Records
            </span>
          </div>

          {filteredPrescriptions.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <FileText className="w-10 h-10 text-[#CBD5E1] mx-auto" />
              <p className="text-xs font-bold text-[#172B34]">No completed prescriptions recorded for this doctor</p>
              <p className="text-[11px] text-[#567781]">
                When Dr. {doctor.name} completes an OPD consultation and prescribes medications, the completed records appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[680px]">
                <thead className="bg-[#F6F9FB] text-[#567781] uppercase font-bold text-[10px] tracking-wider border-b border-[#E8EEF2]">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Patient Name & ID</th>
                    <th className="py-3 px-4">Diagnosis</th>
                    <th className="py-3 px-4">Prescribed Regimen (Rx)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EEF2]">
                  {filteredPrescriptions.map((appt) => (
                    <tr key={appt.id} className="hover:bg-[#F6F9FB]/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#172B34]">{appt.appointmentDate}</div>
                        <div className="text-[11px] text-[#567781] font-mono">{appt.startTime || '10:00 AM'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <Link href={`/patients/${appt.patientId}`} className="font-bold text-[#087F8C] hover:underline flex items-center gap-1">
                          <span>{appt.patientName || 'Patient'}</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                        {appt.patientPhone && (
                          <div className="text-[11px] font-mono text-[#567781]">{appt.patientPhone}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {appt.diagnosis ? (
                          <div className="font-semibold text-[#172B34]">{appt.diagnosis}</div>
                        ) : (
                          <span className="text-[#94A3B8] italic">Clinical Examination</span>
                        )}
                        {appt.notes && (
                          <div className="text-[10.5px] text-[#567781] truncate max-w-[180px]">{appt.notes}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {appt.prescription ? (
                          <div className="text-[11px] text-[#22A06B] font-semibold truncate max-w-[240px]">
                            Rx: {appt.prescription}
                          </div>
                        ) : (
                          <span className="text-[#94A3B8] italic">Advice only</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide bg-[#22A06B]/10 text-[#22A06B] border border-[#22A06B]/20">
                          COMPLETED
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setViewingPrescriptionAppt(appt)}
                          className="h-7 text-[11px] font-bold text-[#087F8C] border-[#087F8C]/30 hover:bg-[#087F8C]/10 cursor-pointer shadow-2xs"
                        >
                          <FileText className="w-3.5 h-3.5 mr-1" />
                          <span>View Prescription</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INPATIENT ADMISSIONS & CLINICAL HISTORY */}
      {activeTab === 'INPATIENTS' && (
        <div className="bg-white border border-[#E8EEF2] rounded-2xl shadow-2xs overflow-hidden space-y-0">
          {/* IPD Header & Control Toolbar */}
          <div className="p-4 border-b border-[#E8EEF2] flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none max-w-full pb-1 sm:pb-0">
              <div className="flex bg-[#F6F9FB] p-1 rounded-xl border border-[#E8EEF2] shrink-0">
                <button
                  type="button"
                  onClick={() => setIpdFilter('ALL')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    ipdFilter === 'ALL'
                      ? 'bg-[#172B34] text-white shadow-2xs'
                      : 'text-[#567781] hover:text-[#172B34]'
                  }`}
                >
                  All IPD History ({admissions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setIpdFilter('ACTIVE')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    ipdFilter === 'ACTIVE'
                      ? 'bg-[#087F8C] text-white shadow-2xs'
                      : 'text-[#567781] hover:text-[#172B34]'
                  }`}
                >
                  Currently Admitted ({activeInpatients.length})
                </button>
                <button
                  type="button"
                  onClick={() => setIpdFilter('DISCHARGED')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    ipdFilter === 'DISCHARGED'
                      ? 'bg-slate-700 text-white shadow-2xs'
                      : 'text-[#567781] hover:text-[#172B34]'
                  }`}
                >
                  Discharged Cases ({dischargedInpatients.length})
                </button>
              </div>
            </div>

            {/* IPD Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-[#567781] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={ipdSearch}
                onChange={(e) => setIpdSearch(e.target.value)}
                placeholder="Search IPD by patient, IPD No, bed, ward, diagnosis..."
                className="w-full pl-9 pr-3 h-9 text-xs rounded-xl bg-[#F6F9FB] border border-[#E8EEF2] focus:outline-none focus:border-[#087F8C] focus:bg-white text-[#172B34]"
              />
            </div>
          </div>

          {filteredInpatients.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <BedDouble className="w-10 h-10 text-[#CBD5E1] mx-auto" />
              <p className="text-xs font-bold text-[#172B34]">No inpatient admission records found</p>
              <p className="text-[11px] text-[#567781]">
                {ipdFilter === 'ACTIVE'
                  ? 'There are no active patients currently admitted under Dr. ' + doctor.name
                  : 'Patients admitted under this doctor across general wards and ICU will appear here.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[720px]">
                <thead className="bg-[#F6F9FB] text-[#567781] uppercase font-bold text-[10px] tracking-wider border-b border-[#E8EEF2]">
                  <tr>
                    <th className="py-3 px-4">Patient Name & ID</th>
                    <th className="py-3 px-4">IPD No & Bed / Ward</th>
                    <th className="py-3 px-4">Admission Date & Duration</th>
                    <th className="py-3 px-4">Admitting Diagnosis / Notes</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EEF2]">
                  {filteredInpatients.map((adm: any) => {
                    const isAdmitted = adm.status === 'ACTIVE' || adm.status === 'ADMITTED';
                    const admDate = adm.admissionDate
                      ? new Date(adm.admissionDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—';
                    const disDate = adm.dischargeDate
                      ? new Date(adm.dischargeDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : null;

                    return (
                      <tr key={adm.id} className="hover:bg-[#F6F9FB]/60 transition-colors">
                        <td className="py-3 px-4">
                          <Link
                            href={`/patients/${adm.patientId}?tab=inpatient`}
                            className="font-bold text-[#087F8C] hover:underline flex items-center gap-1.5"
                          >
                            <span>{adm.patientName || 'Patient'}</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                          <span className="text-[10px] font-mono text-[#567781]">
                            UHID-{adm.patientId?.slice(0, 8)?.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-[#172B34] text-[11px]">
                            {adm.ipdNumber || 'IPD-ACTIVE'}
                          </div>
                          <div className="text-[11px] text-[#087F8C] font-semibold">
                            {adm.bedNumber || 'General Bed'} • {adm.wardName || 'Inpatient Ward'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#172B34]">{admDate}</div>
                          <div className="text-[11px] text-[#567781]">
                            {disDate ? `Discharged: ${disDate}` : 'Stay in progress'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#172B34]">
                            {adm.admittingDiagnosis || 'Inpatient Medical Care'}
                          </div>
                          {adm.dischargeSummary && (
                            <div className="text-[10.5px] text-[#567781] truncate max-w-xs">
                              Summary: {adm.dischargeSummary}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wide ${
                              isAdmitted
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : adm.status === 'DISCHARGE_PLANNED'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {isAdmitted && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                            <span>{adm.status?.replace('_', ' ')}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link href={`/patients/${adm.patientId}?tab=inpatient`}>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] font-bold text-[#087F8C] border-[#087F8C]/30 hover:bg-[#087F8C]/10 cursor-pointer shadow-2xs"
                            >
                              <BedDouble className="w-3.5 h-3.5 mr-1" />
                              <span>Open Inpatient File</span>
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: OPD SCHEDULE & CHARGES */}
      {activeTab === 'SCHEDULE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white border border-[#E8EEF2] rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-3">
              <div className="flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-[#087F8C]" />
                <h3 className="text-sm font-extrabold text-[#172B34]">Consultation Tariffs</h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={openTariffsModal}
                className="h-7 text-xs font-bold text-[#087F8C] border-[#087F8C]/30 hover:bg-[#087F8C]/10 cursor-pointer shadow-2xs flex items-center gap-1.5 px-2.5 rounded-lg"
              >
                <Edit2 className="w-3 h-3 text-[#087F8C]" />
                <span>Update Tariffs</span>
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-[#F6F9FB] p-3.5 rounded-xl border border-[#E8EEF2]">
                <span className="text-[10px] font-bold text-[#567781] uppercase tracking-wider block">Standard OPD</span>
                <strong className="text-lg font-extrabold text-[#087F8C]">₹{doctor.consultationFee ?? 500}</strong>
              </div>
              <div className="bg-[#F6F9FB] p-3.5 rounded-xl border border-[#E8EEF2]">
                <span className="text-[10px] font-bold text-[#567781] uppercase tracking-wider block">Follow-up</span>
                <strong className="text-lg font-extrabold text-[#172B34]">₹{doctor.followUpFee ?? 300}</strong>
              </div>
              <div className="bg-[#F6F9FB] p-3.5 rounded-xl border border-[#E8EEF2]">
                <span className="text-[10px] font-bold text-[#567781] uppercase tracking-wider block">Emergency</span>
                <strong className="text-lg font-extrabold text-[#D64545]">₹{doctor.emergencyFee ?? 1000}</strong>
              </div>
            </div>
            <div className="space-y-2 text-xs pt-1">
              <div className="flex items-center justify-between py-1 border-b border-[#E8EEF2]/60">
                <span className="text-[#567781] font-medium">Chamber Room:</span>
                <strong className="text-[#172B34] font-semibold">{doctor.roomNumber ? `Room ${doctor.roomNumber}` : 'General OPD'}</strong>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[#567781] font-medium">Slot Duration:</span>
                <strong className="text-[#172B34] font-semibold">{doctor.slotDuration || 15} Minutes</strong>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#E8EEF2] rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#087F8C]" />
                <h3 className="text-sm font-extrabold text-[#172B34]">Weekly Availability Hours</h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={openScheduleModal}
                className="h-7 text-xs font-bold text-[#087F8C] border-[#087F8C]/30 hover:bg-[#087F8C]/10 cursor-pointer shadow-2xs flex items-center gap-1.5 px-2.5 rounded-lg"
              >
                <Edit2 className="w-3 h-3 text-[#087F8C]" />
                <span>Update Schedule</span>
              </Button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="bg-[#F6F9FB] p-3 rounded-xl border border-[#E8EEF2] space-y-1">
                <span className="text-[10px] font-bold text-[#567781] uppercase tracking-wider block">Operating Hours</span>
                <p className="text-xs font-semibold text-[#172B34]">
                  {doctor.availabilitySchedule || 'Mon - Sat: 09:00 AM - 01:00 PM, 05:00 PM - 08:30 PM'}
                </p>
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-[#567781] uppercase tracking-wider block">Active Weekly Days</span>
                <div className="grid grid-cols-7 gap-1.5 text-center">
                  {WEEK_DAYS.map((day) => {
                    const active = isDayActive(doctor.availabilitySchedule, day);
                    return (
                      <div
                        key={day}
                        className={`py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${
                          active
                            ? 'bg-[#087F8C]/10 text-[#087F8C] border border-[#087F8C]/30'
                            : 'bg-[#F6F9FB] text-[#94A3B8] border border-[#E8EEF2]'
                        }`}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: LEAVES & OUT-OF-OFFICE */}
      {activeTab === 'LEAVES' && (
        <div className="space-y-5">
          {/* Top Banner & Quick Action */}
          <div className="bg-white border border-[#E8EEF2] rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/20 flex items-center justify-center font-extrabold text-base">
                <CalendarOff className="w-6 h-6 text-[#D97706]" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#172B34] flex items-center gap-2">
                  <span>Leaves & Out-of-Office Roster</span>
                  {isCurrentlyOnLeave ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                      Currently On Leave
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Available for Appointments
                    </span>
                  )}
                </h3>
                <p className="text-xs text-[#567781] mt-0.5">
                  Book leaves, configure substitute practitioners, and protect OPD slots from double-booking.
                </p>
              </div>
            </div>

            <Button
              onClick={() => setIsLeaveModalOpen(true)}
              className="h-9 bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 px-4"
            >
              <Plus className="w-4 h-4" />
              <span>Apply Leave / Mark Out-of-Office</span>
            </Button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-[#E8EEF2] rounded-2xl p-4 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-[#567781] uppercase tracking-wider block">Upcoming Leaves</span>
              <div className="text-2xl font-extrabold text-[#D97706]">{upcomingLeaves.length}</div>
              <span className="text-[10px] text-[#567781]">Scheduled vacation & medical leaves</span>
            </div>

            <div className="bg-white border border-[#E8EEF2] rounded-2xl p-4 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-[#567781] uppercase tracking-wider block">Total Leaves Logged</span>
              <div className="text-2xl font-extrabold text-[#172B34]">{leaves.length}</div>
              <span className="text-[10px] text-[#567781]">Historical recorded periods</span>
            </div>

            <div className="bg-white border border-[#E8EEF2] rounded-2xl p-4 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-[#567781] uppercase tracking-wider block">Substitute Doctor Handover</span>
              <div className="text-2xl font-extrabold text-[#22A06B]">
                {leaves.filter((l: any) => l.substituteDoctorName).length}
              </div>
              <span className="text-[10px] text-[#567781]">Leaves covered by peer doctors</span>
            </div>
          </div>

          {/* Leaves Table */}
          <div className="bg-white border border-[#E8EEF2] rounded-2xl shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-[#E8EEF2] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#087F8C]" />
                <h3 className="text-sm font-extrabold text-[#172B34]">Leave Schedule & Out-of-Office Periods</h3>
              </div>
              <span className="text-xs font-bold text-[#567781]">{leaves.length} Total Records</span>
            </div>

            {leaves.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <CalendarOff className="w-10 h-10 text-[#CBD5E1] mx-auto" />
                <p className="text-xs font-bold text-[#172B34]">No leaves or out-of-office records registered</p>
                <p className="text-[11px] text-[#567781]">
                  When this doctor takes annual leave, sick leave, or conference travel, register dates here to automatically prevent OPD patient booking clashes.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsLeaveModalOpen(true)}
                  className="mt-3 text-xs font-bold text-[#087F8C] border-[#087F8C]/30 hover:bg-[#087F8C]/10 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Mark First Leave Period
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[680px]">
                  <thead className="bg-[#F6F9FB] text-[#567781] uppercase font-bold text-[10px] tracking-wider border-b border-[#E8EEF2]">
                    <tr>
                      <th className="py-3 px-4">Duration & Dates</th>
                      <th className="py-3 px-4">Days</th>
                      <th className="py-3 px-4">Reason / Purpose</th>
                      <th className="py-3 px-4">Substitute Coverage</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8EEF2]">
                    {leaves.map((leave: any) => {
                      const start = new Date(leave.startDate);
                      const end = new Date(leave.endDate);
                      const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                      const isPast = leave.endDate < todayStr;
                      const isCurrent = leave.startDate <= todayStr && leave.endDate >= todayStr;

                      return (
                        <tr key={leave.id} className="hover:bg-[#F6F9FB]/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-[#172B34] flex items-center gap-1.5 font-mono">
                              <span>{leave.startDate}</span>
                              <span className="text-slate-400">→</span>
                              <span>{leave.endDate}</span>
                            </div>
                            <div className="text-[10px] text-[#567781] mt-0.5">
                              {isCurrent ? (
                                <span className="text-amber-600 font-bold">Active Today</span>
                              ) : isPast ? (
                                <span className="text-slate-400">Completed Past Leave</span>
                              ) : (
                                <span className="text-[#087F8C] font-semibold">Upcoming Scheduled</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-[#172B34]">
                            {diffDays} {diffDays === 1 ? 'Day' : 'Days'}
                          </td>
                          <td className="py-3.5 px-4 text-[#172B34]">
                            <span className="font-medium">{leave.reason || 'Personal / General Leave'}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            {leave.substituteDoctorName ? (
                              <div className="flex items-center gap-1.5 text-xs font-bold text-[#087F8C]">
                                <UserCheck2 className="w-3.5 h-3.5 text-[#087F8C]" />
                                <span>{leave.substituteDoctorName}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">No substitute assigned</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              leave.status === 'APPROVED'
                                ? 'bg-[#22A06B]/10 text-[#22A06B]'
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              {leave.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {leave.status === 'APPROVED' && !isPast && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => cancelLeaveMutation.mutate(leave.id)}
                                className="h-7 text-[11px] font-bold text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Cancel Leave
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. EDIT DOCTOR MODAL */}
      {isEditing && (
        <div className="fixed inset-0 bg-[#172B34]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <DoctorForm
              doctor={doctor}
              onCancel={() => setIsEditing(false)}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['doctor', doctorId] });
                queryClient.invalidateQueries({ queryKey: ['doctors-profiles'] });
                setIsEditing(false);
              }}
            />
          </div>
        </div>
      )}

      {/* 6. APPLY OUT-OF-OFFICE / LEAVE MODAL */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 bg-[#172B34]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-4 sm:p-6 shadow-2xl border border-[#E8EEF2] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                  <CalendarOff className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#172B34]">Mark Doctor Out-of-Office / Leave</h3>
                  <p className="text-[11px] text-[#567781]">Dr. {doctor.name}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsLeaveModalOpen(false);
                  setLeaveError('');
                }}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {leaveError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{leaveError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!leaveStartDate || !leaveEndDate) {
                  setLeaveError('Please select both start and end date for leave.');
                  return;
                }
                if (leaveEndDate < leaveStartDate) {
                  setLeaveError('End date cannot be earlier than start date.');
                  return;
                }
                applyLeaveMutation.mutate({
                  startDate: leaveStartDate,
                  endDate: leaveEndDate,
                  reason: leaveReason,
                  substituteDoctorId: substituteDoctorId || undefined
                });
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#172B34]">From Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveStartDate}
                    min={todayStr}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-[#E8EEF2] bg-[#F6F9FB] text-xs font-mono font-bold text-[#172B34] focus:outline-hidden focus:ring-2 focus:ring-[#087F8C]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#172B34]">To Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveEndDate}
                    min={leaveStartDate || todayStr}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-[#E8EEF2] bg-[#F6F9FB] text-xs font-mono font-bold text-[#172B34] focus:outline-hidden focus:ring-2 focus:ring-[#087F8C]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#172B34]">Substitute Doctor (Optional OPD Coverage)</label>
                <select
                  value={substituteDoctorId}
                  onChange={(e) => setSubstituteDoctorId(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-[#E8EEF2] bg-[#F6F9FB] text-xs font-semibold text-[#172B34] focus:outline-hidden focus:ring-2 focus:ring-[#087F8C]"
                >
                  <option value="">-- No substitute doctor --</option>
                  {allDoctors
                    .filter((d: Doctor) => d.id !== doctorId && d.active)
                    .map((d: Doctor) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.specialization || 'Doctor'})
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-[#567781]">
                  If assigned, patients can be directed to this doctor during out-of-office dates.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#172B34]">Reason / Clinical Remarks</label>
                <textarea
                  rows={2}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="e.g. Annual Vacation, Medical Conference, Personal Sick Leave..."
                  className="w-full p-2.5 rounded-xl border border-[#E8EEF2] bg-[#F6F9FB] text-xs text-[#172B34] focus:outline-hidden focus:ring-2 focus:ring-[#087F8C] resize-none"
                />
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-800 space-y-1">
                <strong>🔒 OPD Slot Protection:</strong>
                <p>
                  During approved leave dates, the system will automatically block new patient appointments from being scheduled with Dr. {doctor.name}.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8EEF2]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsLeaveModalOpen(false);
                    setLeaveError('');
                  }}
                  className="h-8.5 text-xs border-[#E8EEF2] text-[#567781]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={applyLeaveMutation.isPending}
                  className="h-8.5 bg-[#087F8C] hover:bg-[#076b77] text-white text-xs font-bold px-4 rounded-xl"
                >
                  {applyLeaveMutation.isPending ? 'Saving...' : 'Confirm Leave Period'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. UPDATE CONSULTATION TARIFFS & CHAMBER MODAL */}
      {isTariffsModalOpen && (
        <div className="fixed inset-0 bg-[#172B34]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-4 sm:p-6 shadow-2xl border border-[#E8EEF2] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#087F8C]/10 text-[#087F8C] border border-[#087F8C]/20 flex items-center justify-center">
                  <IndianRupee className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#172B34]">Update Consultation Tariffs & Chamber</h3>
                  <p className="text-[11px] text-[#567781]">{doctor.name} ({doctor.specialization || 'Doctor'})</p>
                </div>
              </div>
              <button
                onClick={() => setIsTariffsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {tariffsError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{tariffsError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateTariffsMutation.mutate();
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#172B34] flex items-center gap-1">
                    <span>Standard OPD (₹) *</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    placeholder="500"
                    value={tariffForm.consultationFee}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => handleFeeInput('consultationFee', e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-[#E8EEF2] bg-[#F6F9FB] text-xs font-mono font-bold text-[#087F8C] focus:outline-hidden focus:ring-2 focus:ring-[#087F8C] focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#172B34]">Follow-up Fee (₹)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="300"
                    value={tariffForm.followUpFee}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => handleFeeInput('followUpFee', e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-[#E8EEF2] bg-[#F6F9FB] text-xs font-mono font-bold text-[#172B34] focus:outline-hidden focus:ring-2 focus:ring-[#087F8C] focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#172B34]">Emergency Fee (₹)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="1000"
                    value={tariffForm.emergencyFee}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => handleFeeInput('emergencyFee', e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-[#E8EEF2] bg-[#F6F9FB] text-xs font-mono font-bold text-[#D64545] focus:outline-hidden focus:ring-2 focus:ring-[#087F8C] focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#172B34]">OPD Chamber / Room No.</label>
                  <input
                    type="text"
                    placeholder="e.g. Room 102, Chamber B"
                    value={tariffForm.roomNumber}
                    onChange={(e) => setTariffForm({ ...tariffForm, roomNumber: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl border border-[#E8EEF2] bg-[#F6F9FB] text-xs text-[#172B34] focus:outline-hidden focus:ring-2 focus:ring-[#087F8C] focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#172B34]">Slot Duration per Patient</label>
                  <select
                    value={tariffForm.slotDuration}
                    onChange={(e) => setTariffForm({ ...tariffForm, slotDuration: Number(e.target.value) })}
                    className="w-full h-9 px-3 rounded-xl border border-[#E8EEF2] bg-[#F6F9FB] text-xs font-semibold text-[#172B34] focus:outline-hidden focus:ring-2 focus:ring-[#087F8C] focus:bg-white"
                  >
                    <option value={10}>10 Minutes per Patient</option>
                    <option value={15}>15 Minutes (Default Standard)</option>
                    <option value={20}>20 Minutes per Patient</option>
                    <option value={30}>30 Minutes (Detailed Consult)</option>
                    <option value={45}>45 Minutes (Specialty)</option>
                    <option value={60}>60 Minutes (Procedure / Surgery)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] text-[11px] text-[#567781] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#22A06B] shrink-0" />
                <span>Updated tariffs apply immediately to newly booked appointments and billing checkout receipts.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8EEF2]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTariffsModalOpen(false)}
                  className="min-h-[36px] text-xs border-[#E8EEF2] text-[#567781] cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateTariffsMutation.isPending}
                  className="min-h-[36px] bg-[#087F8C] hover:bg-[#076b77] text-white text-xs font-bold px-4 rounded-xl shadow-xs cursor-pointer"
                >
                  {updateTariffsMutation.isPending ? 'Saving...' : 'Save Tariffs'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. UPDATE WEEKLY AVAILABILITY HOURS & SCHEDULE MODAL */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 bg-[#172B34]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-4 sm:p-6 shadow-2xl border border-[#E8EEF2] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#E9A23B]/10 text-[#E9A23B] border border-[#E9A23B]/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[#E9A23B]" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#172B34]">Update Weekly OPD Hours & Availability</h3>
                  <p className="text-[11px] text-[#567781]">{doctor.name} ({doctor.specialization || 'Doctor'})</p>
                </div>
              </div>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {scheduleError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{scheduleError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateScheduleMutation.mutate();
              }}
              className="space-y-4 text-xs"
            >
              {/* Quick Timing Presets */}
              <div className="space-y-1.5">
                <span className="font-bold text-[#567781] text-[11px] uppercase tracking-wider block">Quick Presets</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Mon-Sat (9-1, 5-8:30)', val: 'Mon - Sat: 09:00 AM - 01:00 PM, 05:00 PM - 08:30 PM' },
                    { label: 'Mon-Fri Regular (10-5)', val: 'Mon - Fri: 10:00 AM - 05:00 PM' },
                    { label: 'All 7 Days Morning (8-2)', val: 'Mon - Sun: 08:00 AM - 02:00 PM' },
                    { label: 'Weekend OPD (Sat-Sun)', val: 'Sat - Sun: 09:00 AM - 01:00 PM' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setScheduleText(preset.val)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                        scheduleText === preset.val
                          ? 'bg-[#087F8C] text-white border-[#087F8C]'
                          : 'bg-[#F6F9FB] text-[#567781] border-[#E8EEF2] hover:border-[#087F8C]/40 hover:text-[#172B34]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Schedule Text Input */}
              <div className="space-y-1">
                <label className="font-bold text-[#172B34]">Weekly OPD Operating Hours *</label>
                <input
                  type="text"
                  required
                  value={scheduleText}
                  onChange={(e) => setScheduleText(e.target.value)}
                  placeholder="e.g. Mon - Sat: 09:00 AM - 01:00 PM, 05:00 PM - 08:30 PM"
                  className="w-full h-9.5 px-3 rounded-xl border border-[#E8EEF2] bg-[#F6F9FB] text-xs font-semibold text-[#172B34] focus:outline-hidden focus:ring-2 focus:ring-[#087F8C] focus:bg-white"
                />
                <p className="text-[10.5px] text-[#567781]">
                  Format: Days and time ranges. Patients and receptionist can view this during booking.
                </p>
              </div>

              {/* Active Days Preview */}
              <div className="space-y-1.5 pt-1">
                <span className="font-bold text-[#567781] text-[11px] uppercase tracking-wider block">Active Days Computed</span>
                <div className="grid grid-cols-7 gap-1.5 text-center">
                  {WEEK_DAYS.map((day) => {
                    const active = isDayActive(scheduleText, day);
                    return (
                      <div
                        key={day}
                        className={`py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${
                          active
                            ? 'bg-[#087F8C]/15 text-[#087F8C] border border-[#087F8C]/40'
                            : 'bg-[#F6F9FB] text-[#94A3B8] border border-[#E8EEF2]'
                        }`}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Admin Notification Reminder */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-800 space-y-1">
                <strong>🔔 Real-Time Admin Sync:</strong>
                <p>
                  Changing this schedule instantly updates OPD booking slots and sends a real-time notification alert to hospital administrators.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8EEF2]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="min-h-[36px] text-xs border-[#E8EEF2] text-[#567781] cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateScheduleMutation.isPending}
                  className="min-h-[36px] bg-[#087F8C] hover:bg-[#076b77] text-white text-xs font-bold px-4 rounded-xl shadow-xs cursor-pointer"
                >
                  {updateScheduleMutation.isPending ? 'Saving...' : 'Save Schedule'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. DOCTOR CONSULTATION & PRESCRIPTION MODAL */}
      {viewingPrescriptionAppt && (
        <DoctorPrescriptionNotepadModal
          isOpen={!!viewingPrescriptionAppt}
          onClose={() => setViewingPrescriptionAppt(null)}
          appointment={viewingPrescriptionAppt}
          doctor={doctor}
          clinic={clinic}
          settings={prescriptionSettings}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['doctor-appointments', doctorId] });
          }}
        />
      )}
    </div>
  );
}
