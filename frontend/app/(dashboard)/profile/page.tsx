'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
import { Doctor, ClinicServiceItem, PrescriptionSettings, Clinic, UserSession, User as UserType } from '@/types';
import ImageUploadButton from '@/components/image-upload-button';
import { DocumentPreviewModal } from '@/components/document-preview-modal';
import {
  User,
  Settings,
  Shield,
  Stethoscope,
  Info,
  CheckCircle2,
  AlertCircle,
  Building,
  Key,
  Plus,
  Trash2,
  MapPin,
  Globe,
  Clock,
  UserPlus,
  X,
  Hospital,
  IndianRupee,
  FileText,
  SlidersHorizontal,
  Star,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  QrCode,
  Sparkles,
  Calendar,
  Lock,
  Receipt,
  FileCode,
  BookmarkPlus,
  Eye,
  EyeOff,
  Laptop,
  Smartphone,
  Bell,
  ShieldCheck,
  Check,
  Sun,
  Moon,
  ExternalLink,
  Compass,
  PhoneCall,
  Award,
  Navigation,
  MoreVertical,
  LogOut,
  KeyRound,
  ShieldAlert,
  Maximize2,
  CheckSquare,
  RefreshCw,
  Activity,
  CalendarDays,
  Users,
  Users2,
  BarChart3,
  Zap,
  Baby,
  Heart,
  HeartPulse,
  Bone,
  Smile,
  Volume2,
  Brain,
  Pill,
  Droplets,
  Wind,
  Crosshair,
  UserCheck,
  Microscope,
  Scan,
  Flame,
  Syringe,
  Scale,
  Scissors,
  Edit3,
  Layers
} from 'lucide-react';
import type { SupportedDocType } from '@/components/document-preview-modal';

interface AxiosErrorLike {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
  };
  message?: string;
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
}

interface RxTemplateItem {
  id: string;
  name: string;
  diagnosis: string;
  medicines: string;
  advice: string;
}

const DEFAULT_RX_TEMPLATES: RxTemplateItem[] = [
  {
    id: '1',
    name: 'Viral Fever / URI Protocol',
    diagnosis: 'Acute Viral Upper Respiratory Infection',
    medicines: 'Tab. Paracetamol 650mg (1-0-1 after food x 3 days)\nTab. Cetirizine 10mg (0-0-1 at night x 5 days)\nTab. Pantoprazole 40mg (1-0-0 before breakfast x 5 days)',
    advice: 'Drink warm water frequently. Complete bed rest for 2 days. Steam inhalation twice daily.',
  },
  {
    id: '2',
    name: 'Acute Gastritis / Acid Reflux',
    diagnosis: 'Gastroesophageal Reflux Disease (GERD)',
    medicines: 'Cap. Rabeprazole 20mg + Domperidone 30mg (1-0-0 before breakfast x 14 days)\nSyp. Antacid Gel 10ml (1-1-1 after food x 7 days)',
    advice: 'Avoid spicy, oily and fried foods. Do not lie down immediately after dinner. Eat smaller, frequent meals.',
  },
  {
    id: '3',
    name: 'Hypertension Routine Follow-up',
    diagnosis: 'Essential Systemic Hypertension (Stage 1)',
    medicines: 'Tab. Telmisartan 40mg (1-0-0 morning after breakfast x 30 days)',
    advice: 'Low sodium (salt) diet. Daily 30-minute brisk walk. Monitor BP every 2 weeks.',
  },
];

const DEFAULT_ADVICE_SNIPPETS = [
  'Drink at least 2.5 to 3 liters of clean boiled water daily.',
  'Take all medications strictly after meals unless specified otherwise.',
  'Avoid cold drinks, oily foods, and outside food for the next 5 days.',
  'Keep wound area clean and dry. Return immediately if redness or swelling increases.',
  'Follow-up visit required after 5 days with updated vitals/lab reports.',
];

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type SettingsTabType = 'account' | 'clinic' | 'professional' | 'billing' | 'prescription' | 'security' | 'dashboard';

