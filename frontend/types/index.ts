export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  employeeId?: string;
  role: 'ADMIN' | 'DOCTOR' | 'RECEPTIONIST' | string;
  clinicId: string;
  clinicName: string;
  profilePictureUrl?: string;
  notifyDailyReport?: boolean;
  notifyEmergencyVisit?: boolean;
  notifyRxAudit?: boolean;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Patient {
  id: string;
  clinicId: string;
  pid?: string;
  phone: string;
  name?: string;
  gender?: string;
  dateOfBirth?: string;
  age?: number | string;
  email?: string;
  bloodGroup?: string;
  address?: string;
  city?: string;
  pincode?: string;
  governmentId?: string;
  heightCm?: number;
  weightKg?: number;
  currentMedications?: string;
  referralSource?: string;
  insuranceProvider?: string;
  insurancePolicyNo?: string;
  allergies?: string;
  medicalHistory?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  active: boolean;
  createdAt: string;
}

export interface PatientListResponse {
  content: Patient[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface Appointment {
  id: string;
  clinicId: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: 'SCHEDULED' | 'CHECKED_IN' | 'IN_CONSULTATION' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  type: 'CONSULTATION' | 'FOLLOW_UP' | 'EMERGENCY';
  reason?: string;
  notes?: string;
  symptoms?: string;
  diagnosis?: string;
  prescription?: string;
  bpSystolic?: number;
  bpDiastolic?: number;
  pulse?: number;
  temperature?: number;
  spo2?: number;
  weight?: number;
  height?: number;
  followUpDate?: string;
  createdAt: string;
}

export interface Doctor {
  id: string;
  name: string;
  email: string;
  phone?: string;
  employeeId?: string;
  active: boolean;
  specialization?: string;
  subSpecialization?: string;
  registrationNumber?: string;
  medicalCouncil?: string;
  registrationYear?: number;
  gender?: string;
  languagesSpoken?: string;
  digitalSignature?: string;
  consultationFee?: number;
  followUpFee?: number;
  emergencyFee?: number;
  qualification?: string;
  experienceYears?: number;
  roomNumber?: string;
  slotDuration?: number;
  biography?: string;
  availabilitySchedule?: string;
  profilePictureUrl?: string;
}

export interface ClinicServiceItem {
  id?: string;
  name: string;
  fee: number;
  category?: 'ROOM_BED' | 'ICU_CCU' | 'OPERATION_THEATRE' | 'DOCTOR_FEE' | 'NURSING_CARE' | 'DIAGNOSTIC_LAB' | 'PROCEDURE' | 'OTHER' | string;
  hsnSacCode?: string;
  doctorId?: string;
  doctorName?: string;
  description?: string;
  active?: boolean;
}

export interface PrescriptionSettings {
  id?: string;
  showLogo: boolean;
  digitalSignatureUrl?: string;
  headerText?: string;
  footerText?: string;
  watermarkUrl?: string;
  printMarginMm: number;
  topMarginMm?: number;
  letterheadMode?: 'PLAIN_PAPER' | 'PREPRINTED_PAD' | string;
  enableQrCode: boolean;
  showVitals?: boolean;
  showComplaints?: boolean;
  showDiagnosis?: boolean;
  showMedicines?: boolean;
  showLabTests?: boolean;
  showAdvice?: boolean;
  showFollowUp?: boolean;
  showSignature?: boolean;
  defaultAdvice?: string;
  rxTemplates?: string;
  quickAdviceList?: string;
  paperSize?: string;
  // Discharge Summary
  dischargeHeaderTitle?: string;
  dischargeShowHospitalCourse?: boolean;
  dischargeShowInvestigations?: boolean;
  dischargeShowDietActivity?: boolean;
  dischargeShowEmergencyWarning?: boolean;
  dischargeShowAttendantSignature?: boolean;
  defaultDischargeEmergencyNotes?: string;
  defaultDischargeDietNotes?: string;
  // Consultation Report
  consultationReportTitle?: string;
  consultationShowVitals?: boolean;
  consultationShowSystemicExam?: boolean;
  consultationShowInvestigations?: boolean;
  consultationShowReferralNotes?: boolean;
  defaultConsultationDisclaimer?: string;
  // Medical Certificate
  medicalCertTitle?: string;
  medicalCertCouncilAuthority?: string;
  defaultMedicalCertRemarks?: string;
  medicalCertShowSeal?: boolean;
}

export interface Clinic {
  id: string;
  name: string;
  email: string;
  phone: string;
  emergencyPhone?: string;
  tagline?: string;
  address: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  logoUrl?: string;
  gstNumber?: string;
  registrationNumber?: string;
  website?: string;
  googleMapsLink?: string;
  timezone?: string;
  currency?: string;
  language?: string;
  appointmentSlotDuration?: number;
  walkInEnabled?: boolean;
  doubleBookingAllowed?: boolean;
  maxPatientsPerDay?: number;
  morningStartTime?: string;
  morningEndTime?: string;
  eveningStartTime?: string;
  eveningEndTime?: string;
  closedDays?: string;
  holidayDates?: string;
  invoicePrefix?: string;
  taxPercentage?: number;
  upiId?: string;
  sessionTimeoutMinutes?: number;
  receptionistAccessNotes?: boolean;
  allowDoctorDiscount?: boolean;
  maxDiscountPercentage?: number;
  discountReasons?: string;
  // Multi-Specialty Hospital Profile & Infrastructure
  facilityType?: 'HOSPITAL' | 'POLYCLINIC' | 'CLINIC' | string;
  totalBeds?: number;
  totalIcuBeds?: number;
  totalOtRooms?: number;
  nabhAccreditationNumber?: string;
  rohiniHospitalId?: string;
  clinicalEstRegistrationNumber?: string;
  enabledDepartments?: string;
  ambulanceContactPhone?: string;
  bloodBankAvailable?: boolean;
  pharmacy24x7?: boolean;
  // Dashboard Layout & Widgets Customization
  dashShowKpiStats?: boolean;
  dashShowRevenue?: boolean;
  dashShowOpdQueue?: boolean;
  dashShowAppointments?: boolean;
  dashShowClinicalAlerts?: boolean;
  dashShowQuickActions?: boolean;
  dashShowRecentPatients?: boolean;
  dashShowInventoryAlerts?: boolean;
  dashPrivacyMode?: boolean;
  dashDensity?: 'COMPACT' | 'COMFORTABLE' | 'TOUCHSCREEN' | string;
  dashAutoRefreshInterval?: number;
  dashDefaultDateRange?: 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | string;
  dashRolePreset?: 'DOCTOR' | 'RECEPTIONIST' | 'ADMIN' | string;
}

export interface Medicine {
  id: string;
  name: string;
  manufacturerName?: string;
  saltComposition?: string;
  medicineDesc?: string;
  sideEffects?: string;
  active?: boolean;
}

export interface UserSession {
  id: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  browser?: string;
  operatingSystem?: string;
  createdAt?: string;
  lastActiveAt?: string;
  currentSession?: boolean;
  isCurrent?: boolean;
}

// Multi-Specialty Hospital Command Center Types
export type WardType = 'GENERAL_MALE' | 'GENERAL_FEMALE' | 'SEMI_PRIVATE' | 'DELUXE_AC' | 'ICU_CCU' | 'DAY_CARE';
export type BedStatus = 'AVAILABLE' | 'OCCUPIED' | 'DISCHARGE_PLANNED' | 'MAINTENANCE' | 'CLEANING';

export type DischargeType = 'REGULAR' | 'LAMA' | 'DOR' | 'TRANSFER' | 'EXPIRED';

export interface TakeHomeMedication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  timing?: string;
  instructions?: string;
}

export interface DischargePlanData {
  plannedDate?: string;
  plannedTime?: string;
  dischargeType: DischargeType;
  finalDiagnosis?: string;
  hospitalCourse?: string;
  conditionAtDischarge?: string;
  dietaryAdvice?: string;
  generalAdvice?: string;
  followUpDate?: string;
  followUpDoctor?: string;
  emergencyAlertSigns?: string;
  includeDischargeSummary?: boolean;
  includeTakeHomeRx?: boolean;
  takeHomeMedications?: TakeHomeMedication[];
  
