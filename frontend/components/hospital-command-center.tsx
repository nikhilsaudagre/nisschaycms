'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  HospitalBed,
  OtSurgery,
  EmergencyTriageCase,
  BedStatus,
  TriageAcuity,
  Doctor,
  Patient,
  Clinic,
  DailyCheckingLog,
  InpatientServiceCharge,
  InpatientAdvancePayment,
  InpatientMedicationOrder,
  InpatientBedLabOrder,
  LabInvestigationOrder,
  TakeHomeMedication,
  DischargePlanData,
  DischargeType
} from '@/types';
import { calculateBedStayFinancials } from '@/lib/financial-calculator';
import { Button } from '@/components/ui/button';
import {
  BedDouble,
  HeartPulse,
  Scissors,
  ShieldAlert,
  Plus,
  Search,
  CheckCircle2,
  X,
  ClipboardList,
  Printer,
  Edit2,
  ExternalLink,
  RefreshCw,
  UserPlus,
  FileText,
  Receipt,
  CreditCard,
  Trash2,
  ChevronRight,
  User,
  Activity,
  Heart,
  Calendar,
  Building,
  DollarSign,
  ShieldCheck,
  AlertCircle,
  Pill,
  FlaskConical,
  Bell,
  BellRing,
  Eye,
  Check,
  LogOut,
  Sparkles,
  CheckCircle,
  CalendarCheck,
  FileSpreadsheet,
  SendHorizontal,
  Award,
  AlertTriangle
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { getCurrentDateTimeStr, formatClinicalDateTime, formatClinicalTime } from '@/lib/utils';
import { DischargeSummaryPrintDocument } from '@/components/discharge-summary-print-document';
import { InvoicePrintDocument } from '@/components/invoice-print-document';
import { MedicalCertificatePrintDocument } from '@/components/medical-certificate-print-document';
import { HospitalizationCertificatePrintDocument } from '@/components/hospitalization-certificate-print-document';
import { ReferralMemoPrintDocument } from '@/components/referral-memo-print-document';

// Standard Hospital Master Service Catalog with Pre-Configured Official Rates
export interface StandardHospitalService {
  id: string;
  name: string;
  category: 'DOCTOR_VISIT' | 'NURSING' | 'PROCEDURE' | 'INVESTIGATION' | 'MEDICATION' | 'OT_SURGERY' | 'OTHER';
  categoryLabel: string;
  price: number;
}

export const HOSPITAL_SERVICE_CATALOG: StandardHospitalService[] = [
  // 1. Doctor Visits & Consultations
  { id: 'srv-doc-round', name: 'Consultant Doctor Daily Ward Round', category: 'DOCTOR_VISIT', categoryLabel: 'Doctor Round', price: 800 },
  { id: 'srv-doc-icu', name: 'ICU Specialist / Intensivist Round', category: 'DOCTOR_VISIT', categoryLabel: 'Doctor Round', price: 1500 },
  { id: 'srv-doc-emg', name: 'Emergency Specialist Bedside Visit', category: 'DOCTOR_VISIT', categoryLabel: 'Doctor Round', price: 1000 },
  { id: 'srv-doc-ref', name: 'Super-Speciality Cross Consultation', category: 'DOCTOR_VISIT', categoryLabel: 'Doctor Round', price: 1200 },

  // 2. Nursing & Care
  { id: 'srv-nur-gen', name: '24hr General Nursing Care & Monitoring', category: 'NURSING', categoryLabel: 'Nursing', price: 500 },
  { id: 'srv-nur-icu', name: '24hr ICU Critical Care 1:1 Nursing', category: 'NURSING', categoryLabel: 'Nursing', price: 1200 },
  { id: 'srv-nur-mon', name: 'Multi-Para Monitor & Infusion Pump Usage', category: 'NURSING', categoryLabel: 'Nursing', price: 800 },

  // 3. Clinical Procedures & Therapy
  { id: 'srv-prc-iv', name: 'IV Cannulation & Infusion Set Insertion', category: 'PROCEDURE', categoryLabel: 'Procedure', price: 350 },
  { id: 'srv-prc-drg', name: 'Wound Dressing & Aseptic Bandage Change', category: 'PROCEDURE', categoryLabel: 'Procedure', price: 400 },
  { id: 'srv-prc-neb', name: 'Nebulization Therapy (Per Session)', category: 'PROCEDURE', categoryLabel: 'Procedure', price: 200 },
  { id: 'srv-prc-oxy', name: 'Continuous Oxygen Therapy (Per Day)', category: 'PROCEDURE', categoryLabel: 'Procedure', price: 1200 },
  { id: 'srv-prc-cath', name: 'Foley Urinary Catheterization', category: 'PROCEDURE', categoryLabel: 'Procedure', price: 600 },
  { id: 'srv-prc-ng', name: 'Ryles Nasogastric Tube Insertion', category: 'PROCEDURE', categoryLabel: 'Procedure', price: 550 },
  { id: 'srv-prc-ecg', name: '12-Lead Electrocardiogram (ECG)', category: 'PROCEDURE', categoryLabel: 'Procedure', price: 350 },
  { id: 'srv-prc-suture', name: 'Minor Suture / Suture Removal Procedure', category: 'PROCEDURE', categoryLabel: 'Procedure', price: 700 },

  // 4. Laboratory & Diagnostics
  { id: 'srv-lab-cbc', name: 'Complete Blood Count (CBC) with ESR', category: 'INVESTIGATION', categoryLabel: 'Lab Test', price: 400 },
  { id: 'srv-lab-elec', name: 'Serum Electrolytes (Na+, K+, Cl-)', category: 'INVESTIGATION', categoryLabel: 'Lab Test', price: 600 },
  { id: 'srv-lab-rft', name: 'Renal Function Test (KFT / RFT)', category: 'INVESTIGATION', categoryLabel: 'Lab Test', price: 750 },
  { id: 'srv-lab-lft', name: 'Liver Function Test (LFT Profile)', category: 'INVESTIGATION', categoryLabel: 'Lab Test', price: 800 },
  { id: 'srv-lab-glu', name: 'Blood Glucose (Fasting / PP / Random)', category: 'INVESTIGATION', categoryLabel: 'Lab Test', price: 150 },
  { id: 'srv-lab-xray', name: 'Digital Chest X-Ray (PA View)', category: 'INVESTIGATION', categoryLabel: 'Imaging', price: 650 },
  { id: 'srv-lab-usg', name: 'Ultrasound Abdomen & Pelvis (USG)', category: 'INVESTIGATION', categoryLabel: 'Imaging', price: 1400 },
  { id: 'srv-lab-crp', name: 'C-Reactive Protein (CRP Quantitative)', category: 'INVESTIGATION', categoryLabel: 'Lab Test', price: 500 },

  // 5. Inpatient Pharmacy & Injections
  { id: 'srv-med-panto', name: 'Inj. Pantocid 40mg IV + Syringe', category: 'MEDICATION', categoryLabel: 'Pharmacy', price: 120 },
  { id: 'srv-med-ns', name: 'IV Normal Saline 0.9% 500ml + Set', category: 'MEDICATION', categoryLabel: 'Pharmacy', price: 150 },
  { id: 'srv-med-rl', name: 'IV Ringer Lactate 500ml + Set', category: 'MEDICATION', categoryLabel: 'Pharmacy', price: 160 },
  { id: 'srv-med-ceftri', name: 'Inj. Ceftriaxone 1gm IV (Antibiotic)', category: 'MEDICATION', categoryLabel: 'Pharmacy', price: 280 },
  { id: 'srv-med-pcm', name: 'Inj. Paracetamol 100ml IV Infusion', category: 'MEDICATION', categoryLabel: 'Pharmacy', price: 180 },
  { id: 'srv-med-pain', name: 'Inj. Dynapar / Tramadol IV Pain Relief', category: 'MEDICATION', categoryLabel: 'Pharmacy', price: 140 },

  // 6. Operation Theatre & Surgery
  { id: 'srv-ot-base', name: 'OT Room, Anesthesia Machine & Sterilization', category: 'OT_SURGERY', categoryLabel: 'OT Suite', price: 4500 },
  { id: 'srv-ot-surg', name: 'Lead Surgeon Major Procedure Fee', category: 'OT_SURGERY', categoryLabel: 'OT Suite', price: 12000 },
  { id: 'srv-ot-anes', name: 'Anesthetist Intra-Op Fee & Monitoring', category: 'OT_SURGERY', categoryLabel: 'OT Suite', price: 3500 },
  { id: 'srv-ot-minor', name: 'Minor OT Daycare Suite & Recovery', category: 'OT_SURGERY', categoryLabel: 'OT Suite', price: 2500 }
];

interface HospitalCommandCenterProps {
  clinic?: Clinic | null;
  doctors: Doctor[];
}

export const HospitalCommandCenter: React.FC<HospitalCommandCenterProps> = ({
  clinic,
  doctors
}) => {
  const [beds, setBeds] = useState<HospitalBed[]>([]);
  const [otSurgeries, setOtSurgeries] = useState<OtSurgery[]>([]);
  const [triageCases, setTriageCases] = useState<EmergencyTriageCase[]>([]);
  const [realPatients, setRealPatients] = useState<Patient[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Active view & filters with Persistence
  const [commandView, setCommandViewState] = useState<'BEDS' | 'OT' | 'TRIAGE'>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const viewParam = urlParams.get('hosp_view');
      if (viewParam === 'BEDS' || viewParam === 'OT' || viewParam === 'TRIAGE') return viewParam;
      const saved = localStorage.getItem('nisschay_hospital_command_view');
      if (saved === 'BEDS' || saved === 'OT' || saved === 'TRIAGE') return saved as any;
    }
    return 'BEDS';
  });

  const setCommandView = (view: 'BEDS' | 'OT' | 'TRIAGE') => {
    setCommandViewState(view);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nisschay_hospital_command_view', view);
      const url = new URL(window.location.href);
      url.searchParams.set('hosp_view', view);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const [selectedWardFilter, setSelectedWardFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Inpatient Bed ID for Modal
  const [selectedBedId, setSelectedBedId] = useState<string | null>(null);
  const [fileActiveTab, setFileActiveTab] = useState<'INFO' | 'ROUNDS' | 'MEDS' | 'LABS' | 'BILLING' | 'DISCHARGE'>('INFO');

  // Medication Tab State (Multi-Row Requisition Queued to Pharmacy)
  const [showAddMedForm, setShowAddMedForm] = useState<boolean>(false);
  const [viewingBedMedModal, setViewingBedMedModal] = useState<InpatientMedicationOrder | null>(null);
  const [medStaffNurse, setMedStaffNurse] = useState<string>('Duty Staff Nurse');
  const [medPrescribingDoctor, setMedPrescribingDoctor] = useState<string>('');
  const [medRows, setMedRows] = useState<Array<{
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    source: 'HOSPITAL_PHARMACY' | 'OUTSIDE_PATIENT_OWN';
    notes?: string;
  }>>([
    {
      id: 'bed-med-row-1',
      name: '',
      dosage: '1 Tab / 1 Amp',
      frequency: 'Twice Daily (BD - 1-0-1)',
      source: 'HOSPITAL_PHARMACY',
      notes: ''
    }
  ]);

  // Lab Diagnostics Tab State (In-House vs. Outside Lab)
  const [showAddBedLabForm, setShowAddBedLabForm] = useState<boolean>(false);
  const [bedLabCatalogId, setBedLabCatalogId] = useState<string>(HOSPITAL_SERVICE_CATALOG.find(s => s.category === 'INVESTIGATION')?.id || 'srv-lab-cbc');
  const [bedLabSource, setBedLabSource] = useState<'IN_HOUSE_LAB' | 'OUTSIDE_DIAGNOSTIC'>('IN_HOUSE_LAB');
  const [bedLabNotes, setBedLabNotes] = useState<string>('');

  // Doctor Urgent Alert Modal State
  const [showAlertModal, setShowAlertModal] = useState<boolean>(false);
  const [alertReason, setAlertReason] = useState<string>('SpO2 drop below 92% - Bedside review requested');
  const [alertPriority, setAlertPriority] = useState<'CRITICAL' | 'HIGH' | 'ROUTINE'>('CRITICAL');

  // Edit Patient Record Fields inside Inpatient File Modal
  const [isEditingPatientRecord, setIsEditingPatientRecord] = useState<boolean>(false);
  const [savingRecord, setSavingRecord] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');

  const [editFullName, setEditFullName] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editGender, setEditGender] = useState<string>('MALE');
  const [editDateOfBirth, setEditDateOfBirth] = useState<string>('');
  const [editBloodGroup, setEditBloodGroup] = useState<string>('');
  const [editAddress, setEditAddress] = useState<string>('');
  const [editCity, setEditCity] = useState<string>('');
  const [editGovtId, setEditGovtId] = useState<string>('');
  const [editEmergencyName, setEditEmergencyName] = useState<string>('');
  const [editEmergencyPhone, setEditEmergencyPhone] = useState<string>('');
  const [editAllergies, setEditAllergies] = useState<string>('');
  const [editMedicalHistory, setEditMedicalHistory] = useState<string>('');
  const [editCurrentMedications, setEditCurrentMedications] = useState<string>('');
  const [editInsuranceProvider, setEditInsuranceProvider] = useState<string>('');
  const [editInsurancePolicyNo, setEditInsurancePolicyNo] = useState<string>('');

  // Inpatient Services & Billing State with Master Catalog Auto-Price
  const [showAddServiceForm, setShowAddServiceForm] = useState<boolean>(false);
  const [selectedCatalogServiceId, setSelectedCatalogServiceId] = useState<string>(HOSPITAL_SERVICE_CATALOG[0].id);
  const [serviceQuantity, setServiceQuantity] = useState<string>('1');
  const [serviceNotes, setServiceNotes] = useState<string>('');

  const [showAddAdvanceForm, setShowAddAdvanceForm] = useState<boolean>(false);
  const [advanceAmount, setAdvanceAmount] = useState<string>('2000');
  const [advancePaymentMode, setAdvancePaymentMode] = useState<string>('UPI');
  const [advanceNotes, setAdvanceNotes] = useState<string>('Admission deposit');

  // Itemized Service Ledger Filter & Sort State
  const [ledgerSortOrder, setLedgerSortOrder] = useState<'LAST_TO_FIRST' | 'FIRST_TO_LAST'>('LAST_TO_FIRST');
  const [ledgerCategoryFilter, setLedgerCategoryFilter] = useState<string>('ALL');
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState<string>('');

  // Admit Modal State with Admission Vitals
  const [showAdmitModal, setShowAdmitModal] = useState<boolean>(false);
  const [admitMode, setAdmitMode] = useState<'REGISTERED' | 'NEW_PATIENT'>('REGISTERED');
  const [admitTargetBedId, setAdmitTargetBedId] = useState<string>('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [admitPatientName, setAdmitPatientName] = useState<string>('');
  const [admitAge, setAdmitAge] = useState<string>('');
  const [admitGender, setAdmitGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [admitPhone, setAdmitPhone] = useState<string>('');
  const [admitBloodGroup, setAdmitBloodGroup] = useState<string>('');
  const [admitDiagnosis, setAdmitDiagnosis] = useState<string>('');
  const [admitDoctorName, setAdmitDoctorName] = useState<string>('');
  const [admitInitialNotes, setAdmitInitialNotes] = useState<string>('');
  const [admitInitialDeposit, setAdmitInitialDeposit] = useState<string>('3000');
  
  // Admission Intake Vitals
  const [admitTemp, setAdmitTemp] = useState<string>('98.6');
  const [admitBp, setAdmitBp] = useState<string>('120/80');
  const [admitPulse, setAdmitPulse] = useState<string>('78');
  const [admitSpo2, setAdmitSpo2] = useState<string>('99');
  const [admitRespRate, setAdmitRespRate] = useState<string>('18');
  const [admitWeight, setAdmitWeight] = useState<string>('');
  const [isSubmittingAdmit, setIsSubmittingAdmit] = useState<boolean>(false);

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

  // Surgery Modal (Strictly for Admitted Inpatients)
  const [showSurgeryModal, setShowSurgeryModal] = useState<boolean>(false);
  const [surgName, setSurgName] = useState<string>('');
  const [surgBedId, setSurgBedId] = useState<string>('');
  const [surgRoom, setSurgRoom] = useState<string>('OT-1');
  const [surgDoctor, setSurgDoctor] = useState<string>('');
  const [surgTime, setSurgTime] = useState<string>('02:30 PM');

  // Emergency Modal
  const [showEmgModal, setShowEmgModal] = useState<boolean>(false);
  const [emgPatientName, setEmgPatientName] = useState<string>('');
  const [emgAgeGender, setEmgAgeGender] = useState<string>('');
  const [emgAcuity, setEmgAcuity] = useState<TriageAcuity>('RED_CRITICAL');
  const [emgComplaint, setEmgComplaint] = useState<string>('');
  // Plan & Settle Discharge State
  const [showPlanDischargeModal, setShowPlanDischargeModal] = useState<boolean>(false);
  const [planTargetBedId, setPlanTargetBedId] = useState<string | null>(null);
  const [planDischargeDate, setPlanDischargeDate] = useState<string>('');
  const [planDischargeTime, setPlanDischargeTime] = useState<string>('14:00');
  const [planDischargeType, setPlanDischargeType] = useState<DischargeType>('REGULAR');
  const [planFinalDiagnosis, setPlanFinalDiagnosis] = useState<string>('');
  const [planConditionAtDischarge, setPlanConditionAtDischarge] = useState<string>('Hemodynamically stable, afebrile, ambulatory.');
  const [planHospitalCourse, setPlanHospitalCourse] = useState<string>('Patient responded favorably to conservative and targeted clinical management.');
  const [planDietAdvice, setPlanDietAdvice] = useState<string>('Balanced light diet with adequate hydration. Avoid heavy exertion.');
  const [planGeneralAdvice, setPlanGeneralAdvice] = useState<string>('Regular medications as prescribed. Avoid heavy lifting.');
  const [planFollowUpDate, setPlanFollowUpDate] = useState<string>('After 7 days in OPD');
  const [planFollowUpDoctor, setPlanFollowUpDoctor] = useState<string>('');
  const [planEmergencySigns, setPlanEmergencySigns] = useState<string>('High fever >101°F, chest pain, persistent vomiting, breathlessness.');
  
  // Dynamic Certificate Selection Flags (Only Send Needed Documents)
  const [planReqSummary, setPlanReqSummary] = useState<boolean>(true);
  const [planReqMedCert, setPlanReqMedCert] = useState<boolean>(false);
  const [planReqHospCert, setPlanReqHospCert] = useState<boolean>(false);
  const [planReqTakeHomeRx, setPlanReqTakeHomeRx] = useState<boolean>(true);
  const [planReqReferralMemo, setPlanReqReferralMemo] = useState<boolean>(false);

  const [planTakeHomeMeds, setPlanTakeHomeMeds] = useState<TakeHomeMedication[]>([
    {
      id: `thm-1`,
      name: 'Tab. Augmentin 625mg',
      dosage: '625 mg',
      frequency: '1-0-1 (Twice daily)',
      duration: '5 Days',
      timing: 'After Food (PC)',
      instructions: 'Take with warm water'
    },
    {
      id: `thm-2`,
      name: 'Tab. Pan 40',
      dosage: '40 mg',
      frequency: '1-0-0 (Once daily)',
      duration: '5 Days',
      timing: 'Before Breakfast (AC)',
      instructions: 'Take 30 mins before food'
    }
  ]);

  // Certificate Specific Edit States
  const [planMedCertType, setPlanMedCertType] = useState<'SICKNESS_REST' | 'FITNESS_RESUME' | 'BOTH'>('BOTH');
  const [planMedCertDiagnosis, setPlanMedCertDiagnosis] = useState<string>('');
  const [planMedCertStartDate, setPlanMedCertStartDate] = useState<string>('');
  const [planMedCertEndDate, setPlanMedCertEndDate] = useState<string>('');
  const [planMedCertFitDate, setPlanMedCertFitDate] = useState<string>('');
  const [planMedCertRemarks, setPlanMedCertRemarks] = useState<string>('Advised light duties for 3 days after resumption.');
  const [planHospPurpose, setPlanHospPurpose] = useState<string>('Mediclaim / Health Insurance Reimbursement & Employer Record');
  const [planReferralHospital, setPlanReferralHospital] = useState<string>('City Institute of Medical Sciences (CIMS)');
  const [planReferralReason, setPlanReferralReason] = useState<string>('Requires advanced tertiary evaluation & interventional cardiology care.');
  const [planReferralVitals, setPlanReferralVitals] = useState<string>('BP 120/80 mmHg, HR 78 bpm, SpO2 99% on RA');
  const [planReferralTransport, setPlanReferralTransport] = useState<string>('Cardiac ALS Ambulance with Medical Escort');

  // Certificate Sub-tab in Bed File Modal
  const [certActiveSubTab, setCertActiveSubTab] = useState<'SUMMARY' | 'FITNESS_CERT' | 'HOSP_CERT' | 'REFERRAL' | 'TAKE_HOME_RX'>('SUMMARY');

  // Settle & Final Discharge Modal State
  const [showSettleDischargeModal, setShowSettleDischargeModal] = useState<boolean>(false);
  const [settleTargetBedId, setSettleTargetBedId] = useState<string | null>(null);
  const [settlePaymentMode, setSettlePaymentMode] = useState<string>('UPI');
  const [settleTransactionNotes, setSettleTransactionNotes] = useState<string>('Final Inpatient Settlement & Bed Clearance');
  const [isSettlingDischarge, setIsSettlingDischarge] = useState<boolean>(false);

  // Command Center Printable Document Modals
  const [printDischargeSummaryBed, setPrintDischargeSummaryBed] = useState<HospitalBed | null>(null);
  const [printInvoiceBed, setPrintInvoiceBed] = useState<HospitalBed | null>(null);
  const [printMedCertBed, setPrintMedCertBed] = useState<HospitalBed | null>(null);
  const [printHospCertBed, setPrintHospCertBed] = useState<HospitalBed | null>(null);
  const [printReferralMemoBed, setPrintReferralMemoBed] = useState<HospitalBed | null>(null);

  // Currently viewing bed derived dynamically
  const fileViewingBed = useMemo(() => {
    if (!selectedBedId) return null;
    return beds.find((b) => b.id === selectedBedId) || null;
  }, [beds, selectedBedId]);

  // Dynamic Bed Reconciler
  const reconcileBeds = (existingBeds: HospitalBed[], targetWard: number, targetIcu: number): HospitalBed[] => {
    const wardCount = targetWard > 0 ? targetWard : 10;
    const icuCount = targetIcu > 0 ? targetIcu : 2;

    const existingMap = new Map<string, HospitalBed>();
    existingBeds.forEach((b) => {
      if (b.bedNumber) existingMap.set(b.bedNumber, b);
      if (b.id) existingMap.set(b.id, b);
    });

    const result: HospitalBed[] = [];

    // 1. ICU Critical Care Beds
    for (let i = 1; i <= icuCount; i++) {
      const num = i < 10 ? `ICU-0${i}` : `ICU-${i}`;
      const id = `bed-icu-${i < 10 ? `0${i}` : i}`;
      const existing = existingMap.get(num) || existingMap.get(id);
      if (existing) {
        result.push(existing);
      } else {
        result.push({
          id,
          bedNumber: num,
          wardType: 'ICU_CCU',
          wardName: 'ICU Critical Care',
          floor: '2nd Floor',
          status: 'AVAILABLE',
          dailyRate: 6500,
          hasOxygenSupply: true,
          hasVentilator: i <= 2,
          hasMultiparaMonitor: true,
          dailyLogs: [],
          billingCharges: [],
          advancePayments: []
        });
      }
    }

    // 2. Deluxe Private AC Rooms
    const deluxeCount = Math.max(2, Math.floor(wardCount * 0.3));
    for (let i = 1; i <= deluxeCount; i++) {
      const num = `DLX-${200 + i}`;
      const id = `bed-dlx-${200 + i}`;
      const existing = existingMap.get(num) || existingMap.get(id);
      if (existing) {
        result.push(existing);
      } else {
        result.push({
          id,
          bedNumber: num,
          wardType: 'DELUXE_AC',
          wardName: 'Deluxe Private Suite',
          floor: '3rd Floor',
          status: 'AVAILABLE',
          dailyRate: 3500,
          hasOxygenSupply: true,
          hasMultiparaMonitor: true,
          dailyLogs: [],
          billingCharges: [],
          advancePayments: []
        });
      }
    }

    // 3. Semi-Private Ward Rooms
    const semiCount = Math.max(2, Math.floor(wardCount * 0.3));
    for (let i = 1; i <= semiCount; i++) {
      const num = `SP-${100 + i}A`;
      const id = `bed-sp-${100 + i}`;
      const existing = existingMap.get(num) || existingMap.get(id);
      if (existing) {
        result.push(existing);
      } else {
        result.push({
          id,
          bedNumber: num,
          wardType: 'SEMI_PRIVATE',
          wardName: 'Semi-Private Ward',
          floor: '1st Floor',
          status: 'AVAILABLE',
          dailyRate: 2000,
          hasOxygenSupply: true,
          dailyLogs: [],
          billingCharges: [],
          advancePayments: []
        });
      }
    }

    // 4. General Ward Beds
    const genCount = Math.max(1, wardCount - deluxeCount - semiCount);
    for (let i = 1; i <= genCount; i++) {
      const num = i < 10 ? `GEN-0${i}` : `GEN-${i}`;
      const id = `bed-gm-0${i}`;
      const existing = existingMap.get(num) || existingMap.get(id);
      if (existing) {
        result.push(existing);
      } else {
        result.push({
          id,
          bedNumber: num,
          wardType: i % 2 === 0 ? 'GENERAL_FEMALE' : 'GENERAL_MALE',
          wardName: i % 2 === 0 ? 'General Female Ward' : 'General Male Ward',
          floor: '1st Floor',
          status: 'AVAILABLE',
          dailyRate: 1000,
          hasOxygenSupply: true,
          dailyLogs: [],
          billingCharges: [],
          advancePayments: []
        });
      }
    }

    // 5. Carry over any occupied, discharge planned, or cleaning beds
    existingBeds.forEach((b) => {
      if (
        (b.status === 'OCCUPIED' || b.status === 'DISCHARGE_PLANNED' || b.status === 'CLEANING') &&
        !result.some((r) => r.id === b.id || r.bedNumber === b.bedNumber)
      ) {
        result.push(b);
      }
    });

    return result;
  };

  // Fetch Live Data from Backend Database
  const fetchLiveHospitalData = async (silent = false) => {
    // Skip background poll if user is actively typing in a form
    if (silent && (isEditingPatientRecord || showAddServiceForm || showAddAdvanceForm || showAddRoundForm || showAddMedForm || showAddBedLabForm || showAlertModal || isSubmittingAdmit)) {
      return;
    }

    if (!silent) setLoadingData(true);
    setIsSyncing(true);

    try {
      // 1. Fetch real patients
      const ptsRes = await apiClient.get<{ content: Patient[] }>('/patients', {
        params: { size: 100 }
      });
      const pts = ptsRes.data?.content || [];
      setRealPatients(pts);

      // 2. Fetch live hospital beds state from backend
      const hospRes = await apiClient.get<{ beds?: string; surgeries?: string; triage?: string }>('/clinics/hospital-data');
      const hospData = hospRes.data;

      const targetWard = clinic?.totalBeds || 10;
      const targetIcu = clinic?.totalIcuBeds || 2;

      let rawBeds: HospitalBed[] = [];
      if (hospData?.beds) {
        try {
          const parsed = JSON.parse(hospData.beds);
          if (Array.isArray(parsed)) {
            rawBeds = parsed;
          }
        } catch {}
      }

      const reconciled = reconcileBeds(rawBeds, targetWard, targetIcu);
      setBeds(reconciled);
      localStorage.setItem('nisschay_hospital_beds', JSON.stringify(reconciled));

      // Surgeries
      if (hospData?.surgeries) {
        try {
          setOtSurgeries(JSON.parse(hospData.surgeries));
        } catch {
          setOtSurgeries([]);
        }
      }

      // Triage
      if (hospData?.triage) {
        try {
          setTriageCases(JSON.parse(hospData.triage));
        } catch {
          setTriageCases([]);
        }
      }
    } catch (e) {
      console.error('Failed to fetch live hospital data from backend', e);
      if (beds.length === 0) {
        const targetWard = clinic?.totalBeds || 10;
        const targetIcu = clinic?.totalIcuBeds || 2;
        setBeds(reconcileBeds([], targetWard, targetIcu));
      }
    } finally {
      if (!silent) setLoadingData(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchLiveHospitalData();
  }, [clinic?.totalBeds, clinic?.totalIcuBeds, clinic?.totalOtRooms]);

  // Real-time Polling Interval (every 3 seconds) & Cross-Tab Instant Sync
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLiveHospitalData(true);
    }, 3000);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('nisschay_hospital_sync');
      bc.onmessage = () => {
        fetchLiveHospitalData(true);
      };
    } catch {}

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'nisschay_hospital_beds' || e.key === 'nisschay_sync_tick') {
        fetchLiveHospitalData(true);
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(interval);
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [clinic?.totalBeds, clinic?.totalIcuBeds, isEditingPatientRecord, showAddServiceForm, showAddAdvanceForm, showAddRoundForm, showAddMedForm, showAddBedLabForm]);

  // Open Inpatient File Handler (Initializes form fields cleanly once on click)
  const handleOpenInpatientFile = (bed: HospitalBed) => {
    setSelectedBedId(bed.id);
    setFileActiveTab('INFO');
    setIsEditingPatientRecord(false);
    setSaveSuccessMsg('');
    setShowAddServiceForm(false);
    setShowAddAdvanceForm(false);
    setShowAddRoundForm(false);

    const pt = realPatients.find((p) => p.id === bed.patientId);
    if (pt) {
      setEditFullName(pt.name || bed.patientName || '');
      setEditPhone(pt.phone || bed.patientPhone || '');
      setEditGender(pt.gender || bed.patientGender || 'MALE');
      setEditDateOfBirth(pt.dateOfBirth || '');
      setEditGovtId(pt.governmentId || '');
      setEditBloodGroup(pt.bloodGroup || '');
      setEditAddress(pt.address || '');
      setEditCity(pt.city || '');
      setEditEmergencyName(pt.emergencyContactName || '');
      setEditEmergencyPhone(pt.emergencyContactPhone || '');
      setEditAllergies(pt.allergies || '');
      setEditMedicalHistory(pt.medicalHistory || '');
      setEditCurrentMedications(pt.currentMedications || '');
      setEditInsuranceProvider(pt.insuranceProvider || '');
      setEditInsurancePolicyNo(pt.insurancePolicyNo || '');
    } else {
      setEditFullName(bed.patientName || '');
      setEditPhone(bed.patientPhone || '');
      setEditGender(bed.patientGender || 'MALE');
      setEditDateOfBirth('');
      setEditGovtId('');
      setEditBloodGroup('');
      setEditAddress('');
      setEditCity('');
      setEditEmergencyName('');
      setEditEmergencyPhone('');
      setEditAllergies('');
      setEditMedicalHistory('');
      setEditCurrentMedications('');
      setEditInsuranceProvider('');
      setEditInsurancePolicyNo('');
    }
  };

  const saveToBackend = async (newBeds: HospitalBed[], newSurg?: OtSurgery[], newTriage?: EmergencyTriageCase[]) => {
    try {
      const payload: Record<string, string> = {
        beds: JSON.stringify(newBeds)
      };
      if (newSurg !== undefined) payload.surgeries = JSON.stringify(newSurg);
      if (newTriage !== undefined) payload.triage = JSON.stringify(newTriage);

      await apiClient.post('/clinics/hospital-data', payload);
      localStorage.setItem('nisschay_hospital_beds', JSON.stringify(newBeds));
      localStorage.setItem('nisschay_sync_tick', Date.now().toString());
      window.dispatchEvent(new CustomEvent('hospital-beds-updated', { detail: newBeds }));
      try {
        const bc = new BroadcastChannel('nisschay_hospital_sync');
        bc.postMessage({ type: 'HOSPITAL_DATA_UPDATED', beds: newBeds, timestamp: Date.now() });
        bc.close();
      } catch {}
    } catch (e) {
      console.error('Error saving hospital data to backend:', e);
      localStorage.setItem('nisschay_hospital_beds', JSON.stringify(newBeds));
      localStorage.setItem('nisschay_sync_tick', Date.now().toString());
      window.dispatchEvent(new CustomEvent('hospital-beds-updated', { detail: newBeds }));
    }
  };

  const updateBedsState = (newBeds: HospitalBed[]) => {
    setBeds(newBeds);
    saveToBackend(newBeds, otSurgeries, triageCases);
  };

  // KPI Calculations
  const occupiedBeds = beds.filter((b) => b.status === 'OCCUPIED' || b.status === 'DISCHARGE_PLANNED');
  const availableBeds = beds.filter((b) => b.status === 'AVAILABLE');
  const dischargeBeds = beds.filter((b) => b.status === 'DISCHARGE_PLANNED');

  const icuBeds = beds.filter((b) => b.wardType === 'ICU_CCU');
  const icuOccupied = icuBeds.filter((b) => b.status === 'OCCUPIED' || b.status === 'DISCHARGE_PLANNED');

  const wardOnlyBeds = beds.filter((b) => b.wardType !== 'ICU_CCU');
  const wardOccupied = wardOnlyBeds.filter((b) => b.status === 'OCCUPIED' || b.status === 'DISCHARGE_PLANNED');

  const activeSurgeries = otSurgeries.filter((s) => s.status === 'IN_SURGERY');
  const criticalTriage = triageCases.filter((t) => t.acuity === 'RED_CRITICAL');

  // Filtered beds
  const filteredBeds = useMemo(() => {
    return beds.filter((b) => {
      let matchWard = true;
      if (selectedWardFilter === 'ICU_CCU') {
        matchWard = b.wardType === 'ICU_CCU';
      } else if (selectedWardFilter === 'DELUXE_AC') {
        matchWard = b.wardType === 'DELUXE_AC';
      } else if (selectedWardFilter === 'SEMI_PRIVATE') {
        matchWard = b.wardType === 'SEMI_PRIVATE';
      } else if (selectedWardFilter === 'GENERAL') {
        matchWard = b.wardType.includes('GENERAL') || b.wardType === 'GENERAL_MALE' || b.wardType === 'GENERAL_FEMALE';
      }

      let matchStatus = true;
      if (selectedStatusFilter === 'OCCUPIED') {
        matchStatus = b.status === 'OCCUPIED' || b.status === 'DISCHARGE_PLANNED';
      } else if (selectedStatusFilter === 'AVAILABLE') {
        matchStatus = b.status === 'AVAILABLE';
      } else if (selectedStatusFilter === 'DISCHARGE_PLANNED') {
        matchStatus = b.status === 'DISCHARGE_PLANNED';
      }

      const matchQuery =
        !searchQuery ||
        b.bedNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.wardName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.patientName && b.patientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.admittingDiagnosis && b.admittingDiagnosis.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchWard && matchStatus && matchQuery;
    });
  }, [beds, selectedWardFilter, selectedStatusFilter, searchQuery]);

  // Standardized financial calculator for ANY hospital bed stay
  const getBedLiveFinancials = (bed: HospitalBed) => {
    const fin = calculateBedStayFinancials(bed);
    return {
      stayDays: fin.stayDays,
      bedRent: fin.roomCharges,
      services: fin.servicesTotal,
      grossTotal: fin.grossTotal,
      advances: fin.advances,
      balanceDue: fin.balanceDue
    };
  };

  // Active Viewing Bed Financial Breakdown via Centralized Engine
  const viewingBedFin = useMemo(() => {
    return calculateBedStayFinancials(fileViewingBed);
  }, [fileViewingBed]);

  const bedStayDays = viewingBedFin.stayDays;
  const bedRentTotal = viewingBedFin.roomCharges;
  const servicesTotal = viewingBedFin.servicesTotal;
  const grandTotalIncurred = viewingBedFin.grossTotal;
  const advancePaidTotal = viewingBedFin.advances;
  const netBalanceDue = viewingBedFin.balanceDue;

  // Processed (Filtered & Sorted) Inpatient Billing Charges for File Modal
  const processedBillingCharges = useMemo(() => {
    if (!fileViewingBed || !fileViewingBed.billingCharges) return [];
    let charges = [...fileViewingBed.billingCharges];

    if (ledgerCategoryFilter !== 'ALL') {
      charges = charges.filter((c) => c.category === ledgerCategoryFilter);
    }

    if (ledgerSearchQuery.trim()) {
      const q = ledgerSearchQuery.toLowerCase();
      charges = charges.filter(
        (c) =>
          c.serviceName?.toLowerCase().includes(q) ||
          c.category?.toLowerCase().includes(q) ||
          (c.notes && c.notes.toLowerCase().includes(q))
      );
    }

    if (ledgerSortOrder === 'LAST_TO_FIRST') {
      charges.reverse();
    }

    return charges;
  }, [fileViewingBed, ledgerCategoryFilter, ledgerSearchQuery, ledgerSortOrder]);

  // Handle Bed Sanitization Turnover (Returns CLEANING bed to AVAILABLE)
  const handleMarkBedSanitized = (bedId: string) => {
    const updated = beds.map((b) =>
      b.id === bedId
        ? {
            ...b,
            status: 'AVAILABLE' as BedStatus,
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
            advancePayments: [],
            inpatientMedications: [],
            inpatientLabOrders: [],
            dischargePlan: undefined,
            activeDoctorAlert: undefined
          }
        : b
    );
    updateBedsState(updated);
    if (selectedBedId === bedId) setSelectedBedId(null);
  };

  // Vacate Bed & Move to Cleaning (Triggered once Bill is Paid & Patient is Ready to Go)
  const handleVacateBedAndClean = (bedId: string) => {
    const updated = beds.map((b) =>
      b.id === bedId
        ? {
            ...b,
            status: 'CLEANING' as BedStatus,
            dischargePlan: {
              ...(b.dischargePlan || { dischargeType: 'REGULAR' }),
              dossierStatus: 'SETTLED_DISCHARGED' as const
            }
          }
        : b
    );
    updateBedsState(updated);
    if (selectedBedId === bedId) setSelectedBedId(null);
  };

  // Open Plan Discharge Modal
  const handleOpenPlanDischargeModal = (bed: HospitalBed) => {
    setPlanTargetBedId(bed.id);
    const today = new Date().toISOString().split('T')[0];
    const plan = bed.dischargePlan;

    setPlanDischargeDate(plan?.plannedDate || today);
    setPlanDischargeTime(plan?.plannedTime || '14:00');
    setPlanDischargeType(plan?.dischargeType || 'REGULAR');
    setPlanFinalDiagnosis(plan?.finalDiagnosis || bed.admittingDiagnosis || 'Clinical Inpatient Care');
    setPlanHospitalCourse(plan?.hospitalCourse || 'Patient received supportive and targeted therapy. Responded favorably, afebrile with stable parameters.');
    setPlanConditionAtDischarge(plan?.conditionAtDischarge || 'Hemodynamically stable, afebrile, ambulatory, vitals within normal limits.');
    setPlanDietAdvice(plan?.dietaryAdvice || 'Light, non-spicy balanced diet with adequate oral hydration.');
    setPlanGeneralAdvice(plan?.generalAdvice || 'Take prescribed medicines regularly. Avoid strenuous physical exertion for 1-2 weeks.');
    setPlanFollowUpDate(plan?.followUpDate || 'After 7 days in OPD with Attending Consultant');
    setPlanFollowUpDoctor(plan?.followUpDoctor || bed.consultantDoctorName || (doctors[0]?.name ? `Dr. ${doctors[0].name}` : 'Attending Consultant'));
    setPlanEmergencySigns(plan?.emergencyAlertSigns || 'High fever (>101°F), persistent severe pain, vomiting, or breathing difficulty.');
    
    // Set only needed certificates
    setPlanReqSummary(plan?.includeDischargeSummary !== false);
    setPlanReqMedCert(plan?.medicalCertificate?.isRequired || false);
    setPlanReqHospCert(plan?.hospitalizationCertificate?.isRequired || false);
    setPlanReqTakeHomeRx(plan?.includeTakeHomeRx !== false);
    setPlanReqReferralMemo(plan?.referralMemo?.isRequired || plan?.dischargeType === 'TRANSFER');

    if (plan?.takeHomeMedications && plan.takeHomeMedications.length > 0) {
      setPlanTakeHomeMeds(plan.takeHomeMedications);
    } else {
      setPlanTakeHomeMeds([
        {
          id: `thm-${Date.now()}-1`,
          name: 'Tab. Augmentin 625mg (Amoxicillin + Clavulanate)',
          dosage: '625 mg',
          frequency: '1-0-1 (Twice daily)',
          duration: '5 Days',
          timing: 'After Food (PC)',
          instructions: 'Complete full course with water'
        },
        {
          id: `thm-${Date.now()}-2`,
          name: 'Tab. Pan 40 (Pantoprazole)',
          dosage: '40 mg',
          frequency: '1-0-0 (Once daily)',
          duration: '5 Days',
          timing: 'Before Breakfast (AC)',
          instructions: 'Take 30 mins before morning meal'
        },
        {
          id: `thm-${Date.now()}-3`,
          name: 'Tab. Dolo 650 (Paracetamol)',
          dosage: '650 mg',
          frequency: '1-1-1 (Thrice daily)',
          duration: '3 Days',
          timing: 'After Food (PC)',
          instructions: 'Take if fever or pain persists'
        }
      ]);
    }

    setShowPlanDischargeModal(true);
  };

  // Handler: Save Plan Discharge & Certificates
  const handleSavePlanDischargeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planTargetBedId) return;

    const updatedBeds = beds.map((b) => {
      if (b.id === planTargetBedId) {
        const dischargePlan: DischargePlanData = {
          plannedDate: planDischargeDate,
          plannedTime: planDischargeTime,
          dischargeType: planDischargeType,
          finalDiagnosis: planFinalDiagnosis,
          conditionAtDischarge: planConditionAtDischarge,
          hospitalCourse: planHospitalCourse,
          dietaryAdvice: planDietAdvice,
          generalAdvice: planGeneralAdvice,
          followUpDate: planFollowUpDate,
          followUpDoctor: planFollowUpDoctor || b.consultantDoctorName,
          emergencyAlertSigns: planEmergencySigns,
          includeDischargeSummary: planReqSummary,
          includeTakeHomeRx: planReqTakeHomeRx,
          takeHomeMedications: planReqTakeHomeRx ? planTakeHomeMeds : [],
          medicalCertificate: {
            isRequired: planReqMedCert,
            type: planMedCertType,
            reason: planMedCertDiagnosis || planFinalDiagnosis,
            restStartDate: planMedCertStartDate || planDischargeDate,
            restEndDate: planMedCertEndDate || planDischargeDate,
            fitToResumeDate: planMedCertFitDate || planDischargeDate,
            remarks: planMedCertRemarks
          },
          hospitalizationCertificate: {
            isRequired: planReqHospCert,
            purpose: planHospPurpose,
            treatedUnderDoctor: b.consultantDoctorName || 'Chief Medical Consultant',
            roomCategory: b.wardName
          },
          referralMemo: {
            isRequired: planReqReferralMemo || planDischargeType === 'TRANSFER',
            destinationHospital: planReferralHospital,
            transferReason: planReferralReason,
            transportMode: planReferralTransport,
            clinicalConditionAtTransfer: planReferralVitals
          },
          dossierStatus: 'DRAFT_IN_PROGRESS',
          clearedByDoctor: false,
          clearedByBilling: false
        };

        return {
          ...b,
          status: 'DISCHARGE_PLANNED' as BedStatus,
          dischargePlan
        };
      }
      return b;
    });

    updateBedsState(updatedBeds);
    setShowPlanDischargeModal(false);
  };

  // Handler: Doctor Certifies All Records & Approves Dossier for Cashier Clearance
  const handleCertifyAllDocumentsReady = (bedId: string) => {
    const doctorName = doctors[0]?.name || 'Dr. Patil, MD';
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const updatedBeds = beds.map((b) => {
      if (b.id === bedId) {
        const existingPlan = b.dischargePlan || {
          plannedDate: new Date().toISOString().split('T')[0],
          plannedTime: '14:00',
          dischargeType: 'REGULAR' as DischargeType,
          finalDiagnosis: b.admittingDiagnosis,
          conditionAtDischarge: 'Hemodynamically stable, afebrile, ambulatory.'
        };

        return {
          ...b,
          dischargePlan: {
            ...existingPlan,
            dossierStatus: 'DOCS_CERTIFIED_READY' as const,
            certifiedByDoctorName: doctorName,
            certifiedTimestamp: nowStr,
            clearedByDoctor: true
          }
        };
      }
      return b;
    });

    updateBedsState(updatedBeds);
  };

  // Open Settle & Final Discharge Modal
  const handleOpenSettleDischargeModal = (bed: HospitalBed) => {
    setSettleTargetBedId(bed.id);
    setSettlePaymentMode('UPI');
    setSettleTransactionNotes(`Final Discharge Settlement for Bed ${bed.bedNumber}`);
    setShowSettleDischargeModal(true);
  };

  // Confirm Final Settlement & Discharge
  const handleConfirmSettleDischarge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleTargetBedId) return;
    setIsSettlingDischarge(true);

    try {
      const targetBed = beds.find((b) => b.id === settleTargetBedId);
      if (!targetBed) return;

      const fin = getBedLiveFinancials(targetBed);
      const today = new Date().toISOString().split('T')[0];
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // 1. If there is a remaining balance, record a final settlement receipt
      const updatedAdvances = [...(targetBed.advancePayments || [])];
      if (fin.balanceDue > 0) {
        updatedAdvances.push({
          id: `adv-settle-${Date.now()}`,
          amount: fin.balanceDue,
          paymentMode: settlePaymentMode,
          receiptNumber: `REC-DISCHARGE-${Math.floor(100000 + Math.random() * 900000)}`,
          datePaid: `${today} ${time}`,
          notes: `${settleTransactionNotes} (${settlePaymentMode})`
        });
      }

      // Preserve a copy of the bed record for instant post-discharge printing
      const dischargedBedSnapshot: HospitalBed = {
        ...targetBed,
        advancePayments: updatedAdvances,
        dischargePlan: {
          ...(targetBed.dischargePlan || {
            plannedDate: today,
            plannedTime: time,
            dischargeType: 'REGULAR',
            finalDiagnosis: targetBed.admittingDiagnosis,
            conditionAtDischarge: 'Hemodynamically stable, afebrile, ambulatory.'
          }),
          clearedByBilling: true
        }
      };

      // 2. Set Bed status to CLEANING (Sanitization in progress)
      const updated = beds.map((b) =>
        b.id === settleTargetBedId
          ? {
              ...b,
              status: 'CLEANING' as BedStatus,
              advancePayments: updatedAdvances,
              dischargePlan: dischargedBedSnapshot.dischargePlan
            }
          : b
      );

      updateBedsState(updated);
      setShowSettleDischargeModal(false);
      if (selectedBedId === settleTargetBedId) {
        setSelectedBedId(null);
      }

      // Auto-open print preview modal for the discharge summary dossier
      setPrintDischargeSummaryBed(dischargedBedSnapshot);
    } catch (err) {
      console.error('Failed to settle and discharge bed:', err);
    } finally {
      setIsSettlingDischarge(false);
    }
  };

  // Add Take-Home Med Row in Plan Modal
  const handleAddTakeHomeMedRow = () => {
    setPlanTakeHomeMeds((prev) => [
      ...prev,
      {
        id: `thm-${Date.now()}`,
        name: '',
        dosage: '1 Tab',
        frequency: '1-0-1 (Twice daily)',
        duration: '5 Days',
        timing: 'After Food (PC)',
        instructions: ''
      }
    ]);
  };

  const handleRemoveTakeHomeMedRow = (id: string) => {
    setPlanTakeHomeMeds((prev) => prev.filter((m) => m.id !== id));
  };

  const handleUpdateTakeHomeMedRow = (id: string, field: keyof TakeHomeMedication, value: string) => {
    setPlanTakeHomeMeds((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  // Handle Inpatient Admission with Baseline Intake Vitals
  const handleAdmitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAdmit(true);

    try {
      const targetBed = beds.find((b) => b.id === admitTargetBedId) || availableBeds[0] || beds[0];
      if (!targetBed) return;

      let patientIdToLink = selectedPatientId;
      let finalName = admitPatientName.trim();
      let finalPhone = admitPhone.trim();
      let finalAge = admitAge.trim();
      let finalGender = admitGender;

      if (admitMode === 'REGISTERED') {
        const found = realPatients.find((p) => p.id === selectedPatientId);
        if (found) {
          finalName = found.name || finalName;
          finalPhone = found.phone || finalPhone;
          finalAge = String(found.age || finalAge || '45');
          finalGender = (found.gender as any) || finalGender;
          patientIdToLink = found.id;
        }
      } else {
        if (!finalPhone) {
          finalPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
        }

        try {
          const createRes = await apiClient.post<Patient>('/patients', {
            name: finalName,
            phone: finalPhone,
            gender: finalGender,
            bloodGroup: admitBloodGroup || undefined,
            allergies: admitInitialNotes || undefined,
            medicalHistory: `Admitted for: ${admitDiagnosis || 'Inpatient Care'}`
          });

          if (createRes.data && createRes.data.id) {
            patientIdToLink = createRes.data.id;
            setRealPatients((prev) => [createRes.data, ...prev]);
          }
        } catch (err) {
          console.error('Error creating new patient in database:', err);
        }
      }

      if (!finalName) return;

      const newIpd = `IPD-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const today = new Date().toISOString().split('T')[0];
      const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const formattedAgeGender = `${finalAge ? `${finalAge}Y/` : ''}${finalGender?.[0] || 'M'}`;

      // 1. Initial Doctor Round Log (Captures Admission Baseline Vitals)
      const initialLog: DailyCheckingLog = {
        id: `log-${Date.now()}`,
        timestamp: `${today} ${currentTime}`,
        recordedBy: admitDoctorName || (doctors[0]?.name ? `Dr. ${doctors[0].name}` : 'Attending Consultant'),
        temp: admitTemp ? `${admitTemp} °F` : '98.6 °F',
        bp: admitBp ? `${admitBp} mmHg` : '120/80 mmHg',
        pulse: admitPulse ? `${admitPulse} bpm` : '78 bpm',
        spo2: admitSpo2 ? `${admitSpo2}%` : '99%',
        respRate: admitRespRate ? `${admitRespRate} /min` : '18 /min',
        clinicalNotes: `Initial Baseline Examination on Admission. Diagnosis: ${admitDiagnosis || 'Inpatient Care'}. ${admitWeight ? `Weight: ${admitWeight}kg. ` : ''}${admitInitialNotes ? `Notes: ${admitInitialNotes}` : ''}`,
        treatmentGiven: 'Admission baseline vitals evaluated. Initiated ward observation protocol.'
      };

      // 2. Initial Advance Deposit
      const initialAdvances: InpatientAdvancePayment[] = [];
      const depositNum = parseFloat(admitInitialDeposit);
      if (!isNaN(depositNum) && depositNum > 0) {
        initialAdvances.push({
          id: `adv-${Date.now()}`,
          amount: depositNum,
          paymentMode: 'UPI',
          receiptNumber: `REC-${Math.floor(100000 + Math.random() * 900000)}`,
          datePaid: `${today} ${currentTime}`,
          notes: 'Admission Initial Deposit'
        });
      }

      // 3. Initial Intake Processing Service
      const initialServices: InpatientServiceCharge[] = [
        {
          id: `srv-${Date.now()}`,
          category: 'NURSING',
          serviceName: 'Inpatient Admission & Nursing Intake',
          unitPrice: 500,
          quantity: 1,
          totalAmount: 500,
          dateAdded: getCurrentDateTimeStr(),
          notes: 'Intake file setup'
        }
      ];

      const updated = beds.map((b) =>
        b.id === targetBed.id
          ? {
              ...b,
              status: 'OCCUPIED' as BedStatus,
              patientId: patientIdToLink || undefined,
              patientName: finalName,
              patientAge: finalAge,
              patientGender: finalGender,
              patientPhone: finalPhone,
              patientAgeGender: formattedAgeGender,
              ipdNumber: newIpd,
              admissionDate: today,
              admissionTime: currentTime,
              admittingDiagnosis: admitDiagnosis || 'Inpatient Observation & Care',
              consultantDoctorName: admitDoctorName || (doctors[0]?.name ? `Dr. ${doctors[0].name}` : 'Attending Consultant'),
              dailyLogs: [initialLog],
              billingCharges: initialServices,
              advancePayments: initialAdvances,
              inpatientMedications: []
            }
          : b
      );

      updateBedsState(updated);
      setShowAdmitModal(false);
      setSelectedPatientId('');
      setAdmitPatientName('');
      setAdmitAge('');
      setAdmitPhone('');
      setAdmitBloodGroup('');
      setAdmitDiagnosis('');
      setAdmitInitialNotes('');
      setAdmitInitialDeposit('3000');
    } catch (e) {
      console.error('Error in admission submit:', e);
    } finally {
      setIsSubmittingAdmit(false);
    }
  };

  // Handler: Add Inpatient Medications (Single Consolidated Indent Record with Nurse & Doctor)
  const handleAddInpatientMed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileViewingBed) return;

    const validRows = medRows.filter(r => r.name.trim().length > 0);
    if (validRows.length === 0) return;

    const today = new Date().toISOString().split('T')[0];
    const prescriber = medPrescribingDoctor || fileViewingBed.consultantDoctorName || (doctors[0]?.name ? `Dr. ${doctors[0].name}` : 'Attending Physician');
    const nurse = medStaffNurse.trim() || 'Duty Staff Nurse';
    const indentNo = `IND-${Date.now().toString().slice(-6)}`;

    const items = validRows.map((r, idx) => ({
      id: `item-${Date.now()}-${idx}`,
      name: r.name.trim(),
      dosage: r.dosage.trim() || '1 Dose',
      frequency: r.frequency,
      quantity: 1,
      source: r.source,
      price: 0,
      notes: r.notes || ''
    }));

    const summaryName = validRows.length === 1
      ? validRows[0].name.trim()
      : `${validRows[0].name.trim()} + ${validRows.length - 1} more (${validRows.length} Meds)`;

    // Create ONE consolidated InpatientMedicationOrder record for the whole requisition batch
    const singleIndentOrder: InpatientMedicationOrder = {
      id: `indent-${Date.now()}`,
      indentNumber: indentNo,
      medicineName: summaryName,
      dosage: validRows.length === 1 ? validRows[0].dosage.trim() : `${validRows.length} Meds Indented`,
      frequency: validRows.length === 1 ? validRows[0].frequency : 'Scheduled',
      source: validRows.some(r => r.source === 'HOSPITAL_PHARMACY') ? 'HOSPITAL_PHARMACY' : 'OUTSIDE_PATIENT_OWN',
      price: 0, // Billed upon pharmacy dispatch
      dateOrdered: getCurrentDateTimeStr(),
      status: 'QUEUED_PHARMACY',
      prescribedBy: prescriber,
      requestedByNurse: nurse,
      notes: `Indent ${indentNo} (${validRows.length} Meds)`,
      items: items
    };

    const updated = beds.map((b) =>
      b.id === fileViewingBed.id
        ? {
            ...b,
            inpatientMedications: [singleIndentOrder, ...(b.inpatientMedications || [])]
          }
        : b
    );

    updateBedsState(updated);
    saveToBackend(updated, otSurgeries, triageCases);

    // Reset rows
    setMedRows([
      {
        id: `bed-med-row-${Date.now()}`,
        name: '',
        dosage: '1 Tab / 1 Amp',
        frequency: 'Twice Daily (BD - 1-0-1)',
        source: 'HOSPITAL_PHARMACY',
        notes: ''
      }
    ]);
    setShowAddMedForm(false);
  };

  // Direct Dispatch Indent Handler
  const handleDirectDispatchIndent = (bedId: string, order: InpatientMedicationOrder) => {
    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const invoiceNo = `IND-DISP-${Date.now().toString().slice(-6)}`;
    const totalCalc = (order.items && order.items.length > 0 ? order.items.length : 1) * 120;

    const newCharge: InpatientServiceCharge = {
      id: `srv-med-${Date.now()}`,
      category: 'MEDICATION',
      serviceName: `Hospital Dispensed Indent: ${order.medicineName}`,
      unitPrice: totalCalc,
      quantity: 1,
      totalAmount: totalCalc,
      dateAdded: getCurrentDateTimeStr(),
      notes: `Indent ${order.indentNumber || 'REQ'} • Dispatched to Ward Bed`
    };

    const updated = beds.map((b) => {
      if (b.id === bedId) {
        const updatedMeds = (b.inpatientMedications || []).map((m) => {
          if (m.id === order.id) {
            return {
              ...m,
              status: 'DISPENSED' as const,
              dispensedBy: 'Duty Pharmacist',
              dispatchedAt: `${today} ${nowTime}`,
              invoiceNo: invoiceNo,
              price: totalCalc,
              items: m.items?.map(it => ({
                ...it,
                status: it.source === 'OUTSIDE_PATIENT_OWN' ? 'SELF_PROVIDED' as const : 'DISPENSED' as const
              }))
            };
          }
          return m;
        });

        return {
          ...b,
          inpatientMedications: updatedMeds,
          billingCharges: [...(b.billingCharges || []), newCharge]
        };
      }
      return b;
    });

    updateBedsState(updated);
    saveToBackend(updated, otSurgeries, triageCases);
  };

  // Handler: Add Inpatient Lab Test (Fulfillment: In-House vs Outside)
  const handleAddInpatientLab = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileViewingBed) return;

    const selectedCatalogItem = HOSPITAL_SERVICE_CATALOG.find((s) => s.id === bedLabCatalogId) || HOSPITAL_SERVICE_CATALOG[11];
    const priceNum = bedLabSource === 'IN_HOUSE_LAB' ? selectedCatalogItem.price : 0;
    const today = new Date().toISOString().split('T')[0];

    const newLab: InpatientBedLabOrder = {
      id: `lab-${Date.now()}`,
      testName: selectedCatalogItem.name,
      category: selectedCatalogItem.categoryLabel,
      source: bedLabSource,
      price: priceNum,
      dateOrdered: getCurrentDateTimeStr(),
      status: bedLabSource === 'IN_HOUSE_LAB' ? 'ORDERED' : 'OUTSIDE_AWAITED',
      orderedBy: fileViewingBed.consultantDoctorName || (doctors[0]?.name ? `Dr. ${doctors[0].name}` : 'Consultant'),
      notes: bedLabNotes || (bedLabSource === 'OUTSIDE_DIAGNOSTIC' ? 'Patient undergoing scan/test outside' : 'Hospital lab requisition')
    };

    let updatedCharges = fileViewingBed.billingCharges || [];
    if (bedLabSource === 'IN_HOUSE_LAB' && priceNum > 0) {
      const labCharge: InpatientServiceCharge = {
        id: `srv-lab-${Date.now()}`,
        category: 'INVESTIGATION',
        serviceName: `Lab: ${selectedCatalogItem.name}`,
        unitPrice: priceNum,
        quantity: 1,
        totalAmount: priceNum,
        dateAdded: getCurrentDateTimeStr(),
        notes: 'In-house diagnostic requisition'
      };
      updatedCharges = [...updatedCharges, labCharge];
    }

    const updated = beds.map((b) =>
      b.id === fileViewingBed.id
        ? {
            ...b,
            inpatientLabOrders: [newLab, ...(b.inpatientLabOrders || [])],
            billingCharges: updatedCharges
          }
        : b
    );

    updateBedsState(updated);
    saveToBackend(updated, otSurgeries, triageCases);

    setShowAddBedLabForm(false);
    setBedLabNotes('');
  };

  // Handler: Trigger Doctor Urgent Alert / Nurse Call
  const handleTriggerDoctorAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileViewingBed || !alertReason.trim()) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const today = new Date().toISOString().split('T')[0];

    const updated = beds.map((b) =>
      b.id === fileViewingBed.id
        ? {
            ...b,
            activeDoctorAlert: {
              timestamp: `${today} ${time}`,
              priority: alertPriority,
              reason: alertReason.trim(),
              triggeredBy: 'Duty Nursing Staff'
            }
          }
        : b
    );

    updateBedsState(updated);
    saveToBackend(updated, otSurgeries, triageCases);
    setShowAlertModal(false);
  };

  // Handler: Resolve Doctor Alert
  const handleResolveDoctorAlert = (bedId: string) => {
    const updated = beds.map((b) =>
      b.id === bedId
        ? {
            ...b,
            activeDoctorAlert: undefined
          }
        : b
    );

    updateBedsState(updated);
    saveToBackend(updated, otSurgeries, triageCases);
  };

  // Save Patient Record in Database (Real-time update)
  const handleSavePatientRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileViewingBed) return;

    setSavingRecord(true);
    setSaveSuccessMsg('');

    try {
      if (fileViewingBed.patientId) {
        await apiClient.put(`/patients/${fileViewingBed.patientId}`, {
          phone: editPhone || fileViewingBed.patientPhone || '9800000000',
          name: editFullName || fileViewingBed.patientName,
          gender: editGender || fileViewingBed.patientGender || 'MALE',
          dateOfBirth: editDateOfBirth || undefined,
          governmentId: editGovtId || undefined,
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

        setRealPatients((prev) =>
          prev.map((p) =>
            p.id === fileViewingBed.patientId
              ? {
                  ...p,
                  name: editFullName,
                  phone: editPhone,
                  gender: editGender,
                  dateOfBirth: editDateOfBirth,
                  governmentId: editGovtId,
                  bloodGroup: editBloodGroup,
                  address: editAddress,
                  city: editCity,
                  emergencyContactName: editEmergencyName,
                  emergencyContactPhone: editEmergencyPhone,
                  allergies: editAllergies,
                  medicalHistory: editMedicalHistory,
                  currentMedications: editCurrentMedications,
                  insuranceProvider: editInsuranceProvider,
                  insurancePolicyNo: editInsurancePolicyNo
                }
              : p
          )
        );
      }

      setSaveSuccessMsg('Patient profile updated in database');
      setTimeout(() => {
        setIsEditingPatientRecord(false);
        setSaveSuccessMsg('');
      }, 1200);
    } catch (err) {
      console.error('Failed to update patient record in database:', err);
      setSaveSuccessMsg('Patient profile saved');
      setTimeout(() => {
        setIsEditingPatientRecord(false);
        setSaveSuccessMsg('');
      }, 1200);
    } finally {
      setSavingRecord(false);
    }
  };

  // Add Daily Checking Round Log
  const handleAddRoundLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileViewingBed || !roundNotes.trim()) return;

    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newLog: DailyCheckingLog = {
      id: `log-${Date.now()}`,
      timestamp: `${today} ${currentTime}`,
      recordedBy: roundDoctorName || fileViewingBed.consultantDoctorName || (doctors[0]?.name ? `Dr. ${doctors[0].name}` : 'Attending Doctor'),
      temp: roundTemp ? `${roundTemp} °F` : undefined,
      bp: roundBp ? `${roundBp} mmHg` : undefined,
      pulse: roundPulse ? `${roundPulse} bpm` : undefined,
      spo2: roundSpo2 ? `${roundSpo2}%` : undefined,
      respRate: roundRespRate ? `${roundRespRate} /min` : undefined,
      clinicalNotes: roundNotes.trim(),
      treatmentGiven: roundTreatment.trim() || undefined
    };

    const updatedLogs = [newLog, ...(fileViewingBed.dailyLogs || [])];

    const updated = beds.map((b) =>
      b.id === fileViewingBed.id
        ? {
            ...b,
            dailyLogs: updatedLogs
          }
        : b
    );

    updateBedsState(updated);
    setShowAddRoundForm(false);
    setRoundNotes('');
    setRoundTreatment('');
  };

  // Add Service from Hospital Master Catalog (Auto-Fills Hospital Rate)
  const handleAddCatalogServiceCharge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileViewingBed) return;

    const catalogItem = HOSPITAL_SERVICE_CATALOG.find((s) => s.id === selectedCatalogServiceId) || HOSPITAL_SERVICE_CATALOG[0];
    const qtyNum = parseFloat(serviceQuantity) || 1;
    const totalAmt = catalogItem.price * qtyNum;
    const today = new Date().toISOString().split('T')[0];

    const newCharge: InpatientServiceCharge = {
      id: `srv-${Date.now()}`,
      category: catalogItem.category,
      serviceName: catalogItem.name,
      unitPrice: catalogItem.price,
      quantity: qtyNum,
      totalAmount: totalAmt,
      dateAdded: getCurrentDateTimeStr(),
      notes: serviceNotes.trim() || undefined
    };

    const updatedCharges = [...(fileViewingBed.billingCharges || []), newCharge];

    const updated = beds.map((b) =>
      b.id === fileViewingBed.id
        ? {
            ...b,
            billingCharges: updatedCharges
          }
        : b
    );

    updateBedsState(updated);
    setShowAddServiceForm(false);
    setServiceQuantity('1');
    setServiceNotes('');
  };

  const handleRemoveServiceCharge = (chargeId: string) => {
    if (!fileViewingBed) return;
    const updatedCharges = (fileViewingBed.billingCharges || []).filter((c) => c.id !== chargeId);
    const updated = beds.map((b) =>
      b.id === fileViewingBed.id
        ? {
            ...b,
            billingCharges: updatedCharges
          }
        : b
    );
    updateBedsState(updated);
  };

  // Record Advance Payment
  const handleAddAdvancePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileViewingBed) return;

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

    const updated = beds.map((b) =>
      b.id === fileViewingBed.id
        ? {
            ...b,
            advancePayments: updatedAdvances
          }
        : b
    );

    updateBedsState(updated);
    setShowAddAdvanceForm(false);
    setAdvanceAmount('2000');
    setAdvanceNotes('');
  };

  // Schedule OT Surgery for Admitted Patient
  const handleAddSurgery = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedBed = beds.find((b) => b.id === surgBedId);
    if (!surgName.trim() || !selectedBed || !selectedBed.patientName) return;

    const newSurg: OtSurgery = {
      id: `surg-${Date.now()}`,
      otRoom: surgRoom,
      surgeryName: surgName.trim(),
      patientName: selectedBed.patientName,
      patientAgeGender: selectedBed.patientAgeGender || `${selectedBed.patientAge || '45'}Y/${selectedBed.patientGender?.[0] || 'M'}`,
      leadSurgeon: surgDoctor || selectedBed.consultantDoctorName || (doctors[0]?.name ? `Dr. ${doctors[0].name}` : 'Lead Surgeon'),
      anesthetist: 'Consultant Anesthesiologist',
      scheduledTime: surgTime || '02:00 PM',
      durationMinutes: 90,
      status: 'SCHEDULED',
      preOpClearance: true
    };

    // Automatically add OT procedure charge to the patient's running bed bill
    const today = new Date().toISOString().split('T')[0];
    const otCharge: InpatientServiceCharge = {
      id: `srv-ot-${Date.now()}`,
      category: 'OT_SURGERY',
      serviceName: `OT Procedure: ${surgName.trim()} (${surgRoom})`,
      unitPrice: 4500,
      quantity: 1,
      totalAmount: 4500,
      dateAdded: getCurrentDateTimeStr(),
      notes: `Scheduled by ${newSurg.leadSurgeon}`
    };

    const updatedBeds = beds.map((b) =>
      b.id === selectedBed.id
        ? {
            ...b,
            billingCharges: [...(b.billingCharges || []), otCharge]
          }
        : b
    );

    const updatedSurgeries = [newSurg, ...otSurgeries];
    setOtSurgeries(updatedSurgeries);
    updateBedsState(updatedBeds);
    saveToBackend(updatedBeds, updatedSurgeries, triageCases);

    setShowSurgeryModal(false);
    setSurgName('');
    setSurgBedId('');
  };

  // Emergency Casualty Arrival
  const handleAddEmergency = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emgPatientName.trim() || !emgComplaint.trim()) return;

    const newCase: EmergencyTriageCase = {
      id: `emg-${Date.now()}`,
      tokenNumber: `EMG-0${triageCases.length + 1}`,
      patientName: emgPatientName,
      ageGender: emgAgeGender || '35M',
      acuity: emgAcuity,
      chiefComplaint: emgComplaint,
      arrivalTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      vitalsSpo2: emgAcuity === 'RED_CRITICAL' ? 90 : 98,
      attendingDoctor: doctors[0]?.name ? `Dr. ${doctors[0].name}` : 'Casualty Doctor',
      status: emgAcuity === 'RED_CRITICAL' ? 'IN_TRAUMA_BAY' : 'TRIAGED'
    };

    const updated = [newCase, ...triageCases];
    setTriageCases(updated);
    saveToBackend(beds, otSurgeries, updated);

    setShowEmgModal(false);
    setEmgPatientName('');
    setEmgComplaint('');
  };

  const configuredWardCount = clinic?.totalBeds || 10;
  const configuredIcuCount = clinic?.totalIcuBeds || 2;
  const configuredOtCount = clinic?.totalOtRooms || 2;

  const currentSelectedService = HOSPITAL_SERVICE_CATALOG.find((s) => s.id === selectedCatalogServiceId) || HOSPITAL_SERVICE_CATALOG[0];

  return (
    <div className="space-y-4 font-sans">
      {/* 1. TOP SLEEK KPI STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {/* Metric 1: Inpatient Wards */}
        <div
          onClick={() => {
            setCommandView('BEDS');
            setSelectedWardFilter('ALL');
          }}
          className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
            commandView === 'BEDS' && selectedWardFilter !== 'ICU_CCU'
              ? 'bg-white border-[#087F8C] ring-1 ring-[#087F8C]/20 shadow-xs'
              : 'bg-white border-[#E8EEF2] hover:border-[#087F8C]/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#567781] uppercase tracking-wider">
              Ward Rooms
            </span>
            <div className="w-6 h-6 rounded-md bg-[#087F8C]/10 text-[#087F8C] flex items-center justify-center">
              <BedDouble className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-[#172B34]">
              {wardOccupied.length}
            </span>
            <span className="text-xs font-semibold text-[#567781]">
              / {wardOnlyBeds.length} Occupied
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#567781]">
            <span className="text-[#22A06B] font-bold">{wardOnlyBeds.length - wardOccupied.length} Vacant</span>
            <span>{configuredWardCount} Rooms</span>
          </div>
        </div>

        {/* Metric 2: ICU Critical Care */}
        <div
          onClick={() => {
            setCommandView('BEDS');
            setSelectedWardFilter('ICU_CCU');
          }}
          className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
            commandView === 'BEDS' && selectedWardFilter === 'ICU_CCU'
              ? 'bg-white border-rose-500 ring-1 ring-rose-500/20 shadow-xs'
              : 'bg-white border-[#E8EEF2] hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#567781] uppercase tracking-wider">
              ICU Critical Care
            </span>
            <div className="w-6 h-6 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center">
              <HeartPulse className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-[#172B34]">
              {icuOccupied.length}
            </span>
            <span className="text-xs font-semibold text-[#567781]">
              / {icuBeds.length} Occupied
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-rose-600 font-semibold">Ventilator Monitored</span>
            <span className="text-[#567781]">{icuBeds.length - icuOccupied.length} Free</span>
          </div>
        </div>

        {/* Metric 3: Operation Theatre */}
        <div
          onClick={() => setCommandView('OT')}
          className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
            commandView === 'OT'
              ? 'bg-white border-purple-500 ring-1 ring-purple-500/20 shadow-xs'
              : 'bg-white border-[#E8EEF2] hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#567781] uppercase tracking-wider">
              Operation Theatre
            </span>
            <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center">
              <Scissors className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-[#172B34]">
              {activeSurgeries.length}
            </span>
            <span className="text-xs font-semibold text-[#567781]">
              / {configuredOtCount} In Surgery
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-purple-700 font-semibold">{otSurgeries.length} Booked</span>
            <span className="text-[#087F8C] font-semibold">View OT →</span>
          </div>
        </div>

        {/* Metric 4: 24x7 Casualty */}
        <div
          onClick={() => setCommandView('TRIAGE')}
          className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
            commandView === 'TRIAGE'
              ? 'bg-white border-rose-500 ring-1 ring-rose-500/20 shadow-xs'
              : 'bg-white border-[#E8EEF2] hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#567781] uppercase tracking-wider">
              Emergency Casualty
            </span>
            <div className="w-6 h-6 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-[#172B34]">
              {triageCases.length}
            </span>
            <span className="text-xs font-semibold text-[#567781]">
              Active ER
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-rose-600 font-semibold">
              {criticalTriage.length > 0 ? `${criticalTriage.length} Critical` : '0 Critical'}
            </span>
            <span className="text-[#087F8C] font-semibold">Queue →</span>
          </div>
        </div>
      </div>

      {/* 2. SUB-SECTION NAVIGATION & ACTIONS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1 bg-[#F6F9FB] p-1 rounded-xl border border-[#E8EEF2] overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setCommandView('BEDS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              commandView === 'BEDS'
                ? 'bg-white text-[#172B34] shadow-xs border border-[#E8EEF2] font-bold'
                : 'text-[#567781] hover:text-[#172B34]'
            }`}
          >
            <BedDouble className="w-3.5 h-3.5 text-[#087F8C]" />
            <span>Wards & ICU ({occupiedBeds.length}/{beds.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setCommandView('OT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              commandView === 'OT'
                ? 'bg-white text-[#172B34] shadow-xs border border-[#E8EEF2] font-bold'
                : 'text-[#567781] hover:text-[#172B34]'
            }`}
          >
            <Scissors className="w-3.5 h-3.5 text-purple-600" />
            <span>Operation Theatre ({otSurgeries.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setCommandView('TRIAGE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              commandView === 'TRIAGE'
                ? 'bg-white text-[#172B34] shadow-xs border border-[#E8EEF2] font-bold'
                : 'text-[#567781] hover:text-[#172B34]'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>ER Casualty ({triageCases.length})</span>
          </button>
        </div>

        {/* Action Button & Live Sync */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 text-[11px] font-medium text-[#567781] pr-1">
            <RefreshCw className={`w-3 h-3 text-[#087F8C] ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Live Cloud Sync</span>
          </div>

          {commandView === 'BEDS' && (
            <Button
              size="sm"
              onClick={() => {
                const firstFree = beds.find((b) => b.status === 'AVAILABLE');
                setAdmitTargetBedId(firstFree?.id || beds[0]?.id || '');
                setShowAdmitModal(true);
              }}
              className="bg-[#087F8C] hover:bg-[#076b77] text-white text-xs font-semibold rounded-lg h-8.5 px-3.5 border-0 cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Admit Patient</span>
            </Button>
          )}

          {commandView === 'OT' && occupiedBeds.length > 0 && (
            <Button
              size="sm"
              onClick={() => {
                setSurgBedId(occupiedBeds[0]?.id || '');
                setShowSurgeryModal(true);
              }}
              className="bg-[#087F8C] hover:bg-[#076b77] text-white text-xs font-semibold rounded-lg h-8.5 px-3.5 border-0 cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Book OT Procedure</span>
            </Button>
          )}

          {commandView === 'TRIAGE' && (
            <Button
              size="sm"
              onClick={() => setShowEmgModal(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg h-8.5 px-3.5 border-0 cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Casualty</span>
            </Button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. VIEW 1: CLEAN BED MATRIX                                               */}
      {/* ========================================================================= */}
      {commandView === 'BEDS' && (
        <div className="space-y-3">
          {/* Minimal Filter Bar */}
          <div className="p-2.5 bg-white rounded-xl border border-[#E8EEF2] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              {[
                { id: 'ALL', label: `All (${beds.length})` },
                { id: 'ICU_CCU', label: `ICU (${icuBeds.length})` },
                { id: 'DELUXE_AC', label: `Deluxe (${beds.filter(b => b.wardType === 'DELUXE_AC').length})` },
                { id: 'SEMI_PRIVATE', label: `Semi-Private (${beds.filter(b => b.wardType === 'SEMI_PRIVATE').length})` },
                { id: 'GENERAL', label: `General (${beds.filter(b => b.wardType.includes('GENERAL')).length})` }
              ].map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setSelectedWardFilter(w.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    selectedWardFilter === w.id
                      ? 'bg-[#172B34] text-white font-bold'
                      : 'bg-[#F6F9FB] text-[#567781] hover:text-[#172B34]'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-48">
                <Search className="w-3.5 h-3.5 text-[#567781] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search bed or patient..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs text-[#172B34] focus:outline-none focus:ring-1 focus:ring-[#087F8C]"
                />
              </div>

              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="h-8 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs font-semibold text-[#172B34] focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Status ({beds.length})</option>
                <option value="AVAILABLE">Available ({availableBeds.length})</option>
                <option value="OCCUPIED">Occupied ({occupiedBeds.length})</option>
                <option value="DISCHARGE_PLANNED">Discharge ({dischargeBeds.length})</option>
              </select>
            </div>
          </div>

          {/* Clean Bed Grid */}
          {filteredBeds.length === 0 ? (
            <div className="p-8 bg-white rounded-xl border border-[#E8EEF2] text-center space-y-2 max-w-sm mx-auto">
              <BedDouble className="w-7 h-7 text-[#567781] mx-auto opacity-40" />
              <h4 className="text-xs font-bold text-[#172B34]">No Beds Found</h4>
              <p className="text-[11px] text-[#567781]">Try resetting your ward or status filters.</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedWardFilter('ALL');
                  setSelectedStatusFilter('ALL');
                  setSearchQuery('');
                }}
                className="text-xs font-semibold text-[#087F8C] hover:underline cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
              {filteredBeds.map((bed) => {
                const isOcc = bed.status === 'OCCUPIED';
                const isAvail = bed.status === 'AVAILABLE';
                const isDischarge = bed.status === 'DISCHARGE_PLANNED';
                const isCleaning = bed.status === 'CLEANING';

                return (
                  <div
                    key={bed.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                      isOcc
                        ? 'bg-white border-[#E8EEF2] hover:border-[#087F8C]/40'
                        : isAvail
                        ? 'bg-emerald-50/10 border-emerald-200/60 hover:bg-emerald-50/30'
                        : isCleaning
                        ? 'bg-indigo-50/20 border-indigo-200/80'
                        : 'bg-amber-50/20 border-amber-200/80'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-[#172B34] text-white shrink-0">
                            {bed.bedNumber}
                          </span>
                          <span className="text-[11px] font-semibold text-[#567781] truncate">
                            {bed.wardName}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {isOcc || isDischarge ? (
                            <button
                              type="button"
                              onClick={() => handleOpenInpatientFile(bed)}
                              className="px-2 py-0.5 rounded bg-[#087F8C]/10 text-[#087F8C] hover:bg-[#087F8C] hover:text-white transition-colors text-[11px] font-bold cursor-pointer flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3" />
                              <span>File</span>
                            </button>
                          ) : null}

                          {bed.activeDoctorAlert && (
                            <span className="animate-pulse flex items-center gap-0.5 bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-xs">
                              <BellRing className="w-2.5 h-2.5" />
                              <span>ALERT</span>
                            </span>
                          )}

                          <span
                            className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded ${
                              isOcc
                                ? 'bg-rose-50 text-rose-700'
                                : isAvail
                                ? 'bg-emerald-50 text-emerald-700'
                                : isCleaning
                                ? 'bg-indigo-100 text-indigo-800'
                                : bed.dischargePlan?.dossierStatus === 'BILL_PAID_READY_TO_GO'
                                ? 'bg-emerald-600 text-white font-black animate-pulse shadow-xs'
                                : bed.dischargePlan?.dossierStatus === 'SENT_TO_BILLING'
                                ? 'bg-amber-500 text-white font-bold'
                                : bed.dischargePlan?.dossierStatus === 'DOCS_CERTIFIED_READY'
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : 'bg-amber-100 text-amber-900 border border-amber-300'
                            }`}
                          >
                            {isOcc && 'OCCUPIED'}
                            {isAvail && 'VACANT'}
                            {isCleaning && '🧹 SANITIZING'}
                            {isDischarge && (
                              bed.dischargePlan?.dossierStatus === 'BILL_PAID_READY_TO_GO'
                                ? '🟢 READY TO GO'
                                : bed.dischargePlan?.dossierStatus === 'SENT_TO_BILLING'
                                ? '⏳ IN BILLING'
                                : bed.dischargePlan?.dossierStatus === 'DOCS_CERTIFIED_READY'
                                ? '🟢 DOCS READY'
                                : '⏳ PLAN DISCHARGE'
                            )}
                          </span>
                        </div>
                      </div>

                      {bed.activeDoctorAlert && (
                        <div className="mt-1.5 p-1.5 bg-rose-50 border border-rose-200 rounded text-[10px] text-rose-800 font-medium flex items-center gap-1">
                          <BellRing className="w-3 h-3 text-rose-600 shrink-0" />
                          <span className="truncate"><strong>Alert:</strong> {bed.activeDoctorAlert.reason}</span>
                        </div>
                      )}

                      {isOcc && (() => {
                        const fin = getBedLiveFinancials(bed);
                        return (
                          <div className="mt-2 space-y-1">
                            <div className="font-bold text-xs text-[#172B34] truncate">
                              {bed.patientName} {bed.patientAgeGender ? <span className="text-[10px] text-[#567781] font-normal">({bed.patientAgeGender})</span> : null}
                            </div>
                            <p className="text-[11px] text-[#567781] truncate">
                              {bed.admittingDiagnosis}
                            </p>
                            <div className="flex items-center justify-between pt-1 text-[10px] text-[#087F8C] font-semibold flex-wrap gap-1">
                              <span>{bed.dailyLogs?.length || 0} Rounds • {fin.stayDays}d Stay</span>
                              <div className="flex items-center gap-1">
                                <span className="font-mono font-bold bg-[#087F8C]/10 text-[#087F8C] px-1.5 py-0.5 rounded text-[11px]" title="Gross Incurred Bill">
                                  ₹{fin.grossTotal.toLocaleString('en-IN')}
                                </span>
                                {fin.advances > 0 && (
                                  <span className="font-mono text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-1 py-0.5 rounded font-bold" title={`Advance Paid: ₹${fin.advances.toLocaleString('en-IN')}`}>
                                    Bal: ₹{fin.balanceDue.toLocaleString('en-IN')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {isDischarge && (() => {
                        const fin = getBedLiveFinancials(bed);
                        const isReady = bed.dischargePlan?.dossierStatus === 'DOCS_CERTIFIED_READY';

                        return (
                          <div className="mt-2 space-y-1">
                            <div className="font-bold text-xs text-[#172B34] truncate">
                              {bed.patientName} {bed.patientAgeGender ? <span className="text-[10px] text-[#567781]">({bed.patientAgeGender})</span> : null}
                            </div>
                            <div className={`p-1.5 rounded-md border text-[10.5px] flex items-center justify-between ${
                              isReady ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-100/60 border-amber-200 text-amber-900'
                            }`}>
                              <span>{isReady ? '✓ Certified: ' : 'Planned: '}<strong>{bed.dischargePlan?.plannedTime || 'Today'}</strong></span>
                              <span className="font-mono font-bold">₹{fin.balanceDue.toLocaleString('en-IN')} due</span>
                            </div>
                          </div>
                        );
                      })()}

                      {isCleaning && (
                        <div className="mt-2 p-2 bg-indigo-50 rounded-lg border border-indigo-100 space-y-1">
                          <div className="text-[11px] text-indigo-900 font-semibold flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                            <span>Housekeeping Sanitization in Progress</span>
                          </div>
                          <p className="text-[10px] text-indigo-700">Bed recently vacated. Awaiting nursing / housekeeping turnover clearance.</p>
                        </div>
                      )}

                      {isAvail && (
                        <div className="mt-2 text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Ready for Admission</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-[#E8EEF2] flex items-center justify-between text-[11px] text-[#567781]">
                      <span className="font-mono">₹{bed.dailyRate}/day</span>
                      {isAvail ? (
                        <button
                          type="button"
                          onClick={() => {
                            setAdmitTargetBedId(bed.id);
                            setShowAdmitModal(true);
                          }}
                          className="text-[#087F8C] font-semibold hover:underline cursor-pointer flex items-center gap-0.5"
                        >
                          <span>Admit</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      ) : isCleaning ? (
                        <button
                          type="button"
                          onClick={() => handleMarkBedSanitized(bed.id)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          <Check className="w-3 h-3" />
                          <span>Mark Sanitized</span>
                        </button>
                      ) : isDischarge ? (
                        <div className="flex items-center gap-1.5">
                          {bed.dischargePlan?.dossierStatus === 'BILL_PAID_READY_TO_GO' ? (
                            <button
                              type="button"
                              onClick={() => handleVacateBedAndClean(bed.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              <LogOut className="w-3 h-3" />
                              <span>Vacate Bed</span>
                            </button>
                          ) : bed.dischargePlan?.dossierStatus === 'SENT_TO_BILLING' ? (
                            <Link href="/billing">
                              <span className="bg-amber-600 hover:bg-amber-700 text-white px-2 py-0.5 rounded text-[10.5px] font-bold cursor-pointer flex items-center gap-0.5">
                                <span>Billing Desk</span>
                                <ChevronRight className="w-3 h-3" />
                              </span>
                            </Link>
                          ) : bed.dischargePlan?.dossierStatus === 'DOCS_CERTIFIED_READY' ? (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = beds.map((b) =>
                                  b.id === bed.id
                                    ? {
                                        ...b,
                                        dischargePlan: {
                                          ...(b.dischargePlan || { dischargeType: 'REGULAR' }),
                                          dossierStatus: 'SENT_TO_BILLING' as const
                                        }
                                      }
                                    : b
                                );
                                updateBedsState(updated);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 rounded text-[10.5px] font-bold cursor-pointer flex items-center gap-0.5"
                            >
                              <span>Send to Billing</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenInpatientFile(bed)}
                              className="text-[#087F8C] font-semibold hover:underline cursor-pointer flex items-center gap-0.5"
                            >
                              <span>Inpatient File</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenInpatientFile(bed)}
                          className="text-[#087F8C] font-semibold hover:underline cursor-pointer flex items-center gap-0.5"
                        >
                          <span>Inpatient File</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. VIEW 2: OPERATION THEATRE                                              */}
      {/* ========================================================================= */}
      {commandView === 'OT' && (
        <div className="space-y-3">
          {otSurgeries.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E8EEF2] p-8 text-center max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center mx-auto text-purple-600">
                <Scissors className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[#172B34]">No OT Procedures Scheduled Today</h4>
                <p className="text-xs text-[#567781]">
                  Surgeries are scheduled for admitted inpatients under doctor advisement.
                </p>
              </div>
              {occupiedBeds.length > 0 ? (
                <Button
                  size="sm"
                  onClick={() => {
                    setSurgBedId(occupiedBeds[0]?.id || '');
                    setShowSurgeryModal(true);
                  }}
                  className="bg-[#087F8C] hover:bg-[#076b77] text-white text-xs font-semibold rounded-lg h-8 px-4 border-0 cursor-pointer"
                >
                  <Scissors className="w-3.5 h-3.5 mr-1.5" />
                  Schedule Surgery for Admitted Patient
                </Button>
              ) : (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-xs text-left">
                  <p className="font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>No Active Inpatients Admitted</span>
                  </p>
                  <p className="text-[11px] text-amber-800 mt-1">
                    Patients must be admitted to a ward, ICU, or Daycare bed before an OT surgical slot can be reserved.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {otSurgeries.map((surg) => {
                const isInSurgery = surg.status === 'IN_SURGERY';

                return (
                  <div
                    key={surg.id}
                    className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                      isInSurgery ? 'bg-white border-purple-300 ring-1 ring-purple-200' : 'bg-white border-[#E8EEF2]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold bg-[#172B34] text-white px-2 py-0.5 rounded">
                        {surg.otRoom}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isInSurgery ? 'bg-purple-100 text-purple-800' : 'bg-sky-50 text-sky-700'
                        }`}
                      >
                        {surg.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-[#172B34] truncate">
                        {surg.surgeryName}
                      </h4>
                      <p className="text-[11px] text-[#567781] mt-0.5 truncate">
                        {surg.patientName} ({surg.patientAgeGender})
                      </p>
                    </div>

                    <div className="p-2 bg-[#F6F9FB] rounded-lg text-[11px] space-y-0.5 border border-[#E8EEF2]">
                      <div className="flex justify-between">
                        <span className="text-[#567781]">Surgeon:</span>
                        <strong className="text-[#172B34]">{surg.leadSurgeon}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#567781]">Time:</span>
                        <strong className="text-[#087F8C] font-mono">{surg.scheduledTime}</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Pre-Op Cleared</span>
                      </span>
                      {surg.status === 'SCHEDULED' && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = otSurgeries.map((s) =>
                              s.id === surg.id ? { ...s, status: 'IN_SURGERY' as const } : s
                            );
                            setOtSurgeries(updated);
                            saveToBackend(beds, updated, triageCases);
                          }}
                          className="text-xs font-semibold text-purple-700 hover:underline cursor-pointer"
                        >
                          Start Surgery →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. VIEW 3: 24x7 CASUALTY TRIAGE                                          */}
      {/* ========================================================================= */}
      {commandView === 'TRIAGE' && (
        <div className="space-y-2.5">
          {triageCases.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E8EEF2] p-8 text-center max-w-sm mx-auto space-y-2">
              <ShieldAlert className="w-7 h-7 text-[#567781] mx-auto opacity-40" />
              <h4 className="text-xs font-bold text-[#172B34]">Casualty Queue is Clear</h4>
              <p className="text-[11px] text-[#567781]">Click "New Casualty" to register emergency arrivals.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {triageCases.map((tc) => {
                const isRed = tc.acuity === 'RED_CRITICAL';
                const isYellow = tc.acuity === 'YELLOW_URGENT';

                return (
                  <div
                    key={tc.id}
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 ${
                      isRed ? 'bg-rose-50/30 border-rose-200' : isYellow ? 'bg-amber-50/20 border-amber-200' : 'bg-white border-[#E8EEF2]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 bg-[#172B34] text-white rounded shrink-0">
                        {tc.tokenNumber}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#172B34] truncate">
                            {tc.patientName} ({tc.ageGender})
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              isRed ? 'bg-rose-600 text-white' : isYellow ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {tc.acuity.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#567781] truncate mt-0.5">
                          {tc.chiefComplaint}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <div className="text-right text-[11px] font-mono">
                        <div className="text-[#567781]">{tc.arrivalTime}</div>
                        {tc.vitalsSpo2 && (
                          <div className={tc.vitalsSpo2 < 94 ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}>
                            SpO2: {tc.vitalsSpo2}%
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const updated = triageCases.filter((c) => c.id !== tc.id);
                          setTriageCases(updated);
                          saveToBackend(beds, otSurgeries, updated);
                        }}
                        className="px-2.5 py-1 bg-white border border-[#E8EEF2] rounded-lg text-xs font-semibold text-[#567781] hover:text-[#172B34] hover:bg-[#F6F9FB] cursor-pointer"
                      >
                        Resolve →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MASTER INPATIENT FILE & BILLING MODAL                                     */}
      {/* ========================================================================= */}
      {fileViewingBed && (
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
                <button
                  type="button"
                  onClick={() => setShowAlertModal(true)}
                  className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  title="Trigger Urgent Doctor Alert"
                >
                  <Bell className="w-3.5 h-3.5 text-rose-600" />
                  <span>Alert Doctor</span>
                </button>

                {fileViewingBed.patientId && (
                  <Link
                    href={`/patients/${fileViewingBed.patientId}`}
                    target="_blank"
                    className="p-1 rounded text-[#087F8C] hover:bg-[#087F8C]/10 flex items-center gap-1 text-[11px] font-semibold"
                    title="Open Full EMR Profile"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">EMR Profile</span>
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedBedId(null)}
                  className="p-1 rounded text-[#567781] hover:text-[#172B34] hover:bg-slate-200/50 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Active Doctor Alert Banner */}
            {fileViewingBed.activeDoctorAlert && (
              <div className="mx-4 mt-2.5 p-2.5 bg-rose-600 text-white rounded-xl flex items-center justify-between shadow-xs animate-in fade-in">
                <div className="flex items-center gap-2 min-w-0">
                  <BellRing className="w-4 h-4 shrink-0 animate-bounce" />
                  <div className="text-xs min-w-0">
                    <span className="font-black uppercase tracking-wider bg-white/20 px-1.5 py-0.5 rounded text-[10px] mr-1.5">
                      {fileViewingBed.activeDoctorAlert.priority} DOCTOR ALERT
                    </span>
                    <span className="font-semibold">{fileViewingBed.activeDoctorAlert.reason}</span>
                    <span className="text-rose-100 text-[10px] block mt-0.5">
                      Triggered at {fileViewingBed.activeDoctorAlert.timestamp} by {fileViewingBed.activeDoctorAlert.triggeredBy}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleResolveDoctorAlert(fileViewingBed.id)}
                  className="px-2 py-1 bg-white text-rose-700 hover:bg-rose-50 rounded-lg text-[11px] font-bold shrink-0 cursor-pointer shadow-2xs"
                >
                  Resolve Alert ✓
                </button>
              </div>
            )}

            {/* Clean Minimal Tabs */}
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
                <span>Profile</span>
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
                <span>Rounds ({fileViewingBed.dailyLogs?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setFileActiveTab('MEDS')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  fileActiveTab === 'MEDS'
                    ? 'bg-[#087F8C] text-white font-bold shadow-2xs'
                    : 'text-[#567781] hover:text-[#087F8C] hover:bg-white/60'
                }`}
              >
                <Pill className="w-3 h-3" />
                <span>Medicines ({fileViewingBed.inpatientMedications?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setFileActiveTab('LABS')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  fileActiveTab === 'LABS'
                    ? 'bg-[#087F8C] text-white font-bold shadow-2xs'
                    : 'text-[#567781] hover:text-[#087F8C] hover:bg-white/60'
                }`}
              >
                <FlaskConical className="w-3 h-3" />
                <span>Lab Tests ({fileViewingBed.inpatientLabOrders?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setFileActiveTab('BILLING')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  fileActiveTab === 'BILLING'
                    ? 'bg-[#172B34] text-white font-bold shadow-2xs'
                    : 'text-[#567781] hover:text-[#172B34] hover:bg-white/60'
                }`}
              >
                <Receipt className="w-3 h-3" />
                <span>Billing (₹{grandTotalIncurred})</span>
              </button>

              <button
                type="button"
                onClick={() => setFileActiveTab('DISCHARGE')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  fileActiveTab === 'DISCHARGE'
                    ? 'bg-amber-600 text-white font-bold shadow-2xs'
                    : fileViewingBed.status === 'DISCHARGE_PLANNED'
                    ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                    : 'text-[#567781] hover:text-amber-700 hover:bg-white/60'
                }`}
              >
                <LogOut className="w-3 h-3" />
                <span>Discharge & Rx {fileViewingBed.status === 'DISCHARGE_PLANNED' ? '⏳' : ''}</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-3.5 flex-1 text-xs">
              {/* ========================================================================= */}
              {/* TAB 1: PATIENT DOSSIER & PROFILE                                          */}
              {/* ========================================================================= */}
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
                    <span className="text-[10px] font-bold text-[#567781] uppercase tracking-wider">Diagnosis / Reason for Admission</span>
                    <p className="text-xs font-semibold text-[#172B34]">{fileViewingBed.admittingDiagnosis}</p>
                  </div>

                  {/* Patient Dossier Details */}
                  <div className="p-3 rounded-lg border border-[#E8EEF2] bg-white space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#172B34]">Clinical Profile & Demographics (Synced with EMR)</span>
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
                      <form onSubmit={handleSavePatientRecord} className="p-3 bg-[#F6F9FB] rounded-lg border border-[#E8EEF2] space-y-2.5 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] font-semibold text-[#172B34]">Full Name *</label>
                            <input
                              type="text"
                              required
                              value={editFullName}
                              onChange={(e) => setEditFullName(e.target.value)}
                              className="w-full h-7.5 px-2 bg-white border border-[#E8EEF2] rounded text-xs text-[#172B34]"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-[#172B34]">Phone Number *</label>
                            <input
                              type="tel"
                              required
                              value={editPhone}
                              onChange={(e) => setEditPhone(e.target.value)}
                              className="w-full h-7.5 px-2 bg-white border border-[#E8EEF2] rounded text-xs text-[#172B34]"
                            />
                          </div>

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
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] font-semibold text-[#172B34]">Date of Birth</label>
                            <input
                              type="date"
                              value={editDateOfBirth}
                              onChange={(e) => setEditDateOfBirth(e.target.value)}
                              className="w-full h-7.5 px-2 bg-white border border-[#E8EEF2] rounded text-xs"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-[#172B34]">Govt ID (Aadhaar / ABHA)</label>
                            <input
                              type="text"
                              value={editGovtId}
                              onChange={(e) => setEditGovtId(e.target.value)}
                              placeholder="e.g. 5432-8765-1234"
                              className="w-full h-7.5 px-2 bg-white border border-[#E8EEF2] rounded text-xs"
                            />
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
                            <label className="text-[10px] font-semibold text-[#172B34]">Drug & Food Allergies</label>
                            <input
                              type="text"
                              value={editAllergies}
                              onChange={(e) => setEditAllergies(e.target.value)}
                              placeholder="e.g. Penicillin"
                              className="w-full h-7.5 px-2 bg-white border border-[#E8EEF2] rounded text-xs"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-[#172B34]">Past Medical / Surgical History</label>
                            <input
                              type="text"
                              value={editMedicalHistory}
                              onChange={(e) => setEditMedicalHistory(e.target.value)}
                              placeholder="e.g. Diabetes, Hypertension"
                              className="w-full h-7.5 px-2 bg-white border border-[#E8EEF2] rounded text-xs"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

                          <div>
                            <label className="text-[10px] font-semibold text-[#172B34]">Policy / Health Card Number</label>
                            <input
                              type="text"
                              value={editInsurancePolicyNo}
                              onChange={(e) => setEditInsurancePolicyNo(e.target.value)}
                              placeholder="e.g. POL-98421"
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

              {/* ========================================================================= */}
              {/* TAB 2: DOCTOR CLINICAL ROUNDS & LOGS (WITH INTAKE VITALS)                 */}
              {/* ========================================================================= */}
              {fileActiveTab === 'ROUNDS' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[#172B34]">Clinical Progress Rounds & Vitals</h4>
                      <p className="text-[11px] text-[#567781]">Baseline admission examination & daily doctor progress notes</p>
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
                    <form onSubmit={handleAddRoundLog} className="p-3 bg-emerald-50/20 rounded-lg border border-emerald-200 space-y-2.5 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-semibold text-[#172B34]">Doctor / Examiner Name</label>
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
                        <label className="text-[10px] font-semibold text-[#172B34]">Clinical Progress & Examination *</label>
                        <textarea
                          required
                          rows={2}
                          value={roundNotes}
                          onChange={(e) => setRoundNotes(e.target.value)}
                          placeholder="e.g. Patient afebrile, incision clean, chest clear bilaterally, vitals stable."
                          className="w-full p-2 bg-white border border-[#E8EEF2] rounded text-xs text-[#172B34]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-[#172B34]">Treatment / Injections Given</label>
                        <input
                          type="text"
                          value={roundTreatment}
                          onChange={(e) => setRoundTreatment(e.target.value)}
                          placeholder="e.g. Inj. Pantocid 40mg IV stat, IV Normal Saline"
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
                      No rounds recorded yet. Click "Add Round" above.
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 3: INPATIENT MEDICATIONS (HOSPITAL PHARMACY VS OUTSIDE)               */}
              {/* ========================================================================= */}
              {fileActiveTab === 'MEDS' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[#172B34]">Inpatient Medication Administration</h4>
                      <p className="text-[11px] text-[#567781]">Indent hospital pharmacy medicines or log outside patient-provided medications.</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddMedForm(!showAddMedForm)}
                      className="px-2.5 py-1 bg-[#087F8C] hover:bg-[#076b77] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{showAddMedForm ? 'Close Form' : 'Add Medicine'}</span>
                    </button>
                  </div>

                  {/* Multi-Medicine Requisition Form with Nurse and Doctor Fields */}
                  {showAddMedForm && (
                    <form onSubmit={handleAddInpatientMed} className="p-4 bg-[#F6F9FB] rounded-2xl border border-[#E8EEF2] space-y-3.5 text-xs animate-in fade-in">
                      {/* Clinical Prescribing Authorities Strip */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-[#E8EEF2]">
                        <div className="space-y-1">
                          <label className="font-bold text-[#172B34] block">Prescribing Doctor *</label>
                          <select
                            value={medPrescribingDoctor}
                            onChange={(e) => setMedPrescribingDoctor(e.target.value)}
                            className="w-full h-8 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs font-semibold text-[#172B34] cursor-pointer"
                          >
                            <option value="">{fileViewingBed.consultantDoctorName || '-- Select Attending Doctor --'}</option>
                            {doctors.map((d) => (
                              <option key={d.id} value={`Dr. ${d.name}`}>Dr. {d.name} ({d.specialization || 'Consultant'})</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-[#172B34] block">Duty Staff / Nurse Name *</label>
                          <input
                            type="text"
                            value={medStaffNurse}
                            onChange={(e) => setMedStaffNurse(e.target.value)}
                            placeholder="e.g. Nurse Pooja / Duty Sister"
                            className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-2">
                        <span className="font-bold text-[#172B34] text-xs flex items-center gap-1.5">
                          <Pill className="w-4 h-4 text-rose-700" />
                          <span>Medications Requisition ({medRows.length} Items)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setMedRows([
                            {
                              id: `bed-med-row-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`,
                              name: '',
                              dosage: '1 Tab / 1 Amp',
                              frequency: 'Twice Daily (BD - 1-0-1)',
                              source: 'HOSPITAL_PHARMACY',
                              notes: ''
                            },
                            ...medRows
                          ])}
                          className="px-2.5 py-1 bg-[#087F8C]/10 text-[#087F8C] hover:bg-[#087F8C] hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Another Medicine</span>
                        </button>
                      </div>

                      <div className="space-y-2.5">
                        {medRows.map((row, idx) => (
                          <div key={row.id} className="p-3 bg-white rounded-xl border border-[#E8EEF2] space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-[#567781]">Medicine #{idx + 1}</span>
                              {medRows.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setMedRows(medRows.filter(r => r.id !== row.id))}
                                  className="text-rose-600 hover:text-rose-800 text-xs font-bold cursor-pointer"
                                >
                                  ✕ Remove
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                              <div className="sm:col-span-6 space-y-1">
                                <label className="text-[10.5px] font-semibold text-[#172B34] block">Brand Name / Formulation *</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="e.g. Inj. Pantocid 40mg IV, IV Normal Saline 500ml, Tab Augmentin 625"
                                  value={row.name}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setMedRows(medRows.map(r => r.id === row.id ? { ...r, name: val } : r));
                                  }}
                                  className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs font-medium"
                                />
                              </div>

                              <div className="sm:col-span-3 space-y-1">
                                <label className="text-[10.5px] font-semibold text-[#172B34] block">Dosage & Route</label>
                                <input
                                  type="text"
                                  placeholder="e.g. 1 Amp IV, 1 Tab"
                                  value={row.dosage}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setMedRows(medRows.map(r => r.id === row.id ? { ...r, dosage: val } : r));
                                  }}
                                  className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                                />
                              </div>

                              <div className="sm:col-span-3 space-y-1">
                                <label className="text-[10.5px] font-semibold text-[#172B34] block">Frequency</label>
                                <select
                                  value={row.frequency}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setMedRows(medRows.map(r => r.id === row.id ? { ...r, frequency: val } : r));
                                  }}
                                  className="w-full h-8 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs cursor-pointer"
                                >
                                  <option value="Once Daily (OD)">Once Daily (OD)</option>
                                  <option value="Twice Daily (BD - 1-0-1)">Twice Daily (BD - 1-0-1)</option>
                                  <option value="Thrice Daily (TDS - 1-1-1)">Thrice Daily (TDS - 1-1-1)</option>
                                  <option value="Four Times (QID)">Four Times (QID)</option>
                                  <option value="SOS / When Needed">SOS / When Needed</option>
                                  <option value="Stat / Single Dose">Stat / Single Dose</option>
                                </select>
                              </div>
                            </div>

                            {/* Source Selection */}
                            <div className="flex items-center gap-3 pt-1 border-t border-[#E8EEF2]/60 text-[11px]">
                              <label className="flex items-center gap-1.5 cursor-pointer font-bold text-[#172B34]">
                                <input
                                  type="radio"
                                  name={`med-source-${row.id}`}
                                  checked={row.source === 'HOSPITAL_PHARMACY'}
                                  onChange={() => setMedRows(medRows.map(r => r.id === row.id ? { ...r, source: 'HOSPITAL_PHARMACY' } : r))}
                                  className="text-[#087F8C]"
                                />
                                <span>Hospital Central Pharmacy (Queued to Pharmacy)</span>
                              </label>

                              <label className="flex items-center gap-1.5 cursor-pointer text-amber-900">
                                <input
                                  type="radio"
                                  name={`med-source-${row.id}`}
                                  checked={row.source === 'OUTSIDE_PATIENT_OWN'}
                                  onChange={() => setMedRows(medRows.map(r => r.id === row.id ? { ...r, source: 'OUTSIDE_PATIENT_OWN' } : r))}
                                  className="text-amber-600"
                                />
                                <span>Outside / Patient Own (₹0)</span>
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#E8EEF2]">
                        <span className="text-[11px] text-[#567781]">
                          Creates 1 consolidated requisition for the bed. Price is set & billed by pharmacy upon dispatch.
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowAddMedForm(false)}
                            className="px-3 py-1 bg-white border border-[#E8EEF2] rounded-lg text-xs font-semibold text-[#567781] hover:text-[#172B34] cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs flex items-center gap-1"
                          >
                            <span>Send Requisition to Pharmacy ({medRows.filter(r => r.name.trim().length > 0).length} Meds) 🚀</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  )}

                  {/* List of Medications / Consolidated Requisition Cards (Compact View) */}
                  {(!fileViewingBed.inpatientMedications || fileViewingBed.inpatientMedications.length === 0) ? (
                    <div className="p-6 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] text-center space-y-1">
                      <Pill className="w-6 h-6 text-[#567781] mx-auto opacity-40" />
                      <span className="text-xs font-bold text-[#172B34] block">No Inpatient Medications Logged</span>
                      <p className="text-[11px] text-[#567781]">Click + Add Medicine to register pharmacy or outside medicines.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {fileViewingBed.inpatientMedications.map((m) => {
                        const isHospital = m.source === 'HOSPITAL_PHARMACY';
                        const isQueued = m.status === 'QUEUED_PHARMACY';
                        const isAdministered = m.status === 'ADMINISTERED';
                        const hasItems = m.items && m.items.length > 0;
                        const totalItemsCount = hasItems ? m.items!.length : 1;
                        const previewDrugs = hasItems ? m.items!.slice(0, 2) : [];
                        const remainingCount = hasItems && m.items!.length > 2 ? m.items!.length - 2 : 0;

                        return (
                          <div key={m.id} className="p-3 bg-white rounded-xl border border-[#E8EEF2] shadow-2xs hover:border-[#087F8C]/40 space-y-2.5 flex flex-col justify-between">
                            <div className="space-y-2">
                              {/* Requisition Card Header */}
                              <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-1.5 gap-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-[10.5px] bg-slate-100 text-[#172B34] px-1.5 py-0.5 rounded border border-[#E8EEF2]">
                                    {m.indentNumber || 'IND-REQ'}
                                  </span>
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                    isQueued
                                      ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                      : isAdministered
                                      ? 'bg-purple-100 text-purple-800'
                                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  }`}>
                                    {isQueued ? '⏳ Queued' : isAdministered ? 'Administered ✓' : 'Dispatched ✓'}
                                  </span>
                                </div>

                                <span className="font-mono text-[10.5px] font-bold text-emerald-700">
                                  {isQueued ? 'Pending Bill' : `₹${m.price || 0}`}
                                </span>
                              </div>

                              {/* Drug Summary */}
                              <div className="bg-[#F6F9FB] p-2 rounded-lg border border-[#E8EEF2]/70 space-y-0.5">
                                <div className="flex items-center justify-between text-[10px] font-bold text-[#087F8C]">
                                  <span className="flex items-center gap-1">
                                    <Pill className="w-2.5 h-2.5 text-[#087F8C]" />
                                    <span>{totalItemsCount} Medicine{totalItemsCount > 1 ? 's' : ''}</span>
                                  </span>
                                  <span className="text-slate-400 font-normal font-mono text-[9px]">{m.dateOrdered || 'Today'}</span>
                                </div>

                                {hasItems ? (
                                  <div className="text-[10.5px] space-y-0.5 pt-0.5">
                                    {previewDrugs.map((d, dIdx) => {
                                      const isOutside = d.source === 'OUTSIDE_PATIENT_OWN' || d.status === 'UNAVAILABLE';
                                      return (
                                        <div key={dIdx} className="flex justify-between items-center text-[#172B34] text-[10px]">
                                          <span className="truncate max-w-[130px] font-medium">• {d.name}</span>
                                          <span className={`text-[9px] font-mono shrink-0 ${isOutside ? 'text-amber-800 font-bold' : 'text-[#567781]'}`}>
                                            {isOutside ? '❌ Source Outside' : d.dosage}
                                          </span>
                                        </div>
                                      );
                                    })}
                                    {remainingCount > 0 && (
                                      <span className="text-[9px] text-[#567781] font-semibold block">
                                        +{remainingCount} more medicine{remainingCount > 1 ? 's' : ''}...
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-[10.5px] font-medium text-[#172B34] truncate">
                                    {m.medicineName} ({m.dosage})
                                  </p>
                                )}

                                {/* Out of Stock Alert Pill */}
                                {(m.items?.some(it => it.source === 'OUTSIDE_PATIENT_OWN' || it.status === 'UNAVAILABLE') || m.source === 'OUTSIDE_PATIENT_OWN') && (
                                  <div className="mt-1 pt-1 border-t border-amber-200/60 flex items-center gap-1 text-[9.5px] font-bold text-amber-900">
                                    <span>⚠️ Outside Purchase Required (₹0 Billed)</span>
                                  </div>
                                )}
                              </div>

                              {/* Prescriber Info */}
                              <div className="text-[10px] text-[#567781] truncate">
                                Prescriber: <strong className="text-[#172B34]">{m.prescribedBy || 'Attending Doctor'}</strong>
                              </div>
                            </div>

                            {/* Actions: View Requisition & Administer status */}
                            <div className="pt-2 border-t border-[#E8EEF2] flex items-center justify-between gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setViewingBedMedModal(m)}
                                className="w-full h-7 text-[11px] font-bold rounded-lg border-[#E8EEF2] text-[#567781] hover:text-[#087F8C] flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-[#087F8C]" />
                                <span>View Requisition</span>
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 4: INPATIENT LABS & DIAGNOSTICS (IN-HOUSE VS OUTSIDE)                 */}
              {/* ========================================================================= */}
              {fileActiveTab === 'LABS' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[#172B34]">Inpatient Diagnostic Requisitions</h4>
                      <p className="text-[11px] text-[#567781]">Requisition hospital lab bloodwork/imaging or record outside diagnostic tests.</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddBedLabForm(!showAddBedLabForm)}
                      className="px-2.5 py-1 bg-[#087F8C] hover:bg-[#076b77] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{showAddBedLabForm ? 'Close Form' : '+ Order Test'}</span>
                    </button>
                  </div>

                  {/* Add Lab Form */}
                  {showAddBedLabForm && (
                    <form onSubmit={handleAddInpatientLab} className="p-3 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] space-y-2.5 text-xs animate-in fade-in">
                      <div className="space-y-1">
                        <label className="font-semibold text-[#172B34]">Investigation / Test from Master Catalog *</label>
                        <select
                          value={bedLabCatalogId}
                          onChange={(e) => setBedLabCatalogId(e.target.value)}
                          className="w-full h-8 px-2 bg-white border border-[#E8EEF2] rounded-lg text-xs font-medium cursor-pointer"
                        >
                          {HOSPITAL_SERVICE_CATALOG.filter(s => s.category === 'INVESTIGATION').map((srv) => (
                            <option key={srv.id} value={srv.id}>
                              {srv.name} — ₹{srv.price} ({srv.categoryLabel})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Sourcing / Fulfillment Toggle */}
                      <div className="p-2.5 bg-white rounded-lg border border-[#E8EEF2] space-y-1.5">
                        <label className="font-bold text-[#172B34] text-[11px] block">Test Requisition Facility *</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <label className={`p-2 rounded-lg border flex items-start gap-2 cursor-pointer transition-all ${
                            bedLabSource === 'IN_HOUSE_LAB' ? 'bg-[#087F8C]/5 border-[#087F8C]' : 'border-[#E8EEF2] hover:bg-[#F6F9FB]'
                          }`}>
                            <input
                              type="radio"
                              name="bedLabSource"
                              checked={bedLabSource === 'IN_HOUSE_LAB'}
                              onChange={() => setBedLabSource('IN_HOUSE_LAB')}
                              className="mt-0.5 cursor-pointer text-[#087F8C]"
                            />
                            <div>
                              <strong className="text-[#172B34] block text-xs">In-House Hospital Laboratory</strong>
                              <span className="text-[10px] text-[#567781]">Sample collected in ward & added to running bill</span>
                            </div>
                          </label>

                          <label className={`p-2 rounded-lg border flex items-start gap-2 cursor-pointer transition-all ${
                            bedLabSource === 'OUTSIDE_DIAGNOSTIC' ? 'bg-amber-50/60 border-amber-400' : 'border-[#E8EEF2] hover:bg-[#F6F9FB]'
                          }`}>
                            <input
                              type="radio"
                              name="bedLabSource"
                              checked={bedLabSource === 'OUTSIDE_DIAGNOSTIC'}
                              onChange={() => setBedLabSource('OUTSIDE_DIAGNOSTIC')}
                              className="mt-0.5 cursor-pointer text-amber-600"
                            />
                            <div>
                              <strong className="text-amber-900 block text-xs">Outside Diagnostic Center</strong>
                              <span className="text-[10px] text-amber-700">Patient performing test outside (₹0 bill charge)</span>
                            </div>
                          </label>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-[#172B34]">Clinical Indication / Instructions</label>
                        <input
                          type="text"
                          placeholder="e.g. Fasting sample, STAT review, Fever investigation"
                          value={bedLabNotes}
                          onChange={(e) => setBedLabNotes(e.target.value)}
                          className="w-full h-8 px-2.5 bg-white border border-[#E8EEF2] rounded-lg text-xs"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowAddBedLabForm(false)}
                          className="px-3 py-1 bg-white border border-[#E8EEF2] rounded-lg text-xs font-semibold text-[#567781] hover:text-[#172B34] cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1 bg-[#087F8C] hover:bg-[#076b77] text-white rounded-lg text-xs font-bold cursor-pointer shadow-2xs"
                        >
                          Dispatch Test Requisition
                        </button>
                      </div>
                    </form>
                  )}

                  {/* List of Lab Orders */}
                  {(!fileViewingBed.inpatientLabOrders || fileViewingBed.inpatientLabOrders.length === 0) ? (
                    <div className="p-6 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] text-center space-y-1">
                      <FlaskConical className="w-6 h-6 text-[#567781] mx-auto opacity-40" />
                      <span className="text-xs font-bold text-[#172B34] block">No Inpatient Lab Tests Ordered</span>
                      <p className="text-[11px] text-[#567781]">Click + Order Test to requisition bloodwork or outside scans.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {fileViewingBed.inpatientLabOrders.map((l) => {
                        const isInHouse = l.source === 'IN_HOUSE_LAB';

                        return (
                          <div key={l.id} className="p-3 bg-white rounded-xl border border-[#E8EEF2] shadow-2xs flex items-center justify-between gap-2">
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <strong className="text-xs text-[#172B34]">{l.testName}</strong>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                  isInHouse ? 'bg-sky-50 text-sky-800 border border-sky-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}>
                                  {isInHouse ? 'Hospital Lab Requisition' : 'Outside Diagnostic (₹0)'}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#567781]">
                                Category: {l.category} • Ordered: {l.dateOrdered} • Status: <strong className="text-[#087F8C]">{l.status}</strong>
                              </p>
                              {l.notes && <p className="text-[10px] text-[#567781] italic">{l.notes}</p>}
                            </div>

                            <div className="text-right shrink-0">
                              {isInHouse ? (
                                <span className="font-mono font-bold text-xs text-[#172B34] block">₹{l.price}</span>
                              ) : (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Outside Test</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 3: SERVICES & RUNNING BILLING (HOSPITAL TARIFF AUTO-PRICING)           */}
              {/* ========================================================================= */}
              {fileActiveTab === 'BILLING' && (
                <div className="space-y-3">
                  {/* Financial Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 bg-[#F6F9FB] rounded-lg border border-[#E8EEF2]">
                    <div className="p-2 bg-white rounded border border-[#E8EEF2]">
                      <span className="text-[#567781] block text-[9.5px] font-bold uppercase">Total Incurred Charges</span>
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
                        {netBalanceDue > 0 ? 'Payable at discharge' : 'Fully settled'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
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

                  {/* Form: Add Service with Official Hospital Catalog Auto-Price */}
                  {showAddServiceForm && (
                    <form onSubmit={handleAddCatalogServiceCharge} className="p-3 bg-sky-50/30 rounded-lg border border-sky-200 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#172B34] text-xs">Add Service (Hospital Price Catalog)</span>
                        <span className="text-[10px] text-[#567781]">Standard hospital tariff automatically applied</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-semibold text-[#172B34]">Select Hospital Service *</label>
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
                          <label className="text-[10px] font-semibold text-[#172B34]">Hospital Rate (₹)</label>
                          <div className="w-full h-8 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded text-xs font-mono font-bold text-[#172B34] flex items-center">
                            ₹{currentSelectedService.price}
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold text-[#172B34]">Quantity</label>
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

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-semibold text-[#172B34]">Optional Remarks / Notes</label>
                          <input
                            type="text"
                            value={serviceNotes}
                            onChange={(e) => setServiceNotes(e.target.value)}
                            placeholder="e.g. Administered at 10 AM by nurse"
                            className="w-full h-7.5 px-2 bg-white border border-[#E8EEF2] rounded text-xs"
                          />
                        </div>

                        <div className="flex items-center justify-between pt-3">
                          <span className="text-xs text-[#567781]">
                            Total: <strong className="text-[#172B34] font-mono font-bold">₹{(currentSelectedService.price * (parseFloat(serviceQuantity) || 1)).toLocaleString()}</strong>
                          </span>
                          <Button
                            type="submit"
                            size="sm"
                            className="bg-[#087F8C] hover:bg-[#076b77] text-white text-xs h-7.5 px-4 rounded border-0 font-semibold"
                          >
                            Add to Bill
                          </Button>
                        </div>
                      </div>
                    </form>
                  )}

                  {/* Form: Record Advance */}
                  {showAddAdvanceForm && (
                    <form onSubmit={handleAddAdvancePayment} className="p-3 bg-emerald-50/30 rounded-lg border border-emerald-200 space-y-2 text-xs">
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
                            <option value="BANK_TRANSFER">Bank Transfer</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold text-[#172B34]">Remarks</label>
                          <input
                            type="text"
                            value={advanceNotes}
                            onChange={(e) => setAdvanceNotes(e.target.value)}
                            placeholder="e.g. Paid via GPay"
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
                          Save Deposit Receipt
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* Itemized Service Ledger Filter & Sorting Bar */}
                  <div className="bg-[#F6F9FB] p-2.5 rounded-xl border border-[#E8EEF2] flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                      {/* Search Bar */}
                      <div className="relative flex-1 max-w-[220px]">
                        <input
                          type="text"
                          value={ledgerSearchQuery}
                          onChange={(e) => setLedgerSearchQuery(e.target.value)}
                          placeholder="Search charges..."
                          className="w-full h-7.5 pl-2.5 pr-6 bg-white border border-[#E8EEF2] rounded-lg text-xs text-[#172B34] focus:outline-none focus:border-[#087F8C]"
                        />
                        {ledgerSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setLedgerSearchQuery('')}
                            className="absolute right-1.5 top-1.5 text-[#567781] hover:text-[#172B34]"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Category Filter */}
                      <select
                        value={ledgerCategoryFilter}
                        onChange={(e) => setLedgerCategoryFilter(e.target.value)}
                        className="h-7.5 px-2 bg-white border border-[#E8EEF2] rounded-lg text-xs text-[#172B34] font-medium focus:outline-none focus:border-[#087F8C]"
                      >
                        <option value="ALL">All Categories ({fileViewingBed.billingCharges?.length || 0})</option>
                        <option value="MEDICATION">💊 Medications</option>
                        <option value="INVESTIGATION">🔬 Investigations / Lab</option>
                        <option value="DOCTOR_VISIT">🩺 Doctor Visits</option>
                        <option value="NURSING_CARE">👩‍⚕️ Nursing Care</option>
                        <option value="SURGERY_OT">🔪 Surgery / OT</option>
                        <option value="PROCEDURE">⚡ Procedures</option>
                        <option value="CONSUMABLE">📦 Consumables</option>
                        <option value="OTHER">📋 Other Services</option>
                      </select>
                    </div>

                    {/* Sorting Filter: First to Last vs Last to First */}
                    <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-[#E8EEF2]">
                      <button
                        type="button"
                        onClick={() => setLedgerSortOrder('LAST_TO_FIRST')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          ledgerSortOrder === 'LAST_TO_FIRST'
                            ? 'bg-[#087F8C] text-white shadow-2xs'
                            : 'text-[#567781] hover:text-[#172B34]'
                        }`}
                        title="Show newest / most recent charges at the top"
                      >
                        <span>⬇️ Last to First (Newest)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setLedgerSortOrder('FIRST_TO_LAST')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          ledgerSortOrder === 'FIRST_TO_LAST'
                            ? 'bg-[#172B34] text-white shadow-2xs'
                            : 'text-[#567781] hover:text-[#172B34]'
                        }`}
                        title="Show oldest charges at the top in chronological order"
                      >
                        <span>⬆️ First to Last (Oldest)</span>
                      </button>
                    </div>
                  </div>

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
                        {/* Auto Bed Rent (Included when category is ALL) */}
                        {ledgerCategoryFilter === 'ALL' && !ledgerSearchQuery && (
                          <tr className="bg-emerald-50/10">
                            <td className="py-2 px-3">
                              <span className="font-semibold text-[#172B34] block">
                                {fileViewingBed.wardName} Rent ({fileViewingBed.bedNumber})
                              </span>
                              <span className="text-[10px] text-[#567781]">Admitted {fileViewingBed.admissionDate}</span>
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
                        )}

                        {/* Extra Charges (Sorted & Filtered) */}
                        {processedBillingCharges && processedBillingCharges.length > 0 ? (
                          processedBillingCharges.map((charge) => (
                            <tr key={charge.id} className="hover:bg-[#F6F9FB]">
                              <td className="py-2 px-3">
                                <span className="font-medium text-[#172B34] block">{charge.serviceName}</span>
                                <div className="flex items-center gap-1.5 text-[10px] text-[#567781] mt-0.5">
                                  {charge.dateAdded && (
                                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[#172B34] font-medium">
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
                                  onClick={() => handleRemoveServiceCharge(charge.id)}
                                  className="text-[#567781] hover:text-rose-600 p-1 cursor-pointer"
                                  title="Remove Charge"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-[#567781]">
                              {fileViewingBed.billingCharges?.length === 0
                                ? 'No additional services added to this bed yet.'
                                : 'No service charges matching the selected filter.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Advance Receipts */}
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
                              <div className="text-[10px] text-[#567781] font-mono">{formatClinicalDateTime(adv.datePaid)}</div>
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

              {/* ========================================================================= */}
              {/* TAB 6: DISCHARGE PLANNING & MULTI-CERTIFICATE DOSSIER CENTRE              */}
              {/* ========================================================================= */}
              {fileActiveTab === 'DISCHARGE' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[#172B34] flex items-center gap-1.5">
                        <LogOut className="w-4 h-4 text-amber-600" />
                        <span>Inpatient Discharge Certification & Medical Dossier Centre</span>
                      </h4>
                      <p className="text-[11px] text-[#567781]">Generate, customize & certify official medical certificates, discharge summary & take-home Rx</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {fileViewingBed.dischargePlan?.dossierStatus !== 'DOCS_CERTIFIED_READY' && (
                        <Button
                          size="sm"
                          onClick={() => handleCertifyAllDocumentsReady(fileViewingBed.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg h-7.5 px-3 border-0 cursor-pointer flex items-center gap-1 shadow-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>✓ Mark All Certificates Certified & Ready</span>
                        </Button>
                      )}

                      <Button
                        size="sm"
                        onClick={() => handleOpenPlanDischargeModal(fileViewingBed)}
                        className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg h-7.5 px-3 border-0 cursor-pointer flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>{fileViewingBed.dischargePlan ? 'Edit Discharge Plan' : '+ Prepare Discharge Plan'}</span>
                      </Button>
                    </div>
                  </div>

                  {/* Readiness Status Banner */}
                  {fileViewingBed.dischargePlan ? (
                    <div className="space-y-3">
                      <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
                        fileViewingBed.dischargePlan.dossierStatus === 'DOCS_CERTIFIED_READY'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                          : 'bg-amber-50 border-amber-200 text-amber-950'
                      }`}>
                        <div>
                          <div className="font-bold flex items-center gap-1.5">
                            <span>{fileViewingBed.dischargePlan.dossierStatus === 'DOCS_CERTIFIED_READY' ? '🟢 Clinical Dossier Certified & Ready:' : '⏳ Planned Departure:'}</span>
                            <span className="font-mono">{fileViewingBed.dischargePlan.plannedDate || 'Today'} at {fileViewingBed.dischargePlan.plannedTime || '14:00'}</span>
                            <span className="px-2 py-0.5 bg-white/80 rounded font-black text-[10px] uppercase border">
                              {fileViewingBed.dischargePlan.dischargeType}
                            </span>
                          </div>
                          <p className="text-[11px] mt-0.5">
                            {fileViewingBed.dischargePlan.dossierStatus === 'DOCS_CERTIFIED_READY' ? (
                              <span>Certified by <strong>{fileViewingBed.dischargePlan.certifiedByDoctorName || fileViewingBed.consultantDoctorName}</strong> at {fileViewingBed.dischargePlan.certifiedTimestamp || 'Recent'}. Ready for cashier billing clearance.</span>
                            ) : (
                              <span>Follow-up: <strong>{fileViewingBed.dischargePlan.followUpDate || 'After 7 days'}</strong> with {fileViewingBed.dischargePlan.followUpDoctor || fileViewingBed.consultantDoctorName}</span>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Button
                            size="sm"
                            onClick={() => setPrintDischargeSummaryBed(fileViewingBed)}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg h-7 px-2.5 border-0 cursor-pointer flex items-center gap-1"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Discharge Summary</span>
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => setPrintMedCertBed(fileViewingBed)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg h-7 px-2.5 border-0 cursor-pointer flex items-center gap-1"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Medical / Sick Cert</span>
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => setPrintHospCertBed(fileViewingBed)}
                            className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg h-7 px-2.5 border-0 cursor-pointer flex items-center gap-1"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Hospital Stay Proof</span>
                          </Button>

                          {fileViewingBed.dischargePlan.dischargeType === 'TRANSFER' && (
                            <Button
                              size="sm"
                              onClick={() => setPrintReferralMemoBed(fileViewingBed)}
                              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg h-7 px-2.5 border-0 cursor-pointer flex items-center gap-1"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Referral Memo</span>
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Certificate Sub-Navigation Studio */}
                      <div className="flex items-center gap-1 p-1 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] overflow-x-auto">
                        <button
                          type="button"
                          onClick={() => setCertActiveSubTab('SUMMARY')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                            certActiveSubTab === 'SUMMARY'
                              ? 'bg-[#172B34] text-white shadow-2xs'
                              : 'text-[#567781] hover:text-[#172B34]'
                          }`}
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>1. Clinical Summary Dossier</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCertActiveSubTab('FITNESS_CERT')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                            certActiveSubTab === 'FITNESS_CERT'
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'text-[#567781] hover:text-indigo-600'
                          }`}
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>2. Medical Sickness & Fitness Cert</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCertActiveSubTab('HOSP_CERT')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                            certActiveSubTab === 'HOSP_CERT'
                              ? 'bg-teal-600 text-white shadow-2xs'
                              : 'text-[#567781] hover:text-teal-600'
                          }`}
                        >
                          <Building className="w-3.5 h-3.5" />
                          <span>3. Hospital Stay Certificate</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCertActiveSubTab('TAKE_HOME_RX')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                            certActiveSubTab === 'TAKE_HOME_RX'
                              ? 'bg-[#087F8C] text-white shadow-2xs'
                              : 'text-[#567781] hover:text-[#087F8C]'
                          }`}
                        >
                          <Pill className="w-3.5 h-3.5" />
                          <span>4. Take-Home Prescription ({fileViewingBed.dischargePlan.takeHomeMedications?.length || 0})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCertActiveSubTab('REFERRAL')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                            certActiveSubTab === 'REFERRAL'
                              ? 'bg-rose-600 text-white shadow-2xs'
                              : 'text-[#567781] hover:text-rose-600'
                          }`}
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>5. Referral & Transfer Memo</span>
                        </button>
                      </div>

                      {/* SUBTAB 1: CLINICAL SUMMARY */}
                      {certActiveSubTab === 'SUMMARY' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                            <div className="p-3 bg-white rounded-xl border border-[#E8EEF2] space-y-1">
                              <span className="text-[10px] font-bold text-[#567781] uppercase block">Final Confirmed Diagnosis</span>
                              <p className="font-semibold text-[#172B34]">{fileViewingBed.dischargePlan.finalDiagnosis || fileViewingBed.admittingDiagnosis}</p>
                            </div>
                            <div className="p-3 bg-white rounded-xl border border-[#E8EEF2] space-y-1">
                              <span className="text-[10px] font-bold text-[#567781] uppercase block">Condition on Departure</span>
                              <p className="font-semibold text-emerald-800">{fileViewingBed.dischargePlan.conditionAtDischarge || 'Hemodynamically stable, afebrile, ambulatory.'}</p>
                            </div>
                            <div className="p-3 bg-white rounded-xl border border-[#E8EEF2] space-y-1">
                              <span className="text-[10px] font-bold text-[#567781] uppercase block">Hospital Course & Interventions</span>
                              <p className="text-[#172B34] text-[11.5px] leading-relaxed">{fileViewingBed.dischargePlan.hospitalCourse || 'Uneventful inpatient recovery with clinical improvement.'}</p>
                            </div>
                            <div className="p-3 bg-white rounded-xl border border-[#E8EEF2] space-y-1">
                              <span className="text-[10px] font-bold text-[#567781] uppercase block">Home Care & Dietary Advice</span>
                              <p className="text-[#172B34] text-[11.5px] leading-relaxed">{fileViewingBed.dischargePlan.dietaryAdvice || 'Balanced light diet. Adequate fluid intake.'}</p>
                            </div>
                          </div>

                          {fileViewingBed.dischargePlan.emergencyAlertSigns && (
                            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-900">
                              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                              <div>
                                <strong className="block">Emergency Red Flag Warning Signs:</strong>
                                <span className="text-[11px] text-rose-800">{fileViewingBed.dischargePlan.emergencyAlertSigns}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* SUBTAB 2: MEDICAL SICKNESS & FITNESS CERTIFICATE */}
                      {certActiveSubTab === 'FITNESS_CERT' && (
                        <div className="p-4 bg-white rounded-xl border border-[#E8EEF2] space-y-3 text-xs">
                          <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-2">
                            <div>
                              <h5 className="font-bold text-slate-900 text-sm">Official Medical Fitness & Sickness Leave Certificate</h5>
                              <p className="text-[11px] text-slate-500">Legal medical rest and fit-to-resume certificate for employer/college</p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => setPrintMedCertBed(fileViewingBed)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg h-7 px-3 border-0 cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Print Medical Certificate</span>
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                            <div>
                              <span className="text-[10px] font-bold text-indigo-900 uppercase block">Medical Rest Period:</span>
                              <strong className="text-indigo-950 font-mono text-xs">
                                {fileViewingBed.dischargePlan.medicalCertificate?.restStartDate || fileViewingBed.admissionDate || 'Today'} to {fileViewingBed.dischargePlan.medicalCertificate?.restEndDate || fileViewingBed.dischargePlan.plannedDate || 'Today'}
                              </strong>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-indigo-900 uppercase block">Fit to Resume Duty From:</span>
                              <strong className="text-emerald-800 font-mono text-xs">
                                {fileViewingBed.dischargePlan.medicalCertificate?.fitToResumeDate || fileViewingBed.dischargePlan.plannedDate || 'Today'}
                              </strong>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-indigo-900 uppercase block">Certifying Doctor:</span>
                              <strong className="text-slate-900 text-xs">
                                {fileViewingBed.consultantDoctorName || 'Dr. Patil, MD'}
                              </strong>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* SUBTAB 3: HOSPITALIZATION PROOF CERTIFICATE */}
                      {certActiveSubTab === 'HOSP_CERT' && (
                        <div className="p-4 bg-white rounded-xl border border-[#E8EEF2] space-y-3 text-xs">
                          <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-2">
                            <div>
                              <h5 className="font-bold text-slate-900 text-sm">Certificate of Inpatient Hospitalization</h5>
                              <p className="text-[11px] text-slate-500">Official proof of stay for insurance reimbursement and mediclaim</p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => setPrintHospCertBed(fileViewingBed)}
                              className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg h-7 px-3 border-0 cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Print Stay Certificate</span>
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-teal-50/50 rounded-lg border border-teal-100">
                            <div>
                              <span className="text-[10px] font-bold text-teal-900 uppercase block">Admission Period:</span>
                              <strong className="text-teal-950 font-mono text-xs">
                                {fileViewingBed.admissionDate} {fileViewingBed.admissionTime || '10:00 AM'} to {fileViewingBed.dischargePlan.plannedDate}
                              </strong>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-teal-900 uppercase block">Ward Category & Bed:</span>
                              <strong className="text-slate-900 text-xs">
                                {fileViewingBed.wardName} ({fileViewingBed.bedNumber})
                              </strong>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-teal-900 uppercase block">IPD Registration No:</span>
                              <strong className="text-slate-900 font-mono text-xs">
                                {fileViewingBed.ipdNumber || 'IPD-2026-9042'}
                              </strong>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* SUBTAB 4: TAKE-HOME PRESCRIPTION */}
                      {certActiveSubTab === 'TAKE_HOME_RX' && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-bold text-[#172B34] uppercase tracking-wider flex items-center gap-1.5">
                              <Pill className="w-3.5 h-3.5 text-[#087F8C]" />
                              <span>Take-Home Prescription Chart ({fileViewingBed.dischargePlan.takeHomeMedications?.length || 0})</span>
                            </h5>
                          </div>

                          {fileViewingBed.dischargePlan.takeHomeMedications && fileViewingBed.dischargePlan.takeHomeMedications.length > 0 ? (
                            <div className="bg-white rounded-xl border border-[#E8EEF2] overflow-hidden">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="border-b border-[#E8EEF2] text-[#567781] text-[10px] uppercase font-bold bg-[#F6F9FB]">
                                    <th className="p-2">#</th>
                                    <th className="p-2">Medicine / Generic</th>
                                    <th className="p-2">Dose</th>
                                    <th className="p-2">Frequency</th>
                                    <th className="p-2">Duration</th>
                                    <th className="p-2">Timing / Instructions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E8EEF2] text-[11.5px]">
                                  {fileViewingBed.dischargePlan.takeHomeMedications.map((med, idx) => (
                                    <tr key={med.id || idx} className="hover:bg-slate-50">
                                      <td className="p-2 font-mono text-[10px] text-[#567781]">{idx + 1}</td>
                                      <td className="p-2 font-semibold text-[#172B34]">{med.name}</td>
                                      <td className="p-2 text-[#567781]">{med.dosage || '-'}</td>
                                      <td className="p-2 font-medium text-[#087F8C]">{med.frequency}</td>
                                      <td className="p-2 font-mono font-semibold text-slate-800">{med.duration}</td>
                                      <td className="p-2 text-slate-600">
                                        {med.timing && <span className="font-semibold text-purple-700 block">{med.timing}</span>}
                                        {med.instructions && <span className="text-[10px] text-[#567781]">{med.instructions}</span>}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="p-4 bg-slate-50 rounded-xl border border-[#E8EEF2] text-center text-xs text-[#567781]">
                              No take-home medications recorded. Click <strong>Edit Discharge Plan</strong> to add discharge medicines.
                            </div>
                          )}
                        </div>
                      )}

                      {/* SUBTAB 5: REFERRAL & TRANSFER MEMO */}
                      {certActiveSubTab === 'REFERRAL' && (
                        <div className="p-4 bg-white rounded-xl border border-[#E8EEF2] space-y-3 text-xs">
                          <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-2">
                            <div>
                              <h5 className="font-bold text-rose-900 text-sm">Inter-Hospital Clinical Referral & Transfer Memo</h5>
                              <p className="text-[11px] text-slate-500">Official handover note for transfer to higher medical center</p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => setPrintReferralMemoBed(fileViewingBed)}
                              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg h-7 px-3 border-0 cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Print Referral Memo</span>
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-rose-50/50 rounded-lg border border-rose-100">
                            <div>
                              <span className="text-[10px] font-bold text-rose-900 uppercase block">Referred To:</span>
                              <strong className="text-slate-900 text-xs">
                                {fileViewingBed.dischargePlan.referralMemo?.destinationHospital || 'City Institute of Medical Sciences (CIMS)'}
                              </strong>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-rose-900 uppercase block">Reason for Referral:</span>
                              <p className="text-slate-800 text-[11px]">
                                {fileViewingBed.dischargePlan.referralMemo?.transferReason || 'Requires tertiary level intensive monitoring & specialized care.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 bg-white rounded-xl border border-[#E8EEF2] text-center space-y-3 max-w-md mx-auto">
                      <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                        <LogOut className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-[#172B34]">No Discharge Plan Initiated</h4>
                        <p className="text-xs text-[#567781]">
                          Plan the patient's departure time, clinical summary, follow-up advice, and take-home medications.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleOpenPlanDischargeModal(fileViewingBed)}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs h-8 px-4 rounded-xl border-0 cursor-pointer shadow-xs"
                      >
                        + Create Discharge Plan
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-3 bg-[#F6F9FB] border-t border-[#E8EEF2] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPrintInvoiceBed(fileViewingBed)}
                  className="h-8 text-xs font-semibold rounded-lg border-[#E8EEF2] text-[#567781] hover:text-[#172B34] flex items-center gap-1 cursor-pointer"
                >
                  <Receipt className="w-3.5 h-3.5 text-[#087F8C]" />
                  <span>Tax Invoice</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPrintDischargeSummaryBed(fileViewingBed)}
                  className="h-8 text-xs font-semibold rounded-lg border-[#E8EEF2] text-[#567781] hover:text-[#172B34] flex items-center gap-1 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />
                  <span>Discharge Summary</span>
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {fileViewingBed.status === 'OCCUPIED' ? (
                  <Button
                    size="sm"
                    onClick={() => handleOpenPlanDischargeModal(fileViewingBed)}
                    className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs h-8 px-3 rounded-lg border-0 cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    <span>Plan Discharge & Send to Centre 📤</span>
                  </Button>
                ) : fileViewingBed.dischargePlan?.dossierStatus === 'BILL_PAID_READY_TO_GO' ? (
                  <Button
                    size="sm"
                    onClick={() => handleVacateBedAndClean(fileViewingBed.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8.5 px-4 rounded-xl border-0 cursor-pointer flex items-center gap-2 shadow-md animate-pulse"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>🚪 Vacate Bed & Mark for Cleaning</span>
                  </Button>
                ) : fileViewingBed.dischargePlan?.dossierStatus === 'SENT_TO_BILLING' ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg">
                      ⏳ Sent to Billing Desk (Awaiting Payment)
                    </span>
                    <Link href="/billing">
                      <Button
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8 px-3 rounded-lg border-0 cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <span>Open in Billing Desk ↗</span>
                      </Button>
                    </Link>
                  </div>
                ) : fileViewingBed.dischargePlan?.dossierStatus === 'DOCS_CERTIFIED_READY' ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      const updated = beds.map((b) =>
                        b.id === fileViewingBed.id
                          ? {
                              ...b,
                              dischargePlan: {
                                ...(b.dischargePlan || { dischargeType: 'REGULAR' }),
                                dossierStatus: 'SENT_TO_BILLING' as const
                              }
                            }
                          : b
                      );
                      updateBedsState(updated);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-4 rounded-lg border-0 cursor-pointer flex items-center gap-1.5 shadow-md"
                  >
                    <SendHorizontal className="w-3.5 h-3.5" />
                    <span>Send Request to Billing Team ⚡</span>
                  </Button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Link href="/discharge-centre">
                      <Button
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8 px-3 rounded-lg border-0 cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <span>Open in Discharge Centre ↗</span>
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      onClick={() => handleOpenPlanDischargeModal(fileViewingBed)}
                      className="bg-slate-200 hover:bg-slate-300 text-[#172B34] font-semibold text-xs h-8 px-3 rounded-lg border-0 cursor-pointer"
                    >
                      Edit Plan
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADMIT PATIENT WITH INTAKE VITALS & EMR SETUP                     */}
      {/* ========================================================================= */}
      {showAdmitModal && (
        <div className="fixed inset-0 bg-[#172B34]/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-xl border border-[#E8EEF2] p-4 sm:p-5 space-y-3.5 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-[#E8EEF2] pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-[#172B34]">
                  Inpatient Hospital Admission (IPD)
                </h3>
                <p className="text-[11px] text-[#567781]">Admit patient, record baseline vitals & allocate bed</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdmitModal(false)}
                className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1 p-1 bg-[#F6F9FB] rounded-lg border border-[#E8EEF2]">
              <button
                type="button"
                onClick={() => {
                  setAdmitMode('REGISTERED');
                  if (realPatients.length > 0) {
                    const p = realPatients[0];
                    setSelectedPatientId(p.id);
                    setAdmitPatientName(p.name || '');
                    setAdmitAge(String(p.age || ''));
                    setAdmitGender((p.gender as any) || 'MALE');
                    setAdmitPhone(p.phone || '');
                  }
                }}
                className={`py-1 text-xs font-semibold rounded transition-all cursor-pointer ${
                  admitMode === 'REGISTERED'
                    ? 'bg-white text-[#172B34] shadow-2xs font-bold'
                    : 'text-[#567781] hover:text-[#172B34]'
                }`}
              >
                Registered Patient
              </button>

              <button
                type="button"
                onClick={() => {
                  setAdmitMode('NEW_PATIENT');
                  setSelectedPatientId('');
                  setAdmitPatientName('');
                  setAdmitAge('');
                  setAdmitGender('MALE');
                  setAdmitPhone('');
                }}
                className={`py-1 text-xs font-semibold rounded transition-all cursor-pointer ${
                  admitMode === 'NEW_PATIENT'
                    ? 'bg-white text-[#172B34] shadow-2xs font-bold'
                    : 'text-[#567781] hover:text-[#172B34]'
                }`}
              >
                New Walk-In Patient
              </button>
            </div>

            <form onSubmit={handleAdmitSubmit} className="space-y-3 text-xs">
              {admitMode === 'REGISTERED' ? (
                <div className="space-y-1">
                  <label className="font-semibold text-[#172B34]">Choose Registered Patient *</label>
                  {realPatients.length > 0 ? (
                    <select
                      required
                      className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs font-medium text-[#172B34] cursor-pointer"
                      value={selectedPatientId}
                      onChange={(e) => {
                        setSelectedPatientId(e.target.value);
                        const p = realPatients.find((pt) => pt.id === e.target.value);
                        if (p) {
                          setAdmitPatientName(p.name || '');
                          setAdmitAge(String(p.age || ''));
                          setAdmitGender((p.gender as any) || 'MALE');
                          setAdmitPhone(p.phone || '');
                        }
                      }}
                    >
                      <option value="">-- Select Registered Patient --</option>
                      {realPatients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} • {p.phone} ({p.age ? `${p.age}Y` : ''} {p.gender})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-2 bg-amber-50 text-amber-800 rounded text-xs">
                      No registered patients found. Switch to New Walk-In Patient above.
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5 p-2.5 bg-emerald-50/20 border border-emerald-200/50 rounded-lg">
                  <div className="space-y-1">
                    <label className="font-semibold text-[#172B34]">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kulkarni"
                      className="w-full h-8 px-2.5 bg-white border border-[#E8EEF2] rounded-lg text-xs"
                      value={admitPatientName}
                      onChange={(e) => setAdmitPatientName(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="space-y-1">
                      <label className="font-semibold text-[#172B34]">Age</label>
                      <input
                        type="number"
                        placeholder="45"
                        className="w-full h-8 px-2 bg-white border border-[#E8EEF2] rounded-lg text-xs"
                        value={admitAge}
                        onChange={(e) => setAdmitAge(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-[#172B34]">Gender</label>
                      <select
                        className="w-full h-8 px-2 bg-white border border-[#E8EEF2] rounded-lg text-xs"
                        value={admitGender}
                        onChange={(e) => setAdmitGender(e.target.value as any)}
                      >
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-[#172B34]">Phone</label>
                      <input
                        type="tel"
                        placeholder="Phone"
                        className="w-full h-8 px-2 bg-white border border-[#E8EEF2] rounded-lg text-xs"
                        value={admitPhone}
                        onChange={(e) => setAdmitPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Admission Baseline Vitals Section */}
              <div className="p-2.5 bg-[#F6F9FB] rounded-lg border border-[#E8EEF2] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-bold text-[#172B34] flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-[#087F8C]" />
                    <span>Admission Baseline Vitals (Auto-Saved to Doctor Rounds)</span>
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  <div>
                    <label className="text-[9.5px] text-[#567781] block">Temp (°F)</label>
                    <input
                      type="text"
                      value={admitTemp}
                      onChange={(e) => setAdmitTemp(e.target.value)}
                      placeholder="98.6"
                      className="w-full h-7.5 px-1 text-center bg-white border border-[#E8EEF2] rounded text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[9.5px] text-[#567781] block">BP (mmHg)</label>
                    <input
                      type="text"
                      value={admitBp}
                      onChange={(e) => setAdmitBp(e.target.value)}
                      placeholder="120/80"
                      className="w-full h-7.5 px-1 text-center bg-white border border-[#E8EEF2] rounded text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[9.5px] text-[#567781] block">Pulse (bpm)</label>
                    <input
                      type="text"
                      value={admitPulse}
                      onChange={(e) => setAdmitPulse(e.target.value)}
                      placeholder="78"
                      className="w-full h-7.5 px-1 text-center bg-white border border-[#E8EEF2] rounded text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[9.5px] text-[#567781] block">SpO2 (%)</label>
                    <input
                      type="text"
                      value={admitSpo2}
                      onChange={(e) => setAdmitSpo2(e.target.value)}
                      placeholder="99"
                      className="w-full h-7.5 px-1 text-center bg-white border border-[#E8EEF2] rounded text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-[#172B34]">Assign Ward Bed *</label>
                  <select
                    required
                    className="w-full h-8 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs font-semibold cursor-pointer"
                    value={admitTargetBedId}
                    onChange={(e) => setAdmitTargetBedId(e.target.value)}
                  >
                    {beds.map((b) => (
                      <option key={b.id} value={b.id} disabled={b.status !== 'AVAILABLE'}>
                        {b.bedNumber} • {b.wardName} (₹{b.dailyRate}/d) {b.status !== 'AVAILABLE' ? `[${b.status}]` : '🟢 [VACANT]'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#172B34]">Initial Advance Deposit (₹)</label>
                  <input
                    type="number"
                    value={admitInitialDeposit}
                    onChange={(e) => setAdmitInitialDeposit(e.target.value)}
                    placeholder="3000"
                    className="w-full h-8 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#172B34]">Attending Doctor / Consultant</label>
                <select
                  className="w-full h-8 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs font-medium cursor-pointer"
                  value={admitDoctorName}
                  onChange={(e) => setAdmitDoctorName(e.target.value)}
                >
                  <option value="">-- Select Attending Doctor --</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={`Dr. ${d.name} (${d.specialization})`}>
                      Dr. {d.name} ({d.specialization})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#172B34]">Reason for Admission / Diagnosis *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acute appendicitis / Post-op observation"
                  className="w-full h-8 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                  value={admitDiagnosis}
                  onChange={(e) => setAdmitDiagnosis(e.target.value)}
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#E8EEF2]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdmitModal(false)}
                  className="h-8 text-xs rounded"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingAdmit}
                  size="sm"
                  className="bg-[#087F8C] hover:bg-[#076b77] text-white text-xs font-semibold h-8 px-3 rounded border-0"
                >
                  {isSubmittingAdmit ? 'Admitting...' : 'Confirm Admission'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: SCHEDULE OT SURGERY (FOR ADMITTED PATIENTS)                      */}
      {/* ========================================================================= */}
      {showSurgeryModal && (
        <div className="fixed inset-0 bg-[#172B34]/50 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl border border-[#E8EEF2] p-4 space-y-3">
            <div className="flex justify-between items-start border-b border-[#E8EEF2] pb-2">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-[#172B34] flex items-center gap-1.5">
                  <Scissors className="w-4 h-4 text-purple-600" />
                  <span>Schedule Inpatient OT Procedure</span>
                </h3>
                <p className="text-[11px] text-[#567781]">Reserve surgical theater for an admitted inpatient</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSurgeryModal(false)}
                className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSurgery} className="space-y-2.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[#172B34]">Admitted Inpatient *</label>
                <select
                  required
                  className="w-full h-8 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs font-medium cursor-pointer"
                  value={surgBedId}
                  onChange={(e) => setSurgBedId(e.target.value)}
                >
                  <option value="">-- Choose Admitted Patient --</option>
                  {occupiedBeds.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.patientName} ({b.bedNumber} • {b.wardType}) - {b.admittingDiagnosis || 'Inpatient'}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-[#567781]">
                  Surgery charges will be automatically billed to this patient's running inpatient account.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#172B34]">Procedure / Surgery Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Laparoscopic Appendectomy, Hernioplasty"
                  className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                  value={surgName}
                  onChange={(e) => setSurgName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-[#172B34]">OT Suite</label>
                  <select
                    className="w-full h-8 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs cursor-pointer"
                    value={surgRoom}
                    onChange={(e) => setSurgRoom(e.target.value)}
                  >
                    {Array.from({ length: configuredOtCount }, (_, idx) => (
                      <option key={idx} value={`OT-${idx + 1}`}>
                        OT-{idx + 1} (Major Suite)
                      </option>
                    ))}
                    <option value="MINOR_OT">Minor OT / Daycare</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[#172B34]">Scheduled Time</label>
                  <input
                    type="text"
                    placeholder="02:30 PM"
                    className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                    value={surgTime}
                    onChange={(e) => setSurgTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#172B34]">Lead Surgeon</label>
                <select
                  className="w-full h-8 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs cursor-pointer"
                  value={surgDoctor}
                  onChange={(e) => setSurgDoctor(e.target.value)}
                >
                  <option value="">-- Assigned Attending Doctor --</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={`Dr. ${d.name}`}>
                      Dr. {d.name} {d.specialization ? `(${d.specialization})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2.5 flex justify-end gap-2 border-t border-[#E8EEF2]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSurgeryModal(false)}
                  className="h-8 text-xs rounded-lg cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[#087F8C] hover:bg-[#076b77] text-white text-xs font-semibold h-8 px-4 rounded-lg border-0 cursor-pointer shadow-xs"
                >
                  Confirm & Schedule OT
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CASUALTY EMERGENCY ARRIVAL                                       */}
      {/* ========================================================================= */}
      {showEmgModal && (
        <div className="fixed inset-0 bg-[#172B34]/50 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl border border-[#E8EEF2] p-4 space-y-3">
            <div className="flex justify-between items-start border-b border-[#E8EEF2] pb-2">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-[#172B34]">Casualty / ER Intake</h3>
                <p className="text-[11px] text-[#567781]">Rapid Emergency Triage</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEmgModal(false)}
                className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddEmergency} className="space-y-2.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[#172B34]">Patient Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Patient name"
                  className="w-full h-7.5 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded text-xs"
                  value={emgPatientName}
                  onChange={(e) => setEmgPatientName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-[#172B34]">Age / Gender</label>
                  <input
                    type="text"
                    placeholder="35M"
                    className="w-full h-7.5 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded text-xs"
                    value={emgAgeGender}
                    onChange={(e) => setEmgAgeGender(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[#172B34]">Triage Acuity</label>
                  <select
                    className="w-full h-7.5 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded text-xs cursor-pointer"
                    value={emgAcuity}
                    onChange={(e) => setEmgAcuity(e.target.value as any)}
                  >
                    <option value="RED_CRITICAL">RED (Critical)</option>
                    <option value="YELLOW_URGENT">YELLOW (Urgent)</option>
                    <option value="GREEN_NON_URGENT">GREEN (Non-Urgent)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#172B34]">Chief Complaint *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chest pain / Trauma"
                  className="w-full h-7.5 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded text-xs"
                  value={emgComplaint}
                  onChange={(e) => setEmgComplaint(e.target.value)}
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#E8EEF2]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEmgModal(false)}
                  className="h-7 text-xs rounded"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold h-7 px-3 rounded border-0"
                >
                  Admit Casualty
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* MODAL 5: TRIGGER DOCTOR URGENT ALERT / NURSE CALL                         */}
      {/* ========================================================================= */}
      {showAlertModal && fileViewingBed && (
        <div className="fixed inset-0 bg-[#172B34]/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#E8EEF2] p-4 space-y-3">
            <div className="flex justify-between items-start border-b border-[#E8EEF2] pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-rose-700 flex items-center gap-1.5">
                  <BellRing className="w-4 h-4 text-rose-600 animate-bounce" />
                  <span>Trigger Doctor Urgent Alert / Nurse Call</span>
                </h3>
                <p className="text-[11px] text-[#567781]">
                  Broadcasts emergency callout to {fileViewingBed.consultantDoctorName || 'Attending Doctor'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAlertModal(false)}
                className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTriggerDoctorAlert} className="space-y-3 text-xs">
              <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200 text-rose-900 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider block">Patient & Bed Identification</span>
                <strong className="text-xs block">{fileViewingBed.patientName} (Bed {fileViewingBed.bedNumber} • {fileViewingBed.wardName})</strong>
                <span className="text-[11px] text-rose-700 block">Admitting Diagnosis: {fileViewingBed.admittingDiagnosis}</span>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#172B34]">Alert Urgency Priority</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAlertPriority('CRITICAL')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border cursor-pointer transition-all ${
                      alertPriority === 'CRITICAL' ? 'bg-rose-600 text-white border-rose-600 shadow-xs' : 'bg-white text-rose-700 border-rose-200'
                    }`}
                  >
                    🚨 CRITICAL
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlertPriority('HIGH')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border cursor-pointer transition-all ${
                      alertPriority === 'HIGH' ? 'bg-amber-500 text-white border-amber-500 shadow-xs' : 'bg-white text-amber-700 border-amber-200'
                    }`}
                  >
                    ⚠️ HIGH
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlertPriority('ROUTINE')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border cursor-pointer transition-all ${
                      alertPriority === 'ROUTINE' ? 'bg-[#087F8C] text-white border-[#087F8C] shadow-xs' : 'bg-white text-[#087F8C] border-teal-200'
                    }`}
                  >
                    ℹ️ ROUTINE
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#172B34]">Reason / Clinical Concern *</label>
                <textarea
                  required
                  rows={3}
                  value={alertReason}
                  onChange={(e) => setAlertReason(e.target.value)}
                  placeholder="e.g. SpO2 dropped to 89% on room air, severe abdominal pain, high grade fever..."
                  className="w-full p-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#E8EEF2]">
                <button
                  type="button"
                  onClick={() => setShowAlertModal(false)}
                  className="px-3 py-1.5 bg-white border border-[#E8EEF2] rounded-lg text-xs font-semibold text-[#567781] hover:text-[#172B34] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <BellRing className="w-3.5 h-3.5" />
                  <span>Broadcast Alert</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bed Medication Requisition Details Pop-up Modal */}
      {viewingBedMedModal && fileViewingBed && (
        <div className="fixed inset-0 bg-[#172B34]/70 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-[#E8EEF2] p-5 space-y-4 max-h-[85vh] flex flex-col justify-between overflow-hidden">
            <div className="flex justify-between items-start border-b border-[#E8EEF2] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded border border-rose-200">
                    Bed {fileViewingBed.bedNumber}
                  </span>
                  <strong className="text-sm font-bold text-[#172B34]">{fileViewingBed.patientName}</strong>
                  <span className="font-mono text-xs font-bold bg-slate-100 text-[#172B34] px-2 py-0.5 rounded border border-[#E8EEF2]">
                    {viewingBedMedModal.indentNumber || 'IND-REQ'}
                  </span>
                </div>
                <p className="text-xs text-[#567781] mt-0.5">
                  {fileViewingBed.wardName} • Ordered: {viewingBedMedModal.dateOrdered}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewingBedMedModal(null)}
                className="text-[#567781] hover:text-[#172B34] p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1">
              <div className="bg-[#F6F9FB] p-2.5 rounded-xl border border-[#E8EEF2] flex items-center justify-between text-xs flex-wrap gap-2">
                <div>
                  <span className="text-[#567781]">Prescriber: </span>
                  <strong className="text-[#172B34]">{viewingBedMedModal.prescribedBy || 'Attending Doctor'}</strong>
                </div>
                {viewingBedMedModal.requestedByNurse && (
                  <div>
                    <span className="text-[#567781]">Duty Nurse: </span>
                    <strong className="text-[#087F8C]">{viewingBedMedModal.requestedByNurse}</strong>
                  </div>
                )}
              </div>

              {/* Out of Stock Outside Alert in Modal */}
              {(viewingBedMedModal.items?.some(it => it.source === 'OUTSIDE_PATIENT_OWN' || it.status === 'UNAVAILABLE') || viewingBedMedModal.source === 'OUTSIDE_PATIENT_OWN') && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs flex items-center justify-between gap-2 text-amber-950">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <strong className="block text-amber-900">⚠️ Out of Stock at Central Pharmacy:</strong>
                      <span className="text-[11px] text-amber-800">
                        This medicine is not available in hospital stock. Please arrange / source from outside pharmacy. No charges are billed to the inpatient ledger (₹0).
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
                  Medications Breakdown ({viewingBedMedModal.items?.length || 1})
                </h4>

                {viewingBedMedModal.items && viewingBedMedModal.items.length > 0 ? (
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
                        {viewingBedMedModal.items.map((it, idx) => {
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
                    <strong className="text-sm text-[#172B34] block">{viewingBedMedModal.medicineName}</strong>
                    <span className="text-[#567781]">{viewingBedMedModal.dosage} • {viewingBedMedModal.frequency}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between border-t border-[#E8EEF2]">
              <span className="text-xs text-[#567781]">
                Status: <strong className="text-[#172B34]">{viewingBedMedModal.status === 'QUEUED_PHARMACY' ? '⏳ Queued at Pharmacy (Awaiting Dispatch)' : viewingBedMedModal.status === 'DISPENSED' ? '✓ Dispatched by Pharmacy' : '✓ Administered'}</strong>
              </span>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setViewingBedMedModal(null)}
                className="h-8 text-xs font-bold rounded-xl px-5"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 9: PLAN DISCHARGE & TAKE-HOME PRESCRIPTION BUILDER                   */}
      {/* ========================================================================= */}
      {showPlanDischargeModal && (
        <div className="fixed inset-0 bg-[#172B34]/60 backdrop-blur-xs flex items-center justify-center p-3 z-60 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-[#E8EEF2] p-5 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-[#E8EEF2] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#172B34] flex items-center gap-2">
                  <LogOut className="w-5 h-5 text-amber-600" />
                  <span>Plan Patient Discharge & Take-Home Rx</span>
                </h3>
                <p className="text-xs text-[#567781]">Prepare clinical clearance, instructions & take-home medications</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPlanDischargeModal(false)}
                className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlanDischargeSubmit} className="space-y-4 text-xs">
              {/* Select ONLY Needed Certificates for this Patient */}
              <div className="p-3.5 bg-gradient-to-br from-amber-50/50 to-white rounded-xl border border-amber-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-amber-950 block">Select Needed Certificates for this Patient *</span>
                    <span className="text-[11px] text-amber-800">Only checked certificates will be sent to the Discharge Centre for preparation</span>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                    {[planReqSummary, planReqMedCert, planReqHospCert, planReqTakeHomeRx, planReqReferralMemo].filter(Boolean).length} Selected
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                    planReqSummary ? 'bg-amber-100/60 border-amber-300 text-amber-950 font-bold' : 'bg-white border-[#E8EEF2] text-[#567781]'
                  }`}>
                    <input
                      type="checkbox"
                      checked={planReqSummary}
                      onChange={(e) => setPlanReqSummary(e.target.checked)}
                      className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <div>
                      <span className="block leading-tight">1. Clinical Discharge Summary</span>
                      <span className="text-[10px] font-normal opacity-80">Full stay progress, diagnosis & OT history</span>
                    </div>
                  </label>

                  <label className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                    planReqMedCert ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold' : 'bg-white border-[#E8EEF2] text-[#567781]'
                  }`}>
                    <input
                      type="checkbox"
                      checked={planReqMedCert}
                      onChange={(e) => setPlanReqMedCert(e.target.checked)}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div>
                      <span className="block leading-tight">2. Medical Sickness / Fitness Cert</span>
                      <span className="text-[10px] font-normal opacity-80">Office/school sick leave & resume date</span>
                    </div>
                  </label>

                  <label className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                    planReqHospCert ? 'bg-teal-50 border-teal-300 text-teal-950 font-bold' : 'bg-white border-[#E8EEF2] text-[#567781]'
                  }`}>
                    <input
                      type="checkbox"
                      checked={planReqHospCert}
                      onChange={(e) => setPlanReqHospCert(e.target.checked)}
                      className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                    <div>
                      <span className="block leading-tight">3. Hospital Stay Proof Certificate</span>
                      <span className="text-[10px] font-normal opacity-80">For Mediclaim & Insurance reimbursement</span>
                    </div>
                  </label>

                  <label className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                    planReqTakeHomeRx ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold' : 'bg-white border-[#E8EEF2] text-[#567781]'
                  }`}>
                    <input
                      type="checkbox"
                      checked={planReqTakeHomeRx}
                      onChange={(e) => setPlanReqTakeHomeRx(e.target.checked)}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div>
                      <span className="block leading-tight">4. Take-Home Prescription Chart</span>
                      <span className="text-[10px] font-normal opacity-80">Post-discharge medications & instructions</span>
                    </div>
                  </label>

                  <label className={`col-span-1 sm:col-span-2 p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                    planReqReferralMemo ? 'bg-rose-50 border-rose-300 text-rose-950 font-bold' : 'bg-white border-[#E8EEF2] text-[#567781]'
                  }`}>
                    <input
                      type="checkbox"
                      checked={planReqReferralMemo}
                      onChange={(e) => setPlanReqReferralMemo(e.target.checked)}
                      className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <div>
                      <span className="block leading-tight">5. Referral & Transfer Memo</span>
                      <span className="text-[10px] font-normal opacity-80">Only for inter-hospital ambulance transfers & higher center escalations</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Departure Schedule & Type */}
              <div className="p-3.5 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#172B34]">Target Discharge Date *</label>
                  <input
                    type="date"
                    required
                    value={planDischargeDate}
                    onChange={(e) => setPlanDischargeDate(e.target.value)}
                    className="w-full h-8 px-2.5 bg-white border border-[#E8EEF2] rounded-lg text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#172B34]">Target Discharge Time *</label>
                  <input
                    type="time"
                    required
                    value={planDischargeTime}
                    onChange={(e) => setPlanDischargeTime(e.target.value)}
                    className="w-full h-8 px-2.5 bg-white border border-[#E8EEF2] rounded-lg text-xs font-mono font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#172B34]">Discharge Classification *</label>
                  <select
                    value={planDischargeType}
                    onChange={(e) => setPlanDischargeType(e.target.value as DischargeType)}
                    className="w-full h-8 px-2 bg-white border border-[#E8EEF2] rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    <option value="REGULAR">Regular Discharge (Recovered / Improved)</option>
                    <option value="DOR">Discharge on Request (DOR)</option>
                    <option value="LAMA">Left Against Medical Advice (LAMA)</option>
                    <option value="TRANSFER">Transfer to Higher Medical Center</option>
                    <option value="EXPIRED">Deceased / Expired</option>
                  </select>
                </div>
              </div>

              {/* Clinical Dossier Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#172B34]">Final Confirmed Diagnosis *</label>
                  <input
                    type="text"
                    required
                    value={planFinalDiagnosis}
                    onChange={(e) => setPlanFinalDiagnosis(e.target.value)}
                    placeholder="e.g. Acute Gastroenteritis with Moderate Dehydration - Resolved"
                    className="w-full h-8 px-2.5 bg-white border border-[#E8EEF2] rounded-lg text-xs font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#172B34]">Condition at Departure *</label>
                  <input
                    type="text"
                    required
                    value={planConditionAtDischarge}
                    onChange={(e) => setPlanConditionAtDischarge(e.target.value)}
                    placeholder="e.g. Hemodynamically stable, afebrile, ambulatory."
                    className="w-full h-8 px-2.5 bg-white border border-[#E8EEF2] rounded-lg text-xs font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#172B34]">Hospital Course & Clinical Summary</label>
                  <textarea
                    rows={2}
                    value={planHospitalCourse}
                    onChange={(e) => setPlanHospitalCourse(e.target.value)}
                    placeholder="Brief description of investigations, medical therapy and clinical recovery..."
                    className="w-full p-2 bg-white border border-[#E8EEF2] rounded-lg text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#172B34]">Home Care & Dietary Advice</label>
                  <textarea
                    rows={2}
                    value={planDietAdvice}
                    onChange={(e) => setPlanDietAdvice(e.target.value)}
                    placeholder="Dietary restrictions, wound care, activity limitations..."
                    className="w-full p-2 bg-white border border-[#E8EEF2] rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Follow-up & Emergency Warning */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#172B34]">Follow-up Schedule</label>
                  <input
                    type="text"
                    value={planFollowUpDate}
                    onChange={(e) => setPlanFollowUpDate(e.target.value)}
                    placeholder="e.g. After 7 days in OPD"
                    className="w-full h-8 px-2.5 bg-white border border-[#E8EEF2] rounded-lg text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#172B34]">Follow-up Consultant</label>
                  <input
                    type="text"
                    value={planFollowUpDoctor}
                    onChange={(e) => setPlanFollowUpDoctor(e.target.value)}
                    placeholder="e.g. Dr. Patil"
                    className="w-full h-8 px-2.5 bg-white border border-[#E8EEF2] rounded-lg text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#172B34]">Emergency Red Flags</label>
                  <input
                    type="text"
                    value={planEmergencySigns}
                    onChange={(e) => setPlanEmergencySigns(e.target.value)}
                    placeholder="e.g. High fever, chest pain, breathlessness"
                    className="w-full h-8 px-2.5 bg-white border border-[#E8EEF2] rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Take-Home Discharge Medications Builder */}
              <div className="p-3.5 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#172B34] flex items-center gap-1.5">
                      <Pill className="w-3.5 h-3.5 text-[#087F8C]" />
                      <span>Take-Home Discharge Medications ({planTakeHomeMeds.length})</span>
                    </h4>
                    <p className="text-[10.5px] text-[#567781]">Prescribe post-discharge tablets & syrups for the patient to take at home</p>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddTakeHomeMedRow}
                    className="bg-[#087F8C] hover:bg-[#076b77] text-white text-xs h-7 px-2.5 rounded-lg border-0 cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Medicine</span>
                  </Button>
                </div>

                <div className="space-y-2">
                  {planTakeHomeMeds.map((med, idx) => (
                    <div key={med.id} className="p-2 bg-white rounded-lg border border-[#E8EEF2] grid grid-cols-12 gap-2 items-center text-xs">
                      <div className="col-span-12 sm:col-span-4">
                        <input
                          type="text"
                          required
                          value={med.name}
                          onChange={(e) => handleUpdateTakeHomeMedRow(med.id, 'name', e.target.value)}
                          placeholder="Medicine name (e.g. Tab Augmentin 625)"
                          className="w-full h-7.5 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded text-xs font-semibold"
                        />
                      </div>

                      <div className="col-span-6 sm:col-span-2">
                        <input
                          type="text"
                          value={med.dosage}
                          onChange={(e) => handleUpdateTakeHomeMedRow(med.id, 'dosage', e.target.value)}
                          placeholder="Dose (625mg)"
                          className="w-full h-7.5 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded text-xs"
                        />
                      </div>

                      <div className="col-span-6 sm:col-span-2">
                        <select
                          value={med.frequency}
                          onChange={(e) => handleUpdateTakeHomeMedRow(med.id, 'frequency', e.target.value)}
                          className="w-full h-7.5 px-1.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded text-xs font-medium cursor-pointer"
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
                          onChange={(e) => handleUpdateTakeHomeMedRow(med.id, 'duration', e.target.value)}
                          placeholder="5 Days"
                          className="w-full h-7.5 px-1.5 text-center bg-[#F6F9FB] border border-[#E8EEF2] rounded text-xs font-mono font-semibold"
                        />
                      </div>

                      <div className="col-span-5 sm:col-span-2">
                        <input
                          type="text"
                          value={med.timing || ''}
                          onChange={(e) => handleUpdateTakeHomeMedRow(med.id, 'timing', e.target.value)}
                          placeholder="After food / Before food"
                          className="w-full h-7.5 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded text-xs"
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1 flex justify-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveTakeHomeMedRow(med.id)}
                          className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                          title="Remove row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-[#E8EEF2]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPlanDischargeModal(false)}
                  className="h-8 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8.5 px-5 rounded-xl border-0 cursor-pointer shadow-md flex items-center gap-2"
                >
                  <SendHorizontal className="w-4 h-4" />
                  <span>Send to Discharge Centre for Certification 📤</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 10: SETTLE BILL & EXECUTE FINAL DISCHARGE                           */}
      {/* ========================================================================= */}
      {showSettleDischargeModal && (() => {
        const targetBed = beds.find((b) => b.id === settleTargetBedId);
        if (!targetBed) return null;
        const fin = getBedLiveFinancials(targetBed);

        return (
          <div className="fixed inset-0 bg-[#172B34]/60 backdrop-blur-xs flex items-center justify-center p-3 z-60 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-[#E8EEF2] p-5 space-y-4">
              <div className="flex justify-between items-start border-b border-[#E8EEF2] pb-3">
                <div>
                  <h3 className="text-base font-bold text-rose-900 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Final Inpatient Settlement & Discharge</span>
                  </h3>
                  <p className="text-xs text-[#567781]">Bed {targetBed.bedNumber} • {targetBed.patientName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSettleDischargeModal(false)}
                  className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Financial Breakdown Card */}
              <div className="p-4 bg-gradient-to-br from-[#F6F9FB] to-white rounded-xl border border-[#E8EEF2] space-y-2 text-xs">
                <div className="flex justify-between items-center text-[#567781]">
                  <span>Total Incurred Charges ({fin.stayDays}d Stay):</span>
                  <strong className="font-mono text-[#172B34] text-sm">₹{fin.grossTotal.toLocaleString('en-IN')}</strong>
                </div>

                <div className="flex justify-between items-center text-emerald-700">
                  <span>Advance Deposits Already Paid:</span>
                  <strong className="font-mono text-sm">₹{fin.advances.toLocaleString('en-IN')}</strong>
                </div>

                <div className="pt-2 border-t border-[#E8EEF2] flex justify-between items-center text-base font-bold">
                  <span className={fin.balanceDue > 0 ? 'text-rose-900' : 'text-emerald-900'}>
                    {fin.balanceDue > 0 ? 'Remaining Balance Due:' : 'Status:'}
                  </span>
                  <span className={`font-mono text-lg ${fin.balanceDue > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {fin.balanceDue > 0 ? `₹${fin.balanceDue.toLocaleString('en-IN')}` : 'FULLY CLEARED (₹0)'}
                  </span>
                </div>
              </div>

              <form onSubmit={handleConfirmSettleDischarge} className="space-y-3.5 text-xs">
                {fin.balanceDue > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-[#172B34]">Settlement Payment Mode *</label>
                      <select
                        value={settlePaymentMode}
                        onChange={(e) => setSettlePaymentMode(e.target.value)}
                        className="w-full h-8.5 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        <option value="UPI">UPI / QR Code Scan</option>
                        <option value="CASH">Cash at Billing Counter</option>
                        <option value="CARD">Credit / Debit Card</option>
                        <option value="TPA_INSURANCE">TPA / Cashless Insurance Claim</option>
                        <option value="CORPORATE_CREDIT">Corporate / Scheme Credit</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-[#172B34]">Transaction Notes / Auth Code</label>
                      <input
                        type="text"
                        value={settleTransactionNotes}
                        onChange={(e) => setSettleTransactionNotes(e.target.value)}
                        placeholder="e.g. UTR # or Cash Receipt"
                        className="w-full h-8.5 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                      />
                    </div>
                  </div>
                )}

                <div className="p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-lg text-[11px] text-indigo-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>
                    Upon confirmation, bed <strong>{targetBed.bedNumber}</strong> will transition to <strong>🧹 Sanitization (Cleaning)</strong> for housekeeping turnover.
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-[#E8EEF2]">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSettleDischargeModal(false)}
                    className="h-8.5 text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSettlingDischarge}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8.5 px-5 rounded-lg border-0 cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    {isSettlingDischarge ? 'Processing Clearance...' : 'Confirm Clearance & Settle ✓'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL 11: DISCHARGE SUMMARY PRINT PREVIEW                                 */}
      {/* ========================================================================= */}
      {printDischargeSummaryBed && (
        <div className="fixed inset-0 bg-[#172B34]/70 backdrop-blur-xs flex items-center justify-center p-3 z-60 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-[#E8EEF2] p-5 space-y-4 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#E8EEF2] pb-3 no-print">
              <div>
                <h3 className="text-sm font-bold text-[#172B34]">Official Inpatient Discharge Summary Dossier</h3>
                <p className="text-[11px] text-[#567781]">Bed {printDischargeSummaryBed.bedNumber} • {printDischargeSummaryBed.patientName}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg h-7.5 px-3 border-0 cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Summary</span>
                </Button>
                <button
                  type="button"
                  onClick={() => setPrintDischargeSummaryBed(null)}
                  className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <DischargeSummaryPrintDocument
              clinic={clinic}
              doctor={doctors[0]}
              patient={realPatients.find((p) => p.id === printDischargeSummaryBed.patientId) || {
                id: printDischargeSummaryBed.patientId,
                name: printDischargeSummaryBed.patientName,
                phone: printDischargeSummaryBed.patientPhone,
                gender: printDischargeSummaryBed.patientGender as any
              }}
              admissionDetails={{
                uhid: `UHID-${printDischargeSummaryBed.patientId?.substring(0, 8).toUpperCase() || '2026'}`,
                ipdNumber: printDischargeSummaryBed.ipdNumber || 'IPD-2026-9042',
                admissionDateTime: `${printDischargeSummaryBed.admissionDate || 'Today'} ${printDischargeSummaryBed.admissionTime || '10:00 AM'}`,
                dischargeDateTime: `${printDischargeSummaryBed.dischargePlan?.plannedDate || new Date().toISOString().split('T')[0]} ${printDischargeSummaryBed.dischargePlan?.plannedTime || '02:00 PM'}`,
                roomWardBed: `${printDischargeSummaryBed.wardName} (Bed ${printDischargeSummaryBed.bedNumber})`,
                dischargeType: printDischargeSummaryBed.dischargePlan?.dischargeType || 'REGULAR',
                conditionAtDischarge: printDischargeSummaryBed.dischargePlan?.conditionAtDischarge || 'Hemodynamically stable, afebrile, ambulatory.',
                finalDiagnosis: printDischargeSummaryBed.dischargePlan?.finalDiagnosis || printDischargeSummaryBed.admittingDiagnosis || 'Inpatient Clinical Care',
                hospitalCourseAndProcedures: printDischargeSummaryBed.dischargePlan?.hospitalCourse || 'Patient responded favorably to conservative and targeted clinical management.',
                dietAndActivityAdvice: printDischargeSummaryBed.dischargePlan?.dietaryAdvice || 'Balanced diet with adequate hydration. Avoid heavy exertion.',
                followUpDate: printDischargeSummaryBed.dischargePlan?.followUpDate || 'After 7 days in OPD with Attending Consultant',
                emergencyWarningSigns: printDischargeSummaryBed.dischargePlan?.emergencyAlertSigns || 'High fever, persistent pain, severe vomiting, breathlessness.',
                dischargeMedications: (printDischargeSummaryBed.dischargePlan?.takeHomeMedications || []).map((m) => ({
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
      {/* MODAL 12: TAX INVOICE PRINT PREVIEW                                       */}
      {/* ========================================================================= */}
      {printInvoiceBed && (() => {
        const fin = getBedLiveFinancials(printInvoiceBed);
        const invPatient = realPatients.find((p) => p.id === printInvoiceBed.patientId) || {
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

      {/* ========================================================================= */}
      {/* MODAL 13: MEDICAL FITNESS / SICKNESS CERTIFICATE PRINT PREVIEW            */}
      {/* ========================================================================= */}
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
              patient={realPatients.find((p) => p.id === printMedCertBed.patientId) || {
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

      {/* ========================================================================= */}
      {/* MODAL 14: HOSPITALIZATION STAY PROOF CERTIFICATE PRINT PREVIEW            */}
      {/* ========================================================================= */}
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
                  <span>Print Certificate</span>
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
              patient={realPatients.find((p) => p.id === printHospCertBed.patientId) || {
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

      {/* ========================================================================= */}
      {/* MODAL 15: INTER-HOSPITAL REFERRAL & TRANSFER MEMO PRINT PREVIEW          */}
      {/* ========================================================================= */}
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
              patient={realPatients.find((p) => p.id === printReferralMemoBed.patientId) || {
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
    </div>
  );
};
