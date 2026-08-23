'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
import { Doctor, ClinicServiceItem, PrescriptionSettings } from '@/types';
import ImageUploadButton from '@/components/image-upload-button';
import { EMRPrintDocument, EMRPrintMode } from '@/components/emr-print-document';
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
  Calendar,
  DollarSign,
  Plus,
  Trash2,
  MapPin,
  Globe,
  Clock,
  FileSignature,
  UserPlus,
  X,
  Hospital,
  UserCheck,
  IndianRupee,
  FileText,
  SlidersHorizontal,
  Star,
  ArrowUp,
  ArrowDown,
  RotateCcw
} from 'lucide-react';

interface AxiosErrorLike {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
  };
  message?: string;
}

interface Clinic {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
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
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'account' | 'clinic' | 'professional' | 'doctors' | 'services' | 'prescription' | 'staff' | 'dashboard'>('account');

  // Account Settings state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountSuccess, setAccountSuccess] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  // Professional Settings state (Doctors only)
  const [specialization, setSpecialization] = useState('');
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

  // Dashboard Cards Customization & Reordering State
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

  // Clinic Settings state (Admin only)
  const [clinicName, setClinicName] = useState('');
  const [clinicEmail, setClinicEmail] = useState('');
  const [clinicPhone, setClinicPhone] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
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
  const [enableQrCode, setEnableQrCode] = useState<boolean>(true);
  const [defaultAdvice, setDefaultAdvice] = useState('');
  const [previewMode, setPreviewMode] = useState<EMRPrintMode>('EMR_CASE_SHEET');
  const [previewAccentColor, setPreviewAccentColor] = useState<string>('#0d9488');
  const [savingPrescription, setSavingPrescription] = useState(false);
  const [prescriptionSuccess, setPrescriptionSuccess] = useState(false);
  const [prescriptionError, setPrescriptionError] = useState<string | null>(null);

