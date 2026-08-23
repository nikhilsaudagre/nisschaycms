'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Patient, Appointment, Doctor, Clinic, PrescriptionSettings } from '@/types';
import { EMRPrintDocument, EMRPrintMode } from '@/components/emr-print-document';
import { DoctorPrescriptionNotepadModal } from '@/components/prescription-notepad-modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft,
  Edit2,
  Calendar,
  Phone,
  Mail,
  Heart,
  AlertTriangle,
  FileClock,
  Archive,
  CheckCircle,
  User,
  HeartPulse,
  Users,
  ShieldCheck,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Printer,
  X,
  FileText,
  Hospital,
  Activity,
  Thermometer,
  Stethoscope,
  Pill,
  MapPin,
  IdCard,
  Scale,
  FileCheck,
  Share2,
  Edit3
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export default function PatientDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'timeline' | 'prescriptions'>('profile');
  const [expandedApptIds, setExpandedApptIds] = useState<Record<string, boolean>>({});
  const [selectedPrintAppt, setSelectedPrintAppt] = useState<Appointment | null>(null);
  const [editingConsultAppt, setEditingConsultAppt] = useState<Appointment | null>(null);
  const [printModalMode, setPrintModalMode] = useState<EMRPrintMode>('EMR_CASE_SHEET');

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

  const toggleExpand = (apptId: string) => {
    setExpandedApptIds(prev => ({
      ...prev,
      [apptId]: !prev[apptId],
    }));
  };

  const parsePrescriptionLines = (rxText: string = '') => {
    if (!rxText) return [];
    const rawLines = rxText.split('\n').map(l => l.trim()).filter(Boolean);
    return rawLines.map(line => {
      const clean = line.replace(/^[•\-\*]\s*/, '');
      const parts = clean.split('—').map(p => p.trim());
      return {
        name: parts[0] || clean,
        dosage: parts[1] || '',
        duration: parts[2] || '',
        raw: line,
      };
    });
  };

  // Fetch patient profile details
  const { data: patient, isLoading, isError, error } = useQuery<Patient>({
    queryKey: ['patient', id],
    queryFn: async () => {
      const response = await apiClient.get(`/patients/${id}`);
      return response.data;
    },
  });

  // Fetch patient completed appointments history
  const { data: appointments, isLoading: isLoadingAppts } = useQuery<Appointment[]>({
    queryKey: ['patient-appointments', id],
    queryFn: async () => {
      const response = await apiClient.get(`/appointments/patient/${id}`);
      return response.data;
    },
  });

  // Fetch doctors list for prescription lookup
  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ['doctors-list'],
    queryFn: async () => {
      const response = await apiClient.get('/doctors');
      return response.data;
    },
  });

  // Fetch current clinic details for prescription branding
  const { data: clinic } = useQuery<Clinic>({
    queryKey: ['clinic-me'],
    queryFn: async () => {
      const response = await apiClient.get('/clinics/me');
      return response.data;
    },
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async () => {
      await apiClient.patch(`/patients/${id}/toggle-status`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', id] });
    },
  });

  const calculateAge = (dobString?: string) => {
    if (!dobString) return 'N/A';
    try {
      const birthDate = new Date(dobString);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age >= 0 ? `${age} yrs` : 'N/A';
    } catch {
      return 'N/A';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  // Calculate BMI dynamically
  const bmiText = React.useMemo(() => {
    if (patient?.heightCm && patient?.weightKg && Number(patient.heightCm) > 0 && Number(patient.weightKg) > 0) {
      const heightM = Number(patient.heightCm) / 100;
      const calcBmi = Number(patient.weightKg) / (heightM * heightM);
      const val = calcBmi.toFixed(1);
      let status = 'Normal';
      if (calcBmi < 18.5) status = 'Underweight';
      else if (calcBmi >= 25 && calcBmi < 29.9) status = 'Overweight';
      else if (calcBmi >= 30) status = 'Obese';
      return `${val} kg/m² (${status})`;
    }
    return null;
  }, [patient?.heightCm, patient?.weightKg]);

  if (isLoading) {
    return (
      <div className="p-16 text-center text-slate-500 font-medium">
        <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-4"></div>
        <span>Loading patient medical record...</span>
      </div>
    );
  }

  if (isError || !patient) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto text-center p-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm mt-8">
        <Users className="w-12 h-12 text-rose-500 mx-auto mb-2" />
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Error Loading Profile</h2>
        <p className="text-slate-500 font-semibold">{(error as Error)?.message || 'Patient record not found.'}</p>
        <Button onClick={() => router.push('/patients')} className="bg-teal-600 font-bold rounded-xl mt-2 text-white">
          Back to Patient Directory
        </Button>
      </div>
    );
  }

  const completedAppts = appointments?.filter(a => a.status === 'COMPLETED') || [];
  const latestVitalsAppt = appointments?.find(a => 
    (a.bpSystolic && a.bpDiastolic) || a.pulse || a.temperature || a.spo2 || a.weight || a.height
  );

  const handleOpenPrintEHR = () => {
    const targetAppt = completedAppts[0] || appointments?.[0] || ({
      id: patient.id,
      patientId: patient.id,
      patientName: patient.name,
      patientPhone: patient.phone,
      doctorId: doctors[0]?.id || '',
      doctorName: doctors[0]?.name || 'Attending Physician',
      appointmentDate: new Date().toISOString().split('T')[0],
      startTime: '10:00',
      endTime: '10:15',
      status: 'COMPLETED',
      type: 'GENERAL_CHECKUP',
      reason: 'Routine Health Checkup & Comprehensive EHR Record',
      notes: patient.medicalHistory || 'Patient general medical profile overview.',
      prescription: patient.currentMedications || '',
      height: patient.heightCm,
      weight: patient.weightKg,
    } as unknown as Appointment);

    setSelectedPrintAppt(targetAppt);
    setPrintModalMode('EMR_CASE_SHEET');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header & Navigation Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <button
          onClick={() => router.push('/patients')}
          className="flex items-center space-x-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-bold transition-colors group shrink-0"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Directory</span>
        </button>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-9 border-slate-200 dark:border-slate-700 font-medium rounded-lg bg-white dark:bg-slate-850 text-xs"
            onClick={() => toggleStatusMutation.mutate()}
          >
            {patient.active ? (
              <span className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300">
                <Archive className="w-3.5 h-3.5" />
                <span>Archive File</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Restore File</span>
              </span>
            )}
          </Button>

          <Link href={`/patients/${patient.id}/edit`}>
            <Button variant="outline" size="sm" className="h-9 border-slate-200 dark:border-slate-700 font-medium rounded-lg bg-white dark:bg-slate-850 text-xs flex items-center gap-1.5">
              <Edit2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              <span>Edit Profile</span>
            </Button>
          </Link>

          <Button
            size="sm"
            onClick={handleOpenPrintEHR}
            className="h-9 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-medium text-xs rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print EHR Record</span>
          </Button>

          <Button
            size="sm"
            onClick={() => router.push(`/appointments/new?patientId=${patient.id}`)}
            className="h-9 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg shadow-2xs flex items-center gap-1.5 border-0"
          >
            <Stethoscope className="w-4 h-4" />
            <span>Start Consultation</span>
          </Button>
        </div>
      </div>

      {/* ENTERPRISE EMR FILE HEADER CARD */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs overflow-hidden no-print">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {patient.name || `Patient (${patient.phone})`}
              </h1>
              <span className="text-[11px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                UHID: #{patient.id.slice(0, 8).toUpperCase()}
              </span>
              {patient.active ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Active EMR File</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                  Archived
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Registered on {formatDate(patient.createdAt)} • Primary ID: <strong className="text-slate-800 dark:text-slate-200 font-mono">{patient.phone}</strong>
            </p>
          </div>
        </div>

        {/* Quick Highlights Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5">
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 block uppercase">Mobile Phone</span>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-mono">{patient.phone}</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 block uppercase">Gender / Age</span>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{patient.gender || 'UNSPECIFIED'} • {calculateAge(patient.dateOfBirth)}</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 block uppercase">Blood Group</span>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{patient.bloodGroup || 'Unspecified'}</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 block uppercase">Calculated BMI</span>
            <span className="text-sm font-semibold text-teal-700 dark:text-teal-400">{bmiText || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* TABBED EMR VIEW SELECTOR */}
      <div className="flex items-center space-x-1 border-b border-slate-200 dark:border-slate-800 pb-2 no-print">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-slate-900 text-white dark:bg-teal-600 dark:text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Demographics & Form Details
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'timeline'
              ? 'bg-slate-900 text-white dark:bg-teal-600 dark:text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Consultations & SOAP Notes ({completedAppts.length})
        </button>

        <button
          onClick={() => setActiveTab('prescriptions')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'prescriptions'
              ? 'bg-slate-900 text-white dark:bg-teal-600 dark:text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Prescriptions History
        </button>
      </div>

      {/* TABBED EMR VIEW CONTENTS */}
      <div className="no-print">
        {/* TAB 1: DEMOGRAPHICS & FORM DETAILS (MATCHES FORM STRUCTURE EXACTLY) */}
        {activeTab === 'profile' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs p-6 space-y-8">
          
          {/* SECTION 1: DEMOGRAPHICS & CONTACT */}
          <div className="space-y-4">
            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
              <span>1. Demographics & Contact Information</span>
              <Link href={`/patients/${patient.id}/edit`} className="text-teal-600 dark:text-teal-400 hover:underline text-[11px] font-semibold flex items-center gap-1">
                <Edit2 className="w-3 h-3" /> Edit Section
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-400">Full Name</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{patient.name || 'Not Specified'}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-400">Mobile Phone Number (Primary ID)</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-white font-mono">{patient.phone}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-400">Gender</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{patient.gender || 'Not Specified'}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-400">Age / Date of Birth</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {calculateAge(patient.dateOfBirth)} {patient.dateOfBirth ? `(${formatDate(patient.dateOfBirth)})` : ''}
                </p>
              </div>

              <div className="space-y-1 md:col-span-2">
                <span className="text-xs font-medium text-slate-400">Email Address</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{patient.email || 'Not Provided'}</p>
              </div>
            </div>
          </div>

          {/* SECTION 2: ADDRESS & IDENTITY */}
          <div className="space-y-4">
            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
              <span>2. Address & Identity Proof</span>
              <Link href={`/patients/${patient.id}/edit`} className="text-teal-600 dark:text-teal-400 hover:underline text-[11px] font-semibold flex items-center gap-1">
                <Edit2 className="w-3 h-3" /> Edit Section
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1 md:col-span-3">
                <span className="text-xs font-medium text-slate-400">Street Address</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{patient.address || 'Not Provided'}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-400">City / Town</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{patient.city || 'Not Provided'}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-400">Pincode</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{patient.pincode || 'Not Provided'}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-400">Aadhaar / Gov ID</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-white font-mono">{patient.governmentId || 'Not Provided'}</p>
              </div>
            </div>
          </div>

          {/* SECTION 3: CLINICAL BASELINE & HISTORY */}
          <div className="space-y-4">
            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
              <span>3. Clinical Vitals & Medical History</span>
              <Link href={`/patients/${patient.id}/edit`} className="text-teal-600 dark:text-teal-400 hover:underline text-[11px] font-semibold flex items-center gap-1">
                <Edit2 className="w-3 h-3" /> Edit Section
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-400">Height</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{patient.heightCm ? `${patient.heightCm} cm` : 'Not Measured'}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-400">Weight</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{patient.weightKg ? `${patient.weightKg} kg` : 'Not Measured'}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-400">Body Mass Index (BMI)</span>
                <p className="text-sm font-semibold text-teal-700 dark:text-teal-400">{bmiText || 'N/A'}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-400">Blood Group</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{patient.bloodGroup || 'Unspecified'}</p>
              </div>

              <div className="space-y-1 md:col-span-2">
                <span className="text-xs font-medium text-slate-400">Current Regular Daily Medications</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{patient.currentMedications || 'None Listed'}</p>
              </div>

              <div className="space-y-1 md:col-span-3">
                <span className="text-xs font-medium text-rose-500 uppercase tracking-wider block">Known Drug & Food Allergies</span>
                <div className={`p-3 rounded-lg text-xs font-medium ${patient.allergies ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800' : 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                  {patient.allergies || 'No Known Drug or Food Allergies'}
                </div>
              </div>

              <div className="space-y-1 md:col-span-3">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">Chronic Illnesses & Pre-Existing History</span>
                <div className="p-3 rounded-lg text-xs font-medium bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-100 dark:border-slate-750">
                  {patient.medicalHistory || 'No pre-existing chronic conditions recorded.'}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: EMERGENCY CONTACT & INSURANCE */}
          <div className="space-y-4">
            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
              <span>4. Emergency Contact & Insurance</span>
              <Link href={`/patients/${patient.id}/edit`} className="text-teal-600 dark:text-teal-400 hover:underline text-[11px] font-semibold flex items-center gap-1">
                <Edit2 className="w-3 h-3" /> Edit Section
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-400">Emergency Contact Person</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{patient.emergencyContactName || 'None Added'}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-400">Emergency Contact Phone</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-white font-mono">{patient.emergencyContactPhone || 'None Added'}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-400">Referral Source</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{patient.referralSource || 'Direct Walk-in'}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-400">Insurance / TPA Provider</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{patient.insuranceProvider || 'Self-Pay (No Insurance)'}</p>
              </div>

              {patient.insurancePolicyNo && (
                <div className="space-y-1 md:col-span-2">
                  <span className="text-xs font-medium text-slate-400">Insurance Policy Card No.</span>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white font-mono">{patient.insurancePolicyNo}</p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: CONSULTATION TIMELINE & SOAP NOTES */}
      {activeTab === 'timeline' && (
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-xs">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <FileClock className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Clinical Encounters & Doctor Notes</span>
              </span>
              <span className="text-xs text-slate-400 font-normal">Chronological Records</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoadingAppts ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-2">
                <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-500 font-medium">Loading logs...</span>
              </div>
            ) : completedAppts.length === 0 ? (
              <div className="text-center py-12 space-y-3 bg-slate-50 dark:bg-slate-850/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-6">
                <ClipboardList className="w-10 h-10 mx-auto text-slate-350" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Past Consultations Recorded</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Start a new consultation to log SOAP clinical notes, vitals, and generate printable digital Rx pads.
                </p>
                <Button
                  size="sm"
                  onClick={() => router.push(`/appointments/new?patientId=${patient.id}`)}
                  className="bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-lg text-xs mt-2"
                >
                  Start First Consultation
                </Button>
              </div>
            ) : (
              <div className="relative pl-6 border-l-2 border-teal-500/30 space-y-6 ml-3 py-1">
                {completedAppts.map((visit) => {
                  const isExpanded = !!expandedApptIds[visit.id];
                  return (
                    <div key={visit.id} className="relative">
                      <span className="absolute -left-[33px] top-0 bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 rounded-full p-1.5 border-2 border-white dark:border-slate-900 shadow-xs shrink-0">
                        <ClipboardList className="w-4 h-4" />
                      </span>

                      <div className="bg-slate-50 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-750 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                                Dr. {visit.doctorName}
                              </h4>
                              <span className="text-[10px] font-semibold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800">
                                {visit.type}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                              📅 {visit.appointmentDate} • Time Slot: {visit.startTime}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingConsultAppt(visit)}
                              className="h-8 border-teal-200 text-teal-700 dark:border-teal-800 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/50 font-bold text-xs rounded-lg"
                              title="Open/Edit Doctor Prescription Note Pad"
                            >
                              <Edit3 className="w-3.5 h-3.5 mr-1 text-teal-600" /> Rx Pad
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedPrintAppt(visit)}
                              className="h-8 border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-100 font-medium text-xs rounded-lg"
                            >
                              <Printer className="w-3.5 h-3.5 mr-1" /> Print Rx
                            </Button>

                            <button
                              type="button"
                              onClick={() => toggleExpand(visit.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>

                        <div className="text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-lg flex items-center justify-between gap-2">
                          <span>Reason: <strong>{visit.reason || visit.type}</strong></span>
                          {visit.diagnosis && <span className="truncate max-w-xs text-teal-700 dark:text-teal-400 font-bold">Dx: {visit.diagnosis}</span>}
                        </div>

                        {isExpanded && (
                          <div className="pt-2 border-t border-slate-200 dark:border-slate-750 space-y-4 animate-in fade-in duration-200">
                            {((visit.bpSystolic && visit.bpDiastolic) || visit.pulse || visit.temperature || visit.spo2) && (
                              <div className="bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-900/40 p-3 rounded-lg flex flex-wrap gap-2 text-xs font-semibold text-teal-900 dark:text-teal-200">
                                <span className="text-[10px] text-teal-700 dark:text-teal-400 font-bold uppercase tracking-wider self-center mr-1">Vitals Snapshot:</span>
                                {visit.bpSystolic && visit.bpDiastolic && <span className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border">BP: {visit.bpSystolic}/{visit.bpDiastolic} mmHg</span>}
                                {visit.pulse && <span className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border">Pulse: {visit.pulse} bpm</span>}
                                {visit.temperature && <span className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border">Temp: {visit.temperature} °F</span>}
                                {visit.spo2 && <span className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border">SpO2: {visit.spo2}%</span>}
                              </div>
                            )}

                            {visit.symptoms && (
                              <div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Chief Symptoms / Subjective</span>
                                <p className="text-xs text-slate-800 dark:text-slate-200 font-medium mt-0.5 whitespace-pre-line">{visit.symptoms}</p>
                              </div>
                            )}

                            {visit.diagnosis && (
                              <div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Clinical Assessment / Diagnosis</span>
                                <p className="text-xs text-teal-800 dark:text-teal-300 font-bold mt-0.5 whitespace-pre-line">{visit.diagnosis}</p>
                              </div>
                            )}

                            {visit.prescription && (
                              <div className="space-y-1.5">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Prescribed Medicines</span>
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-lg font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line">
                                  {visit.prescription}
                                </div>
                              </div>
                            )}

                            {visit.notes && (
                              <div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Doctor Advice / Plan</span>
                                <p className="text-xs text-slate-600 dark:text-slate-300 italic mt-0.5 whitespace-pre-line">{visit.notes}</p>
                              </div>
                            )}

                            {visit.followUpDate && (
                              <div className="bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 p-3 rounded-lg text-xs font-semibold text-sky-900 dark:text-sky-200 flex items-center justify-between">
                                <span>Next Review / Follow-Up Date:</span>
                                <strong className="font-mono text-sky-700 dark:text-sky-300">{visit.followUpDate}</strong>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 3: PRESCRIPTIONS HISTORY */}
      {activeTab === 'prescriptions' && (
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-xs">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Pill className="w-4 h-4 text-teal-600 shrink-0" />
                <span>All Prescribed Medications</span>
              </span>
              <span className="text-xs text-slate-400 font-normal">Medication History</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {completedAppts.filter(a => a.prescription).length === 0 ? (
              <div className="text-center py-12 text-slate-400 italic text-xs">
                No active or past prescriptions found for this patient file.
              </div>
            ) : (
              completedAppts.filter(a => a.prescription).map(visit => (
                <div key={visit.id} className="bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        Dr. {visit.doctorName}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono">{visit.appointmentDate}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedPrintAppt(visit)}
                      className="h-8 border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300 font-medium text-xs rounded-lg"
                    >
                      <Printer className="w-3.5 h-3.5 mr-1" /> Print Rx
                    </Button>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line">
                    {visit.prescription}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
      </div>

      {/* PRINTABLE EMR CASE SHEET & RX MODAL */}
      {selectedPrintAppt && (
        <div className="printable-modal-overlay fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="printable-modal-content bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-800 p-6 space-y-5 text-white">
            <div className="printable-modal-header flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <Printer className="w-5 h-5 text-teal-400" /> Executive EMR Print Preview
                </h3>
                <p className="text-xs text-slate-400 font-medium">Official A4 Medical Sheet & Prescription Output</p>
              </div>

              {/* Mode Selection Tabs */}
              <div className="flex items-center gap-3">
                <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setPrintModalMode('EMR_CASE_SHEET')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      printModalMode === 'EMR_CASE_SHEET'
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Full EMR Case Sheet
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintModalMode('PRESCRIPTION_PAD')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      printModalMode === 'PRESCRIPTION_PAD'
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Rx Pad Only
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedPrintAppt(null)}
                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Container */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 overflow-x-auto flex justify-center">
              <div id="printable-emr-document" className="transform scale-[0.88] origin-top sm:scale-95 transition-all">
                <EMRPrintDocument
                  mode={printModalMode}
                  clinic={clinic}
                  doctor={doctors.find(d => d.id === selectedPrintAppt.doctorId) || { name: selectedPrintAppt.doctorName }}
                  patient={patient}
                  appointment={selectedPrintAppt}
                  settings={prescriptionSettings}
                  accentColor="#0d9488"
                />
              </div>
            </div>

            <div className="printable-modal-footer flex justify-between items-center pt-1 border-t border-slate-800">
              <span className="text-xs text-slate-400 font-mono">
                Ref #: <strong className="text-slate-200">{selectedPrintAppt.id.slice(0, 8).toUpperCase()}</strong>
              </span>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setSelectedPrintAppt(null)}
                  className="h-10 text-xs font-bold rounded-xl border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Close Preview
                </Button>
                <Button
                  onClick={() => window.print()}
                  className="h-10 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md px-6 flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Print Document (A4)
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DOCTOR CONSULTATION & PRESCRIPTION NOTE PAD MODAL */}
      {editingConsultAppt && (
        <DoctorPrescriptionNotepadModal
          isOpen={!!editingConsultAppt}
          onClose={() => setEditingConsultAppt(null)}
          appointment={editingConsultAppt}
          patient={patient}
          doctor={doctors.find((d) => d.id === editingConsultAppt.doctorId) || { name: editingConsultAppt.doctorName }}
          clinic={clinic}
          settings={prescriptionSettings}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['patient-appointments', id] });
            queryClient.invalidateQueries({ queryKey: ['patient', id] });
          }}
        />
      )}
    </div>
  );
}