  // Certificate specific customizable data
  medicalCertificate?: {
    isRequired: boolean;
    type: 'SICKNESS_REST' | 'FITNESS_RESUME' | 'BOTH';
    reason: string;
    restStartDate: string;
    restEndDate: string;
    fitToResumeDate: string;
    remarks?: string;
  };
  hospitalizationCertificate?: {
    isRequired: boolean;
    purpose: string;
    treatedUnderDoctor: string;
    roomCategory: string;
    remarks?: string;
  };
  referralMemo?: {
    isRequired: boolean;
    destinationHospital: string;
    transferReason: string;
    transportMode: string;
    accompanyingStaff?: string;
    clinicalConditionAtTransfer?: string;
  };
  lamaUndertaking?: {
    reasonForLeaving: string;
    personSigning: string;
    relationToPatient: string;
    risksExplained: string;
  };

  // Readiness Status Gate & Billing Workflow Flow
  dossierStatus?: 'DRAFT_IN_PROGRESS' | 'DOCS_CERTIFIED_READY' | 'SENT_TO_BILLING' | 'BILL_PAID_READY_TO_GO' | 'SETTLED_DISCHARGED';
  certifiedByDoctorName?: string;
  certifiedTimestamp?: string;
  clearedByDoctor?: boolean;
  clearedByBilling?: boolean;
  billingSettledAt?: string;
  billingSettledBy?: string;
  billingInvoiceNo?: string;
}

export interface DailyCheckingLog {
  id: string;
  timestamp: string;
  recordedBy: string;
  temp?: string;
  bp?: string;
  pulse?: string;
  spo2?: string;
  respRate?: string;
  clinicalNotes: string;
  treatmentGiven?: string;
}

export interface HospitalBed {
  id: string;
  bedNumber: string;
  wardType: WardType;
  wardName: string;
  floor: string;
  status: BedStatus;
  dailyRate: number;
  hasOxygenSupply: boolean;
  hasVentilator?: boolean;
  hasMultiparaMonitor?: boolean;
  patientId?: string;
  patientName?: string;
  patientAge?: string;
  patientGender?: string;
  patientPhone?: string;
  patientAgeGender?: string;
  ipdNumber?: string;
  admissionDate?: string;
  admissionTime?: string;
  admittingDiagnosis?: string;
  consultantDoctorName?: string;
  expectedDischargeDate?: string;
  dailyLogs?: DailyCheckingLog[];
  billingCharges?: InpatientServiceCharge[];
  advancePayments?: InpatientAdvancePayment[];
  inpatientMedications?: InpatientMedicationOrder[];
  inpatientLabOrders?: InpatientBedLabOrder[];
  dischargePlan?: DischargePlanData;
  activeDoctorAlert?: {
    timestamp: string;
    priority: 'CRITICAL' | 'HIGH' | 'ROUTINE';
    reason: string;
    triggeredBy: string;
  };
}

export interface InpatientMedicationItem {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  quantity?: number;
  source: 'HOSPITAL_PHARMACY' | 'OUTSIDE_PATIENT_OWN';
  price?: number;
  batchNumber?: string;
  notes?: string;
  isAvailable?: boolean;
  status?: 'QUEUED' | 'DISPENSED' | 'UNAVAILABLE' | 'SELF_PROVIDED' | 'ADMINISTERED';
}

export interface InpatientMedicationOrder {
  id: string;
  indentNumber?: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  source: 'HOSPITAL_PHARMACY' | 'OUTSIDE_PATIENT_OWN';
  price: number;
  dateOrdered: string;
  status: 'QUEUED_PHARMACY' | 'DISPENSED' | 'PARTIALLY_DISPENSED' | 'ADMINISTERED' | 'SELF_PROVIDED';
  prescribedBy: string;
  requestedByNurse?: string;
  notes?: string;
  items?: InpatientMedicationItem[];
  invoiceNo?: string;
  dispensedBy?: string;
  dispatchedAt?: string;
}

export interface InpatientBedLabOrder {
  id: string;
  testName: string;
  category: string;
  source: 'IN_HOUSE_LAB' | 'OUTSIDE_DIAGNOSTIC';
  price: number;
  dateOrdered: string;
  status: 'ORDERED' | 'SAMPLE_COLLECTED' | 'COMPLETED' | 'OUTSIDE_AWAITED';
  orderedBy: string;
  notes?: string;
}

export interface InpatientServiceCharge {
  id: string;
  category: 'BED_RENT' | 'DOCTOR_VISIT' | 'PROCEDURE' | 'INVESTIGATION' | 'NURSING' | 'MEDICATION' | 'OT_SURGERY' | 'OTHER';
  serviceName: string;
  unitPrice: number;
  quantity: number;
  totalAmount: number;
  dateAdded: string;
  notes?: string;
}

export interface InpatientAdvancePayment {
  id: string;
  amount: number;
  paymentMode: 'CASH' | 'UPI' | 'CARD' | 'INSURANCE_TPA' | 'BANK_TRANSFER' | string;
  receiptNumber: string;
  datePaid: string;
  notes?: string;
}

export type SurgeryStatus = 'SCHEDULED' | 'IN_SURGERY' | 'RECOVERY' | 'COMPLETED' | 'CANCELLED';

export interface OtSurgery {
  id: string;
  otRoom: 'OT-1' | 'OT-2' | 'OT-3' | 'MINOR_OT' | string;
  surgeryName: string;
  patientName: string;
  patientAgeGender: string;
  leadSurgeon: string;
  anesthetist: string;
  scheduledTime: string;
  durationMinutes: number;
  status: SurgeryStatus;
  preOpClearance: boolean;
  notes?: string;
}

export type TriageAcuity = 'RED_CRITICAL' | 'YELLOW_URGENT' | 'GREEN_NON_URGENT';

export interface EmergencyTriageCase {
  id: string;
  tokenNumber: string;
  patientName: string;
  ageGender: string;
  acuity: TriageAcuity;
  chiefComplaint: string;
  arrivalTime: string;
  vitalsSpo2?: number;
  vitalsBp?: string;
  vitalsPulse?: number;
  attendingDoctor: string;
  status: 'TRIAGED' | 'IN_TRAUMA_BAY' | 'STABILIZED' | 'TRANSFERRED_ICU' | 'ADMITTED_WARD' | 'DISCHARGED';
}

export type LabOrderStatus = 'ORDERED' | 'SAMPLE_COLLECTED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';

export interface LabInvestigationOrder {
  id: string;
  patientId: string;
  patientName: string;
  testName: string;
  category: 'HEMATOLOGY' | 'BIOCHEMISTRY' | 'RADIOLOGY' | 'PATHOLOGY' | 'MICROBIOLOGY' | 'CARDIOLOGY' | string;
  doctorName: string;
  orderDate: string;
  status: LabOrderStatus;
  price: number;
  urgency?: 'ROUTINE' | 'STAT_EMERGENCY';
  resultsSummary?: string;
  reportUrl?: string;
  notes?: string;
}

export interface PatientTimelineEvent {
  id: string;
  timestamp: string;
  category: 'REGISTRATION' | 'OPD_CONSULT' | 'ADMISSION' | 'DOCTOR_ROUND' | 'LAB_ORDER' | 'MEDICATION' | 'PAYMENT' | 'DISCHARGE';
  title: string;
  description: string;
  actor: string;
  badgeColor?: string;
  amount?: number;
}

export interface BillingLedgerEntryResponse {
  id: string;
  clinicId?: string;
  patientId: string;
  patientName?: string;
  encounterType: string;
  encounterId?: string;
  entryType: 'DEBIT' | 'CREDIT';
  category: string;
  description: string;
  unitPrice?: number;
  quantity?: number;
  totalAmount: number;
  paymentMode?: string;
  receiptNumber?: string;
  recordedBy?: string;
  notes?: string;
  createdAt: string;
  formattedCreatedAt?: string;
}

export interface PatientLedgerSummaryResponse {
  patientId: string;
  patientName: string;
  patientPhone: string;
  totalIncurred: number;
  totalPaid: number;
  netOutstanding: number;
  status: 'SETTLED' | 'PARTIAL' | 'PENDING';
  charges: BillingLedgerEntryResponse[];
  receipts: BillingLedgerEntryResponse[];
  allEntries: BillingLedgerEntryResponse[];
}