  // Services Directory state
  const [services, setServices] = useState<ClinicServiceItem[]>([]);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceFee, setNewServiceFee] = useState<string>('0');
  const [savingService, setSavingService] = useState(false);
  const [serviceSuccess, setServiceSuccess] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);

  // Doctors Directory state (Admin only)
  const [doctorsList, setDoctorsList] = useState<Doctor[]>([]);
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocEmail, setNewDocEmail] = useState('');
  const [newDocPassword, setNewDocPassword] = useState('');
  const [newDocPhone, setNewDocPhone] = useState('');
  const [newDocSpecialization, setNewDocSpecialization] = useState('');
  const [newDocFee, setNewDocFee] = useState<string>('500');
  const [newDocQualification, setNewDocQualification] = useState('');
  const [newDocExperience, setNewDocExperience] = useState<string>('0');
  const [newDocBio, setNewDocBio] = useState('');
  const [newDocSchedule, setNewDocSchedule] = useState('');
  const [savingDoc, setSavingDoc] = useState(false);
  const [docModalError, setDocModalError] = useState<string | null>(null);

  // Staff & Roles state
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('RECEPTIONIST');
  const [savingStaff, setSavingStaff] = useState(false);
  const [staffModalError, setStaffModalError] = useState<string | null>(null);

  const [loadingData, setLoadingData] = useState(true);

  // Move card up in custom order
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

  // Move card down in custom order
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

  // Toggle card visibility checkbox
  const toggleVisibleCard = (cardId: string) => {
    let newVisible: string[];
    if (dashboardVisibleCards.includes(cardId)) {
      if (dashboardVisibleCards.length <= 1) {
        alert('At least one dashboard card must remain visible.');
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

  // Toggle Favorite Star
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

  // Reset to default dashboard arrangement
  const resetDashboardCardsToDefault = () => {
    setDashboardCardOrder(DEFAULT_CARD_ORDER);
    setDashboardVisibleCards(DEFAULT_CARD_ORDER);
    setDashboardFavoriteCards(DEFAULT_FAVORITE_CARDS);
    localStorage.removeItem('clinic_dashboard_cards_order');
    localStorage.removeItem('clinic_dashboard_visible_cards');
    localStorage.removeItem('clinic_dashboard_favorite_cards');
    setDashboardSuccessMsg('Dashboard cards restored to default clinical overview layout!');
    setTimeout(() => setDashboardSuccessMsg(null), 3000);
  };

  const triggerDashboardSaveNotification = () => {
    setDashboardSuccessMsg('Dashboard custom arrangement saved! Changes will reflect on your main dashboard.');
    setTimeout(() => setDashboardSuccessMsg(null), 3000);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        if (user) {
          setName(user.name || '');
          setPhone(user.phone || '');
          setProfilePictureUrl(user.profilePictureUrl || '');
        }

        // Fetch clinic details
        try {
          const clinicRes = await apiClient.get<Clinic>('/clinics/me');
          if (clinicRes.data) {
            setClinicName(clinicRes.data.name || '');
            setClinicEmail(clinicRes.data.email || '');
            setClinicPhone(clinicRes.data.phone || '');
            setClinicAddress(clinicRes.data.address || '');
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
            setEnableQrCode(presRes.data.enableQrCode ?? true);
            setDefaultAdvice(presRes.data.defaultAdvice || '');
          }
        } catch {}

        // Fetch doctor professional info if user is Doctor
        if (user && user.role === 'DOCTOR') {
          try {
            const docRes = await apiClient.get<Doctor>(`/doctors/${user.id}`);
            if (docRes.data) {
              setSpecialization(docRes.data.specialization || '');
              setConsultationFee(docRes.data.consultationFee !== undefined ? String(docRes.data.consultationFee) : '500');
              setFollowUpFee(docRes.data.followUpFee !== undefined ? String(docRes.data.followUpFee) : '300');
              setEmergencyFee(docRes.data.emergencyFee !== undefined ? String(docRes.data.emergencyFee) : '1000');
              setQualification(docRes.data.qualification || '');
              setExperienceYears(docRes.data.experienceYears !== undefined ? String(docRes.data.experienceYears) : '0');
              setBiography(docRes.data.biography || '');
              setAvailabilitySchedule(docRes.data.availabilitySchedule || '');
            }
          } catch {}
        }

        // Fetch services
        try {
          const servRes = await apiClient.get<ClinicServiceItem[]>('/services?includeInactive=true');
          setServices(servRes.data || []);
        } catch {}

        // Fetch doctors list for admin
        if (user && ['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN'].includes(user.role?.toUpperCase())) {
          try {
            const docListRes = await apiClient.get<Doctor[]>('/doctors');
            setDoctorsList(docListRes.data || []);
          } catch {}

          try {
            const staffRes = await apiClient.get<StaffMember[]>('/users/staff');
            setStaffList(staffRes.data || []);
          } catch {}
        }
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [user]);

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAccount(true);
    setAccountSuccess(false);
    setAccountError(null);

    try {
      const updateData: { name: string; phone: string; profilePictureUrl: string; password?: string } = {
        name,
        phone,
        profilePictureUrl
      };
      if (password.trim()) {
        updateData.password = password;
      }

      await apiClient.put('/users/me', updateData);
      
      const meRes = await apiClient.get('/users/me');
      localStorage.setItem('user', JSON.stringify(meRes.data));

      setAccountSuccess(true);
      setPassword('');

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      setAccountError((err as AxiosErrorLike)?.response?.data?.message || (err as AxiosErrorLike)?.message || 'Failed to update account settings');
    } finally {
      setSavingAccount(false);
    }
  };

  const handleSaveProfessional = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfessional(true);
    setProfessionalSuccess(false);
    setProfessionalError(null);

    try {
      await apiClient.put(`/doctors/${user.id}`, {
        name,
        phone,
        specialization,
        consultationFee: consultationFee === '' ? 0 : Number(consultationFee),
        followUpFee: followUpFee === '' ? 0 : Number(followUpFee),
        emergencyFee: emergencyFee === '' ? 0 : Number(emergencyFee),
        qualification,
        experienceYears: experienceYears === '' ? 0 : Number(experienceYears),
        biography,
        availabilitySchedule
      });
      setProfessionalSuccess(true);
    } catch (err) {
      setProfessionalError((err as AxiosErrorLike)?.response?.data?.message || (err as AxiosErrorLike)?.message || 'Failed to update professional settings');
    } finally {
      setSavingProfessional(false);
    }
  };

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
        address: clinicAddress,
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
        maxPatientsPerDay: maxPatientsPerDay === '' ? 100 : Number(maxPatientsPerDay)
      });
      setClinicSuccess(true);
    } catch (err) {
      setClinicError((err as AxiosErrorLike)?.response?.data?.message || (err as AxiosErrorLike)?.message || 'Failed to update clinic directory settings');
    } finally {
      setSavingClinic(false);
    }
  };

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
        enableQrCode,
        defaultAdvice
      });
      setPrescriptionSuccess(true);
    } catch (err) {
      setPrescriptionError((err as AxiosErrorLike)?.response?.data?.message || (err as AxiosErrorLike)?.message || 'Failed to save prescription settings');
    } finally {
      setSavingPrescription(false);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;
    setSavingService(true);
    setServiceSuccess(false);
    setServiceError(null);

    try {
      await apiClient.post('/services', {
        name: newServiceName,
        fee: newServiceFee === '' ? 0 : Number(newServiceFee)
      });
      setNewServiceName('');
      setNewServiceFee('0');
      setServiceSuccess(true);
      
      const servRes = await apiClient.get<ClinicServiceItem[]>('/services?includeInactive=true');
      setServices(servRes.data);
    } catch (err) {
      setServiceError((err as AxiosErrorLike)?.response?.data?.message || (err as AxiosErrorLike)?.message || 'Failed to add service item');
    } finally {
      setSavingService(false);
    }
  };

  const handleDeleteService = async (id: string) => {
    try {
      await apiClient.delete(`/services/${id}`);
      const servRes = await apiClient.get<ClinicServiceItem[]>('/services?includeInactive=true');
      setServices(servRes.data);
    } catch (err) {
      console.error('Failed to disable service item', err);
    }
  };

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
    } finally {
      setSavingStaff(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await apiClient.patch(`/users/staff/${userId}/role?roleId=${newRole}`);
      const res = await apiClient.get<StaffMember[]>('/users/staff');
      setStaffList(res.data);
    } catch (err) {
      console.error('Failed to change staff role', err);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-screen">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-3 text-sm text-slate-500 font-bold">Verifying authorization session...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. EXECUTIVE HEADER BANNER (Harmonized with Patients, Appointments, and Doctors Pages) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2.5 bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 rounded-2xl border border-teal-100 dark:border-teal-800">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Clinic & System Settings
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Configure account credentials, clinic metadata, EMR prescription studio, billable services, and staff roles.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-650 dark:text-slate-300 flex items-center gap-2">
            <Shield className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Role: <strong className="text-slate-900 dark:text-white uppercase">{user.role}</strong></span>
          </div>
        </div>
      </div>

      {/* 2. TAB NAVIGATION BAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-2 rounded-2xl shadow-xs flex items-center gap-2 overflow-x-auto custom-scrollbar">
        <button
          type="button"
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'account'
              ? 'bg-teal-600 text-white shadow-xs font-extrabold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          onClick={() => setActiveTab('account')}
        >
          <User className="w-3.5 h-3.5" />
          <span>Account Settings</span>
        </button>

        <button
          type="button"
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'dashboard'
              ? 'bg-teal-600 text-white shadow-xs font-extrabold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          onClick={() => setActiveTab('dashboard')}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Dashboard Cards & Layout</span>
        </button>

        {['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN'].includes(user.role?.toUpperCase()) && (
          <>
            <button
              type="button"
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'clinic'
                  ? 'bg-teal-600 text-white shadow-xs font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              onClick={() => setActiveTab('clinic')}
            >
              <Hospital className="w-3.5 h-3.5" />
              <span>Clinic Profile</span>
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'services'
                  ? 'bg-teal-600 text-white shadow-xs font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              onClick={() => setActiveTab('services')}
            >
              <IndianRupee className="w-3.5 h-3.5" />
              <span>Services & Fees</span>
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'staff'
                  ? 'bg-teal-600 text-white shadow-xs font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              onClick={() => setActiveTab('staff')}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Staff & Roles</span>
            </button>
          </>
        )}

        {user.role === 'DOCTOR' && (
          <button
            type="button"
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'professional'
                ? 'bg-teal-600 text-white shadow-xs font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            onClick={() => setActiveTab('professional')}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Professional Details</span>
          </button>
        )}

        {(user.role === 'ADMIN' || user.role === 'DOCTOR') && (
          <button
            type="button"
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'prescription'
                ? 'bg-teal-600 text-white shadow-xs font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            onClick={() => setActiveTab('prescription')}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Prescription Studio</span>
          </button>
        )}
      </div>

      {loadingData ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs">
          <div className="w-8 h-8 border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-bold">Syncing profile record sheets...</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* TAB 1: Account Settings */}
          {activeTab === 'account' && (
            <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-xs">
              <CardHeader className="bg-slate-50/70 dark:bg-slate-850/50 border-b border-slate-100 dark:border-slate-800 p-6">
                <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-teal-600 dark:text-teal-400" /> Personal Account details
                </CardTitle>
                <CardDescription className="text-xs font-semibold text-slate-400">
                  Update your contact details, profile image, and user login password credentials
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 sm:p-8">
                <form onSubmit={handleSaveAccount} className="space-y-5">
                  {accountSuccess && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 p-4 rounded-xl text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Account details updated successfully! Reloading configuration...
                    </div>
                  )}

                  {accountError && (
                    <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-4 rounded-xl text-xs font-semibold flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <div>{accountError}</div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="accountName" className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Full Name *
                      </label>
                      <input
                        id="accountName"
                        type="text"
                        required
                        className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={savingAccount}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="accountEmail" className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Email Address (Read-Only)
                      </label>
                      <input
                        id="accountEmail"
                        type="email"
                        disabled
                        className="w-full h-10 px-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 rounded-xl text-xs cursor-not-allowed font-semibold"
                        value={user.email}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="accountPhone" className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Contact Phone Number
                      </label>
                      <input
                        id="accountPhone"
                        type="text"
                        className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={savingAccount}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="accountPassword" className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Key className="w-3.5 h-3.5 text-slate-400" /> New Password (Optional)
                      </label>
                      <input
                        id="accountPassword"
                        type="password"
                        className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        placeholder="Leave blank to keep unchanged"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={savingAccount}
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1.5">
                      <label htmlFor="profilePictureUrl" className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Profile Picture Image
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="profilePictureUrl"
                          type="text"
                          className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          placeholder="https://example.com/avatar.jpg"
                          value={profilePictureUrl}
                          onChange={(e) => setProfilePictureUrl(e.target.value)}
                          disabled={savingAccount}
                        />
                        <ImageUploadButton onUploadComplete={(url) => setProfilePictureUrl(url)} disabled={savingAccount} />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      type="submit"
                      className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-xs h-10 px-6 shadow-xs border-0 cursor-pointer"
                      disabled={savingAccount}
                    >
                      {savingAccount ? 'Saving Account...' : 'Save Account Settings'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* TAB 2: Clinic Settings (ADMIN ONLY) */}
          {activeTab === 'clinic' && user.role === 'ADMIN' && (
            <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-xs">
              <CardHeader className="bg-slate-50/70 dark:bg-slate-850/50 border-b border-slate-100 dark:border-slate-800 p-6">
                <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building className="w-4 h-4 text-teal-600 dark:text-teal-400" /> Clinic Profile & Operations Configuration
                </CardTitle>
                <CardDescription className="text-xs font-semibold text-slate-400">
                  Update your clinic metadata, registration credentials, operating schedules, timezone, and slot duration rules.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 sm:p-8">
                <form onSubmit={handleSaveClinic} className="space-y-6">
                  {clinicSuccess && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 p-4 rounded-xl text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Clinic Profile configuration saved successfully!
                    </div>
                  )}

                  {clinicError && (
                    <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-4 rounded-xl text-xs font-semibold flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <div>{clinicError}</div>
                    </div>
                  )}

                  {/* Basic Metadata */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1 flex items-center gap-2">
                      <Info className="w-3.5 h-3.5 text-teal-500" /> Identity & Registration
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Clinic Practice Name *
                        </label>
                        <input
                          type="text"
                          required
                          className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          value={clinicName}
                          onChange={(e) => setClinicName(e.target.value)}
                          disabled={savingClinic}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Clinic Contact Email
                        </label>
                        <input
                          type="email"
                          required
                          className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          value={clinicEmail}
                          onChange={(e) => setClinicEmail(e.target.value)}
                          disabled={savingClinic}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Clinic Contact Phone
                        </label>
                        <input
                          type="text"
                          required
                          className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          value={clinicPhone}
                          onChange={(e) => setClinicPhone(e.target.value)}
                          disabled={savingClinic}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Clinic Logo Image
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            placeholder="https://example.com/logo.png"
                            value={logoUrl}
                            onChange={(e) => setLogoUrl(e.target.value)}
                            disabled={savingClinic}
                          />
                          <ImageUploadButton onUploadComplete={(url) => setLogoUrl(url)} disabled={savingClinic} />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Registration Number / Lic.
                        </label>
                        <input
                          type="text"
                          className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          placeholder="e.g. REG-98471"
                          value={registrationNumber}
                          onChange={(e) => setRegistrationNumber(e.target.value)}
                          disabled={savingClinic}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          GST Number (Optional)
                        </label>
                        <input
                          type="text"
                          className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          placeholder="e.g. 27AAAAA0000A1Z"
                          value={gstNumber}
                          onChange={(e) => setGstNumber(e.target.value)}
                          disabled={savingClinic}
                        />
                      </div>

                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5 text-slate-400" /> Website Address Link
                        </label>
                        <input
                          type="text"
                          className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          placeholder="https://www.nisschayclinic.com"
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                          disabled={savingClinic}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" /> Google Maps Link
                        </label>
                        <input
                          type="text"
                          className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          placeholder="https://maps.app.goo.gl/..."
                          value={googleMapsLink}
                          onChange={(e) => setGoogleMapsLink(e.target.value)}
                          disabled={savingClinic}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Clinic Physical Address *
                      </label>
                      <textarea
                        rows={2}
                        required
                        className="w-full p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        value={clinicAddress}
                        onChange={(e) => setClinicAddress(e.target.value)}
                        disabled={savingClinic}
                      />
                    </div>
                  </div>

                  {/* Localization & Region configs */}
                  <div className="space-y-4 pt-2">
                    <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1 flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-teal-500" /> Locale & Region Configuration
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Time Zone
                        </label>
                        <select
                          className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                        >
                          <option value="Asia/Kolkata">Asia/Kolkata (IST - India)</option>
                          <option value="UTC">UTC (Greenwich Mean Time)</option>
                          <option value="America/New_York">America/New_York (EST)</option>
                          <option value="Europe/London">Europe/London (BST)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Currency Symbol
                        </label>
                        <select
                          className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                        >
                          <option value="₹">Rupee (₹)</option>
                          <option value="$">Dollar ($)</option>
                          <option value="€">Euro (€)</option>
                          <option value="£">Pound (£)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Clinic Language
                        </label>
                        <select
                          className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                        >
                          <option value="en">English (en)</option>
                          <option value="hi">Hindi (hi)</option>
                          <option value="mr">Marathi (mr)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Appointment scheduler settings */}
                  <div className="space-y-4 pt-2">
                    <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-teal-500" /> Appointment Slots & Rules
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Slot Duration (Minutes)
                        </label>
                        <select
                          className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                          value={appointmentSlotDuration}
                          onChange={(e) => setAppointmentSlotDuration(Number(e.target.value))}
                        >
                          <option value="10">10 Minutes</option>
                          <option value="15">15 Minutes</option>
                          <option value="20">20 Minutes</option>
                          <option value="30">30 Minutes</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Max Patients per Day
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                          value={maxPatientsPerDay}
                          onChange={(e) => setMaxPatientsPerDay(e.target.value.replace(/[^0-9]/g, ''))}
                        />
                      </div>

                      <div className="flex items-center h-16 pt-4">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="w-4.5 h-4.5 text-teal-600 rounded-md border-slate-300 dark:border-slate-700 focus:ring-teal-500"
                            checked={walkInEnabled}
                            onChange={(e) => setWalkInEnabled(e.target.checked)}
                          />
                          <span className="text-xs font-bold text-slate-655 dark:text-slate-300 uppercase tracking-wide">Walk-In queues Allowed</span>
                        </label>
                      </div>

                      <div className="flex items-center h-16 pt-4">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="w-4.5 h-4.5 text-teal-600 rounded-md border-slate-300 dark:border-slate-700 focus:ring-teal-500"
                            checked={doubleBookingAllowed}
                            onChange={(e) => setDoubleBookingAllowed(e.target.checked)}
                          />
                          <span className="text-xs font-bold text-slate-655 dark:text-slate-300 uppercase tracking-wide">Double Booking Allowed</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <Button
                      type="submit"
                      className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-xs h-10 px-6 shadow-xs border-0 cursor-pointer"
                      disabled={savingClinic}
                    >
                      {savingClinic ? 'Saving Clinic settings...' : 'Save Clinic Profile'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* TAB 3: Professional EMR details (DOCTOR ONLY) */}
          {activeTab === 'professional' && user.role === 'DOCTOR' && (
            <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-xs">
              <CardHeader className="bg-slate-50/70 dark:bg-slate-850/50 border-b border-slate-100 dark:border-slate-800 p-6">
                <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-teal-600 dark:text-teal-400" /> Professional EMR & Consultation Settings
                </CardTitle>
                <CardDescription className="text-xs font-semibold text-slate-400">
                  Manage your clinical specialization details, consultation pricing fees, bio, and weekly schedules
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 sm:p-8">
                <form onSubmit={handleSaveProfessional} className="space-y-5">
                  {professionalSuccess && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 p-4 rounded-xl text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Professional details updated successfully!
                    </div>
                  )}

                  {professionalError && (
                    <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-4 rounded-xl text-xs font-semibold flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <div>{professionalError}</div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="specialization" className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Medical Specialization *
                      </label>
                      <input
                        id="specialization"
                        type="text"
                        required
                        className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        placeholder="e.g. General Physician, Pediatrician"
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        disabled={savingProfessional}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="consultationFee" className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <IndianRupee className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> Consultation Fee (₹) *
                      </label>
                      <input
                        id="consultationFee"
                        type="text"
                        inputMode="numeric"
                        required
                        className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        value={consultationFee}
                        onChange={(e) => setConsultationFee(e.target.value.replace(/[^0-9]/g, ''))}
                        disabled={savingProfessional}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="followUpFee" className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <IndianRupee className="w-3.5 h-3.5 text-amber-500" /> Follow-Up Fee (₹)
                      </label>
                      <input
                        id="followUpFee"
                        type="text"
                        inputMode="numeric"
                        className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        placeholder="e.g. 300"
                        value={followUpFee}
                        onChange={(e) => setFollowUpFee(e.target.value.replace(/[^0-9]/g, ''))}
                        disabled={savingProfessional}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="emergencyFee" className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <IndianRupee className="w-3.5 h-3.5 text-rose-500" /> Emergency Fee (₹)
                      </label>
                      <input
                        id="emergencyFee"
                        type="text"
                        inputMode="numeric"
                        className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        placeholder="e.g. 1000"
                        value={emergencyFee}
                        onChange={(e) => setEmergencyFee(e.target.value.replace(/[^0-9]/g, ''))}
                        disabled={savingProfessional}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="qualification" className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Qualifications / Degrees
                      </label>
                      <input
                        id="qualification"
                        type="text"
                        className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        placeholder="e.g. MBBS, MD"
                        value={qualification}
                        onChange={(e) => setQualification(e.target.value)}
                        disabled={savingProfessional}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="experienceYears" className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Practice Experience (Years)
                      </label>
                      <input
                        id="experienceYears"
                        type="text"
                        inputMode="numeric"
                        className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                        value={experienceYears}
                        onChange={(e) => setExperienceYears(e.target.value.replace(/[^0-9]/g, ''))}
                        disabled={savingProfessional}
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1.5">
                      <label htmlFor="schedule" className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" /> Availability Schedule Text
                      </label>
                      <input
                        id="schedule"
                        type="text"
                        className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="e.g. Mon-Fri: 10:00 AM - 02:00 PM"
                        value={availabilitySchedule}
                        onChange={(e) => setAvailabilitySchedule(e.target.value)}
                        disabled={savingProfessional}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="bio" className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-slate-400" /> Doctor Biography & Summary
                    </label>
                    <textarea
                      id="bio"
                      rows={3}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="Write a brief professional background description..."
                      value={biography}
                      onChange={(e) => setBiography(e.target.value)}
                      disabled={savingProfessional}
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      type="submit"
                      className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-xs h-10 px-6 shadow-xs border-0 cursor-pointer"
                      disabled={savingProfessional}
                    >
                      {savingProfessional ? 'Saving EMR Settings...' : 'Save EMR Settings'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* TAB 4: Services Directory Settings */}
          {activeTab === 'services' && user.role === 'ADMIN' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Form Add Service */}
              <div className="md:col-span-1">
                <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-xs">
                  <CardHeader className="bg-slate-50/70 dark:bg-slate-850/50 border-b border-slate-100 dark:border-slate-800 p-5">
                    <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <IndianRupee className="w-4 h-4 text-teal-600 dark:text-teal-400" /> Add Clinic Service
                    </CardTitle>
                    <CardDescription className="text-xs font-semibold text-slate-400">
                      Pre-configure billing items like ECG, Consultation, or dressings to select them during bill checkout.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5">
                    <form onSubmit={handleAddService} className="space-y-4">
                      {serviceSuccess && (
                        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-805 dark:text-emerald-200 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Service item added successfully!
                        </div>
                      )}

                      {serviceError && (
                        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-3.5 rounded-xl text-xs font-semibold flex items-start gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 mt-0.5" />
                          <div>{serviceError}</div>
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Service Name *</label>
                        <input
                          type="text"
                          required
                          className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                          placeholder="e.g. ECG Scan"
                          value={newServiceName}
                          onChange={(e) => setNewServiceName(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fee Cost (₹) *</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          required
                          className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                          value={newServiceFee}
                          onChange={(e) => setNewServiceFee(e.target.value.replace(/[^0-9]/g, ''))}
                        />
                      </div>

                      <Button
                        type="submit"
                        className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl h-10 w-full shadow-xs mt-2 flex items-center justify-center gap-1.5 border-0 cursor-pointer"
                        disabled={savingService}
                      >
                        <Plus className="w-4 h-4" /> Save Service Item
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Services List Table */}
              <div className="md:col-span-2">
                <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-xs">
                  <CardHeader className="bg-slate-50/70 dark:bg-slate-850/50 border-b border-slate-100 dark:border-slate-800 p-5">
                    <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white">Preconfigured Billable Services</CardTitle>
                    <CardDescription className="text-xs font-semibold text-slate-400">Predefined items currently active in clinic checkout ledger.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50/50 dark:bg-slate-850/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            <th className="px-6 py-3.5">Service Code / Name</th>
                            <th className="px-6 py-3.5 text-right">Standard Fee</th>
                            <th className="px-6 py-3.5 text-center">Status</th>
                            <th className="px-6 py-3.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {services.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors font-semibold text-slate-700 dark:text-slate-300">
                              <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-white">{item.name}</td>
                              <td className="px-6 py-3.5 text-right font-mono font-black text-slate-900 dark:text-white">₹{item.fee}</td>
                              <td className="px-6 py-3.5 text-center">
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                  item.active 
                                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                                    : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                }`}>
                                  {item.active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="px-6 py-3.5 text-right font-bold">
                                {item.active && (
                                  <button
                                    onClick={() => handleDeleteService(item.id!)}
                                    className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 p-1.5 rounded-lg transition-all cursor-pointer"
                                    title="Disable Service"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                          {services.length === 0 && (
                            <tr>
                              <td colSpan={4} className="text-center py-8 text-xs font-bold text-slate-400">
                                No pre-configured billing services found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 5: Live Split-Screen EMR Print Studio */}
          {activeTab === 'prescription' && (user.role === 'ADMIN' || user.role === 'DOCTOR') && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT COLUMN: CONTROL & CONFIGURATION FORM */}
              <div className="lg:col-span-5 space-y-6 no-print">
                <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-xs">
                  <CardHeader className="bg-slate-50/70 dark:bg-slate-850/50 border-b border-slate-100 dark:border-slate-800 p-6">
                    <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <FileSignature className="w-4 h-4 text-teal-600 dark:text-teal-400" /> Print Template Studio
                    </CardTitle>
                    <CardDescription className="text-xs font-semibold text-slate-400">
                      Configure letterhead branding, digital signature, margins, security QR code, and default advice.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <form onSubmit={handleSavePrescription} className="space-y-5">
                      {prescriptionSuccess && (
                        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 p-4 rounded-xl text-xs font-semibold flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          Prescription & EMR template layout saved!
                        </div>
                      )}

                      {prescriptionError && (
                        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-4 rounded-xl text-xs font-semibold flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                          <div>{prescriptionError}</div>
                        </div>
                      )}

                      {/* Theme Accent Color Selector */}
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Theme Accent Color
                        </label>
                        <div className="flex gap-2">
                          {[
                            { name: 'Medical Teal', color: '#0d9488' },
                            { name: 'Executive Navy', color: '#1e3a8a' },
                            { name: 'Clinical Emerald', color: '#059669' },
                            { name: 'Modern Slate', color: '#334155' }
                          ].map((theme) => (
                            <button
                              key={theme.color}
                              type="button"
                              onClick={() => setPreviewAccentColor(theme.color)}
                              className={`flex-1 h-9 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                previewAccentColor === theme.color
                                  ? 'border-teal-600 shadow-xs ring-2 ring-teal-500/20 text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50'
                                  : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 bg-slate-50 dark:bg-slate-850'
                              }`}
                            >
                              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: theme.color }} />
                              <span className="truncate hidden sm:inline">{theme.name.split(' ')[1]}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Signature Upload */}
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Doctor Digital Signature Image URL
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                            placeholder="https://example.com/signature.png"
                            value={digitalSignatureUrl}
                            onChange={(e) => setDigitalSignatureUrl(e.target.value)}
                            disabled={savingPrescription}
                          />
                          <ImageUploadButton onUploadComplete={(url) => setDigitalSignatureUrl(url)} disabled={savingPrescription} />
                        </div>
                      </div>

                      {/* Watermark Upload */}
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Watermark Logo URL
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                            placeholder="https://example.com/watermark.png"
                            value={watermarkUrl}
                            onChange={(e) => setWatermarkUrl(e.target.value)}
                            disabled={savingPrescription}
                          />
                          <ImageUploadButton onUploadComplete={(url) => setWatermarkUrl(url)} disabled={savingPrescription} />
                        </div>
                      </div>

                      {/* Spacing & Margins */}
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Print Margin Spacing (mm)
                        </label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            inputMode="numeric"
                            className="w-24 h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-teal-500"
                            value={printMarginMm}
                            onChange={(e) => setPrintMarginMm(e.target.value.replace(/[^0-9]/g, ''))}
                            disabled={savingPrescription}
                          />
                          <div className="flex gap-1.5 flex-1">
                            {['5', '10', '15', '20'].map((mm) => (
                              <button
                                key={mm}
                                type="button"
                                onClick={() => setPrintMarginMm(mm)}
                                className={`flex-1 h-10 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                  printMarginMm === mm
                                    ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                                    : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                              >
                                {mm}mm
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Checkbox Toggles */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <label className="p-3 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-2 cursor-pointer select-none bg-slate-50 dark:bg-slate-850/60 hover:bg-slate-100 dark:hover:bg-slate-800">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-teal-600 rounded border-slate-300 dark:border-slate-700 focus:ring-teal-500"
                            checked={showLogo}
                            onChange={(e) => setShowLogo(e.target.checked)}
                          />
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Show Clinic Logo</span>
                        </label>

                        <label className="p-3 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-2 cursor-pointer select-none bg-slate-50 dark:bg-slate-850/60 hover:bg-slate-100 dark:hover:bg-slate-800">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-teal-600 rounded border-slate-300 dark:border-slate-700 focus:ring-teal-500"
                            checked={enableQrCode}
                            onChange={(e) => setEnableQrCode(e.target.checked)}
                          />
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Security QR Code</span>
                        </label>
                      </div>

                      {/* Header Text */}
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Prescription Sub-Header Banner Text
                        </label>
                        <textarea
                          rows={2}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                          placeholder="e.g. ISO 9001:2025 Certified Healthcare Facility — Open 24/7"
                          value={headerText}
                          onChange={(e) => setHeaderText(e.target.value)}
                          disabled={savingPrescription}
                        />
                      </div>

                      {/* Footer Text */}
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Prescription Footer Legal Text
                        </label>
                        <textarea
                          rows={2}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                          placeholder="e.g. Valid for 30 days from date of issue. Please bring during follow-up."
                          value={footerText}
                          onChange={(e) => setFooterText(e.target.value)}
                          disabled={savingPrescription}
                        />
                      </div>

                      {/* Default Advice Template */}
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Default Doctor Advice & Lifestyle Template
                        </label>
                        <textarea
                          rows={3}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                          placeholder="e.g. Drink plenty of lukewarm water. Avoid oily and spicy foods. Complete full course of prescribed antibiotics."
                          value={defaultAdvice}
                          onChange={(e) => setDefaultAdvice(e.target.value)}
                          disabled={savingPrescription}
                        />
                      </div>

                      <div className="pt-2 flex justify-between gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => window.print()}
                          className="h-10 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                        >
                          <FileText className="w-4 h-4 text-slate-500" /> Test Print A4
                        </Button>

                        <Button
                          type="submit"
                          className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-xs h-10 px-6 shadow-xs border-0 cursor-pointer"
                          disabled={savingPrescription}
                        >
                          {savingPrescription ? 'Saving Layout...' : 'Save Template Settings'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* RIGHT COLUMN: REAL-TIME INTERACTIVE A4 LIVE PREVIEW CANVAS */}
              <div className="lg:col-span-7 space-y-4 sticky top-6">
                <Card className="border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm bg-slate-900 text-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <h3 className="text-sm font-bold tracking-tight text-white">Live A4 Paper Canvas Studio</h3>
                    </div>

                    {/* Mode Switcher */}
                    <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700/80">
                      {(['EMR_CASE_SHEET', 'PRESCRIPTION_PAD'] as EMRPrintMode[]).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPreviewMode(m)}
                          className={`px-3 py-1.5 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer ${
                            previewMode === m
                              ? 'bg-teal-600 text-white shadow-xs'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {m === 'EMR_CASE_SHEET' ? 'Full EMR File' : 'Rx Pad Only'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Scaled A4 Sheet Container */}
                  <div className="p-4 bg-slate-950/60 rounded-2xl overflow-x-auto flex justify-center border border-slate-800/80 my-2">
                    <div className="printable-modal-overlay">
                      <div id="printable-emr-document" className="printable-modal-content transform scale-[0.85] origin-top sm:scale-95 transition-all">
                      <EMRPrintDocument
                        mode={previewMode}
                        accentColor={previewAccentColor}
                        clinic={{
                          name: clinicName || 'NISSCHAY MULTISPECIALTY CLINIC',
                          address: clinicAddress || 'Medical Health Complex, City Center',
                          phone: clinicPhone || '+91 98765 43210',
                          email: clinicEmail || 'contact@clinic.com',
                          logoUrl: logoUrl
                        }}
                        doctor={{
                          name: name || user.name || 'Nikhil Sharma',
                          specialization: specialization || 'Consultant Physician & Specialist',
                          qualification: qualification || 'MBBS, MD (General Medicine)',
                          registrationNumber: 'MCI-84729-IN'
                        }}
                        patient={{
                          name: 'Rahul V. Verma',
                          dateOfBirth: '1992-05-14',
                          gender: 'Male',
                          phone: '+91 98123 45678',
                          bloodGroup: 'B+',
                          allergies: 'Penicillin, Sulfa Drugs',
                          medicalHistory: 'Hypertension (3 Yrs), Type-2 Diabetes'
                        }}
                        appointment={{
                          id: 'DEMO-847291',
                          appointmentDate: new Date().toISOString(),
                          symptoms: 'High fever (102°F) for 3 days\nPersistent dry cough and fatigue\nBody aches & throat congestion',
                          diagnosis: 'Acute Upper Respiratory Tract Infection (ICD-10 J06.9)',
                          prescription: 'Tab. Paracetamol 650mg — 1-0-1 — After Food — 5 Days\nCap. Amoxicillin 500mg — 1-0-1 — After Food — 5 Days\nSyr. Benadryl Cough 10ml — 0-0-1 — Bedtime — 5 Days',
                          notes: defaultAdvice || 'Rest adequately. Consume light warm food and fluids. Contact emergency helpline if fever persists above 102°F.',
                          followUpDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
                          bpSystolic: 120,
                          bpDiastolic: 80,
                          pulse: 78,
                          temperature: 101.2,
                          spo2: 98,
                          weight: 72,
                          height: 175
                        }}
                        settings={{
                          showLogo: showLogo,
                          digitalSignatureUrl: digitalSignatureUrl,
                          headerText: headerText,
                          footerText: footerText,
                          watermarkUrl: watermarkUrl,
                          printMarginMm: printMarginMm === '' ? 10 : Number(printMarginMm),
                          enableQrCode: enableQrCode,
                          defaultAdvice: defaultAdvice
                        }}
                      />
                    </div>
                  </div>
                </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 6: Staff & Role Management (ADMIN / SUPER_ADMIN / SUB_ADMIN) */}
          {activeTab === 'staff' && ['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN'].includes(user.role?.toUpperCase()) && (
            <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-xs">
              <CardHeader className="bg-slate-50/70 dark:bg-slate-850/50 border-b border-slate-100 dark:border-slate-800 p-6 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-teal-600 dark:text-teal-400" /> Staff & Access Permissions Management
                  </CardTitle>
                  <CardDescription className="text-xs font-semibold text-slate-400">
                    Manage clinic employees, assign roles (Receptionist, Doctor, Sub Admin, Admin), and configure access levels.
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowAddStaffModal(true)}
                  className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold h-9 text-xs flex items-center gap-1.5 shadow-xs border-0 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add New Staff</span>
                </Button>
              </CardHeader>
              <CardContent className="p-6">
                {staffList.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm font-semibold">
                    No staff members found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                          <th className="pb-3 px-3">Name</th>
                          <th className="pb-3 px-3">Email</th>
                          <th className="pb-3 px-3">Phone</th>
                          <th className="pb-3 px-3">Assigned Role</th>
                          <th className="pb-3 px-3 text-right">Access Controls</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                        {staffList.map((staff) => (
                          <tr key={staff.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-white">{staff.name}</td>
                            <td className="py-3.5 px-3 text-slate-500 dark:text-slate-400">{staff.email}</td>
                            <td className="py-3.5 px-3 text-slate-500 dark:text-slate-400 font-mono">{staff.phone || '—'}</td>
                            <td className="py-3.5 px-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                staff.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800' :
                                staff.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800' :
                                staff.role === 'DOCTOR' ? 'bg-teal-100 text-teal-700 border border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800' :
                                staff.role === 'SUB_ADMIN' ? 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800' :
                                'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                              }`}>
                                {staff.role}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-right">
                              <select
                                value={staff.role}
                                onChange={(e) => handleRoleChange(staff.id, e.target.value)}
                                className="h-8 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                              >
                                <option value="RECEPTIONIST">Receptionist (Appointments & Patient Lookup)</option>
                                <option value="DOCTOR">Doctor (Consultations & Medical Records)</option>
                                <option value="SUB_ADMIN">Sub Admin (Operational Clinic Admin)</option>
                                <option value="ADMIN">Admin (Full System Access)</option>
                                <option value="SUPER_ADMIN">Super Admin (System Owner)</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB 7: Dashboard Cards & Rearrange Customizer */}
          {activeTab === 'dashboard' && (
            <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-xs">
              <CardHeader className="bg-slate-50/70 dark:bg-slate-850/50 border-b border-slate-100 dark:border-slate-800 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <SlidersHorizontal className="w-4.5 h-4.5 text-teal-600 dark:text-teal-400" />
                    <span>Dashboard Cards Layout & Rearrange Customizer</span>
                  </CardTitle>
                  <CardDescription className="text-xs font-semibold text-slate-400 mt-1">
                    Select visible cards, mark favorite ⭐ metrics, and use the ↑ Up / ↓ Down buttons to rearrange your dashboard cards in your preferred order.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetDashboardCardsToDefault}
                    className="h-9 px-3 text-xs font-semibold text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Order</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 sm:p-8 space-y-6">
                {dashboardSuccessMsg && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{dashboardSuccessMsg}</span>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="text-xs font-black text-slate-400 uppercase tracking-wider px-1">
                    Card Order & Visibility Settings ({dashboardCardOrder.length} Total Metrics)
                  </div>

                  <div className="space-y-2.5">
                    {dashboardCardOrder.map((cardId, index) => {
                      const meta = ALL_DASHBOARD_CARDS_MAP[cardId] || {
                        name: cardId,
                        category: 'Operations',
                        description: 'Custom Dashboard Metric Card'
                      };
                      const isVisible = dashboardVisibleCards.includes(cardId);
                      const isFav = dashboardFavoriteCards.includes(cardId);

                      return (
                        <div
                          key={cardId}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:border-teal-500/40 transition-all gap-4"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Checkbox visibility */}
                            <input
                              type="checkbox"
                              checked={isVisible}
                              onChange={() => toggleVisibleCard(cardId)}
                              className="w-4.5 h-4.5 rounded text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                            />

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                                  {index + 1}. {meta.name}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                  {meta.category}
                                </span>
                                {isFav && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 flex items-center gap-1">
                                    <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500" />
                                    <span>Favorite</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                {meta.description}
                              </p>
                            </div>
                          </div>

                          {/* Controls: Move Up, Move Down, Toggle Favorite */}
                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                            {/* Move Up Button */}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={index === 0}
                              onClick={() => moveCardUp(index)}
                              className="h-8 w-8 p-0 rounded-xl border-slate-200 dark:border-slate-700 disabled:opacity-30 cursor-pointer"
                              title="Move Card Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                            </Button>

                            {/* Move Down Button */}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={index === dashboardCardOrder.length - 1}
                              onClick={() => moveCardDown(index)}
                              className="h-8 w-8 p-0 rounded-xl border-slate-200 dark:border-slate-700 disabled:opacity-30 cursor-pointer"
                              title="Move Card Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                            </Button>

                            {/* Star Favorite Toggle */}
                            <button
                              type="button"
                              onClick={() => toggleFavoriteCard(cardId)}
                              className="px-3 h-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer ml-1"
                              title={isFav ? 'Remove from Favorites' : 'Mark as Favorite Card'}
                            >
                              <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`} />
                              <span>{isFav ? 'Starred' : 'Pin'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add Staff Modal */}
          {showAddStaffModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Add New Staff Member</h3>
                  </div>
                  <button
                    onClick={() => setShowAddStaffModal(false)}
                    className="p-1 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleAddStaff} className="space-y-4">
                  {staffModalError && (
                    <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-3.5 rounded-xl text-xs font-semibold">
                      {staffModalError}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sarah Jenkins"
                      className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      value={newStaffName}
                      onChange={(e) => setNewStaffName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. sarah@clinic.com"
                      className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      value={newStaffEmail}
                      onChange={(e) => setNewStaffEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Password *</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      value={newStaffPassword}
                      onChange={(e) => setNewStaffPassword(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phone Number</label>
                    <input
                      type="text"
                      placeholder="e.g. +91 9876543210"
                      className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      value={newStaffPhone}
                      onChange={(e) => setNewStaffPhone(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role & Access Level *</label>
                    <select
                      value={newStaffRole}
                      onChange={(e) => setNewStaffRole(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    >
                      <option value="RECEPTIONIST">Receptionist (Appointments & Patient Lookup)</option>
                      <option value="DOCTOR">Doctor (Consultations & Medical Records)</option>
                      <option value="SUB_ADMIN">Sub Admin (Operational Clinic Admin)</option>
                      <option value="ADMIN">Admin (Full System Access)</option>
                      <option value="SUPER_ADMIN">Super Admin (System Owner)</option>
                    </select>
                  </div>

                  <div className="pt-3 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddStaffModal(false)}
                      className="rounded-xl text-xs font-semibold h-10 px-4 border-slate-200 dark:border-slate-700"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={savingStaff}
                      className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold h-10 px-6 shadow-xs border-0 cursor-pointer"
                    >
                      {savingStaff ? 'Creating...' : 'Create Staff Member'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
