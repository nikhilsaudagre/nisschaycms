'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

import {
  Doctor,
  Appointment,
  Patient,
  Clinic,
  InpatientServiceCharge,
  InpatientAdvancePayment,
  DailyCheckingLog,
  InpatientBedLabOrder,
  InpatientMedicationOrder,
  InpatientMedicationItem,
  LabInvestigationOrder,
  TakeHomeMedication,
  DischargeType,
  HospitalBed,
  PatientTimelineEvent,
  PatientLedgerSummaryResponse,
  BillingLedgerEntryResponse
} from '@/types';
import { Button } from '@/components/ui/button';
import { calculateBedStayFinancials } from '@/lib/financial-calculator';
import { DoctorPrescriptionNotepadModal } from '@/components/prescription-notepad-modal';
import { DischargeSummaryPrintDocument } from '@/components/discharge-summary-print-document';
import { InvoicePrintDocument } from '@/components/invoice-print-document';
import { MedicalCertificatePrintDocument } from '@/components/medical-certificate-print-document';
import { HospitalizationCertificatePrintDocument } from '@/components/hospitalization-certificate-print-document';
import { ReferralMemoPrintDocument } from '@/components/referral-memo-print-document';
import {
  BedDouble,
  User,
  Phone,
  Mail,
  Calendar,
  Heart,
  Scale,
  FileText,
  Clock,
  ArrowLeft,
  Edit2,
  Stethoscope,
  Pill,
  Printer,
  ChevronDown,
  ChevronUp,
  Activity,
  AlertTriangle,
  Receipt,
  Share2,
  Lock,
  Eye,
  Hospital,
  Building,
  CheckCircle2,
  Plus,
  ExternalLink,
  ClipboardList,
  CreditCard,
  FlaskConical,
  Scissors,
  CheckCircle,
  AlertCircle,
  Download,
  Trash2,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Check,
  LogOut,
  DollarSign,
  ShoppingCart,
  X
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { getCurrentDateTimeStr, formatClinicalDateTime, formatClinicalTime, formatRelativeTime } from '@/lib/utils';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isValidUuid = (val?: string) => Boolean(val && UUID_REGEX.test(val));

const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

// Master Hospital Diagnostic & Lab Test Catalog
const HOSPITAL_LAB_CATALOG = [
  { id: 'lab-cbc', name: 'Complete Blood Count (CBC + ESR)', category: 'HEMATOLOGY', price: 350 },
  { id: 'lab-lft', name: 'Liver Function Test (LFT Profile)', category: 'BIOCHEMISTRY', price: 650 },
  { id: 'lab-kft', name: 'Renal / Kidney Function Test (RFT / KFT)', category: 'BIOCHEMISTRY', price: 550 },
  { id: 'lab-lipid', name: 'Lipid Profile (Cholesterol, HDL, LDL, Triglycerides)', category: 'BIOCHEMISTRY', price: 600 },
  { id: 'lab-hba1c', name: 'HbA1c (Glycated Hemoglobin Test)', category: 'BIOCHEMISTRY', price: 450 },
  { id: 'lab-thyroid', name: 'Thyroid Profile Total (T3, T4, TSH)', category: 'BIOCHEMISTRY', price: 500 },
  { id: 'lab-xray-chest', name: 'Digital Chest X-Ray (PA View)', category: 'RADIOLOGY', price: 400 },
  { id: 'lab-ecg', name: '12-Lead Electrocardiogram (ECG with Interpretation)', category: 'CARDIOLOGY', price: 300 },
  { id: 'lab-usg-abd', name: 'Ultrasound (USG) Whole Abdomen & Pelvis', category: 'RADIOLOGY', price: 950 },
  { id: 'lab-urine-r', name: 'Urine Routine & Microscopic Examination', category: 'PATHOLOGY', price: 180 },
  { id: 'lab-crp', name: 'C-Reactive Protein (CRP Quantitative)', category: 'HEMATOLOGY', price: 420 },
  { id: 'lab-d-dimer', name: 'D-Dimer Coagulation Assay', category: 'HEMATOLOGY', price: 850 }
];

export interface PatientPharmacySalesRecord {
  id: string;
  invoiceNo: string;
  dateTime: string;
  customerType: 'WALK_IN' | 'OPD_PATIENT' | 'IPD_BED';
  patientId?: string;
  patientName: string;
  patientPhone: string;
  bedNumber?: string;
  wardName?: string;
  doctorName: string;
  dispensedBy: string;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    batchNumber?: string;
    total: number;
  }[];
  subtotal: number;
  tax: number;
  discount: number;
  grandTotal: number;
  paymentMode: string;
  cashTendered?: number;
  changeReturned?: number;
}

