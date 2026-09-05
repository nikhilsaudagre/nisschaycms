'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  FileCheck2,
  FileSpreadsheet,
  Award,
  Building,
  Pill,
  Printer,
  Edit2,
  Search,
  CheckCircle2,
  Clock,
  LogOut,
  AlertTriangle,
  ChevronRight,
  User,
  Activity,
  Plus,
  Trash2,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  SendHorizontal,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import { calculateBedStayFinancials } from '@/lib/financial-calculator';
import {
  HospitalBed,
  Clinic,
  Doctor,
  Patient,
  TakeHomeMedication,
  DischargeType,
  DischargePlanData,
  InpatientAdvancePayment,
  BedStatus
} from '@/types';
import { DischargeSummaryPrintDocument } from '@/components/discharge-summary-print-document';
import { MedicalCertificatePrintDocument } from '@/components/medical-certificate-print-document';
import { HospitalizationCertificatePrintDocument } from '@/components/hospitalization-certificate-print-document';
import { ReferralMemoPrintDocument } from '@/components/referral-memo-print-document';
import { InvoicePrintDocument } from '@/components/invoice-print-document';

export default function DischargeCentrePage() {
  const { user } = useAuth();
  const [beds, setBeds] = useState<HospitalBed[]>([]);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStatusTab, setSelectedStatusTab] = useState<'ALL' | 'PENDING' | 'READY' | 'SETTLED'>('ALL');
  const [selectedWardFilter, setSelectedWardFilter] = useState<string>('ALL');

  // Currently Selected Bed for Certification Studio
  const [selectedBed, setSelectedBed] = useState<HospitalBed | null>(null);
  const [activeCertSubTab, setActiveCertSubTab] = useState<'SUMMARY' | 'FITNESS_CERT' | 'HOSP_CERT' | 'TAKE_HOME_RX' | 'REFERRAL'>('SUMMARY');

  // Certificate Studio Form States
  const [editDischargeType, setEditDischargeType] = useState<DischargeType>('REGULAR');
  const [editFinalDiagnosis, setEditFinalDiagnosis] = useState<string>('');
  const [editConditionAtDischarge, setEditConditionAtDischarge] = useState<string>('Hemodynamically stable, afebrile, ambulatory.');
  const [editHospitalCourse, setEditHospitalCourse] = useState<string>('Patient responded favorably to conservative and targeted medical therapy.');
  const [editDietAdvice, setEditDietAdvice] = useState<string>('Balanced light diet with adequate fluid hydration.');
  const [editFollowUpDate, setEditFollowUpDate] = useState<string>('After 7 days in OPD');
  const [editFollowUpDoctor, setEditFollowUpDoctor] = useState<string>('');
  const [editEmergencySigns, setEditEmergencySigns] = useState<string>('High fever >101°F, chest pain, persistent vomiting, or breathing difficulty.');
  const [editTakeHomeMeds, setEditTakeHomeMeds] = useState<TakeHomeMedication[]>([]);

  // Certificate Need Toggles (Only Needed Certificates)
  const [editReqSummary, setEditReqSummary] = useState<boolean>(true);
  const [editReqMedCert, setEditReqMedCert] = useState<boolean>(false);
  const [editReqHospCert, setEditReqHospCert] = useState<boolean>(false);
  const [editReqTakeHomeRx, setEditReqTakeHomeRx] = useState<boolean>(true);
  const [editReqReferralMemo, setEditReqReferralMemo] = useState<boolean>(false);

  // Medical Fitness / Sickness Cert States
  const [editMedCertType, setEditMedCertType] = useState<'SICKNESS_REST' | 'FITNESS_RESUME' | 'BOTH'>('BOTH');
  const [editMedCertDiagnosis, setEditMedCertDiagnosis] = useState<string>('');
  const [editMedCertStartDate, setEditMedCertStartDate] = useState<string>('');
  const [editMedCertEndDate, setEditMedCertEndDate] = useState<string>('');
  const [editMedCertFitDate, setEditMedCertFitDate] = useState<string>('');
  const [editMedCertRemarks, setEditMedCertRemarks] = useState<string>('Advised light routine duties for 3 days post resumption.');

  // Hospital Stay Certificate States
  const [editHospPurpose, setEditHospPurpose] = useState<string>('Mediclaim / Health Insurance Reimbursement & Official Employer Record');

  // Referral Memo States
  const [editReferralHospital, setEditReferralHospital] = useState<string>('City Institute of Medical Sciences (CIMS)');
  const [editReferralReason, setEditReferralReason] = useState<string>('Requires advanced tertiary evaluation & interventional care.');
  const [editReferralVitals, setEditReferralVitals] = useState<string>('BP 120/80 mmHg, HR 78 bpm, SpO2 99% on RA');
  const [editReferralTransport, setEditReferralTransport] = useState<string>('Cardiac ALS Ambulance with Medical Escort');

  // Print Preview Dialog States
  const [printSummaryBed, setPrintSummaryBed] = useState<HospitalBed | null>(null);
  const [printMedCertBed, setPrintMedCertBed] = useState<HospitalBed | null>(null);
  const [printHospCertBed, setPrintHospCertBed] = useState<HospitalBed | null>(null);
  const [printReferralMemoBed, setPrintReferralMemoBed] = useState<HospitalBed | null>(null);
  const [printInvoiceBed, setPrintInvoiceBed] = useState<HospitalBed | null>(null);

  // Settlement Modal State
  const [showSettleModal, setShowSettleModal] = useState<boolean>(false);
  const [settleBed, setSettleBed] = useState<HospitalBed | null>(null);
  const [settlePaymentMode, setSettlePaymentMode] = useState<string>('UPI');
  const [settleNotes, setSettleNotes] = useState<string>('Final settlement clearance');
  const [isSettling, setIsSettling] = useState<boolean>(false);

  // Notification Banner
  const [notificationMsg, setNotificationMsg] = useState<string>('');

  // Helper to safely extract beds array from various API response formats
  const parseBedsData = (data: any): HospitalBed[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.beds) {
      if (Array.isArray(data.beds)) return data.beds;
      if (typeof data.beds === 'string') {
        try {
          const parsed = JSON.parse(data.beds);
          if (Array.isArray(parsed)) return parsed;
        } catch {}
      }
    }
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  };

  // Load Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [bedsRes, clinicRes, doctorsRes, patientsRes] = await Promise.allSettled([
          apiClient.get<any>('/clinics/hospital-data'),
          apiClient.get<Clinic>('/clinics/me'),
          apiClient.get<Doctor[]>('/doctors'),
          apiClient.get<Patient[]>('/patients')
        ]);

        let loadedBeds: HospitalBed[] = [];
        if (bedsRes.status === 'fulfilled' && bedsRes.value?.data) {
          loadedBeds = parseBedsData(bedsRes.value.data);
        }

        if (loadedBeds.length === 0) {
          // Fallback from localStorage
          const localBeds = localStorage.getItem('nisschay_hospital_beds');
          if (localBeds) {
            try {
              const parsed = JSON.parse(localBeds);
              if (Array.isArray(parsed)) {
                loadedBeds = parsed;
              }
            } catch (e) {
              console.error('Failed to parse cached beds', e);
            }
          }
        }

        setBeds(loadedBeds);

        if (clinicRes.status === 'fulfilled' && clinicRes.value?.data) {
          setClinic(clinicRes.value.data);
        }
        if (doctorsRes.status === 'fulfilled' && Array.isArray(doctorsRes.value?.data)) {
          setDoctors(doctorsRes.value.data);
        }
        if (patientsRes.status === 'fulfilled' && Array.isArray(patientsRes.value?.data)) {
          setPatients(patientsRes.value.data);
        }
      } catch (err) {
        console.error('Error fetching discharge centre data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Listen to real-time synchronization
    const channel = new BroadcastChannel('nisschay_hospital_sync');
    channel.onmessage = (event) => {
      if (event.data?.type === 'HOSPITAL_DATA_UPDATED' && event.data?.beds) {
        setBeds(parseBedsData(event.data.beds));
      }
    };

    return () => {
      channel.close();
    };
  }, []);

  // Save changes to backend and sync
  const persistHospitalData = async (updatedBeds: HospitalBed[]) => {
    try {
      const safe = Array.isArray(updatedBeds) ? updatedBeds : [];
      localStorage.setItem('nisschay_hospital_beds', JSON.stringify(safe));
      const channel = new BroadcastChannel('nisschay_hospital_sync');
      channel.postMessage({ type: 'HOSPITAL_DATA_UPDATED', beds: safe });
      channel.close();
      await apiClient.post('/clinics/hospital-data', { beds: JSON.stringify(safe) });
    } catch (e) {
      console.warn('Persist failed, cached locally', e);
    }
  };

  // Standardized live financials from Centralized Financial Engine
  const getBedFinancials = (bed: HospitalBed) => {
    const fin = calculateBedStayFinancials(bed);
    return {
      stayDays: fin.stayDays,
      roomCharges: fin.roomCharges,
      servicesTotal: fin.servicesTotal,
      grossTotal: fin.grossTotal,
      advances: fin.advances,
      balanceDue: fin.balanceDue
    };
  };

  const safeBeds = useMemo(() => Array.isArray(beds) ? beds : [], [beds]);

  // Planned Discharges Queue
  const dischargeQueue = useMemo(() => {
    return safeBeds.filter((b) => b && (b.status === 'DISCHARGE_PLANNED' || b.dischargePlan));
  }, [safeBeds]);

  // Metrics
  const metrics = useMemo(() => {
    const total = dischargeQueue.length;
    const pendingCert = dischargeQueue.filter((b) => b.status === 'DISCHARGE_PLANNED' && b.dischargePlan?.dossierStatus !== 'DOCS_CERTIFIED_READY').length;
    const readyForSettle = dischargeQueue.filter((b) => b.status === 'DISCHARGE_PLANNED' && b.dischargePlan?.dossierStatus === 'DOCS_CERTIFIED_READY').length;
    const settledToday = safeBeds.filter((b) => b.status === 'CLEANING').length;
    return { total, pendingCert, readyForSettle, settledToday };
  }, [dischargeQueue, safeBeds]);

  // Filtered Queue
  const filteredQueue = useMemo(() => {
    return dischargeQueue.filter((bed) => {
      // Status Filter
      if (selectedStatusTab === 'PENDING' && bed.dischargePlan?.dossierStatus === 'DOCS_CERTIFIED_READY') return false;
      if (selectedStatusTab === 'READY' && bed.dischargePlan?.dossierStatus !== 'DOCS_CERTIFIED_READY') return false;
      if (selectedStatusTab === 'SETTLED' && bed.status !== 'CLEANING') return false;

      // Ward Filter
      if (selectedWardFilter !== 'ALL' && bed.wardName !== selectedWardFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const pName = (bed.patientName || '').toLowerCase();
        const bNo = (bed.bedNumber || '').toLowerCase();
        const wName = (bed.wardName || '').toLowerCase();
        const diag = (bed.admittingDiagnosis || '').toLowerCase();
        return pName.includes(q) || bNo.includes(q) || wName.includes(q) || diag.includes(q);
      }

      return true;
    });
  }, [dischargeQueue, selectedStatusTab, selectedWardFilter, searchQuery]);

  // Open Certification Studio for a bed
  const handleOpenStudio = (bed: HospitalBed) => {
    setSelectedBed(bed);
    const plan = bed.dischargePlan;
    const todayStr = new Date().toISOString().split('T')[0];

    setEditDischargeType(plan?.dischargeType || 'REGULAR');
    setEditFinalDiagnosis(plan?.finalDiagnosis || bed.admittingDiagnosis || '');
    setEditConditionAtDischarge(plan?.conditionAtDischarge || 'Hemodynamically stable, afebrile, ambulatory.');
    setEditHospitalCourse(plan?.hospitalCourse || 'Patient responded favorably to conservative and targeted clinical management.');
    setEditDietAdvice(plan?.dietaryAdvice || 'Balanced light diet with adequate hydration. Avoid heavy exertion.');
    setEditFollowUpDate(plan?.followUpDate || 'After 7 days in OPD');
    setEditFollowUpDoctor(plan?.followUpDoctor || bed.consultantDoctorName || doctors[0]?.name || 'Dr. Patil, MD');
    setEditEmergencySigns(plan?.emergencyAlertSigns || 'High fever >101°F, chest pain, persistent vomiting, or breathing difficulty.');
    
    // Set Needed Certificates Flags
    setEditReqSummary(plan?.includeDischargeSummary !== false);
    setEditReqMedCert(plan?.medicalCertificate?.isRequired || false);
    setEditReqHospCert(plan?.hospitalizationCertificate?.isRequired || false);
    setEditReqTakeHomeRx(plan?.includeTakeHomeRx !== false);
    setEditReqReferralMemo(plan?.referralMemo?.isRequired || plan?.dischargeType === 'TRANSFER');

    setEditTakeHomeMeds(plan?.takeHomeMedications && plan.takeHomeMedications.length > 0 ? plan.takeHomeMedications : [
      { id: `thm-1`, name: 'Tab. Augmentin 625mg', dosage: '625 mg', frequency: '1-0-1 (Twice daily)', duration: '5 Days', timing: 'After Food (PC)', instructions: 'Complete full course' },
      { id: `thm-2`, name: 'Tab. Pan 40', dosage: '40 mg', frequency: '1-0-0 (Once daily)', duration: '5 Days', timing: 'Before Breakfast (AC)', instructions: 'Take 30 mins before food' }
    ]);

    setEditMedCertType(plan?.medicalCertificate?.type || 'BOTH');
    setEditMedCertDiagnosis(plan?.medicalCertificate?.reason || plan?.finalDiagnosis || bed.admittingDiagnosis || '');
    setEditMedCertStartDate(plan?.medicalCertificate?.restStartDate || bed.admissionDate || todayStr);
    setEditMedCertEndDate(plan?.medicalCertificate?.restEndDate || plan?.plannedDate || todayStr);
    setEditMedCertFitDate(plan?.medicalCertificate?.fitToResumeDate || plan?.plannedDate || todayStr);
    setEditMedCertRemarks(plan?.medicalCertificate?.remarks || 'Patient is advised light routine activities for 3 days post resumption.');

    setEditHospPurpose(plan?.hospitalizationCertificate?.purpose || 'Mediclaim / Health Insurance Reimbursement & Official Employer Record');

    setEditReferralHospital(plan?.referralMemo?.destinationHospital || 'City Institute of Medical Sciences (CIMS)');
    setEditReferralReason(plan?.referralMemo?.transferReason || 'Requires advanced tertiary evaluation & interventional cardiology care.');
    setEditReferralVitals(plan?.referralMemo?.clinicalConditionAtTransfer || 'BP 120/80 mmHg, HR 78 bpm, SpO2 99% on RA');
    setEditReferralTransport(plan?.referralMemo?.transportMode || 'Cardiac ALS Ambulance with Medical Escort');
  };

  // Add Take-Home Med Row
  const handleAddMedRow = () => {
    setEditTakeHomeMeds((prev) => [
      ...prev,
      { id: `thm-${Date.now()}`, name: '', dosage: '1 Tab', frequency: '1-0-1 (Twice daily)', duration: '5 Days', timing: 'After Food (PC)', instructions: '' }
    ]);
  };

  const handleUpdateMedRow = (id: string, field: keyof TakeHomeMedication, val: string) => {
    setEditTakeHomeMeds((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: val } : m)));
  };

  const handleRemoveMedRow = (id: string) => {
    setEditTakeHomeMeds((prev) => prev.filter((m) => m.id !== id));
  };

  // Save Working Draft
  const handleSaveDraft = () => {
    if (!selectedBed) return;

    const updatedPlan: DischargePlanData = {
      plannedDate: selectedBed.dischargePlan?.plannedDate || new Date().toISOString().split('T')[0],
      plannedTime: selectedBed.dischargePlan?.plannedTime || '14:00',
      dischargeType: editDischargeType,
      finalDiagnosis: editFinalDiagnosis,
      conditionAtDischarge: editConditionAtDischarge,
      hospitalCourse: editHospitalCourse,
      dietaryAdvice: editDietAdvice,
      followUpDate: editFollowUpDate,
      followUpDoctor: editFollowUpDoctor,
      emergencyAlertSigns: editEmergencySigns,
      takeHomeMedications: editTakeHomeMeds,
      medicalCertificate: {
        isRequired: true,
        type: editMedCertType,
        reason: editMedCertDiagnosis,
        restStartDate: editMedCertStartDate,
        restEndDate: editMedCertEndDate,
        fitToResumeDate: editMedCertFitDate,
        remarks: editMedCertRemarks
      },
      hospitalizationCertificate: {
        isRequired: true,
        purpose: editHospPurpose,
        treatedUnderDoctor: selectedBed.consultantDoctorName || 'Chief Medical Consultant',
        roomCategory: selectedBed.wardName
      },
      referralMemo: {
        isRequired: editDischargeType === 'TRANSFER',
        destinationHospital: editReferralHospital,
        transferReason: editReferralReason,
        transportMode: editReferralTransport,
        clinicalConditionAtTransfer: editReferralVitals
      },
      dossierStatus: 'DRAFT_IN_PROGRESS',
      clearedByDoctor: false,
      clearedByBilling: false
    };

    const updatedBeds = beds.map((b) => (b.id === selectedBed.id ? { ...b, dischargePlan: updatedPlan } : b));
    setBeds(updatedBeds);
    persistHospitalData(updatedBeds);
    setSelectedBed({ ...selectedBed, dischargePlan: updatedPlan });
    setNotificationMsg('✓ Draft saved successfully!');
    setTimeout(() => setNotificationMsg(''), 3000);
  };

  // THE REVERT ACTION: Doctor Certifies All Documents Ready & Sends to Inpatient/Billing Desk
  const handleCertifyAndRevertToInpatientFile = () => {
    if (!selectedBed) return;
    const doctorName = user?.name || selectedBed.consultantDoctorName || 'Dr. Patil, MD';
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const certifiedPlan: DischargePlanData = {
      plannedDate: selectedBed.dischargePlan?.plannedDate || new Date().toISOString().split('T')[0],
      plannedTime: selectedBed.dischargePlan?.plannedTime || '14:00',
      dischargeType: editDischargeType,
      finalDiagnosis: editFinalDiagnosis,
      conditionAtDischarge: editConditionAtDischarge,
      hospitalCourse: editHospitalCourse,
      dietaryAdvice: editDietAdvice,
      followUpDate: editFollowUpDate,
      followUpDoctor: editFollowUpDoctor,
      emergencyAlertSigns: editEmergencySigns,
      includeDischargeSummary: editReqSummary,
      includeTakeHomeRx: editReqTakeHomeRx,
      takeHomeMedications: editReqTakeHomeRx ? editTakeHomeMeds : [],
      medicalCertificate: {
        isRequired: editReqMedCert,
        type: editMedCertType,
        reason: editMedCertDiagnosis,
        restStartDate: editMedCertStartDate,
        restEndDate: editMedCertEndDate,
        fitToResumeDate: editMedCertFitDate,
        remarks: editMedCertRemarks
      },
      hospitalizationCertificate: {
        isRequired: editReqHospCert,
        purpose: editHospPurpose,
        treatedUnderDoctor: selectedBed.consultantDoctorName || 'Chief Medical Consultant',
        roomCategory: selectedBed.wardName
      },
      referralMemo: {
        isRequired: editReqReferralMemo || editDischargeType === 'TRANSFER',
        destinationHospital: editReferralHospital,
        transferReason: editReferralReason,
        transportMode: editReferralTransport,
        clinicalConditionAtTransfer: editReferralVitals
      },
      dossierStatus: 'DOCS_CERTIFIED_READY',
      certifiedByDoctorName: doctorName,
      certifiedTimestamp: nowTime,
      clearedByDoctor: true,
      clearedByBilling: false
    };

    const count = [editReqSummary, editReqMedCert, editReqHospCert, editReqTakeHomeRx, editReqReferralMemo].filter(Boolean).length;
    const updatedBeds = beds.map((b) => (b.id === selectedBed.id ? { ...b, dischargePlan: certifiedPlan } : b));
    setBeds(updatedBeds);
    persistHospitalData(updatedBeds);
    setSelectedBed(null);
    setNotificationMsg(`🟢 Success! ${count} selected certificate(s) for ${selectedBed.patientName} (Bed ${selectedBed.bedNumber}) certified and reverted to Inpatient File. Billing desk notified!`);
    setTimeout(() => setNotificationMsg(''), 6000);
  };

  // Explicit Send Request to Billing Team Action
  const handleSendRequestToBilling = async (bed: HospitalBed) => {
    const updatedPlan: DischargePlanData = {
      ...(bed.dischargePlan || { dischargeType: 'REGULAR' }),
      dossierStatus: 'SENT_TO_BILLING',
      clearedByDoctor: true,
      clearedByBilling: false
    };

    const updatedBeds = beds.map((b) => (b.id === bed.id ? { ...b, dischargePlan: updatedPlan } : b));
    setBeds(updatedBeds);
    await persistHospitalData(updatedBeds);
    setNotificationMsg(`📤 Request successfully sent to Billing & Invoices Desk for ${bed.patientName} (Bed ${bed.bedNumber})!`);
    setTimeout(() => setNotificationMsg(''), 6000);
  };

  // Settle Bill & Final Discharge
  const handleOpenSettleModal = (bed: HospitalBed) => {
    setSettleBed(bed);
    setShowSettleModal(true);
  };

  const handleConfirmFinalSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleBed) return;
    setIsSettling(true);

    try {
      const fin = getBedFinancials(settleBed);
      const today = new Date().toISOString().split('T')[0];
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const updatedAdvances = [...(settleBed.advancePayments || [])];
      if (fin.balanceDue > 0) {
        const finalReceipt: InpatientAdvancePayment = {
          id: `adv-discharge-${Date.now()}`,
          amount: fin.balanceDue,
          paymentMode: settlePaymentMode,
          receiptNumber: `REC-DISCHARGE-${Math.floor(100000 + Math.random() * 900000)}`,
          datePaid: `${today} ${time}`,
          notes: settleNotes
        };
        updatedAdvances.push(finalReceipt);
      }

      const updatedBeds = beds.map((b) =>
        b.id === settleBed.id
          ? {
              ...b,
              status: 'CLEANING' as BedStatus,
              advancePayments: updatedAdvances,
              dischargePlan: {
                ...(b.dischargePlan || {
                  plannedDate: today,
                  plannedTime: time,
                  dischargeType: 'REGULAR' as DischargeType
                }),
                dossierStatus: 'SETTLED_DISCHARGED' as const,
                clearedByBilling: true
              }
            }
          : b
      );

      setBeds(updatedBeds);
      persistHospitalData(updatedBeds);
      setShowSettleModal(false);
      setPrintInvoiceBed(settleBed);
      setNotificationMsg(`✓ Bed ${settleBed.bedNumber} cleared! Patient ${settleBed.patientName} discharged and bed transitioned to 🧹 Sanitization.`);
      setTimeout(() => setNotificationMsg(''), 5000);
    } catch (e) {
      console.error('Settlement error:', e);
    } finally {
      setIsSettling(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F9FB] p-4 sm:p-6 space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E8EEF2] shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#087F8C]/10 text-[#087F8C]">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-[#172B34] tracking-tight">
                Discharge & Medical Certification Centre
              </h1>
              <p className="text-xs text-[#567781]">
                Centralized clinical dossier workspace for doctors, residents & admins to certify discharge documents before final billing clearance
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard">
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-semibold rounded-xl border-[#E8EEF2] text-[#172B34] hover:bg-[#F6F9FB] cursor-pointer flex items-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5 text-[#087F8C]" />
              <span>Hospital Command Center</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Notification Alert Toast */}
      {notificationMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-xl border border-[#E8EEF2] shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-[#567781] uppercase tracking-wider block">Total In Discharge Queue</span>
          <div className="flex items-baseline justify-between">
            <strong className="text-2xl font-black text-[#172B34] font-mono">{metrics.total}</strong>
            <span className="text-xs text-[#087F8C] font-semibold">Patients</span>
          </div>
        </div>

        <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block">⏳ Pending Doctor Cert</span>
          <div className="flex items-baseline justify-between">
            <strong className="text-2xl font-black text-amber-800 font-mono">{metrics.pendingCert}</strong>
            <span className="text-[11px] text-amber-700 font-medium">Awaiting Docs</span>
          </div>
        </div>

        <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">🟢 Certified & Ready</span>
          <div className="flex items-baseline justify-between">
            <strong className="text-2xl font-black text-emerald-800 font-mono">{metrics.readyForSettle}</strong>
            <span className="text-[11px] text-emerald-700 font-medium">Ready for Billing</span>
          </div>
        </div>

        <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider block">🧹 Vacated & Cleaning</span>
          <div className="flex items-baseline justify-between">
            <strong className="text-2xl font-black text-indigo-800 font-mono">{metrics.settledToday}</strong>
            <span className="text-[11px] text-indigo-700 font-medium">Turnover</span>
          </div>
        </div>
      </div>

      {/* Main Queue Management Section */}
      <div className="bg-white rounded-2xl border border-[#E8EEF2] shadow-xs overflow-hidden">
        {/* Filter Bar */}
        <div className="p-4 border-b border-[#E8EEF2] flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#F6F9FB]/50">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setSelectedStatusTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                selectedStatusTab === 'ALL'
                  ? 'bg-[#172B34] text-white shadow-2xs'
                  : 'text-[#567781] hover:bg-white'
              }`}
            >
              All Inpatient Requests ({metrics.total})
            </button>

            <button
              type="button"
              onClick={() => setSelectedStatusTab('PENDING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                selectedStatusTab === 'PENDING'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-amber-800 hover:bg-amber-50'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Pending Certification ({metrics.pendingCert})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedStatusTab('READY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                selectedStatusTab === 'READY'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Certified & Ready for Settle ({metrics.readyForSettle})</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#567781] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search patient, bed, UHID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 bg-white border border-[#E8EEF2] rounded-lg text-xs"
              />
            </div>
          </div>
        </div>

        {/* Patients Table */}
        {filteredQueue.length === 0 ? (
          <div className="p-12 text-center space-y-2 max-w-sm mx-auto">
            <FileCheck2 className="w-10 h-10 text-[#567781]/40 mx-auto" />
            <h4 className="text-sm font-bold text-[#172B34]">No Patients in Discharge Queue</h4>
            <p className="text-xs text-[#567781]">
              When doctors or nursing staff mark an admitted patient as <strong>"Plan Discharge"</strong>, they will appear here for certificate preparation.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E8EEF2] text-[#567781] text-[10px] uppercase font-bold bg-[#F6F9FB]">
                  <th className="p-3">Bed / Ward</th>
                  <th className="p-3">Patient & UHID</th>
                  <th className="p-3">Admitting Diagnosis</th>
                  <th className="p-3">Planned Departure</th>
                  <th className="p-3">Clinical Dossier Status</th>
                  <th className="p-3">Financial Due</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8EEF2] text-[11.5px]">
                {filteredQueue.map((bed) => {
                  const fin = getBedFinancials(bed);
                  const isReady = bed.dischargePlan?.dossierStatus === 'DOCS_CERTIFIED_READY';

                  return (
                    <tr key={bed.id} className="hover:bg-[#F6F9FB]/60 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold px-2 py-0.5 rounded bg-[#172B34] text-white text-[10.5px]">
                            {bed.bedNumber}
                          </span>
                          <span className="text-[#567781] font-semibold">{bed.wardName}</span>
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-[#172B34]">{bed.patientName}</div>
                        <div className="text-[10.5px] text-[#567781]">
                          {bed.patientAgeGender || 'Adult'} • {bed.patientPhone || 'No phone'}
                        </div>
                      </td>

                      <td className="p-3 font-medium text-slate-800">
                        {bed.dischargePlan?.finalDiagnosis || bed.admittingDiagnosis}
                      </td>

                      <td className="p-3">
                        <div className="font-mono font-semibold text-slate-900">
                          {bed.dischargePlan?.plannedDate || 'Today'} at {bed.dischargePlan?.plannedTime || '14:00'}
                        </div>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[#567781] text-[9.5px] font-black uppercase">
                          {bed.dischargePlan?.dischargeType || 'REGULAR'}
                        </span>
                      </td>

                      <td className="p-3">
                        {isReady ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Certified & Ready</span>
                            </span>
                            <div className="text-[10px] text-[#567781]">
                              By {bed.dischargePlan?.certifiedByDoctorName || bed.consultantDoctorName}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Pending Doctor Cert</span>
                            </span>
                            <div className="text-[10px] text-[#567781]">Awaiting certificates</div>
                          </div>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="font-mono font-bold text-slate-900">
                          ₹{fin.balanceDue.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-[#567781]">
                          of ₹{fin.grossTotal.toLocaleString('en-IN')}
                        </div>
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => handleOpenStudio(bed)}
                            className="bg-[#087F8C] hover:bg-[#076b77] text-white text-xs font-bold rounded-lg h-7.5 px-3 border-0 cursor-pointer flex items-center gap-1 shadow-2xs"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>{isReady ? 'Edit Certificates' : 'Prepare Certificates'}</span>
                          </Button>

                          {bed.dischargePlan?.dossierStatus === 'DOCS_CERTIFIED_READY' && (
                            <Button
                              size="sm"
                              onClick={() => handleSendRequestToBilling(bed)}
                              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg h-7.5 px-3 border-0 cursor-pointer flex items-center gap-1 shadow-2xs"
                            >
                              <SendHorizontal className="w-3 h-3" />
                              <span>Send to Billing ⚡</span>
                            </Button>
                          )}

                          {bed.dischargePlan?.dossierStatus === 'SENT_TO_BILLING' && (
                            <Link href="/billing">
                              <Button
                                size="sm"
                                className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg h-7.5 px-3 border-0 cursor-pointer flex items-center gap-1 shadow-2xs"
                              >
                                <span>Open Billing Desk ↗</span>
                              </Button>
                            </Link>
                          )}

                          {bed.dischargePlan?.dossierStatus === 'BILL_PAID_READY_TO_GO' && (
                            <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-900 font-bold text-[10.5px]">
                              ✓ Billed & Ready
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: FULL INTERACTIVE CERTIFICATION STUDIO                            */}
      {/* ========================================================================= */}
      {selectedBed && (
        <div className="fixed inset-0 bg-[#172B34]/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-[#E8EEF2] p-5 space-y-4 max-h-[94vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-[#E8EEF2] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold px-2 py-0.5 rounded bg-[#172B34] text-white text-xs">
                    {selectedBed.bedNumber}
                  </span>
                  <h3 className="text-base font-bold text-[#172B34]">
                    Discharge Certification Studio: {selectedBed.patientName}
                  </h3>
                  <span className="text-xs text-[#567781]">({selectedBed.wardName})</span>
                </div>
                <p className="text-xs text-[#567781] mt-0.5">
                  Prepare, customize & certify official medical certificates before releasing file to billing
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedBed(null)}
                  className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sub-Tab Navigation Bar */}
            <div className="flex items-center gap-1.5 p-1 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveCertSubTab('SUMMARY')}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  activeCertSubTab === 'SUMMARY'
                    ? 'bg-[#172B34] text-white shadow-2xs'
                    : 'text-[#567781] hover:text-[#172B34]'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>1. Discharge Summary</span>
                <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-mono ${
                  editReqSummary ? 'bg-amber-500/30 text-amber-200' : 'bg-slate-200 text-slate-600'
                }`}>
                  {editReqSummary ? 'Needed' : 'Skip'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCertSubTab('FITNESS_CERT')}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  activeCertSubTab === 'FITNESS_CERT'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-[#567781] hover:text-indigo-600'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>2. Sick / Fitness Cert</span>
                <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-mono ${
                  editReqMedCert ? 'bg-indigo-300 text-indigo-950 font-bold' : 'bg-slate-200 text-slate-600'
                }`}>
                  {editReqMedCert ? 'Needed' : 'Skip'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCertSubTab('HOSP_CERT')}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  activeCertSubTab === 'HOSP_CERT'
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'text-[#567781] hover:text-teal-600'
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                <span>3. Hospital Stay Proof</span>
                <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-mono ${
                  editReqHospCert ? 'bg-teal-300 text-teal-950 font-bold' : 'bg-slate-200 text-slate-600'
                }`}>
                  {editReqHospCert ? 'Needed' : 'Skip'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCertSubTab('TAKE_HOME_RX')}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  activeCertSubTab === 'TAKE_HOME_RX'
                    ? 'bg-[#087F8C] text-white shadow-2xs'
                    : 'text-[#567781] hover:text-[#087F8C]'
                }`}
              >
                <Pill className="w-3.5 h-3.5" />
                <span>4. Prescription Chart ({editTakeHomeMeds.length})</span>
                <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-mono ${
                  editReqTakeHomeRx ? 'bg-emerald-300 text-emerald-950 font-bold' : 'bg-slate-200 text-slate-600'
                }`}>
                  {editReqTakeHomeRx ? 'Needed' : 'Skip'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCertSubTab('REFERRAL')}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  activeCertSubTab === 'REFERRAL'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-[#567781] hover:text-rose-600'
                }`}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>5. Referral Memo</span>
                <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-mono ${
                  editReqReferralMemo ? 'bg-rose-300 text-rose-950 font-bold' : 'bg-slate-200 text-slate-600'
                }`}>
                  {editReqReferralMemo ? 'Needed' : 'Skip'}
                </span>
              </button>
            </div>

            {/* TAB CONTENT 1: DISCHARGE SUMMARY */}
            {activeCertSubTab === 'SUMMARY' && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Clinical Stay Summary & Diagnosis</h4>
                    <p className="text-[11px] text-slate-500">Comprehensive legal record of inpatient medical management</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setPrintSummaryBed(selectedBed)}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg h-7 px-3 border-0 cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Discharge Summary</span>
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-900">Final Confirmed Diagnosis *</label>
                    <input
                      type="text"
                      value={editFinalDiagnosis}
                      onChange={(e) => setEditFinalDiagnosis(e.target.value)}
                      placeholder="e.g. Acute Appendicitis - Post Laparoscopic Appendectomy"
                      className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-900">Condition on Departure *</label>
                    <input
                      type="text"
                      value={editConditionAtDischarge}
                      onChange={(e) => setEditConditionAtDischarge(e.target.value)}
                      placeholder="e.g. Hemodynamically stable, afebrile, ambulatory."
                      className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-900">Hospital Stay Course & Interventions</label>
                    <textarea
                      rows={3}
                      value={editHospitalCourse}
                      onChange={(e) => setEditHospitalCourse(e.target.value)}
                      placeholder="Investigations, clinical progress, surgeries done..."
                      className="w-full p-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-900">Home Care & Dietary Advice</label>
                    <textarea
                      rows={3}
                      value={editDietAdvice}
                      onChange={(e) => setEditDietAdvice(e.target.value)}
                      placeholder="Diet instructions, wound dressings, fluid intake..."
                      className="w-full p-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-900">Follow-up Schedule</label>
                    <input
                      type="text"
                      value={editFollowUpDate}
                      onChange={(e) => setEditFollowUpDate(e.target.value)}
                      className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-900">Follow-up Consultant</label>
                    <input
                      type="text"
                      value={editFollowUpDoctor}
                      onChange={(e) => setEditFollowUpDoctor(e.target.value)}
                      className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-900">Emergency Red Flag Signs</label>
                    <input
                      type="text"
                      value={editEmergencySigns}
                      onChange={(e) => setEditEmergencySigns(e.target.value)}
                      className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: MEDICAL FITNESS & SICKNESS CERTIFICATE */}
            {activeCertSubTab === 'FITNESS_CERT' && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-2">
                  <div>
                    <h4 className="font-bold text-indigo-950 text-sm">Official Medical Fitness & Sickness Leave Certificate</h4>
                    <p className="text-[11px] text-slate-500">Legal medical rest period and fit-to-resume certificate with doctor registration seal</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setPrintMedCertBed(selectedBed)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg h-7 px-3 border-0 cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Medical Certificate</span>
                  </Button>
                </div>

                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-indigo-950">Certificate Type</label>
                    <select
                      value={editMedCertType}
                      onChange={(e) => setEditMedCertType(e.target.value as any)}
                      className="w-full h-8 px-2 bg-white border border-indigo-200 rounded-lg text-xs font-semibold"
                    >
                      <option value="BOTH">Sickness Rest & Fitness to Resume (Complete)</option>
                      <option value="SICKNESS_REST">Sickness / Medical Leave Only</option>
                      <option value="FITNESS_RESUME">Fitness to Resume Duty Only</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-indigo-950">Rest Start Date</label>
                    <input
                      type="date"
                      value={editMedCertStartDate}
                      onChange={(e) => setEditMedCertStartDate(e.target.value)}
                      className="w-full h-8 px-2.5 bg-white border border-indigo-200 rounded-lg text-xs font-mono font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-indigo-950">Rest End Date</label>
                    <input
                      type="date"
                      value={editMedCertEndDate}
                      onChange={(e) => setEditMedCertEndDate(e.target.value)}
                      className="w-full h-8 px-2.5 bg-white border border-indigo-200 rounded-lg text-xs font-mono font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-900">Fit to Resume Duty From Date *</label>
                    <input
                      type="date"
                      value={editMedCertFitDate}
                      onChange={(e) => setEditMedCertFitDate(e.target.value)}
                      className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs font-mono font-bold text-emerald-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-900">Special Medical Limitations / Remarks</label>
                    <input
                      type="text"
                      value={editMedCertRemarks}
                      onChange={(e) => setEditMedCertRemarks(e.target.value)}
                      placeholder="e.g. Advised light desk duties for 3 days."
                      className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: HOSPITALIZATION PROOF */}
            {activeCertSubTab === 'HOSP_CERT' && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-2">
                  <div>
                    <h4 className="font-bold text-teal-950 text-sm">Certificate of Inpatient Hospitalization (Proof of Stay)</h4>
                    <p className="text-[11px] text-slate-500">Official proof of admission for Mediclaim / Insurance Reimbursement & Employers</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setPrintHospCertBed(selectedBed)}
                    className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg h-7 px-3 border-0 cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Stay Certificate</span>
                  </Button>
                </div>

                <div className="p-4 bg-teal-50/50 rounded-xl border border-teal-100 space-y-3">
                  <div className="space-y-1">
                    <label className="font-bold text-teal-950">Purpose of Certification</label>
                    <input
                      type="text"
                      value={editHospPurpose}
                      onChange={(e) => setEditHospPurpose(e.target.value)}
                      placeholder="e.g. Mediclaim / Health Insurance Reimbursement & Official Employer Record"
                      className="w-full h-8 px-2.5 bg-white border border-teal-200 rounded-lg text-xs font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-teal-800 uppercase block">Admission Period on Record:</span>
                      <strong className="text-teal-950 font-mono">
                        {selectedBed.admissionDate} {selectedBed.admissionTime || '10:00 AM'} to {selectedBed.dischargePlan?.plannedDate || 'Today'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-teal-800 uppercase block">Treating Consultant:</span>
                      <strong className="text-slate-900">
                        {selectedBed.consultantDoctorName || 'Dr. Patil, MD'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 4: TAKE-HOME PRESCRIPTION */}
            {activeCertSubTab === 'TAKE_HOME_RX' && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-2">
                  <div>
                    <h4 className="font-bold text-[#087F8C] text-sm">Take-Home Discharge Prescription Chart</h4>
                    <p className="text-[11px] text-slate-500">Post-discharge medication instructions, dosages, and food timing</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleAddMedRow}
                    className="bg-[#087F8C] hover:bg-[#076b77] text-white text-xs font-bold rounded-lg h-7 px-3 border-0 cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Medicine</span>
                  </Button>
                </div>

                <div className="space-y-2">
                  {editTakeHomeMeds.map((med) => (
                    <div key={med.id} className="p-2 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] grid grid-cols-12 gap-2 items-center text-xs">
                      <div className="col-span-12 sm:col-span-4">
                        <input
                          type="text"
                          required
                          value={med.name}
                          onChange={(e) => handleUpdateMedRow(med.id, 'name', e.target.value)}
                          placeholder="Medicine name (e.g. Tab Augmentin 625)"
                          className="w-full h-7.5 px-2 bg-white border border-[#E8EEF2] rounded text-xs font-semibold"
                        />
                      </div>

                      <div className="col-span-6 sm:col-span-2">
                        <input
                          type="text"
                          value={med.dosage}
                          onChange={(e) => handleUpdateMedRow(med.id, 'dosage', e.target.value)}
                          placeholder="Dose (625mg)"
                          className="w-full h-7.5 px-2 bg-white border border-[#E8EEF2] rounded text-xs"
                        />
                      </div>

                      <div className="col-span-6 sm:col-span-2">
                        <select
                          value={med.frequency}
                          onChange={(e) => handleUpdateMedRow(med.id, 'frequency', e.target.value)}
                          className="w-full h-7.5 px-1.5 bg-white border border-[#E8EEF2] rounded text-xs font-medium cursor-pointer"
                        >
                          <option value="1-0-1 (Twice daily)">1-0-1 (Twice)</option>
                          <option value="1-1-1 (Thrice daily)">1-1-1 (Thrice)</option>
                          <option value="1-0-0 (Once Morning)">1-0-0 (Morning)</option>
                          <option value="0-0-1 (Once Night)">0-0-1 (Night)</option>
                          <option value="1-1-1-1 (Four times)">1-1-1-1 (QID)</option>
                          <option value="SOS (As needed)">SOS (As needed)</option>
                        </select>
                      </div>

                      <div className="col-span-5 sm:col-span-1">
                        <input
                          type="text"
                          value={med.duration}
                          onChange={(e) => handleUpdateMedRow(med.id, 'duration', e.target.value)}
                          placeholder="5 Days"
                          className="w-full h-7.5 px-1.5 text-center bg-white border border-[#E8EEF2] rounded text-xs font-mono font-semibold"
                        />
                      </div>

                      <div className="col-span-5 sm:col-span-2">
                        <input
                          type="text"
                          value={med.timing || ''}
                          onChange={(e) => handleUpdateMedRow(med.id, 'timing', e.target.value)}
                          placeholder="After food (PC)"
                          className="w-full h-7.5 px-2 bg-white border border-[#E8EEF2] rounded text-xs"
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1 flex justify-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveMedRow(med.id)}
                          className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT 5: REFERRAL & TRANSFER MEMO */}
            {activeCertSubTab === 'REFERRAL' && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-2">
                  <div>
                    <h4 className="font-bold text-rose-950 text-sm">Inter-Hospital Clinical Referral & Transfer Memo</h4>
                    <p className="text-[11px] text-slate-500">Official handover note for escalation to tertiary medical center</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setPrintReferralMemoBed(selectedBed)}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg h-7 px-3 border-0 cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Referral Memo</span>
                  </Button>
                </div>

                <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-rose-950">Destination Hospital *</label>
                    <input
                      type="text"
                      value={editReferralHospital}
                      onChange={(e) => setEditReferralHospital(e.target.value)}
                      placeholder="e.g. City Institute of Medical Sciences (CIMS)"
                      className="w-full h-8 px-2.5 bg-white border border-rose-200 rounded-lg text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-rose-950">Transport Mode & Staff</label>
                    <input
                      type="text"
                      value={editReferralTransport}
                      onChange={(e) => setEditReferralTransport(e.target.value)}
                      placeholder="e.g. Cardiac ALS Ambulance with Medical Escort"
                      className="w-full h-8 px-2.5 bg-white border border-rose-200 rounded-lg text-xs"
                    />
                  </div>

                  <div className="col-span-2 space-y-1">
                    <label className="font-bold text-rose-950">Reason for Referral & Escalation</label>
                    <textarea
                      rows={2}
                      value={editReferralReason}
                      onChange={(e) => setEditReferralReason(e.target.value)}
                      placeholder="Detailed reason for clinical transfer..."
                      className="w-full p-2 bg-white border border-rose-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Modal Bottom Actions: Save Draft vs THE REVERT ACTION */}
            <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#E8EEF2]">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSaveDraft}
                  className="h-8.5 text-xs font-bold rounded-xl border-[#E8EEF2] cursor-pointer"
                >
                  Save Draft
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedBed(null)}
                  className="h-8.5 text-xs rounded-xl cursor-pointer"
                >
                  Close
                </Button>
              </div>

              {/* THE CORE DOCTOR REVERT ACTION */}
              <Button
                type="button"
                size="sm"
                onClick={handleCertifyAndRevertToInpatientFile}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8.5 px-5 rounded-xl border-0 cursor-pointer shadow-md flex items-center gap-2"
              >
                <SendHorizontal className="w-4 h-4" />
                <span>
                  ✓ Certify Selected ({[editReqSummary, editReqMedCert, editReqHospCert, editReqTakeHomeRx, editReqReferralMemo].filter(Boolean).length}) & Revert to File
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: SETTLE DISCHARGE & CLEAR BED (FINANCIAL HANDOVER)                 */}
      {/* ========================================================================= */}
      {showSettleModal && settleBed && (() => {
        const fin = getBedFinancials(settleBed);

        return (
          <div className="fixed inset-0 bg-[#172B34]/60 backdrop-blur-xs flex items-center justify-center p-3 z-60 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-[#E8EEF2] p-5 space-y-4">
              <div className="flex justify-between items-start border-b border-[#E8EEF2] pb-3">
                <div>
                  <h3 className="text-base font-bold text-rose-900 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Final Inpatient Settlement & Bed Turnover</span>
                  </h3>
                  <p className="text-xs text-[#567781]">Bed {settleBed.bedNumber} • {settleBed.patientName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSettleModal(false)}
                  className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-gradient-to-br from-[#F6F9FB] to-white rounded-xl border border-[#E8EEF2] space-y-2 text-xs">
                <div className="flex justify-between items-center text-[#567781]">
                  <span>Gross Incurred Stay ({fin.stayDays}d):</span>
                  <strong className="font-mono text-[#172B34] text-sm">₹{fin.grossTotal.toLocaleString('en-IN')}</strong>
                </div>
                <div className="flex justify-between items-center text-emerald-700">
                  <span>Advance Deposits Paid:</span>
                  <strong className="font-mono text-sm">₹{fin.advances.toLocaleString('en-IN')}</strong>
                </div>
                <div className="pt-2 border-t border-[#E8EEF2] flex justify-between items-center text-base font-bold">
                  <span className={fin.balanceDue > 0 ? 'text-rose-900' : 'text-emerald-900'}>
                    {fin.balanceDue > 0 ? 'Balance Due:' : 'Status:'}
                  </span>
                  <span className={`font-mono text-lg ${fin.balanceDue > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {fin.balanceDue > 0 ? `₹${fin.balanceDue.toLocaleString('en-IN')}` : 'CLEARED (₹0)'}
                  </span>
                </div>
              </div>

              <form onSubmit={handleConfirmFinalSettle} className="space-y-3 text-xs">
                {fin.balanceDue > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-[#172B34]">Payment Mode *</label>
                      <select
                        value={settlePaymentMode}
                        onChange={(e) => setSettlePaymentMode(e.target.value)}
                        className="w-full h-8.5 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs font-semibold"
                      >
                        <option value="UPI">UPI / QR Code Scan</option>
                        <option value="CASH">Cash at Billing Counter</option>
                        <option value="CARD">Credit / Debit Card</option>
                        <option value="TPA_INSURANCE">TPA / Cashless Claim</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-[#172B34]">Notes / UTR</label>
                      <input
                        type="text"
                        value={settleNotes}
                        onChange={(e) => setSettleNotes(e.target.value)}
                        className="w-full h-8.5 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                      />
                    </div>
                  </div>
                )}

                <div className="p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-lg text-[11px] text-indigo-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Bed will automatically transition to <strong>🧹 Sanitization (Cleaning)</strong> for housekeeping.</span>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-[#E8EEF2]">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSettleModal(false)}
                    className="h-8.5 text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSettling}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8.5 px-5 rounded-lg border-0 cursor-pointer shadow-xs"
                  >
                    {isSettling ? 'Processing...' : 'Confirm Clearance & Release Bed ✓'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* PRINT PREVIEW DIALOGS                                                     */}
      {/* ========================================================================= */}
      {printSummaryBed && (
        <div className="fixed inset-0 bg-[#172B34]/70 backdrop-blur-xs flex items-center justify-center p-3 z-60 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-[#E8EEF2] p-5 space-y-4 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#E8EEF2] pb-3 no-print">
              <div>
                <h3 className="text-sm font-bold text-[#172B34]">Official Inpatient Discharge Summary Dossier</h3>
                <p className="text-[11px] text-[#567781]">Bed {printSummaryBed.bedNumber} • {printSummaryBed.patientName}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg h-7.5 px-3 border-0 cursor-pointer flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Summary</span>
                </Button>
                <button
                  type="button"
                  onClick={() => setPrintSummaryBed(null)}
                  className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <DischargeSummaryPrintDocument
              clinic={clinic}
              doctor={doctors[0]}
              patient={patients.find((p) => p.id === printSummaryBed.patientId) || {
                id: printSummaryBed.patientId,
                name: printSummaryBed.patientName,
                phone: printSummaryBed.patientPhone,
                gender: printSummaryBed.patientGender as any
              }}
              admissionDetails={{
                uhid: `UHID-${printSummaryBed.patientId?.substring(0, 8).toUpperCase() || '2026'}`,
                ipdNumber: printSummaryBed.ipdNumber || 'IPD-2026-9042',
                admissionDateTime: `${printSummaryBed.admissionDate || 'Today'} ${printSummaryBed.admissionTime || '10:00 AM'}`,
                dischargeDateTime: `${printSummaryBed.dischargePlan?.plannedDate || new Date().toISOString().split('T')[0]} ${printSummaryBed.dischargePlan?.plannedTime || '02:00 PM'}`,
                roomWardBed: `${printSummaryBed.wardName} (Bed ${printSummaryBed.bedNumber})`,
                dischargeType: printSummaryBed.dischargePlan?.dischargeType || 'REGULAR',
                conditionAtDischarge: printSummaryBed.dischargePlan?.conditionAtDischarge || 'Hemodynamically stable, afebrile, ambulatory.',
                finalDiagnosis: printSummaryBed.dischargePlan?.finalDiagnosis || printSummaryBed.admittingDiagnosis || 'Inpatient Clinical Care',
                hospitalCourseAndProcedures: printSummaryBed.dischargePlan?.hospitalCourse || 'Patient responded favorably to conservative and targeted clinical management.',
                dietAndActivityAdvice: printSummaryBed.dischargePlan?.dietaryAdvice || 'Balanced diet with adequate hydration. Avoid heavy exertion.',
                followUpDate: printSummaryBed.dischargePlan?.followUpDate || 'After 7 days in OPD with Attending Consultant',
                emergencyWarningSigns: printSummaryBed.dischargePlan?.emergencyAlertSigns || 'High fever, persistent pain, severe vomiting, breathlessness.',
                dischargeMedications: (printSummaryBed.dischargePlan?.takeHomeMedications || []).map((m) => ({
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

      {printMedCertBed && (
        <div className="fixed inset-0 bg-[#172B34]/70 backdrop-blur-xs flex items-center justify-center p-3 z-60 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-[#E8EEF2] p-5 space-y-4 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#E8EEF2] pb-3 no-print">
              <div>
                <h3 className="text-sm font-bold text-[#172B34]">Official Medical Fitness & Sickness Leave Certificate</h3>
                <p className="text-[11px] text-[#567781]">Bed {printMedCertBed.bedNumber} • {printMedCertBed.patientName}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg h-7.5 px-3 border-0 cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Certificate</span>
                </Button>
                <button
                  type="button"
                  onClick={() => setPrintMedCertBed(null)}
                  className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <MedicalCertificatePrintDocument
              clinic={clinic}
              doctor={doctors[0]}
              patient={patients.find((p) => p.id === printMedCertBed.patientId) || {
                id: printMedCertBed.patientId,
                name: printMedCertBed.patientName || 'Inpatient Patient',
                phone: printMedCertBed.patientPhone,
                gender: printMedCertBed.patientGender as any
              }}
              certificateDetails={{
                certificateNumber: `MC-${printMedCertBed.bedNumber}-${Math.floor(1000 + Math.random() * 9000)}`,
                certificateDate: new Date().toISOString().split('T')[0],
                certificateType: printMedCertBed.dischargePlan?.medicalCertificate?.type || 'BOTH',
                diagnosis: printMedCertBed.dischargePlan?.medicalCertificate?.reason || printMedCertBed.dischargePlan?.finalDiagnosis || printMedCertBed.admittingDiagnosis || 'Acute Inpatient Illness',
                restStartDate: printMedCertBed.dischargePlan?.medicalCertificate?.restStartDate || printMedCertBed.admissionDate || '2026-08-28',
                restEndDate: printMedCertBed.dischargePlan?.medicalCertificate?.restEndDate || printMedCertBed.dischargePlan?.plannedDate || new Date().toISOString().split('T')[0],
                fitToResumeDate: printMedCertBed.dischargePlan?.medicalCertificate?.fitToResumeDate || printMedCertBed.dischargePlan?.plannedDate || new Date().toISOString().split('T')[0],
                remarks: printMedCertBed.dischargePlan?.medicalCertificate?.remarks || 'Patient is advised light routine activities.',
                consultantDoctorName: printMedCertBed.consultantDoctorName,
                consultantRegistrationNo: doctors[0]?.registrationNumber
              }}
            />
          </div>
        </div>
      )}

      {printHospCertBed && (
        <div className="fixed inset-0 bg-[#172B34]/70 backdrop-blur-xs flex items-center justify-center p-3 z-60 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-[#E8EEF2] p-5 space-y-4 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#E8EEF2] pb-3 no-print">
              <div>
                <h3 className="text-sm font-bold text-[#172B34]">Official Inpatient Hospitalization Stay Certificate</h3>
                <p className="text-[11px] text-[#567781]">Bed {printHospCertBed.bedNumber} • {printHospCertBed.patientName}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg h-7.5 px-3 border-0 cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Stay Certificate</span>
                </Button>
                <button
                  type="button"
                  onClick={() => setPrintHospCertBed(null)}
                  className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <HospitalizationCertificatePrintDocument
              clinic={clinic}
              doctor={doctors[0]}
              patient={patients.find((p) => p.id === printHospCertBed.patientId) || {
                id: printHospCertBed.patientId,
                name: printHospCertBed.patientName || 'Inpatient Patient',
                phone: printHospCertBed.patientPhone,
                gender: printHospCertBed.patientGender as any
              }}
              stayDetails={{
                certificateNumber: `HOSP-${printHospCertBed.bedNumber}-${Math.floor(1000 + Math.random() * 9000)}`,
                certificateDate: new Date().toISOString().split('T')[0],
                ipdNumber: printHospCertBed.ipdNumber || 'IPD-2026-9042',
                uhid: `UHID-${printHospCertBed.patientId?.substring(0, 8).toUpperCase() || '2026'}`,
                admissionDateTime: `${printHospCertBed.admissionDate || 'Today'} ${printHospCertBed.admissionTime || '10:00 AM'}`,
                dischargeDateTime: `${printHospCertBed.dischargePlan?.plannedDate || new Date().toISOString().split('T')[0]} ${printHospCertBed.dischargePlan?.plannedTime || '02:00 PM'}`,
                wardRoomBed: `${printHospCertBed.wardName} (Bed ${printHospCertBed.bedNumber})`,
                treatingDoctor: printHospCertBed.consultantDoctorName || doctors[0]?.name || 'Dr. Patil, MD',
                diagnosis: printHospCertBed.dischargePlan?.finalDiagnosis || printHospCertBed.admittingDiagnosis || 'Inpatient Clinical Care',
                purpose: printHospCertBed.dischargePlan?.hospitalizationCertificate?.purpose || 'Mediclaim / Health Insurance Reimbursement & Employer Record'
              }}
            />
          </div>
        </div>
      )}

      {printReferralMemoBed && (
        <div className="fixed inset-0 bg-[#172B34]/70 backdrop-blur-xs flex items-center justify-center p-3 z-60 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-[#E8EEF2] p-5 space-y-4 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#E8EEF2] pb-3 no-print">
              <div>
                <h3 className="text-sm font-bold text-[#172B34]">Official Inter-Hospital Clinical Referral & Transfer Memo</h3>
                <p className="text-[11px] text-[#567781]">Bed {printReferralMemoBed.bedNumber} • {printReferralMemoBed.patientName}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg h-7.5 px-3 border-0 cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Referral Memo</span>
                </Button>
                <button
                  type="button"
                  onClick={() => setPrintReferralMemoBed(null)}
                  className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <ReferralMemoPrintDocument
              clinic={clinic}
              doctor={doctors[0]}
              patient={patients.find((p) => p.id === printReferralMemoBed.patientId) || {
                id: printReferralMemoBed.patientId,
                name: printReferralMemoBed.patientName || 'Inpatient Patient',
                phone: printReferralMemoBed.patientPhone,
                gender: printReferralMemoBed.patientGender as any
              }}
              referralDetails={{
                memoNumber: `REF-${printReferralMemoBed.bedNumber}-${Math.floor(1000 + Math.random() * 9000)}`,
                memoDate: `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                destinationHospital: printReferralMemoBed.dischargePlan?.referralMemo?.destinationHospital || 'City Institute of Medical Sciences (CIMS)',
                reasonForReferral: printReferralMemoBed.dischargePlan?.referralMemo?.transferReason || 'Requires advanced tertiary ICU care & specialized interventions.',
                provisionalDiagnosis: printReferralMemoBed.dischargePlan?.finalDiagnosis || printReferralMemoBed.admittingDiagnosis || 'Clinical Inpatient Care',
                clinicalSummaryAndInterventions: printReferralMemoBed.dischargePlan?.hospitalCourse || 'Patient received medical stabilization and conservative therapy prior to transfer.',
                currentVitalsAtTransfer: printReferralMemoBed.dischargePlan?.referralMemo?.clinicalConditionAtTransfer || 'BP 120/80 mmHg, HR 78 bpm, SpO2 99% on RA',
                transportMode: printReferralMemoBed.dischargePlan?.referralMemo?.transportMode || 'Cardiac ALS Ambulance with Medical Escort',
                referringDoctorName: printReferralMemoBed.consultantDoctorName || doctors[0]?.name || 'Dr. Patil, MD'
              }}
            />
          </div>
        </div>
      )}

      {printInvoiceBed && (() => {
        const fin = getBedFinancials(printInvoiceBed);
        const invPatient = patients.find((p) => p.id === printInvoiceBed.patientId) || {
          id: printInvoiceBed.patientId,
          name: printInvoiceBed.patientName,
          phone: printInvoiceBed.patientPhone,
          gender: printInvoiceBed.patientGender as any
        };

        const invoiceItems = [
          {
            description: `${printInvoiceBed.wardName} Stay (${printInvoiceBed.bedNumber})`,
            rate: printInvoiceBed.dailyRate,
            quantity: fin.stayDays,
            total: printInvoiceBed.dailyRate * fin.stayDays
          },
          ...(printInvoiceBed.billingCharges || []).map((c) => ({
            description: c.serviceName,
            rate: c.unitPrice,
            quantity: c.quantity,
            total: c.totalAmount
          }))
        ];

        return (
          <div className="fixed inset-0 bg-[#172B34]/70 backdrop-blur-xs flex items-center justify-center p-3 z-60 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-[#E8EEF2] p-5 space-y-4 max-h-[95vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b border-[#E8EEF2] pb-3 no-print">
                <div>
                  <h3 className="text-sm font-bold text-[#172B34]">Official Itemized Tax Invoice</h3>
                  <p className="text-[11px] text-[#567781]">Bed {printInvoiceBed.bedNumber} • {printInvoiceBed.patientName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => window.print()}
                    className="bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs rounded-lg h-7.5 px-3 border-0 cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Invoice</span>
                  </Button>
                  <button
                    type="button"
                    onClick={() => setPrintInvoiceBed(null)}
                    className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <InvoicePrintDocument
                clinic={clinic}
                doctor={doctors[0]}
                patient={invPatient}
                invoiceNumber={`INV-IPD-${printInvoiceBed.bedNumber}-${Math.floor(1000 + Math.random() * 9000)}`}
                invoiceDate={new Date().toISOString().split('T')[0]}
                items={invoiceItems}
                subtotal={fin.grossTotal}
                grandTotal={fin.grossTotal}
                paymentStatus={fin.balanceDue <= 0 ? 'PAID' : 'PARTIAL'}
                notes="Thank you for trusting us with your healthcare. We wish you a speedy and complete recovery."
              />
            </div>
          </div>
        );
      })()}
    </div>
  );
}