export default function SettingsPage() {
  const { user, updateUser, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTabType>('account');

  // Restore active tab from URL hash (#clinic, #billing etc.) or localStorage across browser refreshes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.replace('#', '') as SettingsTabType;
    const saved = localStorage.getItem('clinic_settings_active_tab') as SettingsTabType;
    const validTabs: SettingsTabType[] = ['account', 'clinic', 'professional', 'billing', 'prescription', 'security', 'dashboard'];

    const targetTab = validTabs.includes(hash) ? hash : validTabs.includes(saved) ? saved : 'account';

    // Verify role permissions for the selected tab
    if (targetTab === 'clinic' && !['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN'].includes(user?.role?.toUpperCase() || '')) {
      setActiveTab('account');
      return;
    }
    if (targetTab === 'professional' && !['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR'].includes(user?.role?.toUpperCase() || '')) {
      setActiveTab('account');
      return;
    }
    if ((targetTab === 'billing' || targetTab === 'security') && !['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN'].includes(user?.role?.toUpperCase() || '')) {
      setActiveTab('account');
      return;
    }

    setActiveTab(targetTab);
  }, [user]);

  const handleTabChange = (tab: SettingsTabType) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('clinic_settings_active_tab', tab);
        window.history.replaceState(null, '', `#${tab}`);
      } catch {}
    }
  };

  // Account Settings state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const [gender, setGender] = useState('Not Specified');
  const [designation, setDesignation] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountSuccess, setAccountSuccess] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  // Dedicated Password & Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Real-Time Active Devices & Session Management
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [revokingOthers, setRevokingOthers] = useState(false);
  const [signedOutOtherSessions, setSignedOutOtherSessions] = useState(false);

  // Cloud-Synced Personal Notification Preferences
  const [notifyDailyReport, setNotifyDailyReport] = useState<boolean>(true);
  const [notifyEmergencyVisit, setNotifyEmergencyVisit] = useState<boolean>(true);
  const [notifyRxAudit, setNotifyRxAudit] = useState<boolean>(false);
  const [savingPref, setSavingPref] = useState(false);
  const [prefSuccess, setPrefSuccess] = useState(false);

  // Professional Practice & Doctor Settings state (Admins & Doctors)
  const [clinicDoctors, setClinicDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [docName, setDocName] = useState('');
  const [docPhone, setDocPhone] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [subSpecialization, setSubSpecialization] = useState('');
  const [doctorRegNumber, setDoctorRegNumber] = useState('');
  const [medicalCouncil, setMedicalCouncil] = useState('');
  const [registrationYear, setRegistrationYear] = useState<string>('');
  const [languagesSpoken, setLanguagesSpoken] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [doctorSlotDuration, setDoctorSlotDuration] = useState<string>('15');
  const [doctorDigitalSignature, setDoctorDigitalSignature] = useState('');
  const [consultationFee, setConsultationFee] = useState<string>('500');
  const [followUpFee, setFollowUpFee] = useState<string>('300');
  const [emergencyFee, setEmergencyFee] = useState<string>('1000');
  const [qualification, setQualification] = useState('');
  const [experienceYears, setExperienceYears] = useState<string>('0');
  const [biography, setBiography] = useState('');
  const [availabilitySchedule, setAvailabilitySchedule] = useState('');
  const [savingProfessional, setSavingProfessional] = useState(false);
  const [professionalSuccess, setProfessionalSuccess] = useState(false);
  const [professionalError, setProfessionalError] = useState<string | null>(null);

  const populateDoctorFields = (doc: Doctor) => {
    setDocName(doc.name || '');
    setDocPhone(doc.phone || '');
    setSpecialization(doc.specialization || '');
    setSubSpecialization(doc.subSpecialization || '');
    setDoctorRegNumber(doc.registrationNumber || '');
    setMedicalCouncil(doc.medicalCouncil || '');
    setRegistrationYear(doc.registrationYear ? String(doc.registrationYear) : '');
    setLanguagesSpoken(doc.languagesSpoken || '');
    setRoomNumber(doc.roomNumber || '');
    setDoctorSlotDuration(doc.slotDuration ? String(doc.slotDuration) : '15');
    setDoctorDigitalSignature(doc.digitalSignature || '');
    setConsultationFee(doc.consultationFee !== undefined ? String(doc.consultationFee) : '500');
    setFollowUpFee(doc.followUpFee !== undefined ? String(doc.followUpFee) : '300');
    setEmergencyFee(doc.emergencyFee !== undefined ? String(doc.emergencyFee) : '1000');
    setQualification(doc.qualification || '');
    setExperienceYears(doc.experienceYears !== undefined ? String(doc.experienceYears) : '0');
    setBiography(doc.biography || '');
    setAvailabilitySchedule(doc.availabilitySchedule || '');
  };

  const handleSelectDoctor = (docId: string) => {
    setSelectedDoctorId(docId);
    const doc = clinicDoctors.find((d) => d.id === docId);
    if (doc) {
      populateDoctorFields(doc);
    }
  };

  // Document Live Preview Modal state
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewDocType, setPreviewDocType] = useState<SupportedDocType>('PRESCRIPTION');

  const handleOpenPreview = (type: SupportedDocType) => {
    setPreviewDocType(type);
    setIsPreviewModalOpen(true);
  };

  // Clinic Settings state (Admin only)
  const [clinicName, setClinicName] = useState('');
  const [clinicEmail, setClinicEmail] = useState('');
  const [clinicPhone, setClinicPhone] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [tagline, setTagline] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [website, setWebsite] = useState('');
  const [googleMapsLink, setGoogleMapsLink] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [currency, setCurrency] = useState('₹');
  const [language, setLanguage] = useState('en');
  const [appointmentSlotDuration, setAppointmentSlotDuration] = useState<number>(15);
  const [walkInEnabled, setWalkInEnabled] = useState<boolean>(true);
  const [doubleBookingAllowed, setDoubleBookingAllowed] = useState<boolean>(false);
  const [maxPatientsPerDay, setMaxPatientsPerDay] = useState<string>('100');

  // Multi-Specialty Hospital Profile & Department Master state (Phase 2)
  const [facilityType, setFacilityType] = useState<string>('HOSPITAL');
  const [totalBeds, setTotalBeds] = useState<string>('50');
  const [totalIcuBeds, setTotalIcuBeds] = useState<string>('10');
  const [totalOtRooms, setTotalOtRooms] = useState<string>('2');
  const [nabhAccreditationNumber, setNabhAccreditationNumber] = useState<string>('');
  const [rohiniHospitalId, setRohiniHospitalId] = useState<string>('');
  const [clinicalEstRegistrationNumber, setClinicalEstRegistrationNumber] = useState<string>('');
  const [enabledDepartments, setEnabledDepartments] = useState<string[]>([
    'General Medicine',
    'General Surgery',
    'Obstetrics & Gynecology',
    'Pediatrics',
    'Orthopedics',
    'Cardiology',
    'Dental',
    'Ophthalmology',
    'Emergency Care'
  ]);
  const [ambulanceContactPhone, setAmbulanceContactPhone] = useState<string>('');
  const [bloodBankAvailable, setBloodBankAvailable] = useState<boolean>(false);
  const [pharmacy24x7, setPharmacy24x7] = useState<boolean>(true);

  // Multi-Session Timings & Holidays
  const [morningStartTime, setMorningStartTime] = useState('09:00');
  const [morningEndTime, setMorningEndTime] = useState('13:00');
  const [eveningStartTime, setEveningStartTime] = useState('17:00');
  const [eveningEndTime, setEveningEndTime] = useState('21:00');
  const [closedDays, setClosedDays] = useState<string[]>(['Sunday']);
  const [holidayDates, setHolidayDates] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');

  // Invoicing & UPI
  const [invoicePrefix, setInvoicePrefix] = useState('INV-');
  const [taxPercentage, setTaxPercentage] = useState<string>('0');
  const [upiId, setUpiId] = useState('');
  const [allowDoctorDiscount, setAllowDoctorDiscount] = useState<boolean>(true);
  const [maxDiscountPercentage, setMaxDiscountPercentage] = useState<string>('100');
  const [discountReasons, setDiscountReasons] = useState<string>('Senior Citizen Concession, Follow-up Courtesy, Staff/Family Discount, Financial Hardship');
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState<number>(30);
  const [receptionistAccessNotes, setReceptionistAccessNotes] = useState<boolean>(false);

  const [savingClinic, setSavingClinic] = useState(false);
  const [clinicSuccess, setClinicSuccess] = useState(false);
  const [clinicError, setClinicError] = useState<string | null>(null);

  // Prescription Settings state
  const [showLogo, setShowLogo] = useState<boolean>(true);
  const [digitalSignatureUrl, setDigitalSignatureUrl] = useState('');
  const [headerText, setHeaderText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [watermarkUrl, setWatermarkUrl] = useState('');
  const [printMarginMm, setPrintMarginMm] = useState<string>('10');
  const [topMarginMm, setTopMarginMm] = useState<string>('35');
  const [letterheadMode, setLetterheadMode] = useState<string>('PLAIN_PAPER');
  const [paperSize, setPaperSize] = useState('A4');
  const [enableQrCode, setEnableQrCode] = useState<boolean>(true);
  const [showVitals, setShowVitals] = useState<boolean>(true);
  const [showComplaints, setShowComplaints] = useState<boolean>(true);
  const [showDiagnosis, setShowDiagnosis] = useState<boolean>(true);
  const [showMedicines, setShowMedicines] = useState<boolean>(true);
  const [showLabTests, setShowLabTests] = useState<boolean>(true);
  const [showAdvice, setShowAdvice] = useState<boolean>(true);
  const [showFollowUp, setShowFollowUp] = useState<boolean>(true);
  const [showSignature, setShowSignature] = useState<boolean>(true);
  const [defaultAdvice, setDefaultAdvice] = useState('');
  const [rxTemplates, setRxTemplates] = useState<RxTemplateItem[]>(DEFAULT_RX_TEMPLATES);
  const [quickAdviceList, setQuickAdviceList] = useState<string[]>(DEFAULT_ADVICE_SNIPPETS);

  // Discharge Summary Customization State
  const [dischargeHeaderTitle, setDischargeHeaderTitle] = useState('HOSPITAL INPATIENT DISCHARGE SUMMARY');
  const [dischargeShowHospitalCourse, setDischargeShowHospitalCourse] = useState<boolean>(true);
  const [dischargeShowInvestigations, setDischargeShowInvestigations] = useState<boolean>(true);
  const [dischargeShowDietActivity, setDischargeShowDietActivity] = useState<boolean>(true);
  const [dischargeShowEmergencyWarning, setDischargeShowEmergencyWarning] = useState<boolean>(true);
  const [dischargeShowAttendantSignature, setDischargeShowAttendantSignature] = useState<boolean>(true);
  const [defaultDischargeEmergencyNotes, setDefaultDischargeEmergencyNotes] = useState('Persistent fever above 100.5°F, severe abdominal pain, persistent vomiting, soakage or redness around wound site.');
  const [defaultDischargeDietNotes, setDefaultDischargeDietNotes] = useState('Light, non-spicy high fiber diet. Avoid heavy lifting (>5 kg) or strenuous exercise for 3 weeks. Normal walking encouraged.');

  // Consultation Report Customization State
  const [consultationReportTitle, setConsultationReportTitle] = useState('CLINICAL CONSULTATION & OPD ENCOUNTER REPORT');
  const [consultationShowVitals, setConsultationShowVitals] = useState<boolean>(true);
  const [consultationShowSystemicExam, setConsultationShowSystemicExam] = useState<boolean>(true);
  const [consultationShowInvestigations, setConsultationShowInvestigations] = useState<boolean>(true);
  const [consultationShowReferralNotes, setConsultationShowReferralNotes] = useState<boolean>(true);
  const [defaultConsultationDisclaimer, setDefaultConsultationDisclaimer] = useState('Please bring this report & test results on next visit. Valid for Medical Records & Insurance Claims.');

  // Medical Certificate Customization State
  const [medicalCertTitle, setMedicalCertTitle] = useState('MEDICAL FITNESS & SICKNESS CERTIFICATE');
  const [medicalCertCouncilAuthority, setMedicalCertCouncilAuthority] = useState('Issued under the Regulations of the National Medical Commission & State Medical Council');
  const [defaultMedicalCertRemarks, setDefaultMedicalCertRemarks] = useState('Patient has undergone medical treatment and is now certified fit to resume normal workplace duties.');
  const [medicalCertShowSeal, setMedicalCertShowSeal] = useState<boolean>(true);

  // Dashboard Layout & Widgets Customization State
  const [dashShowKpiStats, setDashShowKpiStats] = useState<boolean>(true);
  const [dashShowRevenue, setDashShowRevenue] = useState<boolean>(true);
  const [dashShowOpdQueue, setDashShowOpdQueue] = useState<boolean>(true);
  const [dashShowAppointments, setDashShowAppointments] = useState<boolean>(true);
  const [dashShowClinicalAlerts, setDashShowClinicalAlerts] = useState<boolean>(true);
  const [dashShowQuickActions, setDashShowQuickActions] = useState<boolean>(true);
  const [dashShowRecentPatients, setDashShowRecentPatients] = useState<boolean>(true);
  const [dashShowInventoryAlerts, setDashShowInventoryAlerts] = useState<boolean>(true);
  const [dashPrivacyMode, setDashPrivacyMode] = useState<boolean>(false);
  const [dashDensity, setDashDensity] = useState<string>('COMFORTABLE');
  const [dashAutoRefreshInterval, setDashAutoRefreshInterval] = useState<number>(60);
  const [dashDefaultDateRange, setDashDefaultDateRange] = useState<string>('TODAY');
  const [dashRolePreset, setDashRolePreset] = useState<string>('DOCTOR');
  const [savingDashboard, setSavingDashboard] = useState<boolean>(false);

  // New Rx Template modal state
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
  const [tplName, setTplName] = useState('');
  const [tplDiagnosis, setTplDiagnosis] = useState('');
  const [tplMeds, setTplMeds] = useState('');
  const [tplAdvice, setTplAdvice] = useState('');
  const [newAdviceInput, setNewAdviceInput] = useState('');

  const [savingPrescription, setSavingPrescription] = useState(false);
  const [prescriptionSuccess, setPrescriptionSuccess] = useState(false);
  const [prescriptionError, setPrescriptionError] = useState<string | null>(null);

  // Hospital Services & Tariff Master state
  const [services, setServices] = useState<ClinicServiceItem[]>([]);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceFee, setNewServiceFee] = useState<string>('0');
  const [newServiceCategory, setNewServiceCategory] = useState<string>('PROCEDURE');
  const [newServiceHsnCode, setNewServiceHsnCode] = useState<string>('999312');
  const [newServiceDoctorId, setNewServiceDoctorId] = useState<string>('');
  const [newServiceDescription, setNewServiceDescription] = useState<string>('');
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState<string>('ALL');
  const [serviceSearchQuery, setServiceSearchQuery] = useState<string>('');
  const [activeServiceActionMenuId, setActiveServiceActionMenuId] = useState<string | null>(null);
  const [savingService, setSavingService] = useState(false);
  const [serviceSuccess, setServiceSuccess] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);

  // Edit Hospital Service Modal state
  const [isEditServiceModalOpen, setIsEditServiceModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editServiceName, setEditServiceName] = useState('');
  const [editServiceFee, setEditServiceFee] = useState<string>('0');
  const [editServiceCategory, setEditServiceCategory] = useState<string>('PROCEDURE');
  const [editServiceHsnCode, setEditServiceHsnCode] = useState<string>('999312');
  const [editServiceDoctorId, setEditServiceDoctorId] = useState<string>('');
  const [editServiceDescription, setEditServiceDescription] = useState<string>('');
  const [editServiceActive, setEditServiceActive] = useState<boolean>(true);
  const [savingEditService, setSavingEditService] = useState(false);

  // Floating Toast Notification Pop-up State
  interface ToastNotification {
    id: string;
    type: 'success' | 'error' | 'info';
    title: string;
    message?: string;
  }
  const [toast, setToast] = useState<ToastNotification | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = Date.now().toString();
    setToast({ id, type, title, message });
    setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 4500);
  };

  // Staff & Security Tab state
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('RECEPTIONIST');
  const [savingStaff, setSavingStaff] = useState(false);
  const [staffModalError, setStaffModalError] = useState<string | null>(null);
  const [activeStaffActionMenuId, setActiveStaffActionMenuId] = useState<string | null>(null);
  const [resetPasswordStaffUser, setResetPasswordStaffUser] = useState<{ id: string; name: string } | null>(null);
  const [newResetPassword, setNewResetPassword] = useState<string>('');
  const [savingResetPassword, setSavingResetPassword] = useState<boolean>(false);
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);

  // Dashboard Cards Customization State
  const DEFAULT_CARD_ORDER = [
    'today_revenue',
    'today_appts',
    'visited_today',
    'new_patients',
    'waiting_lounge',
    'in_consultation',
    'avg_wait',
    'emergency_count'
  ];
  const DEFAULT_FAVORITE_CARDS = ['today_revenue', 'today_appts', 'visited_today', 'new_patients'];

  const ALL_DASHBOARD_CARDS_MAP: Record<string, { name: string; category: string; description: string }> = {
    today_revenue: { name: "Today's Revenue (₹)", category: 'Financial', description: 'Calculates total sum of consultations, follow-up, and emergency fees' },
    today_appts: { name: "Today's Appointments", category: 'Operations', description: 'Tracks total scheduled, waiting lounge, and upcoming visits' },
    visited_today: { name: "Visited & Completed Today", category: 'Operations', description: 'Count of completed patient consultations today' },
    new_patients: { name: "New Patients Today", category: 'Patients', description: 'Fresh patient registrations created today' },
    waiting_lounge: { name: "Seated in Lounge", category: 'Operations', description: 'Live queue count of patients seated in waiting lounge' },
    in_consultation: { name: "In Doctor Chamber", category: 'Operations', description: 'Count of active consultations in doctor chamber' },
    avg_wait: { name: "Est. Lounge Wait Time", category: 'Operations', description: 'Estimated wait time calculation in minutes' },
    emergency_count: { name: "Emergency Priority Visits", category: 'Operations', description: 'Count of high-priority emergency appointments' },
  };

  const [dashboardCardOrder, setDashboardCardOrder] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('clinic_dashboard_cards_order');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_CARD_ORDER;
  });

  const [dashboardVisibleCards, setDashboardVisibleCards] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('clinic_dashboard_visible_cards');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_CARD_ORDER;
  });

  const [dashboardFavoriteCards, setDashboardFavoriteCards] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('clinic_dashboard_favorite_cards');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_FAVORITE_CARDS;
  });

  const [dashboardSuccessMsg, setDashboardSuccessMsg] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Load all initial settings
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        // Fetch user profile and sessions
        try {
          const userRes = await apiClient.get<UserType>('/users/me');
          if (userRes.data) {
            setName(userRes.data.name || '');
            setPhone(userRes.data.phone || '');
            setProfilePictureUrl(userRes.data.profilePictureUrl || '');
            if (userRes.data.notifyDailyReport !== undefined) setNotifyDailyReport(userRes.data.notifyDailyReport);
            if (userRes.data.notifyEmergencyVisit !== undefined) setNotifyEmergencyVisit(userRes.data.notifyEmergencyVisit);
            if (userRes.data.notifyRxAudit !== undefined) setNotifyRxAudit(userRes.data.notifyRxAudit);
          }

          const sessRes = await apiClient.get<UserSession[]>('/users/me/sessions');
          setSessions(sessRes.data || []);
        } catch {}

        // Fetch clinic details
        try {
          const clinicRes = await apiClient.get<Clinic>('/clinics/me');
          if (clinicRes.data) {
            setClinicName(clinicRes.data.name || '');
            setClinicEmail(clinicRes.data.email || '');
            setClinicPhone(clinicRes.data.phone || '');
            setEmergencyPhone(clinicRes.data.emergencyPhone || '');
            setTagline(clinicRes.data.tagline || '');
            setClinicAddress(clinicRes.data.address || '');
            setLandmark(clinicRes.data.landmark || '');
            setCity(clinicRes.data.city || '');
            setState(clinicRes.data.state || '');
            setPincode(clinicRes.data.pincode || '');
            setLogoUrl(clinicRes.data.logoUrl || '');
            setGstNumber(clinicRes.data.gstNumber || '');
            setRegistrationNumber(clinicRes.data.registrationNumber || '');
            setWebsite(clinicRes.data.website || '');
            setGoogleMapsLink(clinicRes.data.googleMapsLink || '');
            setTimezone(clinicRes.data.timezone || 'Asia/Kolkata');
            setCurrency(clinicRes.data.currency || '₹');
            setLanguage(clinicRes.data.language || 'en');
            setAppointmentSlotDuration(clinicRes.data.appointmentSlotDuration || 15);
            setWalkInEnabled(clinicRes.data.walkInEnabled ?? true);
            setDoubleBookingAllowed(clinicRes.data.doubleBookingAllowed ?? false);
            setMaxPatientsPerDay(clinicRes.data.maxPatientsPerDay ? String(clinicRes.data.maxPatientsPerDay) : '100');

            setMorningStartTime(clinicRes.data.morningStartTime || '09:00');
            setMorningEndTime(clinicRes.data.morningEndTime || '13:00');
            setEveningStartTime(clinicRes.data.eveningStartTime || '17:00');
            setEveningEndTime(clinicRes.data.eveningEndTime || '21:00');
            if (clinicRes.data.closedDays) {
              setClosedDays(clinicRes.data.closedDays.split(',').map((d) => d.trim()).filter(Boolean));
            }
            setHolidayDates(clinicRes.data.holidayDates || '');
            setInvoicePrefix(clinicRes.data.invoicePrefix || 'INV-');
            setTaxPercentage(clinicRes.data.taxPercentage !== undefined && clinicRes.data.taxPercentage !== null ? String(clinicRes.data.taxPercentage) : '0');
            setUpiId(clinicRes.data.upiId || '');
            setAllowDoctorDiscount(clinicRes.data.allowDoctorDiscount ?? true);
            setMaxDiscountPercentage(clinicRes.data.maxDiscountPercentage !== undefined && clinicRes.data.maxDiscountPercentage !== null ? String(clinicRes.data.maxDiscountPercentage) : '100');
            setDiscountReasons(clinicRes.data.discountReasons || 'Senior Citizen Concession, Follow-up Courtesy, Staff/Family Discount, Financial Hardship');
            setSessionTimeoutMinutes(clinicRes.data.sessionTimeoutMinutes ?? 30);
            setReceptionistAccessNotes(clinicRes.data.receptionistAccessNotes ?? false);

            // Phase 2 Multi-Specialty Hospital Settings
            setFacilityType(clinicRes.data.facilityType || 'HOSPITAL');
            setTotalBeds(clinicRes.data.totalBeds ? String(clinicRes.data.totalBeds) : '50');
            setTotalIcuBeds(clinicRes.data.totalIcuBeds ? String(clinicRes.data.totalIcuBeds) : '10');
            setTotalOtRooms(clinicRes.data.totalOtRooms ? String(clinicRes.data.totalOtRooms) : '2');
            setNabhAccreditationNumber(clinicRes.data.nabhAccreditationNumber || '');
            setRohiniHospitalId(clinicRes.data.rohiniHospitalId || '');
            setClinicalEstRegistrationNumber(clinicRes.data.clinicalEstRegistrationNumber || '');
            if (clinicRes.data.enabledDepartments) {
              setEnabledDepartments(clinicRes.data.enabledDepartments.split(',').map((d) => d.trim()).filter(Boolean));
            }
            setAmbulanceContactPhone(clinicRes.data.ambulanceContactPhone || '');
            setBloodBankAvailable(clinicRes.data.bloodBankAvailable ?? false);
            setPharmacy24x7(clinicRes.data.pharmacy24x7 ?? true);

            // Dashboard Layout settings
            setDashShowKpiStats(clinicRes.data.dashShowKpiStats ?? true);
            setDashShowRevenue(clinicRes.data.dashShowRevenue ?? true);
            setDashShowOpdQueue(clinicRes.data.dashShowOpdQueue ?? true);
            setDashShowAppointments(clinicRes.data.dashShowAppointments ?? true);
            setDashShowClinicalAlerts(clinicRes.data.dashShowClinicalAlerts ?? true);
            setDashShowQuickActions(clinicRes.data.dashShowQuickActions ?? true);
            setDashShowRecentPatients(clinicRes.data.dashShowRecentPatients ?? true);
            setDashShowInventoryAlerts(clinicRes.data.dashShowInventoryAlerts ?? true);
            setDashPrivacyMode(clinicRes.data.dashPrivacyMode ?? false);
            setDashDensity(clinicRes.data.dashDensity || 'COMFORTABLE');
            setDashAutoRefreshInterval(clinicRes.data.dashAutoRefreshInterval ?? 60);
            setDashDefaultDateRange(clinicRes.data.dashDefaultDateRange || 'TODAY');
            setDashRolePreset(clinicRes.data.dashRolePreset || 'DOCTOR');
          }
        } catch {}

        // Fetch prescription settings
        try {
          const presRes = await apiClient.get<PrescriptionSettings>('/prescription-settings/me');
          if (presRes.data) {
            setShowLogo(presRes.data.showLogo ?? true);
            setDigitalSignatureUrl(presRes.data.digitalSignatureUrl || '');
            setHeaderText(presRes.data.headerText || '');
            setFooterText(presRes.data.footerText || '');
            setWatermarkUrl(presRes.data.watermarkUrl || '');
            setPrintMarginMm(presRes.data.printMarginMm !== undefined ? String(presRes.data.printMarginMm) : '10');
            setTopMarginMm(presRes.data.topMarginMm !== undefined ? String(presRes.data.topMarginMm) : '35');
            setLetterheadMode(presRes.data.letterheadMode || 'PLAIN_PAPER');
            setPaperSize(presRes.data.paperSize || 'A4');
            setEnableQrCode(presRes.data.enableQrCode ?? true);
            setShowVitals(presRes.data.showVitals ?? true);
            setShowComplaints(presRes.data.showComplaints ?? true);
            setShowDiagnosis(presRes.data.showDiagnosis ?? true);
            setShowMedicines(presRes.data.showMedicines ?? true);
            setShowLabTests(presRes.data.showLabTests ?? true);
            setShowAdvice(presRes.data.showAdvice ?? true);
            setShowFollowUp(presRes.data.showFollowUp ?? true);
            setShowSignature(presRes.data.showSignature ?? true);
            setDefaultAdvice(presRes.data.defaultAdvice || '');

            // Discharge Summary
            setDischargeHeaderTitle(presRes.data.dischargeHeaderTitle || 'HOSPITAL INPATIENT DISCHARGE SUMMARY');
            setDischargeShowHospitalCourse(presRes.data.dischargeShowHospitalCourse ?? true);
            setDischargeShowInvestigations(presRes.data.dischargeShowInvestigations ?? true);
            setDischargeShowDietActivity(presRes.data.dischargeShowDietActivity ?? true);
            setDischargeShowEmergencyWarning(presRes.data.dischargeShowEmergencyWarning ?? true);
            setDischargeShowAttendantSignature(presRes.data.dischargeShowAttendantSignature ?? true);
            if (presRes.data.defaultDischargeEmergencyNotes) setDefaultDischargeEmergencyNotes(presRes.data.defaultDischargeEmergencyNotes);
            if (presRes.data.defaultDischargeDietNotes) setDefaultDischargeDietNotes(presRes.data.defaultDischargeDietNotes);

            // Consultation Report
            setConsultationReportTitle(presRes.data.consultationReportTitle || 'CLINICAL CONSULTATION & OPD ENCOUNTER REPORT');
            setConsultationShowVitals(presRes.data.consultationShowVitals ?? true);
            setConsultationShowSystemicExam(presRes.data.consultationShowSystemicExam ?? true);
            setConsultationShowInvestigations(presRes.data.consultationShowInvestigations ?? true);
            setConsultationShowReferralNotes(presRes.data.consultationShowReferralNotes ?? true);
            if (presRes.data.defaultConsultationDisclaimer) setDefaultConsultationDisclaimer(presRes.data.defaultConsultationDisclaimer);

            // Medical Certificate
            setMedicalCertTitle(presRes.data.medicalCertTitle || 'MEDICAL FITNESS & SICKNESS CERTIFICATE');
            setMedicalCertCouncilAuthority(presRes.data.medicalCertCouncilAuthority || 'Issued under the Regulations of the National Medical Commission & State Medical Council');
            if (presRes.data.defaultMedicalCertRemarks) setDefaultMedicalCertRemarks(presRes.data.defaultMedicalCertRemarks);
            setMedicalCertShowSeal(presRes.data.medicalCertShowSeal ?? true);

            if (presRes.data.rxTemplates) {
              try {
                const parsed = JSON.parse(presRes.data.rxTemplates);
                if (Array.isArray(parsed) && parsed.length > 0) setRxTemplates(parsed);
              } catch {}
            }
            if (presRes.data.quickAdviceList) {
              try {
                const parsed = JSON.parse(presRes.data.quickAdviceList);
                if (Array.isArray(parsed) && parsed.length > 0) setQuickAdviceList(parsed);
              } catch {}
            }
          }
        } catch {}

        // Fetch clinic doctors for Practice Details (Admins & Doctors)
        try {
          const docsRes = await apiClient.get<Doctor[]>('/doctors');
          const docs = docsRes.data || [];
          setClinicDoctors(docs);
          if (docs.length > 0) {
            const matched = (user && docs.find((d) => d.id === user.id)) || docs[0];
            setSelectedDoctorId(matched.id);
            populateDoctorFields(matched);
          } else if (user && user.role === 'DOCTOR') {
            try {
              const docRes = await apiClient.get<Doctor>(`/doctors/${user.id}`);
              if (docRes.data) {
                setClinicDoctors([docRes.data]);
                setSelectedDoctorId(docRes.data.id);
                populateDoctorFields(docRes.data);
              }
            } catch {}
          }
        } catch (err) {
          console.error('Failed to load clinic doctors', err);
        }

        // Fetch services
        try {
          const servRes = await apiClient.get<ClinicServiceItem[]>('/services?includeInactive=true');
          setServices(servRes.data || []);
        } catch {}

        // Fetch staff list & active sessions
        if (user && ['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN'].includes(user.role?.toUpperCase())) {
          try {
            const staffRes = await apiClient.get<StaffMember[]>('/users/staff');
            setStaffList(staffRes.data || []);
          } catch {}
          try {
            const sessRes = await apiClient.get<UserSession[]>('/users/me/sessions');
            setSessions(sessRes.data || []);
          } catch {}
        }
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [user]);

  // Instant Profile Photo Upload Handler
  const handleAvatarUploadComplete = async (uploadedUrl: string) => {
    setProfilePictureUrl(uploadedUrl);
    setSavingAccount(true);
    setAccountSuccess(false);
    setAccountError(null);

    try {
      await apiClient.put('/users/me', {
        name,
        phone,
        profilePictureUrl: uploadedUrl
      });
      updateUser({ profilePictureUrl: uploadedUrl });
      setAccountSuccess(true);
      showToast('success', 'Profile Photo Updated', 'Your profile image has been synced across all active sessions.');
      setTimeout(() => setAccountSuccess(false), 3500);
    } catch (err) {
      const errMsg = (err as AxiosErrorLike)?.response?.data?.message || (err as AxiosErrorLike)?.message || 'Failed to update profile photo across devices';
      setAccountError(errMsg);
      showToast('error', 'Photo Upload Failed', errMsg);
    } finally {
      setSavingAccount(false);
    }
  };

  // Save Account Profile Info
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAccount(true);
    setAccountSuccess(false);
    setAccountError(null);

    try {
      const updateData: { name: string; phone: string; profilePictureUrl: string } = {
        name,
        phone,
        profilePictureUrl
      };

      await apiClient.put('/users/me', updateData);
      updateUser({ name, phone, profilePictureUrl });

      setAccountSuccess(true);
      showToast('success', 'Account Profile Saved', 'Your personal contact details and name have been updated.');
      setTimeout(() => setAccountSuccess(false), 4000);
    } catch (err) {
      const errMsg = (err as AxiosErrorLike)?.response?.data?.message || (err as AxiosErrorLike)?.message || 'Failed to update personal profile details';
      setAccountError(errMsg);
      showToast('error', 'Update Failed', errMsg);
    } finally {
      setSavingAccount(false);
    }
  };

  // Dedicated Password Update Handler
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      setPasswordError('Please enter your new password.');
      showToast('error', 'Validation Error', 'Please enter your new password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must contain at least 6 characters.');
      showToast('error', 'Validation Error', 'New password must contain at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation password do not match.');
      showToast('error', 'Validation Error', 'New password and confirmation password do not match.');
      return;
    }

    setSavingPassword(true);
    setPasswordSuccess(false);
    setPasswordError(null);

    try {
      await apiClient.put('/users/me', {
        name,
        phone,
        profilePictureUrl,
        password: newPassword
      });

      setPasswordSuccess(true);
      showToast('success', 'Password Changed', 'Your security password has been updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch (err) {
      const errMsg = (err as AxiosErrorLike)?.response?.data?.message || (err as AxiosErrorLike)?.message || 'Failed to update password. Please try again.';
      setPasswordError(errMsg);
      showToast('error', 'Password Update Failed', errMsg);
    } finally {
      setSavingPassword(false);
    }
  };

  const fetchSessions = async () => {
    try {
      setLoadingSessions(true);
      const res = await apiClient.get<UserSession[]>('/users/me/sessions');
      setSessions(res.data || []);
    } catch (err) {
      console.error('Failed to load active sessions', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  // Sign out other devices
  const handleSignOutOtherDevices = async () => {
    setRevokingOthers(true);
    try {
      await apiClient.post('/users/me/sessions/revoke-others');
      setSignedOutOtherSessions(true);
      showToast('success', 'Remote Sessions Revoked', 'All other active devices have been logged out.');
      setTimeout(() => setSignedOutOtherSessions(false), 4000);
      await fetchSessions();
    } catch (err) {
      console.error('Failed to revoke other sessions', err);
      showToast('error', 'Action Failed', 'Failed to sign out other devices.');
    } finally {
      setRevokingOthers(false);
    }
  };

  // Revoke single session
  const handleRevokeSingleSession = async (sessionId: string) => {
    setRevokingSessionId(sessionId);
    try {
      await apiClient.delete(`/users/me/sessions/${sessionId}`);
      showToast('success', 'Device Signed Out', 'Remote session terminated.');
      await fetchSessions();
    } catch (err) {
      console.error('Failed to revoke session', err);
      showToast('error', 'Action Failed', 'Failed to terminate session.');
    } finally {
      setRevokingSessionId(null);
    }
  };

  // Save Notification Preferences to Cloud Database
  const handleSaveNotificationPreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPref(true);
    setPrefSuccess(false);
    try {
      await apiClient.put('/users/me', {
        name,
        phone,
        profilePictureUrl,
        notifyDailyReport,
        notifyEmergencyVisit,
        notifyRxAudit
      });
      updateUser({ notifyDailyReport, notifyEmergencyVisit, notifyRxAudit });
      setPrefSuccess(true);
      showToast('success', 'Preferences Saved', 'Your cloud notification settings have been updated.');
      setTimeout(() => setPrefSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save notification preferences', err);
      showToast('error', 'Save Failed', 'Could not save notification preferences.');
    } finally {
      setSavingPref(false);
    }
  };

  // Instant Clinic Logo Upload Handler
  const handleClinicLogoUploadComplete = async (uploadedUrl: string) => {
    setLogoUrl(uploadedUrl);
    setSavingClinic(true);
    setClinicSuccess(false);
    setClinicError(null);

    try {
      await apiClient.put('/clinics/me', {
        name: clinicName,
        email: clinicEmail,
        phone: clinicPhone,
        emergencyPhone,
        tagline,
        address: clinicAddress,
        landmark,
        city,
        state,
        pincode,
        logoUrl: uploadedUrl,
        gstNumber,
        registrationNumber,
        website,
        googleMapsLink,
        timezone,
        currency,
        language,
        appointmentSlotDuration,
        walkInEnabled,
        doubleBookingAllowed,
        maxPatientsPerDay: maxPatientsPerDay === '' ? 100 : Number(maxPatientsPerDay),
        morningStartTime,
        morningEndTime,
        eveningStartTime,
        eveningEndTime,
        closedDays: closedDays.join(','),
        holidayDates,
        invoicePrefix,
        taxPercentage,
        upiId,
        sessionTimeoutMinutes,
        receptionistAccessNotes,
      });
      setClinicSuccess(true);
      showToast('success', 'Clinic Logo Uploaded', 'New emblem is active on prescriptions and tax invoices.');
      setTimeout(() => setClinicSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to auto-save clinic logo', err);
      setClinicError('Failed to auto-save clinic logo.');
      showToast('error', 'Logo Save Failed', 'Failed to auto-save clinic logo.');
    } finally {
      setSavingClinic(false);
    }
  };

  const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const toggleClosedDay = (day: string) => {
    if (closedDays.includes(day)) {
      setClosedDays(closedDays.filter(d => d !== day));
    } else {
      setClosedDays([...closedDays, day]);
    }
  };

  // Holiday Date helpers
  const handleAddHolidayDate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newHolidayDate) return;
    const existing = holidayDates ? holidayDates.split(',').map(d => d.trim()).filter(Boolean) : [];
    if (!existing.includes(newHolidayDate)) {
      const updated = [...existing, newHolidayDate].sort().join(',');
      setHolidayDates(updated);
      showToast('info', 'Holiday Added', `Added ${newHolidayDate}. Remember to click Save Clinic Settings.`);
    }
    setNewHolidayDate('');
  };

  const handleRemoveHolidayDate = (dateToRemove: string) => {
    const existing = holidayDates ? holidayDates.split(',').map(d => d.trim()).filter(Boolean) : [];
    const updated = existing.filter(d => d !== dateToRemove).join(',');
    setHolidayDates(updated);
    showToast('info', 'Holiday Removed', `Removed ${dateToRemove}. Remember to click Save Clinic Settings.`);
  };

  // Save Clinic
  const handleSaveClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingClinic(true);
    setClinicSuccess(false);
    setClinicError(null);

    try {
      await apiClient.put('/clinics/me', {
        name: clinicName,
        email: clinicEmail,
        phone: clinicPhone,
        emergencyPhone,
        tagline,
        address: clinicAddress,
        landmark,
        city,
        state,
        pincode,
        logoUrl,
        gstNumber,
        registrationNumber,
        website,
        googleMapsLink,
        timezone,
        currency,
        language,
        appointmentSlotDuration,
        walkInEnabled,
        doubleBookingAllowed,
        maxPatientsPerDay: maxPatientsPerDay === '' ? 100 : Number(maxPatientsPerDay),
        morningStartTime,
        morningEndTime,
        eveningStartTime,
        eveningEndTime,
        closedDays: closedDays.join(','),
        holidayDates,
        invoicePrefix,
        taxPercentage: taxPercentage === '' ? 0 : Number(taxPercentage),
        upiId,
        allowDoctorDiscount,
        maxDiscountPercentage: maxDiscountPercentage === '' ? 100 : Number(maxDiscountPercentage),
        discountReasons,
        sessionTimeoutMinutes,
        receptionistAccessNotes,
        facilityType,
        totalBeds: totalBeds === '' ? 50 : Number(totalBeds),
        totalIcuBeds: totalIcuBeds === '' ? 10 : Number(totalIcuBeds),
        totalOtRooms: totalOtRooms === '' ? 2 : Number(totalOtRooms),
        nabhAccreditationNumber,
        rohiniHospitalId,
        clinicalEstRegistrationNumber,
        enabledDepartments: enabledDepartments.join(','),
        ambulanceContactPhone,
        bloodBankAvailable,
        pharmacy24x7,
      });
      setClinicSuccess(true);
      showToast('success', 'Clinic Schedule & Settings Saved', 'Operating hours, shifts, holidays, and license details are saved.');
      setTimeout(() => setClinicSuccess(false), 4000);
    } catch (err) {
      const errMsg = (err as AxiosErrorLike)?.response?.data?.message || (err as AxiosErrorLike)?.message || 'Failed to update clinic settings';
      setClinicError(errMsg);
      showToast('error', 'Save Failed', errMsg);
    } finally {
      setSavingClinic(false);
    }
  };

  // Save Professional Practice Details
  const handleSaveProfessional = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = selectedDoctorId || user?.id;
    if (!targetId) {
      showToast('error', 'No Doctor Profile Selected', 'Please select or create a doctor profile first.');
      return;
    }
    setSavingProfessional(true);
    setProfessionalSuccess(false);
    setProfessionalError(null);

    try {
      await apiClient.put(`/doctors/${targetId}`, {
        name: docName || name,
        phone: docPhone || phone,
        specialization: specialization || 'General Medicine',
        subSpecialization,
        registrationNumber: doctorRegNumber,
        medicalCouncil,
        registrationYear: registrationYear ? Number(registrationYear) : undefined,
        languagesSpoken,
        roomNumber,
        slotDuration: doctorSlotDuration ? Number(doctorSlotDuration) : 15,
        digitalSignature: doctorDigitalSignature,
        consultationFee: consultationFee === '' ? 0 : Number(consultationFee),
        followUpFee: followUpFee === '' ? 0 : Number(followUpFee),
        emergencyFee: emergencyFee === '' ? 0 : Number(emergencyFee),
        qualification,
        experienceYears: experienceYears === '' ? 0 : Number(experienceYears),
        biography,
        availabilitySchedule
      });
      setProfessionalSuccess(true);
      showToast('success', 'Practice Details Saved', `Doctor profile and fees for Dr. ${docName || name} are updated.`);

      const docsRes = await apiClient.get<Doctor[]>('/doctors');
      setClinicDoctors(docsRes.data || []);
    } catch (err) {
      const errMsg = (err as AxiosErrorLike)?.response?.data?.message || (err as AxiosErrorLike)?.message || 'Failed to update practice details';
      setProfessionalError(errMsg);
      showToast('error', 'Save Failed', errMsg);
    } finally {
      setSavingProfessional(false);
    }
  };

  // Save Prescription Studio
  const handleSavePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrescription(true);
    setPrescriptionSuccess(false);
    setPrescriptionError(null);

    try {
      await apiClient.put('/prescription-settings/me', {
        showLogo,
        digitalSignatureUrl,
        headerText,
        footerText,
        watermarkUrl,
        printMarginMm: printMarginMm === '' ? 10 : Number(printMarginMm),
        topMarginMm: topMarginMm === '' ? 35 : Number(topMarginMm),
        letterheadMode,
        paperSize,
        enableQrCode,
        showVitals,
        showComplaints,
        showDiagnosis,
        showMedicines,
        showLabTests,
        showAdvice,
        showFollowUp,
        showSignature,
        defaultAdvice,
        rxTemplates: JSON.stringify(rxTemplates),
        quickAdviceList: JSON.stringify(quickAdviceList),
        // Discharge Summary
        dischargeHeaderTitle,
        dischargeShowHospitalCourse,
        dischargeShowInvestigations,
        dischargeShowDietActivity,
        dischargeShowEmergencyWarning,
        dischargeShowAttendantSignature,
        defaultDischargeEmergencyNotes,
        defaultDischargeDietNotes,
        // Consultation Report
        consultationReportTitle,
        consultationShowVitals,
        consultationShowSystemicExam,
        consultationShowInvestigations,
        consultationShowReferralNotes,
        defaultConsultationDisclaimer,
        // Medical Certificate
        medicalCertTitle,
        medicalCertCouncilAuthority,
        defaultMedicalCertRemarks,
        medicalCertShowSeal,
      });
      setPrescriptionSuccess(true);
      showToast('success', 'Clinical Documents & Rx Studio Saved', 'Prescription, Discharge Summary, Consultation Report, and Certificate settings saved successfully.');
    } catch (err) {
      const errMsg = (err as AxiosErrorLike)?.response?.data?.message || (err as AxiosErrorLike)?.message || 'Failed to save prescription settings';
      setPrescriptionError(errMsg);
      showToast('error', 'Save Failed', errMsg);
    } finally {
      setSavingPrescription(false);
    }
  };

  // Hospital Services & Tariff actions
  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;
    setSavingService(true);
    setServiceSuccess(false);
    setServiceError(null);

    const matchedDoc = clinicDoctors.find((d) => d.id === newServiceDoctorId);

    try {
      await apiClient.post('/services', {
        name: newServiceName,
        fee: newServiceFee === '' ? 0 : Number(newServiceFee),
        category: newServiceCategory,
        hsnSacCode: newServiceHsnCode || '999312',
        doctorId: newServiceDoctorId || null,
        doctorName: matchedDoc ? matchedDoc.name : null,
        description: newServiceDescription || null,
      });
      showToast('success', 'Service Price Added', `"${newServiceName}" has been added to the price list.`);
      setNewServiceName('');
      setNewServiceFee('0');
      setNewServiceDescription('');
      setServiceSuccess(true);
      
      const servRes = await apiClient.get<ClinicServiceItem[]>('/services?includeInactive=true');
      setServices(servRes.data);
    } catch (err) {
      const errMsg = (err as AxiosErrorLike)?.response?.data?.message || (err as AxiosErrorLike)?.message || 'Failed to add service price';
      setServiceError(errMsg);
      showToast('error', 'Add Price Failed', errMsg);
    } finally {
      setSavingService(false);
    }
  };

  const handleToggleServiceStatus = async (id: string, currentlyActive: boolean, name: string) => {
    try {
      await apiClient.patch(`/services/${id}/toggle-status`);
      setServices((prev) =>
        prev.map((s) => (s.id === id ? { ...s, active: !currentlyActive } : s))
      );
      showToast(
        'success',
        currentlyActive ? 'Service Deactivated' : 'Service Activated',
        `"${name}" is now marked as ${currentlyActive ? 'Inactive' : 'Active'}.`
      );
    } catch (err) {
      console.error('Failed to toggle service status', err);
      showToast('error', 'Action Failed', 'Failed to update service status.');
    } finally {
      setActiveServiceActionMenuId(null);
    }
  };

  const handleDeleteServicePermanently = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await apiClient.delete(`/services/${id}?permanent=true`);
      setServices((prev) => prev.filter((s) => s.id !== id));
      showToast('success', 'Service Deleted', `"${name}" was permanently removed from the price list.`);
    } catch (err) {
      console.error('Failed to permanently delete service item', err);
      showToast('error', 'Delete Failed', 'Failed to delete service item permanently.');
    } finally {
      setActiveServiceActionMenuId(null);
    }
  };

  // Open Edit Service Modal
  const handleOpenEditService = (service: ClinicServiceItem) => {
    setEditingServiceId(service.id || null);
    setEditServiceName(service.name);
    setEditServiceFee(String(service.fee));
    setEditServiceCategory(service.category || 'PROCEDURE');
    setEditServiceHsnCode(service.hsnSacCode || '999312');
    setEditServiceDoctorId(service.doctorId || '');
    setEditServiceDescription(service.description || '');
    setEditServiceActive(service.active !== false);
    setIsEditServiceModalOpen(true);
    setActiveServiceActionMenuId(null);
  };

  // Save Edited Service Item (Keeps Exact Position in List)
  const handleSaveEditedService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingServiceId || !editServiceName.trim()) return;
    setSavingEditService(true);
    const matchedDoc = clinicDoctors.find((d) => d.id === editServiceDoctorId);

    try {
      const res = await apiClient.put<ClinicServiceItem>(`/services/${editingServiceId}`, {
        name: editServiceName,
        fee: editServiceFee === '' ? 0 : Number(editServiceFee),
        category: editServiceCategory,
        hsnSacCode: editServiceHsnCode || '999312',
        doctorId: editServiceDoctorId || null,
        doctorName: matchedDoc ? matchedDoc.name : null,
        description: editServiceDescription,
        active: editServiceActive
      });

      // Preserve exact item position in list
      setServices((prev) =>
        prev.map((s) =>
          s.id === editingServiceId
            ? {
                ...s,
                name: res.data?.name ?? editServiceName,
                fee: res.data?.fee ?? (editServiceFee === '' ? 0 : Number(editServiceFee)),
                category: res.data?.category ?? editServiceCategory,
                hsnSacCode: res.data?.hsnSacCode ?? (editServiceHsnCode || '999312'),
                doctorId: res.data?.doctorId ?? (editServiceDoctorId || undefined),
                doctorName: res.data?.doctorName ?? (matchedDoc ? matchedDoc.name : undefined),
                description: res.data?.description ?? editServiceDescription,
                active: res.data?.active ?? editServiceActive,
              }
            : s
        )
      );

      setIsEditServiceModalOpen(false);
      showToast('success', 'Service Updated', `"${editServiceName}" has been updated successfully.`);
    } catch (err) {
      console.error('Failed to update service item', err);
      showToast('error', 'Update Failed', 'Failed to save changes to service item.');
    } finally {
      setSavingEditService(false);
    }
  };

  // 1-Click Multi-Specialty Hospital Tariffs & Diagnostic Bundles Auto-Provisioner
  const handleAutoPopulateHospitalServices = async () => {
    const STANDARD_HOSPITAL_SERVICES = [
      { name: 'General Ward Bed (Per Day)', fee: 1000, category: 'ROOM_BED', description: 'Standard Inpatient Ward Bed with nursing care' },
      { name: 'Semi-Private Room (Per Day)', fee: 2000, category: 'ROOM_BED', description: 'Dual-occupancy semi-private patient room' },
      { name: 'Deluxe Private AC Room (Per Day)', fee: 3500, category: 'ROOM_BED', description: 'Single private air-conditioned patient room' },
      { name: 'ICU / CCU Critical Care Bed (Per Day)', fee: 6500, category: 'ICU_CCU', description: 'Intensive Critical Care Bed with multipara monitor & oxygen line' },
      { name: 'Day-Care Recovery Bed', fee: 1500, category: 'ROOM_BED', description: 'Day-care observation and post-minor procedure recovery bed' },
      { name: 'Major Operation Theatre (OT) Charge', fee: 8000, category: 'OPERATION_THEATRE', description: 'Sterilized surgical suite usage with anesthesia machine support' },
      { name: 'Complete Blood Count (CBC Profile)', fee: 350, category: 'DIAGNOSTIC_LAB', description: 'Hemoglobin, TLC, DLC, Platelet count, RBC indices' },
      { name: 'Liver Function Test (LFT Profile)', fee: 650, category: 'DIAGNOSTIC_LAB', description: 'Bilirubin, SGOT, SGPT, Alkaline Phosphatase, Total Protein' },
      { name: 'Kidney Function Test (KFT Profile)', fee: 600, category: 'DIAGNOSTIC_LAB', description: 'Urea, Creatinine, Uric Acid, Electrolytes' },
      { name: 'Lipid Profile (Cholesterol Panel)', fee: 500, category: 'DIAGNOSTIC_LAB', description: 'Total Cholesterol, Triglycerides, HDL, LDL, VLDL' },
      { name: 'HbA1c (Glycated Hemoglobin)', fee: 450, category: 'DIAGNOSTIC_LAB', description: '3-Month blood sugar average test' },
      { name: 'Digital Chest X-Ray (PA View)', fee: 400, category: 'DIAGNOSTIC_LAB', description: 'Digital radiography chest posterior-anterior' },
      { name: '12-Lead Electrocardiogram (ECG)', fee: 250, category: 'DIAGNOSTIC_LAB', description: 'Standard 12-lead cardiac electrical activity recording' },
      { name: 'Ultrasound (USG) Whole Abdomen', fee: 1200, category: 'DIAGNOSTIC_LAB', description: 'Abdominal ultrasound imaging' },
    ];

    setSavingService(true);
    let addedCount = 0;
    try {
      for (const item of STANDARD_HOSPITAL_SERVICES) {
        const alreadyExists = services.some(s => s.name.toLowerCase() === item.name.toLowerCase());
        if (!alreadyExists) {
          await apiClient.post('/services', {
            name: item.name,
            fee: item.fee,
            category: item.category,
            hsnSacCode: '999312',
            description: item.description,
            active: true
          });
          addedCount++;
        }
      }
      const servRes = await apiClient.get<ClinicServiceItem[]>('/services?includeInactive=true');
      setServices(servRes.data || []);
      showToast('success', 'Hospital Tariffs Provisioned', `Added ${addedCount} standard hospital ward beds and diagnostic lab bundles.`);
    } catch (err) {
      console.error('Failed to populate standard hospital services', err);
      showToast('error', 'Provisioning Failed', 'Could not auto-populate hospital tariffs.');
    } finally {
      setSavingService(false);
    }
  };

  // Staff actions
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingStaff(true);
    setStaffModalError(null);
    try {
      await apiClient.post('/users/staff', {
        name: newStaffName,
        email: newStaffEmail,
        password: newStaffPassword,
        phone: newStaffPhone,
        roleId: newStaffRole
      });

      showToast('success', 'Staff Member Added', `New account for "${newStaffName}" has been provisioned.`);
      setNewStaffName('');
      setNewStaffEmail('');
      setNewStaffPassword('');
      setNewStaffPhone('');
      setNewStaffRole('RECEPTIONIST');
      setShowAddStaffModal(false);

      const res = await apiClient.get<StaffMember[]>('/users/staff');
      setStaffList(res.data);
    } catch (err: unknown) {
      const errorMsg = (err as AxiosErrorLike)?.response?.data?.message || (err as AxiosErrorLike)?.message || 'Failed to create staff user';
      setStaffModalError(errorMsg);
      showToast('error', 'Staff Creation Failed', errorMsg);
    } finally {
      setSavingStaff(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await apiClient.patch(`/users/staff/${userId}/role?roleId=${newRole}`);
      showToast('success', 'Staff Role Updated', 'User permissions and role updated successfully.');
      const staffRes = await apiClient.get<StaffMember[]>('/users/staff');
      setStaffList(staffRes.data || []);
    } catch (err) {
      console.error('Failed to change staff role', err);
      showToast('error', 'Update Failed', 'Failed to change staff role.');
    }
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete staff user "${name}"? They will no longer be able to log in.`)) return;
    try {
      await apiClient.delete(`/users/staff/${id}`);
      showToast('success', 'Staff User Deleted', `Account for "${name}" has been removed.`);
      const staffRes = await apiClient.get<StaffMember[]>('/users/staff');
      setStaffList(staffRes.data || []);
    } catch (err) {
      console.error('Failed to delete staff member', err);
      showToast('error', 'Action Failed', 'Failed to delete staff user.');
    } finally {
      setActiveStaffActionMenuId(null);
    }
  };

  const handleResetStaffPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordStaffUser || !newResetPassword) return;
    setSavingResetPassword(true);
    setResetPasswordError(null);
    try {
      await apiClient.post(`/users/staff/${resetPasswordStaffUser.id}/reset-password?newPassword=${encodeURIComponent(newResetPassword)}`);
      showToast('success', 'Password Reset Successful', `New password assigned for ${resetPasswordStaffUser.name}.`);
      setResetPasswordStaffUser(null);
      setNewResetPassword('');
    } catch (err) {
      const errMsg = (err as AxiosErrorLike)?.response?.data?.message || 'Failed to reset password';
      setResetPasswordError(errMsg);
    } finally {
      setSavingResetPassword(false);
    }
  };

  const fetchUserSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await apiClient.get<UserSession[]>('/users/me/sessions');
      setSessions(res.data || []);
    } catch (err) {
      console.error('Failed to load user sessions', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    if (!window.confirm('Are you sure you want to sign out all other connected devices?')) return;
    try {
      await apiClient.post('/users/me/sessions/revoke-others');
      showToast('success', 'Sessions Revoked', 'All other devices have been logged out.');
      fetchUserSessions();
    } catch (err) {
      console.error('Failed to revoke other sessions', err);
      showToast('error', 'Action Failed', 'Failed to log out other devices.');
    }
  };

  // Rx Template actions
  const handleAddRxTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplName.trim()) return;
    const newTpl: RxTemplateItem = {
      id: Date.now().toString(),
      name: tplName,
      diagnosis: tplDiagnosis,
      medicines: tplMeds,
      advice: tplAdvice,
    };
    setRxTemplates([...rxTemplates, newTpl]);
    showToast('success', 'Rx Template Created', `"${tplName}" is ready. Remember to click Save Prescription Settings.`);
    setTplName('');
    setTplDiagnosis('');
    setTplMeds('');
    setTplAdvice('');
    setShowNewTemplateModal(false);
  };

  const handleDeleteRxTemplate = (id: string) => {
    setRxTemplates(rxTemplates.filter((t) => t.id !== id));
    showToast('info', 'Template Removed', 'Rx template removed. Remember to click Save Prescription Settings.');
  };

  const handleAddAdviceSnippet = () => {
    if (!newAdviceInput.trim()) return;
    setQuickAdviceList([...quickAdviceList, newAdviceInput.trim()]);
    showToast('info', 'Advice Added', 'Quick advice snippet added. Remember to click Save Prescription Settings.');
    setNewAdviceInput('');
  };

  const handleDeleteAdviceSnippet = (index: number) => {
    setQuickAdviceList(quickAdviceList.filter((_, idx) => idx !== index));
    showToast('info', 'Advice Removed', 'Quick advice snippet removed. Remember to click Save Prescription Settings.');
  };

  // Dashboard Card reordering
  const moveCardUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...dashboardCardOrder];
    const temp = newOrder[index - 1];
    newOrder[index - 1] = newOrder[index];
    newOrder[index] = temp;
    setDashboardCardOrder(newOrder);
    localStorage.setItem('clinic_dashboard_cards_order', JSON.stringify(newOrder));
    triggerDashboardSaveNotification();
  };

  const moveCardDown = (index: number) => {
    if (index === dashboardCardOrder.length - 1) return;
    const newOrder = [...dashboardCardOrder];
    const temp = newOrder[index + 1];
    newOrder[index + 1] = newOrder[index];
    newOrder[index] = temp;
    setDashboardCardOrder(newOrder);
    localStorage.setItem('clinic_dashboard_cards_order', JSON.stringify(newOrder));
    triggerDashboardSaveNotification();
  };

  const toggleVisibleCard = (cardId: string) => {
    let newVisible: string[];
    if (dashboardVisibleCards.includes(cardId)) {
      if (dashboardVisibleCards.length <= 1) {
        showToast('error', 'Action Restricted', 'At least one dashboard card must remain visible.');
        return;
      }
      newVisible = dashboardVisibleCards.filter((id) => id !== cardId);
    } else {
      newVisible = [...dashboardVisibleCards, cardId];
    }
    setDashboardVisibleCards(newVisible);
    localStorage.setItem('clinic_dashboard_visible_cards', JSON.stringify(newVisible));
    triggerDashboardSaveNotification();
  };

  const toggleFavoriteCard = (cardId: string) => {
    let newFav: string[];
    if (dashboardFavoriteCards.includes(cardId)) {
      newFav = dashboardFavoriteCards.filter((id) => id !== cardId);
    } else {
      newFav = [...dashboardFavoriteCards, cardId];
    }
    setDashboardFavoriteCards(newFav);
    localStorage.setItem('clinic_dashboard_favorite_cards', JSON.stringify(newFav));
    triggerDashboardSaveNotification();
  };

  // Save Dashboard Layout & Widget Studio
  const handleSaveDashboardSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingDashboard(true);
    setDashboardSuccessMsg(null);
    try {
      await apiClient.put('/clinics/me', {
        name: clinicName,
        email: clinicEmail,
        phone: clinicPhone,
        emergencyPhone,
        tagline,
        address: clinicAddress,
        landmark,
        city,
        state,
        pincode,
        logoUrl,
        gstNumber,
        registrationNumber,
        website,
        googleMapsLink,
        timezone,
        currency,
        language,
        appointmentSlotDuration,
        walkInEnabled,
        doubleBookingAllowed,
        maxPatientsPerDay: maxPatientsPerDay === '' ? 100 : Number(maxPatientsPerDay),
        morningStartTime,
        morningEndTime,
        eveningStartTime,
        eveningEndTime,
        closedDays: closedDays.join(','),
        holidayDates,
        invoicePrefix,
        taxPercentage: taxPercentage === '' ? 0 : Number(taxPercentage),
        upiId,
        allowDoctorDiscount,
        maxDiscountPercentage: maxDiscountPercentage === '' ? 100 : Number(maxDiscountPercentage),
        discountReasons,
        sessionTimeoutMinutes,
        receptionistAccessNotes,
        // Dashboard Layout
        dashShowKpiStats,
        dashShowRevenue,
        dashShowOpdQueue,
        dashShowAppointments,
        dashShowClinicalAlerts,
        dashShowQuickActions,
        dashShowRecentPatients,
        dashShowInventoryAlerts,
        dashPrivacyMode,
        dashDensity,
        dashAutoRefreshInterval,
        dashDefaultDateRange,
        dashRolePreset,
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'nisschay_dashboard_layout',
          JSON.stringify({
            dashShowKpiStats,
            dashShowRevenue,
            dashShowOpdQueue,
            dashShowAppointments,
            dashShowClinicalAlerts,
            dashShowQuickActions,
            dashShowRecentPatients,
            dashShowInventoryAlerts,
            dashPrivacyMode,
            dashDensity,
            dashAutoRefreshInterval,
            dashDefaultDateRange,
            dashRolePreset,
          })
        );
      }

      setDashboardSuccessMsg('Dashboard layout preferences saved successfully.');
      showToast('success', 'Dashboard Layout Saved', 'Widget toggles, screen density, and privacy mode preferences saved.');
      setTimeout(() => setDashboardSuccessMsg(null), 4000);
    } catch (err) {
      const errMsg = (err as AxiosErrorLike)?.response?.data?.message || (err as AxiosErrorLike)?.message || 'Failed to save dashboard settings';
      showToast('error', 'Save Failed', errMsg);
    } finally {
      setSavingDashboard(false);
    }
  };

  const applyRolePreset = (preset: 'DOCTOR' | 'RECEPTIONIST' | 'ADMIN') => {
    let kpi = true;
    let rev = true;
    let opd = true;
    let appts = true;
    let alerts = true;
    let actions = true;
    let recent = true;
    let inv = true;
    let privacy = false;
    let density: 'COMPACT' | 'COMFORTABLE' | 'TOUCHSCREEN' = 'COMFORTABLE';

    if (preset === 'DOCTOR') {
      kpi = true;
      rev = false;
      opd = true;
      appts = true;
      alerts = true;
      actions = true;
      recent = true;
      inv = false;
      privacy = true;
      density = 'COMFORTABLE';
      showToast('info', 'Doctor Preset Loaded', 'Configured with clinical focus & privacy mode enabled.');
    } else if (preset === 'RECEPTIONIST') {
      kpi = true;
      rev = true;
      opd = true;
      appts = true;
      alerts = false;
      actions = true;
      recent = true;
      inv = true;
      privacy = false;
      density = 'COMPACT';
      showToast('info', 'Receptionist Preset Loaded', 'Configured with appointments, billing, and compact density.');
    } else if (preset === 'ADMIN') {
      kpi = true;
      rev = true;
      opd = true;
      appts = true;
      alerts = true;
      actions = true;
      recent = true;
      inv = true;
      privacy = false;
      density = 'COMFORTABLE';
      showToast('info', 'Admin Preset Loaded', 'Full visibility across all clinical & financial metrics.');
    }

    setDashRolePreset(preset);
    setDashShowKpiStats(kpi);
    setDashShowRevenue(rev);
    setDashShowOpdQueue(opd);
    setDashShowAppointments(appts);
    setDashShowClinicalAlerts(alerts);
    setDashShowQuickActions(actions);
    setDashShowRecentPatients(recent);
    setDashShowInventoryAlerts(inv);
    setDashPrivacyMode(privacy);
    setDashDensity(density);

    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'nisschay_dashboard_layout',
        JSON.stringify({
          dashShowKpiStats: kpi,
          dashShowRevenue: rev,
          dashShowOpdQueue: opd,
          dashShowAppointments: appts,
          dashShowClinicalAlerts: alerts,
          dashShowQuickActions: actions,
          dashShowRecentPatients: recent,
          dashShowInventoryAlerts: inv,
          dashPrivacyMode: privacy,
          dashDensity: density,
          dashAutoRefreshInterval,
          dashDefaultDateRange,
          dashRolePreset: preset,
        })
      );
    }
  };

  const resetDashboardCardsToDefault = () => {
    setDashboardCardOrder(DEFAULT_CARD_ORDER);
    setDashboardVisibleCards(DEFAULT_CARD_ORDER);
    setDashboardFavoriteCards(DEFAULT_FAVORITE_CARDS);
    localStorage.removeItem('clinic_dashboard_cards_order');
    localStorage.removeItem('clinic_dashboard_visible_cards');
    localStorage.removeItem('clinic_dashboard_favorite_cards');
    setDashboardSuccessMsg('Dashboard cards restored to default clinical layout!');
    showToast('success', 'Layout Restored', 'Dashboard metrics cards restored to default.');
    setTimeout(() => setDashboardSuccessMsg(null), 3000);
  };

  const triggerDashboardSaveNotification = () => {
    setDashboardSuccessMsg('Dashboard arrangement updated! Your changes are live.');
    showToast('success', 'Layout Updated', 'Dashboard arrangement saved.');
    setTimeout(() => setDashboardSuccessMsg(null), 3000);
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-screen">
        <div className="w-10 h-10 border-4 border-[#087F8C] border-t-transparent rounded-full animate-spin" />
        <p className="mt-3 text-sm text-[#567781] font-bold">Verifying authorization session...</p>
      </div>
    );
  }

  const holidaysList = holidayDates ? holidayDates.split(',').map((d) => d.trim()).filter(Boolean) : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans relative">
      {/* FLOATING REAL-TIME SUCCESS / ERROR TOAST POP-UP */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-[9999] max-w-md w-[calc(100vw-2rem)] sm:w-96 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto">
          <div
            className={`p-4 rounded-2xl border shadow-2xl backdrop-blur-md flex items-start gap-3.5 ${
              toast.type === 'success'
                ? 'bg-[#172B34]/95 text-white border-[#22A06B]/50 ring-1 ring-[#22A06B]/30 shadow-[#22A06B]/10'
                : toast.type === 'error'
                ? 'bg-[#D64545]/95 text-white border-[#D64545] ring-1 ring-white/20 shadow-[#D64545]/10'
                : 'bg-[#172B34]/95 text-white border-[#087F8C]/50 ring-1 ring-[#087F8C]/30 shadow-[#087F8C]/10'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                toast.type === 'success'
                  ? 'bg-[#22A06B] text-white shadow-xs'
                  : toast.type === 'error'
                  ? 'bg-white text-[#D64545]'
                  : 'bg-[#087F8C] text-white'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : toast.type === 'error' ? (
                <AlertCircle className="w-5 h-5" />
              ) : (
                <Info className="w-5 h-5" />
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-0.5 pt-0.5">
              <h4 className="text-xs font-extrabold tracking-tight text-white">{toast.title}</h4>
              {toast.message && (
                <p className="text-[11px] font-medium text-white/85 leading-relaxed break-words">{toast.message}</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              title="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 1. TOP HEADER BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-[#E8EEF2] shadow-2xs p-5 sm:p-6 transition-all space-y-4">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-[#087F8C]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-10 w-48 h-48 bg-[#4FA8DB]/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#087F8C]/10 text-[#087F8C] border border-[#087F8C]/20 flex items-center justify-center font-bold shrink-0 shadow-2xs">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#172B34] tracking-tight">
                Settings
              </h1>
              <p className="text-xs text-[#567781] font-medium mt-0.5">
                Manage clinic profile, multi-session schedules, prescription protocols, service prices, and security.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="px-3.5 py-1.5 rounded-xl bg-[#F6F9FB] border border-[#E8EEF2] text-xs font-bold text-[#567781] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#087F8C]" />
              <span>Role: <strong className="text-[#172B34] uppercase">{user.role}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. TAB NAVIGATION BAR */}
      <div className="bg-white border border-[#E8EEF2] p-1.5 rounded-2xl shadow-2xs flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-nowrap shrink-0 touch-pan-x">
        <button
          type="button"
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'account'
              ? 'bg-[#087F8C] text-white shadow-xs'
              : 'text-[#567781] hover:text-[#172B34] hover:bg-[#F6F9FB]'
          }`}
          onClick={() => handleTabChange('account')}
        >
          <User className="w-3.5 h-3.5" />
          <span>Account</span>
        </button>

        {['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN'].includes(user.role?.toUpperCase()) && (
          <button
            type="button"
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'clinic'
                ? 'bg-[#087F8C] text-white shadow-xs'
                : 'text-[#567781] hover:text-[#172B34] hover:bg-[#F6F9FB]'
            }`}
            onClick={() => handleTabChange('clinic')}
          >
            <Hospital className="w-3.5 h-3.5" />
            <span>Clinic & Schedule</span>
          </button>
        )}

        {['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR'].includes(user.role?.toUpperCase()) && (
          <button
            type="button"
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'professional'
                ? 'bg-[#087F8C] text-white shadow-xs'
                : 'text-[#567781] hover:text-[#172B34] hover:bg-[#F6F9FB]'
            }`}
            onClick={() => handleTabChange('professional')}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Practice Details</span>
          </button>
        )}

        {['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR'].includes(user.role?.toUpperCase()) && (
          <button
            type="button"
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'prescription'
                ? 'bg-[#087F8C] text-white shadow-xs'
                : 'text-[#567781] hover:text-[#172B34] hover:bg-[#F6F9FB]'
            }`}
            onClick={() => handleTabChange('prescription')}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Prescription & Protocols</span>
          </button>
        )}

        {['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN'].includes(user.role?.toUpperCase()) && (
          <button
            type="button"
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'billing'
                ? 'bg-[#087F8C] text-white shadow-xs'
                : 'text-[#567781] hover:text-[#172B34] hover:bg-[#F6F9FB]'
            }`}
            onClick={() => handleTabChange('billing')}
          >
            <IndianRupee className="w-3.5 h-3.5" />
            <span>Billing & Price List</span>
          </button>
        )}

        {['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN'].includes(user.role?.toUpperCase()) && (
          <button
            type="button"
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'security'
                ? 'bg-[#087F8C] text-white shadow-xs'
                : 'text-[#567781] hover:text-[#172B34] hover:bg-[#F6F9FB]'
            }`}
            onClick={() => handleTabChange('security')}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Staff & Security</span>
          </button>
        )}

        <button
          type="button"
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'dashboard'
              ? 'bg-[#087F8C] text-white shadow-xs'
              : 'text-[#567781] hover:text-[#172B34] hover:bg-[#F6F9FB]'
          }`}
          onClick={() => handleTabChange('dashboard')}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Dashboard Layout</span>
        </button>
      </div>

      {loadingData ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3 bg-white border border-[#E8EEF2] rounded-2xl shadow-2xs">
          <div className="w-8 h-8 border-3 border-[#087F8C]/20 border-t-[#087F8C] rounded-full animate-spin" />
          <p className="text-xs text-[#567781] font-bold">Syncing clinic settings...</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* TAB 1: Account & Security Settings */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              {/* 1. VISUAL PROFILE IDENTITY CARD */}
              <div className="border border-[#E8EEF2] bg-white rounded-2xl p-5 sm:p-6 shadow-2xs relative overflow-hidden">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                  <div className="flex items-center gap-4">
                    {/* Avatar with live photo replace */}
                    <div className="relative group">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#087F8C]/10 text-[#087F8C] border-2 border-[#087F8C]/20 flex items-center justify-center font-extrabold text-xl sm:text-2xl overflow-hidden shadow-2xs shrink-0">
                        {profilePictureUrl ? (
                          <img src={profilePictureUrl} alt={name || user.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{(name || user.name || 'U').substring(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg sm:text-xl font-extrabold text-[#172B34]">{name || user.name}</h2>
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#087F8C]/10 text-[#087F8C] border border-[#087F8C]/20 uppercase">
                          {user.role}
                        </span>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#22A06B]/10 text-[#22A06B] text-[10px] font-bold border border-[#22A06B]/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#22A06B] animate-pulse" />
                          <span>Active Session</span>
                        </div>
                      </div>
                      <p className="text-xs text-[#567781] font-medium flex items-center gap-1.5">
                        <span>{user.email}</span>
                        <span>•</span>
                        <span>Clinic ID: <strong className="font-mono text-[#172B34]">{user.clinicId?.substring(0, 8).toUpperCase()}</strong></span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <ImageUploadButton onUploadComplete={handleAvatarUploadComplete} />
                  </div>
                </div>
              </div>

              {/* 2. GRID: PERSONAL INFORMATION & DEDICATED PASSWORD MANAGEMENT */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* CARD 1: Personal Profile & Contact */}
                <div className="border border-[#E8EEF2] bg-white rounded-2xl overflow-hidden shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="bg-[#F6F9FB] border-b border-[#E8EEF2] p-5">
                      <h3 className="text-sm font-extrabold text-[#172B34] flex items-center gap-2">
                        <User className="w-4 h-4 text-[#087F8C]" />
                        <span>Personal Information</span>
                      </h3>
                      <p className="text-xs font-medium text-[#567781] mt-0.5">
                        Your personal contact details and identity credentials.
                      </p>
                    </div>

                    <div className="p-5 space-y-4">
                      {accountSuccess && (
                        <div className="bg-[#22A06B]/10 border border-[#22A06B]/20 text-[#22A06B] p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-[#22A06B] shrink-0" />
                          <span>Personal details saved successfully!</span>
                        </div>
                      )}

                      {accountError && (
                        <div className="bg-[#D64545]/10 border border-[#D64545]/20 text-[#D64545] p-3 rounded-xl text-xs font-semibold flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                          <span>{accountError}</span>
                        </div>
                      )}

                      <form id="accountForm" onSubmit={handleSaveAccount} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-[#172B34]">Full Legal Name *</label>
                          <input
                            type="text"
                            required
                            className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={savingAccount}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-[#172B34]">Email Address (Login ID)</label>
                            <span className="text-[10px] font-bold text-[#22A06B] flex items-center gap-1 bg-[#22A06B]/10 px-1.5 py-0.5 rounded">
                              <ShieldCheck className="w-3 h-3" /> Verified
                            </span>
                          </div>
                          <input
                            type="email"
                            disabled
                            className="w-full h-9.5 px-3 bg-[#F6F9FB]/60 border border-[#E8EEF2] text-[#567781] rounded-xl text-xs cursor-not-allowed font-medium"
                            value={user.email}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-[#172B34]">Contact Mobile Phone</label>
                          <div className="flex">
                            <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-[#E8EEF2] bg-[#E8EEF2]/50 text-xs font-bold text-[#567781]">
                              +91
                            </span>
                            <input
                              type="text"
                              placeholder="9876543210"
                              className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] rounded-r-xl text-xs font-medium text-[#172B34] focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              disabled={savingAccount}
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-[#172B34]">Avatar Image URL</label>
                          <input
                            type="text"
                            placeholder="https://example.com/photo.jpg"
                            className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                            value={profilePictureUrl}
                            onChange={(e) => setProfilePictureUrl(e.target.value)}
                            disabled={savingAccount}
                          />
                        </div>
                      </form>
                    </div>
                  </div>

                  <div className="p-5 bg-[#F6F9FB]/50 border-t border-[#E8EEF2] flex justify-end">
                    <Button
                      type="submit"
                      form="accountForm"
                      className="bg-[#087F8C] hover:bg-[#076b77] text-white rounded-xl font-bold text-xs h-9 px-5 shadow-xs border-0 cursor-pointer"
                      disabled={savingAccount}
                    >
                      {savingAccount ? 'Saving Details...' : 'Save Profile Details'}
                    </Button>
                  </div>
                </div>

                {/* CARD 2: Dedicated Password & Security Management */}
                <div className="border border-[#E8EEF2] bg-white rounded-2xl overflow-hidden shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="bg-[#F6F9FB] border-b border-[#E8EEF2] p-5">
                      <h3 className="text-sm font-extrabold text-[#172B34] flex items-center gap-2">
                        <Key className="w-4 h-4 text-[#087F8C]" />
                        <span>Security & Password Management</span>
                      </h3>
                      <p className="text-xs font-medium text-[#567781] mt-0.5">
                        Update your login password and manage credential safety.
                      </p>
                    </div>

                    <div className="p-5 space-y-4">
                      {passwordSuccess && (
                        <div className="bg-[#22A06B]/10 border border-[#22A06B]/20 text-[#22A06B] p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-[#22A06B] shrink-0" />
                          <span>Login password updated successfully!</span>
                        </div>
                      )}

                      {passwordError && (
                        <div className="bg-[#D64545]/10 border border-[#D64545]/20 text-[#D64545] p-3 rounded-xl text-xs font-semibold flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                          <span>{passwordError}</span>
                        </div>
                      )}

                      <form id="passwordForm" onSubmit={handleUpdatePassword} className="space-y-4">
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <label className="block text-xs font-bold text-[#172B34]">New Password *</label>
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="text-[11px] font-bold text-[#087F8C] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              <span>{showPassword ? 'Hide' : 'Show'}</span>
                            </button>
                          </div>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            placeholder="Enter minimum 6 characters"
                            className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            disabled={savingPassword}
                          />
                        </div>

                        {/* Live Password Strength Meter */}
                        {newPassword && (
                          <div className="space-y-1.5 pt-1">
                            {(() => {
                              let score = 1;
                              let label = 'Weak';
                              let color = 'bg-[#D64545]';
                              if (newPassword.length >= 8 && /[0-9]/.test(newPassword)) {
                                score = 2;
                                label = 'Moderate';
                                color = 'bg-[#E9A23B]';
                              }
                              if (newPassword.length >= 10 && (/[A-Z]/.test(newPassword) || /[^A-Za-z0-9]/.test(newPassword))) {
                                score = 3;
                                label = 'Strong';
                                color = 'bg-[#22A06B]';
                              }

                              return (
                                <div className="space-y-1">
                                  <div className="flex justify-between text-[11px] font-bold">
                                    <span className="text-[#567781]">Password Strength:</span>
                                    <span className={score === 3 ? 'text-[#22A06B]' : score === 2 ? 'text-[#E9A23B]' : 'text-[#D64545]'}>
                                      {label}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-1.5">
                                    <div className={`h-1.5 rounded-full ${score >= 1 ? color : 'bg-[#E8EEF2]'}`} />
                                    <div className={`h-1.5 rounded-full ${score >= 2 ? color : 'bg-[#E8EEF2]'}`} />
                                    <div className={`h-1.5 rounded-full ${score >= 3 ? color : 'bg-[#E8EEF2]'}`} />
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-[#172B34]">Confirm New Password *</label>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            placeholder="Re-enter new password"
                            className={`w-full h-9.5 px-3 bg-[#F6F9FB] border text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C] ${
                              confirmPassword && newPassword !== confirmPassword ? 'border-[#D64545]' : 'border-[#E8EEF2]'
                            }`}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={savingPassword}
                          />
                          {confirmPassword && newPassword !== confirmPassword && (
                            <p className="text-[11px] text-[#D64545] font-semibold">Passwords do not match.</p>
                          )}
                        </div>
                      </form>
                    </div>
                  </div>

                  <div className="p-5 bg-[#F6F9FB]/50 border-t border-[#E8EEF2] flex justify-end">
                    <Button
                      type="submit"
                      form="passwordForm"
                      className="bg-[#172B34] hover:bg-[#26414e] text-white rounded-xl font-bold text-xs h-9 px-5 shadow-xs border-0 cursor-pointer"
                      disabled={savingPassword}
                    >
                      {savingPassword ? 'Updating...' : 'Update Password'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* 3. GRID: ACTIVE DEVICES & PERSONAL NOTIFICATION PREFERENCES */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* CARD 3: Active Logged-in Devices */}
                <div className="border border-[#E8EEF2] bg-white rounded-2xl overflow-hidden shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="bg-[#F6F9FB] border-b border-[#E8EEF2] p-5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-extrabold text-[#172B34] flex items-center gap-2">
                          <Laptop className="w-4 h-4 text-[#087F8C]" />
                          <span>Active Devices & Session Security</span>
                        </h3>
                        <span className="text-[10px] font-bold bg-[#087F8C]/10 text-[#087F8C] px-2 py-0.5 rounded-md border border-[#087F8C]/20">
                          {sessions.length > 0 ? `${sessions.length} Active` : 'Live'}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-[#567781] mt-0.5">
                        Manage devices currently authorized to access your clinic account.
                      </p>
                    </div>

                    <div className="p-5 space-y-3">
                      {signedOutOtherSessions && (
                        <div className="bg-[#22A06B]/10 border border-[#22A06B]/20 text-[#22A06B] p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-[#22A06B] shrink-0" />
                          <span>All other device sessions have been revoked.</span>
                        </div>
                      )}

                      {loadingSessions ? (
                        <div className="py-8 flex flex-col items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-[#087F8C] border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs text-[#567781] font-semibold">Scanning authorized devices...</span>
                        </div>
                      ) : sessions.length === 0 ? (
                        <div className="p-3.5 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-white border border-[#E8EEF2] flex items-center justify-center text-[#087F8C] shadow-2xs">
                              <Laptop className="w-4.5 h-4.5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-extrabold text-[#172B34]">Current Device (Active)</span>
                                <span className="text-[10px] font-bold bg-[#22A06B]/10 text-[#22A06B] px-1.5 py-0.2 rounded border border-[#22A06B]/20">
                                  This Device
                                </span>
                              </div>
                              <span className="text-[11px] text-[#567781]">Active Session • Port 3000</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        sessions.map((sess, idx) => {
                          const isCurrent = idx === 0;
                          const isMobile = sess.deviceInfo?.toLowerCase().includes('ipad') || sess.deviceInfo?.toLowerCase().includes('iphone') || sess.deviceInfo?.toLowerCase().includes('android');

                          return (
                            <div
                              key={sess.id}
                              className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                                isCurrent ? 'bg-[#F6F9FB] border-[#E8EEF2]' : 'bg-white border-[#E8EEF2]'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${
                                  isCurrent ? 'bg-white border-[#E8EEF2] text-[#087F8C]' : 'bg-[#F6F9FB] border-[#E8EEF2] text-[#567781]'
                                }`}>
                                  {isMobile ? <Smartphone className="w-4.5 h-4.5" /> : <Laptop className="w-4.5 h-4.5" />}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-extrabold text-[#172B34] truncate">{sess.deviceInfo || 'Authorized Device'}</span>
                                    {isCurrent ? (
                                      <span className="text-[10px] font-bold bg-[#22A06B]/10 text-[#22A06B] px-1.5 py-0.2 rounded border border-[#22A06B]/20">
                                        This Device
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-semibold text-[#567781] bg-[#F6F9FB] px-1.5 py-0.2 rounded border border-[#E8EEF2]">
                                        Secondary Device
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-[#567781] block truncate mt-0.5">
                                    IP: {sess.ipAddress || '—'} • {isCurrent ? 'Active Now' : `Last active ${sess.lastActiveAt ? new Date(sess.lastActiveAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}`}
                                  </span>
                                </div>
                              </div>

                              {!isCurrent && (
                                <button
                                  type="button"
                                  onClick={() => handleRevokeSingleSession(sess.id)}
                                  disabled={revokingSessionId === sess.id}
                                  className="text-xs font-bold text-[#D64545] hover:bg-[#D64545]/10 px-2.5 py-1 rounded-lg border border-[#D64545]/20 transition-all cursor-pointer shrink-0"
                                  title="Log out this device"
                                >
                                  {revokingSessionId === sess.id ? 'Revoking...' : 'Sign Out'}
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="p-5 bg-[#F6F9FB]/50 border-t border-[#E8EEF2] flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={revokingOthers || sessions.length <= 1}
                      onClick={handleSignOutOtherDevices}
                      className="text-xs font-bold rounded-xl border-[#E8EEF2] bg-white text-[#D64545] hover:bg-[#D64545]/10 hover:text-[#D64545] cursor-pointer disabled:opacity-50"
                    >
                      {revokingOthers ? 'Revoking...' : 'Sign Out All Other Devices'}
                    </Button>
                  </div>
                </div>

                {/* CARD 4: Personal Notification & Report Alerts */}
                <div className="border border-[#E8EEF2] bg-white rounded-2xl overflow-hidden shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="bg-[#F6F9FB] border-b border-[#E8EEF2] p-5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-extrabold text-[#172B34] flex items-center gap-2">
                          <Bell className="w-4 h-4 text-[#087F8C]" />
                          <span>Personal Notification & Report Alerts</span>
                        </h3>
                        <span className="text-[10px] font-bold bg-[#22A06B]/10 text-[#22A06B] px-2 py-0.5 rounded-md border border-[#22A06B]/20">
                          Cloud Synced
                        </span>
                      </div>
                      <p className="text-xs font-medium text-[#567781] mt-0.5">
                        Customize daily clinical digests and urgent appointment alert deliveries.
                      </p>
                    </div>

                    <div className="p-5 space-y-3.5">
                      {prefSuccess && (
                        <div className="bg-[#22A06B]/10 border border-[#22A06B]/20 text-[#22A06B] p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-[#22A06B] shrink-0" />
                          <span>Notification preferences saved to cloud database!</span>
                        </div>
                      )}

                      <form id="prefForm" onSubmit={handleSaveNotificationPreferences} className="space-y-3">
                        <label className="p-3 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] flex items-start gap-3 cursor-pointer hover:border-[#087F8C]/30 transition-colors">
                          <input
                            type="checkbox"
                            className="mt-0.5 rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4 cursor-pointer"
                            checked={notifyDailyReport}
                            onChange={(e) => setNotifyDailyReport(e.target.checked)}
                          />
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-[#172B34] block">Daily Clinic Revenue & OPD Digest (09:00 PM)</span>
                            <p className="text-[11px] text-[#567781]">
                              Receive an automated email summarizing total visits, collections, and doctor consultations every evening.
                            </p>
                          </div>
                        </label>

                        <label className="p-3 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] flex items-start gap-3 cursor-pointer hover:border-[#087F8C]/30 transition-colors">
                          <input
                            type="checkbox"
                            className="mt-0.5 rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4 cursor-pointer"
                            checked={notifyEmergencyVisit}
                            onChange={(e) => setNotifyEmergencyVisit(e.target.checked)}
                          />
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-[#172B34] block">Emergency Priority Patient Alerts</span>
                            <p className="text-[11px] text-[#567781]">
                              Show high-priority instant notifications whenever an emergency walk-in token is booked.
                            </p>
                          </div>
                        </label>

                        <label className="p-3 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] flex items-start gap-3 cursor-pointer hover:border-[#087F8C]/30 transition-colors">
                          <input
                            type="checkbox"
                            className="mt-0.5 rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4 cursor-pointer"
                            checked={notifyRxAudit}
                            onChange={(e) => setNotifyRxAudit(e.target.checked)}
                          />
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-[#172B34] block">Prescription Verification QR Scan Alerts</span>
                            <p className="text-[11px] text-[#567781]">
                              Log and alert when pharmacies or lab partners scan digital prescription verification links.
                            </p>
                          </div>
                        </label>
                      </form>
                    </div>
                  </div>

                  <div className="p-5 bg-[#F6F9FB]/50 border-t border-[#E8EEF2] flex justify-end">
                    <Button
                      type="submit"
                      form="prefForm"
                      disabled={savingPref}
                      className="bg-[#087F8C] hover:bg-[#076b77] text-white rounded-xl font-bold text-xs h-9 px-5 shadow-xs border-0 cursor-pointer"
                    >
                      {savingPref ? 'Saving...' : 'Save Alert Preferences'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Clinic & Operating Schedule (ADMIN ONLY) */}
          {activeTab === 'clinic' && ['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN'].includes(user.role?.toUpperCase()) && (
            <div className="space-y-6">
              {/* Top Banner / Header Card */}
              <div className="border border-[#E8EEF2] bg-white rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#087F8C]/10 border border-[#087F8C]/20 flex items-center justify-center text-[#087F8C] shrink-0 shadow-2xs">
                    <Hospital className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-extrabold text-[#172B34]">
                        {clinicName || 'Clinic Practice Profile & Operations'}
                      </h2>
                      <span className="text-[10px] font-bold bg-[#087F8C]/10 text-[#087F8C] px-2 py-0.5 rounded-md border border-[#087F8C]/20">
                        Practice Hub
                      </span>
                    </div>
                    <p className="text-xs font-medium text-[#567781] mt-0.5">
                      Configure official clinic identity, chamber hours, weekly off schedule, and holiday calendar.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <Button
                    type="submit"
                    form="clinicForm"
                    disabled={savingClinic}
                    className="bg-[#087F8C] hover:bg-[#076b77] text-white rounded-xl font-bold text-xs h-9.5 px-5 shadow-xs border-0 cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>{savingClinic ? 'Saving Changes...' : 'Save Clinic Settings'}</span>
                  </Button>
                </div>
              </div>

              {clinicSuccess && (
                <div className="bg-[#22A06B]/10 border border-[#22A06B]/20 text-[#22A06B] p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-2xs animate-fadeIn">
                  <CheckCircle2 className="w-4.5 h-4.5 text-[#22A06B] shrink-0" />
                  <span>Clinic profile, chamber timings, and holiday schedule have been successfully updated!</span>
                </div>
              )}

              {clinicError && (
                <div className="bg-[#D64545]/10 border border-[#D64545]/20 text-[#D64545] p-4 rounded-2xl text-xs font-semibold flex items-start gap-2 shadow-2xs animate-fadeIn">
                  <AlertCircle className="w-4.5 h-4.5 text-[#D64545] shrink-0 mt-0.5" />
                  <div>{clinicError}</div>
                </div>
              )}

              <form id="clinicForm" onSubmit={handleSaveClinic} className="space-y-6">
                {/* 1. TOP ROW: IDENTITY & LOCATION */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  
                  {/* CARD 1: Official Identity & Branding */}
                  <div className="border border-[#E8EEF2] bg-white rounded-2xl overflow-hidden shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="bg-[#F6F9FB] border-b border-[#E8EEF2] p-5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-extrabold text-[#172B34] flex items-center gap-2">
                            <Award className="w-4 h-4 text-[#087F8C]" />
                            <span>1. Clinic Identity & Official Registration</span>
                          </h3>
                          <span className="text-[10px] font-bold bg-[#F6F9FB] text-[#567781] px-2 py-0.5 rounded-md border border-[#E8EEF2]">
                            Letterhead & Invoices
                          </span>
                        </div>
                        <p className="text-xs font-medium text-[#567781] mt-0.5">
                          Official establishment name, registration licenses, and branding assets.
                        </p>
                      </div>

                      <div className="p-5 space-y-4">
                        {/* Logo Uploader & Preview */}
                        <div className="p-4 bg-[#F6F9FB] rounded-2xl border border-[#E8EEF2] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 overflow-hidden">
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            <div className="w-14 h-14 rounded-2xl bg-white border border-[#E8EEF2] flex items-center justify-center text-[#087F8C] shadow-2xs overflow-hidden shrink-0">
                              {logoUrl ? (
                                <img src={logoUrl} alt="Clinic Logo" className="w-full h-full object-contain p-1" />
                              ) : (
                                <Hospital className="w-7 h-7 text-[#567781]" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-extrabold text-[#172B34] block">Clinic Logo & Official Seal</span>
                              <span className="text-[11px] text-[#567781] block truncate sm:whitespace-normal">Printed on patient prescriptions and billing receipts</span>
                            </div>
                          </div>
                          <div className="shrink-0 flex self-start sm:self-auto">
                            <ImageUploadButton label="Upload Logo" onUploadComplete={handleClinicLogoUploadComplete} disabled={savingClinic} />
                          </div>
                        </div>

                        {/* Clinic Name & Tagline */}
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-[#172B34]">
                              Clinic Practice Name <span className="text-[#D64545]">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                              placeholder="e.g. Nisschay Healthcare Multispeciality Clinic"
                              value={clinicName}
                              onChange={(e) => setClinicName(e.target.value)}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-[#172B34]">
                              Specialty Tagline / Sub-Header
                            </label>
                            <input
                              type="text"
                              className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                              placeholder="e.g. Advanced Multispeciality OPD & Preventive Care Center"
                              value={tagline}
                              onChange={(e) => setTagline(e.target.value)}
                            />
                          </div>
                        </div>

                        {/* License Number & GSTIN */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-[#172B34]">
                              Clinical Establishment Reg. No.
                            </label>
                            <input
                              type="text"
                              className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                              placeholder="e.g. MH/2024/CL-98471"
                              value={registrationNumber}
                              onChange={(e) => setRegistrationNumber(e.target.value)}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-[#172B34]">
                              GST Number (GSTIN)
                            </label>
                            <input
                              type="text"
                              className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                              placeholder="e.g. 27AAAAA0000A1Z5"
                              value={gstNumber}
                              onChange={(e) => setGstNumber(e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Phones & Helpline */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-[#172B34]">
                              Reception Phone <span className="text-[#D64545]">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                              placeholder="e.g. +91 98765 43210"
                              value={clinicPhone}
                              onChange={(e) => setClinicPhone(e.target.value)}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-[#172B34] flex items-center gap-1">
                              <PhoneCall className="w-3.5 h-3.5 text-[#087F8C]" /> Emergency Helpline
                            </label>
                            <input
                              type="text"
                              className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                              placeholder="e.g. +91 98765 00000"
                              value={emergencyPhone}
                              onChange={(e) => setEmergencyPhone(e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Email & Website */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-[#172B34]">
                              Clinic Email <span className="text-[#D64545]">*</span>
                            </label>
                            <input
                              type="email"
                              required
                              className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                              placeholder="clinic@example.com"
                              value={clinicEmail}
                              onChange={(e) => setClinicEmail(e.target.value)}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-[#172B34] flex items-center gap-1">
                              <Globe className="w-3.5 h-3.5 text-[#567781]" /> Website URL
                            </label>
                            <input
                              type="text"
                              className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                              placeholder="https://www.nisschayclinic.com"
                              value={website}
                              onChange={(e) => setWebsite(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CARD 2: Physical Address & Navigation Directions */}
                  <div className="border border-[#E8EEF2] bg-white rounded-2xl overflow-hidden shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="bg-[#F6F9FB] border-b border-[#E8EEF2] p-5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-extrabold text-[#172B34] flex items-center gap-2">
                            <Navigation className="w-4 h-4 text-[#087F8C]" />
                            <span>2. Physical Address & Navigation Directions</span>
                          </h3>
                          <span className="text-[10px] font-bold bg-[#F6F9FB] text-[#567781] px-2 py-0.5 rounded-md border border-[#E8EEF2]">
                            Patient GPS Pin
                          </span>
                        </div>
                        <p className="text-xs font-medium text-[#567781] mt-0.5">
                          Location information displayed on appointment SMS reminders and prescription slips.
                        </p>
                      </div>

                      <div className="p-5 space-y-4">
                        {/* Physical Address */}
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-[#172B34]">
                            Full Physical Street Address <span className="text-[#D64545]">*</span>
                          </label>
                          <textarea
                            rows={3}
                            required
                            className="w-full p-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                            placeholder="e.g. Suite 204, 2nd Floor, Lotus Medical Complex, Mahatma Gandhi Road"
                            value={clinicAddress}
                            onChange={(e) => setClinicAddress(e.target.value)}
                          />
                        </div>

                        {/* Landmark */}
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-[#172B34] flex items-center gap-1">
                            <Compass className="w-3.5 h-3.5 text-[#087F8C]" /> Prominent Landmark / Directions
                          </label>
                          <input
                            type="text"
                            className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                            placeholder="e.g. Opposite City Civil Hospital, Near Metro Pillar 42"
                            value={landmark}
                            onChange={(e) => setLandmark(e.target.value)}
                          />
                        </div>

                        {/* City, State, Pincode */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-[#172B34]">City</label>
                            <input
                              type="text"
                              className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                              placeholder="e.g. Pune"
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-[#172B34]">State</label>
                            <input
                              type="text"
                              className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                              placeholder="e.g. Maharashtra"
                              value={state}
                              onChange={(e) => setState(e.target.value)}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-[#172B34]">PIN Code</label>
                            <input
                              type="text"
                              className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                              placeholder="e.g. 411001"
                              value={pincode}
                              onChange={(e) => setPincode(e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Google Maps Link with Test Button */}
                        <div className="space-y-1.5 pt-1">
                          <label className="block text-xs font-bold text-[#172B34] flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-[#087F8C]" /> Google Maps Pin URL
                            </span>
                            {googleMapsLink && (
                              <a
                                href={googleMapsLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-bold text-[#087F8C] hover:underline flex items-center gap-1"
                              >
                                Test Directions <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                              placeholder="https://maps.app.goo.gl/..."
                              value={googleMapsLink}
                              onChange={(e) => setGoogleMapsLink(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 1.5 FULL ROW: MULTI-SPECIALTY HOSPITAL INFRASTRUCTURE & DEPARTMENTS MASTER (PHASE 2) */}
                <div className="border border-[#E8EEF2] bg-white rounded-2xl overflow-hidden shadow-2xs">
                  <div className="bg-[#F6F9FB] border-b border-[#E8EEF2] p-5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#087F8C]/10 border border-[#087F8C]/20 flex items-center justify-center text-[#087F8C] shrink-0 shadow-2xs">
                          <Hospital className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-extrabold text-[#172B34] flex items-center gap-2">
                            <span>Hospital Infrastructure & Clinical Departments Master</span>
                            <span className="text-[10px] font-extrabold bg-[#087F8C] text-white px-2.5 py-0.5 rounded-full shadow-2xs">
                              Multi-Specialty
                            </span>
                          </h3>
                          <p className="text-xs font-medium text-[#567781] mt-0.5">
                            Manage facility scale, inpatient bed capacity, NABH/Rohini insurance credentials, and active clinical specialties.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#172B34]">Facility Mode:</span>
                        <select
                          value={facilityType}
                          onChange={(e) => setFacilityType(e.target.value)}
                          className="h-8.5 px-3 bg-white border border-[#E8EEF2] text-[#087F8C] font-extrabold text-xs rounded-xl focus:ring-2 focus:ring-[#087F8C] cursor-pointer"
                        >
                          <option value="HOSPITAL">Multi-Specialty Hospital</option>
                          <option value="POLYCLINIC">Polyclinic & Day Care</option>
                          <option value="CLINIC">Single Doctor Clinic</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 space-y-5">
                    {/* Infrastructure Capacity & Hotlines */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                      <div className="p-3.5 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] space-y-1">
                        <span className="text-[11px] font-bold text-[#567781] block">Total Inpatient Beds</span>
                        <input
                          type="number"
                          value={totalBeds}
                          onChange={(e) => setTotalBeds(e.target.value)}
                          className="w-full h-8.5 px-3 bg-white border border-[#E8EEF2] text-[#172B34] rounded-lg text-xs font-extrabold focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                          placeholder="50"
                        />
                      </div>

                      <div className="p-3.5 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] space-y-1">
                        <span className="text-[11px] font-bold text-[#567781] block">ICU / CCU Critical Beds</span>
                        <input
                          type="number"
                          value={totalIcuBeds}
                          onChange={(e) => setTotalIcuBeds(e.target.value)}
                          className="w-full h-8.5 px-3 bg-white border border-[#E8EEF2] text-[#172B34] rounded-lg text-xs font-extrabold focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                          placeholder="10"
                        />
                      </div>

                      <div className="p-3.5 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] space-y-1">
                        <span className="text-[11px] font-bold text-[#567781] block">Operation Theatres (OT)</span>
                        <input
                          type="number"
                          value={totalOtRooms}
                          onChange={(e) => setTotalOtRooms(e.target.value)}
                          className="w-full h-8.5 px-3 bg-white border border-[#E8EEF2] text-[#172B34] rounded-lg text-xs font-extrabold focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                          placeholder="2"
                        />
                      </div>

                      <div className="p-3.5 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] space-y-1">
                        <span className="text-[11px] font-bold text-[#567781] block">Ambulance 24x7 Hotline</span>
                        <input
                          type="text"
                          value={ambulanceContactPhone}
                          onChange={(e) => setAmbulanceContactPhone(e.target.value)}
                          className="w-full h-8.5 px-3 bg-white border border-[#E8EEF2] text-[#172B34] rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                          placeholder="e.g. 108 or +91 98765 00108"
                        />
                      </div>
                    </div>

                    {/* Accreditations & Insurance Regulatory IDs */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#172B34]">
                          NABH Accreditation / Entry-Level No.
                        </label>
                        <input
                          type="text"
                          value={nabhAccreditationNumber}
                          onChange={(e) => setNabhAccreditationNumber(e.target.value)}
                          className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                          placeholder="e.g. NABH/HOSP-2024/0981"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#172B34]">
                          ROHINI Hospital ID (Insurance Cashless)
                        </label>
                        <input
                          type="text"
                          value={rohiniHospitalId}
                          onChange={(e) => setRohiniHospitalId(e.target.value)}
                          className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                          placeholder="e.g. 8900012345678"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#172B34]">
                          State Clinical Establishment No.
                        </label>
                        <input
                          type="text"
                          value={clinicalEstRegistrationNumber}
                          onChange={(e) => setClinicalEstRegistrationNumber(e.target.value)}
                          className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                          placeholder="e.g. CEA/MH/PUN/2023/452"
                        />
                      </div>
                    </div>

                    {/* Active Hospital Clinical Specialties & Departments */}
                    <div className="p-4 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-extrabold text-[#172B34] flex items-center gap-1.5">
                          <Stethoscope className="w-4 h-4 text-[#087F8C]" />
                          <span>Active Clinical Departments & Specialties ({enabledDepartments.length} Active)</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEnabledDepartments([
                              'General Medicine', 'General Surgery', 'Obstetrics & Gynecology',
                              'Pediatrics', 'Orthopedics', 'Cardiology', 'Dental', 'Ophthalmology',
                              'Dermatology', 'ENT', 'Neurology', 'Gastroenterology',
                              'Nephrology & Urology', 'Pulmonology', 'Oncology', 'Emergency Care',
                              'Psychiatry', 'Pathology', 'Radiology', 'Physiotherapy',
                              'Anesthesiology', 'Endocrinology', 'Rheumatology', 'Preventive Health'
                            ])}
                            className="text-[11px] font-bold text-[#087F8C] hover:underline cursor-pointer"
                          >
                            Select All (24)
                          </button>
                          <span className="text-[#E8EEF2]">|</span>
                          <button
                            type="button"
                            onClick={() => setEnabledDepartments([])}
                            className="text-[11px] font-bold text-[#567781] hover:underline cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 pt-1">
                        {[
                          { id: 'General Medicine', label: 'General & Internal Medicine', icon: Stethoscope },
                          { id: 'General Surgery', label: 'General & Laparoscopic Surgery', icon: Scissors },
                          { id: 'Obstetrics & Gynecology', label: 'Obstetrics & Gynecology (ANC)', icon: HeartPulse },
                          { id: 'Pediatrics', label: 'Pediatrics & Neonatology (NICU)', icon: Baby },
                          { id: 'Orthopedics', label: 'Orthopedics & Joint Replacement', icon: Bone },
                          { id: 'Cardiology', label: 'Cardiology & Cardiac Care', icon: Heart },
                          { id: 'Dental', label: 'Dental & Maxillofacial Surgery', icon: Smile },
                          { id: 'Ophthalmology', label: 'Ophthalmology (Eye & Cataract)', icon: Eye },
                          { id: 'Dermatology', label: 'Dermatology & Cosmetology', icon: Sparkles },
                          { id: 'ENT', label: 'ENT (Otorhinolaryngology)', icon: Volume2 },
                          { id: 'Neurology', label: 'Neurology & Neurosurgery', icon: Brain },
                          { id: 'Gastroenterology', label: 'Gastroenterology & Hepatology', icon: Pill },
                          { id: 'Nephrology & Urology', label: 'Nephrology & Urology (Dialysis)', icon: Droplets },
                          { id: 'Pulmonology', label: 'Pulmonology & Chest Medicine', icon: Wind },
                          { id: 'Oncology', label: 'Medical & Surgical Oncology', icon: Crosshair },
                          { id: 'Emergency Care', label: 'Emergency & Trauma (Casualty)', icon: ShieldAlert },
                          { id: 'Psychiatry', label: 'Psychiatry & Behavioral Health', icon: UserCheck },
                          { id: 'Pathology', label: 'Pathology & Diagnostic Lab', icon: Microscope },
                          { id: 'Radiology', label: 'Radiology, USG & Imaging', icon: Scan },
                          { id: 'Physiotherapy', label: 'Physiotherapy & Rehab', icon: Flame },
                          { id: 'Anesthesiology', label: 'Anesthesiology & Pain Mgmt', icon: Syringe },
                          { id: 'Endocrinology', label: 'Endocrinology & Diabetology', icon: Scale },
                          { id: 'Rheumatology', label: 'Rheumatology & Immunology', icon: Shield },
                          { id: 'Preventive Health', label: 'Preventive Health Checkups', icon: ShieldCheck },
                        ].map((dept) => {
                          const IconComp = dept.icon;
                          const isSelected = enabledDepartments.includes(dept.id);
                          return (
                            <button
                              key={dept.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setEnabledDepartments(enabledDepartments.filter(d => d !== dept.id));
                                } else {
                                  setEnabledDepartments([...enabledDepartments, dept.id]);
                                }
                              }}
                              className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between gap-2 cursor-pointer ${
                                isSelected
                                  ? 'bg-[#087F8C] text-white border-[#087F8C] shadow-xs'
                                  : 'bg-white text-[#172B34] border-[#E8EEF2] hover:border-[#087F8C]/40 hover:bg-[#F6F9FB]'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <IconComp className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-[#087F8C]'}`} />
                                <span className="truncate">{dept.label}</span>
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 24x7 Services Toggles */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <label className="p-3 bg-white rounded-xl border border-[#E8EEF2] flex items-center justify-between cursor-pointer hover:border-[#087F8C]/40 transition-colors">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-[#172B34] block">24x7 In-House Hospital Pharmacy</span>
                          <span className="text-[11px] text-[#567781] block">Round-the-clock IPD/OPD medicine dispensing counter</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={pharmacy24x7}
                          onChange={(e) => setPharmacy24x7(e.target.checked)}
                          className="rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4 cursor-pointer"
                        />
                      </label>

                      <label className="p-3 bg-white rounded-xl border border-[#E8EEF2] flex items-center justify-between cursor-pointer hover:border-[#087F8C]/40 transition-colors">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-[#172B34] block">Blood Storage / Blood Bank Tie-Up</span>
                          <span className="text-[11px] text-[#567781] block">Authorized blood unit storage for emergency OT procedures</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={bloodBankAvailable}
                          onChange={(e) => setBloodBankAvailable(e.target.checked)}
                          className="rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* 2. BOTTOM ROW: OPERATING HOURS & HOLIDAYS */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  
                  {/* CARD 3: Multi-Session Chamber Operating Hours */}
                  <div className="border border-[#E8EEF2] bg-white rounded-2xl overflow-hidden shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="bg-[#F6F9FB] border-b border-[#E8EEF2] p-5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-extrabold text-[#172B34] flex items-center gap-2">
                            <Clock className="w-4 h-4 text-[#087F8C]" />
                            <span>3. Multi-Session Chamber Operating Hours</span>
                          </h3>
                          <span className="text-[10px] font-bold bg-[#087F8C]/10 text-[#087F8C] px-2 py-0.5 rounded-md border border-[#087F8C]/20">
                            {timezone}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-[#567781] mt-0.5">
                          Set morning and evening clinic shifts and configure active weekday schedules.
                        </p>
                      </div>

                      <div className="p-5 space-y-4">
                        {/* Morning & Evening Shift Times */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {/* Morning Session */}
                          <div className="bg-[#F6F9FB] p-4 rounded-2xl border border-[#E8EEF2] space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold text-[#172B34] flex items-center gap-1.5">
                                <Sun className="w-4 h-4 text-[#E9A23B]" /> Morning Shift
                              </span>
                              <span className="text-[10px] font-bold text-[#087F8C] bg-[#087F8C]/10 px-2 py-0.5 rounded-md border border-[#087F8C]/20">
                                Session 1
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                              <div className="space-y-1">
                                <span className="text-[10px] text-[#567781] font-bold uppercase tracking-wider block">Opens</span>
                                <input
                                  type="time"
                                  className="w-full h-9 px-2.5 bg-white border border-[#E8EEF2] rounded-xl text-xs font-bold text-[#172B34] focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                                  value={morningStartTime}
                                  onChange={(e) => setMorningStartTime(e.target.value)}
                                />
                              </div>
                              <div className="space-y-1">
                                <span className="text-[10px] text-[#567781] font-bold uppercase tracking-wider block">Closes</span>
                                <input
                                  type="time"
                                  className="w-full h-9 px-2.5 bg-white border border-[#E8EEF2] rounded-xl text-xs font-bold text-[#172B34] focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                                  value={morningEndTime}
                                  onChange={(e) => setMorningEndTime(e.target.value)}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Evening Session */}
                          <div className="bg-[#F6F9FB] p-4 rounded-2xl border border-[#E8EEF2] space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold text-[#172B34] flex items-center gap-1.5">
                                <Moon className="w-4 h-4 text-[#4FA8DB]" /> Evening Shift
                              </span>
                              <span className="text-[10px] font-bold text-[#087F8C] bg-[#087F8C]/10 px-2 py-0.5 rounded-md border border-[#087F8C]/20">
                                Session 2
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                              <div className="space-y-1">
                                <span className="text-[10px] text-[#567781] font-bold uppercase tracking-wider block">Opens</span>
                                <input
                                  type="time"
                                  className="w-full h-9 px-2.5 bg-white border border-[#E8EEF2] rounded-xl text-xs font-bold text-[#172B34] focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                                  value={eveningStartTime}
                                  onChange={(e) => setEveningStartTime(e.target.value)}
                                />
                              </div>
                              <div className="space-y-1">
                                <span className="text-[10px] text-[#567781] font-bold uppercase tracking-wider block">Closes</span>
                                <input
                                  type="time"
                                  className="w-full h-9 px-2.5 bg-white border border-[#E8EEF2] rounded-xl text-xs font-bold text-[#172B34] focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                                  value={eveningEndTime}
                                  onChange={(e) => setEveningEndTime(e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Weekly Working Days */}
                        <div className="space-y-2.5 pt-1">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-[#172B34]">
                              Weekly Working Schedule
                            </label>
                            <span className="text-[11px] font-medium text-[#567781]">
                              Click day to toggle Open / Closed
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                            {DAYS_OF_WEEK.map((day) => {
                              const isClosed = closedDays.includes(day);
                              return (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => toggleClosedDay(day)}
                                  className={`p-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 min-w-0 shadow-2xs ${
                                    isClosed
                                      ? 'bg-[#D64545]/10 text-[#D64545] border-[#D64545]/30 hover:bg-[#D64545]/15'
                                      : 'bg-[#22A06B]/10 text-[#22A06B] border-[#22A06B]/30 hover:bg-[#22A06B]/15'
                                  }`}
                                >
                                  <span className="font-extrabold text-xs tracking-tight">{day.slice(0, 3)}</span>
                                  <span
                                    className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border shadow-2xs ${
                                      isClosed
                                        ? 'bg-white text-[#D64545] border-[#D64545]/30'
                                        : 'bg-white text-[#22A06B] border-[#22A06B]/30'
                                    }`}
                                  >
                                    {isClosed ? 'Closed' : 'Open'}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CARD 4: Holiday Calendar & OPD Appointment Safety Rules */}
                  <div className="border border-[#E8EEF2] bg-white rounded-2xl overflow-hidden shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="bg-[#F6F9FB] border-b border-[#E8EEF2] p-5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-extrabold text-[#172B34] flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-[#087F8C]" />
                            <span>4. Holidays & OPD Appointment Rules</span>
                          </h3>
                          <span className="text-[10px] font-bold bg-[#22A06B]/10 text-[#22A06B] px-2 py-0.5 rounded-md border border-[#22A06B]/20">
                            Live Guard
                          </span>
                        </div>
                        <p className="text-xs font-medium text-[#567781] mt-0.5">
                          Manage clinic closed dates and configure token limits to prevent overcrowding.
                        </p>
                      </div>

                      <div className="p-5 space-y-4">
                        {/* Holidays Date Manager */}
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-[#172B34]">
                            Clinic Holiday Dates (Blocks online & walk-in booking)
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="date"
                              className="h-9 px-3 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs font-medium text-[#172B34] focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                              value={newHolidayDate}
                              onChange={(e) => setNewHolidayDate(e.target.value)}
                            />
                            <Button
                              type="button"
                              onClick={handleAddHolidayDate}
                              className="h-9 bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs rounded-xl px-4 border-0 cursor-pointer flex items-center gap-1 shrink-0"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Holiday</span>
                            </Button>
                          </div>

                          {/* Holiday Badges List */}
                          <div className="flex flex-wrap gap-2 pt-1 min-h-8">
                            {holidayDates ? (
                              holidayDates.split(',').map((d) => d.trim()).filter(Boolean).map((d) => (
                                <div
                                  key={d}
                                  className="bg-[#F6F9FB] border border-[#E8EEF2] px-2.5 py-1 rounded-xl text-xs font-bold text-[#172B34] flex items-center gap-1.5 shadow-2xs"
                                >
                                  <span>📅 {d}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveHolidayDate(d)}
                                    className="text-[#94A3B8] hover:text-[#D64545] cursor-pointer ml-1"
                                    title="Remove holiday date"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))
                            ) : (
                              <span className="text-[11px] text-[#567781] italic">No holiday dates scheduled yet.</span>
                            )}
                          </div>
                        </div>

                        {/* Slot Duration & Max Patients */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-[#172B34]">
                              Clinic Default Slot Duration <span className="font-normal text-[11px] text-[#567781]">(Fallback)</span>
                            </label>
                            <select
                              className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#087F8C] cursor-pointer"
                              value={appointmentSlotDuration}
                              onChange={(e) => setAppointmentSlotDuration(Number(e.target.value))}
                            >
                              <option value="10">10 Minutes (Express OPD)</option>
                              <option value="15">15 Minutes (Standard)</option>
                              <option value="20">20 Minutes (Comprehensive)</option>
                              <option value="30">30 Minutes (Specialist)</option>
                            </select>
                            <p className="text-[10px] text-[#567781]">
                              Fallback for doctors who have not configured a custom duration in Practice Details.
                            </p>
                          </div>

                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-[#172B34]">
                              Max Patients Daily Capacity
                            </label>
                            <input
                              type="number"
                              className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                              value={maxPatientsPerDay}
                              onChange={(e) => setMaxPatientsPerDay(e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Safety Toggles */}
                        <div className="space-y-2 pt-1 border-t border-[#E8EEF2]">
                          <label className="p-2.5 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] flex items-center justify-between cursor-pointer">
                            <div className="space-y-0.5">
                              <span className="text-xs font-bold text-[#172B34] block">Allow Walk-in Tokens</span>
                              <span className="text-[10px] text-[#567781]">Receptionists can generate queue tokens without prior appointment</span>
                            </div>
                            <input
                              type="checkbox"
                              className="rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4 cursor-pointer"
                              checked={walkInEnabled}
                              onChange={(e) => setWalkInEnabled(e.target.checked)}
                            />
                          </label>

                          <label className="p-2.5 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] flex items-center justify-between cursor-pointer">
                            <div className="space-y-0.5">
                              <span className="text-xs font-bold text-[#172B34] block">Allow Emergency Double-Booking</span>
                              <span className="text-[10px] text-[#567781]">Permit slot overlapping when emergency walk-ins occur</span>
                            </div>
                            <input
                              type="checkbox"
                              className="rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4 cursor-pointer"
                              checked={doubleBookingAllowed}
                              onChange={(e) => setDoubleBookingAllowed(e.target.checked)}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: Professional Doctor Settings */}
          {activeTab === 'professional' && ['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR'].includes(user.role?.toUpperCase()) && (
            <div className="space-y-6">
              
              {/* Doctor Selector Bar (for Multi-Doctor Clinics & Admins) */}
              {['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN'].includes(user.role?.toUpperCase()) && clinicDoctors.length > 0 && (
                <div className="p-4 bg-white rounded-2xl border border-[#E8EEF2] shadow-2xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-[#087F8C]" />
                      <span className="text-xs font-extrabold text-[#172B34]">Select Doctor Profile to Configure:</span>
                    </div>
                    <span className="text-[11px] font-medium text-[#567781]">
                      {clinicDoctors.length} {clinicDoctors.length === 1 ? 'Doctor' : 'Doctors'} active in clinic roster
                    </span>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {clinicDoctors.map((doc) => {
                      const isSelected = selectedDoctorId === doc.id;
                      return (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => handleSelectDoctor(doc.id)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2.5 shrink-0 cursor-pointer shadow-2xs ${
                            isSelected
                              ? 'bg-[#087F8C] text-white border-[#087F8C] shadow-xs'
                              : 'bg-[#F6F9FB] text-[#172B34] border-[#E8EEF2] hover:bg-white'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-extrabold ${
                            isSelected ? 'bg-white text-[#087F8C]' : 'bg-[#087F8C]/10 text-[#087F8C]'
                          }`}>
                            {doc.name ? doc.name.substring(0, 2).toUpperCase() : 'DR'}
                          </div>
                          <span>Dr. {doc.name}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-[#E8EEF2] text-[#567781]'
                          }`}>
                            {doc.specialization || 'General'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveProfessional} className="space-y-6">
                {/* 1. TOP ROW: SPECIALIZATION & SLOT DURATION */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  
                  {/* CARD 1: Medical Specialization & Council License */}
                  <div className="border border-[#E8EEF2] bg-white rounded-2xl overflow-hidden shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="bg-[#F6F9FB] border-b border-[#E8EEF2] p-5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-extrabold text-[#172B34] flex items-center gap-2">
                            <Award className="w-4 h-4 text-[#087F8C]" />
                            <span>1. Specialization & Medical License</span>
                          </h3>
                          <span className="text-[10px] font-bold bg-[#087F8C]/10 text-[#087F8C] px-2 py-0.5 rounded-md border border-[#087F8C]/20">
                            Prescription Credentials
                          </span>
                        </div>
                        <p className="text-xs font-medium text-[#567781] mt-0.5">
                          Doctor specialty, MCI / State Medical Council registration, and chamber room.
                        </p>
                      </div>

                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-[#172B34]">Doctor Full Name <span className="text-[#D64545]">*</span></label>
                            <input
                              type="text"
                              required
                              className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                              value={docName}
                              onChange={(e) => setDocName(e.target.value)}
                              placeholder="e.g. Dr. Nikhil Saudagre"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-[#172B34]">Doctor Direct Phone</label>
                            <input
                              type="tel"
                              className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                              value={docPhone}
                              onChange={(e) => setDocPhone(e.target.value)}
                              placeholder="e.g. +91 9876543210"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-[#172B34]">Primary Specialization <span className="text-[#D64545]">*</span></label>
                            <input
                              type="text"
                              required
                              className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                              value={specialization}
                              onChange={(e) => setSpecialization(e.target.value)}
                              placeholder="e.g. General Physician / Cardiologist"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-[#172B34]">Sub-Specialization / Focus</label>
                            <input
                              type="text"
                              className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                              value={subSpecialization}
                              onChange={(e) => setSubSpecialization(e.target.value)}
                              placeholder="e.g. Diabetology, Preventive Care"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-[#172B34]">Medical Council Reg. No. (MCI)</label>
                            <input
                              type="text"
                              className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-semibold font-mono focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                              value={doctorRegNumber}
                              onChange={(e) => setDoctorRegNumber(e.target.value)}
                              placeholder="e.g. MMC-2018-99482"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-[#172B34]">State Medical Council</label>
                            <input
                              type="text"
                              className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                              value={medicalCouncil}
                              onChange={(e) => setMedicalCouncil(e.target.value)}
                              placeholder="e.g. Maharashtra Medical Council"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-[#172B34]">Registration Year</label>
                            <input
                              type="number"
                              className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                              value={registrationYear}
                              onChange={(e) => setRegistrationYear(e.target.value)}
                              placeholder="e.g. 2018"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-[#172B34]">Chamber / Room No.</label>
                            <input
                              type="text"
                              className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                              value={roomNumber}
                              onChange={(e) => setRoomNumber(e.target.value)}
                              placeholder="e.g. OPD Chamber 102"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CARD 2: Doctor Slot Duration & OPD Chamber Rules */}
                  <div className="border border-[#E8EEF2] bg-white rounded-2xl overflow-hidden shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="bg-[#F6F9FB] border-b border-[#E8EEF2] p-5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-extrabold text-[#172B34] flex items-center gap-2">
                            <Clock className="w-4 h-4 text-[#087F8C]" />
                            <span>2. Doctor Slot Duration & Chamber Hours</span>
                          </h3>
                          <span className="text-[10px] font-bold bg-[#22A06B]/10 text-[#22A06B] px-2 py-0.5 rounded-md border border-[#22A06B]/20">
                            Overrides Clinic Default
                          </span>
                        </div>
                        <p className="text-xs font-medium text-[#567781] mt-0.5">
                          Customize consultation slot length and chamber timing notes for this doctor.
                        </p>
                      </div>

                      <div className="p-5 space-y-4">
                        {/* Slot Duration Selector */}
                        <div className="p-4 bg-[#F6F9FB] rounded-2xl border border-[#E8EEF2] space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-[#172B34] flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-[#087F8C]" /> Consultation Slot Duration
                            </span>
                            <span className="text-[11px] font-extrabold text-[#087F8C]">
                              {doctorSlotDuration || 15} Mins / Patient
                            </span>
                          </div>
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {[10, 15, 20, 30, 45, 60].map((mins) => {
                              const isSelected = Number(doctorSlotDuration) === mins;
                              return (
                                <button
                                  key={mins}
                                  type="button"
                                  onClick={() => setDoctorSlotDuration(String(mins))}
                                  className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-2xs ${
                                    isSelected
                                      ? 'bg-[#087F8C] text-white border-[#087F8C]'
                                      : 'bg-white text-[#172B34] border-[#E8EEF2] hover:bg-[#F6F9FB]'
                                  }`}
                                >
                                  {mins}m
                                </button>
                              );
                            })}
                          </div>
                          <p className="text-[11px] text-[#567781] font-medium pt-1">
                            This setting specifically controls how appointment time slots are sliced on the calendar for Dr. {docName || name}.
                          </p>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-[#172B34]">Weekly Chamber Timing Notes</label>
                          <input
                            type="text"
                            className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                            value={availabilitySchedule}
                            onChange={(e) => setAvailabilitySchedule(e.target.value)}
                            placeholder="e.g. Mon-Sat: 09:00 AM - 01:00 PM, 05:00 PM - 09:00 PM"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-[#172B34]">Languages Spoken</label>
                          <input
                            type="text"
                            className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                            value={languagesSpoken}
                            onChange={(e) => setLanguagesSpoken(e.target.value)}
                            placeholder="e.g. English, Hindi, Marathi, Gujarati"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. BOTTOM ROW: TARIFFS & QUALIFICATIONS */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  
                  {/* CARD 3: Doctor Consultation Fees */}
                  <div className="border border-[#E8EEF2] bg-white rounded-2xl overflow-hidden shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="bg-[#F6F9FB] border-b border-[#E8EEF2] p-5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-extrabold text-[#172B34] flex items-center gap-2">
                            <IndianRupee className="w-4 h-4 text-[#087F8C]" />
                            <span>3. Doctor Consultation Fees</span>
                          </h3>
                          <span className="text-[10px] font-bold bg-[#22A06B]/10 text-[#22A06B] px-2 py-0.5 rounded-md border border-[#22A06B]/20">
                            Auto-Applied in Billing
                          </span>
                        </div>
                        <p className="text-xs font-medium text-[#567781] mt-0.5">
                          Standard fees applied during patient appointment booking and invoice generation.
                        </p>
                      </div>

                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                          <div className="p-3.5 bg-[#F6F9FB] rounded-2xl border border-[#E8EEF2] space-y-1.5">
                            <span className="text-[11px] font-bold text-[#567781] block">First Consultation Fee <span className="text-[#D64545]">*</span></span>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-xs font-bold text-[#567781]">₹</span>
                              <input
                                type="number"
                                required
                                className="w-full h-9.5 pl-7 pr-3 bg-white border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                                value={consultationFee}
                                onChange={(e) => setConsultationFee(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="p-3.5 bg-[#F6F9FB] rounded-2xl border border-[#E8EEF2] space-y-1.5">
                            <span className="text-[11px] font-bold text-[#567781] block">Follow-Up Visit Fee</span>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-xs font-bold text-[#567781]">₹</span>
                              <input
                                type="number"
                                className="w-full h-9.5 pl-7 pr-3 bg-white border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                                value={followUpFee}
                                onChange={(e) => setFollowUpFee(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="p-3.5 bg-[#F6F9FB] rounded-2xl border border-[#E8EEF2] space-y-1.5">
                            <span className="text-[11px] font-bold text-[#567781] block">Emergency Priority Fee</span>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-xs font-bold text-[#567781]">₹</span>
                              <input
                                type="number"
                                className="w-full h-9.5 pl-7 pr-3 bg-white border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                                value={emergencyFee}
                                onChange={(e) => setEmergencyFee(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-[#172B34]">Doctor Digital Signature Asset URL</label>
                          <input
                            type="text"
                            className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                            value={doctorDigitalSignature}
                            onChange={(e) => setDoctorDigitalSignature(e.target.value)}
                            placeholder="https://.../signature.png or upload via Prescription Studio"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CARD 4: Qualifications & Clinical Biography */}
                  <div className="border border-[#E8EEF2] bg-white rounded-2xl overflow-hidden shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="bg-[#F6F9FB] border-b border-[#E8EEF2] p-5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-extrabold text-[#172B34] flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#087F8C]" />
                            <span>4. Qualifications, Experience & Bio</span>
                          </h3>
                          <span className="text-[10px] font-bold bg-[#F6F9FB] text-[#567781] px-2 py-0.5 rounded-md border border-[#E8EEF2]">
                            Doctor Resume
                          </span>
                        </div>
                        <p className="text-xs font-medium text-[#567781] mt-0.5">
                          Professional degrees, post-graduate credentials, and clinical background.
                        </p>
                      </div>

                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-[#172B34]">Degrees / Qualifications</label>
                            <input
                              type="text"
                              className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                              value={qualification}
                              onChange={(e) => setQualification(e.target.value)}
                              placeholder="e.g. MBBS, MD (Internal Medicine), FACP"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-[#172B34]">Total Clinical Experience (Years)</label>
                            <input
                              type="number"
                              className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                              value={experienceYears}
                              onChange={(e) => setExperienceYears(e.target.value)}
                              placeholder="e.g. 12"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-[#172B34]">Doctor Biography & Summary</label>
                          <textarea
                            rows={3}
                            className="w-full p-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                            value={biography}
                            onChange={(e) => setBiography(e.target.value)}
                            placeholder="Summary of medical expertise, clinical background, and specialty areas..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Submit Action Bar */}
                <div className="p-4 bg-white rounded-2xl border border-[#E8EEF2] shadow-2xs flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs text-[#567781]">
                    <Sparkles className="w-4 h-4 text-[#087F8C]" />
                    <span>Changes will immediately update prescription headers, billing prices, and slot calendars.</span>
                  </div>
                  <Button
                    type="submit"
                    className="bg-[#087F8C] hover:bg-[#076b77] text-white rounded-xl font-extrabold text-xs h-10 px-7 shadow-xs border-0 cursor-pointer shrink-0"
                    disabled={savingProfessional}
                  >
                    {savingProfessional ? 'Saving Practice Details...' : 'Save Practice Details'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: Prescription Studio & Rx Protocols (Full Hospital-Grade Customization) */}
          {activeTab === 'prescription' && (user.role === 'ADMIN' || user.role === 'DOCTOR') && (
            <div className="space-y-6">
              {/* Prescription Branding & Print Format */}
              <div className="border border-[#E8EEF2] bg-white rounded-2xl overflow-hidden shadow-2xs space-y-6">
                <div className="bg-[#F6F9FB] border-b border-[#E8EEF2] p-4 sm:p-6 flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-extrabold text-[#172B34] flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#087F8C]" />
                        <span>Prescription Studio & Clinical Documents</span>
                      </h2>
                      <p className="text-xs font-medium text-[#567781] mt-0.5">
                        Configure stationery mode, section visibility, doctor signature, margins, and preview all clinical documents.
                      </p>
                    </div>
                  </div>

                  {/* Multi-Document Live Preview Quick-Launch Bar */}
                  <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[#E8EEF2]">
                    <span className="text-[11px] font-bold text-[#567781] mr-1">Live Preview:</span>
                    <button
                      type="button"
                      onClick={() => handleOpenPreview('PRESCRIPTION')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#172B34] hover:bg-[#101e25] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Prescription (Rx)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenPreview('DISCHARGE_SUMMARY')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-[#172B34] border border-[#E8EEF2] rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <Hospital className="w-3.5 h-3.5 text-[#087F8C]" />
                      <span>Discharge Summary</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenPreview('CONSULTATION_REPORT')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-[#172B34] border border-[#E8EEF2] rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <Stethoscope className="w-3.5 h-3.5 text-[#087F8C]" />
                      <span>Consultation Report</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenPreview('MEDICAL_CERTIFICATE')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-[#172B34] border border-[#E8EEF2] rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <Award className="w-3.5 h-3.5 text-[#087F8C]" />
                      <span>Medical Certificate</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenPreview('INVOICE')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-[#172B34] border border-[#E8EEF2] rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <Receipt className="w-3.5 h-3.5 text-[#087F8C]" />
                      <span>Tax Invoice / Bill</span>
                    </button>
                  </div>
                </div>

                <div className="p-5 sm:p-6">
                  <form onSubmit={handleSavePrescription} className="space-y-6">
                    {prescriptionSuccess && (
                      <div className="bg-[#22A06B]/10 border border-[#22A06B]/20 text-[#22A06B] p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#22A06B]" />
                        Prescription studio settings and protocols updated successfully!
                      </div>
                    )}

                    {prescriptionError && (
                      <div className="bg-[#D64545]/10 border border-[#D64545]/20 text-[#D64545] p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <div>{prescriptionError}</div>
                      </div>
                    )}

                    {/* 1. Stationery & Letterhead Mode */}
                    <div className="p-4 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-[#172B34]">1. Stationery & Letterhead Printing Mode</span>
                        <span className="text-[10px] font-bold text-[#087F8C] bg-[#087F8C]/10 px-2 py-0.5 rounded">Print Format</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label
                          className={`p-3.5 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                            letterheadMode === 'PLAIN_PAPER'
                              ? 'bg-white border-[#087F8C] ring-2 ring-[#087F8C]/20 shadow-xs'
                              : 'bg-white/60 border-[#E8EEF2] hover:bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name="letterheadMode"
                            value="PLAIN_PAPER"
                            checked={letterheadMode === 'PLAIN_PAPER'}
                            onChange={(e) => setLetterheadMode(e.target.value)}
                            className="mt-0.5 text-[#087F8C] focus:ring-[#087F8C]"
                          />
                          <div className="space-y-0.5">
                            <strong className="text-xs font-extrabold text-[#172B34] block">Plain Paper (Print Full Header)</strong>
                            <p className="text-[11px] text-[#567781] leading-relaxed">
                              Prints full clinic logo, hospital address, doctor qualifications, and contact details on standard paper.
                            </p>
                          </div>
                        </label>

                        <label
                          className={`p-3.5 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                            letterheadMode === 'PREPRINTED_PAD'
                              ? 'bg-white border-[#087F8C] ring-2 ring-[#087F8C]/20 shadow-xs'
                              : 'bg-white/60 border-[#E8EEF2] hover:bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name="letterheadMode"
                            value="PREPRINTED_PAD"
                            checked={letterheadMode === 'PREPRINTED_PAD'}
                            onChange={(e) => setLetterheadMode(e.target.value)}
                            className="mt-0.5 text-[#087F8C] focus:ring-[#087F8C]"
                          />
                          <div className="space-y-0.5">
                            <strong className="text-xs font-extrabold text-[#172B34] block">Doctor Pad (Pre-Printed Paper)</strong>
                            <p className="text-[11px] text-[#567781] leading-relaxed">
                              Leaves blank top space so it prints cleanly on physical hospital pads without duplicate logos.
                            </p>
                          </div>
                        </label>
                      </div>

                      {letterheadMode === 'PREPRINTED_PAD' && (
                        <div className="p-3 bg-white rounded-lg border border-[#E8EEF2] space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-[#172B34]">Doctor Pad Top Margin Space</label>
                            <span className="text-xs font-mono font-bold text-[#087F8C]">{topMarginMm} mm</span>
                          </div>
                          <input
                            type="range"
                            min="20"
                            max="80"
                            step="5"
                            value={topMarginMm}
                            onChange={(e) => setTopMarginMm(e.target.value)}
                            className="w-full accent-[#087F8C] cursor-pointer"
                          />
                          <p className="text-[10px] text-[#567781]">Adjust slider to match the header height of your printed pad.</p>
                        </div>
                      )}
                    </div>

                    {/* 2. Modular Section Visibility Toggles */}
                    <div className="p-4 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-[#172B34]">2. Modular Prescription Section Controls</span>
                        <span className="text-[10px] font-bold text-[#567781]">Show / Hide Sections</span>
                      </div>
                      <p className="text-[11px] text-[#567781]">Select which sections should appear on the printed and PDF prescription documents.</p>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
                        <label className="flex items-center space-x-2 text-xs font-semibold text-[#172B34] bg-white p-2.5 rounded-lg border border-[#E8EEF2] cursor-pointer hover:border-[#087F8C]/50">
                          <input
                            type="checkbox"
                            className="rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4"
                            checked={showVitals}
                            onChange={(e) => setShowVitals(e.target.checked)}
                          />
                          <span>Patient Vitals Strip</span>
                        </label>

                        <label className="flex items-center space-x-2 text-xs font-semibold text-[#172B34] bg-white p-2.5 rounded-lg border border-[#E8EEF2] cursor-pointer hover:border-[#087F8C]/50">
                          <input
                            type="checkbox"
                            className="rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4"
                            checked={showComplaints}
                            onChange={(e) => setShowComplaints(e.target.checked)}
                          />
                          <span>Chief Complaints</span>
                        </label>

                        <label className="flex items-center space-x-2 text-xs font-semibold text-[#172B34] bg-white p-2.5 rounded-lg border border-[#E8EEF2] cursor-pointer hover:border-[#087F8C]/50">
                          <input
                            type="checkbox"
                            className="rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4"
                            checked={showDiagnosis}
                            onChange={(e) => setShowDiagnosis(e.target.checked)}
                          />
                          <span>Clinical Diagnosis</span>
                        </label>

                        <label className="flex items-center space-x-2 text-xs font-semibold text-[#172B34] bg-white p-2.5 rounded-lg border border-[#E8EEF2] cursor-pointer hover:border-[#087F8C]/50">
                          <input
                            type="checkbox"
                            className="rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4"
                            checked={showMedicines}
                            onChange={(e) => setShowMedicines(e.target.checked)}
                          />
                          <span>℞ Medications Table</span>
                        </label>

                        <label className="flex items-center space-x-2 text-xs font-semibold text-[#172B34] bg-white p-2.5 rounded-lg border border-[#E8EEF2] cursor-pointer hover:border-[#087F8C]/50">
                          <input
                            type="checkbox"
                            className="rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4"
                            checked={showLabTests}
                            onChange={(e) => setShowLabTests(e.target.checked)}
                          />
                          <span>Lab Investigations</span>
                        </label>

                        <label className="flex items-center space-x-2 text-xs font-semibold text-[#172B34] bg-white p-2.5 rounded-lg border border-[#E8EEF2] cursor-pointer hover:border-[#087F8C]/50">
                          <input
                            type="checkbox"
                            className="rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4"
                            checked={showAdvice}
                            onChange={(e) => setShowAdvice(e.target.checked)}
                          />
                          <span>Dietary & Clinical Advice</span>
                        </label>

                        <label className="flex items-center space-x-2 text-xs font-semibold text-[#172B34] bg-white p-2.5 rounded-lg border border-[#E8EEF2] cursor-pointer hover:border-[#087F8C]/50">
                          <input
                            type="checkbox"
                            className="rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4"
                            checked={showFollowUp}
                            onChange={(e) => setShowFollowUp(e.target.checked)}
                          />
                          <span>Next Review Date</span>
                        </label>

                        <label className="flex items-center space-x-2 text-xs font-semibold text-[#172B34] bg-white p-2.5 rounded-lg border border-[#E8EEF2] cursor-pointer hover:border-[#087F8C]/50">
                          <input
                            type="checkbox"
                            className="rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4"
                            checked={showSignature}
                            onChange={(e) => setShowSignature(e.target.checked)}
                          />
                          <span>Doctor Signature Line</span>
                        </label>

                        <label className="flex items-center space-x-2 text-xs font-semibold text-[#172B34] bg-white p-2.5 rounded-lg border border-[#E8EEF2] cursor-pointer hover:border-[#087F8C]/50">
                          <input
                            type="checkbox"
                            className="rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4"
                            checked={enableQrCode}
                            onChange={(e) => setEnableQrCode(e.target.checked)}
                          />
                          <span>Security QR Code</span>
                        </label>

                        <label className="flex items-center space-x-2 text-xs font-semibold text-[#172B34] bg-white p-2.5 rounded-lg border border-[#E8EEF2] cursor-pointer hover:border-[#087F8C]/50">
                          <input
                            type="checkbox"
                            className="rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4"
                            checked={showLogo}
                            onChange={(e) => setShowLogo(e.target.checked)}
                          />
                          <span>Hospital / Clinic Logo</span>
                        </label>
                      </div>
                    </div>

                    {/* 3. Paper Format & Text Header */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-[#172B34]">Letterhead Header Tagline</label>
                        <input
                          type="text"
                          className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                          placeholder="e.g. Multi-Speciality Hospital & Research Centre (NABH Accredited)"
                          value={headerText}
                          onChange={(e) => setHeaderText(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-[#172B34]">Letterhead Footer / Legal Disclaimer</label>
                        <input
                          type="text"
                          className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                          placeholder="e.g. 24x7 Emergency Helpline: +91 9876543210 | Valid for 15 days"
                          value={footerText}
                          onChange={(e) => setFooterText(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-[#172B34]">Doctor Digital Signature Stamp URL</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                            placeholder="https://example.com/signature.png"
                            value={digitalSignatureUrl}
                            onChange={(e) => setDigitalSignatureUrl(e.target.value)}
                          />
                          <ImageUploadButton onUploadComplete={(url) => setDigitalSignatureUrl(url)} disabled={savingPrescription} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-[#172B34]">Paper Size</label>
                          <select
                            className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#087F8C] cursor-pointer"
                            value={paperSize}
                            onChange={(e) => setPaperSize(e.target.value)}
                          >
                            <option value="A4">Standard A4 Sheet</option>
                            <option value="A5">Compact A5 Pad</option>
                            <option value="THERMAL">80mm Thermal Slip</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-[#172B34]">Side Margins (mm)</label>
                          <input
                            type="number"
                            className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                            value={printMarginMm}
                            onChange={(e) => setPrintMarginMm(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Default Prescription Advice */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#172B34]">Standard Advice / Instructions (Printed on Prescription)</label>
                        <textarea
                          rows={3}
                          placeholder="e.g. Drink plenty of warm water. Avoid oily or spicy food. Follow up after 5 days."
                          className="w-full p-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                          value={defaultAdvice}
                          onChange={(e) => setDefaultAdvice(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* 3. Hospital Inpatient Discharge Summary Customization */}
                    <div className="p-4 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Hospital className="w-4 h-4 text-[#087F8C]" />
                          <span className="text-xs font-extrabold text-[#172B34]">3. Hospital Discharge Summary (IPD & Daycare)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenPreview('DISCHARGE_SUMMARY')}
                          className="text-[11px] font-bold text-[#087F8C] hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview Discharge Summary</span>
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#172B34]">Discharge Summary Document Title</label>
                        <input
                          type="text"
                          className="w-full h-9.5 px-3 bg-white border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                          value={dischargeHeaderTitle}
                          onChange={(e) => setDischargeHeaderTitle(e.target.value)}
                          placeholder="e.g. HOSPITAL INPATIENT DISCHARGE SUMMARY"
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                        <label className="flex items-center space-x-2 text-xs font-semibold text-[#172B34] bg-white p-2.5 rounded-lg border border-[#E8EEF2] cursor-pointer hover:border-[#087F8C]/50">
                          <input
                            type="checkbox"
                            className="rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4"
                            checked={dischargeShowHospitalCourse}
                            onChange={(e) => setDischargeShowHospitalCourse(e.target.checked)}
                          />
                          <span>Hospital Course & Surgeries</span>
                        </label>

                        <label className="flex items-center space-x-2 text-xs font-semibold text-[#172B34] bg-white p-2.5 rounded-lg border border-[#E8EEF2] cursor-pointer hover:border-[#087F8C]/50">
                          <input
                            type="checkbox"
                            className="rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4"
                            checked={dischargeShowInvestigations}
                            onChange={(e) => setDischargeShowInvestigations(e.target.checked)}
                          />
                          <span>Lab & Imaging Summary</span>
                        </label>

                        <label className="flex items-center space-x-2 text-xs font-semibold text-[#172B34] bg-white p-2.5 rounded-lg border border-[#E8EEF2] cursor-pointer hover:border-[#087F8C]/50">
                          <input
                            type="checkbox"
                            className="rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4"
                            checked={dischargeShowDietActivity}
                            onChange={(e) => setDischargeShowDietActivity(e.target.checked)}
                          />
                          <span>Diet & Activity Advice</span>
                        </label>

                        <label className="flex items-center space-x-2 text-xs font-semibold text-[#172B34] bg-white p-2.5 rounded-lg border border-[#E8EEF2] cursor-pointer hover:border-[#087F8C]/50">
                          <input
                            type="checkbox"
                            className="rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4"
                            checked={dischargeShowEmergencyWarning}
                            onChange={(e) => setDischargeShowEmergencyWarning(e.target.checked)}
                          />
                          <span>Red-Flag Emergency Warnings</span>
                        </label>

                        <label className="flex items-center space-x-2 text-xs font-semibold text-[#172B34] bg-white p-2.5 rounded-lg border border-[#E8EEF2] cursor-pointer hover:border-[#087F8C]/50">
                          <input
                            type="checkbox"
                            className="rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4"
                            checked={dischargeShowAttendantSignature}
                            onChange={(e) => setDischargeShowAttendantSignature(e.target.checked)}
                          />
                          <span>Patient / Attendant Signature</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-[#172B34]">Default Emergency Warning Signs Text</label>
                          <textarea
                            rows={2}
                            placeholder="e.g. Persistent fever, severe wound pain, soakage, persistent vomiting"
                            className="w-full p-2.5 bg-white border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                            value={defaultDischargeEmergencyNotes}
                            onChange={(e) => setDefaultDischargeEmergencyNotes(e.target.value)}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-[#172B34]">Default Diet & Activity Restriction Text</label>
                          <textarea
                            rows={2}
                            placeholder="e.g. Light soft diet, avoid heavy lifting (>5 kg) for 3 weeks"
                            className="w-full p-2.5 bg-white border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                            value={defaultDischargeDietNotes}
                            onChange={(e) => setDefaultDischargeDietNotes(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* 4. Clinical Consultation & OPD Encounter Report Customization */}
                    <div className="p-4 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="w-4 h-4 text-[#087F8C]" />
                          <span className="text-xs font-extrabold text-[#172B34]">4. Clinical Consultation & OPD Encounter Report</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenPreview('CONSULTATION_REPORT')}
                          className="text-[11px] font-bold text-[#087F8C] hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview Consultation Report</span>
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#172B34]">Consultation Report Title</label>
                        <input
                          type="text"
                          className="w-full h-9.5 px-3 bg-white border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                          value={consultationReportTitle}
                          onChange={(e) => setConsultationReportTitle(e.target.value)}
                          placeholder="e.g. CLINICAL CONSULTATION & OPD ENCOUNTER REPORT"
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                        <label className="flex items-center space-x-2 text-xs font-semibold text-[#172B34] bg-white p-2.5 rounded-lg border border-[#E8EEF2] cursor-pointer hover:border-[#087F8C]/50">
                          <input
                            type="checkbox"
                            className="rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4"
                            checked={consultationShowVitals}
                            onChange={(e) => setConsultationShowVitals(e.target.checked)}
                          />
                          <span>Vitals Strip (BP, HR, Temp, BMI)</span>
                        </label>

                        <label className="flex items-center space-x-2 text-xs font-semibold text-[#172B34] bg-white p-2.5 rounded-lg border border-[#E8EEF2] cursor-pointer hover:border-[#087F8C]/50">
                          <input
                            type="checkbox"
                            className="rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4"
                            checked={consultationShowSystemicExam}
                            onChange={(e) => setConsultationShowSystemicExam(e.target.checked)}
                          />
                          <span>Systemic Examination</span>
                        </label>

                        <label className="flex items-center space-x-2 text-xs font-semibold text-[#172B34] bg-white p-2.5 rounded-lg border border-[#E8EEF2] cursor-pointer hover:border-[#087F8C]/50">
                          <input
                            type="checkbox"
                            className="rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4"
                            checked={consultationShowInvestigations}
                            onChange={(e) => setConsultationShowInvestigations(e.target.checked)}
                          />
                          <span>Diagnostic Tests</span>
                        </label>

                        <label className="flex items-center space-x-2 text-xs font-semibold text-[#172B34] bg-white p-2.5 rounded-lg border border-[#E8EEF2] cursor-pointer hover:border-[#087F8C]/50">
                          <input
                            type="checkbox"
                            className="rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4"
                            checked={consultationShowReferralNotes}
                            onChange={(e) => setConsultationShowReferralNotes(e.target.checked)}
                          />
                          <span>Specialist Referral Notes</span>
                        </label>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <label className="text-xs font-bold text-[#172B34]">Consultation Report Disclaimer & Follow-Up Note</label>
                        <input
                          type="text"
                          className="w-full h-9.5 px-3 bg-white border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                          value={defaultConsultationDisclaimer}
                          onChange={(e) => setDefaultConsultationDisclaimer(e.target.value)}
                          placeholder="e.g. Please bring this report & test results on next visit. Valid for Insurance Claims."
                        />
                      </div>
                    </div>

                    {/* 5. Medical Certificate & Fitness / Leave Customization */}
                    <div className="p-4 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-[#087F8C]" />
                          <span className="text-xs font-extrabold text-[#172B34]">5. Medical Fitness & Sickness Leave Certificate</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenPreview('MEDICAL_CERTIFICATE')}
                          className="text-[11px] font-bold text-[#087F8C] hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview Medical Certificate</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-[#172B34]">Certificate Document Heading</label>
                          <input
                            type="text"
                            className="w-full h-9.5 px-3 bg-white border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                            value={medicalCertTitle}
                            onChange={(e) => setMedicalCertTitle(e.target.value)}
                            placeholder="e.g. MEDICAL FITNESS & SICKNESS CERTIFICATE"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-[#172B34]">Medical Council Authority Citation</label>
                          <input
                            type="text"
                            className="w-full h-9.5 px-3 bg-white border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                            value={medicalCertCouncilAuthority}
                            onChange={(e) => setMedicalCertCouncilAuthority(e.target.value)}
                            placeholder="e.g. Issued under Regulations of National Medical Commission & State Medical Council"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#172B34]">Default Certificate Remarks / Opinion</label>
                        <textarea
                          rows={2}
                          className="w-full p-2.5 bg-white border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                          value={defaultMedicalCertRemarks}
                          onChange={(e) => setDefaultMedicalCertRemarks(e.target.value)}
                          placeholder="e.g. Patient has undergone medical treatment and is now certified fit to resume normal duties."
                        />
                      </div>

                      <label className="flex items-center space-x-2 text-xs font-semibold text-[#172B34] bg-white p-2.5 rounded-lg border border-[#E8EEF2] cursor-pointer hover:border-[#087F8C]/50 w-fit">
                        <input
                          type="checkbox"
                          className="rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4"
                          checked={medicalCertShowSeal}
                          onChange={(e) => setMedicalCertShowSeal(e.target.checked)}
                        />
                        <span>Show Official Clinic / Hospital Stamp Seal Box</span>
                      </label>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        type="submit"
                        className="bg-[#087F8C] hover:bg-[#076b77] text-white rounded-xl font-bold text-xs h-9 px-6 shadow-xs border-0 cursor-pointer"
                        disabled={savingPrescription}
                      >
                        {savingPrescription ? 'Saving...' : 'Save Prescription Branding'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Rx Quick Templates / Clinical Protocols (HealthPlix & Eka Care Feature) */}
              <div className="border border-[#E8EEF2] bg-white rounded-2xl overflow-hidden shadow-2xs space-y-5">
                <div className="bg-[#F6F9FB] border-b border-[#E8EEF2] p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-extrabold text-[#172B34] flex items-center gap-2">
                      <BookmarkPlus className="w-4 h-4 text-[#087F8C]" />
                      <span>Rx Quick Presets & Clinical Protocols</span>
                    </h2>
                    <p className="text-xs font-medium text-[#567781] mt-0.5">
                      Pre-configured prescription sets to generate rapid 10-second prescriptions during OPD consultations.
                    </p>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => setShowNewTemplateModal(true)}
                    className="bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs rounded-xl px-4 h-8.5 border-0 cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    <span>Create Rx Preset</span>
                  </Button>
                </div>

                <div className="p-4 sm:p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {rxTemplates.map((tpl) => (
                      <div key={tpl.id} className="p-4 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] space-y-2.5 flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between">
                            <span className="font-extrabold text-xs text-[#172B34] line-clamp-1">{tpl.name}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteRxTemplate(tpl.id)}
                              className="text-[#94A3B8] hover:text-[#D64545] cursor-pointer"
                              title="Delete Template"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <span className="text-[10px] font-bold text-[#087F8C] bg-[#087F8C]/10 px-2 py-0.5 rounded-md inline-block">
                            {tpl.diagnosis}
                          </span>
                          <div className="text-[11px] text-[#567781] whitespace-pre-line bg-white p-2.5 rounded-lg border border-[#E8EEF2] font-mono leading-relaxed line-clamp-4">
                            {tpl.medicines}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick One-Click Medical Advice Presets */}
              <div className="border border-[#E8EEF2] bg-white rounded-2xl overflow-hidden shadow-2xs space-y-4">
                <div className="bg-[#F6F9FB] border-b border-[#E8EEF2] p-4 sm:p-6">
                  <h2 className="text-base font-extrabold text-[#172B34] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#087F8C]" />
                    <span>Quick Medical Advice & Patient Instructions Library</span>
                  </h2>
                  <p className="text-xs font-medium text-[#567781] mt-0.5">
                    Pre-saved dietary and lifestyle recommendations doctors can append with a single click on the Rx pad.
                  </p>
                </div>

                <div className="p-4 sm:p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Avoid dairy and heavy proteins for the next 3 days."
                      className="flex-1 h-9 px-3 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs font-medium text-[#172B34]"
                      value={newAdviceInput}
                      onChange={(e) => setNewAdviceInput(e.target.value)}
                    />
                    <Button
                      type="button"
                      onClick={handleAddAdviceSnippet}
                      className="h-9 bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs rounded-xl px-4 border-0 cursor-pointer shrink-0 w-full sm:w-auto justify-center"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      <span>Add Advice Preset</span>
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {quickAdviceList.map((adv, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] text-xs text-[#172B34] font-medium flex items-center justify-between gap-3"
                      >
                        <span className="flex-1">💬 {adv}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteAdviceSnippet(idx)}
                          className="text-[#94A3B8] hover:text-[#D64545] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Billing & Hospital Tariff Master (Full Hospital Facilities) */}
          {activeTab === 'billing' && ['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN'].includes(user.role?.toUpperCase()) && (
            <div className="space-y-6">
              {/* Invoicing, GST & Payment UPI */}
              <div className="border border-[#E8EEF2] bg-white rounded-2xl overflow-hidden shadow-2xs">
                <div className="bg-[#F6F9FB] border-b border-[#E8EEF2] p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div>
                    <h2 className="text-base font-extrabold text-[#172B34] flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-[#087F8C]" />
                      <span>Invoicing, GST & Quick UPI Payment Settings</span>
                    </h2>
                    <p className="text-xs font-medium text-[#567781] mt-0.5">
                      Configure invoice numbering prefix, standard tax rates, and clinic UPI VPA for instant patient scan & pay.
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={() => handleOpenPreview('INVOICE')}
                    className="bg-[#172B34] hover:bg-[#101e25] text-white rounded-xl text-xs font-extrabold h-9 px-4 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs border-0 shrink-0 w-full sm:w-auto"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Live Preview Tax Invoice / Bill</span>
                  </Button>
                </div>
                <div className="p-5 sm:p-6">
                  <form onSubmit={handleSaveClinic} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-[#172B34]">Invoice Prefix Format</label>
                        <input
                          type="text"
                          placeholder="e.g. INV-2026-"
                          className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                          value={invoicePrefix}
                          onChange={(e) => setInvoicePrefix(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-[#172B34]">Standard Tax / GST Rate (%)</label>
                        <input
                          type="number"
                          placeholder="0 or 18"
                          className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                          value={taxPercentage}
                          onChange={(e) => setTaxPercentage(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-[#172B34] flex items-center gap-1">
                          <QrCode className="w-3.5 h-3.5 text-[#087F8C]" /> Clinic UPI VPA ID
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. nisschayclinic@upi"
                          className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                        />
                      </div>
                    </div>

                    {upiId && (
                      <div className="p-4 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] flex items-center gap-4">
                        <div className="w-16 h-16 bg-white border border-[#E8EEF2] rounded-lg p-1.5 flex items-center justify-center shadow-2xs">
                          <QrCode className="w-12 h-12 text-[#087F8C]" />
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-[#172B34]">Instant UPI QR Enabled</span>
                          <p className="text-[11px] text-[#567781]">
                            Patients can scan your dynamic UPI QR code (<strong>{upiId}</strong>) on the receipt or screen to complete fee payments.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Doctor Discount & Concessions Configuration */}
                    <div className="pt-4 border-t border-[#E8EEF2] space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-extrabold text-[#172B34] block">Doctor & Billing Staff Discount Authorization</span>
                          <p className="text-[11px] text-[#567781] mt-0.5">
                            Control whether doctors and receptionists can grant discretionary discounts, fee waivers, or concessions on patient bills.
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={allowDoctorDiscount}
                            onChange={(e) => setAllowDoctorDiscount(e.target.checked)}
                          />
                          <div className="w-10 h-5.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-[#087F8C]"></div>
                        </label>
                      </div>

                      {allowDoctorDiscount && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                          <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-[#172B34]">Max Concession / Discount Cap (%)</label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              placeholder="100 (Full Waiver Allowed)"
                              className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                              value={maxDiscountPercentage}
                              onChange={(e) => setMaxDiscountPercentage(e.target.value)}
                            />
                            <p className="text-[10px] text-[#567781]">e.g. Set 50 for max 50% discount, or 100 to allow complete fee waivers.</p>
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-[#172B34]">Concession Reason Presets (Comma-separated)</label>
                            <input
                              type="text"
                              placeholder="Senior Citizen, Follow-up Courtesy, Staff Discount"
                              className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                              value={discountReasons}
                              onChange={(e) => setDiscountReasons(e.target.value)}
                            />
                            <p className="text-[10px] text-[#567781]">Quick preset tags available during billing checkout.</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        type="submit"
                        className="bg-[#087F8C] hover:bg-[#076b77] text-white rounded-xl font-bold text-xs h-9 px-6 shadow-xs border-0 cursor-pointer"
                        disabled={savingClinic}
                      >
                        {savingClinic ? 'Saving...' : 'Save Invoicing & Discount Settings'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Hospital Services & Price List */}
              <div className="border border-[#E8EEF2] bg-white rounded-2xl overflow-hidden shadow-2xs space-y-6">
                <div className="bg-[#F6F9FB] border-b border-[#E8EEF2] p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-extrabold text-[#172B34] flex items-center gap-2">
                      <IndianRupee className="w-4 h-4 text-[#087F8C]" />
                      <span>Hospital Services & Price List</span>
                    </h2>
                    <p className="text-xs font-medium text-[#567781] mt-0.5">
                      Set prices for Hospital Rooms, ICU beds, Operation Theatres (OT), Doctor Fees, Nursing, and Lab tests.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAutoPopulateHospitalServices}
                      disabled={savingService}
                      className="bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs rounded-xl h-8.5 px-3 border-0 cursor-pointer shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1" />
                      <span>{savingService ? 'Provisioning...' : 'Auto-Add Hospital Bed & Lab Tariffs'}</span>
                    </Button>
                    <span className="text-xs font-bold text-[#567781] bg-white px-3 py-1.5 rounded-xl border border-[#E8EEF2]">
                      Total Services: <strong>{services.length}</strong>
                    </span>
                  </div>
                </div>

                <div className="px-4 sm:px-6 space-y-5">
                  {serviceSuccess && (
                    <div className="bg-[#22A06B]/10 border border-[#22A06B]/20 text-[#22A06B] p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#22A06B]" />
                      Service price saved successfully!
                    </div>
                  )}

                  {serviceError && (
                    <div className="bg-[#D64545]/10 border border-[#D64545]/20 text-[#D64545] p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <div>{serviceError}</div>
                    </div>
                  )}

                  {/* Add Hospital Service Form */}
                  <form onSubmit={handleAddService} className="p-4 bg-[#F6F9FB] border border-[#E8EEF2] rounded-2xl space-y-3.5">
                    <span className="text-xs font-extrabold text-[#172B34] block">Add New Service or Price</span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#172B34]">Facility / Service Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Deluxe AC Room, Major OT, Doctor Consultation"
                          className="w-full h-9 px-3 bg-white border border-[#E8EEF2] rounded-lg text-xs font-medium text-[#172B34] focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                          value={newServiceName}
                          onChange={(e) => setNewServiceName(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#172B34]">Department / Category *</label>
                        <select
                          className="w-full h-9 px-3 bg-white border border-[#E8EEF2] rounded-lg text-xs font-semibold text-[#172B34] focus:outline-none focus:ring-2 focus:ring-[#087F8C] cursor-pointer"
                          value={newServiceCategory}
                          onChange={(e) => setNewServiceCategory(e.target.value)}
                        >
                          <option value="ROOM_BED">Rooms & Inpatient Beds</option>
                          <option value="ICU_CCU">ICU / Critical Care</option>
                          <option value="OPERATION_THEATRE">Operation Theatre & Surgery</option>
                          <option value="DOCTOR_FEE">Doctor Consultation & Rounds</option>
                          <option value="NURSING_CARE">Nursing Care & Daycare</option>
                          <option value="DIAGNOSTIC_LAB">Diagnostics & Pathology Lab</option>
                          <option value="PROCEDURE">Clinical Procedures & Daycare</option>
                          <option value="OTHER">Other Hospital Services</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#172B34]">Price (₹) *</label>
                        <input
                          type="number"
                          required
                          placeholder="e.g. 1500"
                          className="w-full h-9 px-3 bg-white border border-[#E8EEF2] rounded-lg text-xs font-medium text-[#172B34] focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                          value={newServiceFee}
                          onChange={(e) => setNewServiceFee(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#172B34]">Doctor-Specific Override (Optional)</label>
                        <select
                          className="w-full h-9 px-3 bg-white border border-[#E8EEF2] rounded-lg text-xs font-medium text-[#172B34] focus:outline-none focus:ring-2 focus:ring-[#087F8C] cursor-pointer"
                          value={newServiceDoctorId}
                          onChange={(e) => setNewServiceDoctorId(e.target.value)}
                        >
                          <option value="">General Hospital Standard (All Doctors)</option>
                          {clinicDoctors.map((doc) => (
                            <option key={doc.id} value={doc.id}>
                              Dr. {doc.name} ({doc.specialization || 'Consultant'})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#172B34]">HSN / SAC Code</label>
                        <input
                          type="text"
                          placeholder="999312 (Healthcare)"
                          className="w-full h-9 px-3 bg-white border border-[#E8EEF2] rounded-lg text-xs font-medium font-mono text-[#172B34] focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                          value={newServiceHsnCode}
                          onChange={(e) => setNewServiceHsnCode(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#172B34]">Description / Notes</label>
                        <input
                          type="text"
                          placeholder="e.g. Per-day bed charge including nursing"
                          className="w-full h-9 px-3 bg-white border border-[#E8EEF2] rounded-lg text-xs font-medium text-[#172B34] focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                          value={newServiceDescription}
                          onChange={(e) => setNewServiceDescription(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        type="submit"
                        className="h-9 bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs rounded-xl px-5 border-0 cursor-pointer shadow-xs"
                        disabled={savingService}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        <span>Add to Price List</span>
                      </Button>
                    </div>
                  </form>

                  {/* Filter & Search Bar */}
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pt-1">
                    {/* Category Filter Chips */}
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 flex-nowrap">
                      {[
                        { id: 'ALL', label: 'All Services' },
                        { id: 'ROOM_BED', label: 'Rooms & Beds' },
                        { id: 'ICU_CCU', label: 'ICU / CCU' },
                        { id: 'OPERATION_THEATRE', label: 'OT & Surgery' },
                        { id: 'DOCTOR_FEE', label: 'Doctor Fees' },
                        { id: 'NURSING_CARE', label: 'Nursing' },
                        { id: 'DIAGNOSTIC_LAB', label: 'Lab & Tests' },
                        { id: 'PROCEDURE', label: 'Procedures' },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setServiceCategoryFilter(cat.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                            serviceCategoryFilter === cat.id
                              ? 'bg-[#087F8C] text-white shadow-2xs'
                              : 'bg-[#F6F9FB] text-[#567781] hover:text-[#172B34] border border-[#E8EEF2]'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    {/* Search Input */}
                    <input
                      type="text"
                      placeholder="Search facility or procedure..."
                      className="h-8.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs font-medium text-[#172B34] focus:outline-none focus:ring-2 focus:ring-[#087F8C] w-full sm:w-60"
                      value={serviceSearchQuery}
                      onChange={(e) => setServiceSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Services Table */}
                  <div className="border border-[#E8EEF2] rounded-xl overflow-visible shadow-2xs">
                    <div className="overflow-x-auto overflow-y-visible">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#F6F9FB] text-[#567781] font-bold text-[10px] uppercase tracking-wider border-b border-[#E8EEF2]">
                          <tr>
                            <th className="py-3 px-4">Category</th>
                            <th className="py-3 px-4">Facility / Service Name</th>
                            <th className="py-3 px-4">Doctor / Scope</th>
                            <th className="py-3 px-4">HSN/SAC</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Price</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E8EEF2]">
                          {(() => {
                            const filtered = services.filter((s) => {
                              const matchCategory =
                                serviceCategoryFilter === 'ALL' || (s.category || 'PROCEDURE') === serviceCategoryFilter;
                              const matchSearch =
                                !serviceSearchQuery ||
                                s.name.toLowerCase().includes(serviceSearchQuery.toLowerCase()) ||
                                (s.doctorName && s.doctorName.toLowerCase().includes(serviceSearchQuery.toLowerCase()));
                              return matchCategory && matchSearch;
                            });

                            if (filtered.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={7} className="py-8 text-center text-[#567781] text-xs">
                                    No services found matching filter. Add new services above.
                                  </td>
                                </tr>
                              );
                            }

                            return filtered.map((s) => {
                              const catBadge = (() => {
                                switch (s.category) {
                                  case 'ROOM_BED':
                                    return <span className="bg-[#E8EEF2] text-[#172B34] px-2 py-0.5 rounded text-[10px] font-bold">Room / Bed</span>;
                                  case 'ICU_CCU':
                                    return <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-bold">ICU / Critical</span>;
                                  case 'OPERATION_THEATRE':
                                    return <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded text-[10px] font-bold">OT / Surgery</span>;
                                  case 'DOCTOR_FEE':
                                    return <span className="bg-[#087F8C]/10 text-[#087F8C] border border-[#087F8C]/20 px-2 py-0.5 rounded text-[10px] font-bold">Doctor Fee</span>;
                                  case 'NURSING_CARE':
                                    return <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold">Nursing</span>;
                                  case 'DIAGNOSTIC_LAB':
                                    return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">Diagnostic</span>;
                                  default:
                                    return <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold">Procedure</span>;
                                }
                              })();

                              return (
                                <tr key={s.id || s.name} className="hover:bg-[#F6F9FB]/60 transition-colors">
                                  <td className="py-3 px-4">{catBadge}</td>
                                  <td className="py-3 px-4 font-bold text-[#172B34]">
                                    <div>{s.name}</div>
                                    {s.description && <div className="text-[11px] font-normal text-[#567781]">{s.description}</div>}
                                  </td>
                                  <td className="py-3 px-4 text-[#567781]">
                                    {s.doctorName ? (
                                      <span className="font-semibold text-[#172B34]">Dr. {s.doctorName}</span>
                                    ) : (
                                      <span className="italic text-[11px]">General Hospital Rate</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 font-mono text-[#567781] text-[11px]">{s.hsnSacCode || '999312'}</td>
                                  <td className="py-3 px-4">
                                    {s.active !== false ? (
                                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Inactive
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 font-mono font-bold text-[#087F8C] text-right">₹{s.fee}</td>
                                  <td className="py-3 px-4 text-right relative">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditService(s)}
                                        className="h-7 px-2.5 inline-flex items-center gap-1 rounded-lg text-xs font-bold text-[#087F8C] bg-[#087F8C]/10 hover:bg-[#087F8C]/20 transition-colors cursor-pointer"
                                        title="Edit Service & Price"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                        <span>Edit</span>
                                      </button>

                                      {s.id && (
                                        <div className="inline-block text-left">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setActiveServiceActionMenuId(activeServiceActionMenuId === s.id ? null : s.id!);
                                            }}
                                            className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-[#567781] hover:text-[#172B34] hover:bg-[#E8EEF2]/70 transition-colors cursor-pointer"
                                            title="More Actions"
                                          >
                                            <MoreVertical className="w-4 h-4" />
                                          </button>

                                          {activeServiceActionMenuId === s.id && (
                                            <>
                                              <div
                                                className="fixed inset-0 z-40"
                                                onClick={() => setActiveServiceActionMenuId(null)}
                                              />
                                              <div className="absolute right-0 top-8 z-50 w-48 bg-white rounded-xl shadow-lg border border-[#E8EEF2] py-1 text-left text-xs divide-y divide-[#E8EEF2]/60 animate-in fade-in zoom-in-95 duration-100">
                                                <div className="py-0.5">
                                                  <button
                                                    type="button"
                                                    onClick={() => handleOpenEditService(s)}
                                                    className="w-full px-3 py-2 flex items-center gap-2 text-[#087F8C] hover:bg-[#087F8C]/10 font-bold transition-colors cursor-pointer text-left"
                                                  >
                                                    <Edit3 className="w-3.5 h-3.5 shrink-0" />
                                                    <span>Edit Service & Tariff</span>
                                                  </button>
                                                </div>

                                                <div className="py-0.5">
                                                  <button
                                                    type="button"
                                                    onClick={() => handleToggleServiceStatus(s.id!, s.active !== false, s.name)}
                                                    className="w-full px-3 py-2 flex items-center gap-2 text-[#172B34] hover:bg-[#F6F9FB] font-medium transition-colors cursor-pointer text-left"
                                                  >
                                                    {s.active !== false ? (
                                                      <>
                                                        <EyeOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                                        <span>Deactivate Service</span>
                                                      </>
                                                    ) : (
                                                      <>
                                                        <Eye className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                        <span>Activate Service</span>
                                                      </>
                                                    )}
                                                  </button>
                                                </div>

                                                <div className="py-0.5">
                                                  <button
                                                    type="button"
                                                    onClick={() => handleDeleteServicePermanently(s.id!, s.name)}
                                                    className="w-full px-3 py-2 flex items-center gap-2 text-[#D64545] hover:bg-rose-50 font-semibold transition-colors cursor-pointer text-left"
                                                  >
                                                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                                    <span>Delete Permanently</span>
                                                  </button>
                                                </div>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div className="p-2" />
              </div>
            </div>
          )}

          {/* TAB 6: Staff & Security Controls (ADMIN ONLY) */}
          {activeTab === 'security' && ['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN'].includes(user.role?.toUpperCase()) && (
            <div className="space-y-6">
              {/* Security & Access Policies */}
              <div className="border border-[#E8EEF2] bg-white rounded-2xl overflow-hidden shadow-2xs">
                <div className="bg-[#F6F9FB] border-b border-[#E8EEF2] p-5 sm:p-6">
                  <h2 className="text-base font-extrabold text-[#172B34] flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#087F8C]" />
                    <span>Clinic Security & Access Policies</span>
                  </h2>
                  <p className="text-xs font-medium text-[#567781] mt-0.5">
                    Configure inactivity session timeout and receptionist medical record privacy controls.
                  </p>
                </div>
                <div className="p-5 sm:p-6">
                  <form onSubmit={handleSaveClinic} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-[#172B34]">Inactivity Auto-Lock Screen</label>
                        <select
                          className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#087F8C] cursor-pointer"
                          value={sessionTimeoutMinutes}
                          onChange={(e) => setSessionTimeoutMinutes(Number(e.target.value))}
                        >
                          <option value="15">15 Minutes of Inactivity</option>
                          <option value="30">30 Minutes of Inactivity</option>
                          <option value="60">60 Minutes of Inactivity</option>
                          <option value="0">Never (Always keep logged in)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5 flex flex-col justify-end">
                        <label className="flex items-center space-x-2 text-xs font-semibold text-[#172B34] cursor-pointer pb-2.5">
                          <input
                            type="checkbox"
                            className="rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4"
                            checked={receptionistAccessNotes}
                            onChange={(e) => setReceptionistAccessNotes(e.target.checked)}
                          />
                          <span>Allow Receptionists to view Doctor Clinical Notes</span>
                        </label>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        type="submit"
                        className="bg-[#087F8C] hover:bg-[#076b77] text-white rounded-xl font-bold text-xs h-9 px-6 shadow-xs border-0 cursor-pointer"
                        disabled={savingClinic}
                      >
                        {savingClinic ? 'Saving...' : 'Save Security Policies'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Staff Directory & Roles */}
              <div className="border border-[#E8EEF2] bg-white rounded-2xl overflow-visible shadow-2xs space-y-6">
                <div className="bg-[#F6F9FB] border-b border-[#E8EEF2] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-extrabold text-[#172B34] flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-[#087F8C]" />
                      <span>Clinic Staff & Role Management</span>
                    </h2>
                    <p className="text-xs font-medium text-[#567781] mt-0.5">
                      Manage receptionist logins, clinic assistants, and user permissions.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setShowAddStaffModal(true)}
                    className="bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs rounded-xl px-4 h-8.5 border-0 cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    <span>Add Staff User</span>
                  </Button>
                </div>

                <div className="px-5 sm:px-6 pb-6">
                  <div className="border border-[#E8EEF2] rounded-xl overflow-visible shadow-2xs">
                    <div className="overflow-x-auto overflow-y-visible">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#F6F9FB] text-[#567781] font-bold text-[10px] uppercase tracking-wider border-b border-[#E8EEF2]">
                          <tr>
                            <th className="py-3 px-4">Staff Member</th>
                            <th className="py-3 px-4">Email</th>
                            <th className="py-3 px-4">Role</th>
                            <th className="py-3 px-4">Change Role</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E8EEF2]">
                          {staffList.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-[#567781] text-xs">
                                No additional staff members found. Click "Add Staff User" above.
                              </td>
                            </tr>
                          ) : (
                            staffList.map((st) => (
                              <tr key={st.id} className="hover:bg-[#F6F9FB]/60 transition-colors">
                                <td className="py-3 px-4 font-bold text-[#172B34]">{st.name}</td>
                                <td className="py-3 px-4 font-mono text-[#567781]">{st.email}</td>
                                <td className="py-3 px-4">
                                  <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#087F8C]/10 text-[#087F8C] border border-[#087F8C]/20 uppercase">
                                    {st.role}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <select
                                    className="h-7.5 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs font-semibold text-[#172B34] cursor-pointer"
                                    value={st.role}
                                    onChange={(e) => handleRoleChange(st.id, e.target.value)}
                                  >
                                    <option value="RECEPTIONIST">Receptionist</option>
                                    <option value="DOCTOR">Doctor</option>
                                    <option value="ADMIN">Admin</option>
                                  </select>
                                </td>
                                <td className="py-3 px-4 text-right relative">
                                  <div className="inline-block text-left">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveStaffActionMenuId(activeStaffActionMenuId === st.id ? null : st.id);
                                      }}
                                      className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-[#567781] hover:text-[#172B34] hover:bg-[#E8EEF2]/70 transition-colors cursor-pointer"
                                      title="Staff Actions"
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </button>

                                    {activeStaffActionMenuId === st.id && (
                                      <>
                                        <div
                                          className="fixed inset-0 z-40"
                                          onClick={() => setActiveStaffActionMenuId(null)}
                                        />
                                        <div className="absolute right-2 top-8 z-50 w-44 bg-white rounded-xl shadow-lg border border-[#E8EEF2] py-1 text-left text-xs divide-y divide-[#E8EEF2]/60 animate-in fade-in zoom-in-95 duration-100">
                                          <div className="py-0.5">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setResetPasswordStaffUser({ id: st.id, name: st.name });
                                                setNewResetPassword('');
                                                setResetPasswordError(null);
                                                setActiveStaffActionMenuId(null);
                                              }}
                                              className="w-full px-3 py-2 flex items-center gap-2 text-[#172B34] hover:bg-[#F6F9FB] font-medium transition-colors cursor-pointer text-left"
                                            >
                                              <KeyRound className="w-3.5 h-3.5 text-[#087F8C] shrink-0" />
                                              <span>Reset Password</span>
                                            </button>
                                          </div>

                                          <div className="py-0.5">
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteStaff(st.id, st.name)}
                                              className="w-full px-3 py-2 flex items-center gap-2 text-[#D64545] hover:bg-rose-50 font-semibold transition-colors cursor-pointer text-left"
                                            >
                                              <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                              <span>Delete Account</span>
                                            </button>
                                          </div>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Logged-in Devices & Sessions */}
              <div className="border border-[#E8EEF2] bg-white rounded-2xl overflow-hidden shadow-2xs">
                <div className="bg-[#F6F9FB] border-b border-[#E8EEF2] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-extrabold text-[#172B34] flex items-center gap-2">
                      <Laptop className="w-4 h-4 text-[#087F8C]" />
                      <span>Active Logged-in Devices & Sessions</span>
                    </h2>
                    <p className="text-xs font-medium text-[#567781] mt-0.5">
                      Monitor logged-in devices across reception, mobile apps, and clinics.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRevokeAllOtherSessions}
                    className="border-[#D64545]/30 text-[#D64545] hover:bg-rose-50 font-bold text-xs h-8.5 rounded-xl cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-1" />
                    <span>Log Out All Other Devices</span>
                  </Button>
                </div>

                <div className="p-5 sm:p-6 space-y-3">
                  {sessions.length === 0 ? (
                    <div className="p-4 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#087F8C]/10 text-[#087F8C] flex items-center justify-center">
                          <Laptop className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#172B34]">Current Web Browser</span>
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                              This Device (Active)
                            </span>
                          </div>
                          <p className="text-[11px] text-[#567781]">Logged in right now on this workstation</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    sessions.map((sess) => (
                      <div
                        key={sess.id}
                        className="p-3.5 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#087F8C]/10 text-[#087F8C] flex items-center justify-center">
                            {sess.deviceType === 'MOBILE' ? (
                              <Smartphone className="w-5 h-5" />
                            ) : (
                              <Laptop className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#172B34]">
                                {sess.browser || 'Web Browser'} on {sess.operatingSystem || 'Workstation'}
                              </span>
                              {sess.currentSession && (
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                                  This Device (Active)
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#567781]">
                              IP: {sess.ipAddress || 'Local Network'} • Last Active:{' '}
                              {sess.lastActiveAt ? new Date(sess.lastActiveAt).toLocaleString() : 'Just now'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: Dashboard Layout & Widgets Customization Studio */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Header Banner */}
              <div className="border border-[#E8EEF2] bg-white rounded-2xl p-5 sm:p-6 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-[#087F8C]/10 text-[#087F8C] flex items-center justify-center">
                        <SlidersHorizontal className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-base sm:text-lg font-extrabold text-[#172B34]">
                          Dashboard Layout & Widgets Studio
                        </h2>
                        <p className="text-xs font-medium text-[#567781]">
                          Customize which clinical and financial widgets appear on your main operations dashboard.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Link
                      href="/dashboard"
                      className="px-3.5 py-2 rounded-xl border border-[#E8EEF2] bg-[#F6F9FB] text-[#172B34] hover:bg-slate-100 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#087F8C]" />
                      <span>Preview Live Dashboard</span>
                    </Link>

                    <Button
                      type="button"
                      onClick={() => handleSaveDashboardSettings()}
                      disabled={savingDashboard}
                      className="bg-[#087F8C] hover:bg-[#076b77] text-white rounded-xl font-bold text-xs h-9 px-5 shadow-xs border-0 cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{savingDashboard ? 'Saving...' : 'Save Dashboard Layout'}</span>
                    </Button>
                  </div>
                </div>

                {dashboardSuccessMsg && (
                  <div className="mt-4 bg-[#22A06B]/10 border border-[#22A06B]/20 text-[#22A06B] p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#22A06B] shrink-0" />
                    <span>{dashboardSuccessMsg}</span>
                  </div>
                )}
              </div>

              {/* 1. Quick Role-Based Presets */}
              <div className="border border-[#E8EEF2] bg-white rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
                <div>
                  <h3 className="text-sm font-extrabold text-[#172B34] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#087F8C]" />
                    <span>1. One-Click Role Layout Presets</span>
                  </h3>
                  <p className="text-xs font-medium text-[#567781] mt-0.5">
                    Quickly configure the dashboard with optimized views tailored for specific roles.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Doctor Preset */}
                  <button
                    type="button"
                    onClick={() => applyRolePreset('DOCTOR')}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      dashRolePreset === 'DOCTOR'
                        ? 'bg-[#087F8C]/5 border-[#087F8C] shadow-xs'
                        : 'bg-[#F6F9FB] border-[#E8EEF2] hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-[#172B34] flex items-center gap-1.5">
                          <Stethoscope className="w-4 h-4 text-[#087F8C]" />
                          <span>Doctor / Clinical View</span>
                        </span>
                        {dashRolePreset === 'DOCTOR' && (
                          <span className="w-2 h-2 rounded-full bg-[#087F8C]" />
                        )}
                      </div>
                      <p className="text-[11px] text-[#567781] leading-relaxed">
                        Focus on OPD token queue, abnormal vitals alerts, quick prescriptions, and privacy mode ON.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-[#087F8C]">Click to Apply</span>
                  </button>

                  {/* Receptionist Preset */}
                  <button
                    type="button"
                    onClick={() => applyRolePreset('RECEPTIONIST')}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      dashRolePreset === 'RECEPTIONIST'
                        ? 'bg-[#087F8C]/5 border-[#087F8C] shadow-xs'
                        : 'bg-[#F6F9FB] border-[#E8EEF2] hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-[#172B34] flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-[#087F8C]" />
                          <span>Front-Desk / Receptionist</span>
                        </span>
                        {dashRolePreset === 'RECEPTIONIST' && (
                          <span className="w-2 h-2 rounded-full bg-[#087F8C]" />
                        )}
                      </div>
                      <p className="text-[11px] text-[#567781] leading-relaxed">
                        Focus on appointments, walk-in check-ins, cash billing register, and high-density view.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-[#087F8C]">Click to Apply</span>
                  </button>

                  {/* Admin Preset */}
                  <button
                    type="button"
                    onClick={() => applyRolePreset('ADMIN')}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      dashRolePreset === 'ADMIN'
                        ? 'bg-[#087F8C]/5 border-[#087F8C] shadow-xs'
                        : 'bg-[#F6F9FB] border-[#E8EEF2] hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-[#172B34] flex items-center gap-1.5">
                          <BarChart3 className="w-4 h-4 text-[#087F8C]" />
                          <span>Admin / Clinic Owner</span>
                        </span>
                        {dashRolePreset === 'ADMIN' && (
                          <span className="w-2 h-2 rounded-full bg-[#087F8C]" />
                        )}
                      </div>
                      <p className="text-[11px] text-[#567781] leading-relaxed">
                        Full access to revenue analytics, collections breakdown, patient retention, and all modules.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-[#087F8C]">Click to Apply</span>
                  </button>
                </div>
              </div>

              {/* 2. Privacy Mode & Screen Discretion */}
              <div className="border border-[#E8EEF2] bg-white rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-[#172B34] flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[#087F8C]" />
                      <span>2. Privacy & Open-Screen Discretion Mode</span>
                    </h3>
                    <p className="text-xs font-medium text-[#567781] mt-0.5">
                      Mask financial and revenue amounts on open monitors when patients are present in the room.
                    </p>
                  </div>

                  <label className="flex items-center space-x-3 cursor-pointer bg-[#F6F9FB] p-2.5 rounded-xl border border-[#E8EEF2] hover:border-[#087F8C]/50 transition-colors">
                    <input
                      type="checkbox"
                      className="rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4"
                      checked={dashPrivacyMode}
                      onChange={(e) => setDashPrivacyMode(e.target.checked)}
                    />
                    <span className="text-xs font-bold text-[#172B34]">Enable Privacy Mode</span>
                  </label>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-[#567781]">Live Financial Simulation Preview:</span>
                  <span className="font-mono font-bold text-[#172B34] text-sm">
                    {dashPrivacyMode ? '₹ •••••• (Masked)' : '₹ 48,500.00 (Visible)'}
                  </span>
                </div>
              </div>

              {/* 3. Screen Density & Display Sizing */}
              <div className="border border-[#E8EEF2] bg-white rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
                <div>
                  <h3 className="text-sm font-extrabold text-[#172B34] flex items-center gap-2">
                    <Maximize2 className="w-4 h-4 text-[#087F8C]" />
                    <span>3. Display Layout Density</span>
                  </h3>
                  <p className="text-xs font-medium text-[#567781] mt-0.5">
                    Choose how tightly packed or spacious data cards appear on your screen.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label
                    className={`p-3.5 rounded-xl border cursor-pointer flex items-center space-x-3 transition-all ${
                      dashDensity === 'COMPACT'
                        ? 'bg-[#087F8C]/5 border-[#087F8C]'
                        : 'bg-[#F6F9FB] border-[#E8EEF2]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="dashDensity"
                      value="COMPACT"
                      checked={dashDensity === 'COMPACT'}
                      onChange={() => setDashDensity('COMPACT')}
                      className="text-[#087F8C] focus:ring-[#087F8C]"
                    />
                    <div>
                      <strong className="text-xs text-[#172B34] block">Compact (High Density)</strong>
                      <span className="text-[11px] text-[#567781]">Tight margins, fits maximum patients per screen</span>
                    </div>
                  </label>

                  <label
                    className={`p-3.5 rounded-xl border cursor-pointer flex items-center space-x-3 transition-all ${
                      dashDensity === 'COMFORTABLE'
                        ? 'bg-[#087F8C]/5 border-[#087F8C]'
                        : 'bg-[#F6F9FB] border-[#E8EEF2]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="dashDensity"
                      value="COMFORTABLE"
                      checked={dashDensity === 'COMFORTABLE'}
                      onChange={() => setDashDensity('COMFORTABLE')}
                      className="text-[#087F8C] focus:ring-[#087F8C]"
                    />
                    <div>
                      <strong className="text-xs text-[#172B34] block">Comfortable (Standard)</strong>
                      <span className="text-[11px] text-[#567781]">Balanced layout with spacious charts & tables</span>
                    </div>
                  </label>

                  <label
                    className={`p-3.5 rounded-xl border cursor-pointer flex items-center space-x-3 transition-all ${
                      dashDensity === 'TOUCHSCREEN'
                        ? 'bg-[#087F8C]/5 border-[#087F8C]'
                        : 'bg-[#F6F9FB] border-[#E8EEF2]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="dashDensity"
                      value="TOUCHSCREEN"
                      checked={dashDensity === 'TOUCHSCREEN'}
                      onChange={() => setDashDensity('TOUCHSCREEN')}
                      className="text-[#087F8C] focus:ring-[#087F8C]"
                    />
                    <div>
                      <strong className="text-xs text-[#172B34] block">Touchscreen / Tablet</strong>
                      <span className="text-[11px] text-[#567781]">Large touch buttons for iPad and kiosk use</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* 4. Widget Visibility Controls */}
              <div className="border border-[#E8EEF2] bg-white rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
                <div>
                  <h3 className="text-sm font-extrabold text-[#172B34] flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-[#087F8C]" />
                    <span>4. Dashboard Widget Visibility</span>
                  </h3>
                  <p className="text-xs font-medium text-[#567781] mt-0.5">
                    Toggle individual widgets to show or hide them from the main operational view.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* KPI Stat Cards */}
                  <label className="p-3.5 rounded-xl border border-[#E8EEF2] bg-[#F6F9FB] flex items-center justify-between cursor-pointer hover:border-[#087F8C]/50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <Activity className="w-4 h-4 text-[#087F8C]" />
                      <div>
                        <strong className="text-xs text-[#172B34] block">Key Metrics & KPI Overview Cards</strong>
                        <span className="text-[11px] text-[#567781]">Today's patients, appointments, and pending invoices</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={dashShowKpiStats}
                      onChange={(e) => setDashShowKpiStats(e.target.checked)}
                      className="rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4"
                    />
                  </label>

                  {/* Revenue Chart */}
                  <label className="p-3.5 rounded-xl border border-[#E8EEF2] bg-[#F6F9FB] flex items-center justify-between cursor-pointer hover:border-[#087F8C]/50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <IndianRupee className="w-4 h-4 text-[#087F8C]" />
                      <div>
                        <strong className="text-xs text-[#172B34] block">Revenue & Financial Inflow Widget</strong>
                        <span className="text-[11px] text-[#567781]">Daily revenue trends, cash vs UPI vs card breakdown</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={dashShowRevenue}
                      onChange={(e) => setDashShowRevenue(e.target.checked)}
                      className="rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4"
                    />
                  </label>

                  {/* Live OPD Token Queue */}
                  <label className="p-3.5 rounded-xl border border-[#E8EEF2] bg-[#F6F9FB] flex items-center justify-between cursor-pointer hover:border-[#087F8C]/50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-[#087F8C]" />
                      <div>
                        <strong className="text-xs text-[#172B34] block">Live OPD Token Queue Stream</strong>
                        <span className="text-[11px] text-[#567781]">Real-time queue showing waiting and active consultations</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={dashShowOpdQueue}
                      onChange={(e) => setDashShowOpdQueue(e.target.checked)}
                      className="rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4"
                    />
                  </label>

                  {/* Appointments Grid */}
                  <label className="p-3.5 rounded-xl border border-[#E8EEF2] bg-[#F6F9FB] flex items-center justify-between cursor-pointer hover:border-[#087F8C]/50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <CalendarDays className="w-4 h-4 text-[#087F8C]" />
                      <div>
                        <strong className="text-xs text-[#172B34] block">Today's Appointments & Shift Schedule</strong>
                        <span className="text-[11px] text-[#567781]">Doctor time slot grid and booked appointments list</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={dashShowAppointments}
                      onChange={(e) => setDashShowAppointments(e.target.checked)}
                      className="rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4"
                    />
                  </label>

                  {/* Clinical Alerts */}
                  <label className="p-3.5 rounded-xl border border-[#E8EEF2] bg-[#F6F9FB] flex items-center justify-between cursor-pointer hover:border-[#087F8C]/50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <AlertCircle className="w-4 h-4 text-[#087F8C]" />
                      <div>
                        <strong className="text-xs text-[#172B34] block">Abnormal Vitals & Clinical Alerts Tracker</strong>
                        <span className="text-[11px] text-[#567781]">Patients with high blood pressure, fever, or lab flags</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={dashShowClinicalAlerts}
                      onChange={(e) => setDashShowClinicalAlerts(e.target.checked)}
                      className="rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4"
                    />
                  </label>

                  {/* Quick Actions Speed-Dial */}
                  <label className="p-3.5 rounded-xl border border-[#E8EEF2] bg-[#F6F9FB] flex items-center justify-between cursor-pointer hover:border-[#087F8C]/50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <Zap className="w-4 h-4 text-[#087F8C]" />
                      <div>
                        <strong className="text-xs text-[#172B34] block">Clinical Quick Action Speed-Dial</strong>
                        <span className="text-[11px] text-[#567781]">Instant buttons for New Rx, Walk-in, Bill, Certificate</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={dashShowQuickActions}
                      onChange={(e) => setDashShowQuickActions(e.target.checked)}
                      className="rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4"
                    />
                  </label>

                  {/* Recent Patients */}
                  <label className="p-3.5 rounded-xl border border-[#E8EEF2] bg-[#F6F9FB] flex items-center justify-between cursor-pointer hover:border-[#087F8C]/50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <Users2 className="w-4 h-4 text-[#087F8C]" />
                      <div>
                        <strong className="text-xs text-[#172B34] block">Recent Patients & Timeline Stream</strong>
                        <span className="text-[11px] text-[#567781]">Quick access to recent consultations and medical records</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={dashShowRecentPatients}
                      onChange={(e) => setDashShowRecentPatients(e.target.checked)}
                      className="rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4"
                    />
                  </label>

                  {/* Inventory Alerts */}
                  <label className="p-3.5 rounded-xl border border-[#E8EEF2] bg-[#F6F9FB] flex items-center justify-between cursor-pointer hover:border-[#087F8C]/50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <Hospital className="w-4 h-4 text-[#087F8C]" />
                      <div>
                        <strong className="text-xs text-[#172B34] block">Low Stock Pharmacy & Supplies Alert</strong>
                        <span className="text-[11px] text-[#567781]">Warn when critical medicines or consumables are low</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={dashShowInventoryAlerts}
                      onChange={(e) => setDashShowInventoryAlerts(e.target.checked)}
                      className="rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4"
                    />
                  </label>
                </div>
              </div>

              {/* 5. Auto-Refresh & Default Date Range */}
              <div className="border border-[#E8EEF2] bg-white rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
                <div>
                  <h3 className="text-sm font-extrabold text-[#172B34] flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-[#087F8C]" />
                    <span>5. Refresh Frequency & Default Filters</span>
                  </h3>
                  <p className="text-xs font-medium text-[#567781] mt-0.5">
                    Configure real-time polling intervals and initial date ranges for the dashboard.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#172B34]">Live Auto-Refresh Interval</label>
                    <select
                      className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                      value={dashAutoRefreshInterval}
                      onChange={(e) => setDashAutoRefreshInterval(Number(e.target.value))}
                    >
                      <option value={15}>Every 15 Seconds (Ultra Live)</option>
                      <option value={30}>Every 30 Seconds</option>
                      <option value={60}>Every 1 Minute (Recommended)</option>
                      <option value={300}>Every 5 Minutes</option>
                      <option value={0}>Manual Refresh Only</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#172B34]">Default Date Range Filter</label>
                    <select
                      className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                      value={dashDefaultDateRange}
                      onChange={(e) => setDashDefaultDateRange(e.target.value)}
                    >
                      <option value="TODAY">Today Only</option>
                      <option value="THIS_WEEK">This Week</option>
                      <option value="THIS_MONTH">This Month</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => applyRolePreset('DOCTOR')}
                    className="rounded-xl border-[#E8EEF2] text-xs font-bold text-[#567781] hover:text-[#172B34] h-9 px-4 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    <span>Reset to Defaults</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={() => handleSaveDashboardSettings()}
                    disabled={savingDashboard}
                    className="bg-[#087F8C] hover:bg-[#076b77] text-white rounded-xl font-bold text-xs h-9 px-6 shadow-xs border-0 cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{savingDashboard ? 'Saving...' : 'Save Dashboard Preferences'}</span>
                  </Button>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* CREATE RX PRESET MODAL */}
      {showNewTemplateModal && (
        <div className="fixed inset-0 bg-[#172B34]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-[#E8EEF2] p-5 sm:p-6 space-y-5">
            <div className="flex justify-between items-start border-b border-[#E8EEF2] pb-3.5">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#172B34] flex items-center gap-2">
                  <BookmarkPlus className="w-5 h-5 text-[#087F8C]" />
                  <span>Create Rx Quick Preset / Protocol</span>
                </h2>
                <p className="text-xs text-[#567781] font-medium mt-0.5">
                  Save a standardized clinical protocol with diagnosis, medicines, and advice.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowNewTemplateModal(false)}
                className="p-1 text-[#567781] hover:text-[#172B34] rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddRxTemplate} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-[#172B34]">Protocol / Preset Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acute Gastroenteritis Protocol"
                  className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                  value={tplName}
                  onChange={(e) => setTplName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#172B34]">Standard Diagnosis *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acute Gastroenteritis with Mild Dehydration"
                  className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                  value={tplDiagnosis}
                  onChange={(e) => setTplDiagnosis(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#172B34]">Pre-configured Medicines & Dosage *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Tab. Ciprofloxacin 500mg (1-0-1 after food x 5 days)&#10;Sachet ORS (1 sachet in 1L water sips)&#10;Tab. Pantoprazole 40mg (1-0-0 before breakfast x 5 days)"
                  className="w-full p-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C] font-mono"
                  value={tplMeds}
                  onChange={(e) => setTplMeds(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#172B34]">Standard Patient Advice</label>
                <textarea
                  rows={2}
                  placeholder="Drink ORS solution frequently. Eat light bland khichdi/curd rice."
                  className="w-full p-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                  value={tplAdvice}
                  onChange={(e) => setTplAdvice(e.target.value)}
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E8EEF2]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewTemplateModal(false)}
                  className="text-xs font-bold rounded-xl border-[#E8EEF2] text-[#567781] hover:text-[#172B34] cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs rounded-xl px-5 border-0 cursor-pointer shadow-xs shadow-[#087F8C]/20"
                >
                  Save Preset Protocol
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD STAFF USER MODAL */}
      {showAddStaffModal && (
        <div className="fixed inset-0 bg-[#172B34]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#E8EEF2] p-5 sm:p-6 space-y-5">
            <div className="flex justify-between items-start border-b border-[#E8EEF2] pb-3.5">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#172B34] flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-[#087F8C]" />
                  <span>Add Staff Member</span>
                </h2>
                <p className="text-xs text-[#567781] font-medium mt-0.5">Register login credentials for reception or staff.</p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddStaffModal(false)}
                className="p-1 text-[#567781] hover:text-[#172B34] rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {staffModalError && (
              <div className="p-3 bg-[#D64545]/10 text-[#D64545] border border-[#D64545]/20 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{staffModalError}</span>
              </div>
            )}

            <form onSubmit={handleAddStaff} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-[#172B34]">Staff Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patil"
                  className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#172B34]">Email Address (Login Username) *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. reception@clinic.com"
                  className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#172B34]">Login Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                  value={newStaffPassword}
                  onChange={(e) => setNewStaffPassword(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#172B34]">Mobile Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                  value={newStaffPhone}
                  onChange={(e) => setNewStaffPhone(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#172B34]">Assign Role *</label>
                <select
                  className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#087F8C] cursor-pointer"
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value)}
                >
                  <option value="RECEPTIONIST">Receptionist</option>
                  <option value="DOCTOR">Doctor</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E8EEF2]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddStaffModal(false)}
                  className="text-xs font-bold rounded-xl border-[#E8EEF2] text-[#567781] hover:text-[#172B34] cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingStaff}
                  className="bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs rounded-xl px-5 border-0 cursor-pointer shadow-xs shadow-[#087F8C]/20"
                >
                  {savingStaff ? 'Registering...' : 'Create Staff Member'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET STAFF PASSWORD MODAL */}
      {resetPasswordStaffUser && (
        <div className="fixed inset-0 bg-[#172B34]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#E8EEF2] p-5 sm:p-6 space-y-5">
            <div className="flex justify-between items-start border-b border-[#E8EEF2] pb-3.5">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#172B34] flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-[#087F8C]" />
                  <span>Reset Staff Password</span>
                </h2>
                <p className="text-xs text-[#567781] font-medium mt-0.5">
                  Assign a new login password for <strong>{resetPasswordStaffUser.name}</strong>.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setResetPasswordStaffUser(null);
                  setNewResetPassword('');
                  setResetPasswordError(null);
                }}
                className="p-1 text-[#567781] hover:text-[#172B34] rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetPasswordError && (
              <div className="p-3 bg-[#D64545]/10 text-[#D64545] border border-[#D64545]/20 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{resetPasswordError}</span>
              </div>
            )}

            <form onSubmit={handleResetStaffPasswordSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-[#172B34]">New Login Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                />
                <p className="text-[10px] text-[#567781]">The staff member will use this password on their next login.</p>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E8EEF2]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setResetPasswordStaffUser(null);
                    setNewResetPassword('');
                    setResetPasswordError(null);
                  }}
                  className="text-xs font-bold rounded-xl border-[#E8EEF2] text-[#567781] hover:text-[#172B34] cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingResetPassword}
                  className="bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs rounded-xl px-5 border-0 cursor-pointer shadow-xs shadow-[#087F8C]/20"
                >
                  {savingResetPassword ? 'Updating...' : 'Set New Password'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT HOSPITAL SERVICE & TARIFF MODAL */}
      {isEditServiceModalOpen && (
        <div className="fixed inset-0 bg-[#172B34]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#E8EEF2] p-5 sm:p-6 space-y-5">
            <div className="flex justify-between items-start border-b border-[#E8EEF2] pb-3.5">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#172B34] flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-[#087F8C]" />
                  <span>Edit Hospital Service & Tariff</span>
                </h2>
                <p className="text-xs text-[#567781] font-medium mt-0.5">
                  Update service item name, standard fee, category department, and doctor assignment.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsEditServiceModalOpen(false)}
                className="p-1 text-[#567781] hover:text-[#172B34] rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedService} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-[#172B34]">Service / Facility Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deluxe AC Room, CBC Profile"
                  className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                  value={editServiceName}
                  onChange={(e) => setEditServiceName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="font-bold text-[#172B34]">Department / Category *</label>
                  <select
                    className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs font-semibold text-[#172B34] focus:outline-none focus:ring-2 focus:ring-[#087F8C] cursor-pointer"
                    value={editServiceCategory}
                    onChange={(e) => setEditServiceCategory(e.target.value)}
                  >
                    <option value="ROOM_BED">Rooms & Inpatient Beds</option>
                    <option value="ICU_CCU">ICU / Critical Care</option>
                    <option value="OPERATION_THEATRE">Operation Theatre & Surgery</option>
                    <option value="DOCTOR_FEE">Doctor Consultation & Rounds</option>
                    <option value="NURSING_CARE">Nursing Care & Daycare</option>
                    <option value="DIAGNOSTIC_LAB">Diagnostics & Pathology Lab</option>
                    <option value="PROCEDURE">Clinical Procedures & Daycare</option>
                    <option value="OTHER">Other Hospital Services</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-[#172B34]">Standard Tariff Rate (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 1500"
                    className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-extrabold focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                    value={editServiceFee}
                    onChange={(e) => setEditServiceFee(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="font-bold text-[#172B34]">Doctor-Specific Override</label>
                  <select
                    className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs font-medium text-[#172B34] focus:outline-none focus:ring-2 focus:ring-[#087F8C] cursor-pointer"
                    value={editServiceDoctorId}
                    onChange={(e) => setEditServiceDoctorId(e.target.value)}
                  >
                    <option value="">General Hospital Standard (All Doctors)</option>
                    {clinicDoctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        Dr. {doc.name} ({doc.specialization || 'Consultant'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-[#172B34]">HSN / SAC Code</label>
                  <input
                    type="text"
                    placeholder="999312 (Healthcare)"
                    className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                    value={editServiceHsnCode}
                    onChange={(e) => setEditServiceHsnCode(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#172B34]">Description / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Daily charges including oxygen and basic vitals"
                  className="w-full h-9.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                  value={editServiceDescription}
                  onChange={(e) => setEditServiceDescription(e.target.value)}
                />
              </div>

              <div className="pt-1">
                <label className="p-3 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] flex items-center justify-between cursor-pointer hover:border-[#087F8C]/40 transition-colors">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-[#172B34] block">Active in Billing & Prescriptions</span>
                    <span className="text-[11px] text-[#567781] block">When active, this service can be billed at checkout</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={editServiceActive}
                    onChange={(e) => setEditServiceActive(e.target.checked)}
                    className="rounded border-[#E8EEF2] text-[#087F8C] focus:ring-[#087F8C] w-4 h-4 cursor-pointer"
                  />
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E8EEF2]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditServiceModalOpen(false)}
                  className="text-xs font-bold rounded-xl border-[#E8EEF2] text-[#567781] hover:text-[#172B34] cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingEditService}
                  className="bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs rounded-xl px-5 border-0 cursor-pointer shadow-xs shadow-[#087F8C]/20"
                >
                  {savingEditService ? 'Saving...' : 'Update Service & Tariff'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Document Live Preview Modal (Prescription & Tax Invoice) */}
      <DocumentPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        defaultDocType={previewDocType}
        clinic={{
          name: clinicName,
          email: clinicEmail,
          phone: clinicPhone,
          emergencyPhone,
          tagline,
          address: clinicAddress,
          city,
          state,
          pincode,
          logoUrl,
          gstNumber,
          registrationNumber,
          taxPercentage: taxPercentage === '' ? 0 : Number(taxPercentage),
          upiId,
        }}
        doctor={{
          id: selectedDoctorId || user?.id,
          name: docName || name,
          phone: docPhone || phone,
          specialization,
          subSpecialization,
          registrationNumber: doctorRegNumber,
          medicalCouncil,
          registrationYear: registrationYear ? Number(registrationYear) : undefined,
          languagesSpoken,
          roomNumber,
          slotDuration: doctorSlotDuration ? Number(doctorSlotDuration) : 15,
          digitalSignature: doctorDigitalSignature || digitalSignatureUrl,
          consultationFee: consultationFee ? Number(consultationFee) : 500,
          followUpFee: followUpFee ? Number(followUpFee) : 300,
          emergencyFee: emergencyFee ? Number(emergencyFee) : 1000,
          qualification,
          experienceYears: experienceYears ? Number(experienceYears) : 0,
          biography,
        }}
        settings={{
          headerText,
          footerText,
          digitalSignatureUrl: digitalSignatureUrl || doctorDigitalSignature,
          watermarkUrl,
          printMarginMm: Number(printMarginMm) || 10,
          topMarginMm: Number(topMarginMm) || 35,
          letterheadMode,
          paperSize,
          showLogo,
          enableQrCode,
          showVitals,
          showComplaints,
          showDiagnosis,
          showMedicines,
          showLabTests,
          showAdvice,
          showFollowUp,
          showSignature,
          defaultAdvice,
          rxTemplates: JSON.stringify(rxTemplates),
          quickAdviceList: quickAdviceList.join('\n'),
          // Discharge Summary
          dischargeHeaderTitle,
          dischargeShowHospitalCourse,
          dischargeShowInvestigations,
          dischargeShowDietActivity,
          dischargeShowEmergencyWarning,
          dischargeShowAttendantSignature,
          defaultDischargeEmergencyNotes,
          defaultDischargeDietNotes,
          // Consultation Report
          consultationReportTitle,
          consultationShowVitals,
          consultationShowSystemicExam,
          consultationShowInvestigations,
          consultationShowReferralNotes,
          defaultConsultationDisclaimer,
          // Medical Certificate
          medicalCertTitle,
          medicalCertCouncilAuthority,
          defaultMedicalCertRemarks,
          medicalCertShowSeal,
        }}
      />
    </div>
  );
}