export default function PatientDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Tabs: 1. Demographics/Profile, 2. Timeline/Journey, 3. OPD Consultations, 4. Inpatient Stay, 5. Labs, 6. Medications, 7. Billing, 8. Documents
  const [activeTab, setActiveTabState] = useState<'profile' | 'timeline' | 'consultations' | 'inpatient' | 'labs' | 'medications' | 'billing' | 'documents'>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      const validTabs = ['profile', 'timeline', 'consultations', 'inpatient', 'labs', 'medications', 'billing', 'documents'];
      if (tabParam && validTabs.includes(tabParam)) {
        return tabParam as any;
      }
      const saved = localStorage.getItem(`nisschay_patient_tab_${id}`);
      if (saved && validTabs.includes(saved)) {
        return saved as any;
      }
    }
    return 'profile';
  });

  const setActiveTab = (tab: 'profile' | 'timeline' | 'consultations' | 'inpatient' | 'labs' | 'medications' | 'billing' | 'documents') => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`nisschay_patient_tab_${id}`, tab);
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url.toString());
    }
  };
  const [expandedApptIds, setExpandedApptIds] = useState<Record<string, boolean>>({});
  const [selectedPrintAppt, setSelectedPrintAppt] = useState<Appointment | null>(null);
  const [editingConsultAppt, setEditingConsultAppt] = useState<Appointment | null>(null);
  const [ipdBeds, setIpdBeds] = useState<HospitalBed[]>([]);
  const [labOrders, setLabOrders] = useState<LabInvestigationOrder[]>([]);
  const [pharmacySales, setPharmacySales] = useState<PatientPharmacySalesRecord[]>([]);
  const [selectedPrintPharmacySale, setSelectedPrintPharmacySale] = useState<PatientPharmacySalesRecord | null>(null);

  // Sub-tabs under Labs and Medications (OPD vs IPD)
  const [labSubTab, setLabSubTab] = useState<'ALL' | 'OPD' | 'IPD'>('ALL');
  const [medSubTab, setMedSubTab] = useState<'ALL' | 'OPD' | 'IPD'>('ALL');

  // Staff Administration of IPD Medicine Modal
  const [showAdministerModal, setShowAdministerModal] = useState<boolean>(false);
  const [viewingPatientBedMedModal, setViewingPatientBedMedModal] = useState<InpatientMedicationOrder | null>(null);
  const [administerMedId, setAdministerMedId] = useState<string>('');
  const [administerNurseName, setAdministerNurseName] = useState<string>('Staff Nurse Sneha');
  const [administerNotes, setAdministerNotes] = useState<string>('Dose administered as per schedule');

  // Add Inpatient Medicine Modal from EMR (Multi-Row Support)
  const [showAddIpdMedModal, setShowAddIpdMedModal] = useState<boolean>(false);
  const [ipdMedDoctor, setIpdMedDoctor] = useState<string>('');
  const [ipdMedNurse, setIpdMedNurse] = useState<string>('Staff Nurse Sneha');
  const [ipdMedRows, setIpdMedRows] = useState<Array<{
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    source: 'HOSPITAL_PHARMACY' | 'OUTSIDE_PATIENT_OWN';
    notes: string;
  }>>([
    {
      id: `ipd-row-${Date.now()}`,
      name: '',
      dosage: '1 Tab / 1 Amp',
      frequency: 'Twice Daily (BD - 1-0-1)',
      source: 'HOSPITAL_PHARMACY',
      notes: ''
    }
  ]);

  // Modals
  const [showOrderLabModal, setShowOrderLabModal] = useState<boolean>(false);
  const [selectedCatalogLabId, setSelectedCatalogLabId] = useState<string>(HOSPITAL_LAB_CATALOG[0].id);
  const [labOrderDoctor, setLabOrderDoctor] = useState<string>('');
  const [labOrderUrgency, setLabOrderUrgency] = useState<'ROUTINE' | 'STAT_EMERGENCY'>('ROUTINE');
  const [labOrderNotes, setLabOrderNotes] = useState<string>('');

  // Add Daily Round Modal inside EMR
  const [showAddRoundModal, setShowAddRoundModal] = useState<boolean>(false);
  const [roundDoctorName, setRoundDoctorName] = useState<string>('');
  const [roundTemp, setRoundTemp] = useState<string>('98.6');
  const [roundBp, setRoundBp] = useState<string>('120/80');
  const [roundPulse, setRoundPulse] = useState<string>('78');
  const [roundSpo2, setRoundSpo2] = useState<string>('99');
  const [roundRespRate, setRoundRespRate] = useState<string>('18');
  const [roundNotes, setRoundNotes] = useState<string>('');
  const [roundTreatment, setRoundTreatment] = useState<string>('');

  // Add Advance Deposit Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [paymentAmount, setPaymentAmount] = useState<string>('3000');
  const [paymentMode, setPaymentMode] = useState<string>('UPI');
  const [paymentNotes, setPaymentNotes] = useState<string>('Inpatient running deposit');

  // Inpatient File Clinical Sub-Tabs
  const [ipdStayFileTab, setIpdStayFileTab] = useState<'ALL_HISTORY' | 'ROUNDS' | 'MEDS' | 'LABS' | 'SERVICES' | 'DISCHARGE'>('ALL_HISTORY');

  // Itemized EMR Billing Ledger Sorting & Sub-Tabs
  const [billingSubTab, setBillingSubTab] = useState<'UNPAID' | 'PAID'>('UNPAID');
  const [emrLedgerSortOrder, setEmrLedgerSortOrder] = useState<'LAST_TO_FIRST' | 'FIRST_TO_LAST'>('LAST_TO_FIRST');
  const [patientDirectPayments, setPatientDirectPayments] = useState<InpatientAdvancePayment[]>([]);

  // Discharge Settlement Modal
  const [showDischargeModal, setShowDischargeModal] = useState<boolean>(false);
  const [dischargeType, setDischargeType] = useState<DischargeType>('REGULAR');
  const [dischargeDiagnosis, setDischargeDiagnosis] = useState<string>('');
  const [dischargeCondition, setDischargeCondition] = useState<string>('Hemodynamically stable, afebrile, ambulatory.');
  const [dischargeCourse, setDischargeCourse] = useState<string>('Patient responded favorably to treatment, vitals stable, afebrile.');
  const [dischargeAdvice, setDischargeAdvice] = useState<string>('Take prescribed medications regularly. Low salt balanced diet. Adequate hydration.');
  const [dischargeFollowUp, setDischargeFollowUp] = useState<string>('After 7 days in OPD with Attending Consultant');
  const [dischargeEmergencySigns, setDischargeEmergencySigns] = useState<string>('High fever >101°F, severe persistent pain, vomiting, or breathing difficulty.');
  const [dischargeTakeHomeMeds, setDischargeTakeHomeMeds] = useState<TakeHomeMedication[]>([
    {
      id: `thm-p1`,
      name: 'Tab. Augmentin 625mg',
      dosage: '625 mg',
      frequency: '1-0-1 (Twice daily)',
      duration: '5 Days',
      timing: 'After Food (PC)',
      instructions: 'Complete full course with water'
    },
    {
      id: `thm-p2`,
      name: 'Tab. Pan 40',
      dosage: '40 mg',
      frequency: '1-0-0 (Once daily)',
      duration: '5 Days',
      timing: 'Before Breakfast (AC)',
      instructions: 'Take 30 mins before morning meal'
    },
    {
      id: `thm-p3`,
      name: 'Tab. Dolo 650',
      dosage: '650 mg',
      frequency: '1-1-1 (Thrice daily)',
      duration: '3 Days',
      timing: 'After Food (PC)',
      instructions: 'Take if fever or body pain persists'
    }
  ]);
  const [isDischarging, setIsDischarging] = useState<boolean>(false);

  // Print Document Previews
  const [showPrintDischargeDoc, setShowPrintDischargeDoc] = useState<boolean>(false);
  const [showPrintInvoiceDoc, setShowPrintInvoiceDoc] = useState<boolean>(false);
  const [showPrintMedCertDoc, setShowPrintMedCertDoc] = useState<boolean>(false);
  const [showPrintHospCertDoc, setShowPrintHospCertDoc] = useState<boolean>(false);
  const [showPrintReferralDoc, setShowPrintReferralDoc] = useState<boolean>(false);

  // Detailed Pharmacy & Prescription View Modals
  const [viewingPharmacySale, setViewingPharmacySale] = useState<any | null>(null);
  const [viewingApptPrescription, setViewingApptPrescription] = useState<any | null>(null);

  // Edit Patient Demographics Modal State
  const [showEditDemographicsModal, setShowEditDemographicsModal] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editGender, setEditGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [editDateOfBirth, setEditDateOfBirth] = useState<string>('');
  const [editBloodGroup, setEditBloodGroup] = useState<string>('');
  const [editAddress, setEditAddress] = useState<string>('');
  const [editCity, setEditCity] = useState<string>('');
  const [editPincode, setEditPincode] = useState<string>('');
  const [editGovtId, setEditGovtId] = useState<string>('');
  const [editEmergencyName, setEditEmergencyName] = useState<string>('');
  const [editEmergencyPhone, setEditEmergencyPhone] = useState<string>('');
  const [editAllergies, setEditAllergies] = useState<string>('');
  const [editMedicalHistory, setEditMedicalHistory] = useState<string>('');
  const [editCurrentMeds, setEditCurrentMeds] = useState<string>('');
  const [editInsuranceProvider, setEditInsuranceProvider] = useState<string>('');
  const [editInsurancePolicyNo, setEditInsurancePolicyNo] = useState<string>('');
  const [isSavingDemographics, setIsSavingDemographics] = useState<boolean>(false);

  // Timeline Filter & Sorting State
  const [timelineSortOrder, setTimelineSortOrder] = useState<'LAST_TO_FIRST' | 'FIRST_TO_LAST'>('LAST_TO_FIRST');
  const [timelineCategoryFilter, setTimelineCategoryFilter] = useState<string>('ALL');

  const handleOpenEditDemographics = () => {
    if (!patient) return;
    setEditName(patient.name || '');
    setEditPhone(patient.phone || '');
    setEditEmail(patient.email || '');
    setEditGender((patient.gender as any) || 'MALE');
    setEditDateOfBirth(patient.dateOfBirth || '');
    setEditBloodGroup(patient.bloodGroup || '');
    setEditAddress(patient.address || '');
    setEditCity(patient.city || '');
    setEditPincode(patient.pincode || '');
    setEditGovtId(patient.governmentId || '');
    setEditEmergencyName(patient.emergencyContactName || '');
    setEditEmergencyPhone(patient.emergencyContactPhone || '');
    setEditAllergies(patient.allergies || '');
    setEditMedicalHistory(patient.medicalHistory || '');
    setEditCurrentMeds(patient.currentMedications || '');
    setEditInsuranceProvider(patient.insuranceProvider || '');
    setEditInsurancePolicyNo(patient.insurancePolicyNo || '');
    setShowEditDemographicsModal(true);
  };

  const handleSaveDemographics = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient || !id) return;

    setIsSavingDemographics(true);
    try {
      const payload = {
        name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim() || undefined,
        gender: editGender,
        dateOfBirth: editDateOfBirth || undefined,
        bloodGroup: editBloodGroup || undefined,
        address: editAddress.trim() || undefined,
        city: editCity.trim() || undefined,
        pincode: editPincode.trim() || undefined,
        governmentId: editGovtId.trim() || undefined,
        emergencyContactName: editEmergencyName.trim() || undefined,
        emergencyContactPhone: editEmergencyPhone.trim() || undefined,
        allergies: editAllergies.trim() || undefined,
        medicalHistory: editMedicalHistory.trim() || undefined,
        currentMedications: editCurrentMeds.trim() || undefined,
        insuranceProvider: editInsuranceProvider.trim() || undefined,
        insurancePolicyNo: editInsurancePolicyNo.trim() || undefined
      };

      if (isValidUuid(String(id))) {
        await apiClient.put(`/patients/${id}`, payload);
      }

      // If patient is in an IPD bed, update bed details
      if (activeHospitalBed) {
        const updatedBeds = ipdBeds.map((b) =>
          b.id === activeHospitalBed.id
            ? {
                ...b,
                patientName: editName.trim(),
                patientPhone: editPhone.trim(),
                patientAgeGender: `${calculateAge(editDateOfBirth)} / ${editGender}`
              }
            : b
        );
        setIpdBeds(updatedBeds);
        persistHospitalData(updatedBeds, labOrders);
      }

      queryClient.invalidateQueries({ queryKey: ['patient', id] });
      setShowEditDemographicsModal(false);
    } catch (err: any) {
      console.error('Failed to update patient demographics:', err);
      alert(err?.response?.data?.message || 'Failed to update demographics. Please check required fields.');
    } finally {
      setIsSavingDemographics(false);
    }
  };

    // Real-time synchronization of pharmacy sales history for this patient
  useEffect(() => {
    const loadPharmacySales = () => {
      try {
        const saved = localStorage.getItem('nisschay_pharmacy_sales_history');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setPharmacySales(parsed);
          }
        }
      } catch (e) {
        console.error('Failed to load pharmacy sales history in patient EMR:', e);
      }
    };

    loadPharmacySales();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'nisschay_pharmacy_sales_history' || e.key === 'nisschay_sync_tick') {
        loadPharmacySales();
      }
    };
    window.addEventListener('storage', handleStorage);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('nisschay_hospital_sync');
      bc.onmessage = () => {
        loadPharmacySales();
      };
    } catch {}

    return () => {
      window.removeEventListener('storage', handleStorage);
      if (bc) bc.close();
    };
  }, []);

  // Real-time synchronization of hospital bed, lab, and pharmacy sales data across multiple devices
  useEffect(() => {
    let isMounted = true;

    const fetchHospitalData = async () => {
      try {
        const res = await apiClient.get<{ beds?: string; labs?: string; sales?: string }>('/clinics/hospital-data');
        if (isMounted) {
          if (res.data?.beds) {
            const parsedBeds = JSON.parse(res.data.beds);
            if (Array.isArray(parsedBeds)) {
              setIpdBeds((prev) => {
                const prevStr = JSON.stringify(prev);
                if (prevStr !== res.data!.beds) {
                  localStorage.setItem('nisschay_hospital_beds', res.data!.beds!);
                  return parsedBeds;
                }
                return prev;
              });
            }
          }
          if (res.data?.labs) {
            const parsedLabs = JSON.parse(res.data.labs);
            if (Array.isArray(parsedLabs)) {
              setLabOrders((prev) => {
                const prevStr = JSON.stringify(prev);
                if (prevStr !== res.data!.labs) {
                  localStorage.setItem('nisschay_hospital_labs', res.data!.labs!);
                  return parsedLabs;
                }
                return prev;
              });
            }
          }
          if (res.data?.sales) {
            const parsedSales = JSON.parse(res.data.sales);
            if (Array.isArray(parsedSales)) {
              setPharmacySales((prev) => {
                const prevStr = JSON.stringify(prev);
                if (prevStr !== res.data!.sales) {
                  localStorage.setItem('nisschay_pharmacy_sales_history', res.data!.sales!);
                  return parsedSales;
                }
                return prev;
              });
            }
          }
        }
      } catch {
        const savedBeds = localStorage.getItem('nisschay_hospital_beds');
        if (savedBeds && isMounted) setIpdBeds(JSON.parse(savedBeds));
        const savedLabs = localStorage.getItem('nisschay_hospital_labs');
        if (savedLabs && isMounted) setLabOrders(JSON.parse(savedLabs));
        const savedSales = localStorage.getItem('nisschay_pharmacy_sales_history');
        if (savedSales && isMounted) setPharmacySales(JSON.parse(savedSales));
      }
    };

    fetchHospitalData();

    // Active Multi-Device Background Polling (Every 1.5 seconds from backend DB)
    const interval = setInterval(() => {
      fetchHospitalData();
    }, 1500);

    const handleBedsUpdate = (e: any) => {
      fetchHospitalData();
    };
    window.addEventListener('hospital-beds-updated', handleBedsUpdate);
    window.addEventListener('focus', fetchHospitalData);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('hospital-beds-updated', handleBedsUpdate);
      window.removeEventListener('focus', fetchHospitalData);
    };
  }, []);

  // Save hospital state to server
  const persistHospitalData = async (newBeds?: HospitalBed[], newLabs?: LabInvestigationOrder[]) => {
    const bedsToSave = newBeds || ipdBeds;
    const labsToSave = newLabs || labOrders;
    try {
      localStorage.setItem('nisschay_hospital_beds', JSON.stringify(bedsToSave));
      localStorage.setItem('nisschay_hospital_labs', JSON.stringify(labsToSave));
      window.dispatchEvent(new CustomEvent('hospital-beds-updated', { detail: bedsToSave }));
      await apiClient.post('/clinics/hospital-data', {
        beds: JSON.stringify(bedsToSave),
        labs: JSON.stringify(labsToSave)
      });
    } catch (e) {
      console.error('Error persisting hospital data:', e);
      window.dispatchEvent(new CustomEvent('hospital-beds-updated', { detail: bedsToSave }));
    }
  };

  // Fetch patient details by UUID or fallback synthesis
  const { data: patient, isLoading, isError } = useQuery<Patient>({
    queryKey: ['patient', id],
    queryFn: async () => {
      if (isValidUuid(id)) {
        try {
          const response = await apiClient.get(`/patients/${id}`);
          if (response.data) return response.data;
        } catch (err: any) {
          if (err?.response?.status !== 404 && err?.response?.status !== 500) throw err;
        }
      }

      try {
        let bedsList: HospitalBed[] = [];
        try {
          const res = await apiClient.get<{ beds?: string }>('/clinics/hospital-data');
          if (res.data?.beds) bedsList = JSON.parse(res.data.beds);
        } catch {}
        if (!bedsList.length) {
          const saved = localStorage.getItem('nisschay_hospital_beds');
          if (saved) bedsList = JSON.parse(saved);
        }

        const foundBed = bedsList.find(b => 
          (b.patientId && (b.patientId === id || b.patientId.toLowerCase() === id.toLowerCase())) ||
          `ipd-patient-${b.id}` === id ||
          b.id === id.replace('ipd-patient-', '') ||
          id === 'ipd'
        );

        if (foundBed && foundBed.patientName) {
          if (isValidUuid(foundBed.patientId)) {
            try {
              const res = await apiClient.get(`/patients/${foundBed.patientId}`);
              if (res.data) return res.data;
            } catch {}
          }

          try {
            const createRes = await apiClient.post<Patient>('/patients', {
              name: foundBed.patientName,
              phone: foundBed.patientPhone && foundBed.patientPhone.length >= 7 ? foundBed.patientPhone : `98${Math.floor(10000000 + Math.random() * 90000000)}`,
              gender: foundBed.patientGender || (foundBed.patientAgeGender?.toLowerCase().includes('female') ? 'FEMALE' : 'MALE'),
              medicalHistory: `Admitted for: ${foundBed.admittingDiagnosis || 'Inpatient Care'}`
            });

            if (createRes.data && createRes.data.id) {
              foundBed.patientId = createRes.data.id;
              await apiClient.post('/clinics/hospital-data', { beds: JSON.stringify(bedsList) });
              router.replace(`/patients/${createRes.data.id}`);
              return createRes.data;
            }
          } catch (err) {
            console.error('Failed to auto-register IPD patient in DB:', err);
          }

          return {
            id: foundBed.patientId || id,
            clinicId: '',
            name: foundBed.patientName,
            phone: foundBed.patientPhone || 'Direct Admission',
            gender: foundBed.patientGender || (foundBed.patientAgeGender?.toLowerCase().includes('female') ? 'FEMALE' : 'MALE'),
            active: true,
            createdAt: foundBed.admissionDate || new Date().toISOString()
          } as Patient;
        }
      } catch (err) {
        console.error('Error resolving IPD patient:', err);
      }

      throw new Error('Patient not found');
    },
  });

  // Fetch patient completed appointments history
  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ['patient-appointments', id],
    queryFn: async () => {
      if (!isValidUuid(id)) return [];
      try {
        const response = await apiClient.get(`/appointments/patient/${id}`);
        return response.data || [];
      } catch {
        return [];
      }
    },
    enabled: isValidUuid(id)
  });

  // Load Patient Direct Payments (Safely after patient is initialized)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pid = patient?.id || id;
      if (pid) {
        const saved = localStorage.getItem(`nisschay_patient_payments_${pid}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) setPatientDirectPayments(parsed);
          } catch {}
        }
      }
    }
  }, [patient?.id, id]);

  // Fetch Centralized Single Source of Truth Backend Ledger
  const { data: backendLedger, refetch: refetchLedger } = useQuery<PatientLedgerSummaryResponse | null>({
    queryKey: ['patient-ledger', id],
    queryFn: async () => {
      if (!isValidUuid(id)) return null;
      try {
        const res = await apiClient.get<PatientLedgerSummaryResponse>(`/billing/ledger/patient/${id}`);
        return res.data;
      } catch {
        return null;
      }
    },
    enabled: isValidUuid(id)
  });

  // Fetch doctors list
  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ['doctors-list'],
    queryFn: async () => {
      const response = await apiClient.get('/doctors');
      return response.data || [];
    },
  });

  // Fetch current clinic details
  const { data: clinic } = useQuery<Clinic>({
    queryKey: ['clinic-me'],
    queryFn: async () => {
      const response = await apiClient.get('/clinics/me');
      return response.data;
    },
  });

  // Calculate age helper
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

  // Check active hospital bed match
  const activeHospitalBed = useMemo(() => {
    if (!patient && !id) return null;
    return ipdBeds.find((b) => {
      if (b.status !== 'OCCUPIED' && b.status !== 'DISCHARGE_PLANNED') return false;
      if (b.patientId && (b.patientId === id || b.patientId === patient?.id)) return true;
      if (
        b.patientPhone &&
        patient?.phone &&
        b.patientPhone.replace(/\D/g, '') === patient.phone.replace(/\D/g, '') &&
        patient.phone.replace(/\D/g, '').length >= 7
      )
        return true;
      if (
        b.patientName &&
        patient?.name &&
        b.patientName.trim().toLowerCase() === patient.name.trim().toLowerCase()
      )
        return true;
      return false;
    });
  }, [ipdBeds, patient, id]);

  // Filter patient's lab orders
  const patientLabOrders = useMemo(() => {
    return labOrders.filter((l) => {
      if (patient?.id && l.patientId === patient.id) return true;
      if (l.patientId === id) return true;
      if (patient?.name && l.patientName && l.patientName.trim().toLowerCase() === patient.name.trim().toLowerCase()) return true;
      return false;
    });
  }, [labOrders, patient, id]);

    // Filter patient's pharmacy dispensed sales & purchases (Matching by Patient ID, Phone, Name, or Bed)
  const patientPharmacySales = useMemo(() => {
    if (!patient && !id) return [];
    const cleanPhone = (patient?.phone || '').replace(/\D/g, '');
    const currentPatientId = patient?.id || id;
    const currentPatientName = (patient?.name || '').trim().toLowerCase();

    return pharmacySales.filter((s) => {
      // 1. Strict Patient ID matching
      if (s.patientId && (s.patientId === currentPatientId || s.patientId === id || (patient?.id && s.patientId === patient.id))) {
        return true;
      }

      // 2. Phone number match (matching clean digits)
      if (s.patientPhone && cleanPhone.length >= 6) {
        const salePhone = s.patientPhone.replace(/\D/g, '');
        if (salePhone.length >= 6 && (salePhone === cleanPhone || salePhone.endsWith(cleanPhone) || cleanPhone.endsWith(salePhone))) {
          return true;
        }
      }

      // 3. Name match (Never match generic labels like 'Walk-in', 'Bed', 'Patient', 'General')
      if (currentPatientName && s.patientName) {
        const sName = s.patientName.trim().toLowerCase();
        const genericNames = ['walk-in customer', 'walk-in', 'walk in', 'general', 'patient', 'ipd bed', 'ward indent', 'cash patient', 'emergency'];
        if (!genericNames.includes(sName) && (sName === currentPatientName || (sName.length >= 3 && currentPatientName.length >= 3 && (sName.includes(currentPatientName) || currentPatientName.includes(sName))))) {
          return true;
        }
      }

      // 4. Bed Number match
      if (activeHospitalBed?.bedNumber && s.bedNumber && s.bedNumber.includes(activeHospitalBed.bedNumber)) {
        return true;
      }

      return false;
    });
  }, [pharmacySales, patient, id, activeHospitalBed]);

  const completedAppts = useMemo(() => {
    return appointments.filter(a => a.status === 'COMPLETED' || a.prescription);
  }, [appointments]);

  // Calculate live financial ledger reconciling OPD, IPD, Labs, and Discharge Settlements (Using Backend Ledger when available)
  const billingSummary = useMemo(() => {
    // 1. If backend ledger has populated entries, use backend as authoritative Single Source of Truth
    if (backendLedger && backendLedger.charges && backendLedger.charges.length > 0) {
      const items = backendLedger.charges.map((c) => ({
        id: c.id,
        date: c.createdAt ? c.createdAt.split('T')[0] : 'Recent',
        category: c.category ? c.category.replace('_', ' ') : 'Hospital Service',
        description: c.description,
        unitPrice: c.unitPrice || c.totalAmount,
        qty: c.quantity || 1,
        total: c.totalAmount,
        source: c.encounterType || 'Hospital'
      }));

      const advanceList: InpatientAdvancePayment[] = (backendLedger.receipts || []).map((r) => ({
        id: r.id,
        amount: r.totalAmount,
        paymentMode: r.paymentMode || 'UPI',
        receiptNumber: r.receiptNumber || `REC-${r.id.slice(0, 6)}`,
        datePaid: r.createdAt ? r.createdAt.split('T')[0] : 'Recent',
        notes: r.notes || r.description
      }));

      return {
        items,
        totalIncurred: backendLedger.totalIncurred,
        advanceList,
        totalAdvancesPaid: backendLedger.totalPaid,
        netOutstanding: backendLedger.netOutstanding,
        status: backendLedger.status
      };
    }

    let items: Array<{ id: string; date: string; category: string; description: string; unitPrice: number; qty: number; total: number; source: string; isPaid?: boolean }> = [];
    let receipts: InpatientAdvancePayment[] = [];

    // 1. OPD Consultations fees (Standard OPD visits are billed & settled at appointment)
    completedAppts.forEach((a) => {
      items.push({
        id: `opd-${a.id}`,
        date: a.appointmentDate,
        category: 'OPD Consultation',
        description: `Consultation with Dr. ${a.doctorName || 'Specialist'} (${a.type || 'General'})`,
        unitPrice: 500,
        qty: 1,
        total: 500,
        source: 'OPD',
        isPaid: true
      });

      // Credit OPD registration payment receipt
      receipts.push({
        id: `rec-opd-${a.id}`,
        amount: 500,
        paymentMode: 'CASH',
        receiptNumber: `REC-OPD-${a.id.slice(0, 6).toUpperCase()}`,
        datePaid: a.appointmentDate,
        notes: `OPD Consultation Fee - Dr. ${a.doctorName || 'Doctor'}`
      });
    });

    // 2. IPD Bed Stays (Both active and past/discharged stays for this patient)
    const patientStays = ipdBeds.filter((b) => {
      if (b.patientId && (b.patientId === id || b.patientId === patient?.id)) return true;
      if (b.patientPhone && patient?.phone && b.patientPhone.replace(/\D/g, '') === patient.phone.replace(/\D/g, '') && patient.phone.replace(/\D/g, '').length >= 7) return true;
      if (b.patientName && patient?.name && b.patientName.trim().toLowerCase() === patient.name.trim().toLowerCase()) return true;
      return false;
    });

    patientStays.forEach((stay) => {
      const stayDays = (() => {
        if (!stay.admissionDate) return 1;
        const adm = new Date(stay.admissionDate);
        const disDate = stay.dischargePlan?.plannedDate ? new Date(stay.dischargePlan.plannedDate) : new Date();
        const diffTime = Math.abs(disDate.getTime() - adm.getTime());
        return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      })();

      const rate = stay.dailyRate || 1000;
      items.push({
        id: `bed-rent-${stay.id}`,
        date: stay.admissionDate || 'Today',
        category: 'Room & Bed Rent',
        description: `Ward: ${stay.wardName} (${stay.bedNumber}) • ${stayDays} Day(s) @ ₹${rate}/day${stay.status === 'CLEANING' || stay.dischargePlan?.clearedByBilling ? ' [Discharged / Settled]' : ''}`,
        unitPrice: rate,
        qty: stayDays,
        total: rate * stayDays,
        source: 'IPD'
      });

      // IPD Itemized Services & Doctor Visits
      (stay.billingCharges || []).forEach((srv) => {
        items.push({
          id: srv.id,
          date: srv.dateAdded,
          category: srv.category.replace('_', ' '),
          description: srv.serviceName + (srv.notes ? ` (${srv.notes})` : ''),
          unitPrice: srv.unitPrice,
          qty: srv.quantity,
          total: srv.totalAmount,
          source: 'IPD Services'
        });
      });

      // All Advance Deposits & Discharge Settlements for this stay
      (stay.advancePayments || []).forEach((adv) => {
        receipts.push(adv);
      });
    });

    // 3. Lab Investigation Orders
    patientLabOrders.forEach((lab) => {
      items.push({
        id: lab.id,
        date: lab.orderDate,
        category: 'Diagnostic Lab',
        description: `${lab.testName} [${lab.status}]`,
        unitPrice: lab.price,
        qty: 1,
        total: lab.price,
        source: 'Lab'
      });
      // If lab is completed or collected, add receipt
      if (lab.status === 'COMPLETED' || lab.status === 'SAMPLE_COLLECTED') {
        receipts.push({
          id: `rec-lab-${lab.id}`,
          amount: lab.price,
          paymentMode: 'UPI',
          receiptNumber: `REC-LAB-${lab.id.slice(-6).toUpperCase()}`,
          datePaid: lab.orderDate,
          notes: `Lab Investigation: ${lab.testName}`
        });
      }
    });

    // 4. Pharmacy Retail Sales & Prescription Purchases (Paid at Counter POS)
    patientPharmacySales.forEach((sale) => {
      // Ignore ward indents already billed under IPD charges to avoid double charging
      if (sale.invoiceNo && sale.invoiceNo.startsWith('IND-DISP-')) return;
      items.push({
        id: `pharm-${sale.id}`,
        date: sale.dateTime,
        category: 'Pharmacy Meds',
        description: `Pharmacy Invoice #${sale.invoiceNo} (${sale.items?.length || 1} item(s)) [${sale.paymentMode || 'Paid'}]`,
        unitPrice: sale.grandTotal,
        qty: 1,
        total: sale.grandTotal,
        source: 'Pharmacy',
        isPaid: true
      });

      // Pharmacy sales are paid immediately at POS checkout
      receipts.push({
        id: `rec-pharm-${sale.id}`,
        amount: sale.grandTotal,
        paymentMode: sale.paymentMode || 'CASH',
        receiptNumber: `REC-${sale.invoiceNo}`,
        datePaid: sale.dateTime,
        notes: `Pharmacy POS Dispense Invoice #${sale.invoiceNo}`
      });
    });

    // 5. Standalone Patient Direct Payments
    patientDirectPayments.forEach((dp) => {
      if (!receipts.some(r => r.id === dp.id || r.receiptNumber === dp.receiptNumber)) {
        receipts.push(dp);
      }
    });

    // Deduplicate receipts by ID/ReceiptNumber
    const uniqueReceipts: InpatientAdvancePayment[] = [];
    const seenReceiptKeys = new Set<string>();
    receipts.forEach((r) => {
      const key = r.id || r.receiptNumber || `${r.amount}-${r.datePaid}`;
      if (!seenReceiptKeys.has(key)) {
        seenReceiptKeys.add(key);
        uniqueReceipts.push(r);
      }
    });

    const totalIncurred = items.reduce((acc, curr) => acc + curr.total, 0);
    const totalAdvancesPaid = uniqueReceipts.reduce((acc, curr) => acc + curr.amount, 0);

    // Check if patient has any active inpatient stay with unpaid balance
    const activeBedStay = patientStays.find(b => b.status === 'OCCUPIED' || b.status === 'DISCHARGE_PLANNED');
    let netOutstanding = Math.max(0, totalIncurred - totalAdvancesPaid);

    // If patient is discharged and has no active occupied bed, and final clearance was processed:
    if (!activeBedStay && patientStays.some(b => b.dischargePlan?.clearedByBilling || b.status === 'AVAILABLE')) {
      netOutstanding = 0;
    }

    return {
      items,
      totalIncurred,
      advanceList: uniqueReceipts,
      totalAdvancesPaid,
      netOutstanding
    };
  }, [completedAppts, ipdBeds, patientLabOrders, patientPharmacySales, patientDirectPayments, patient, id]);

  // Sorted Itemized Billing Ledger Items (Last to First vs First to Last)
  const sortedBillingItems = useMemo(() => {
    const list = [...billingSummary.items];
    if (emrLedgerSortOrder === 'LAST_TO_FIRST') {
      list.reverse();
    }
    return list;
  }, [billingSummary.items, emrLedgerSortOrder]);

  // Helper: Safely calculate Unix epoch timestamp for any date/time string
  const getEpochTimestamp = (ts?: string | null): number => {
    if (!ts) return 0;
    try {
      const raw = String(ts).trim();
      const d = new Date(raw);
      if (!isNaN(d.getTime())) return d.getTime();

      const parsed = Date.parse(raw);
      if (!isNaN(parsed)) return parsed;

      // Parse "YYYY-MM-DD HH:mm:ss" or "YYYY-MM-DD HH:mm"
      const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
      if (match) {
        const yr = parseInt(match[1]);
        const mo = parseInt(match[2]) - 1;
        const dy = parseInt(match[3]);
        const hr = match[4] ? parseInt(match[4]) : 0;
        const mn = match[5] ? parseInt(match[5]) : 0;
        const sc = match[6] ? parseInt(match[6]) : 0;
        return new Date(yr, mo, dy, hr, mn, sc).getTime();
      }
    } catch {
      // fallback
    }
    return 0;
  };

  // Unified Chronological Journey Timeline Builder
  const timelineEvents = useMemo(() => {
    const events: PatientTimelineEvent[] = [];

    // 1. Master EMR Registration (Anchored to earliest clinical event or creation date)
    let registrationTimestamp = patient?.createdAt || new Date().toISOString();
    const regEpoch = getEpochTimestamp(registrationTimestamp);

    // If patient has an earlier admission, registration must precede or match that admission
    if (activeHospitalBed?.admissionDate) {
      const admTimeStr = `${activeHospitalBed.admissionDate} ${activeHospitalBed.admissionTime || '09:00:00'}`;
      const admEpoch = getEpochTimestamp(admTimeStr);
      if (admEpoch > 0 && (regEpoch === 0 || admEpoch < regEpoch)) {
        registrationTimestamp = admTimeStr;
      }
    }

    // If patient has an earlier appointment, registration must precede or match that consultation
    if (completedAppts.length > 0 && completedAppts[0]?.appointmentDate) {
      const apptTimeStr = `${completedAppts[0].appointmentDate} ${completedAppts[0].startTime || '09:00:00'}`;
      const apptEpoch = getEpochTimestamp(apptTimeStr);
      const currentRegEpoch = getEpochTimestamp(registrationTimestamp);
      if (apptEpoch > 0 && (currentRegEpoch === 0 || apptEpoch < currentRegEpoch)) {
        registrationTimestamp = apptTimeStr;
      }
    }

    events.push({
      id: 'evt-reg',
      timestamp: registrationTimestamp,
      category: 'REGISTRATION',
      title: 'Master Patient EMR Registered',
      description: `Permanent hospital file opened with UHID: UHID-${patient?.id?.substring(0, 8).toUpperCase() || '2026'}. Initial phone: ${patient?.phone || 'Local'}`,
      actor: 'Hospital Registry',
      badgeColor: 'bg-sky-100 text-sky-800'
    });

    // 2. OPD Consultations & Encounters
    completedAppts.forEach((a) => {
      events.push({
        id: `evt-appt-${a.id}`,
        timestamp: `${a.appointmentDate} ${a.startTime || '09:00:00'}`,
        category: 'OPD_CONSULT',
        title: `OPD Consultation with Dr. ${a.doctorName || 'Specialist'}`,
        description: `Symptoms: ${a.notes || 'General checkup'}. Consultation completed. Diagnosis recorded.`,
        actor: `Dr. ${a.doctorName || 'Specialist'}`,
        badgeColor: 'bg-teal-100 text-teal-800',
        amount: 500
      });
    });

    // 3. Inpatient Admission, Daily Rounds, Services, Indents, and Deposits
    if (activeHospitalBed) {
      // Inpatient Admission Event
      events.push({
        id: `evt-adm-${activeHospitalBed.id}`,
        timestamp: `${activeHospitalBed.admissionDate || 'Today'} ${activeHospitalBed.admissionTime || '10:00:00'}`,
        category: 'ADMISSION',
        title: `Admitted to Inpatient Ward: Bed ${activeHospitalBed.bedNumber}`,
        description: `Allocated ${activeHospitalBed.wardName} under Dr. ${activeHospitalBed.consultantDoctorName}. Admitting Diagnosis: ${activeHospitalBed.admittingDiagnosis}.`,
        actor: 'Admissions Desk',
        badgeColor: 'bg-rose-100 text-rose-800'
      });

      // Doctor Progress Rounds
      (activeHospitalBed.dailyLogs || []).forEach((log) => {
        events.push({
          id: `evt-log-${log.id}`,
          timestamp: log.timestamp,
          category: 'DOCTOR_ROUND',
          title: `Daily Doctor Round & Vitals (${log.temp || '98.6°F'}, BP: ${log.bp || '120/80'})`,
          description: `${log.clinicalNotes}. Treatment: ${log.treatmentGiven || 'Routine ward observation protocol'}.`,
          actor: log.recordedBy,
          badgeColor: 'bg-purple-100 text-purple-800'
        });
      });

      // Inpatient Clinical Services, OT Surgeries, Nursing Care, and Extra Charges
      (activeHospitalBed.billingCharges || []).forEach((charge) => {
        if (!charge.serviceName || charge.serviceName.trim() === '' || charge.serviceName === 'undefined') return;

        let badgeColor = 'bg-slate-100 text-slate-800';
        if (charge.category === 'OT_SURGERY') badgeColor = 'bg-indigo-100 text-indigo-900';
        else if (charge.category === 'INVESTIGATION') badgeColor = 'bg-amber-100 text-amber-900';
        else if (charge.category === 'DOCTOR_VISIT') badgeColor = 'bg-purple-100 text-purple-900';
        else if (charge.category === 'NURSING') badgeColor = 'bg-cyan-100 text-cyan-900';
        else if (charge.category === 'MEDICATION') badgeColor = 'bg-emerald-100 text-emerald-900';

        events.push({
          id: `evt-srv-${charge.id}`,
          timestamp: charge.dateAdded || activeHospitalBed.admissionDate || 'Today',
          category: 'PAYMENT',
          title: `Hospital Service: ${charge.serviceName}`,
          description: `Category: ${charge.category.replace('_', ' ')} • Qty: ${charge.quantity} • Unit Price: ₹${charge.unitPrice}. ${charge.notes ? `Notes: ${charge.notes}` : ''}`,
          actor: charge.category === 'OT_SURGERY' ? 'Surgical OT Team' : charge.category === 'DOCTOR_VISIT' ? 'Attending Consultant' : 'Inpatient Care Team',
          badgeColor,
          amount: charge.totalAmount
        });
      });

      // Inpatient Ward Medication Indents & Dispatches (Strict Validation: Ignore empty or non-prescribed placeholders)
      (activeHospitalBed.inpatientMedications || []).forEach((med) => {
        const hasValidName = med.medicineName && med.medicineName.trim().length > 0 && med.medicineName !== 'undefined' && med.medicineName !== 'Scheduled';
        const validItems = Array.isArray(med.items) ? med.items.filter(i => i && i.name && i.name.trim().length > 0) : [];
        
        // If doctor prescribed no medicine, do NOT add automatic empty record
        if (!hasValidName && validItems.length === 0) return;

        const isOutside = med.source === 'OUTSIDE_PATIENT_OWN';
        const displayTitle = hasValidName ? med.medicineName : validItems.map(i => i.name).join(', ');
        const displayDosage = med.dosage && med.dosage !== 'undefined' ? med.dosage : validItems.length === 1 ? validItems[0].dosage : `${validItems.length} items`;
        const displayFreq = med.frequency && med.frequency !== 'undefined' ? med.frequency : 'Scheduled';

        events.push({
          id: `evt-med-${med.id}`,
          timestamp: med.dispatchedAt || med.dateOrdered,
          category: 'MEDICATION',
          title: `Ward Medication Requisition: ${displayTitle}`,
          description: `Dosage: ${displayDosage} (${displayFreq}) • Source: ${isOutside ? 'Patient-Arranged (Outside)' : 'Hospital Pharmacy Stock'}. Status: ${med.status === 'DISPENSED' ? 'Dispatched to Bed' : med.status === 'ADMINISTERED' ? 'Administered by Nurse' : 'Queued at Pharmacy'}. ${med.notes || ''}`,
          actor: med.prescribedBy || 'Duty Staff Nurse',
          badgeColor: isOutside ? 'bg-orange-100 text-orange-900' : 'bg-emerald-100 text-emerald-900',
          amount: med.price || 0
        });
      });

      // Inpatient Advance & Deposit Payments
      (activeHospitalBed.advancePayments || []).forEach((pay) => {
        events.push({
          id: `evt-pay-${pay.id}`,
          timestamp: pay.datePaid,
          category: 'PAYMENT',
          title: `Payment Receipt: ₹${pay.amount.toLocaleString('en-IN')} via ${pay.paymentMode}`,
          description: `Receipt No: ${pay.receiptNumber}. Notes: ${pay.notes || 'Admission deposit'}`,
          actor: 'Cashier / Billing Desk',
          badgeColor: 'bg-emerald-100 text-emerald-800',
          amount: pay.amount
        });
      });
    }

    // 4. Lab & Diagnostic Orders
    patientLabOrders.forEach((lab) => {
      if (!lab.testName || lab.testName.trim() === '') return;
      events.push({
        id: `evt-lab-${lab.id}`,
        timestamp: lab.orderDate,
        category: 'LAB_ORDER',
        title: `Lab Test Requisition: ${lab.testName}`,
        description: `Status: ${lab.status}. Category: ${lab.category}. Ordered by ${lab.doctorName}. ${lab.notes ? `Clinical Indication: ${lab.notes}` : ''}`,
        actor: lab.doctorName,
        badgeColor: 'bg-amber-100 text-amber-800',
        amount: lab.price
      });
    });

    // 5. Pharmacy Retail/POS Invoices & Dispenses
    // (Ignore Ward Indents because ward indents are already tracked under Inpatient Medication Requisitions)
    patientPharmacySales.forEach((sale) => {
      if (!sale.items || sale.items.length === 0) return;
      if (sale.invoiceNo && sale.invoiceNo.startsWith('IND-DISP-')) return;

      events.push({
        id: `evt-pharm-${sale.id}`,
        timestamp: sale.dateTime,
        category: 'MEDICATION',
        title: `Pharmacy Retail Dispense #${sale.invoiceNo}`,
        description: `Dispensed ${sale.items.length} item(s): ${sale.items.map((i) => `${i.name} x${i.quantity}`).join(', ')}. Total: ₹${sale.grandTotal} paid via ${sale.paymentMode}.`,
        actor: sale.dispensedBy || 'Duty Pharmacist',
        badgeColor: 'bg-emerald-100 text-emerald-800',
        amount: sale.grandTotal
      });
    });

    // Filter by selected category
    let filtered = events;
    if (timelineCategoryFilter !== 'ALL') {
      filtered = filtered.filter((e) => e.category === timelineCategoryFilter);
    }

    // Category Chronological Priority for exact same-minute tie-breaking
    const CATEGORY_ORDER: Record<string, number> = {
      REGISTRATION: 0,
      OPD_CONSULT: 1,
      ADMISSION: 2,
      DOCTOR_ROUND: 3,
      INPATIENT_SERVICE: 4,
      LAB_ORDER: 5,
      MEDICATION: 6,
      PAYMENT: 7
    };

    // Strict Epoch Timestamp Chronological Sort with Category Priority
    filtered.sort((a, b) => {
      const timeA = getEpochTimestamp(a.timestamp);
      const timeB = getEpochTimestamp(b.timestamp);
      if (timeA !== timeB) {
        return timelineSortOrder === 'LAST_TO_FIRST' ? timeB - timeA : timeA - timeB;
      }

      // Tie-breaker: Registration strictly comes first in lifecycle
      const prioA = CATEGORY_ORDER[a.category] ?? 99;
      const prioB = CATEGORY_ORDER[b.category] ?? 99;
      return timelineSortOrder === 'LAST_TO_FIRST' ? prioB - prioA : prioA - prioB;
    });

    return filtered;
  }, [
    patient,
    completedAppts,
    activeHospitalBed,
    patientLabOrders,
    patientPharmacySales,
    timelineSortOrder,
    timelineCategoryFilter
  ]);

  // Handler: Add IPD Medicines from EMR Tab (Consolidated Multi-Row Indent)
  const handleAddIpdMedicationFromEmr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeHospitalBed) return;

    const validRows = ipdMedRows.filter(r => r.name.trim().length > 0);
    if (validRows.length === 0) return;

    const today = new Date().toISOString().split('T')[0];
    const prescriber = ipdMedDoctor || activeHospitalBed.consultantDoctorName || (doctors[0]?.name ? `Dr. ${doctors[0].name}` : 'Attending Physician');
    const nurse = ipdMedNurse.trim() || 'Duty Staff Nurse';
    const indentNo = `IND-${Date.now().toString().slice(-6)}`;

    const items = validRows.map((r, idx) => ({
      id: `item-${Date.now()}-${idx}`,
      name: r.name.trim(),
      dosage: r.dosage.trim() || '1 Dose',
      frequency: r.frequency,
      quantity: 1,
      source: r.source,
      price: 0, // Billed upon pharmacy dispatch
      notes: r.notes || ''
    }));

    const summaryName = validRows.length === 1
      ? validRows[0].name.trim()
      : `${validRows[0].name.trim()} + ${validRows.length - 1} more (${validRows.length} Meds)`;

    // Create 1 consolidated InpatientMedicationOrder prepended to index 0
    const singleIndentOrder: InpatientMedicationOrder = {
      id: `indent-${Date.now()}`,
      indentNumber: indentNo,
      medicineName: summaryName,
      dosage: validRows.length === 1 ? validRows[0].dosage.trim() : `${validRows.length} Meds Indented`,
      frequency: validRows.length === 1 ? validRows[0].frequency : 'Scheduled',
      source: validRows.some(r => r.source === 'HOSPITAL_PHARMACY') ? 'HOSPITAL_PHARMACY' : 'OUTSIDE_PATIENT_OWN',
      price: 0,
      dateOrdered: getCurrentDateTimeStr(),
      status: 'QUEUED_PHARMACY',
      prescribedBy: prescriber,
      requestedByNurse: nurse,
      notes: `Indent ${indentNo} (${validRows.length} Meds) from EMR chart`,
      items: items
    };

    const updatedBeds = ipdBeds.map((b) =>
      b.id === activeHospitalBed.id
        ? {
            ...b,
            inpatientMedications: [singleIndentOrder, ...(b.inpatientMedications || [])]
          }
        : b
    );

    setIpdBeds(updatedBeds);
    persistHospitalData(updatedBeds, labOrders);

    // Reset rows to 1 empty item
    setIpdMedRows([
      {
        id: `ipd-row-${Date.now()}`,
        name: '',
        dosage: '1 Tab / 1 Amp',
        frequency: 'Twice Daily (BD - 1-0-1)',
        source: 'HOSPITAL_PHARMACY',
        notes: ''
      }
    ]);
    setShowAddIpdMedModal(false);
  };

  // Handler: Nurse Logs Administration of Inpatient Medicine
  const handleLogMedAdministration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeHospitalBed || !administerMedId) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const today = new Date().toISOString().split('T')[0];

    const updatedMeds = (activeHospitalBed.inpatientMedications || []).map((m) =>
      m.id === administerMedId
        ? {
            ...m,
            status: 'ADMINISTERED' as const,
            notes: `Administered by ${administerNurseName} at ${today} ${time}. Notes: ${administerNotes}`
          }
        : m
    );

    const updatedBeds = ipdBeds.map((b) =>
      b.id === activeHospitalBed.id
        ? {
            ...b,
            inpatientMedications: updatedMeds
          }
        : b
    );

    setIpdBeds(updatedBeds);
    persistHospitalData(updatedBeds, labOrders);

    setShowAdministerModal(false);
  };

  // Handler: Order Lab Investigation (Auto-Dispatches to Lab & Posts Charge to Bill)
  const handleOrderLabTest = (e: React.FormEvent) => {
    e.preventDefault();
    const catalogItem = HOSPITAL_LAB_CATALOG.find((t) => t.id === selectedCatalogLabId) || HOSPITAL_LAB_CATALOG[0];
    if (!catalogItem || !patient) return;

    const today = new Date().toISOString().split('T')[0];
    const newLabOrder: LabInvestigationOrder = {
      id: `lab-${Date.now()}`,
      patientId: patient.id || id || 'patient-id',
      patientName: patient.name || 'Patient',
      testName: catalogItem.name,
      category: catalogItem.category,
      doctorName: labOrderDoctor || (doctors[0]?.name ? `Dr. ${doctors[0].name}` : 'Attending Physician'),
      orderDate: getCurrentDateTimeStr(),
      status: 'ORDERED',
      price: catalogItem.price,
      urgency: labOrderUrgency,
      notes: labOrderNotes || 'Routine clinical evaluation'
    };

    const updatedLabs = [newLabOrder, ...labOrders];
    setLabOrders(updatedLabs);

    // If patient is admitted, auto-post to running bed bill
    if (activeHospitalBed) {
      const labCharge: InpatientServiceCharge = {
        id: `srv-lab-${Date.now()}`,
        category: 'INVESTIGATION',
        serviceName: `Lab: ${catalogItem.name}`,
        unitPrice: catalogItem.price,
        quantity: 1,
        totalAmount: catalogItem.price,
        dateAdded: getCurrentDateTimeStr(),
        notes: `Ordered by ${newLabOrder.doctorName}`
      };

      const updatedBeds = ipdBeds.map((b) =>
        b.id === activeHospitalBed.id
          ? {
              ...b,
              billingCharges: [...(b.billingCharges || []), labCharge]
            }
          : b
      );
      setIpdBeds(updatedBeds);
      persistHospitalData(updatedBeds, updatedLabs);
    } else {
      persistHospitalData(ipdBeds, updatedLabs);
    }

    setShowOrderLabModal(false);
    setLabOrderNotes('');
  };

  // Handler: Add Daily Doctor Progress Round inside EMR
  const handleAddDoctorRound = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeHospitalBed) return;

    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newLog: DailyCheckingLog = {
      id: `log-${Date.now()}`,
      timestamp: `${today} ${time}`,
      recordedBy: roundDoctorName || activeHospitalBed.consultantDoctorName || (doctors[0]?.name ? `Dr. ${doctors[0].name}` : 'Consultant'),
      temp: roundTemp ? `${roundTemp} °F` : '98.6 °F',
      bp: roundBp ? `${roundBp} mmHg` : '120/80 mmHg',
      pulse: roundPulse ? `${roundPulse} bpm` : '78 bpm',
      spo2: roundSpo2 ? `${roundSpo2}%` : '99%',
      respRate: roundRespRate ? `${roundRespRate} /min` : '18 /min',
      clinicalNotes: roundNotes || 'Patient progress reviewed. Vitals satisfactory.',
      treatmentGiven: roundTreatment || 'Continue existing ward medication regimen.'
    };

    // Auto-post Doctor Visit Fee (₹600) to Inpatient Bill
    const doctorVisitCharge: InpatientServiceCharge = {
      id: `srv-doc-${Date.now()}`,
      category: 'DOCTOR_VISIT',
      serviceName: `Consultant Round: ${newLog.recordedBy}`,
      unitPrice: 600,
      quantity: 1,
      totalAmount: 600,
      dateAdded: getCurrentDateTimeStr(),
      notes: 'Daily Inpatient Progress Round'
    };

    const updatedBeds = ipdBeds.map((b) =>
      b.id === activeHospitalBed.id
        ? {
            ...b,
            dailyLogs: [newLog, ...(b.dailyLogs || [])],
            billingCharges: [...(b.billingCharges || []), doctorVisitCharge]
          }
        : b
    );

    setIpdBeds(updatedBeds);
    persistHospitalData(updatedBeds, labOrders);

    setShowAddRoundModal(false);
    setRoundNotes('');
    setRoundTreatment('');
  };

  // Handler: Record Advance Payment
  const handleSavePayment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) return;

    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const receiptNo = `REC-${Math.floor(100000 + Math.random() * 900000)}`;

    const newAdvance: InpatientAdvancePayment = {
      id: `adv-${Date.now()}`,
      amount: amt,
      paymentMode: paymentMode || 'UPI',
      receiptNumber: receiptNo,
      datePaid: `${today} ${time}`,
      notes: paymentNotes || 'Payment receipt'
    };

    // 1. Post to Centralized Backend Billing Ledger
    if (isValidUuid(id)) {
      try {
        await apiClient.post('/billing/ledger/payment', {
          patientId: id,
          encounterType: activeHospitalBed ? 'IPD' : 'GENERAL',
          encounterId: activeHospitalBed ? activeHospitalBed.bedNumber : undefined,
          amount: amt,
          paymentMode: paymentMode || 'UPI',
          receiptNumber: receiptNo,
          notes: paymentNotes || 'Payment receipt'
        });
        refetchLedger();
      } catch (err) {
        console.error('Failed to post payment to backend ledger:', err);
      }
    }

    // 2. Update Direct Payments for Patient
    const updatedDirect = [...patientDirectPayments, newAdvance];
    setPatientDirectPayments(updatedDirect);
    const pid = patient?.id || id;
    if (pid) {
      localStorage.setItem(`nisschay_patient_payments_${pid}`, JSON.stringify(updatedDirect));
    }

    // 3. If bed exists, also attach to bed record
    if (activeHospitalBed) {
      const updatedBeds = ipdBeds.map((b) =>
        b.id === activeHospitalBed.id
          ? {
              ...b,
              advancePayments: [...(b.advancePayments || []), newAdvance]
            }
          : b
      );
      setIpdBeds(updatedBeds);
      persistHospitalData(updatedBeds, labOrders);
    }

    setShowPaymentModal(false);
    setPaymentAmount('3000');
    setPaymentNotes('');
  };

  const handleRecordPayment = handleSavePayment;

  // Handler: Discharge Patient & Clear Bed
  const handleConfirmDischarge = async () => {
    if (!activeHospitalBed) return;
    setIsDischarging(true);

    try {
      const today = new Date().toISOString().split('T')[0];
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // 1. If there is remaining balance, record auto settlement receipt and post to backend ledger
      const updatedAdvances = [...(activeHospitalBed.advancePayments || [])];
      const settleAmount = billingSummary.netOutstanding;
      const receiptNumber = `REC-DISCHARGE-${Math.floor(100000 + Math.random() * 900000)}`;

      if (settleAmount > 0) {
        const finalReceipt: InpatientAdvancePayment = {
          id: `adv-final-${Date.now()}`,
          amount: settleAmount,
          paymentMode: 'UPI',
          receiptNumber: receiptNumber,
          datePaid: `${today} ${time}`,
          notes: 'Final Inpatient Discharge Settlement'
        };
        updatedAdvances.push(finalReceipt);
      }

      // Post settlement to backend ledger
      if (isValidUuid(id)) {
        try {
          await apiClient.post('/billing/ledger/settle-discharge', {
            patientId: id,
            encounterId: activeHospitalBed.bedNumber,
            settlementAmount: settleAmount,
            paymentMode: 'UPI',
            receiptNumber: receiptNumber,
            notes: 'Final Inpatient Discharge Settlement'
          });
          refetchLedger();
        } catch (err) {
          console.error('Failed to post discharge settlement to backend ledger:', err);
        }
      }

      // 2. Mark Bed as CLEANING in Command Center with full discharge dossier attached
      const updatedBeds = ipdBeds.map((b) =>
        b.id === activeHospitalBed.id
          ? {
              ...b,
              status: 'CLEANING' as any,
              advancePayments: updatedAdvances,
              dischargePlan: {
                plannedDate: today,
                plannedTime: time,
                dischargeType: dischargeType,
                finalDiagnosis: dischargeDiagnosis || b.admittingDiagnosis,
                hospitalCourse: dischargeCourse,
                conditionAtDischarge: dischargeCondition,
                dietaryAdvice: dischargeAdvice,
                followUpDate: dischargeFollowUp,
                emergencyAlertSigns: dischargeEmergencySigns,
                takeHomeMedications: dischargeTakeHomeMeds,
                clearedByDoctor: true,
                clearedByBilling: true
              }
            }
          : b
      );

      setIpdBeds(updatedBeds);
      persistHospitalData(updatedBeds, labOrders);
      setShowDischargeModal(false);
      setShowPrintDischargeDoc(true);
    } catch (e) {
      console.error('Error during discharge:', e);
    } finally {
      setIsDischarging(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-center">
        <div className="space-y-3">
          <div className="w-8 h-8 border-2 border-[#087F8C] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#567781] font-medium">Loading patient clinical dossier...</p>
        </div>
      </div>
    );
  }

  if (isError || !patient) {
    return (
      <div className="bg-white border border-[#E8EEF2] rounded-2xl p-8 text-center max-w-md mx-auto space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-[#172B34]">Patient Record Not Found</h3>
          <p className="text-xs text-[#567781] mt-1">
            The requested medical file does not exist or has been removed from the registry.
          </p>
        </div>
        <Link href="/patients">
          <Button size="sm" className="bg-[#087F8C] hover:bg-[#076b77] text-white text-xs font-bold rounded-xl h-8.5 px-4 border-0 cursor-pointer">
            ← Return to Patient Directory
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 font-sans min-w-0">
      {/* 1. TOP HEADER & PATIENT METADATA BANNER */}
      <div className="relative overflow-hidden bg-white border border-[#E8EEF2] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3.5">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left: Avatar + Name + Badges */}
          <div className="flex items-start sm:items-center gap-3">
            <Link
              href="/patients"
              className="w-8 h-8 rounded-xl border border-[#E8EEF2] bg-[#F6F9FB] hover:bg-white text-[#567781] hover:text-[#172B34] flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Back to Directory"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#087F8C] to-[#055760] text-white flex items-center justify-center font-extrabold text-sm shadow-xs shrink-0">
              {getInitials(patient.name)}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-[#172B34] tracking-tight">
                  {patient.name}
                </h1>

                {/* Hospitalized Bed Badge */}
                {activeHospitalBed ? (
                  <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                    <BedDouble className="w-3 h-3 text-rose-600 animate-pulse" />
                    <span>Inpatient (Bed {activeHospitalBed.bedNumber} • {activeHospitalBed.wardName})</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Active Outpatient (OPD)</span>
                  </span>
                )}

                {patient.bloodGroup && (
                  <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-md font-mono">
                    {patient.bloodGroup}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-[#567781] mt-1 flex-wrap font-medium">
                <span className="font-mono text-[#087F8C] font-bold">
                  {patient.pid || `PID-${patient.id?.substring(0, 8).toUpperCase()}`}
                </span>
                <span>•</span>
                <span>{calculateAge(patient.dateOfBirth)} / {patient.gender || 'UNSPECIFIED'}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-[#087F8C]" />
                  {patient.phone}
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Buttons (Clean, Consistent & Focused) */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Documents Hub Button */}
            <Button
              size="sm"
              onClick={() => setActiveTab('documents')}
              className={`font-bold text-xs rounded-xl h-8.5 px-3.5 border cursor-pointer shadow-2xs flex items-center gap-1.5 transition-all ${
                activeTab === 'documents'
                  ? 'bg-[#087F8C] text-white border-[#087F8C]'
                  : 'bg-[#F6F9FB] text-[#172B34] border-[#E8EEF2] hover:bg-white hover:text-[#087F8C]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Documents</span>
            </Button>

            {/* Edit Demographics Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenEditDemographics}
              className="border-[#087F8C]/40 bg-white hover:bg-[#087F8C]/10 text-[#087F8C] font-bold text-xs rounded-xl h-8.5 px-3.5 cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Edit2 className="w-3.5 h-3.5 text-[#087F8C]" />
              <span>Edit Demographics</span>
            </Button>

            {/* Print Master Dossier */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.print()}
              className="border-[#E8EEF2] bg-[#F6F9FB] hover:bg-white text-[#172B34] font-bold text-xs rounded-xl h-8.5 px-3 cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-[#567781]" />
              <span>Print EMR</span>
            </Button>
          </div>
        </div>

        {/* Active Hospitalization Warning/Summary Strip */}
        {activeHospitalBed && (
          <div className="p-3 bg-gradient-to-r from-rose-50/80 via-white to-rose-50/50 rounded-xl border border-rose-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
                <BedDouble className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-rose-900">
                    Currently Hospitalized: {activeHospitalBed.wardName} (Bed {activeHospitalBed.bedNumber})
                  </span>
                  <span className="text-[10px] text-[#567781] font-mono">
                    ({activeHospitalBed.ipdNumber})
                  </span>
                </div>
                <p className="text-[11px] text-[#567781] mt-0.5">
                  Admitted: {activeHospitalBed.admissionDate} • Consultant: <strong className="text-[#172B34]">{activeHospitalBed.consultantDoctorName}</strong> • Diagnosis: <strong className="text-rose-800">{activeHospitalBed.admittingDiagnosis}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveTab('inpatient')}
                className="h-7.5 border-rose-300 text-rose-800 hover:bg-rose-100 font-bold text-xs rounded-lg cursor-pointer"
              >
                IPD History →
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 2. TAB NAVIGATION (MATCHED CLEAN DESIGN, STANDARD LUCIDE ICONS) */}
      <div className="flex items-center space-x-1.5 border-b border-[#E8EEF2] pb-2 no-print overflow-x-auto">
        {/* Tab 1: Demographics (First Tab) */}
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'profile'
              ? 'bg-[#087F8C] text-white shadow-2xs'
              : 'text-[#567781] hover:text-[#172B34] hover:bg-[#F6F9FB]'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Demographics & Profile</span>
        </button>

        {/* Tab 2: Patient Timeline & Journey */}
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'timeline'
              ? 'bg-[#087F8C] text-white shadow-2xs'
              : 'text-[#567781] hover:text-[#172B34] hover:bg-[#F6F9FB]'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Patient Journey & Timeline ({timelineEvents.length})</span>
        </button>

        {/* Tab 3: OPD Consultations */}
        <button
          onClick={() => setActiveTab('consultations')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'consultations'
              ? 'bg-[#087F8C] text-white shadow-2xs'
              : 'text-[#567781] hover:text-[#172B34] hover:bg-[#F6F9FB]'
          }`}
        >
          <Stethoscope className="w-3.5 h-3.5" />
          <span>OPD Doctor Visits ({completedAppts.length})</span>
        </button>

        {/* Tab 4: IPD History (if admitted) */}
        {activeHospitalBed && (
          <button
            onClick={() => setActiveTab('inpatient')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'inpatient'
                ? 'bg-[#087F8C] text-white shadow-2xs'
                : 'text-[#567781] hover:text-[#172B34] hover:bg-[#F6F9FB]'
            }`}
          >
            <BedDouble className="w-3.5 h-3.5" />
            <span>IPD History</span>
          </button>
        )}

        {/* Tab 5: Lab & Diagnostics */}
        <button
          onClick={() => setActiveTab('labs')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'labs'
              ? 'bg-[#087F8C] text-white shadow-2xs'
              : 'text-[#567781] hover:text-[#172B34] hover:bg-[#F6F9FB]'
          }`}
        >
          <FlaskConical className="w-3.5 h-3.5" />
          <span>Lab & Diagnostics ({patientLabOrders.length})</span>
        </button>

        {/* Tab 6: Pharmacy & Prescriptions */}
        <button
          onClick={() => setActiveTab('medications')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'medications'
              ? 'bg-[#087F8C] text-white shadow-2xs'
              : 'text-[#567781] hover:text-[#172B34] hover:bg-[#F6F9FB]'
          }`}
        >
          <Pill className="w-3.5 h-3.5" />
          <span>Pharmacy & Prescriptions</span>
        </button>

        {/* Tab 7: Running Billing & Ledger */}
        <button
          onClick={() => setActiveTab('billing')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'billing'
              ? 'bg-[#087F8C] text-white shadow-2xs'
              : 'text-[#567781] hover:text-[#172B34] hover:bg-[#F6F9FB]'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Billing & Ledger</span>
        </button>

        {/* Tab 8: Documents Hub */}
        <button
          onClick={() => setActiveTab('documents')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'documents'
              ? 'bg-[#087F8C] text-white shadow-2xs'
              : 'text-[#567781] hover:text-[#172B34] hover:bg-[#F6F9FB]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Documents</span>
        </button>
      </div>

      {/* 3. TAB PANELS */}
      <div>
        {/* ========================================================================= */}
        {/* TAB 1: PATIENT JOURNEY & CHRONOLOGICAL TIMELINE                           */}
        {/* ========================================================================= */}
        {activeTab === 'timeline' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-3 rounded-xl border border-[#E8EEF2] shadow-2xs">
              <div>
                <h3 className="text-xs font-bold text-[#172B34] uppercase tracking-wider">
                  Complete Clinical Trail & Lifecycle ({timelineEvents.length} Events)
                </h3>
                <p className="text-[11px] text-[#567781]">
                  Every medical action, doctor consultation, admission, service charge, pharmacy indent, and payment sorted in exact chronological order.
                </p>
              </div>

              {/* Toolbar Controls: Category Filter + Sorting Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Category Dropdown */}
                <select
                  value={timelineCategoryFilter}
                  onChange={(e) => setTimelineCategoryFilter(e.target.value)}
                  className="h-7.5 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs text-[#172B34] font-medium focus:outline-none focus:border-[#087F8C] cursor-pointer"
                >
                  <option value="ALL">All Categories</option>
                  <option value="INPATIENT_SERVICE">Hospital Services & OT</option>
                  <option value="MEDICATION">Pharmacy & Indents</option>
                  <option value="DOCTOR_ROUND">Doctor Rounds & Vitals</option>
                  <option value="LAB_ORDER">Lab Investigations</option>
                  <option value="PAYMENT">Advance & Receipts</option>
                  <option value="OPD_CONSULT">OPD Consultations</option>
                  <option value="ADMISSION">Inpatient Admission</option>
                  <option value="REGISTRATION">Registration</option>
                </select>

                {/* Sort Toggle: Last-to-First vs First-to-Last */}
                <div className="flex items-center gap-1 bg-[#F6F9FB] p-0.5 rounded-lg border border-[#E8EEF2]">
                  <button
                    type="button"
                    onClick={() => setTimelineSortOrder('LAST_TO_FIRST')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      timelineSortOrder === 'LAST_TO_FIRST'
                        ? 'bg-[#087F8C] text-white shadow-2xs'
                        : 'text-[#567781] hover:text-[#172B34]'
                    }`}
                    title="Show newest / latest events first"
                  >
                    <span>Newest First</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTimelineSortOrder('FIRST_TO_LAST')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      timelineSortOrder === 'FIRST_TO_LAST'
                        ? 'bg-[#087F8C] text-white shadow-2xs'
                        : 'text-[#567781] hover:text-[#172B34]'
                    }`}
                    title="Show earliest events first in chronological order"
                  >
                    <span>Oldest First</span>
                  </button>
                </div>
              </div>
            </div>

            {timelineEvents.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#E8EEF2] p-8 text-center max-w-sm mx-auto space-y-2">
                <Activity className="w-8 h-8 text-[#567781] mx-auto opacity-40" />
                <h4 className="text-xs font-bold text-[#172B34]">No Events Recorded Yet</h4>
                <p className="text-[11px] text-[#567781]">Clinical activities and consultations will form the timeline here.</p>
              </div>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-[2px] before:bg-[#E8EEF2]">
                {timelineEvents.map((evt) => (
                  <div key={evt.id} className="relative group">
                    <div className="absolute -left-[27px] top-1 w-4 h-4 rounded-full bg-white border-2 border-[#087F8C] group-hover:scale-110 transition-transform" />
                    
                    <div className="bg-white rounded-xl border border-[#E8EEF2] p-3.5 shadow-2xs hover:border-[#087F8C]/40 transition-colors space-y-1.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${evt.badgeColor || 'bg-slate-100 text-slate-700'}`}>
                            {evt.category.replace('_', ' ')}
                          </span>
                          <h4 className="text-xs font-bold text-[#172B34]">{evt.title}</h4>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10.5px] font-mono text-[#172B34] font-semibold bg-[#F6F9FB] px-1.5 py-0.5 rounded border border-[#E8EEF2]">
                            {formatClinicalDateTime(evt.timestamp)}
                          </span>
                          <span className="text-[9.5px] text-[#567781]">
                            ({formatRelativeTime(evt.timestamp)})
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-[#567781] leading-relaxed">
                        {evt.description}
                      </p>

                      <div className="flex items-center justify-between text-[11px] pt-1 text-[#567781] border-t border-[#F6F9FB]">
                        <span>Recorded by: <strong className="text-[#172B34]">{evt.actor}</strong></span>
                        {evt.amount && evt.amount > 0 && (
                          <span className="font-bold text-[#087F8C] font-mono">
                            ₹{evt.amount.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: OPD DOCTOR CONSULTATIONS                                           */}
        {/* ========================================================================= */}
        {activeTab === 'consultations' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#172B34] uppercase tracking-wider">
                OPD Clinical Consultations & Encounters ({completedAppts.length})
              </h3>
            </div>

            {completedAppts.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#E8EEF2] p-8 text-center max-w-sm mx-auto space-y-2">
                <Stethoscope className="w-8 h-8 text-[#567781] mx-auto opacity-40" />
                <h4 className="text-xs font-bold text-[#172B34]">No OPD Consultations Recorded</h4>
                <p className="text-[11px] text-[#567781]">Completed outpatient appointments will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedAppts.map((appt) => (
                  <div key={appt.id} className="bg-white rounded-xl border border-[#E8EEF2] p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-bold text-[#172B34]">
                          {formatDate(appt.appointmentDate)} • {appt.startTime || '09:00 AM'}
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                          {appt.type || 'OPD Consultation'}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-[#087F8C]">
                        Dr. {appt.doctorName || 'Attending Specialist'}
                      </span>
                    </div>

                    <div className="text-xs space-y-2 text-[#567781]">
                      {appt.diagnosis && (
                        <p className="font-medium text-[#172B34]">
                          <span className="font-bold text-[#087F8C]">Diagnosis: </span>
                          {appt.diagnosis}
                        </p>
                      )}
                      <p><strong>Clinical Notes / Symptoms:</strong> {appt.notes || appt.symptoms || 'Routine OPD Consultation'}</p>
                      
                      {appt.prescription && (
                        <div className="p-2.5 bg-[#F6F9FB] rounded-lg border border-[#E8EEF2] space-y-1">
                          <span className="text-[10px] font-bold text-[#087F8C] uppercase block">Prescription Summary</span>
                          <p className="text-xs text-[#172B34] font-medium line-clamp-2">{appt.prescription}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-[#E8EEF2]">
                        <span className="text-[11px] text-[#567781]">
                          {appt.prescription ? 'Prescription recorded' : 'Clinical Consultation note'}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setViewingApptPrescription(appt)}
                          className="h-7 text-xs px-2.5 rounded-lg border-[#087F8C]/30 text-[#087F8C] hover:bg-teal-50/60 font-semibold cursor-pointer flex items-center gap-1.5 shadow-2xs"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Prescription</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: HOSPITAL STAY & INPATIENT CLINICAL FILE (ADMISSION TO DISCHARGE)   */}
        {/* ========================================================================= */}
        {activeTab === 'inpatient' && activeHospitalBed && (
          <div className="space-y-4">
            {/* Top Cards: Bed, Vitals, Stay Days, Clinical Status (No Financials) */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-white rounded-xl border border-[#E8EEF2] shadow-2xs">
                <span className="text-[10px] font-bold text-[#567781] uppercase block">Bed & Ward</span>
                <div className="text-sm font-extrabold text-[#172B34] mt-1 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-[#172B34] text-white font-mono text-xs">
                    {activeHospitalBed.bedNumber}
                  </span>
                  <span>{activeHospitalBed.wardName}</span>
                </div>
                <span className="text-[11px] text-[#567781] block mt-0.5">₹{activeHospitalBed.dailyRate}/day</span>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-[#E8EEF2] shadow-2xs">
                <span className="text-[10px] font-bold text-[#567781] uppercase block">Admitted Since</span>
                <div className="text-sm font-extrabold text-[#172B34] mt-1">
                  {activeHospitalBed.admissionDate}
                </div>
                <span className="text-[11px] text-[#567781] block mt-0.5 font-mono">{activeHospitalBed.ipdNumber}</span>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-[#E8EEF2] shadow-2xs">
                <span className="text-[10px] font-bold text-[#567781] uppercase block">Attending Consultant</span>
                <div className="text-sm font-extrabold text-[#087F8C] mt-1 truncate">
                  {activeHospitalBed.consultantDoctorName}
                </div>
                <span className="text-[11px] text-[#567781] block mt-0.5 truncate">{activeHospitalBed.admittingDiagnosis}</span>
              </div>

              <div className="p-3.5 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] shadow-2xs flex flex-col justify-between">
                <span className="text-[10px] font-bold text-[#087F8C] uppercase block">Clinical Inpatient Status</span>
                <div className="text-sm font-bold text-[#172B34] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{activeHospitalBed.dischargePlan ? 'Discharge Dossier Ready' : 'Active Inpatient Care'}</span>
                </div>
                <span className="text-[11px] text-[#567781]">
                  {activeHospitalBed.dailyLogs?.length || 0} Doctor Rounds • {activeHospitalBed.inpatientMedications?.length || 0} Meds • {activeHospitalBed.inpatientLabOrders?.length || 0} Labs
                </span>
              </div>
            </div>

            {/* Inpatient File Sub-Tab Navigation Bar */}
            <div className="flex items-center justify-between gap-2 flex-wrap bg-white p-2 rounded-xl border border-[#E8EEF2] shadow-2xs">
              <div className="flex items-center gap-1 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setIpdStayFileTab('ALL_HISTORY')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    ipdStayFileTab === 'ALL_HISTORY'
                      ? 'bg-[#087F8C] text-white shadow-2xs'
                      : 'text-[#567781] hover:text-[#172B34] hover:bg-[#F6F9FB]'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Full Stay History</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIpdStayFileTab('ROUNDS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    ipdStayFileTab === 'ROUNDS'
                      ? 'bg-[#087F8C] text-white shadow-2xs'
                      : 'text-[#567781] hover:text-[#172B34] hover:bg-[#F6F9FB]'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5" />
                  <span>Doctor Rounds ({activeHospitalBed.dailyLogs?.length || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIpdStayFileTab('MEDS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    ipdStayFileTab === 'MEDS'
                      ? 'bg-[#087F8C] text-white shadow-2xs'
                      : 'text-[#567781] hover:text-[#172B34] hover:bg-[#F6F9FB]'
                  }`}
                >
                  <Pill className="w-3.5 h-3.5" />
                  <span>Pharmacy & MAR ({activeHospitalBed.inpatientMedications?.length || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIpdStayFileTab('LABS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    ipdStayFileTab === 'LABS'
                      ? 'bg-[#087F8C] text-white shadow-2xs'
                      : 'text-[#567781] hover:text-[#172B34] hover:bg-[#F6F9FB]'
                  }`}
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span>Ward Labs ({activeHospitalBed.inpatientLabOrders?.length || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIpdStayFileTab('SERVICES')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    ipdStayFileTab === 'SERVICES'
                      ? 'bg-[#087F8C] text-white shadow-2xs'
                      : 'text-[#567781] hover:text-[#172B34] hover:bg-[#F6F9FB]'
                  }`}
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>Nursing & Services ({activeHospitalBed.billingCharges?.filter(c => c.category !== 'BED_RENT' && c.category !== 'DOCTOR_VISIT').length || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIpdStayFileTab('DISCHARGE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    ipdStayFileTab === 'DISCHARGE'
                      ? 'bg-[#087F8C] text-white shadow-2xs'
                      : 'text-[#567781] hover:text-[#172B34] hover:bg-[#F6F9FB]'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Discharge Dossier</span>
                </button>
              </div>
            </div>

            {/* SUB-VIEW 1: ALL INPATIENT HISTORY (ADMISSION TO DISCHARGE) */}
            {ipdStayFileTab === 'ALL_HISTORY' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-[#E8EEF2]">
                  <div>
                    <h3 className="text-xs font-bold text-[#172B34] uppercase tracking-wider">
                      Inpatient Clinical Log & Stay History
                    </h3>
                    <p className="text-[11px] text-[#567781]">
                      Complete chronological timeline of doctor rounds, nurse medication logs, diagnostic orders, and clinical services.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#087F8C] bg-[#F6F9FB] px-2.5 py-1 rounded-lg border border-[#E8EEF2]">
                    IPD: {activeHospitalBed.ipdNumber}
                  </span>
                </div>

                {/* Chronological Trail */}
                <div className="space-y-3">
                  {/* 1. Admission Point */}
                  <div className="p-3.5 bg-white rounded-xl border border-[#E8EEF2] shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                          ADMISSION
                        </span>
                        <h4 className="text-xs font-bold text-[#172B34]">
                          Patient Admitted to {activeHospitalBed.wardName} (Bed {activeHospitalBed.bedNumber})
                        </h4>
                      </div>
                      <span className="text-[11px] font-mono text-[#567781] font-semibold">
                        {activeHospitalBed.admissionDate} • {activeHospitalBed.admissionTime || '09:00 AM'}
                      </span>
                    </div>
                    <p className="text-xs text-[#567781]">
                      Admitting Consultant: <strong className="text-[#172B34]">{activeHospitalBed.consultantDoctorName}</strong> • Provisional Diagnosis: <strong className="text-[#087F8C]">{activeHospitalBed.admittingDiagnosis}</strong>
                    </p>
                  </div>

                  {/* 2. Doctor Rounds */}
                  {(activeHospitalBed.dailyLogs || []).map((log) => (
                    <div key={log.id} className="p-3.5 bg-white rounded-xl border border-[#E8EEF2] shadow-2xs space-y-2">
                      <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                            DOCTOR ROUND
                          </span>
                          <h4 className="text-xs font-bold text-[#172B34]">{log.recordedBy}</h4>
                        </div>
                        <span className="text-[11px] font-mono text-[#567781] font-semibold">{log.timestamp}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-2 bg-[#F6F9FB] rounded-lg text-xs border border-[#E8EEF2]">
                        <div><span className="text-[#567781] text-[10px] block">Temp</span><strong className="text-[#172B34] font-mono">{log.temp || '98.6°F'}</strong></div>
                        <div><span className="text-[#567781] text-[10px] block">BP</span><strong className="text-[#172B34] font-mono">{log.bp || '120/80'}</strong></div>
                        <div><span className="text-[#567781] text-[10px] block">Pulse</span><strong className="text-[#172B34] font-mono">{log.pulse || '78 bpm'}</strong></div>
                        <div><span className="text-[#567781] text-[10px] block">SpO₂</span><strong className="text-[#087F8C] font-mono">{log.spo2 || '99%'}</strong></div>
                        <div><span className="text-[#567781] text-[10px] block">Resp</span><strong className="text-[#172B34] font-mono">{log.respRate || '18/m'}</strong></div>
                      </div>
                      <div className="text-xs space-y-1 text-[#567781]">
                        <p><strong>Clinical Notes:</strong> {log.clinicalNotes}</p>
                        {log.treatmentGiven && <p><strong>Orders / Rx:</strong> {log.treatmentGiven}</p>}
                      </div>
                    </div>
                  ))}

                  {/* 3. Inpatient Medications Given / Indented */}
                  {(activeHospitalBed.inpatientMedications || []).map((med) => (
                    <div key={med.id} className="p-3.5 bg-white rounded-xl border border-[#E8EEF2] shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            med.status === 'ADMINISTERED'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            {med.status === 'ADMINISTERED' ? 'MED GIVEN' : 'PHARMACY QUEUED'}
                          </span>
                          <h4 className="text-xs font-bold text-[#172B34]">{med.medicineName}</h4>
                          <span className="text-[11px] text-[#567781] font-medium">({med.dosage} • {med.frequency})</span>
                        </div>
                        <span className="text-[11px] font-mono text-[#567781] font-semibold">{med.dateOrdered}</span>
                      </div>
                      <p className="text-xs text-[#567781]">
                        Prescribed By: <strong className="text-[#172B34]">{med.prescribedBy}</strong> {med.requestedByNurse && <span>• Nurse: <strong>{med.requestedByNurse}</strong></span>} • Notes: {med.notes || 'Routine Ward Administration'}
                      </p>
                    </div>
                  ))}

                  {/* 4. Inpatient Lab Investigations */}
                  {(activeHospitalBed.inpatientLabOrders || []).map((lab) => (
                    <div key={lab.id} className="p-3.5 bg-white rounded-xl border border-[#E8EEF2] shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-800 border border-cyan-200">
                            LAB INVESTIGATION
                          </span>
                          <h4 className="text-xs font-bold text-[#172B34]">{lab.testName}</h4>
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">{lab.source}</span>
                        </div>
                        <span className="text-[11px] font-mono text-[#567781] font-semibold">{lab.dateOrdered}</span>
                      </div>
                      <p className="text-xs text-[#567781]">
                        Category: <strong className="text-[#172B34]">{lab.category}</strong> • Ordered By: <strong>{lab.orderedBy}</strong> • Status: <strong className="text-[#087F8C]">{lab.status}</strong>
                      </p>
                    </div>
                  ))}

                  {/* 5. Discharge Clearance (if completed) */}
                  {activeHospitalBed.dischargePlan && (
                    <div className="p-3.5 bg-white rounded-xl border border-emerald-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between border-b border-emerald-100 pb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-mono">
                            DISCHARGE SUMMARY CERTIFIED
                          </span>
                          <h4 className="text-xs font-bold text-emerald-900">
                            Cleared for Departure ({activeHospitalBed.dischargePlan.dischargeType})
                          </h4>
                        </div>
                        <span className="text-[11px] font-mono text-emerald-800 font-bold">
                          {activeHospitalBed.dischargePlan.plannedDate} • {activeHospitalBed.dischargePlan.plannedTime || '11:30 AM'}
                        </span>
                      </div>
                      <div className="text-xs space-y-1 text-[#567781]">
                        <p><strong>Final Diagnosis:</strong> {activeHospitalBed.dischargePlan.finalDiagnosis}</p>
                        <p><strong>Condition at Departure:</strong> {activeHospitalBed.dischargePlan.conditionAtDischarge}</p>
                        <p><strong>Dietary & Home Care:</strong> {activeHospitalBed.dischargePlan.dietaryAdvice}</p>
                        <p><strong>Follow-Up:</strong> {activeHospitalBed.dischargePlan.followUpDate}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SUB-VIEW 2: DOCTOR PROGRESS ROUNDS */}
            {ipdStayFileTab === 'ROUNDS' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-[#E8EEF2]">
                  <div>
                    <h3 className="text-xs font-bold text-[#172B34] uppercase tracking-wider">
                      Doctor Progress Rounds & Vitals Log ({activeHospitalBed.dailyLogs?.length || 0})
                    </h3>
                    <p className="text-[11px] text-[#567781]">Daily clinical evaluations, bedside observations, and vitals chart.</p>
                  </div>
                </div>

                {(!activeHospitalBed.dailyLogs || activeHospitalBed.dailyLogs.length === 0) ? (
                  <div className="bg-white rounded-xl border border-[#E8EEF2] p-8 text-center max-w-sm mx-auto space-y-2">
                    <Activity className="w-8 h-8 text-[#567781] mx-auto opacity-40" />
                    <h4 className="text-xs font-bold text-[#172B34]">No Rounds Logged Yet</h4>
                    <p className="text-[11px] text-[#567781]">Click Record Round to log doctor visit notes and vitals.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeHospitalBed.dailyLogs.map((log) => (
                      <div key={log.id} className="p-3.5 bg-white rounded-xl border border-[#E8EEF2] shadow-2xs space-y-2">
                        <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-1.5">
                          <span className="text-xs font-bold text-[#172B34]">{log.timestamp}</span>
                          <span className="text-xs font-bold text-[#087F8C]">{log.recordedBy}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-2 bg-[#F6F9FB] rounded-lg text-xs border border-[#E8EEF2]">
                          <div><span className="text-[#567781] text-[10px] block">Temp</span><strong className="text-[#172B34] font-mono">{log.temp || '98.6°F'}</strong></div>
                          <div><span className="text-[#567781] text-[10px] block">BP</span><strong className="text-[#172B34] font-mono">{log.bp || '120/80'}</strong></div>
                          <div><span className="text-[#567781] text-[10px] block">Pulse</span><strong className="text-[#172B34] font-mono">{log.pulse || '78 bpm'}</strong></div>
                          <div><span className="text-[#567781] text-[10px] block">SpO₂</span><strong className="text-[#087F8C] font-mono">{log.spo2 || '99%'}</strong></div>
                          <div><span className="text-[#567781] text-[10px] block">Resp</span><strong className="text-[#172B34] font-mono">{log.respRate || '18/m'}</strong></div>
                        </div>
                        <div className="text-xs space-y-1 text-[#567781]">
                          <p><strong>Clinical Notes:</strong> {log.clinicalNotes}</p>
                          {log.treatmentGiven && <p><strong>Orders & Treatment:</strong> {log.treatmentGiven}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SUB-VIEW 3: PHARMACY & MAR */}
            {ipdStayFileTab === 'MEDS' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-[#E8EEF2]">
                  <div>
                    <h3 className="text-xs font-bold text-[#172B34] uppercase tracking-wider">
                      Inpatient Medication Administration Record (MAR)
                    </h3>
                    <p className="text-[11px] text-[#567781]">Scheduled bed medications, nurse administration logs, and pharmacy indents.</p>
                  </div>
                </div>

                {(!activeHospitalBed.inpatientMedications || activeHospitalBed.inpatientMedications.length === 0) ? (
                  <div className="bg-white rounded-xl border border-[#E8EEF2] p-8 text-center max-w-sm mx-auto space-y-2">
                    <Pill className="w-8 h-8 text-[#567781] mx-auto opacity-40" />
                    <h4 className="text-xs font-bold text-[#172B34]">No Inpatient Medications Ordered</h4>
                    <p className="text-[11px] text-[#567781]">Click Indent Inpatient Meds to order ward medications.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeHospitalBed.inpatientMedications.map((med) => (
                      <div key={med.id} className="p-3.5 bg-white rounded-xl border border-[#E8EEF2] shadow-2xs space-y-2">
                        <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#087F8C]">{med.indentNumber || 'IND-MED'}</span>
                            <strong className="text-xs text-[#172B34]">{med.medicineName}</strong>
                            <span className="text-[11px] text-[#567781]">({med.dosage} • {med.frequency})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                              med.status === 'ADMINISTERED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              {med.status === 'ADMINISTERED' ? 'Given ✓' : 'Queued in Pharmacy'}
                            </span>
                            {med.status !== 'ADMINISTERED' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setAdministerMedId(med.id);
                                  setShowAdministerModal(true);
                                }}
                                className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100 text-[10px] font-bold cursor-pointer"
                              >
                                Log Given
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-[#567781]">
                          <span>Prescribed by: <strong>{med.prescribedBy}</strong> {med.requestedByNurse && <span>• Nurse: <strong>{med.requestedByNurse}</strong></span>}</span>
                          <span className="font-mono text-[11px]">{med.dateOrdered}</span>
                        </div>
                        {med.notes && <p className="text-xs text-[#567781] bg-[#F6F9FB] p-2 rounded border border-[#E8EEF2]">{med.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SUB-VIEW 4: WARD LAB INVESTIGATIONS */}
            {ipdStayFileTab === 'LABS' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-[#E8EEF2]">
                  <div>
                    <h3 className="text-xs font-bold text-[#172B34] uppercase tracking-wider">
                      Inpatient Ward Diagnostics & Scans ({activeHospitalBed.inpatientLabOrders?.length || 0})
                    </h3>
                    <p className="text-[11px] text-[#567781]">Pathology, biochemistry, and imaging ordered during hospital stay.</p>
                  </div>
                </div>

                {(!activeHospitalBed.inpatientLabOrders || activeHospitalBed.inpatientLabOrders.length === 0) ? (
                  <div className="bg-white rounded-xl border border-[#E8EEF2] p-8 text-center max-w-sm mx-auto space-y-2">
                    <FlaskConical className="w-8 h-8 text-[#567781] mx-auto opacity-40" />
                    <h4 className="text-xs font-bold text-[#172B34]">No Ward Lab Orders</h4>
                    <p className="text-[11px] text-[#567781]">Click Order Diagnostic Test to request bloodwork or imaging.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeHospitalBed.inpatientLabOrders.map((lab) => (
                      <div key={lab.id} className="p-3.5 bg-white rounded-xl border border-[#E8EEF2] shadow-2xs space-y-2">
                        <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-1.5">
                          <div className="flex items-center gap-2">
                            <strong className="text-xs text-[#172B34]">{lab.testName}</strong>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">{lab.category}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-bold">{lab.source}</span>
                          </div>
                          <span className="text-[11px] font-mono text-[#567781]">{lab.dateOrdered}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-[#567781]">
                          <span>Ordered by: <strong>{lab.orderedBy}</strong></span>
                          <span className="text-xs font-bold text-[#087F8C] bg-teal-50 px-2 py-0.5 rounded border border-teal-200">{lab.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SUB-VIEW 5: HOSPITAL & NURSING SERVICES */}
            {ipdStayFileTab === 'SERVICES' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-[#E8EEF2]">
                  <div>
                    <h3 className="text-xs font-bold text-[#172B34] uppercase tracking-wider">
                      Nursing & Clinical Inpatient Procedures
                    </h3>
                    <p className="text-[11px] text-[#567781]">IV lines, dressing, monitoring, oxygen, and bedside nursing procedures.</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setActiveTab('billing')}
                    className="h-7.5 bg-white hover:bg-[#F6F9FB] text-[#087F8C] border border-[#E8EEF2] font-bold text-xs rounded-lg cursor-pointer"
                  >
                    View in Ledger →
                  </Button>
                </div>

                {(() => {
                  const services = (activeHospitalBed.billingCharges || []).filter(c => c.category !== 'BED_RENT' && c.category !== 'DOCTOR_VISIT');
                  if (services.length === 0) {
                    return (
                      <div className="bg-white rounded-xl border border-[#E8EEF2] p-8 text-center max-w-sm mx-auto space-y-2">
                        <Building className="w-8 h-8 text-[#567781] mx-auto opacity-40" />
                        <h4 className="text-xs font-bold text-[#172B34]">No Nursing Services Recorded</h4>
                        <p className="text-[11px] text-[#567781]">Clinical services added during stay will appear here.</p>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-3">
                      {services.map((srv) => (
                        <div key={srv.id} className="p-3.5 bg-white rounded-xl border border-[#E8EEF2] shadow-2xs space-y-1">
                          <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-1">
                            <strong className="text-xs text-[#172B34]">{srv.serviceName}</strong>
                            <span className="text-[11px] font-mono text-[#567781]">{formatClinicalDateTime(srv.dateAdded)}</span>
                          </div>
                          <p className="text-xs text-[#567781]">{srv.notes || 'Standard clinical procedure'}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* SUB-VIEW 6: DISCHARGE DOSSIER */}
            {ipdStayFileTab === 'DISCHARGE' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-[#E8EEF2]">
                  <div>
                    <h3 className="text-xs font-bold text-[#172B34] uppercase tracking-wider">
                      Discharge Dossier & Take-Home Protocol
                    </h3>
                    <p className="text-[11px] text-[#567781]">Final discharge summary, condition at departure, and home care instructions.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => setShowPrintDischargeDoc(true)}
                      className="h-7.5 bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs rounded-lg border-0 cursor-pointer shadow-2xs"
                    >
                      <Printer className="w-3 h-3 mr-1" />
                      Print Discharge Summary
                    </Button>
                  </div>
                </div>

                {activeHospitalBed.dischargePlan ? (
                  <div className="bg-white rounded-xl border border-[#E8EEF2] p-4 shadow-2xs space-y-3 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-[#F6F9FB] rounded-lg border border-[#E8EEF2]">
                      <div><span className="text-[#567781] text-[10px] block">Planned Date</span><strong className="text-[#172B34]">{activeHospitalBed.dischargePlan.plannedDate}</strong></div>
                      <div><span className="text-[#567781] text-[10px] block">Discharge Type</span><strong className="text-[#087F8C]">{activeHospitalBed.dischargePlan.dischargeType}</strong></div>
                      <div><span className="text-[#567781] text-[10px] block">Follow-Up Date</span><strong className="text-[#172B34]">{activeHospitalBed.dischargePlan.followUpDate}</strong></div>
                      <div><span className="text-[#567781] text-[10px] block">Doctor Clearance</span><strong className="text-emerald-700">Cleared ✓</strong></div>
                    </div>
                    <div className="space-y-2">
                      <div><span className="text-[#567781] block text-[11px]">Final Diagnosis</span><p className="font-bold text-[#172B34]">{activeHospitalBed.dischargePlan.finalDiagnosis}</p></div>
                      <div><span className="text-[#567781] block text-[11px]">Hospital Course & Clinical Summary</span><p className="text-[#172B34] bg-[#F6F9FB] p-2.5 rounded border border-[#E8EEF2]">{activeHospitalBed.dischargePlan.hospitalCourse}</p></div>
                      <div><span className="text-[#567781] block text-[11px]">Condition at Departure</span><p className="text-[#172B34]">{activeHospitalBed.dischargePlan.conditionAtDischarge}</p></div>
                      <div><span className="text-[#567781] block text-[11px]">Dietary & Home Instructions</span><p className="text-[#172B34]">{activeHospitalBed.dischargePlan.dietaryAdvice}</p></div>
                      {activeHospitalBed.dischargePlan.takeHomeMedications && activeHospitalBed.dischargePlan.takeHomeMedications.length > 0 && (
                        <div>
                          <span className="text-[#567781] block text-[11px] mb-1">Take-Home Prescription ({activeHospitalBed.dischargePlan.takeHomeMedications.length} Meds)</span>
                          <div className="space-y-1">
                            {activeHospitalBed.dischargePlan.takeHomeMedications.map(m => (
                              <div key={m.id} className="p-2 bg-[#F6F9FB] rounded border border-[#E8EEF2] flex items-center justify-between text-xs">
                                <strong className="text-[#172B34]">{m.name}</strong>
                                <span className="text-[#567781]">{m.dosage} • {m.frequency} • {m.duration} ({m.timing})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-[#E8EEF2] p-8 text-center max-w-sm mx-auto space-y-2">
                    <FileText className="w-8 h-8 text-[#567781] mx-auto opacity-40" />
                    <h4 className="text-xs font-bold text-[#172B34]">Patient Currently Admitted</h4>
                    <p className="text-[11px] text-[#567781]">Discharge plan and summary can be prepared from the top action bar or Discharge Centre.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: LAB & DIAGNOSTIC INVESTIGATIONS (WITH OPD VS IPD SUB-TABS)         */}
        {/* ========================================================================= */}
        {activeTab === 'labs' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <h3 className="text-xs font-bold text-[#172B34] uppercase tracking-wider">
                  Diagnostic Lab & Pathology Requisitions
                </h3>
                <p className="text-[11px] text-[#567781]">
                  Filter between outpatient prescriptions and inpatient ward requisitions.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* OPD vs IPD Sub-tabs */}
                <div className="flex items-center gap-1 bg-[#F6F9FB] p-1 rounded-xl border border-[#E8EEF2]">
                  <button
                    type="button"
                    onClick={() => setLabSubTab('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      labSubTab === 'ALL' ? 'bg-white text-[#172B34] shadow-xs' : 'text-[#567781] hover:text-[#172B34]'
                    }`}
                  >
                    All Labs ({patientLabOrders.length + (activeHospitalBed?.inpatientLabOrders?.length || 0)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLabSubTab('OPD')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      labSubTab === 'OPD' ? 'bg-[#087F8C] text-white shadow-xs' : 'text-[#567781] hover:text-[#172B34]'
                    }`}
                  >
                    OPD Diagnostic ({patientLabOrders.length})
                  </button>
                  {activeHospitalBed && (
                    <button
                      type="button"
                      onClick={() => setLabSubTab('IPD')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        labSubTab === 'IPD' ? 'bg-rose-700 text-white shadow-xs' : 'text-rose-700 hover:bg-rose-50'
                      }`}
                    >
                      IPD Ward Labs ({activeHospitalBed.inpatientLabOrders?.length || 0})
                    </button>
                  )}
                </div>

                <Button
                  size="sm"
                  onClick={() => setShowOrderLabModal(true)}
                  className="h-8 bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs rounded-xl border-0 cursor-pointer shadow-xs"
                >
                  <FlaskConical className="w-3.5 h-3.5 mr-1" />
                  + Order Test
                </Button>
              </div>
            </div>

            {/* List of Lab Orders */}
            {(() => {
              const opdItems = labSubTab === 'IPD' ? [] : patientLabOrders;
              const ipdItems = labSubTab === 'OPD' ? [] : (activeHospitalBed?.inpatientLabOrders || []);
              const totalItemsCount = opdItems.length + ipdItems.length;

              if (totalItemsCount === 0) {
                return (
                  <div className="bg-white rounded-xl border border-[#E8EEF2] p-8 text-center max-w-sm mx-auto space-y-2">
                    <FlaskConical className="w-8 h-8 text-[#567781] mx-auto opacity-40" />
                    <h4 className="text-xs font-bold text-[#172B34]">No Lab Tests in this Category</h4>
                    <p className="text-[11px] text-[#567781]">Click + Order Test to request bloodwork, scans, or pathology.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {/* OPD Labs Table */}
                  {opdItems.length > 0 && (
                    <div className="bg-white rounded-xl border border-[#E8EEF2] overflow-hidden shadow-2xs">
                      <div className="px-3.5 py-2 bg-[#F6F9FB] border-b border-[#E8EEF2] flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#087F8C] uppercase flex items-center gap-1.5">
                          <Stethoscope className="w-3.5 h-3.5" />
                          <span>Outpatient (OPD) Diagnostic Requisitions</span>
                        </span>
                        <span className="text-[10px] font-semibold text-[#567781]">{opdItems.length} Tests</span>
                      </div>
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[#E8EEF2] text-[#567781] font-bold text-[11px] uppercase bg-white">
                            <th className="p-3">Order Date</th>
                            <th className="p-3">Investigation Test</th>
                            <th className="p-3">Category</th>
                            <th className="p-3">Prescribing Doctor</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Tariff Fee</th>
                            <th className="p-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E8EEF2]">
                          {opdItems.map((lab) => (
                            <tr key={lab.id} className="hover:bg-[#F6F9FB]/50">
                              <td className="p-3 font-mono text-[11px] text-[#567781]">{lab.orderDate}</td>
                              <td className="p-3 font-bold text-[#172B34]">{lab.testName}</td>
                              <td className="p-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">{lab.category}</span></td>
                              <td className="p-3 text-[#567781]">{lab.doctorName}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  lab.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                  {lab.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-[#087F8C]">₹{lab.price}</td>
                              <td className="p-3 text-right">
                                {lab.status !== 'COMPLETED' ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextStatus: 'SAMPLE_COLLECTED' | 'COMPLETED' = lab.status === 'ORDERED' ? 'SAMPLE_COLLECTED' : 'COMPLETED';
                                      const updated: LabInvestigationOrder[] = labOrders.map((l) =>
                                        l.id === lab.id ? { ...l, status: nextStatus } : l
                                      );
                                      setLabOrders(updated);
                                      persistHospitalData(ipdBeds, updated);
                                    }}
                                    className="text-[11px] font-bold text-[#087F8C] hover:underline cursor-pointer"
                                  >
                                    {lab.status === 'ORDERED' ? 'Collect Sample →' : 'Complete →'}
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-emerald-700 font-bold flex items-center justify-end gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Ready</span>
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* IPD Inpatient Labs Table */}
                  {ipdItems.length > 0 && activeHospitalBed && (
                    <div className="bg-white rounded-xl border border-rose-200 overflow-hidden shadow-2xs">
                      <div className="px-3.5 py-2 bg-rose-50/70 border-b border-rose-200 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-rose-900 uppercase flex items-center gap-1.5">
                          <BedDouble className="w-3.5 h-3.5 text-rose-600" />
                          <span>Inpatient (IPD) Ward Bed Investigations (Bed {activeHospitalBed.bedNumber})</span>
                        </span>
                        <span className="text-[10px] font-semibold text-rose-700">{ipdItems.length} Tests</span>
                      </div>
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[#E8EEF2] text-[#567781] font-bold text-[11px] uppercase bg-white">
                            <th className="p-3">Order Date</th>
                            <th className="p-3">Investigation Test</th>
                            <th className="p-3">Sourcing Facility</th>
                            <th className="p-3">Ordered By</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Tariff Fee</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E8EEF2]">
                          {ipdItems.map((l) => {
                            const isInHouse = l.source === 'IN_HOUSE_LAB';
                            return (
                              <tr key={l.id} className="hover:bg-[#F6F9FB]/50">
                                <td className="p-3 font-mono text-[11px] text-[#567781]">{l.dateOrdered}</td>
                                <td className="p-3 font-bold text-[#172B34]">{l.testName}</td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    isInHouse ? 'bg-sky-50 text-sky-800 border border-sky-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                                  }`}>
                                    {isInHouse ? 'In-House Lab' : 'Outside Diagnostic (₹0)'}
                                  </span>
                                </td>
                                <td className="p-3 text-[#567781]">{l.orderedBy}</td>
                                <td className="p-3">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                    {l.status}
                                  </span>
                                </td>
                                <td className="p-3 text-right font-mono font-bold text-[#172B34]">
                                  {isInHouse ? `₹${l.price}` : <span className="text-amber-700">Outside Test</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: PHARMACY & PRESCRIPTIONS (WITH OPD VS IPD SUB-TABS)                */}
        {/* ========================================================================= */}
        {activeTab === 'medications' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <h3 className="text-xs font-bold text-[#172B34] uppercase tracking-wider">
                  Medication Administration & Prescriptions
                </h3>
                <p className="text-[11px] text-[#567781]">
                  Track OPD consultation prescriptions alongside Inpatient ward medication administration logs.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* OPD vs IPD Sub-tabs */}
                <div className="flex items-center gap-1 bg-[#F6F9FB] p-1 rounded-xl border border-[#E8EEF2]">
                  <button
                    type="button"
                    onClick={() => setMedSubTab('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      medSubTab === 'ALL' ? 'bg-white text-[#172B34] shadow-xs' : 'text-[#567781] hover:text-[#172B34]'
                    }`}
                  >
                    All Medications
                  </button>
                  <button
                    type="button"
                    onClick={() => setMedSubTab('OPD')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      medSubTab === 'OPD' ? 'bg-[#087F8C] text-white shadow-xs' : 'text-[#567781] hover:text-[#172B34]'
                    }`}
                  >
                    OPD Rx & Purchases ({completedAppts.filter(a => Boolean(a.prescription)).length + patientPharmacySales.length})
                  </button>
                  {activeHospitalBed && (
                    <button
                      type="button"
                      onClick={() => setMedSubTab('IPD')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        medSubTab === 'IPD' ? 'bg-rose-700 text-white shadow-xs' : 'text-rose-700 hover:bg-rose-50'
                      }`}
                    >
                      IPD Ward Meds ({activeHospitalBed.inpatientMedications?.length || 0})
                    </button>
                  )}
                </div>

                {activeHospitalBed && (
                  <Button
                    size="sm"
                    onClick={() => setShowAddIpdMedModal(true)}
                    className="h-8 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl border-0 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Inpatient Med
                  </Button>
                )}
              </div>
            </div>

            {/* List of Medications */}
            <div className="space-y-4">
              {/* 1. OPD Prescriptions & Pharmacy Dispenses Section */}
              {(medSubTab === 'ALL' || medSubTab === 'OPD') && (
                <div className="space-y-4">
                  {/* 1A. DIRECT PHARMACY DISPENSED INVOICES & MEDICINES */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase">
                        <ShoppingCart className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Pharmacy Dispensed Invoices & Purchased Medicines ({patientPharmacySales.length})</span>
                      </div>
                      <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-bold">
                        Real-Time POS Sync ✓
                      </span>
                    </div>

                    {patientPharmacySales.length === 0 ? (
                      <div className="p-4 bg-white rounded-xl border border-[#E8EEF2] text-center text-xs text-[#567781]">
                        No direct pharmacy counter sales or OTC dispenses found for this patient.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {patientPharmacySales.map((sale) => (
                          <div key={sale.id} className="p-3 bg-white rounded-xl border border-[#E8EEF2] shadow-2xs hover:border-emerald-400 transition-all flex flex-col justify-between space-y-2">
                            <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-black bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded border border-emerald-200">
                                  {sale.invoiceNo}
                                </span>
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50/70 px-1.5 py-0.5 rounded border border-emerald-200/60">
                                  {sale.paymentMode || 'PAID'}
                                </span>
                              </div>
                              <span className="text-xs font-black text-emerald-800 font-mono">
                                ₹{sale.grandTotal}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-xs text-[#567781]">
                              <span>{sale.items?.length || 1} Item(s) Dispensed</span>
                              <span className="font-mono text-[11px]">{sale.dateTime}</span>
                            </div>

                            <div className="pt-1.5 border-t border-[#E8EEF2] flex items-center justify-between gap-2">
                              <span className="text-[10.5px] text-[#567781] truncate">
                                By: <strong className="text-[#172B34]">{sale.dispensedBy || 'Pharmacist'}</strong>
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setViewingPharmacySale(sale)}
                                  className="h-6.5 px-2.5 text-[11px] font-bold border-[#CBD5E1] bg-[#F6F9FB] text-[#087F8C] hover:bg-teal-50 rounded-lg cursor-pointer flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>View</span>
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedPrintPharmacySale(sale)}
                                  className="h-6.5 px-2 text-[11px] font-bold border-[#CBD5E1] text-[#567781] hover:text-[#172B34] rounded-lg cursor-pointer flex items-center gap-1"
                                >
                                  <Printer className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 1B. DOCTOR CONSULTATION PRESCRIPTIONS */}
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#087F8C] uppercase">
                      <Stethoscope className="w-3.5 h-3.5" />
                      <span>Doctor OPD Consultation Prescriptions ({completedAppts.filter(a => Boolean(a.prescription)).length})</span>
                    </div>

                    {completedAppts.filter(a => Boolean(a.prescription)).length === 0 ? (
                      <div className="p-4 bg-white rounded-xl border border-[#E8EEF2] text-center text-xs text-[#567781]">
                        No doctor consultation prescriptions recorded.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {completedAppts.filter(a => Boolean(a.prescription)).map((appt) => (
                          <div key={appt.id} className="p-3 bg-white rounded-xl border border-[#E8EEF2] shadow-2xs hover:border-[#087F8C]/50 transition-all flex flex-col justify-between space-y-2">
                            <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-1.5">
                              <strong className="text-xs text-[#172B34]">
                                Dr. {appt.doctorName || 'Attending Physician'}
                              </strong>
                              <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 font-mono">
                                OPD Rx
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-xs text-[#567781]">
                              <span>Symptoms: {appt.notes || 'Routine Consult'}</span>
                              <span className="font-mono text-[11px]">{formatDate(appt.appointmentDate)}</span>
                            </div>

                            <div className="pt-1.5 border-t border-[#E8EEF2] flex items-center justify-end gap-1.5">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setViewingApptPrescription(appt)}
                                className="h-6.5 px-3 text-[11px] font-bold border-[#CBD5E1] bg-[#F6F9FB] text-[#087F8C] hover:bg-teal-50 rounded-lg cursor-pointer flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                <span>View Prescription</span>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 2. IPD Inpatient Medication Chart Section */}
              {(medSubTab === 'ALL' || medSubTab === 'IPD') && activeHospitalBed && (
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900 uppercase">
                      <BedDouble className="w-4 h-4 text-rose-600" />
                      <span>Inpatient (IPD) Ward Medication Chart (Bed {activeHospitalBed.bedNumber})</span>
                    </div>

                    <span className="text-[11px] text-[#567781]">
                      Tracks Doctor Prescriber & Duty Nurse Administration
                    </span>
                  </div>

                  {(!activeHospitalBed.inpatientMedications || activeHospitalBed.inpatientMedications.length === 0) ? (
                    <div className="p-4 bg-rose-50/40 rounded-xl border border-rose-200 text-center text-xs text-rose-800">
                      No inpatient ward medications logged yet. Click <strong>+ Add Inpatient Med</strong> to add pharmacy or outside medicines.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activeHospitalBed.inpatientMedications.map((m) => {
                        const isQueued = m.status === 'QUEUED_PHARMACY';
                        const isAdministered = m.status === 'ADMINISTERED';
                        const totalItemsCount = (m.items && m.items.length > 0) ? m.items.length : 1;

                        return (
                          <div key={m.id} className="p-3 bg-white rounded-xl border border-[#E8EEF2] shadow-2xs hover:border-[#087F8C]/40 flex flex-col justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-1.5">
                                <span className="font-mono text-[10.5px] font-bold bg-slate-100 px-1.5 rounded">{m.indentNumber}</span>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isQueued ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-800'}`}>
                                  {isQueued ? '⏳ Pending' : '✓ Processed'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold">{totalItemsCount} Medication(s)</span>
                                <span className="font-mono text-[#087F8C]">₹{m.price || 0}</span>
                              </div>
                            </div>

                            <div className="pt-2 mt-2 border-t border-[#E8EEF2] flex gap-1.5">
                              <Button size="sm" variant="outline" onClick={() => setViewingPatientBedMedModal(m)} className="flex-1 h-7 text-[11px] font-bold rounded-lg border-[#E8EEF2] cursor-pointer">
                                <Eye className="w-3 h-3 text-[#087F8C] mr-1" />
                                View
                              </Button>
                              {!isAdministered && !isQueued && (
                                <button type="button" onClick={() => { setAdministerMedId(m.id); setShowAdministerModal(true); }} className="flex-1 h-7 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10.5px] rounded-lg cursor-pointer">Administer ✓</button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: COMPREHENSIVE BILLING LEDGER (2 TABS: UNPAID VS PAID)              */}
        {/* ========================================================================= */}
        {activeTab === 'billing' && (
          <div className="space-y-4">
            {/* Top Sub-Tab Navigation Strip & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E8EEF2] shadow-2xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBillingSubTab('UNPAID')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    billingSubTab === 'UNPAID'
                      ? 'bg-rose-50 text-rose-800 border border-rose-200 shadow-2xs'
                      : 'text-[#567781] hover:text-[#172B34] hover:bg-[#F6F9FB]'
                  }`}
                >
                  <span>⏳ Unpaid & Pending Dues</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-mono font-black ${
                    billingSummary.netOutstanding > 0 ? 'bg-rose-600 text-white' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    ₹{billingSummary.netOutstanding.toLocaleString('en-IN')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setBillingSubTab('PAID')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    billingSubTab === 'PAID'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs'
                      : 'text-[#567781] hover:text-[#172B34] hover:bg-[#F6F9FB]'
                  }`}
                >
                  <span>✅ Paid & Settled Services</span>
                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-mono font-black bg-emerald-600 text-white">
                    ₹{billingSummary.totalAdvancesPaid.toLocaleString('en-IN')}
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setShowPaymentModal(true)}
                  className="h-8 bg-[#087F8C] hover:bg-[#087F8C]/90 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>+ Record Payment</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowPrintInvoiceDoc(true)}
                  className="h-8 border-[#CBD5E1] text-[#172B34] hover:text-[#087F8C] font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-[#087F8C]" />
                  <span>Print Full Invoice</span>
                </Button>
              </div>
            </div>

            {/* 1. SUB-TAB: UNPAID / PENDING DUES */}
            {billingSubTab === 'UNPAID' && (
              <div className="space-y-4">
                {billingSummary.netOutstanding === 0 ? (
                  <div className="p-8 bg-emerald-50/70 rounded-2xl border border-emerald-200 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center mx-auto text-xl font-black">
                      ✓
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-emerald-900">All Hospital Dues Cleared & Settled</h4>
                      <p className="text-xs text-emerald-800 max-w-md mx-auto">
                        Zero pending balance. All inpatient bed rent, nursing care, doctor visits, and diagnostic procedures are 100% paid and cleared.
                      </p>
                    </div>
                    <div className="pt-2 flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowPrintInvoiceDoc(true)}
                        className="h-8 text-xs font-bold border-emerald-300 text-emerald-900 bg-white hover:bg-emerald-50 rounded-xl cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 mr-1" />
                        Print Settled Clearance Invoice
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Active Pending Alert Banner */}
                    <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                      <div>
                        <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">Total Outstanding to Settle</span>
                        <div className="text-2xl font-black text-rose-900 font-mono">
                          ₹{billingSummary.netOutstanding.toLocaleString('en-IN')}
                        </div>
                        <span className="text-xs text-rose-800">Pending balance across hospital stay & ongoing services</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setShowPaymentModal(true)}
                        className="h-9 px-4 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                      >
                        + Settle / Collect ₹{billingSummary.netOutstanding.toLocaleString('en-IN')} Now
                      </Button>
                    </div>

                    {/* Unpaid / Active Services Table */}
                    <div className="bg-white rounded-2xl border border-[#E8EEF2] overflow-hidden shadow-2xs">
                      <div className="p-3 bg-[#F6F9FB] border-b border-[#E8EEF2] flex items-center justify-between">
                        <span className="text-xs font-bold text-[#172B34] uppercase tracking-wider">
                          Active Incurred Services ({sortedBillingItems.length})
                        </span>
                        <span className="text-[11px] text-rose-800 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          Balance Due: ₹{billingSummary.netOutstanding.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#F6F9FB]/60 border-b border-[#E8EEF2] text-[#567781] font-bold text-[10.5px] uppercase">
                            <th className="p-3">Date</th>
                            <th className="p-3">Category</th>
                            <th className="p-3">Service Description</th>
                            <th className="p-3 text-right">Rate</th>
                            <th className="p-3 text-center">Qty</th>
                            <th className="p-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E8EEF2]">
                          {sortedBillingItems.map((item) => (
                            <tr key={item.id} className="hover:bg-[#F6F9FB]/50 transition-colors">
                              <td className="p-3 font-mono text-[11px] text-[#172B34] font-medium">
                                {formatClinicalDateTime(item.date)}
                              </td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                  {item.category}
                                </span>
                              </td>
                              <td className="p-3 font-medium text-[#172B34]">{item.description}</td>
                              <td className="p-3 text-right font-mono text-[#567781]">₹{item.unitPrice}</td>
                              <td className="p-3 text-center font-mono">{item.qty}</td>
                              <td className="p-3 text-right font-mono font-bold text-[#172B34]">₹{item.total.toLocaleString('en-IN')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. SUB-TAB: PAID & SETTLED SERVICES & RECEIPTS */}
            {billingSubTab === 'PAID' && (
              <div className="space-y-4">
                {/* Official Payment Receipts */}
                <div className="bg-white rounded-2xl border border-[#E8EEF2] overflow-hidden shadow-2xs space-y-0">
                  <div className="p-3 bg-[#F6F9FB] border-b border-[#E8EEF2] flex items-center justify-between">
                    <span className="text-xs font-bold text-[#172B34] uppercase tracking-wider">
                      Official Payment Receipts & Advance Deposits ({billingSummary.advanceList.length})
                    </span>
                    <span className="text-xs font-black text-emerald-800 font-mono bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Total Paid: ₹{billingSummary.totalAdvancesPaid.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {billingSummary.advanceList.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#567781]">
                      No advance receipts or payments recorded yet.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#F6F9FB]/60 border-b border-[#E8EEF2] text-[#567781] font-bold text-[10.5px] uppercase">
                          <th className="p-3">Receipt No</th>
                          <th className="p-3">Payment Date & Time</th>
                          <th className="p-3">Mode</th>
                          <th className="p-3">Notes & Details</th>
                          <th className="p-3 text-right">Amount Paid</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8EEF2]">
                        {billingSummary.advanceList.map((adv) => (
                          <tr key={adv.id} className="hover:bg-[#F6F9FB]/50">
                            <td className="p-3 font-mono font-bold text-[#087F8C]">{adv.receiptNumber}</td>
                            <td className="p-3 font-mono text-[11px] text-[#172B34] font-medium">
                              {formatClinicalDateTime(adv.datePaid)}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold text-[10px] border border-emerald-200">
                                {adv.paymentMode || 'UPI'}
                              </span>
                            </td>
                            <td className="p-3 text-[#567781]">{adv.notes || 'Payment Receipt'}</td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-700">₹{adv.amount.toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* All Cleared Hospital Services Breakdown */}
                <div className="bg-white rounded-2xl border border-[#E8EEF2] overflow-hidden shadow-2xs">
                  <div className="p-3 bg-[#F6F9FB] border-b border-[#E8EEF2] flex items-center justify-between">
                    <span className="text-xs font-bold text-[#172B34] uppercase tracking-wider">
                      Itemized Services Breakdown ({sortedBillingItems.length})
                    </span>
                    <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-[#E8EEF2]">
                      <button
                        type="button"
                        onClick={() => setEmrLedgerSortOrder('LAST_TO_FIRST')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                          emrLedgerSortOrder === 'LAST_TO_FIRST' ? 'bg-[#087F8C] text-white' : 'text-[#567781]'
                        }`}
                      >
                        ⬇️ Newest
                      </button>
                      <button
                        type="button"
                        onClick={() => setEmrLedgerSortOrder('FIRST_TO_LAST')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                          emrLedgerSortOrder === 'FIRST_TO_LAST' ? 'bg-[#172B34] text-white' : 'text-[#567781]'
                        }`}
                      >
                        ⬆️ Oldest
                      </button>
                    </div>
                  </div>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#F6F9FB]/60 border-b border-[#E8EEF2] text-[#567781] font-bold text-[10.5px] uppercase">
                        <th className="p-3">Date</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Service Description</th>
                        <th className="p-3 text-right">Rate</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8EEF2]">
                      {sortedBillingItems.map((item) => (
                        <tr key={item.id} className="hover:bg-[#F6F9FB]/50 transition-colors">
                          <td className="p-3 font-mono text-[11px] text-[#172B34] font-medium">
                            {formatClinicalDateTime(item.date)}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              {item.category}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-[#172B34]">{item.description}</td>
                          <td className="p-3 text-right font-mono text-[#567781]">₹{item.unitPrice}</td>
                          <td className="p-3 text-center font-mono">{item.qty}</td>
                          <td className="p-3 text-right font-mono font-bold text-[#172B34]">₹{item.total.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: DEMOGRAPHICS & PROFILE                                             */}
        {/* ========================================================================= */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-3.5 rounded-xl border border-[#E8EEF2] shadow-2xs">
              <div>
                <h3 className="text-xs font-bold text-[#172B34] uppercase tracking-wider">
                  Patient Master Demographics & Safety Profile
                </h3>
                <p className="text-[11px] text-[#567781]">
                  Manage patient identity, contact information, emergency contacts, and clinical alerts.
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleOpenEditDemographics}
                className="bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs rounded-lg h-8 px-4 border-0 cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Demographics</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-[#E8EEF2] p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-2">
                  <h4 className="text-xs font-bold text-[#172B34] uppercase tracking-wider">
                    Personal & Contact Information
                  </h4>
                  <button
                    type="button"
                    onClick={handleOpenEditDemographics}
                    className="text-[#087F8C] hover:underline text-xs font-bold flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-[#567781] block text-[11px]">Full Name</span><strong className="text-[#172B34] text-sm">{patient.name}</strong></div>
                  <div><span className="text-[#567781] block text-[11px]">Phone</span><strong className="text-[#172B34]">{patient.phone}</strong></div>
                  <div><span className="text-[#567781] block text-[11px]">Email</span><strong className="text-[#172B34]">{patient.email || 'None'}</strong></div>
                  <div><span className="text-[#567781] block text-[11px]">Age / Gender</span><strong className="text-[#172B34]">{calculateAge(patient.dateOfBirth)} / {patient.gender || 'UNSPECIFIED'}</strong></div>
                  <div><span className="text-[#567781] block text-[11px]">Date of Birth</span><strong className="text-[#172B34]">{patient.dateOfBirth || 'Not Recorded'}</strong></div>
                  <div><span className="text-[#567781] block text-[11px]">Blood Group</span><strong className="text-amber-800">{patient.bloodGroup || 'Not Tested'}</strong></div>
                  <div><span className="text-[#567781] block text-[11px]">Government ID / Aadhaar</span><strong className="text-[#172B34]">{patient.governmentId || 'None'}</strong></div>
                  <div><span className="text-[#567781] block text-[11px]">Address</span><strong className="text-[#172B34]">{patient.address ? `${patient.address}, ${patient.city || ''} ${patient.pincode || ''}` : 'Local'}</strong></div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-[#E8EEF2] p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-2">
                    <h4 className="text-xs font-bold text-[#172B34] uppercase tracking-wider">
                      Emergency Contact & Insurance
                    </h4>
                    <button
                      type="button"
                      onClick={handleOpenEditDemographics}
                      className="text-[#087F8C] hover:underline text-xs font-bold flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-[#567781] block text-[11px]">Emergency Contact</span><strong className="text-[#172B34]">{patient.emergencyContactName || 'None'}</strong></div>
                    <div><span className="text-[#567781] block text-[11px]">Emergency Phone</span><strong className="text-[#172B34]">{patient.emergencyContactPhone || 'None'}</strong></div>
                    <div><span className="text-[#567781] block text-[11px]">Insurance Provider</span><strong className="text-[#172B34]">{patient.insuranceProvider || 'Self-Pay / Cash'}</strong></div>
                    <div><span className="text-[#567781] block text-[11px]">Policy Number</span><strong className="text-[#172B34]">{patient.insurancePolicyNo || 'None'}</strong></div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-[#E8EEF2] p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-2">
                    <h4 className="text-xs font-bold text-[#172B34] uppercase tracking-wider">
                      Clinical Background & Safety Alerts
                    </h4>
                    <button
                      type="button"
                      onClick={handleOpenEditDemographics}
                      className="text-[#087F8C] hover:underline text-xs font-bold flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[#567781] block text-[11px]">Known Allergies</span>
                      <p className="text-rose-700 font-bold bg-rose-50 p-2 rounded border border-rose-200 mt-0.5">
                        {patient.allergies || 'No Known Drug Allergies (NKDA)'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#567781] block text-[11px]">Medical & Surgical History</span>
                      <p className="text-[#172B34] bg-[#F6F9FB] p-2 rounded border border-[#E8EEF2] mt-0.5">
                        {patient.medicalHistory || 'No past chronic illness recorded.'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#567781] block text-[11px]">Current Routine Medications</span>
                      <p className="text-[#172B34] bg-[#F6F9FB] p-2 rounded border border-[#E8EEF2] mt-0.5">
                        {patient.currentMedications || 'None'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 8: ALL CLINICAL & BILLING DOCUMENTS HUB                                */}
        {/* ========================================================================= */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-3.5 rounded-xl border border-[#E8EEF2] shadow-2xs">
              <div>
                <h3 className="text-xs font-bold text-[#172B34] uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#087F8C]" />
                  <span>Patient Medical Certificates & Official Documents</span>
                </h3>
                <p className="text-[11px] text-[#567781]">
                  Official clinical certifications, discharge dossier, take-home prescriptions, and verified tax invoices for {patient.name}.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/discharge-centre">
                  <Button size="sm" variant="outline" className="text-xs h-8 rounded-lg text-[#087F8C] border-[#087F8C]/30 hover:bg-[#087F8C]/10 font-bold">
                    Discharge Centre →
                  </Button>
                </Link>
              </div>
            </div>

            {/* Document Cards Grid (Clean Standardized UI, No Emojis) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {/* 1. Discharge Summary Document */}
              <div className="bg-white rounded-2xl border border-[#E8EEF2] p-4 shadow-2xs flex flex-col justify-between space-y-3 hover:border-[#087F8C]/40 transition-all">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-[#F6F9FB] border border-[#E8EEF2] text-[#087F8C] flex items-center justify-center font-bold">
                      <FileText className="w-4 h-4 text-[#087F8C]" />
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      activeHospitalBed?.dischargePlan ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-[#567781]'
                    }`}>
                      {activeHospitalBed?.dischargePlan ? 'Certified / Ready' : 'Inpatient Dossier'}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#172B34]">Discharge Summary</h4>
                    <p className="text-[11px] text-[#567781] mt-0.5">
                      Full hospital stay course, vitals, admitting vs final diagnosis, and dietary instructions.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E8EEF2] flex items-center justify-between">
                  <span className="text-[10.5px] text-[#567781]">Standard Clinical Doc</span>
                  <Button
                    size="sm"
                    onClick={() => setShowPrintDischargeDoc(true)}
                    className="h-7.5 bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs rounded-lg border-0 cursor-pointer shadow-2xs"
                  >
                    <Printer className="w-3 h-3 mr-1" />
                    Preview & Print
                  </Button>
                </div>
              </div>

              {/* 2. Take-Home / OPD Prescription Document */}
              <div className="bg-white rounded-2xl border border-[#E8EEF2] p-4 shadow-2xs flex flex-col justify-between space-y-3 hover:border-[#087F8C]/40 transition-all">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-[#F6F9FB] border border-[#E8EEF2] text-[#087F8C] flex items-center justify-center font-bold">
                      <Pill className="w-4 h-4 text-[#087F8C]" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-800">
                      Rx Medication Chart
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#172B34]">Prescription & Take-Home Rx</h4>
                    <p className="text-[11px] text-[#567781] mt-0.5">
                      Post-discharge medication schedule, dosages, meal timing (AC/PC), and warnings.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E8EEF2] flex items-center justify-between">
                  <span className="text-[10.5px] text-[#567781]">
                    {completedAppts.length > 0 ? `${completedAppts.length} OPD Rx` : 'Post-Stay Rx'}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (completedAppts.length > 0) {
                        setSelectedPrintAppt(completedAppts[0]);
                      } else {
                        setShowPrintDischargeDoc(true);
                      }
                    }}
                    className="h-7.5 bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs rounded-lg border-0 cursor-pointer shadow-2xs"
                  >
                    <Printer className="w-3 h-3 mr-1" />
                    Preview & Print
                  </Button>
                </div>
              </div>

              {/* 3. Medical & Fitness Certificate */}
              <div className="bg-white rounded-2xl border border-[#E8EEF2] p-4 shadow-2xs flex flex-col justify-between space-y-3 hover:border-[#087F8C]/40 transition-all">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-[#F6F9FB] border border-[#E8EEF2] text-[#087F8C] flex items-center justify-center font-bold">
                      <Stethoscope className="w-4 h-4 text-[#087F8C]" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-800">
                      Doctor Certified
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#172B34]">Medical / Fitness Certificate</h4>
                    <p className="text-[11px] text-[#567781] mt-0.5">
                      Doctor-certified rest & fitness certificate for employer, school, or insurer.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E8EEF2] flex items-center justify-between">
                  <span className="text-[10.5px] text-[#567781]">Official Form</span>
                  <Button
                    size="sm"
                    onClick={() => setShowPrintMedCertDoc(true)}
                    className="h-7.5 bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs rounded-lg border-0 cursor-pointer shadow-2xs"
                  >
                    <Printer className="w-3 h-3 mr-1" />
                    Preview & Print
                  </Button>
                </div>
              </div>

              {/* 4. Hospitalization Proof Certificate */}
              <div className="bg-white rounded-2xl border border-[#E8EEF2] p-4 shadow-2xs flex flex-col justify-between space-y-3 hover:border-[#087F8C]/40 transition-all">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-[#F6F9FB] border border-[#E8EEF2] text-[#087F8C] flex items-center justify-center font-bold">
                      <BedDouble className="w-4 h-4 text-[#087F8C]" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800">
                      Stay Verification
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#172B34]">Hospitalization Proof</h4>
                    <p className="text-[11px] text-[#567781] mt-0.5">
                      Formal proof of admission and discharge dates, ward details, and medical justification.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E8EEF2] flex items-center justify-between">
                  <span className="text-[10.5px] text-[#567781]">TPA / Insurance Claim</span>
                  <Button
                    size="sm"
                    onClick={() => setShowPrintHospCertDoc(true)}
                    className="h-7.5 bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs rounded-lg border-0 cursor-pointer shadow-2xs"
                  >
                    <Printer className="w-3 h-3 mr-1" />
                    Preview & Print
                  </Button>
                </div>
              </div>

              {/* 5. Inpatient / OPD Tax Invoice & Receipts */}
              <div className="bg-white rounded-2xl border border-[#E8EEF2] p-4 shadow-2xs flex flex-col justify-between space-y-3 hover:border-[#087F8C]/40 transition-all">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-[#F6F9FB] border border-[#E8EEF2] text-[#087F8C] flex items-center justify-center font-bold">
                      <Receipt className="w-4 h-4 text-[#087F8C]" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800">
                      Financial Tax Bill
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#172B34]">Tax Invoice & Ledger Receipts</h4>
                    <p className="text-[11px] text-[#567781] mt-0.5">
                      GST Tax invoice with itemized stay, medicines, laboratory diagnostics, and payment receipts.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E8EEF2] flex items-center justify-between">
                  <span className="text-[10.5px] font-mono font-bold text-emerald-700">₹{billingSummary.totalIncurred.toLocaleString('en-IN')}</span>
                  <Button
                    size="sm"
                    onClick={() => setShowPrintInvoiceDoc(true)}
                    className="h-7.5 bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs rounded-lg border-0 cursor-pointer shadow-2xs"
                  >
                    <Printer className="w-3 h-3 mr-1" />
                    Print Tax Invoice
                  </Button>
                </div>
              </div>

              {/* 6. Referral Memo Document */}
              <div className="bg-white rounded-2xl border border-[#E8EEF2] p-4 shadow-2xs flex flex-col justify-between space-y-3 hover:border-[#087F8C]/40 transition-all">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-[#F6F9FB] border border-[#E8EEF2] text-[#087F8C] flex items-center justify-center font-bold">
                      <Building className="w-4 h-4 text-[#087F8C]" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-800">
                      Higher Centre
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#172B34]">Medical Referral Memo</h4>
                    <p className="text-[11px] text-[#567781] mt-0.5">
                      Inter-hospital transfer note with urgent clinical findings, investigations, and physician handover.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E8EEF2] flex items-center justify-between">
                  <span className="text-[10.5px] text-[#567781]">Transfer / Referral</span>
                  <Button
                    size="sm"
                    onClick={() => setShowPrintReferralDoc(true)}
                    className="h-7.5 bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs rounded-lg border-0 cursor-pointer shadow-2xs"
                  >
                    <Printer className="w-3 h-3 mr-1" />
                    Preview & Print
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ORDER LAB INVESTIGATION                                          */}
      {/* ========================================================================= */}
      {showOrderLabModal && (
        <div className="fixed inset-0 bg-[#172B34]/50 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-[#E8EEF2] p-4 space-y-3">
            <div className="flex justify-between items-start border-b border-[#E8EEF2] pb-2">
              <div>
                <h3 className="text-sm font-bold text-[#172B34] flex items-center gap-1.5">
                  <FlaskConical className="w-4 h-4 text-amber-500" />
                  <span>Order Diagnostic Lab Test</span>
                </h3>
                <p className="text-[11px] text-[#567781]">Dispatches test request to lab & adds charge to bill</p>
              </div>
              <button
                type="button"
                onClick={() => setShowOrderLabModal(false)}
                className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleOrderLabTest} className="space-y-2.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[#172B34]">Select Test from Catalog *</label>
                <select
                  required
                  className="w-full h-8.5 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs font-medium cursor-pointer"
                  value={selectedCatalogLabId}
                  onChange={(e) => setSelectedCatalogLabId(e.target.value)}
                >
                  {HOSPITAL_LAB_CATALOG.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} — ₹{item.price} ({item.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-[#172B34]">Prescribing Doctor</label>
                  <select
                    className="w-full h-8 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs cursor-pointer"
                    value={labOrderDoctor}
                    onChange={(e) => setLabOrderDoctor(e.target.value)}
                  >
                    <option value="">-- Select Doctor --</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={`Dr. ${d.name}`}>
                        Dr. {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[#172B34]">Urgency</label>
                  <select
                    className="w-full h-8 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs cursor-pointer"
                    value={labOrderUrgency}
                    onChange={(e) => setLabOrderUrgency(e.target.value as any)}
                  >
                    <option value="ROUTINE">Routine Order</option>
                    <option value="STAT_EMERGENCY">STAT / Emergency</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#172B34]">Clinical Indication / Instructions</label>
                <input
                  type="text"
                  placeholder="e.g. Fever workup, Pre-op screening"
                  className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                  value={labOrderNotes}
                  onChange={(e) => setLabOrderNotes(e.target.value)}
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#E8EEF2]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOrderLabModal(false)}
                  className="h-8 text-xs rounded-lg cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[#087F8C] hover:bg-[#076b77] text-white text-xs font-semibold h-8 px-4 rounded-lg border-0 cursor-pointer shadow-xs"
                >
                  Dispatch Requisition
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD DOCTOR PROGRESS ROUND                                        */}
      {/* ========================================================================= */}
      {showAddRoundModal && (
        <div className="fixed inset-0 bg-[#172B34]/50 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-[#E8EEF2] p-4 space-y-3">
            <div className="flex justify-between items-start border-b border-[#E8EEF2] pb-2">
              <div>
                <h3 className="text-sm font-bold text-[#172B34] flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-[#087F8C]" />
                  <span>Daily Doctor Progress Round</span>
                </h3>
                <p className="text-[11px] text-[#567781]">Record vitals, progress notes, and update running bill</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddRoundModal(false)}
                className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddDoctorRound} className="space-y-2.5 text-xs">
              <div className="grid grid-cols-5 gap-1.5">
                <div>
                  <label className="font-semibold text-[#172B34] text-[10px]">Temp (°F)</label>
                  <input
                    type="text"
                    className="w-full h-7 px-1.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded text-xs text-center font-mono"
                    value={roundTemp}
                    onChange={(e) => setRoundTemp(e.target.value)}
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#172B34] text-[10px]">BP (mmHg)</label>
                  <input
                    type="text"
                    className="w-full h-7 px-1.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded text-xs text-center font-mono"
                    value={roundBp}
                    onChange={(e) => setRoundBp(e.target.value)}
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#172B34] text-[10px]">Pulse (bpm)</label>
                  <input
                    type="text"
                    className="w-full h-7 px-1.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded text-xs text-center font-mono"
                    value={roundPulse}
                    onChange={(e) => setRoundPulse(e.target.value)}
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#172B34] text-[10px]">SpO₂ (%)</label>
                  <input
                    type="text"
                    className="w-full h-7 px-1.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded text-xs text-center font-mono text-[#087F8C] font-bold"
                    value={roundSpo2}
                    onChange={(e) => setRoundSpo2(e.target.value)}
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#172B34] text-[10px]">Resp Rate</label>
                  <input
                    type="text"
                    className="w-full h-7 px-1.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded text-xs text-center font-mono"
                    value={roundRespRate}
                    onChange={(e) => setRoundRespRate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#172B34]">Examining Doctor</label>
                <select
                  className="w-full h-8 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs cursor-pointer"
                  value={roundDoctorName}
                  onChange={(e) => setRoundDoctorName(e.target.value)}
                >
                  <option value="">{activeHospitalBed?.consultantDoctorName || '-- Choose Doctor --'}</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={`Dr. ${d.name}`}>Dr. {d.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#172B34]">Clinical Progress & Observations *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Patient afebrile, chest clear, vitals stable..."
                  className="w-full p-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                  value={roundNotes}
                  onChange={(e) => setRoundNotes(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#172B34]">Treatment / Medication Orders</label>
                <input
                  type="text"
                  placeholder="e.g. Continue IV Antibiotics, switch to oral..."
                  className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                  value={roundTreatment}
                  onChange={(e) => setRoundTreatment(e.target.value)}
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#E8EEF2]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddRoundModal(false)}
                  className="h-8 text-xs rounded-lg cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[#087F8C] hover:bg-[#076b77] text-white text-xs font-semibold h-8 px-4 rounded-lg border-0 cursor-pointer shadow-xs"
                >
                  Save Progress Round
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: RECORD ADVANCE / SETTLEMENT PAYMENT                              */}
      {/* ========================================================================= */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-[#172B34]/50 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-xl border border-[#E8EEF2] p-4 space-y-3">
            <div className="flex justify-between items-start border-b border-[#E8EEF2] pb-2">
              <div>
                <h3 className="text-sm font-bold text-[#172B34] flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>Record Payment Receipt</span>
                </h3>
                <p className="text-[11px] text-[#567781]">Issue receipt & credit patient inpatient ledger</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-2.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[#172B34]">Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-sm font-mono font-bold text-emerald-700"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#172B34]">Payment Mode</label>
                <select
                  className="w-full h-8 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs cursor-pointer font-medium"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                >
                  <option value="UPI">UPI / QR Code</option>
                  <option value="CASH">Cash Deposit</option>
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="INSURANCE_TPA">Insurance / TPA Approval</option>
                  <option value="BANK_TRANSFER">Direct Bank Transfer (NEFT)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#172B34]">Payment Notes / Reference</label>
                <input
                  type="text"
                  placeholder="e.g. Admission deposit, UPI txn id"
                  className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#E8EEF2]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPaymentModal(false)}
                  className="h-8 text-xs rounded-lg cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-8 px-4 rounded-lg border-0 cursor-pointer shadow-xs"
                >
                  Issue Receipt
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: 1-CLICK DISCHARGE & SETTLEMENT CONFIRMATION                      */}
      {/* ========================================================================= */}
      {showDischargeModal && activeHospitalBed && (
        <div className="fixed inset-0 bg-[#172B34]/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-[#E8EEF2] p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-[#E8EEF2] pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#172B34] flex items-center gap-2">
                  <Hospital className="w-5 h-5 text-rose-600" />
                  <span>Patient Discharge Clearance & Settlement</span>
                </h3>
                <p className="text-xs text-[#567781]">
                  Vacate Bed {activeHospitalBed.bedNumber} ({activeHospitalBed.wardName}) and generate clinical summary.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDischargeModal(false)}
                className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Financial Settlement Verification */}
            <div className="p-3.5 bg-gradient-to-r from-[#F6F9FB] to-white rounded-xl border border-[#E8EEF2] space-y-2">
              <span className="text-[10px] font-bold text-[#567781] uppercase block">Settlement Summary</span>
              <div className="flex justify-between items-center text-xs">
                <span>Total Incurred Charges:</span>
                <strong className="font-mono text-[#172B34]">₹{billingSummary.totalIncurred.toLocaleString('en-IN')}</strong>
              </div>
              <div className="flex justify-between items-center text-xs text-emerald-700">
                <span>Advance Deposits Paid:</span>
                <strong className="font-mono">₹{billingSummary.totalAdvancesPaid.toLocaleString('en-IN')}</strong>
              </div>
              <div className="flex justify-between items-center text-sm font-bold pt-1.5 border-t border-[#E8EEF2]">
                <span className="text-rose-900">Final Outstanding Due:</span>
                <span className="font-mono text-rose-700">₹{billingSummary.netOutstanding.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-[#172B34]">Discharge Type</label>
                  <select
                    className="w-full h-8 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs cursor-pointer font-medium"
                    value={dischargeType}
                    onChange={(e) => setDischargeType(e.target.value as any)}
                  >
                    <option value="NORMAL">Normal Medical Discharge</option>
                    <option value="DAYCARE">Daycare Procedure Discharge</option>
                    <option value="LAMA">LAMA (Against Medical Advice)</option>
                    <option value="TRANSFER">Transfer to Tertiary Center</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[#172B34]">Follow-up Advice</label>
                  <input
                    type="text"
                    className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                    value={dischargeFollowUp}
                    onChange={(e) => setDischargeFollowUp(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#172B34]">Hospital Course & Clinical Summary</label>
                <textarea
                  rows={2}
                  className="w-full p-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                  value={dischargeCourse}
                  onChange={(e) => setDischargeCourse(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#172B34]">Home Care & Dietary Advice</label>
                <input
                  type="text"
                  className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                  value={dischargeAdvice}
                  onChange={(e) => setDischargeAdvice(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between border-t border-[#E8EEF2]">
              <span className="text-[11px] text-[#567781]">
                Bed will be set to <strong>Cleaning Ready</strong>.
              </span>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDischargeModal(false)}
                  className="h-8 text-xs rounded-lg cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isDischarging}
                  onClick={handleConfirmDischarge}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-8 px-4 rounded-lg border-0 cursor-pointer shadow-xs"
                >
                  {isDischarging ? 'Processing...' : 'Confirm Discharge & Vacate Bed'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: PRINT PREVIEW: CLINICAL DISCHARGE SUMMARY                        */}
      {/* ========================================================================= */}
      {showPrintDischargeDoc && (
        <div className="fixed inset-0 bg-[#172B34]/70 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-[#E8EEF2] p-5 space-y-4 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#E8EEF2] pb-3 no-print">
              <h3 className="text-sm font-bold text-[#172B34]">Official Discharge Summary Document</h3>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs rounded-lg h-7.5 px-3 border-0 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  Print Discharge Summary
                </Button>
                <button
                  type="button"
                  onClick={() => setShowPrintDischargeDoc(false)}
                  className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <DischargeSummaryPrintDocument
              clinic={clinic}
              doctor={doctors[0]}
              patient={patient}
              admissionDetails={{
                uhid: `UHID-${patient.id?.substring(0, 8).toUpperCase() || '2026'}`,
                ipdNumber: activeHospitalBed?.ipdNumber || 'IPD-2026-9042',
                admissionDateTime: `${activeHospitalBed?.admissionDate || '2026-08-28'} ${activeHospitalBed?.admissionTime || '10:00 AM'}`,
                dischargeDateTime: `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                roomWardBed: activeHospitalBed ? `${activeHospitalBed.wardName} (Bed ${activeHospitalBed.bedNumber})` : 'General Ward',
                dischargeType: dischargeType,
                conditionAtDischarge: dischargeCondition || 'Hemodynamically stable, afebrile, ambulatory.',
                finalDiagnosis: dischargeDiagnosis || activeHospitalBed?.admittingDiagnosis || 'Inpatient Clinical Care',
                hospitalCourseAndProcedures: dischargeCourse,
                dietAndActivityAdvice: dischargeAdvice,
                followUpDate: dischargeFollowUp,
                emergencyWarningSigns: dischargeEmergencySigns,
                dischargeMedications: (dischargeTakeHomeMeds || []).map((m) => ({
                  name: m.name,
                  dosage: m.dosage,
                  frequency: m.frequency,
                  duration: m.duration,
                  instructions: `${m.timing ? `${m.timing}. ` : ''}${m.instructions || ''}`
                }))
              }}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: PRINT PREVIEW: FORMAL INVOICE & RECEIPT                          */}
      {/* ========================================================================= */}
      {showPrintInvoiceDoc && (
        <div className="fixed inset-0 bg-[#172B34]/70 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-[#E8EEF2] p-5 space-y-4 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#E8EEF2] pb-3 no-print">
              <h3 className="text-sm font-bold text-[#172B34]">Official Inpatient Tax Invoice & Receipt</h3>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs rounded-lg h-7.5 px-3 border-0 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  Print Invoice
                </Button>
                <button
                  type="button"
                  onClick={() => setShowPrintInvoiceDoc(false)}
                  className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {(() => {
              const fin = calculateBedStayFinancials(activeHospitalBed);
              return (
                <InvoicePrintDocument
                  clinic={clinic}
                  doctor={doctors[0]}
                  patient={patient}
                  invoiceNumber={`INV-IPD-${activeHospitalBed?.bedNumber || 'B01'}-${Math.floor(1000 + Math.random() * 9000)}`}
                  invoiceDate={new Date().toISOString().split('T')[0]}
                  items={[
                    {
                      description: `${activeHospitalBed?.wardName || 'General Ward'} Stay (${fin.stayDays} Days)`,
                      quantity: fin.stayDays,
                      rate: fin.dailyRate,
                      total: fin.roomCharges
                    },
                    ...(activeHospitalBed?.billingCharges || []).map((c) => ({
                      description: c.serviceName,
                      quantity: c.quantity,
                      rate: c.unitPrice,
                      total: c.totalAmount
                    }))
                  ]}
                />
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: MEDICAL FITNESS / SICKNESS CERTIFICATE PRINT PREVIEW             */}
      {/* ========================================================================= */}
      {showPrintMedCertDoc && (
        <div className="fixed inset-0 bg-[#172B34]/70 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-[#E8EEF2] p-5 space-y-4 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#E8EEF2] pb-3 no-print">
              <h3 className="text-sm font-bold text-[#172B34]">Official Medical Fitness & Sickness Leave Certificate</h3>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg h-7.5 px-3 border-0 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  Print Certificate
                </Button>
                <button
                  type="button"
                  onClick={() => setShowPrintMedCertDoc(false)}
                  className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <MedicalCertificatePrintDocument
              clinic={clinic}
              doctor={doctors[0]}
              patient={patient}
              certificateDetails={{
                certificateNumber: `MC-${activeHospitalBed?.bedNumber || 'B01'}-${Math.floor(1000 + Math.random() * 9000)}`,
                certificateDate: new Date().toISOString().split('T')[0],
                certificateType: 'BOTH',
                diagnosis: dischargeDiagnosis || activeHospitalBed?.admittingDiagnosis || 'Acute Inpatient Illness',
                restStartDate: activeHospitalBed?.admissionDate || '2026-08-28',
                restEndDate: new Date().toISOString().split('T')[0],
                fitToResumeDate: new Date().toISOString().split('T')[0],
                remarks: 'Advised light routine duties for 3 days post resumption.',
                consultantDoctorName: activeHospitalBed?.consultantDoctorName || doctors[0]?.name,
                consultantRegistrationNo: doctors[0]?.registrationNumber
              }}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 8: HOSPITALIZATION STAY PROOF CERTIFICATE PRINT PREVIEW             */}
      {/* ========================================================================= */}
      {showPrintHospCertDoc && (
        <div className="fixed inset-0 bg-[#172B34]/70 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-[#E8EEF2] p-5 space-y-4 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#E8EEF2] pb-3 no-print">
              <h3 className="text-sm font-bold text-[#172B34]">Official Certificate of Inpatient Hospitalization</h3>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg h-7.5 px-3 border-0 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  Print Stay Certificate
                </Button>
                <button
                  type="button"
                  onClick={() => setShowPrintHospCertDoc(false)}
                  className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <HospitalizationCertificatePrintDocument
              clinic={clinic}
              doctor={doctors[0]}
              patient={patient}
              stayDetails={{
                certificateNumber: `HOSP-${activeHospitalBed?.bedNumber || 'B01'}-${Math.floor(1000 + Math.random() * 9000)}`,
                certificateDate: new Date().toISOString().split('T')[0],
                ipdNumber: activeHospitalBed?.ipdNumber || 'IPD-2026-9042',
                uhid: `UHID-${patient.id?.substring(0, 8).toUpperCase() || '2026'}`,
                admissionDateTime: `${activeHospitalBed?.admissionDate || 'Today'} ${activeHospitalBed?.admissionTime || '10:00 AM'}`,
                dischargeDateTime: `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                wardRoomBed: `${activeHospitalBed?.wardName || 'Ward'} (${activeHospitalBed?.bedNumber || 'B01'})`,
                treatingDoctor: activeHospitalBed?.consultantDoctorName || doctors[0]?.name || 'Dr. Patil, MD',
                diagnosis: dischargeDiagnosis || activeHospitalBed?.admittingDiagnosis || 'Inpatient Clinical Care',
                purpose: 'Mediclaim / Health Insurance Reimbursement & Official Employer Record'
              }}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DISCHARGE SETTLEMENT MODAL                                                */}
      {/* ========================================================================= */}
      {showDischargeModal && (
        <div className="fixed inset-0 bg-[#172B34]/50 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-[#E8EEF2] p-4 space-y-3">
            <div className="flex justify-between items-start border-b border-[#E8EEF2] pb-2">
              <div>
                <h3 className="text-sm font-bold text-rose-900 flex items-center gap-1.5">
                  <LogOut className="w-4 h-4 text-rose-600" />
                  <span>Discharge Patient & Settlement</span>
                </h3>
                <p className="text-[11px] text-[#567781]">Generate discharge summary, settle bill & release bed</p>
              </div>
              <button
                type="button"
                onClick={() => setShowDischargeModal(false)}
                className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Financial Settlement Verification */}
            <div className="p-3.5 bg-gradient-to-r from-[#F6F9FB] to-white rounded-xl border border-[#E8EEF2] space-y-2">
              <span className="text-[10px] font-bold text-[#567781] uppercase block">Settlement Summary</span>
              <div className="flex justify-between items-center text-xs">
                <span>Total Incurred Charges:</span>
                <strong className="font-mono text-[#172B34]">₹{billingSummary.totalIncurred.toLocaleString('en-IN')}</strong>
              </div>
              <div className="flex justify-between items-center text-xs text-emerald-700">
                <span>Advance Deposits Paid:</span>
                <strong className="font-mono">₹{billingSummary.totalAdvancesPaid.toLocaleString('en-IN')}</strong>
              </div>
              <div className="flex justify-between items-center text-sm font-bold pt-1.5 border-t border-[#E8EEF2]">
                <span className="text-rose-900">Final Outstanding Due:</span>
                <span className="font-mono text-rose-700">₹{billingSummary.netOutstanding.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-[#172B34]">Discharge Classification</label>
                  <select
                    className="w-full h-8 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs cursor-pointer font-medium"
                    value={dischargeType}
                    onChange={(e) => setDischargeType(e.target.value as any)}
                  >
                    <option value="REGULAR">Regular Discharge (Recovered / Improved)</option>
                    <option value="DOR">Discharge on Request (DOR)</option>
                    <option value="LAMA">Left Against Medical Advice (LAMA)</option>
                    <option value="TRANSFER">Transfer to Higher Medical Center</option>
                    <option value="EXPIRED">Deceased / Expired</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[#172B34]">Follow-up Advice</label>
                  <input
                    type="text"
                    className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                    value={dischargeFollowUp}
                    onChange={(e) => setDischargeFollowUp(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-[#172B34]">Final Confirmed Diagnosis</label>
                  <input
                    type="text"
                    className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs font-medium"
                    value={dischargeDiagnosis || activeHospitalBed?.admittingDiagnosis || ''}
                    onChange={(e) => setDischargeDiagnosis(e.target.value)}
                    placeholder="e.g. Acute Appendicitis - Post-Op"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#172B34]">Condition at Departure</label>
                  <input
                    type="text"
                    className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                    value={dischargeCondition}
                    onChange={(e) => setDischargeCondition(e.target.value)}
                    placeholder="e.g. Hemodynamically stable, afebrile"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#172B34]">Hospital Course & Clinical Summary</label>
                <textarea
                  rows={2}
                  className="w-full p-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                  value={dischargeCourse}
                  onChange={(e) => setDischargeCourse(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#172B34]">Home Care & Dietary Advice</label>
                <input
                  type="text"
                  className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                  value={dischargeAdvice}
                  onChange={(e) => setDischargeAdvice(e.target.value)}
                />
              </div>

              {/* Take-Home Medications Section */}
              <div className="p-3 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#172B34] text-[11px] flex items-center gap-1">
                    <Pill className="w-3.5 h-3.5 text-[#087F8C]" />
                    <span>Take-Home Prescription ({dischargeTakeHomeMeds.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setDischargeTakeHomeMeds(prev => [
                      ...prev,
                      { id: `thm-${Date.now()}`, name: '', dosage: '1 Tab', frequency: '1-0-1 (Twice daily)', duration: '5 Days', timing: 'After food', instructions: '' }
                    ])}
                    className="text-[11px] font-bold text-[#087F8C] hover:underline cursor-pointer"
                  >
                    + Add Medicine
                  </button>
                </div>

                <div className="space-y-1.5">
                  {dischargeTakeHomeMeds.map((med, idx) => (
                    <div key={med.id} className="p-1.5 bg-white rounded border border-[#E8EEF2] grid grid-cols-12 gap-1.5 items-center text-xs">
                      <input
                        type="text"
                        placeholder="Medicine name"
                        value={med.name}
                        onChange={(e) => setDischargeTakeHomeMeds(prev => prev.map(m => m.id === med.id ? { ...m, name: e.target.value } : m))}
                        className="col-span-5 h-7 px-1.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded text-xs font-semibold"
                      />
                      <input
                        type="text"
                        placeholder="Dose"
                        value={med.dosage}
                        onChange={(e) => setDischargeTakeHomeMeds(prev => prev.map(m => m.id === med.id ? { ...m, dosage: e.target.value } : m))}
                        className="col-span-2 h-7 px-1 bg-[#F6F9FB] border border-[#E8EEF2] rounded text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Freq (1-0-1)"
                        value={med.frequency}
                        onChange={(e) => setDischargeTakeHomeMeds(prev => prev.map(m => m.id === med.id ? { ...m, frequency: e.target.value } : m))}
                        className="col-span-2 h-7 px-1 bg-[#F6F9FB] border border-[#E8EEF2] rounded text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Duration"
                        value={med.duration}
                        onChange={(e) => setDischargeTakeHomeMeds(prev => prev.map(m => m.id === med.id ? { ...m, duration: e.target.value } : m))}
                        className="col-span-2 h-7 px-1 bg-[#F6F9FB] border border-[#E8EEF2] rounded text-xs text-center"
                      />
                      <button
                        type="button"
                        onClick={() => setDischargeTakeHomeMeds(prev => prev.filter(m => m.id !== med.id))}
                        className="col-span-1 text-rose-500 hover:text-rose-700 text-center cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between border-t border-[#E8EEF2]">
              <span className="text-[11px] text-[#567781]">
                Bed will transition to <strong>🧹 Sanitization (Cleaning)</strong>.
              </span>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDischargeModal(false)}
                  className="h-8 text-xs rounded-lg cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isDischarging}
                  onClick={handleConfirmDischarge}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-4 rounded-lg border-0 cursor-pointer shadow-xs"
                >
                  {isDischarging ? 'Processing...' : 'Confirm Clearance & Settle ✓'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: PRINT PREVIEW: CLINICAL DISCHARGE SUMMARY                        */}
      {/* ========================================================================= */}
      {showPrintDischargeDoc && (
        <div className="fixed inset-0 bg-[#172B34]/70 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-[#E8EEF2] p-5 space-y-4 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#E8EEF2] pb-3 no-print">
              <h3 className="text-sm font-bold text-[#172B34]">Official Discharge Summary Document</h3>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs rounded-lg h-7.5 px-3 border-0 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  Print Discharge Summary
                </Button>
                <button
                  type="button"
                  onClick={() => setShowPrintDischargeDoc(false)}
                  className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <DischargeSummaryPrintDocument
              clinic={clinic}
              doctor={doctors[0]}
              patient={patient}
              admissionDetails={{
                uhid: `UHID-${patient.id?.substring(0, 8).toUpperCase() || '2026'}`,
                ipdNumber: activeHospitalBed?.ipdNumber || 'IPD-2026-9042',
                admissionDateTime: activeHospitalBed?.admissionDate || '2026-08-28',
                dischargeDateTime: new Date().toISOString().split('T')[0],
                roomWardBed: activeHospitalBed ? `${activeHospitalBed.wardName} (${activeHospitalBed.bedNumber})` : 'General Ward',
                dischargeType: dischargeType,
                finalDiagnosis: activeHospitalBed?.admittingDiagnosis || 'Clinical Inpatient Observation',
                hospitalCourseAndProcedures: dischargeCourse,
                dietAndActivityAdvice: dischargeAdvice,
                followUpDate: dischargeFollowUp
              }}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: PRINT PREVIEW: FORMAL INVOICE & RECEIPT                          */}
      {/* ========================================================================= */}
      {showPrintInvoiceDoc && (
        <div className="fixed inset-0 bg-[#172B34]/70 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-[#E8EEF2] p-5 space-y-4 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#E8EEF2] pb-3 no-print">
              <h3 className="text-sm font-bold text-[#172B34]">Official Itemized Tax Invoice</h3>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs rounded-lg h-7.5 px-3 border-0 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  Print Invoice
                </Button>
                <button
                  type="button"
                  onClick={() => setShowPrintInvoiceDoc(false)}
                  className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <InvoicePrintDocument
              clinic={clinic}
              doctor={doctors[0]}
              patient={patient}
              invoiceNumber={`INV-2026-${Math.floor(1000 + Math.random() * 9000)}`}
              invoiceDate={new Date().toISOString().split('T')[0]}
              items={billingSummary.items.map((i) => ({
                description: i.description,
                rate: i.unitPrice,
                quantity: i.qty,
                total: i.total
              }))}
              subtotal={billingSummary.totalIncurred}
              grandTotal={billingSummary.totalIncurred}
              paymentStatus={billingSummary.netOutstanding <= 0 ? 'PAID' : 'PARTIAL'}
              notes="Thank you for trusting us with your care. Wish you a speedy recovery."
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6B: PRINT PREVIEW: MEDICAL / FITNESS CERTIFICATE                    */}
      {/* ========================================================================= */}
      {showPrintMedCertDoc && (
        <div className="fixed inset-0 bg-[#172B34]/70 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-[#E8EEF2] p-5 space-y-4 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#E8EEF2] pb-3 no-print">
              <h3 className="text-sm font-bold text-[#172B34]">Official Medical & Fitness Certificate</h3>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-lg h-7.5 px-3 border-0 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  Print Certificate
                </Button>
                <button
                  type="button"
                  onClick={() => setShowPrintMedCertDoc(false)}
                  className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <MedicalCertificatePrintDocument
              clinic={clinic}
              doctor={doctors[0]}
              patient={patient}
              certificateDetails={{
                certificateNumber: `MC-${Date.now().toString().slice(-6)}`,
                certificateDate: new Date().toISOString().split('T')[0],
                certificateType: 'BOTH',
                diagnosis: activeHospitalBed?.admittingDiagnosis || 'Acute Clinical Condition - Under Care',
                restStartDate: activeHospitalBed?.admissionDate || new Date().toISOString().split('T')[0],
                restEndDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                totalDaysRest: 5,
                fitToResumeDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                remarks: 'Patient responded well to clinical management and is fit to resume normal duties.',
                consultantDoctorName: activeHospitalBed?.consultantDoctorName || (doctors[0]?.name ? `Dr. ${doctors[0].name}` : 'Attending Physician')
              }}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6C: PRINT PREVIEW: HOSPITALIZATION PROOF CERTIFICATE                */}
      {/* ========================================================================= */}
      {showPrintHospCertDoc && (
        <div className="fixed inset-0 bg-[#172B34]/70 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-[#E8EEF2] p-5 space-y-4 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#E8EEF2] pb-3 no-print">
              <h3 className="text-sm font-bold text-[#172B34]">Official Hospitalization Proof Certificate</h3>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg h-7.5 px-3 border-0 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  Print Certificate
                </Button>
                <button
                  type="button"
                  onClick={() => setShowPrintHospCertDoc(false)}
                  className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <HospitalizationCertificatePrintDocument
              clinic={clinic}
              doctor={doctors[0]}
              patient={patient}
              stayDetails={{
                certificateNumber: `HOSP-${Date.now().toString().slice(-6)}`,
                certificateDate: new Date().toISOString().split('T')[0],
                ipdNumber: activeHospitalBed?.ipdNumber || 'IPD-2026-8921',
                uhid: `UHID-${patient.id?.substring(0, 8).toUpperCase() || '2026'}`,
                admissionDateTime: activeHospitalBed?.admissionDate || new Date().toISOString().split('T')[0],
                dischargeDateTime: new Date().toISOString().split('T')[0],
                wardRoomBed: activeHospitalBed ? `${activeHospitalBed.wardName} (Bed ${activeHospitalBed.bedNumber})` : 'General Ward (Bed 101)',
                treatingDoctor: activeHospitalBed?.consultantDoctorName || (doctors[0]?.name ? `Dr. ${doctors[0].name}` : 'Attending Physician'),
                diagnosis: activeHospitalBed?.admittingDiagnosis || 'Clinical Inpatient Care',
                purpose: 'Insurance Claim & Medical Leave Verification',
                remarks: 'Patient received complete active inpatient management during stay.'
              }}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6D: PRINT PREVIEW: MEDICAL REFERRAL MEMO                            */}
      {/* ========================================================================= */}
      {showPrintReferralDoc && (
        <div className="fixed inset-0 bg-[#172B34]/70 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-[#E8EEF2] p-5 space-y-4 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#E8EEF2] pb-3 no-print">
              <h3 className="text-sm font-bold text-[#172B34]">Official Medical Referral Memo</h3>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg h-7.5 px-3 border-0 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  Print Referral Memo
                </Button>
                <button
                  type="button"
                  onClick={() => setShowPrintReferralDoc(false)}
                  className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <ReferralMemoPrintDocument
              clinic={clinic}
              doctor={doctors[0]}
              patient={patient}
              referralDetails={{
                memoNumber: `REF-${Date.now().toString().slice(-6)}`,
                memoDate: new Date().toISOString().split('T')[0],
                destinationHospital: 'Tertiary Care Apex Super-Specialty Hospital',
                destinationDepartment: 'Cardiology / Critical Care ICU',
                reasonForReferral: 'Higher tier tertiary investigation, advanced intervention & ICU observation.',
                provisionalDiagnosis: activeHospitalBed?.admittingDiagnosis || 'Acute Clinical Condition',
                clinicalSummaryAndInterventions: 'Initial emergency stabilization given. IV access secured. Vitals monitored.',
                currentVitalsAtTransfer: 'BP: 120/80 mmHg, Pulse: 78 bpm, SpO2: 98% on room air',
                accompanyingStaff: 'Staff Nurse & BLS Emergency EMT',
                transportMode: 'Advanced Life Support (ALS) Ambulance',
                referringDoctorName: activeHospitalBed?.consultantDoctorName || (doctors[0]?.name ? `Dr. ${doctors[0].name}` : 'Attending Physician')
              }}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: LOG NURSE MEDICATION ADMINISTRATION                              */}
      {/* ========================================================================= */}
      {showAdministerModal && (
        <div className="fixed inset-0 bg-[#172B34]/50 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-[#E8EEF2] p-4 space-y-3">
            <div className="flex justify-between items-start border-b border-[#E8EEF2] pb-2">
              <div>
                <h3 className="text-sm font-bold text-[#172B34] flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-purple-600" />
                  <span>Log Medicine Administration</span>
                </h3>
                <p className="text-[11px] text-[#567781]">Record nurse name & administration timestamp</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdministerModal(false)}
                className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLogMedAdministration} className="space-y-2.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[#172B34]">Administering Nurse / Staff Name *</label>
                <input
                  type="text"
                  required
                  value={administerNurseName}
                  onChange={(e) => setAdministerNurseName(e.target.value)}
                  className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#172B34]">Administration Notes / Observations</label>
                <input
                  type="text"
                  value={administerNotes}
                  onChange={(e) => setAdministerNotes(e.target.value)}
                  className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#E8EEF2]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdministerModal(false)}
                  className="h-8 text-xs rounded-lg cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-8 px-4 rounded-lg border-0 cursor-pointer shadow-xs"
                >
                  Mark Given ✓
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 8: PATIENT PROFILE REQUISITION DETAILS                              */}
      {/* ========================================================================= */}
      {viewingPatientBedMedModal && activeHospitalBed && (
        <div className="fixed inset-0 bg-[#172B34]/70 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-[#E8EEF2] p-5 space-y-4 max-h-[85vh] flex flex-col justify-between overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-[#E8EEF2] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded border border-rose-200">
                    Bed {activeHospitalBed.bedNumber}
                  </span>
                  <strong className="text-sm font-bold text-[#172B34]">{patient?.name || 'Inpatient'}</strong>
                  <span className="font-mono text-xs font-bold bg-slate-100 text-[#172B34] px-2 py-0.5 rounded border border-[#E8EEF2]">
                    {viewingPatientBedMedModal.indentNumber || 'IND-REQ'}
                  </span>
                </div>
                <p className="text-xs text-[#567781] mt-0.5">
                  {activeHospitalBed.wardName} • Ordered: {viewingPatientBedMedModal.dateOrdered}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewingPatientBedMedModal(null)}
                className="text-[#567781] hover:text-[#172B34] p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="space-y-3 overflow-y-auto pr-1">
              <div className="bg-[#F6F9FB] p-2.5 rounded-xl border border-[#E8EEF2] flex items-center justify-between text-xs flex-wrap gap-2">
                <div>
                  <span className="text-[#567781]">Prescriber: </span>
                  <strong className="text-[#172B34]">{viewingPatientBedMedModal.prescribedBy || 'Attending Doctor'}</strong>
                </div>
                {viewingPatientBedMedModal.requestedByNurse && (
                  <div>
                    <span className="text-[#567781]">Duty Nurse: </span>
                    <strong className="text-[#087F8C]">{viewingPatientBedMedModal.requestedByNurse}</strong>
                  </div>
                )}
              </div>

              {/* Out of Stock Outside Alert in Patient File */}
              {(viewingPatientBedMedModal.items?.some(it => it.source === 'OUTSIDE_PATIENT_OWN' || it.status === 'UNAVAILABLE') || viewingPatientBedMedModal.source === 'OUTSIDE_PATIENT_OWN') && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs flex items-center justify-between gap-2 text-amber-950">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <strong className="block text-amber-900">⚠️ Not Available at Central Pharmacy:</strong>
                      <span className="text-[11px] text-amber-800">
                        This medicine is not in hospital stock. Please source / arrange from outside pharmacy. No charges are billed to your bed ledger (₹0).
                      </span>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-[10.5px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded shrink-0">
                    ₹0 Billed
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-[#172B34] uppercase tracking-wider">
                  Medications Breakdown ({viewingPatientBedMedModal.items?.length || 1})
                </h4>

                {viewingPatientBedMedModal.items && viewingPatientBedMedModal.items.length > 0 ? (
                  <div className="bg-white rounded-xl border border-[#E8EEF2] overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#E8EEF2] text-[#567781] text-[10px] uppercase font-bold bg-slate-50">
                          <th className="p-2">#</th>
                          <th className="p-2">Medicine</th>
                          <th className="p-2">Dose</th>
                          <th className="p-2">Freq</th>
                          <th className="p-2 text-right">Source / Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8EEF2] text-[11.5px]">
                        {viewingPatientBedMedModal.items.map((it, idx) => {
                          const isOutside = it.source === 'OUTSIDE_PATIENT_OWN' || it.status === 'UNAVAILABLE';
                          return (
                            <tr key={it.id || idx} className={isOutside ? 'bg-amber-50/40' : ''}>
                              <td className="p-2 font-mono text-[10px] text-[#567781]">{idx + 1}</td>
                              <td className="p-2 font-semibold text-[#172B34]">{it.name}</td>
                              <td className="p-2 text-[#567781]">{it.dosage || '-'}</td>
                              <td className="p-2 font-medium text-[#087F8C]">{it.frequency || '-'}</td>
                              <td className="p-2 text-right">
                                <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded ${
                                  isOutside
                                    ? 'bg-rose-100 text-rose-900 border border-rose-200'
                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                }`}>
                                  {isOutside ? '❌ Source Outside (₹0)' : 'Hospital Stock'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl border border-[#E8EEF2] text-xs">
                    <strong className="text-sm text-[#172B34] block">{viewingPatientBedMedModal.medicineName}</strong>
                    <span className="text-[#567781]">{viewingPatientBedMedModal.dosage} • {viewingPatientBedMedModal.frequency}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 flex items-center justify-between border-t border-[#E8EEF2]">
              <span className="text-xs text-[#567781]">
                Status: <strong className="text-[#172B34]">{viewingPatientBedMedModal.status === 'QUEUED_PHARMACY' ? '⏳ Queued at Pharmacy (Awaiting Dispatch)' : viewingPatientBedMedModal.status === 'DISPENSED' ? '✓ Dispatched by Pharmacy' : '✓ Administered'}</strong>
              </span>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setViewingPatientBedMedModal(null)}
                className="h-8 text-xs font-bold rounded-xl px-5"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* EDIT PATIENT DEMOGRAPHICS & MEDICAL HISTORY MODAL                         */}
      {/* ========================================================================= */}
      {showEditDemographicsModal && (
        <div className="fixed inset-0 bg-[#172B34]/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-[#E8EEF2] max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-[#E8EEF2] flex justify-between items-center bg-[#F6F9FB]">
              <div>
                <h3 className="text-sm font-bold text-[#172B34] flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-[#087F8C]" />
                  <span>Edit Patient Demographics & Clinical Profile</span>
                </h3>
                <p className="text-[11px] text-[#567781]">UHID: UHID-{patient.id?.substring(0, 8).toUpperCase()}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditDemographicsModal(false)}
                className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveDemographics} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Personal & Contact Details */}
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold text-[#087F8C] uppercase tracking-wider block border-b border-[#E8EEF2] pb-1">
                  1. Personal & Contact Information
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="font-semibold text-[#172B34]">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[#172B34]">Mobile Phone *</label>
                    <input
                      type="tel"
                      required
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[#172B34]">Gender *</label>
                    <select
                      value={editGender}
                      onChange={(e) => setEditGender(e.target.value as any)}
                      className="w-full h-8 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs font-medium cursor-pointer"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[#172B34]">Date of Birth</label>
                    <input
                      type="date"
                      value={editDateOfBirth}
                      onChange={(e) => setEditDateOfBirth(e.target.value)}
                      className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[#172B34]">Blood Group</label>
                    <select
                      value={editBloodGroup}
                      onChange={(e) => setEditBloodGroup(e.target.value)}
                      className="w-full h-8 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs font-medium cursor-pointer"
                    >
                      <option value="">Select Blood Group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="font-semibold text-[#172B34]">Email Address</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="patient@example.com"
                      className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[#172B34]">Government ID / Aadhaar</label>
                    <input
                      type="text"
                      value={editGovtId}
                      onChange={(e) => setEditGovtId(e.target.value)}
                      placeholder="e.g. 1234 5678 9012"
                      className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="font-semibold text-[#172B34]">Residential Address</label>
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      placeholder="Street address / House No."
                      className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="font-semibold text-[#172B34]">City</label>
                      <input
                        type="text"
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                        placeholder="City"
                        className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-[#172B34]">Pincode</label>
                      <input
                        type="text"
                        value={editPincode}
                        onChange={(e) => setEditPincode(e.target.value)}
                        placeholder="Pincode"
                        className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Emergency Contact & Insurance */}
              <div className="space-y-2.5 pt-2">
                <span className="text-[11px] font-bold text-[#087F8C] uppercase tracking-wider block border-b border-[#E8EEF2] pb-1">
                  2. Emergency Contact & Insurance
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-[#172B34]">Emergency Contact Name</label>
                    <input
                      type="text"
                      value={editEmergencyName}
                      onChange={(e) => setEditEmergencyName(e.target.value)}
                      placeholder="Spouse / Parent Name"
                      className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[#172B34]">Emergency Phone</label>
                    <input
                      type="tel"
                      value={editEmergencyPhone}
                      onChange={(e) => setEditEmergencyPhone(e.target.value)}
                      placeholder="Phone number"
                      className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[#172B34]">Insurance / TPA Provider</label>
                    <input
                      type="text"
                      value={editInsuranceProvider}
                      onChange={(e) => setEditInsuranceProvider(e.target.value)}
                      placeholder="e.g. Star Health, HDFC Ergo"
                      className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[#172B34]">Policy / Member ID</label>
                    <input
                      type="text"
                      value={editInsurancePolicyNo}
                      onChange={(e) => setEditInsurancePolicyNo(e.target.value)}
                      placeholder="Policy No."
                      className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Clinical Background & Alerts */}
              <div className="space-y-2.5 pt-2">
                <span className="text-[11px] font-bold text-[#087F8C] uppercase tracking-wider block border-b border-[#E8EEF2] pb-1">
                  3. Clinical Background & Safety Alerts
                </span>
                <div className="space-y-2.5">
                  <div className="space-y-1">
                    <label className="font-semibold text-rose-800 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Known Drug Allergies (Safety Alert)</span>
                    </label>
                    <input
                      type="text"
                      value={editAllergies}
                      onChange={(e) => setEditAllergies(e.target.value)}
                      placeholder="e.g. Penicillin, Sulfa drugs (or leave empty if NKDA)"
                      className="w-full h-8 px-2.5 bg-rose-50/50 border border-rose-200 rounded-lg text-xs text-rose-900 font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[#172B34]">Past Medical & Surgical History</label>
                    <textarea
                      rows={2}
                      value={editMedicalHistory}
                      onChange={(e) => setEditMedicalHistory(e.target.value)}
                      placeholder="e.g. Type 2 Diabetes (5 yrs), Hypertension, Appendectomy (2020)..."
                      className="w-full p-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[#172B34]">Current Routine Medications</label>
                    <input
                      type="text"
                      value={editCurrentMeds}
                      onChange={(e) => setEditCurrentMeds(e.target.value)}
                      placeholder="e.g. Metformin 500mg BD, Telmisartan 40mg OD"
                      className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-3 flex justify-end gap-2 border-t border-[#E8EEF2]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditDemographicsModal(false)}
                  className="h-8 text-xs rounded-lg cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSavingDemographics}
                  className="bg-[#087F8C] hover:bg-[#076b77] text-white text-xs font-semibold h-8 px-5 rounded-lg border-0 cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSavingDemographics ? 'Saving...' : 'Save Demographics'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 9: VIEW PHARMACY DISPENSED INVOICE DETAILS                           */}
      {/* ========================================================================= */}
      {viewingPharmacySale && (
        <div className="fixed inset-0 bg-[#172B34]/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-[#E8EEF2] p-5 space-y-4 max-h-[85vh] flex flex-col justify-between overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-[#E8EEF2] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-lg border border-emerald-300">
                    {viewingPharmacySale.invoiceNo}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Paid via {viewingPharmacySale.paymentMode || 'Cash'}
                  </span>
                </div>
                <p className="text-xs text-[#567781] mt-1">
                  Dispensed on: <strong className="text-[#172B34]">{viewingPharmacySale.dateTime}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingPharmacySale(null)}
                className="text-[#567781] hover:text-[#172B34] p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="space-y-3 overflow-y-auto pr-1 text-xs">
              <div className="bg-[#F6F9FB] p-3 rounded-xl border border-[#E8EEF2] grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-[#567781] text-[10px] block">Customer / Patient</span><strong className="text-[#172B34]">{viewingPharmacySale.patientName}</strong></div>
                <div><span className="text-[#567781] text-[10px] block">Mobile</span><strong className="text-[#172B34] font-mono">{viewingPharmacySale.patientPhone || 'N/A'}</strong></div>
                <div><span className="text-[#567781] text-[10px] block">Dispensed By</span><strong className="text-[#172B34]">{viewingPharmacySale.dispensedBy || 'Duty Pharmacist'}</strong></div>
                <div><span className="text-[#567781] text-[10px] block">Prescriber</span><strong className="text-[#087F8C]">{viewingPharmacySale.doctorName || 'Medical Officer'}</strong></div>
              </div>

              {/* Items Table */}
              <div className="bg-white rounded-xl border border-[#E8EEF2] overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E8EEF2] text-[#567781] text-[10px] uppercase font-bold bg-[#F6F9FB]">
                      <th className="p-2">#</th>
                      <th className="p-2">Medicine Formulation</th>
                      <th className="p-2">Batch</th>
                      <th className="p-2 text-center">Qty</th>
                      <th className="p-2 text-right">Rate</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8EEF2]/70">
                    {(viewingPharmacySale.items || []).map((it: any, idx: number) => (
                      <tr key={idx}>
                        <td className="p-2 font-mono text-[10px] text-[#567781]">{idx + 1}</td>
                        <td className="p-2 font-semibold text-[#172B34]">{it.name}</td>
                        <td className="p-2 font-mono text-[10px] text-slate-600">{it.batchNumber || 'POS-BATCH'}</td>
                        <td className="p-2 text-center font-bold text-[#087F8C]">{it.quantity}</td>
                        <td className="p-2 text-right font-mono text-[#567781]">₹{it.unitPrice}</td>
                        <td className="p-2 text-right font-mono font-bold text-[#172B34]">₹{it.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/80 flex items-center justify-between text-xs font-semibold text-emerald-950">
                <span>Subtotal: ₹{viewingPharmacySale.subtotal || viewingPharmacySale.grandTotal} {viewingPharmacySale.discount > 0 ? `• Disc: -₹${viewingPharmacySale.discount}` : ''} {viewingPharmacySale.tax > 0 ? `• Tax: ₹${viewingPharmacySale.tax}` : ''}</span>
                <span className="text-sm font-black text-emerald-800 font-mono">Grand Total: ₹{viewingPharmacySale.grandTotal}</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 flex justify-end gap-2 border-t border-[#E8EEF2]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setViewingPharmacySale(null)}
                className="h-8 text-xs rounded-lg cursor-pointer"
              >
                Close
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  const s = viewingPharmacySale;
                  setViewingPharmacySale(null);
                  setSelectedPrintPharmacySale(s);
                }}
                className="bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs h-8 px-4 rounded-lg border-0 cursor-pointer shadow-xs flex items-center gap-1"
              >
                <Printer className="w-3.5 h-3.5 mr-1" />
                <span>Print Receipt</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 10: VIEW OPD DOCTOR PRESCRIPTION DETAILS                            */}
      {/* ========================================================================= */}
      {viewingApptPrescription && (
        <div className="fixed inset-0 bg-[#172B34]/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-[#E8EEF2] p-5 space-y-4 max-h-[90vh] flex flex-col justify-between overflow-hidden">
            {/* Modal Header Actions */}
            <div className="flex justify-between items-center border-b border-[#E8EEF2] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#087F8C] text-white flex items-center justify-center font-bold">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#172B34]">Doctor's Medical Prescription (Rx)</h3>
                  <p className="text-[11px] text-[#567781]">Official Outpatient Consultation Record</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingApptPrescription(null)}
                className="text-[#567781] hover:text-[#172B34] p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Prescription Sheet */}
            <div className="space-y-4 overflow-y-auto pr-1 text-xs bg-white">
              {/* 1. Official Header / Letterhead */}
              <div className="bg-gradient-to-r from-slate-50 to-teal-50/40 p-4 rounded-xl border border-[#E8EEF2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-[#172B34] tracking-tight">
                    {clinic?.name || 'NISSCHAY HEALTHCARE & MULTI-SPECIALTY CLINIC'}
                  </h2>
                  <p className="text-[11px] text-[#087F8C] font-semibold">
                    {clinic?.address || 'Medical Centre Plaza, Main Road'}, {clinic?.city || 'Pune'} • Phone: {clinic?.phone || '+91 98765 43210'}
                  </p>
                </div>
                <div className="text-left sm:text-right border-t sm:border-t-0 border-[#E8EEF2] pt-2 sm:pt-0">
                  <strong className="text-xs text-[#172B34] block">Dr. {viewingApptPrescription.doctorName || 'Consultant Physician'}</strong>
                  <span className="text-[10.5px] text-[#567781] block">Consultant Specialist • Reg: MMC-2024/9912</span>
                </div>
              </div>

              {/* 2. Patient Demographics Strip */}
              <div className="p-3 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-[#567781] uppercase block">Patient Name</span>
                  <strong className="text-[#172B34]">{patient?.name || 'Registered Patient'}</strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#567781] uppercase block">Age / Gender</span>
                  <span className="font-semibold text-[#172B34]">{patient?.age ? `${patient.age} Y` : 'Adult'} / {patient?.gender || 'MALE'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#567781] uppercase block">UHID / Patient ID</span>
                  <span className="font-mono font-semibold text-[#087F8C]">{patient?.id ? `UHID-${patient.id.slice(0, 8).toUpperCase()}` : 'UHID-2026-OPD'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#567781] uppercase block">Date & Time</span>
                  <span className="font-mono text-[#172B34]">{formatDate(viewingApptPrescription.appointmentDate)} • {viewingApptPrescription.appointmentTime || '10:30 AM'}</span>
                </div>
              </div>

              {/* 2B. Clinical Vitals Strip (If recorded) */}
              {(viewingApptPrescription.bpSystolic || viewingApptPrescription.pulse || viewingApptPrescription.temperature || viewingApptPrescription.spo2 || viewingApptPrescription.weight) && (
                <div className="p-2.5 bg-slate-50 rounded-xl border border-[#E8EEF2] flex flex-wrap items-center gap-4 text-xs">
                  <span className="text-[10px] font-bold text-[#567781] uppercase tracking-wider">Recorded Vitals:</span>
                  {viewingApptPrescription.bpSystolic && viewingApptPrescription.bpDiastolic && (
                    <span className="font-medium text-[#172B34]"><strong>BP:</strong> {viewingApptPrescription.bpSystolic}/{viewingApptPrescription.bpDiastolic} mmHg</span>
                  )}
                  {viewingApptPrescription.pulse && (
                    <span className="font-medium text-[#172B34]"><strong>Pulse:</strong> {viewingApptPrescription.pulse} bpm</span>
                  )}
                  {viewingApptPrescription.temperature && (
                    <span className="font-medium text-[#172B34]"><strong>Temp:</strong> {viewingApptPrescription.temperature} °F</span>
                  )}
                  {viewingApptPrescription.spo2 && (
                    <span className="font-medium text-[#172B34]"><strong>SpO₂:</strong> {viewingApptPrescription.spo2}%</span>
                  )}
                  {viewingApptPrescription.weight && (
                    <span className="font-medium text-[#172B34]"><strong>Weight:</strong> {viewingApptPrescription.weight} kg</span>
                  )}
                </div>
              )}

              {/* 3. Clinical Diagnosis & Complaints */}
              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/70 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">Clinical Notes & Diagnosis</span>
                  {viewingApptPrescription.diagnosis && (
                    <span className="text-[11px] font-bold text-amber-950 bg-amber-100/80 px-2 py-0.5 rounded">
                      {viewingApptPrescription.diagnosis}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#172B34] font-medium">
                  {viewingApptPrescription.symptoms ? `Symptoms: ${viewingApptPrescription.symptoms}` : ''}
                  {viewingApptPrescription.symptoms && viewingApptPrescription.notes ? ' • ' : ''}
                  {viewingApptPrescription.notes || (!viewingApptPrescription.symptoms && !viewingApptPrescription.diagnosis ? 'Acute clinical examination conducted. Vitals recorded within acceptable range.' : '')}
                </p>
              </div>

              {/* 4. Official Rx Medicines Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 border-b-2 border-[#087F8C] pb-1">
                  <span className="text-lg font-serif font-black text-[#087F8C]">℞</span>
                  <span className="text-xs font-bold text-[#172B34] uppercase tracking-wider">Prescribed Medications & Regimen</span>
                </div>

                <div className="bg-white rounded-xl border border-[#E8EEF2] overflow-hidden">
                  <div className="p-3.5 space-y-3">
                    {(() => {
                      const rawRx = viewingApptPrescription.prescription;
                      if (!rawRx || !rawRx.trim()) {
                        return (
                          <div className="p-4 text-center text-xs text-[#567781] italic">
                            No specific medication list logged for this consultation.
                          </div>
                        );
                      }

                      // Check if rawRx is JSON
                      let items: string[] = [];
                      if (rawRx.trim().startsWith('[') || rawRx.trim().startsWith('{')) {
                        try {
                          const parsed = JSON.parse(rawRx);
                          if (Array.isArray(parsed)) {
                            items = parsed.map((m: any) => 
                              typeof m === 'string' ? m : `${m.form || ''} ${m.name || ''} - ${m.dosage || ''} - ${m.timing || ''} - ${m.duration || ''} ${m.instructions ? `(${m.instructions})` : ''}`
                            );
                          }
                        } catch {
                          items = rawRx.split(/\r?\n/).filter((l: string) => l.trim().length > 0);
                        }
                      } else {
                        items = rawRx.split(/\r?\n/).filter((l: string) => l.trim().length > 0);
                      }

                      return (
                        <div className="space-y-2.5">
                          {items.map((line: string, idx: number) => {
                            const clean = line.replace(/^[•\-\*0-9\.]+\s*/, '');
                            return (
                              <div key={idx} className="p-2.5 bg-[#F6F9FB] rounded-lg border border-[#E8EEF2] flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2.5">
                                  <span className="w-5 h-5 rounded-full bg-[#087F8C] text-white flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5">
                                    {idx + 1}
                                  </span>
                                  <div>
                                    <span className="font-bold text-xs text-[#172B34] block leading-snug">{clean}</span>
                                    <span className="text-[10.5px] text-[#567781] block mt-0.5">Take as directed with water.</span>
                                  </div>
                                </div>
                                <span className="text-[10px] font-bold bg-teal-50 text-[#087F8C] border border-teal-200 px-2 py-0.5 rounded shrink-0">
                                  Oral Regimen
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* 5. General Advice & Dietary Precautions */}
              <div className="p-3 bg-slate-50 rounded-xl border border-[#E8EEF2] space-y-1.5">
                <span className="text-[10px] font-bold text-[#567781] uppercase tracking-wider block">Doctor's General Advice & Diet</span>
                <ul className="list-disc list-inside text-xs text-[#567781] space-y-0.5">
                  <li>Maintain adequate hydration (2.5 - 3 Litres of boiled/filtered water daily).</li>
                  <li>Avoid heavy, spicy or oily meals; prefer easily digestible warm diet.</li>
                  <li>Complete the entire prescribed medication course without abrupt discontinuation.</li>
                  <li>Return for review if symptoms persist or high fever occurs.</li>
                </ul>
              </div>

              {/* 6. Doctor Signature Area */}
              <div className="pt-3 border-t border-[#E8EEF2] flex items-end justify-between text-xs">
                <div>
                  <span className="text-[10px] text-[#567781] block">Next Review Date:</span>
                  <strong className="text-xs text-[#172B34]">After 5 Days (or SOS if needed)</strong>
                </div>
                <div className="text-right space-y-1">
                  <div className="w-36 border-b border-slate-400 pb-1 text-center font-serif italic text-xs text-[#087F8C]">
                    Dr. {viewingApptPrescription.doctorName}
                  </div>
                  <span className="text-[10px] font-bold text-[#567781] block">Authorized Medical Signatory</span>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-3 flex justify-end gap-2 border-t border-[#E8EEF2]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setViewingApptPrescription(null)}
                className="h-8 text-xs rounded-lg cursor-pointer"
              >
                Close
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => window.print()}
                className="bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs h-8 px-4 rounded-lg border-0 cursor-pointer shadow-xs flex items-center gap-1"
              >
                <Printer className="w-3.5 h-3.5 mr-1" />
                <span>Print Prescription</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Print Receipt Modal for Pharmacy Sale */}
      {selectedPrintPharmacySale && (
        <div className="fixed inset-0 bg-[#172B34]/60 backdrop-blur-xs flex items-center justify-center p-3 z-60 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#E8EEF2] p-5 space-y-4">
            <div className="flex justify-between items-start border-b border-[#E8EEF2] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#172B34]">Pharmacy Receipt Print</h3>
                <p className="text-xs text-[#567781]">Invoice #{selectedPrintPharmacySale.invoiceNo}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPrintPharmacySale(null)}
                className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] space-y-2 text-xs font-mono">
              <div className="text-center font-bold text-[#172B34] border-b border-dashed border-slate-300 pb-2">
                {clinic?.name || 'NISSCHAY HOSPITAL & PHARMACY'}
                <span className="block text-[10px] font-normal text-[#567781]">{clinic?.address || 'Medical Centre'}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>INV: {selectedPrintPharmacySale.invoiceNo}</span>
                <span>{selectedPrintPharmacySale.dateTime}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>PT: {selectedPrintPharmacySale.patientName}</span>
                <span>{selectedPrintPharmacySale.patientPhone || ''}</span>
              </div>
              <div className="border-t border-b border-dashed border-slate-300 py-1.5 space-y-1">
                {(selectedPrintPharmacySale.items || []).map((it: any, i: number) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <span className="truncate max-w-[200px]">{it.name} x{it.quantity}</span>
                    <span>₹{it.total}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold text-xs pt-1">
                <span>GRAND TOTAL</span>
                <span>₹{selectedPrintPharmacySale.grandTotal}</span>
              </div>
              <div className="text-[10px] text-center text-[#567781] pt-2">
                Payment: {selectedPrintPharmacySale.paymentMode || 'PAID'} • Dispensed by {selectedPrintPharmacySale.dispensedBy}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E8EEF2]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedPrintPharmacySale(null)}
                className="h-8 text-xs rounded-lg cursor-pointer"
              >
                Close
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => window.print()}
                className="bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs h-8 px-4 rounded-lg border-0 cursor-pointer shadow-xs flex items-center gap-1"
              >
                <Printer className="w-3.5 h-3.5 mr-1" />
                <span>Print Bill</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
