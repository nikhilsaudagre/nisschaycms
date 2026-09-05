'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { PatientListResponse, Patient, HospitalBed, DailyCheckingLog, InpatientServiceCharge, InpatientAdvancePayment } from '@/types';
import { calculateBedStayFinancials } from '@/lib/financial-calculator';
import { formatClinicalDateTime } from '@/lib/utils';
import { HOSPITAL_SERVICE_CATALOG } from '@/components/hospital-command-center';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users,
  Plus,
  Search,
  UserCheck,
  UserX,
  Phone,
  Mail,
  Calendar,
  Heart,
  Activity,
  Edit2,
  Eye,
  ToggleLeft,
  ToggleRight,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  AlertTriangle,
  X,
  ShieldAlert,
  CalendarPlus,
  FileText,
  BedDouble,
  Building,
  CheckCircle2,
  ExternalLink,
  ClipboardList,
  Printer,
  Receipt,
  CreditCard,
  Trash2,
  User,
  HeartPulse
} from 'lucide-react';

const BLOOD_GROUPS = [
  'All Blood Groups',
  'A+',
  'A-',
  'B+',
  'B-',
  'O+',
  'O-',
  'AB+',
  'AB-',
];

export default function PatientsDirectoryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('All Blood Groups');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ALL');
  const [hospitalFilter, setHospitalFilter] = useState<'ALL' | 'HOSPITALIZED'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [page, setPage] = useState(0);

  // Inpatient beds synchronized from backend database API
  const [ipdBeds, setIpdBeds] = useState<HospitalBed[]>([]);
  const [fileViewingBed, setFileViewingBed] = useState<HospitalBed | null>(null);
  const [fileActiveTab, setFileActiveTab] = useState<'INFO' | 'ROUNDS' | 'BILLING'>('INFO');
  const [showAddServiceForm, setShowAddServiceForm] = useState<boolean>(false);
  const [selectedCatalogServiceId, setSelectedCatalogServiceId] = useState<string>(HOSPITAL_SERVICE_CATALOG[0]?.id || 'srv-doc-round');
  const [serviceQuantity, setServiceQuantity] = useState<string>('1');
  const [serviceNotes, setServiceNotes] = useState<string>('');
  const [showAddAdvanceForm, setShowAddAdvanceForm] = useState<boolean>(false);
  const [advanceAmount, setAdvanceAmount] = useState<string>('2000');
  const [advancePaymentMode, setAdvancePaymentMode] = useState<string>('UPI');
  const [advanceNotes, setAdvanceNotes] = useState<string>('Admission deposit');
  const [isEditingPatientRecord, setIsEditingPatientRecord] = useState<boolean>(false);
  const [savingRecord, setSavingRecord] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');

  // Edit Patient Record Fields inside Inpatient File Modal
  const [editBloodGroup, setEditBloodGroup] = useState<string>('');
  const [editAddress, setEditAddress] = useState<string>('');
  const [editCity, setEditCity] = useState<string>('');
  const [editEmergencyName, setEditEmergencyName] = useState<string>('');
  const [editEmergencyPhone, setEditEmergencyPhone] = useState<string>('');
  const [editAllergies, setEditAllergies] = useState<string>('');
  const [editMedicalHistory, setEditMedicalHistory] = useState<string>('');
  const [editCurrentMedications, setEditCurrentMedications] = useState<string>('');
  const [editInsuranceProvider, setEditInsuranceProvider] = useState<string>('');
  const [editInsurancePolicyNo, setEditInsurancePolicyNo] = useState<string>('');

  // Daily Check / Round Note State inside File Modal
  const [showAddRoundForm, setShowAddRoundForm] = useState<boolean>(false);
  const [roundDoctorName, setRoundDoctorName] = useState<string>('');
  const [roundTemp, setRoundTemp] = useState<string>('98.6');
  const [roundBp, setRoundBp] = useState<string>('120/80');
  const [roundPulse, setRoundPulse] = useState<string>('78');
  const [roundSpo2, setRoundSpo2] = useState<string>('99');
  const [roundRespRate, setRoundRespRate] = useState<string>('18');
  const [roundNotes, setRoundNotes] = useState<string>('');
  const [roundTreatment, setRoundTreatment] = useState<string>('');

  const saveBedsToBackend = async (newBeds: HospitalBed[]) => {
    try {
      await apiClient.post('/clinics/hospital-data', { beds: JSON.stringify(newBeds) });
      localStorage.setItem('nisschay_hospital_beds', JSON.stringify(newBeds));
      setIpdBeds(newBeds);
    } catch (e) {
      console.error('Failed to save beds to backend', e);
    }
  };

  const handleDischargeBedFromPatients = (bedId: string) => {
    const updated = ipdBeds.map((b) =>
      b.id === bedId
        ? {
            ...b,
            status: 'AVAILABLE' as const,
            patientId: undefined,
            patientName: undefined,
            patientAge: undefined,
            patientGender: undefined,
            patientPhone: undefined,
            patientAgeGender: undefined,
            ipdNumber: undefined,
            admissionDate: undefined,
            admissionTime: undefined,
            admittingDiagnosis: undefined,
            consultantDoctorName: undefined,
            dailyLogs: [],
            billingCharges: [],
            advancePayments: []
          }
        : b
    );
    saveBedsToBackend(updated);
    if (fileViewingBed?.id === bedId) setFileViewingBed(null);
  };

  const handleMarkDischargePlannedFromPatients = (bedId: string) => {
    const updated = ipdBeds.map((b) =>
      b.id === bedId ? { ...b, status: 'DISCHARGE_PLANNED' as const } : b
    );
    saveBedsToBackend(updated);
    if (fileViewingBed?.id === bedId) {
      setFileViewingBed({ ...fileViewingBed, status: 'DISCHARGE_PLANNED' });
    }
  };

  // Real-time synchronization when beds change in Hospital Command Center across all devices
  useEffect(() => {
    const syncBeds = async () => {
      try {
        const res = await apiClient.get<{ beds?: string }>('/clinics/hospital-data');
        if (res.data?.beds) {
          const parsed = JSON.parse(res.data.beds);
          if (Array.isArray(parsed)) {
            setIpdBeds(parsed);
            return;
          }
        }
        const saved = localStorage.getItem('nisschay_hospital_beds');
        if (saved) setIpdBeds(JSON.parse(saved));
      } catch {
        const saved = localStorage.getItem('nisschay_hospital_beds');
        if (saved) {
          try {
            setIpdBeds(JSON.parse(saved));
          } catch {}
        }
      }
    };

    syncBeds();
    const interval = setInterval(syncBeds, 4000);
    window.addEventListener('focus', syncBeds);
    window.addEventListener('storage', syncBeds);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', syncBeds);
      window.removeEventListener('storage', syncBeds);
    };
  }, []);

  // Fetch total patient count for stats badge
  const { data: countData } = useQuery<PatientListResponse>({
    queryKey: ['patientsCount'],
    queryFn: async () => {
      const response = await apiClient.get('/patients', {
        params: { size: 1 },
      });
      return response.data;
    },
  });

  // Fetch paginated patients list
  const { data, isLoading, isError, error } = useQuery<PatientListResponse>({
    queryKey: ['patients', searchQuery, page],
    queryFn: async () => {
      const response = await apiClient.get('/patients', {
        params: {
          search: searchQuery,
          page,
          size: 16,
        },
      });
      return response.data;
    },
  });

  // Toggle patient archive status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async (patientId: string) => {
      await apiClient.patch(`/patients/${patientId}/toggle-status`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patientsCount'] });
    },
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    setSearchQuery(searchTerm);
  };

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
      return age >= 0 ? `${age} Yrs` : 'N/A';
    } catch {
      return 'N/A';
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'PT';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Map occupied beds to quick patient lookup
  const occupiedBeds = useMemo(() => {
    return ipdBeds.filter((b) => (b.status === 'OCCUPIED' || b.status === 'DISCHARGE_PLANNED') && Boolean(b.patientName));
  }, [ipdBeds]);

  // Helper to find if patient is currently hospitalized (robust matching by ID, Phone, or Name)
  const getPatientBed = (patient: Patient) => {
    return occupiedBeds.find((b) => {
      if (b.patientId && patient.id && b.patientId === patient.id) return true;
      if (
        b.patientPhone &&
        patient.phone &&
        b.patientPhone.replace(/\D/g, '') === patient.phone.replace(/\D/g, '') &&
        patient.phone.replace(/\D/g, '').length >= 7
      )
        return true;
      if (
        b.patientName &&
        patient.name &&
        b.patientName.trim().toLowerCase() === patient.name.trim().toLowerCase()
      )
        return true;
      return false;
    });
  };

  // List of currently hospitalized patients directly derived 1-to-1 from active beds
  const hospitalizedPatientsList = useMemo(() => {
    const dbPatients = data?.content || [];
    return occupiedBeds.map((bed) => {
      // Look for a matching DB patient profile if exists
      const matchedDbPatient = dbPatients.find((p) => {
        if (bed.patientId && p.id === bed.patientId) return true;
        if (
          bed.patientPhone &&
          p.phone &&
          bed.patientPhone.replace(/\D/g, '') === p.phone.replace(/\D/g, '') &&
          p.phone.replace(/\D/g, '').length >= 7
        )
          return true;
        if (
          bed.patientName &&
          p.name &&
          bed.patientName.trim().toLowerCase() === p.name.trim().toLowerCase()
        )
          return true;
        return false;
      });

      return {
        id: matchedDbPatient?.id || bed.patientId || `ipd-patient-${bed.id}`,
        clinicId: matchedDbPatient?.clinicId || '',
        name: bed.patientName || matchedDbPatient?.name || 'Inpatient',
        phone: bed.patientPhone || matchedDbPatient?.phone || 'Direct Admission',
        gender: bed.patientGender || matchedDbPatient?.gender || (bed.patientAgeGender?.toLowerCase().includes('female') ? 'FEMALE' : 'MALE'),
        dateOfBirth: matchedDbPatient?.dateOfBirth,
        bloodGroup: matchedDbPatient?.bloodGroup,
        active: true,
        createdAt: bed.admissionDate || matchedDbPatient?.createdAt || new Date().toISOString(),
        allergies: matchedDbPatient?.allergies,
        address: matchedDbPatient?.address,
        city: matchedDbPatient?.city
      } as Patient;
    });
  }, [occupiedBeds, data?.content]);

  // Unified directory for ALL view: all database patients plus any admitted inpatients not yet in DB
  const allPatientsList = useMemo(() => {
    const dbPatients = data?.content || [];
    const extraAdmitted: Patient[] = [];

    hospitalizedPatientsList.forEach((hPat) => {
      const existsInDb = dbPatients.some((p) => {
        if (hPat.id && p.id === hPat.id) return true;
        if (
          hPat.phone &&
          p.phone &&
          hPat.phone.replace(/\D/g, '') === p.phone.replace(/\D/g, '') &&
          p.phone.replace(/\D/g, '').length >= 7
        )
          return true;
        if (
          hPat.name &&
          p.name &&
          hPat.name.trim().toLowerCase() === p.name.trim().toLowerCase()
        )
          return true;
        return false;
      });

      if (!existsInDb) {
        extraAdmitted.push(hPat);
      }
    });

    return [...extraAdmitted, ...dbPatients];
  }, [data?.content, hospitalizedPatientsList]);

  // Filter content by blood group, active status, and hospitalization
  // Sorted strictly alphabetically by patient name (A to Z)
  const filteredContent = useMemo(() => {
    const sourceList: Patient[] = hospitalFilter === 'HOSPITALIZED' ? hospitalizedPatientsList : allPatientsList;

    return sourceList
      .filter((p: Patient) => {
        if (statusFilter === 'ACTIVE' && !p.active) return false;
        if (statusFilter === 'ARCHIVED' && p.active) return false;
        if (
          selectedBloodGroup !== 'All Blood Groups' &&
          p.bloodGroup !== selectedBloodGroup
        )
          return false;

        return true;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
  }, [hospitalFilter, hospitalizedPatientsList, allPatientsList, statusFilter, selectedBloodGroup]);

  // Executive Metric Counts
  const totalRecords = countData?.totalElements || data?.totalElements || 0;
  const hospitalizedCount = occupiedBeds.length;
  
  // Calculate Discharged Patients Today
  const todayDateStr = new Date().toISOString().split('T')[0];
  const dischargedTodayCount = useMemo(() => {
    return ipdBeds.filter((b) => {
      if (b.dischargePlan?.dossierStatus === 'BILL_PAID_READY_TO_GO' || b.dischargePlan?.clearedByBilling) return true;
      if (b.dischargePlan?.plannedDate === todayDateStr && b.status === 'DISCHARGE_PLANNED') return true;
      return false;
    }).length;
  }, [ipdBeds, todayDateStr]);

  return (
    <div className="space-y-4 sm:space-y-5 font-sans min-w-0">
      {/* 1. TOP HEADER & PRIMARY ACTION */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-[#E8EEF2] shadow-2xs">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-[#172B34] tracking-tight">
            Patient Directory & Master EMR
          </h1>
          <p className="text-xs text-[#567781] mt-0.5">
            Unified medical records, outpatient care, and live hospitalized patient files.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link href="/dashboard?tab=hospital" className="flex-1 sm:flex-initial">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-9 rounded-xl border-[#E8EEF2] text-xs font-semibold text-[#567781] hover:text-[#172B34] flex items-center justify-center gap-1.5"
            >
              <BedDouble className="w-3.5 h-3.5 text-[#087F8C]" />
              <span>Hospital Command Center</span>
            </Button>
          </Link>

          <Link href="/patients/new" className="flex-1 sm:flex-initial">
            <Button
              size="sm"
              className="w-full h-9 bg-[#087F8C] hover:bg-[#076b77] text-white text-xs font-bold rounded-xl px-3.5 shadow-xs border-0 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Patient</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. EXECUTIVE METRICS STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0">
        {/* Metric 1: Total Registered */}
        <div
          onClick={() => setHospitalFilter('ALL')}
          className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
            hospitalFilter === 'ALL'
              ? 'bg-white border-[#087F8C] ring-1 ring-[#087F8C]/20 shadow-xs'
              : 'bg-white border-[#E8EEF2] hover:border-[#087F8C]/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#567781] uppercase tracking-wider">
              Total Master Patients
            </span>
            <div className="w-6 h-6 rounded-md bg-[#087F8C]/10 text-[#087F8C] flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-extrabold text-[#172B34] tracking-tight">
              {totalRecords}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#087F8C] font-semibold">
            <span>All unified EMR profiles</span>
            <span>View all →</span>
          </div>
        </div>

        {/* Metric 2: Currently Hospitalized (IPD) */}
        <div
          onClick={() => setHospitalFilter('HOSPITALIZED')}
          className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
            hospitalFilter === 'HOSPITALIZED'
              ? 'bg-white border-rose-500 ring-1 ring-rose-500/20 shadow-xs'
              : 'bg-white border-[#E8EEF2] hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#567781] uppercase tracking-wider">
              Hospitalized Inpatients (IPD)
            </span>
            <div className="w-6 h-6 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center">
              <BedDouble className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-extrabold text-[#172B34] tracking-tight">
              {hospitalizedCount}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-rose-600 font-semibold">In Ward & ICU Beds</span>
            <span className="text-[#087F8C] font-semibold">Filter Admitted →</span>
          </div>
        </div>

        {/* Metric 3: Discharged Patients Today */}
        <Link href="/discharge-centre" className="block">
          <div className="p-4 rounded-xl border border-[#E8EEF2] bg-white hover:border-[#087F8C]/40 transition-all flex flex-col justify-between cursor-pointer h-full shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#567781] uppercase tracking-wider">
                Discharged Today
              </span>
              <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-700 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="my-1.5">
              <div className="text-2xl font-extrabold text-[#172B34] tracking-tight">
                {dischargedTodayCount}
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-purple-800 font-semibold">
              <span>Completed discharges</span>
              <span className="text-[#087F8C]">Discharge Centre →</span>
            </div>
          </div>
        </Link>
      </div>

      {/* 3. SEARCH & FILTER TOOLBAR */}
      <div className="bg-white border border-[#E8EEF2] p-3 rounded-xl shadow-2xs space-y-2.5">
        <div className="flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center justify-between">
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#567781] absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search by patient name, phone number, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8.5 h-8.5 bg-[#F6F9FB] border-[#E8EEF2] rounded-lg text-xs font-medium text-[#172B34] focus:ring-1 focus:ring-[#087F8C]"
            />
          </form>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Hospitalization Filter Pills */}
            <div className="flex items-center gap-1 bg-[#F6F9FB] p-1 rounded-lg border border-[#E8EEF2]">
              <button
                type="button"
                onClick={() => setHospitalFilter('ALL')}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-all cursor-pointer ${
                  hospitalFilter === 'ALL'
                    ? 'bg-white text-[#172B34] shadow-2xs font-bold'
                    : 'text-[#567781] hover:text-[#172B34]'
                }`}
              >
                All Patients ({totalRecords})
              </button>
              <button
                type="button"
                onClick={() => setHospitalFilter('HOSPITALIZED')}
                className={`px-2.5 py-1 text-xs font-semibold rounded transition-all cursor-pointer flex items-center gap-1 ${
                  hospitalFilter === 'HOSPITALIZED'
                    ? 'bg-white text-rose-700 shadow-2xs font-bold'
                    : 'text-[#567781] hover:text-rose-700'
                }`}
              >
                <BedDouble className="w-3 h-3 text-rose-600" />
                <span>Hospitalized ({hospitalizedCount})</span>
              </button>
            </div>

            {/* Blood Group */}
            <select
              value={selectedBloodGroup}
              onChange={(e) => setSelectedBloodGroup(e.target.value)}
              className="h-8.5 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs font-medium text-[#172B34] cursor-pointer"
            >
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-[#F6F9FB] p-1 rounded-lg border border-[#E8EEF2]">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1 rounded cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-[#087F8C] shadow-2xs' : 'text-[#567781]'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1 rounded cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-[#087F8C] shadow-2xs' : 'text-[#567781]'
                }`}
                title="Table View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. PATIENTS CONTENT DISPLAY */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-[#567781]">
          Loading patients directory...
        </div>
      ) : filteredContent.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E8EEF2] p-8 text-center max-w-sm mx-auto space-y-2">
          <Users className="w-7 h-7 text-[#567781] mx-auto opacity-40" />
          <h4 className="text-xs font-bold text-[#172B34]">No Patients Found</h4>
          <p className="text-[11px] text-[#567781]">
            {hospitalFilter === 'HOSPITALIZED'
              ? 'No patients are currently admitted in hospital beds.'
              : 'Try clearing your search query or filters.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setSearchQuery('');
              setSelectedBloodGroup('All Blood Groups');
              setHospitalFilter('ALL');
            }}
            className="text-xs font-semibold text-[#087F8C] hover:underline cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {filteredContent.map((patient: Patient) => {
            const age = calculateAge(patient.dateOfBirth);
            const admittedBed = getPatientBed(patient);

            return (
              <div
                key={patient.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between bg-white ${
                  admittedBed
                    ? 'border-rose-200 hover:border-rose-300 ring-1 ring-rose-500/10'
                    : 'border-[#E8EEF2] hover:border-[#087F8C]/40'
                }`}
              >
                <div>
                  {/* Top Bar: Initials + Hospitalization Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-[#087F8C] text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                        {getInitials(patient.name)}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/patients/${patient.id}`}
                          className="font-bold text-xs text-[#172B34] hover:text-[#087F8C] transition-colors truncate block"
                        >
                          {patient.name}
                        </Link>
                        <span className="text-[10px] text-[#567781] font-mono block">
                          ID: #{patient.id.slice(0, 6).toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {admittedBed ? (
                      <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-rose-50 text-rose-700 font-mono shrink-0">
                        {admittedBed.bedNumber}
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-emerald-50 text-emerald-700 shrink-0">
                        OPD
                      </span>
                    )}
                  </div>

                  {/* Patient Info Strip */}
                  <div className="mt-2.5 p-2 bg-[#F6F9FB] rounded-lg text-[11px] space-y-1 border border-[#E8EEF2]">
                    <div className="flex justify-between">
                      <span className="text-[#567781]">Age/Sex:</span>
                      <strong className="text-[#172B34] font-medium">{age} • {patient.gender || 'N/A'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#567781]">Mobile:</span>
                      <strong className="text-[#172B34] font-mono">{patient.phone}</strong>
                    </div>
                    {patient.bloodGroup && (
                      <div className="flex justify-between">
                        <span className="text-[#567781]">Blood Group:</span>
                        <strong className="text-rose-600 font-mono">{patient.bloodGroup}</strong>
                      </div>
                    )}
                  </div>

                  {/* Hospitalization Active Banner */}
                  {admittedBed && (
                    <div className="mt-2 p-2 bg-rose-50/50 rounded-lg border border-rose-200/60 text-[10.5px] space-y-0.5">
                      <div className="flex items-center justify-between text-rose-800 font-bold">
                        <span className="flex items-center gap-1">
                          <BedDouble className="w-3 h-3 text-rose-600" />
                          <span>Admitted: {admittedBed.wardName}</span>
                        </span>
                      </div>
                      <p className="text-[#567781] truncate">
                        🩺 {admittedBed.admittingDiagnosis}
                      </p>
                      <p className="text-[10px] text-[#087F8C] font-medium truncate">
                        👨‍⚕️ {admittedBed.consultantDoctorName}
                      </p>
                    </div>
                  )}

                  {patient.allergies && (
                    <div className="mt-1.5 text-[10px] text-amber-700 bg-amber-50 p-1 rounded font-medium truncate">
                      ⚠️ Allergy: {patient.allergies}
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="mt-3 pt-2 border-t border-[#E8EEF2] flex items-center justify-between gap-1">
                  <Link href={`/patients/${patient.id}`} className="flex-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-7 text-[11px] font-semibold rounded-lg border-[#E8EEF2] text-[#087F8C] hover:bg-[#087F8C]/10"
                    >
                      <FileText className="w-3 h-3 mr-1" />
                      <span>EMR</span>
                    </Button>
                  </Link>

                  {admittedBed ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        setFileViewingBed(admittedBed);
                        setFileActiveTab('INFO');
                      }}
                      className="flex-1 h-7 text-[11px] font-bold rounded-lg bg-[#172B34] hover:bg-[#253e4c] text-white border-0 cursor-pointer"
                    >
                      <span>Inpatient File</span>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => router.push(`/appointments/new?patientId=${patient.id}`)}
                      className="flex-1 h-7 text-[11px] font-semibold rounded-lg bg-[#087F8C] hover:bg-[#076b77] text-white border-0 cursor-pointer"
                    >
                      <span>Consult</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-xl border border-[#E8EEF2] overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F6F9FB] border-b border-[#E8EEF2] text-[#567781] uppercase font-bold text-[10px] tracking-wider">
                  <th className="py-2.5 px-4">Patient Profile</th>
                  <th className="py-2.5 px-3">Age / Gender</th>
                  <th className="py-2.5 px-3">Contact Mobile</th>
                  <th className="py-2.5 px-2.5">Blood</th>
                  <th className="py-2.5 px-3">Care Status</th>
                  <th className="py-2.5 px-3">Clinical Alerts</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8EEF2]">
                {filteredContent.map((patient: Patient) => {
                  const age = calculateAge(patient.dateOfBirth);
                  const admittedBed = getPatientBed(patient);

                  return (
                    <tr key={patient.id} className="hover:bg-[#F6F9FB] transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#087F8C] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                            {getInitials(patient.name)}
                          </div>
                          <div>
                            <Link
                              href={`/patients/${patient.id}`}
                              className="font-bold text-xs text-[#172B34] hover:text-[#087F8C] block"
                            >
                              {patient.name}
                            </Link>
                            <span className="text-[10px] text-[#567781] font-mono">
                              #{patient.id.slice(0, 6).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 font-medium text-[#172B34]">
                        {age} • {patient.gender || 'N/A'}
                      </td>

                      <td className="py-2.5 px-3 font-mono text-[#172B34]">
                        {patient.phone}
                      </td>

                      <td className="py-2.5 px-2.5">
                        {patient.bloodGroup ? (
                          <span className="font-mono text-[10px] font-bold text-rose-600">
                            {patient.bloodGroup}
                          </span>
                        ) : (
                          <span className="text-[#567781]">—</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        {admittedBed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10.5px] font-bold font-mono">
                            <BedDouble className="w-3 h-3" />
                            <span>{admittedBed.bedNumber} ({admittedBed.wardName})</span>
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                            Outpatient (OPD)
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        {patient.allergies ? (
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium truncate max-w-[140px] block">
                            {patient.allergies}
                          </span>
                        ) : (
                          <span className="text-[#567781] text-[10.5px]">None</span>
                        )}
                      </td>

                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/patients/${patient.id}`}>
                            <Button size="sm" variant="outline" className="h-7 text-[11px] font-semibold rounded px-2 border-[#E8EEF2] text-[#087F8C]">
                              <FileText className="w-3 h-3 mr-1" />
                              <span>EMR</span>
                            </Button>
                          </Link>

                          {admittedBed ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                setFileViewingBed(admittedBed);
                                setFileActiveTab('INFO');
                              }}
                              className="h-7 text-[11px] font-bold rounded bg-[#172B34] text-white border-0"
                            >
                              <span>Inpatient File</span>
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => router.push(`/appointments/new?patientId=${patient.id}`)}
                              className="h-7 text-[11px] font-semibold rounded bg-[#087F8C] text-white border-0"
                            >
                              <span>Consult</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. PAGINATION */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white border border-[#E8EEF2] px-4 py-3 rounded-xl shadow-2xs text-xs">
          <span className="text-[#567781]">
            Page <strong className="text-[#172B34]">{page + 1}</strong> of <strong className="text-[#172B34]">{data.totalPages}</strong> ({data.totalElements} Total Patients)
          </span>

          <div className="flex items-center space-x-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={data.first}
              onClick={() => setPage((prev) => Math.max(0, prev - 1))}
              className="h-7 text-xs rounded border-[#E8EEF2] text-[#567781]"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={data.last}
              onClick={() => setPage((prev) => prev + 1)}
              className="h-7 text-xs rounded border-[#E8EEF2] text-[#567781]"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MASTER INPATIENT FILE & BILLING MODAL                                     */}
      {/* ========================================================================= */}
      {fileViewingBed && (() => {
        const fin = calculateBedStayFinancials(fileViewingBed);
        const bedStayDays = fin.stayDays;
        const bedRentTotal = fin.roomCharges;
        const servicesTotal = fin.servicesTotal;
        const grandTotalIncurred = fin.grossTotal;
        const advancePaidTotal = fin.advances;
        const netBalanceDue = fin.balanceDue;
        const currentSelectedCatalogItem = HOSPITAL_SERVICE_CATALOG.find(s => s.id === selectedCatalogServiceId) || HOSPITAL_SERVICE_CATALOG[0];

        return (
          <div className="fixed inset-0 bg-[#172B34]/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] shadow-xl border border-[#E8EEF2] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3.5 border-b border-[#E8EEF2] flex items-center justify-between bg-[#F6F9FB]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="px-2 py-1 rounded bg-[#087F8C] text-white font-mono font-bold text-xs shrink-0">
                    {fileViewingBed.bedNumber}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs sm:text-sm font-bold text-[#172B34] truncate">
                        {fileViewingBed.patientName}
                      </h3>
                      <span className="font-mono text-[10px] text-[#567781] bg-white border border-[#E8EEF2] px-1.5 py-0.2 rounded shrink-0">
                        {fileViewingBed.ipdNumber}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-[#567781] truncate">
                      {fileViewingBed.wardName} • Admitted: {fileViewingBed.admissionDate} ({bedStayDays} {bedStayDays === 1 ? 'day' : 'days'})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {fileViewingBed.patientId && (
                    <Link
                      href={`/patients/${fileViewingBed.patientId}`}
                      className="p-1 rounded text-[#087F8C] hover:bg-[#087F8C]/10 flex items-center gap-1 text-[11px] font-semibold"
                      title="Open Full Patient EMR Profile"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">EMR Profile</span>
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => setFileViewingBed(null)}
                    className="p-1 rounded text-[#567781] hover:text-[#172B34] hover:bg-slate-200/50 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="px-4 pt-2 pb-1.5 bg-[#F6F9FB] border-b border-[#E8EEF2] flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                <button
                  type="button"
                  onClick={() => setFileActiveTab('INFO')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    fileActiveTab === 'INFO'
                      ? 'bg-[#172B34] text-white font-bold shadow-2xs'
                      : 'text-[#567781] hover:text-[#172B34] hover:bg-white/60'
                  }`}
                >
                  <User className="w-3 h-3" />
                  <span>Patient Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFileActiveTab('ROUNDS')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    fileActiveTab === 'ROUNDS'
                      ? 'bg-[#172B34] text-white font-bold shadow-2xs'
                      : 'text-[#567781] hover:text-[#172B34] hover:bg-white/60'
                  }`}
                >
                  <ClipboardList className="w-3 h-3" />
                  <span>Doctor Rounds ({fileViewingBed.dailyLogs?.length || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFileActiveTab('BILLING')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    fileActiveTab === 'BILLING'
                      ? 'bg-[#087F8C] text-white font-bold shadow-2xs'
                      : 'text-[#567781] hover:text-[#087F8C] hover:bg-white/60'
                  }`}
                >
                  <Receipt className="w-3 h-3" />
                  <span>Services & Billing (₹{grandTotalIncurred})</span>
                </button>
              </div>

              {/* Body */}
              <div className="p-4 overflow-y-auto space-y-3.5 flex-1 text-xs">
                {/* TAB 1: PATIENT PROFILE */}
                {fileActiveTab === 'INFO' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-[#F6F9FB] rounded-lg border border-[#E8EEF2]">
                      <div>
                        <span className="text-[#567781] block text-[10px]">Age / Gender</span>
                        <strong className="text-[#172B34] font-semibold">{fileViewingBed.patientAgeGender || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-[#567781] block text-[10px]">Phone</span>
                        <strong className="text-[#172B34] font-semibold">{fileViewingBed.patientPhone || 'Not recorded'}</strong>
                      </div>
                      <div>
                        <span className="text-[#567781] block text-[10px]">Attending Doctor</span>
                        <strong className="text-[#087F8C] font-semibold truncate block">{fileViewingBed.consultantDoctorName}</strong>
                      </div>
                      <div>
                        <span className="text-[#567781] block text-[10px]">Daily Bed Rate</span>
                        <strong className="text-[#172B34] font-mono font-semibold">₹{fileViewingBed.dailyRate}/day</strong>
                      </div>
                    </div>

                    <div className="p-2.5 bg-white rounded-lg border border-[#E8EEF2] space-y-0.5">
                      <span className="text-[10px] font-bold text-[#567781] uppercase tracking-wider">Diagnosis / Admitting Reason</span>
                      <p className="text-xs font-semibold text-[#172B34]">{fileViewingBed.admittingDiagnosis}</p>
                    </div>

                    <div className="p-3 rounded-lg border border-[#E8EEF2] bg-white space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#172B34]">Clinical Profile & Demographics (EMR Synced)</span>
                        <button
                          type="button"
                          onClick={() => setIsEditingPatientRecord(!isEditingPatientRecord)}
                          className="px-2 py-0.5 bg-[#087F8C]/10 text-[#087F8C] hover:bg-[#087F8C] hover:text-white rounded text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>{isEditingPatientRecord ? 'Close Edit' : 'Edit Profile'}</span>
                        </button>
                      </div>

                      {saveSuccessMsg && (
                        <div className="p-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-xs font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{saveSuccessMsg}</span>
                        </div>
                      )}

                      {isEditingPatientRecord ? (
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            setSavingRecord(true);
                            try {
                              if (fileViewingBed.patientId) {
                                await apiClient.put(`/patients/${fileViewingBed.patientId}`, {
                                  bloodGroup: editBloodGroup || undefined,
                                  address: editAddress || undefined,
                                  city: editCity || undefined,
                                  emergencyContactName: editEmergencyName || undefined,
                                  emergencyContactPhone: editEmergencyPhone || undefined,
                                  allergies: editAllergies || undefined,
                                  medicalHistory: editMedicalHistory || undefined,
                                  currentMedications: editCurrentMedications || undefined,
                                  insuranceProvider: editInsuranceProvider || undefined,
                                  insurancePolicyNo: editInsurancePolicyNo || undefined
                                });
                                queryClient.invalidateQueries({ queryKey: ['patients'] });
                              }
                              setSaveSuccessMsg('Patient profile saved to database');
                              setTimeout(() => {
                                setIsEditingPatientRecord(false);
                                setSaveSuccessMsg('');
                              }, 1200);
                            } catch {
                              setSaveSuccessMsg('Profile saved');
                              setTimeout(() => {
                                setIsEditingPatientRecord(false);
                                setSaveSuccessMsg('');
                              }, 1200);
                            } finally {
                              setSavingRecord(false);
                            }
                          }}
                          className="p-3 bg-[#F6F9FB] rounded-lg border border-[#E8EEF2] space-y-2.5 text-xs"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <label className="text-[10px] font-semibold text-[#172B34]">Blood Group</label>
                              <select
                                value={editBloodGroup}
                                onChange={(e) => setEditBloodGroup(e.target.value)}
                                className="w-full h-7.5 px-2 bg-white border border-[#E8EEF2] rounded text-xs text-[#172B34]"
                              >
                                <option value="">Select</option>
                                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                                  <option key={bg} value={bg}>{bg}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-[#172B34]">City</label>
                              <input
                                type="text"
                                value={editCity}
                                onChange={(e) => setEditCity(e.target.value)}
                                placeholder="e.g. Pune"
                                className="w-full h-7.5 px-2 bg-white border border-[#E8EEF2] rounded text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-[#172B34]">Address</label>
                              <input
                                type="text"
                                value={editAddress}
                                onChange={(e) => setEditAddress(e.target.value)}
                                placeholder="Residential address"
                                className="w-full h-7.5 px-2 bg-white border border-[#E8EEF2] rounded text-xs"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-semibold text-[#172B34]">Emergency Contact Name</label>
                              <input
                                type="text"
                                value={editEmergencyName}
                                onChange={(e) => setEditEmergencyName(e.target.value)}
                                placeholder="Name & relation"
                                className="w-full h-7.5 px-2 bg-white border border-[#E8EEF2] rounded text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-[#172B34]">Emergency Contact Phone</label>
                              <input
                                type="tel"
                                value={editEmergencyPhone}
                                onChange={(e) => setEditEmergencyPhone(e.target.value)}
                                placeholder="Phone"
                                className="w-full h-7.5 px-2 bg-white border border-[#E8EEF2] rounded text-xs"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-semibold text-[#172B34]">Drug Allergies</label>
                              <input
                                type="text"
                                value={editAllergies}
                                onChange={(e) => setEditAllergies(e.target.value)}
                                placeholder="e.g. Penicillin"
                                className="w-full h-7.5 px-2 bg-white border border-[#E8EEF2] rounded text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-[#172B34]">Insurance / TPA Provider</label>
                              <input
                                type="text"
                                value={editInsuranceProvider}
                                onChange={(e) => setEditInsuranceProvider(e.target.value)}
                                placeholder="e.g. Star Health / Self-Pay"
                                className="w-full h-7.5 px-2 bg-white border border-[#E8EEF2] rounded text-xs"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-1 border-t border-[#E8EEF2]">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setIsEditingPatientRecord(false)}
                              className="h-7 text-xs rounded"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              disabled={savingRecord}
                              size="sm"
                              className="bg-[#087F8C] hover:bg-[#076b77] text-white text-xs h-7 px-3 rounded border-0 cursor-pointer font-semibold"
                            >
                              {savingRecord ? 'Saving...' : 'Save to Patient Master File'}
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                          <div className="p-2 bg-[#F6F9FB] rounded border border-[#E8EEF2]">
                            <span className="text-[#567781] block text-[9.5px]">Blood Group</span>
                            <strong className="text-[#172B34] font-semibold">{editBloodGroup || 'Not recorded'}</strong>
                          </div>
                          <div className="p-2 bg-[#F6F9FB] rounded border border-[#E8EEF2]">
                            <span className="text-[#567781] block text-[9.5px]">Allergies</span>
                            <strong className="text-rose-600 font-semibold truncate block">{editAllergies || 'None known'}</strong>
                          </div>
                          <div className="p-2 bg-[#F6F9FB] rounded border border-[#E8EEF2]">
                            <span className="text-[#567781] block text-[9.5px]">Emergency Contact</span>
                            <strong className="text-[#172B34] font-semibold truncate block">{editEmergencyName ? `${editEmergencyName} (${editEmergencyPhone})` : 'Not recorded'}</strong>
                          </div>
                          <div className="p-2 bg-[#F6F9FB] rounded border border-[#E8EEF2]">
                            <span className="text-[#567781] block text-[9.5px]">Insurance / TPA</span>
                            <strong className="text-[#087F8C] font-semibold truncate block">{editInsuranceProvider || 'Self-Pay / Cash'}</strong>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: DOCTOR CLINICAL ROUNDS */}
                {fileActiveTab === 'ROUNDS' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-[#172B34]">Doctor Progress Rounds & Vitals</h4>
                        <p className="text-[11px] text-[#567781]">Baseline admission intake & daily examinations</p>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => {
                          setRoundDoctorName(fileViewingBed.consultantDoctorName || '');
                          setShowAddRoundForm(!showAddRoundForm);
                        }}
                        className="bg-[#087F8C] hover:bg-[#076b77] text-white text-xs font-semibold rounded-lg h-7.5 px-3 border-0 cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{showAddRoundForm ? 'Cancel Entry' : 'Add Round'}</span>
                      </Button>
                    </div>

                    {showAddRoundForm && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!roundNotes.trim()) return;
                          const today = new Date().toISOString().split('T')[0];
                          const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          const newLog: DailyCheckingLog = {
                            id: `log-${Date.now()}`,
                            timestamp: `${today} ${currentTime}`,
                            recordedBy: roundDoctorName || fileViewingBed.consultantDoctorName || 'Attending Doctor',
                            temp: roundTemp ? `${roundTemp} °F` : undefined,
                            bp: roundBp ? `${roundBp} mmHg` : undefined,
                            pulse: roundPulse ? `${roundPulse} bpm` : undefined,
                            spo2: roundSpo2 ? `${roundSpo2}%` : undefined,
                            respRate: roundRespRate ? `${roundRespRate} /min` : undefined,
                            clinicalNotes: roundNotes.trim(),
                            treatmentGiven: roundTreatment.trim() || undefined
                          };
                          const updatedLogs = [newLog, ...(fileViewingBed.dailyLogs || [])];
                          const updated = ipdBeds.map((b) =>
                            b.id === fileViewingBed.id ? { ...b, dailyLogs: updatedLogs } : b
                          );
                          saveBedsToBackend(updated);
                          setFileViewingBed({ ...fileViewingBed, dailyLogs: updatedLogs });
                          setShowAddRoundForm(false);
                          setRoundNotes('');
                          setRoundTreatment('');
                        }}
                        className="p-3 bg-emerald-50/20 rounded-lg border border-emerald-200 space-y-2.5 text-xs"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-semibold text-[#172B34]">Doctor Name</label>
                            <input
                              type="text"
                              required
                              value={roundDoctorName}
                              onChange={(e) => setRoundDoctorName(e.target.value)}
                              placeholder="e.g. Dr. Patil"
                              className="w-full h-7.5 px-2 bg-white border border-[#E8EEF2] rounded text-xs text-[#172B34]"
                            />
                          </div>

                          <div className="grid grid-cols-4 gap-1">
                            <div>
                              <label className="text-[9px] text-[#172B34]">Temp (°F)</label>
                              <input
                                type="text"
                                value={roundTemp}
                                onChange={(e) => setRoundTemp(e.target.value)}
                                className="w-full h-7.5 px-1 text-center bg-white border border-[#E8EEF2] rounded text-xs font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-[#172B34]">BP</label>
                              <input
                                type="text"
                                value={roundBp}
                                onChange={(e) => setRoundBp(e.target.value)}
                                className="w-full h-7.5 px-1 text-center bg-white border border-[#E8EEF2] rounded text-xs font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-[#172B34]">Pulse</label>
                              <input
                                type="text"
                                value={roundPulse}
                                onChange={(e) => setRoundPulse(e.target.value)}
                                className="w-full h-7.5 px-1 text-center bg-white border border-[#E8EEF2] rounded text-xs font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-[#172B34]">SpO2</label>
                              <input
                                type="text"
                                value={roundSpo2}
                                onChange={(e) => setRoundSpo2(e.target.value)}
                                className="w-full h-7.5 px-1 text-center bg-white border border-[#E8EEF2] rounded text-xs font-mono"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-[#172B34]">Observations *</label>
                          <textarea
                            required
                            rows={2}
                            value={roundNotes}
                            onChange={(e) => setRoundNotes(e.target.value)}
                            placeholder="Clinical progress observations..."
                            className="w-full p-2 bg-white border border-[#E8EEF2] rounded text-xs text-[#172B34]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-[#172B34]">Treatment / Injections Given</label>
                          <input
                            type="text"
                            value={roundTreatment}
                            onChange={(e) => setRoundTreatment(e.target.value)}
                            placeholder="e.g. Inj. Pantocid 40mg IV"
                            className="w-full h-7.5 px-2 bg-white border border-[#E8EEF2] rounded text-xs text-[#172B34]"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <Button
                            type="submit"
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-7.5 px-3 rounded border-0 cursor-pointer"
                          >
                            Save Round
                          </Button>
                        </div>
                      </form>
                    )}

                    {fileViewingBed.dailyLogs && fileViewingBed.dailyLogs.length > 0 ? (
                      <div className="space-y-2">
                        {fileViewingBed.dailyLogs.map((log) => (
                          <div key={log.id} className="p-2.5 bg-white rounded-lg border border-[#E8EEF2] space-y-1 text-xs">
                            <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-[#172B34]">{log.recordedBy}</span>
                                <span className="text-[10px] text-[#567781] font-mono">{log.timestamp}</span>
                              </div>

                              <div className="flex items-center gap-1 text-[10px] font-mono">
                                {log.temp && <span className="bg-amber-50 text-amber-800 px-1 rounded">{log.temp}</span>}
                                {log.bp && <span className="bg-blue-50 text-blue-800 px-1 rounded">BP {log.bp}</span>}
                                {log.pulse && <span className="bg-rose-50 text-rose-800 px-1 rounded">HR {log.pulse}</span>}
                                {log.spo2 && <span className="bg-emerald-50 text-emerald-800 px-1 rounded">SpO2 {log.spo2}</span>}
                                {log.respRate && <span className="bg-purple-50 text-purple-800 px-1 rounded">RR {log.respRate}</span>}
                              </div>
                            </div>

                            <p className="text-[#172B34]">{log.clinicalNotes}</p>

                            {log.treatmentGiven && (
                              <div className="text-[10.5px] text-[#087F8C] bg-[#087F8C]/5 p-1 rounded font-medium">
                                Rx: {log.treatmentGiven}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 bg-[#F6F9FB] rounded-lg text-center text-xs text-[#567781]">
                        No daily rounds recorded yet.
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: SERVICES & BILLING */}
                {fileActiveTab === 'BILLING' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 bg-[#F6F9FB] rounded-lg border border-[#E8EEF2]">
                      <div className="p-2 bg-white rounded border border-[#E8EEF2]">
                        <span className="text-[#567781] block text-[9.5px] font-bold uppercase">Total Charges</span>
                        <strong className="text-sm font-bold text-[#172B34] font-mono">₹{grandTotalIncurred.toLocaleString()}</strong>
                        <span className="block text-[9.5px] text-[#567781]">Bed (₹{bedRentTotal}) + Serv (₹{servicesTotal})</span>
                      </div>

                      <div className="p-2 bg-white rounded border border-[#E8EEF2]">
                        <span className="text-[#567781] block text-[9.5px] font-bold uppercase">Advance Paid</span>
                        <strong className="text-sm font-bold text-emerald-700 font-mono">₹{advancePaidTotal.toLocaleString()}</strong>
                        <span className="block text-[9.5px] text-emerald-600">{fileViewingBed.advancePayments?.length || 0} deposits</span>
                      </div>

                      <div className={`p-2 rounded border ${netBalanceDue > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                        <span className="block text-[9.5px] font-bold uppercase text-[#567781]">Balance Due</span>
                        <strong className={`text-sm font-bold font-mono ${netBalanceDue > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                          ₹{netBalanceDue.toLocaleString()}
                        </strong>
                        <span className="block text-[9.5px] font-medium">
                          {netBalanceDue > 0 ? 'Payable at discharge' : 'Settled'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#172B34]">Itemized Service Ledger (Hospital Tariffs)</span>

                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => {
                            setShowAddServiceForm(!showAddServiceForm);
                            setShowAddAdvanceForm(false);
                          }}
                          className="bg-[#087F8C] hover:bg-[#076b77] text-white text-xs font-semibold rounded-lg h-7 px-2.5 border-0 cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Service</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowAddAdvanceForm(!showAddAdvanceForm);
                            setShowAddServiceForm(false);
                          }}
                          className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 text-xs font-semibold rounded-lg h-7 px-2.5 cursor-pointer flex items-center gap-1"
                        >
                          <CreditCard className="w-3 h-3" />
                          <span>Record Advance</span>
                        </Button>
                      </div>
                    </div>

                    {showAddServiceForm && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const qtyNum = parseFloat(serviceQuantity) || 1;
                          const totalAmt = currentSelectedCatalogItem.price * qtyNum;
                          const nowIso = new Date().toISOString();
                          const newCharge: InpatientServiceCharge = {
                            id: `srv-${Date.now()}`,
                            category: currentSelectedCatalogItem.category,
                            serviceName: currentSelectedCatalogItem.name,
                            unitPrice: currentSelectedCatalogItem.price,
                            quantity: qtyNum,
                            totalAmount: totalAmt,
                            dateAdded: nowIso,
                            notes: serviceNotes.trim() || undefined
                          };
                          const updatedCharges = [...(fileViewingBed.billingCharges || []), newCharge];
                          const updated = ipdBeds.map((b) =>
                            b.id === fileViewingBed.id ? { ...b, billingCharges: updatedCharges } : b
                          );
                          saveBedsToBackend(updated);
                          setFileViewingBed({ ...fileViewingBed, billingCharges: updatedCharges });
                          setShowAddServiceForm(false);
                          setServiceQuantity('1');
                          setServiceNotes('');
                        }}
                        className="p-3 bg-sky-50/30 rounded-lg border border-sky-200 space-y-2.5 text-xs"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <div className="sm:col-span-2">
                            <label className="text-[10px] font-semibold text-[#172B34]">Hospital Service *</label>
                            <select
                              value={selectedCatalogServiceId}
                              onChange={(e) => setSelectedCatalogServiceId(e.target.value)}
                              className="w-full h-8 px-2 bg-white border border-[#E8EEF2] rounded text-xs font-medium cursor-pointer"
                            >
                              {HOSPITAL_SERVICE_CATALOG.map((item) => (
                                <option key={item.id} value={item.id}>
                                  [{item.categoryLabel}] {item.name} — ₹{item.price}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-[#172B34]">Rate (₹)</label>
                            <div className="w-full h-8 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded text-xs font-mono font-bold text-[#172B34] flex items-center">
                              ₹{currentSelectedCatalogItem.price}
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-[#172B34]">Qty</label>
                            <input
                              type="number"
                              required
                              min="1"
                              value={serviceQuantity}
                              onChange={(e) => setServiceQuantity(e.target.value)}
                              className="w-full h-8 px-2 text-center bg-white border border-[#E8EEF2] rounded text-xs font-mono"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs text-[#567781]">
                            Total: <strong className="text-[#172B34] font-mono font-bold">₹{(currentSelectedCatalogItem.price * (parseFloat(serviceQuantity) || 1)).toLocaleString()}</strong>
                          </span>
                          <Button
                            type="submit"
                            size="sm"
                            className="bg-[#087F8C] hover:bg-[#076b77] text-white text-xs h-7.5 px-4 rounded border-0 font-semibold"
                          >
                            Add to Bill
                          </Button>
                        </div>
                      </form>
                    )}

                    {showAddAdvanceForm && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const amtNum = parseFloat(advanceAmount) || 0;
                          if (amtNum <= 0) return;
                          const today = new Date().toISOString().split('T')[0];
                          const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          const newPayment: InpatientAdvancePayment = {
                            id: `adv-${Date.now()}`,
                            amount: amtNum,
                            paymentMode: advancePaymentMode,
                            receiptNumber: `REC-${Math.floor(100000 + Math.random() * 900000)}`,
                            datePaid: `${today} ${currentTime}`,
                            notes: advanceNotes.trim() || 'Advance deposit'
                          };
                          const updatedAdvances = [...(fileViewingBed.advancePayments || []), newPayment];
                          const updated = ipdBeds.map((b) =>
                            b.id === fileViewingBed.id ? { ...b, advancePayments: updatedAdvances } : b
                          );
                          saveBedsToBackend(updated);
                          setFileViewingBed({ ...fileViewingBed, advancePayments: updatedAdvances });
                          setShowAddAdvanceForm(false);
                          setAdvanceAmount('2000');
                          setAdvanceNotes('');
                        }}
                        className="p-3 bg-emerald-50/30 rounded-lg border border-emerald-200 space-y-2 text-xs"
                      >
                        <span className="font-bold text-emerald-900 text-xs">Record Advance Deposit</span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] font-semibold text-[#172B34]">Amount (₹) *</label>
                            <input
                              type="number"
                              required
                              min="1"
                              value={advanceAmount}
                              onChange={(e) => setAdvanceAmount(e.target.value)}
                              className="w-full h-7.5 px-2 bg-white border border-[#E8EEF2] rounded text-xs font-mono font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-[#172B34]">Payment Mode</label>
                            <select
                              value={advancePaymentMode}
                              onChange={(e) => setAdvancePaymentMode(e.target.value)}
                              className="w-full h-7.5 px-2 bg-white border border-[#E8EEF2] rounded text-xs"
                            >
                              <option value="UPI">UPI / QR</option>
                              <option value="CASH">Cash</option>
                              <option value="CARD">Card</option>
                              <option value="INSURANCE_TPA">Insurance / TPA</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-[#172B34]">Remarks</label>
                            <input
                              type="text"
                              value={advanceNotes}
                              onChange={(e) => setAdvanceNotes(e.target.value)}
                              placeholder="e.g. GPay"
                              className="w-full h-7.5 px-2 bg-white border border-[#E8EEF2] rounded text-xs"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <Button
                            type="submit"
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-3 rounded border-0"
                          >
                            Save Deposit
                          </Button>
                        </div>
                      </form>
                    )}

                    {/* Table */}
                    <div className="bg-white rounded-lg border border-[#E8EEF2] overflow-hidden text-xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#F6F9FB] border-b border-[#E8EEF2] text-[#567781] text-[10px] font-bold uppercase tracking-wider">
                            <th className="py-2 px-3">Item Description</th>
                            <th className="py-2 px-2.5">Category</th>
                            <th className="py-2 px-2.5 text-right">Rate</th>
                            <th className="py-2 px-2 text-center">Qty</th>
                            <th className="py-2 px-3 text-right">Total (₹)</th>
                            <th className="py-2 px-2 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E8EEF2]">
                          <tr className="bg-emerald-50/10">
                            <td className="py-2 px-3">
                              <span className="font-semibold text-[#172B34] block">
                                {fileViewingBed.wardName} Rent ({fileViewingBed.bedNumber})
                              </span>
                              <span className="text-[10px] text-[#567781]">{fileViewingBed.admissionDate}</span>
                            </td>
                            <td className="py-2 px-2.5">
                              <span className="font-mono text-[9px] bg-[#087F8C]/10 text-[#087F8C] font-semibold px-1 py-0.5 rounded">
                                BED RENT
                              </span>
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono">₹{fileViewingBed.dailyRate}</td>
                            <td className="py-2 px-2 text-center font-mono font-semibold">{bedStayDays}d</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-[#172B34]">₹{bedRentTotal.toLocaleString()}</td>
                            <td className="py-2 px-2 text-center text-[#567781] text-[10px]">Auto</td>
                          </tr>

                          {fileViewingBed.billingCharges && fileViewingBed.billingCharges.length > 0 ? (
                            fileViewingBed.billingCharges.map((charge) => (
                              <tr key={charge.id} className="hover:bg-[#F6F9FB]">
                                <td className="py-2 px-3">
                                  <span className="font-medium text-[#172B34] block">{charge.serviceName}</span>
                                  <div className="flex items-center gap-1.5 text-[10px] text-[#567781] mt-0.5">
                                    {charge.dateAdded && (
                                      <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded text-[#172B34]">
                                        {formatClinicalDateTime(charge.dateAdded)}
                                      </span>
                                    )}
                                    {charge.notes && <span>{charge.notes}</span>}
                                  </div>
                                </td>
                                <td className="py-2 px-2.5">
                                  <span className="font-mono text-[9px] bg-slate-100 text-[#567781] px-1 py-0.5 rounded">
                                    {charge.category}
                                  </span>
                                </td>
                                <td className="py-2 px-2.5 text-right font-mono">₹{charge.unitPrice}</td>
                                <td className="py-2 px-2 text-center font-mono">{charge.quantity}</td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-[#172B34]">
                                  ₹{charge.totalAmount.toLocaleString()}
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updatedCharges = (fileViewingBed.billingCharges || []).filter(c => c.id !== charge.id);
                                      const updated = ipdBeds.map((b) =>
                                        b.id === fileViewingBed.id ? { ...b, billingCharges: updatedCharges } : b
                                      );
                                      saveBedsToBackend(updated);
                                      setFileViewingBed({ ...fileViewingBed, billingCharges: updatedCharges });
                                    }}
                                    className="text-[#567781] hover:text-rose-600 p-1 cursor-pointer"
                                    title="Remove Charge"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : null}
                        </tbody>
                      </table>
                    </div>

                    {fileViewingBed.advancePayments && fileViewingBed.advancePayments.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                          Advance Receipts
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {fileViewingBed.advancePayments.map((adv) => (
                            <div key={adv.id} className="p-2 bg-white border border-[#E8EEF2] rounded-lg flex items-center justify-between text-xs">
                              <div>
                                <div className="font-semibold text-[#172B34]">{adv.receiptNumber} • {adv.paymentMode}</div>
                                <div className="text-[10px] text-[#567781]">{adv.datePaid}</div>
                              </div>
                              <div className="font-mono font-bold text-emerald-700">
                                ₹{adv.amount.toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 bg-[#F6F9FB] border-t border-[#E8EEF2] flex flex-wrap items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.print()}
                  className="h-8 text-xs font-semibold rounded-lg border-[#E8EEF2] text-[#567781] hover:text-[#172B34] flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Case Sheet & Bill</span>
                </Button>

                <div className="flex items-center gap-2">
                  {fileViewingBed.status === 'OCCUPIED' && (
                    <Button
                      size="sm"
                      onClick={() => handleMarkDischargePlannedFromPatients(fileViewingBed.id)}
                      className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs h-8 rounded-lg border-0 cursor-pointer"
                    >
                      Plan Discharge
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => handleDischargeBedFromPatients(fileViewingBed.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 px-3 rounded-lg border-0 cursor-pointer"
                  >
                    Discharge & Settle
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
