'use client';

import React, { useEffect, useState, useMemo, useDeferredValue } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LiveClock } from '@/components/live-clock';
import { apiClient } from '@/lib/api-client';
import { getDoctorFeeForType, getFeeLabelForType } from '@/lib/utils';
import { Appointment, Doctor, Medicine, Clinic, Patient } from '@/types';
import { PatientForm } from '@/components/patient-form';
import { TimeSlotGrid } from '@/components/time-slot-grid';
import { DoctorPrescriptionNotepadModal } from '@/components/prescription-notepad-modal';
import {
  CalendarDays,
  Users2,
  IndianRupee,
  PlusCircle,
  Clock,
  CheckCircle2,
  Activity,
  X,
  AlertCircle,
  FileText,
  User,
  ChevronRight,
  Shield,
  Stethoscope,
  Info,
  History,
  CornerDownRight,
  BarChart3,
  Hospital,
  Plus,
  Printer,
  Calendar,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Star,
  SlidersHorizontal,
  TrendingUp,
  UserCheck,
  Zap
} from 'lucide-react';

interface PatientsPageResponse {
  totalElements: number;
  content?: Patient[];
}

const MEDICINE_TEMPLATES = [
  {
    name: 'Paracetamol 650mg',
    category: 'Fever & Body Pain',
    instructions: '1. Tab Paracetamol 650mg — 1-0-1 (After Food) — 3 days',
  },
  {
    name: 'Amoxicillin 500mg',
    category: 'Antibiotic',
    instructions: '2. Cap Amoxicillin 500mg — 1-0-1 (After Food) — 5 days',
  },
  {
    name: 'Pantoprazole 40mg',
    category: 'Acidity / Antacid',
    instructions: '3. Tab Pantoprazole 40mg — 1-0-0 (Before Food) — 7 days',
  },
  {
    name: 'Cetirizine 10mg',
    category: 'Allergy / Cold',
    instructions: '4. Tab Cetirizine 10mg — 0-0-1 (Before Bed) — 5 days',
  },
  {
    name: 'Azithromycin 500mg',
    category: 'Broad Antibiotic',
    instructions: '5. Tab Azithromycin 500mg — 1-0-0 (After Food) — 3 days',
  },
  {
    name: 'Ondansetron 4mg',
    category: 'Nausea / Vomiting',
    instructions: '6. Tab Ondansetron 4mg — 1-0-1 (Before Food) — 3 days',
  },
  {
    name: 'Meftal-Spas 500mg',
    category: 'Abdominal Pain',
    instructions: '7. Tab Meftal-Spas — 1-0-1 (As Needed) — 3 days',
  },
  {
    name: 'Cough Syrup 10ml',
    category: 'Cough & Throat',
    instructions: '8. Syr Ascoril / Benadryl — 10ml 1-0-1 (After Food) — 5 days',
  },
  {
    name: 'ORS Sachet Powder',
    category: 'Hydration',
    instructions: '9. ORS Electrolyte — 1 sachet in 1 Litre water daily',
  },
  {
    name: 'Multivitamin Tab',
    category: 'Supplement',
    instructions: '10. Tab Multivitamin + Minerals — 0-1-0 (After Lunch) — 15 days',
  },
];

const DIAGNOSIS_TEMPLATES = [
  'Acute Viral Fever & Body Aches',
  'Upper Respiratory Tract Infection (URTI)',
  'Acute Gastritis & Acidity Reflux',
  'Essential Hypertension Routine Review',
  'Type 2 Diabetes Mellitus Follow-up',
  'Allergic Rhinitis & Seasonal Cold',
  'Acute Gastroenteritis & Dehydration',
  'Migraine & Tension Headache',
  'Bronchial Asthma Exacerbation',
  'Skin Allergy & Urticaria Rashes',
];

const SERVICE_TEMPLATES = [
  { name: 'General Consultation', fee: 500 },
  { name: 'Follow-up Review', fee: 300 },
  { name: 'Blood Pressure Check', fee: 100 },
  { name: 'Random Blood Sugar (RBS)', fee: 150 },
  { name: '12-Lead ECG Test', fee: 350 },
  { name: 'Nebulization Session', fee: 200 },
  { name: 'Wound Dressing & Bandage', fee: 250 },
  { name: 'Complete Blood Count (CBC)', fee: 400 },
  { name: 'Urine Routine Test', fee: 200 },
];

const ADVICE_TEMPLATES = [
  'Take all medicines strictly after food with water.',
  'Complete full 5-day antibiotic course without skipping.',
  'Drink 3 to 4 liters of warm water / liquids daily.',
  'Review consultation in 3 days or if fever > 101°F.',
  'Avoid cold drinks, fried spicy foods, and heavy meals.',
  'Monitor body temperature and blood pressure 6-hourly.',
];

export default function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [greeting, setGreeting] = useState('Good Morning');

  const [dbMedicines, setDbMedicines] = useState<Medicine[]>([]);
  const [medicineSearchQuery, setMedicineSearchQuery] = useState('');

  // Unified Patient File state
  const [isPatientFileOpen, setIsPatientFileOpen] = useState(false);
  const [activeFileAppt, setActiveFileAppt] = useState<Appointment | null>(null);
  const [activeFileTab, setActiveFileTab] = useState<'consult' | 'history'>('consult');
  
  // History timeline details cached in memory
  const [historyAppts, setHistoryAppts] = useState<Appointment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Lazy-fetch medicines from backend DB only when prescription/patient modal is opened
  useEffect(() => {
    if (!isPatientFileOpen || dbMedicines.length > 0) return;
    const fetchMedicines = async () => {
      try {
        const res = await apiClient.get<Medicine[]>('/medicines');
        if (res.data && res.data.length > 0) {
          setDbMedicines(res.data);
        }
      } catch (err) {
        console.error('Failed to load medicines:', err);
      }
    };
    fetchMedicines();
  }, [isPatientFileOpen, dbMedicines.length]);

  // Stats
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [totalPatients, setTotalPatients] = useState<number>(0);
  const [newPatientsToday, setNewPatientsToday] = useState<number>(0);
  const [loadingStats, setLoadingStats] = useState(true);

  // Doctors filter
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [queueTab, setQueueTab] = useState<'all' | 'in_consult' | 'waiting' | 'upcoming' | 'completed'>('all');

  // Form state
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [prescription, setPrescription] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  // Vitals state
  const [bpSystolic, setBpSystolic] = useState('');
  const [bpDiastolic, setBpDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [temperature, setTemperature] = useState('');
  const [spo2, setSpo2] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');

  // Clinic info state
  const [clinic, setClinic] = useState<Clinic | null>(null);

  // Clinic Service attachment notification state
  const [addedServiceToast, setAddedServiceToast] = useState<string | null>(null);

  // Helper to parse attached services and diagnostic tests from appointment notes
  const parseAttachedServices = (notes: string = '') => {
    const services: { name: string; fee: number }[] = [];
    if (!notes) return services;
    const lines = notes.split('\n');
    for (const line of lines) {
      const match = line.match(/•\s*(.*?)\s*\(Fee:\s*₹(\d+)\)/);
      if (match) {
        services.push({
          name: match[1].trim(),
          fee: parseInt(match[2], 10),
        });
      }
    }
    return services;
  };

  // Medicine Timing Selector Modal states
  const [timingModalMed, setTimingModalMed] = useState<Medicine | null>(null);
  const [timingFrequency, setTimingFrequency] = useState('1-0-1');
  const [timingFood, setTimingFood] = useState('After Food');
  const [timingDuration, setTimingDuration] = useState('5 days');
  const [customTimingInput, setCustomTimingInput] = useState('');
  const [useCustomTiming, setUseCustomTiming] = useState(false);

  // Compute smart symptom-to-diagnosis suggestions
  const dynamicSuggestedDiagnoses = useMemo(() => {
    const text = (symptoms || '').toLowerCase();
    const suggestions: string[] = [];

    if (text.includes('pain') || text.includes('body') || text.includes('hand') || text.includes('leg') || text.includes('back') || text.includes('joint') || text.includes('muscle') || text.includes('ache')) {
      suggestions.push('Myalgia / Muscle Strain', 'Viral Fever with Body Ache', 'Trauma / Physical Injury', 'Joint Pain / Arthralgia');
    }
    if (text.includes('chest') || text.includes('heart') || text.includes('cardiac') || text.includes('breath') || text.includes('palpit') || text.includes('angina')) {
      suggestions.push('Angina / Cardiac Evaluation', 'Hypertension', 'Atypical Chest Pain', 'Cardiac Arrhythmia / Tachycardia');
    }
    if (text.includes('fever') || text.includes('chill') || text.includes('cold') || text.includes('temp') || text.includes('cough')) {
      suggestions.push('Acute Viral Fever', 'Upper Respiratory Tract Infection (URTI)', 'Dengue / Malaria Evaluation', 'Acute Bronchitis');
    }
    if (text.includes('stomach') || text.includes('abdomen') || text.includes('vomit') || text.includes('nausea') || text.includes('acid') || text.includes('gas') || text.includes('cramp')) {
      suggestions.push('Acute Gastritis / Acid Reflux', 'Gastroenteritis', 'Abdominal Colic', 'Peptic Ulcer Disease');
    }
    if (text.includes('head') || text.includes('dizzy') || text.includes('giddy')) {
      suggestions.push('Tension Headache', 'Migraine', 'Vertigo', 'Hypertensive Headache');
    }

    if (suggestions.length === 0) {
      return DIAGNOSIS_TEMPLATES;
    }

    return Array.from(new Set(suggestions));
  }, [symptoms]);

  const openMedicineTimingModal = (med: Medicine) => {
    setTimingModalMed(med);
    setTimingFrequency('1-0-1');
    setTimingFood('After Food');
    setTimingDuration('5 days');
    setCustomTimingInput('');
    setUseCustomTiming(false);
  };

  const handleConfirmAddMedicineWithTiming = () => {
    if (!timingModalMed) return;

    let dosageLine = '';
    if (useCustomTiming && customTimingInput.trim()) {
      dosageLine = `• ${timingModalMed.name} ${timingModalMed.manufacturerName ? `[${timingModalMed.manufacturerName}]` : ''} — ${customTimingInput.trim()}`;
    } else {
      dosageLine = `• ${timingModalMed.name} ${timingModalMed.manufacturerName ? `[${timingModalMed.manufacturerName}]` : ''} — ${timingFrequency} (${timingFood}) — ${timingDuration}`;
    }

    setPrescription(prev => prev ? `${prev}\n${dosageLine}` : dosageLine);
    setTimingModalMed(null);
  };

  const handleAttachService = (svc: { name: string; fee: number }) => {
    const entry = `• ${svc.name} (Fee: ₹${svc.fee})`;
    setInternalNotes(prev => {
      if (!prev) return `INVESTIGATIONS / SERVICES ORDERED:\n${entry}`;
      if (prev.includes(svc.name)) return prev;
      return `${prev}\n${entry}`;
    });
    setAddedServiceToast(`✓ Added "${svc.name}" (Fee: ₹${svc.fee}) to Prescription Notes!`);
    setTimeout(() => {
      setAddedServiceToast(null);
    }, 3000);
  };

  const deferredSymptoms = useDeferredValue(symptoms);
  const deferredDiagnosis = useDeferredValue(diagnosis);
  const deferredMedQuery = useDeferredValue(medicineSearchQuery);

  // Compute smart symptom & diagnosis medicine suggestions with 100x early break optimization
  const suggestedMedicines = useMemo(() => {
    if (!isPatientFileOpen || !dbMedicines || dbMedicines.length === 0) return [];
    
    // Split query terms by whitespace/comma and remove short stop-words
    const queryWords = `${deferredSymptoms || ''} ${deferredDiagnosis || ''} ${deferredMedQuery || ''}`
      .toLowerCase()
      .split(/[\s,]+/)
      .filter(word => word.trim().length > 1);

    if (queryWords.length === 0) {
      return dbMedicines.slice(0, 10); // Return default list
    }

    const matches: Medicine[] = [];
    for (let i = 0; i < dbMedicines.length; i++) {
      const m = dbMedicines[i];
      const name = (m.name || '').toLowerCase();
      const salt = (m.saltComposition || '').toLowerCase();
      const manufacturer = (m.manufacturerName || '').toLowerCase();

      if (queryWords.some(word => name.includes(word) || salt.includes(word) || manufacturer.includes(word))) {
        matches.push(m);
        if (matches.length >= 12) break; // Stop early once 12 matches found
      }
    }
    return matches;
  }, [isPatientFileOpen, dbMedicines, deferredSymptoms, deferredDiagnosis, deferredMedQuery]);
  const [submittingConsult, setSubmittingConsult] = useState(false);
  const [consultError, setConsultError] = useState<string | null>(null);
  
  // Reset session state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // In-Dashboard Patient Registration & Appointment Booking Modals state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isBookApptModalOpen, setIsBookApptModalOpen] = useState(false);

  // Book Slot modal inputs
  const [bookPatientSearch, setBookPatientSearch] = useState('');
  const [debouncedBookSearch, setDebouncedBookSearch] = useState('');
  const [searchedBookPatients, setSearchedBookPatients] = useState<Patient[]>([]);
  const [loadingBookPatients, setLoadingBookPatients] = useState(false);
  const [selectedBookPatient, setSelectedBookPatient] = useState<Patient | null>(null);
  const [bookDoctorId, setBookDoctorId] = useState<string>('');
  const [bookDate, setBookDate] = useState<string>('');
  const [bookStartTime, setBookStartTime] = useState<string>('09:00');
  const [bookType, setBookType] = useState<'CONSULTATION' | 'FOLLOW_UP' | 'EMERGENCY'>('CONSULTATION');
  const [bookReason, setBookReason] = useState<string>('');
  const [submittingBookAppt, setSubmittingBookAppt] = useState(false);
  const [bookApptError, setBookApptError] = useState<string | null>(null);
  const [bookedSlotsList, setBookedSlotsList] = useState<string[]>([]);
  const [bookedRangesList, setBookedRangesList] = useState<{ startTime: string; endTime?: string }[]>([]);
  const [isTimeSlotSheetOpen, setIsTimeSlotSheetOpen] = useState(false);

  // Fetch booked slots for the selected doctor & date for the TimeSlotGrid
  useEffect(() => {
    if (!isBookApptModalOpen) return;
    const docId = bookDoctorId || selectedDoctorId || (user?.role === 'DOCTOR' ? user.id : doctors[0]?.id);
    const targetDate = bookDate || getTodayString();
    if (!docId || !targetDate) return;

    const fetchBookedSlots = async () => {
      try {
        const res = await apiClient.get<Appointment[]>('/appointments', {
          params: { doctorId: docId, date: targetDate }
        });
        const activeAppts = (res.data || []).filter(a => a.status !== 'CANCELLED');
        const times = activeAppts.map(a => a.startTime.substring(0, 5));
        const ranges = activeAppts.map(a => ({ startTime: a.startTime, endTime: a.endTime }));
        setBookedSlotsList(times);
        setBookedRangesList(ranges);
      } catch (err) {
        console.error('Failed to fetch booked slots for modal', err);
      }
    };

    fetchBookedSlots();
  }, [isBookApptModalOpen, bookDoctorId, selectedDoctorId, bookDate, user, doctors]);

  // Debounce patient search for Book Slot modal
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedBookSearch(bookPatientSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [bookPatientSearch]);

  const resetBookApptForm = () => {
    setSelectedBookPatient(null);
    setBookPatientSearch('');
    setDebouncedBookSearch('');
    setSearchedBookPatients([]);
    setBookReason('');
    setBookType('CONSULTATION');
    setBookStartTime('09:00');
    setBookApptError(null);
    setIsTimeSlotSheetOpen(false);
  };

  const handleOpenBookSlotModal = () => {
    resetBookApptForm();
    setBookDate(getTodayString());
    if (user?.role === 'DOCTOR') {
      setBookDoctorId(user.id);
    } else if (doctors.length === 1) {
      setBookDoctorId(doctors[0].id);
    } else {
      setBookDoctorId('');
    }
    setIsBookApptModalOpen(true);
  };

  useEffect(() => {
    if (!isBookApptModalOpen) return;
    if (debouncedBookSearch.trim().length < 2) {
      setSearchedBookPatients([]);
      return;
    }

    const fetchPatients = async () => {
      setLoadingBookPatients(true);
      try {
        const res = await apiClient.get<PatientsPageResponse>('/patients', {
          params: { search: debouncedBookSearch, size: 6 }
        });
        setSearchedBookPatients(res.data.content || []);
      } catch (err) {
        console.error('Failed to search patients', err);
      } finally {
        setLoadingBookPatients(false);
      }
    };

    fetchPatients();
  }, [debouncedBookSearch, isBookApptModalOpen]);

  const handlePatientRegisteredSuccess = async (newPatient?: Patient) => {
    setIsRegisterModalOpen(false);
    setAddedServiceToast(`✓ Patient "${newPatient?.name || 'File'}" Registered Successfully!`);
    setTimeout(() => setAddedServiceToast(null), 4000);

    try {
      const ptsRes = await apiClient.get<PatientsPageResponse>('/patients', { params: { size: 1 } });
      setTotalPatients(ptsRes.data.totalElements || 0);
      const newPtsRes = await apiClient.get<number>('/patients/new-today');
      setNewPatientsToday(newPtsRes.data || 0);
    } catch (e) {
      console.error('Failed to refresh patient count', e);
    }

    if (newPatient) {
      setSelectedBookPatient(newPatient);
      setBookPatientSearch(newPatient.name || '');
      setIsBookApptModalOpen(true);
    }
  };

  const handleBookAppointmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookPatient) {
      setBookApptError('Please search and select a registered patient.');
      return;
    }

    let activeDocId = bookDoctorId;
    if (!activeDocId && user?.role === 'DOCTOR') {
      activeDocId = user.id;
    }
    if (!activeDocId && doctors.length === 1) {
      activeDocId = doctors[0].id;
    }

    if (!activeDocId) {
      setBookApptError('Please select a doctor to assign for this appointment.');
      return;
    }

    setSubmittingBookAppt(true);
    setBookApptError(null);

    try {
      const targetDate = bookDate || getTodayString();
      const selectedDoc = doctors.find((d) => d.id === activeDocId);
      const slotDuration = selectedDoc?.slotDuration || 15;

      const [h, m] = bookStartTime.split(':').map(Number);
      const startMins = h * 60 + m;
      const endMins = startMins + slotDuration;

      // Prevent booking if slot overlaps with any booked appointment
      const hasConflict = bookedRangesList.some((range) => {
        if (!range.startTime) return false;
        const [rsh, rsm] = range.startTime.substring(0, 5).split(':').map(Number);
        const rangeStartMins = rsh * 60 + rsm;
        let rangeEndMins = rangeStartMins + slotDuration;
        if (range.endTime) {
          const [reh, rem] = range.endTime.substring(0, 5).split(':').map(Number);
          if (reh * 60 + rem > rangeStartMins) rangeEndMins = reh * 60 + rem;
        }
        return startMins < rangeEndMins && rangeStartMins < endMins;
      });

      if (hasConflict) {
        setBookApptError(`The time slot ${bookStartTime} is already booked for Dr. ${selectedDoc?.name || 'this doctor'}. Please pick an open available slot.`);
        setSubmittingBookAppt(false);
        return;
      }

      const start = bookStartTime.length === 5 ? `${bookStartTime}:00` : bookStartTime;
      const totalM = h * 60 + m + slotDuration;
      const endH = String(Math.floor(totalM / 60)).padStart(2, '0');
      const endM = String(totalM % 60).padStart(2, '0');
      const end = `${endH}:${endM}:00`;

      await apiClient.post('/appointments', {
        patientId: selectedBookPatient.id,
        doctorId: activeDocId,
        appointmentDate: targetDate,
        startTime: start,
        endTime: end,
        type: bookType,
        reason: bookReason,
      });

      resetBookApptForm();
      setIsBookApptModalOpen(false);
      setAddedServiceToast(`✓ Appointment slot booked for ${selectedBookPatient.name}!`);
      setTimeout(() => setAddedServiceToast(null), 4000);

      // Refresh today appointments
      const todayStr = getTodayString();
      const params: { date: string; doctorId?: string } = { date: todayStr };
      const currentDocId = user?.role === 'DOCTOR' ? user.id : selectedDoctorId;
      if (currentDocId) {
        params.doctorId = currentDocId;
      }
      const apptsRes = await apiClient.get<Appointment[]>('/appointments', { params });
      setAppointments(apptsRes.data);
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string; error?: string } }; message?: string };
      const msg = axiosError?.response?.data?.message || axiosError?.response?.data?.error || axiosError?.message || 'Failed to book slot. Time slot may be occupied.';
      setBookApptError(msg);
    } finally {
      setSubmittingBookAppt(false);
    }
  };

  // Command bar & Prescription Print state
  const [commandValue, setCommandValue] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [selectedPrintAppt, setSelectedPrintAppt] = useState<Appointment | null>(null);
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Record<string, boolean>>({});
  const [completedSortOrder, setCompletedSortOrder] = useState<'asc' | 'desc'>('asc');

  const DEFAULT_FAVORITES = ['today_revenue', 'today_appts', 'visited_today', 'new_patients'];
  const [favoriteCardIds, setFavoriteCardIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('clinic_dashboard_favorite_cards');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_FAVORITES;
  });
  const DEFAULT_CARD_ORDER = ['today_revenue', 'today_appts', 'visited_today', 'new_patients', 'waiting_lounge', 'in_consultation', 'avg_wait', 'emergency_count'];
  const [visibleCardIds, setVisibleCardIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('clinic_dashboard_visible_cards');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_CARD_ORDER;
  });

  const [cardsOrder, setCardsOrder] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('clinic_dashboard_cards_order');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_CARD_ORDER;
  });

  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);

  const moveCardUp = (index: number) => {
    if (index === 0) return;
    setCardsOrder(prev => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      try {
        localStorage.setItem('clinic_dashboard_cards_order', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const moveCardDown = (index: number) => {
    if (index === cardsOrder.length - 1) return;
    setCardsOrder(prev => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      try {
        localStorage.setItem('clinic_dashboard_cards_order', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const toggleFavoriteCard = (cardId: string) => {
    setFavoriteCardIds(prev => {
      const next = prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId];
      try {
        localStorage.setItem('clinic_dashboard_favorite_cards', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const toggleVisibleCard = (cardId: string) => {
    setVisibleCardIds(prev => {
      const next = prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId];
      try {
        localStorage.setItem('clinic_dashboard_visible_cards', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const resetCardSettings = () => {
    setFavoriteCardIds(DEFAULT_FAVORITES);
    setVisibleCardIds(DEFAULT_CARD_ORDER);
    try {
      localStorage.setItem('clinic_dashboard_favorite_cards', JSON.stringify(DEFAULT_FAVORITES));
      localStorage.setItem('clinic_dashboard_visible_cards', JSON.stringify(DEFAULT_CARD_ORDER));
    } catch {}
  };

  const toggleHistoryExpand = (id: string) => {
    setExpandedHistoryIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const hrs = new Date().getHours();
    if (hrs < 12) setGreeting('Good Morning');
    else if (hrs < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  // Fetch doctors (only if admin or receptionist)
  useEffect(() => {
    if (!user) return;
    
    const loadInitialData = async () => {
      try {
        setLoadingStats(true);
        // Load doctors profiles with consultation fees
        const docsRes = await apiClient.get<Doctor[]>('/doctors');
        setDoctors(docsRes.data);

        // Load current clinic details for official branding
        try {
          const clinicRes = await apiClient.get<Clinic>('/clinics/me');
          setClinic(clinicRes.data);
        } catch (e) {
          console.error('Failed to load clinic details', e);
        }
        
        // Fetch patient count
        const ptsRes = await apiClient.get<PatientsPageResponse>('/patients', { params: { size: 1 } });
        setTotalPatients(ptsRes.data.totalElements || 0);

        // Fetch new patients registered today
        const newPtsRes = await apiClient.get<number>('/patients/new-today');
        setNewPatientsToday(newPtsRes.data || 0);
        
        // Initial doctor selection
        if (user.role === 'DOCTOR') {
          setSelectedDoctorId(user.id);
        }
      } catch (err) {
        console.error('Failed to load initial stats', err);
      } finally {
        setLoadingStats(false);
      }
    };

    loadInitialData();
  }, [user]);

  // Load appointments when selection changes
  useEffect(() => {
    if (!user) return;
    
    const loadAppointments = async () => {
      try {
        const todayStr = getTodayString();
        const params: { date: string; doctorId?: string } = { date: todayStr };
        const activeDocId = user.role === 'DOCTOR' ? user.id : selectedDoctorId;
        if (activeDocId) {
          params.doctorId = activeDocId;
        }
        const apptsRes = await apiClient.get<Appointment[]>('/appointments', { params });
        setAppointments(apptsRes.data);
      } catch (err) {
        console.error('Failed to fetch today appointments', err);
      }
    };

    loadAppointments();
    
    // Polling setup for active dashboards
    const interval = setInterval(loadAppointments, 20000);
    return () => clearInterval(interval);
  }, [user, selectedDoctorId]);

  const handleCheckIn = async (apptId: string, isEmergency: boolean = false) => {
    try {
      const queryParams: Record<string, string> = { status: 'CHECKED_IN' };
      if (isEmergency) {
        queryParams.type = 'EMERGENCY';
      }
      await apiClient.patch(`/appointments/${apptId}/status`, null, {
        params: queryParams
      });
      // Refresh list
      const todayStr = getTodayString();
      const params: { date: string; doctorId?: string } = { date: todayStr };
      const activeDocId = user?.role === 'DOCTOR' ? user.id : selectedDoctorId;
      if (activeDocId) {
        params.doctorId = activeDocId;
      }
      const apptsRes = await apiClient.get<Appointment[]>('/appointments', { params });
      setAppointments(apptsRes.data);
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    } catch (err) {
      console.error('Check-in failed', err);
    }
  };

  const handleOpenPatientFile = async (appt: Appointment) => {
    setActiveFileAppt(appt);
    setSymptoms(appt.symptoms || '');
    setDiagnosis(appt.diagnosis || '');
    setPrescription(appt.prescription || '');
    setInternalNotes(appt.notes || '');
    setBpSystolic(appt.bpSystolic ? String(appt.bpSystolic) : '120');
    setBpDiastolic(appt.bpDiastolic ? String(appt.bpDiastolic) : '80');
    setPulse(appt.pulse ? String(appt.pulse) : '72');
    setTemperature(appt.temperature ? String(appt.temperature) : '98.6');
    setSpo2(appt.spo2 ? String(appt.spo2) : '98');
    setWeight(appt.weight ? String(appt.weight) : '68');
    setHeight(appt.height ? String(appt.height) : '170');
    setFollowUpDate(appt.followUpDate || '');
    setConsultError(null);
    
    // Set default active tab
    if (appt.status === 'COMPLETED') {
      setActiveFileTab('history');
    } else {
      setActiveFileTab('consult');
    }

    setIsPatientFileOpen(true);

    // Fetch history records dynamically in the background
    setHistoryAppts([]);
    setLoadingHistory(true);
    try {
      const res = await apiClient.get<Appointment[]>(`/appointments/patient/${appt.patientId}`);
      const completedVisits = res.data.filter(a => a.status === 'COMPLETED');
      setHistoryAppts(completedVisits);
    } catch (err) {
      console.error('Failed to load patient history in modal', err);
    } finally {
      setLoadingHistory(false);
    }

    // Set status to IN_CONSULTATION if currently checked in
    if (appt.status === 'CHECKED_IN') {
      try {
        await apiClient.patch(`/appointments/${appt.id}/status`, null, {
          params: { status: 'IN_CONSULTATION' }
        });
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
      } catch (err) {
        console.error('Failed to update status to IN_CONSULTATION', err);
      }
    }
  };

  const handleDirectComplete = async (appt: Appointment) => {
    if (!confirm(`Are you sure you want to mark the consultation for ${appt.patientName} as completed?`)) {
      return;
    }
    try {
      await apiClient.patch(`/appointments/${appt.id}/status`, null, {
        params: { status: 'COMPLETED' }
      });
      // Refresh list
      const todayStr = getTodayString();
      const params: { date: string; doctorId?: string } = { date: todayStr };
      const activeDocId = user?.role === 'DOCTOR' ? user.id : selectedDoctorId;
      if (activeDocId) {
        params.doctorId = activeDocId;
      }
      const apptsRes = await apiClient.get<Appointment[]>('/appointments', { params });
      setAppointments(apptsRes.data);
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    } catch (err) {
      console.error('Failed to complete appointment status directly', err);
    }
  };

  const parseMedicineString = (rxText: string): string => {
    const frequencyRegex = /(1-0-1|1-1-1|1-0-0|0-0-1|twice daily|twice a day|thrice daily|thrice a day|once daily|once a day|BD|TID|OD|HS)/i;
    const durationRegex = /(for \d+ days|for \d+ weeks|for \d+ months|\d+ days|\d+ weeks|\d+ months)/i;
    const foodRegex = /(after food|before food|empty stomach|with food|pc|ac)/i;

    const freqMatch = rxText.match(frequencyRegex);
    const durMatch = rxText.match(durationRegex);
    const foodMatch = rxText.match(foodRegex);

    let freq = freqMatch ? freqMatch[0] : '';
    const dur = durMatch ? durMatch[0] : '';
    let food = foodMatch ? foodMatch[0] : '';

    if (freq.toUpperCase() === 'BD') freq = '1-0-1';
    if (freq.toUpperCase() === 'TID') freq = '1-1-1';
    if (freq.toUpperCase() === 'OD') freq = '1-0-0';
    if (freq.toUpperCase() === 'HS') freq = '0-0-1';

    if (food.toLowerCase() === 'pc') food = 'after food';
    if (food.toLowerCase() === 'ac') food = 'before food';

    let drugName = rxText;
    if (freqMatch) drugName = drugName.replace(freqMatch[0], '');
    if (durMatch) drugName = drugName.replace(durMatch[0], '');
    if (foodMatch) drugName = drugName.replace(foodMatch[0], '');

    drugName = drugName.replace(/\s+/g, ' ').trim();
    if (drugName.length > 0) {
      drugName = drugName.charAt(0).toUpperCase() + drugName.slice(1);
    }

    let result = drugName;
    if (freq) result += ` (${freq})`;
    if (food) result += ` [${food.toLowerCase()}]`;
    if (dur) {
      const durText = dur.toLowerCase().startsWith('for') ? dur : `for ${dur}`;
      result += ` - ${durText}`;
    }

    return result;
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

  const handleCommandSubmit = (inputText: string) => {
    const text = inputText.trim();
    if (!text.startsWith('/')) {
      setSymptoms((prev) => prev ? `${prev}\n${text}` : text);
      return;
    }

    const firstSpaceIndex = text.indexOf(' ');
    const command = firstSpaceIndex !== -1 ? text.substring(0, firstSpaceIndex) : text;
    const args = firstSpaceIndex !== -1 ? text.substring(firstSpaceIndex + 1).trim() : '';

    switch (command.toLowerCase()) {
      case '/s':
      case '/symptoms':
        setSymptoms((prev) => prev ? `${prev}\n${args}` : args);
        break;

      case '/d':
      case '/diag':
      case '/diagnosis':
        setDiagnosis((prev) => prev ? `${prev}\n${args}` : args);
        break;

      case '/n':
      case '/notes':
        setInternalNotes((prev) => prev ? `${prev}\n${args}` : args);
        break;

      case '/rx':
      case '/med':
      case '/medicine':
        const formattedMed = parseMedicineString(args);
        setPrescription((prev) => prev ? `${prev}\n\n${formattedMed}` : formattedMed);
        break;

      case '/submit':
        const formElement = document.getElementById('consultation-form') as HTMLFormElement;
        if (formElement) {
          formElement.requestSubmit();
        }
        break;

      default:
        alert(`Unknown command: ${command}`);
    }
  };

  const handleAddMedicine = (template: typeof MEDICINE_TEMPLATES[0]) => {
    setPrescription(prev => {
      const separator = prev ? '\n\n' : '';
      return `${prev}${separator}${template.instructions}`;
    });
  };

  const handleAddMedicineFromDb = (med: Medicine) => {
    const dosageStr = `${med.name} ${med.manufacturerName ? `[${med.manufacturerName}]` : ''} — 1-0-1 (After Food) — 5 days`;
    setPrescription(prev => {
      const separator = prev ? '\n' : '';
      return `${prev}${separator}${dosageStr}`;
    });
  };

  const submitConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFileAppt) return;

    setSubmittingConsult(true);
    setConsultError(null);

    try {
      await apiClient.post(`/appointments/${activeFileAppt.id}/consultation`, {
        symptoms,
        diagnosis,
        prescription,
        notes: internalNotes,
        bpSystolic: bpSystolic ? parseInt(bpSystolic, 10) : null,
        bpDiastolic: bpDiastolic ? parseInt(bpDiastolic, 10) : null,
        pulse: pulse ? parseInt(pulse, 10) : null,
        temperature: temperature ? parseFloat(temperature) : null,
        spo2: spo2 ? parseInt(spo2, 10) : null,
        weight: weight ? parseFloat(weight) : null,
        height: height ? parseFloat(height) : null,
        followUpDate: followUpDate || null,
      });

      // Close modal
      setIsPatientFileOpen(false);
      setActiveFileAppt(null);

      // Refresh appointments list
      const todayStr = getTodayString();
      const params: { date: string; doctorId?: string } = { date: todayStr };
      const activeDocId = user?.role === 'DOCTOR' ? user.id : selectedDoctorId;
      if (activeDocId) {
        params.doctorId = activeDocId;
      }
      const apptsRes = await apiClient.get<Appointment[]>('/appointments', { params });
      setAppointments(apptsRes.data);
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string; error?: string } }; message?: string };
      const msg = axiosError?.response?.data?.message || axiosError?.response?.data?.error || axiosError?.message || 'Failed to complete consultation';
      setConsultError(msg);
    } finally {
      setSubmittingConsult(false);
    }
  };

  const generateAndSaveReport = () => {
    const todayStr = getTodayString();
    
    // Header
    let reportText = `==================================================\n`;
    reportText += `          CLINICAL DAILY VISIT & EARNINGS REPORT   \n`;
    reportText += `==================================================\n`;
    reportText += `Clinic Name : ${user?.clinicName || 'Clinic'}\n`;
    reportText += `Date        : ${todayStr}\n`;
    reportText += `Generated   : ${new Date().toLocaleTimeString()}\n`;
    reportText += `==================================================\n\n`;
    
    // Metrics
    reportText += `METRICS SUMMARY:\n`;
    reportText += `--------------------------------------------------\n`;
    reportText += `Total Scheduled Appointments: ${appointments.length}\n`;
    reportText += `Total Checked-In / Queue    : ${waitingRoom.length + inConsult.length}\n`;
    reportText += `Total Completed Visits      : ${completed.length}\n`;
    reportText += `Total Daily Earnings Today  : ₹${todayRevenue.toLocaleString('en-IN')}\n`;
    reportText += `--------------------------------------------------\n\n`;
    
    // Completed Patients
    reportText += `COMPLETED VISIT LIST:\n`;
    reportText += `--------------------------------------------------\n`;
    if (completed.length === 0) {
      reportText += `No consultations completed today.\n`;
    } else {
      completed.forEach((visit, index) => {
        const doc = doctors.find(d => d.id === visit.doctorId);
        const fee = getDoctorFeeForType(doc, visit.type);
        const feeLabel = getFeeLabelForType(visit.type);
        reportText += `${index + 1}. Patient Name  : ${visit.patientName}\n`;
        reportText += `   Time slot     : ${visit.startTime.substring(0, 5)} - ${visit.endTime.substring(0, 5)}\n`;
        reportText += `   Consultant    : Dr. ${visit.doctorName}\n`;
        reportText += `   ${feeLabel.padEnd(13, ' ')} : ₹${fee}\n`;
        if (visit.symptoms)   reportText += `   Symptoms      : ${visit.symptoms.replace(/\n/g, '\n                   ')}\n`;
        if (visit.diagnosis)  reportText += `   Diagnosis     : ${visit.diagnosis.replace(/\n/g, '\n                   ')}\n`;
        if (visit.prescription) reportText += `   Prescription  : ${visit.prescription.replace(/\n/g, '\n                   ')}\n`;
        if (visit.notes)        reportText += `   Follow-up/Note: ${visit.notes.replace(/\n/g, '\n                   ')}\n`;
        reportText += `--------------------------------------------------\n`;
      });
    }
    
    // Save to localStorage report history list
    try {
      const existingHistoryJson = localStorage.getItem('clinic_reports_history') || '[]';
      const existingHistory = JSON.parse(existingHistoryJson);
      
      const newEntry = {
        date: todayStr,
        timestamp: new Date().toISOString(),
        totalPatients: completed.length,
        earnings: todayRevenue,
        content: reportText
      };
      
      existingHistory.unshift(newEntry);
      localStorage.setItem('clinic_reports_history', JSON.stringify(existingHistory.slice(0, 50)));
    } catch (e) {
      console.error('Failed to save report in localStorage history', e);
    }
    
    // Trigger file download in browser
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clinic_daily_report_${todayStr}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleResetDashboard = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetting(true);
    setResetError(null);
    
    try {
      // First, compile and download the daily report
      generateAndSaveReport();
      
      // Request purge from backend
      await apiClient.post('/appointments/reset-today', null, {
        params: { password: resetPassword }
      });
      
      // Close modal
      setIsResetModalOpen(false);
      setResetPassword('');
      
      // Refresh dashboard appointments
      const todayStr = getTodayString();
      const params: { date: string; doctorId?: string } = { date: todayStr };
      const activeDocId = user?.role === 'DOCTOR' ? user.id : selectedDoctorId;
      if (activeDocId) {
        params.doctorId = activeDocId;
      }
      const apptsRes = await apiClient.get<Appointment[]>('/appointments', { params });
      setAppointments(apptsRes.data);
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string; error?: string } }; message?: string };
      const msg = axiosError?.response?.data?.message || axiosError?.response?.data?.error || axiosError?.message || 'Verification failed. Password incorrect.';
      setResetError(msg);
    } finally {
      setIsResetting(false);
    }
  };

  // Group appointments with Emergency Priority Sorting
  const waitingRoom = appointments
    .filter(a => a.status === 'CHECKED_IN')
    .sort((a, b) => {
      if (a.type === 'EMERGENCY' && b.type !== 'EMERGENCY') return -1;
      if (a.type !== 'EMERGENCY' && b.type === 'EMERGENCY') return 1;
      return 0;
    });
  const upcoming = appointments.filter(a => a.status === 'SCHEDULED');
  const inConsult = appointments
    .filter(a => a.status === 'IN_CONSULTATION')
    .sort((a, b) => {
      if (a.type === 'EMERGENCY' && b.type !== 'EMERGENCY') return -1;
      if (a.type !== 'EMERGENCY' && b.type === 'EMERGENCY') return 1;
      return 0;
    });
  const completed = appointments.filter(a => a.status === 'COMPLETED');

  // Assign Token Numbers (T-01, T-02...) based on appointment order by startTime
  const appointmentTokenMap = useMemo(() => {
    const map = new Map<string, string>();
    const sorted = [...appointments].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    sorted.forEach((appt, index) => {
      map.set(appt.id, `T-${String(index + 1).padStart(2, '0')}`);
    });
    return map;
  }, [appointments]);

  // Sort completed consultations list by Token Number (Ascending or Descending)
  const sortedCompleted = useMemo(() => {
    const list = [...completed];
    list.sort((a, b) => {
      const tokenA = appointmentTokenMap.get(a.id) || '';
      const tokenB = appointmentTokenMap.get(b.id) || '';
      const cmp = tokenA.localeCompare(tokenB, undefined, { numeric: true });
      return completedSortOrder === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [completed, appointmentTokenMap, completedSortOrder]);

  // Calculates revenue dynamically using the doctor's custom fees per appointment type
  const todayRevenue = completed.reduce((sum, appt) => {
    const doc = doctors.find(d => d.id === appt.doctorId);
    const fee = getDoctorFeeForType(doc, appt.type);
    return sum + fee;
  }, 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* 1. Header Greeting Section - Premium Glassmorphic Executive Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/50 dark:border-slate-800 bg-slate-900/95 dark:bg-slate-950/85 p-6 sm:p-9 text-white shadow-xl transition-all duration-300 backdrop-blur-xl">
        {/* Ambient glowing radial light accents */}
        <div className="absolute -right-24 -top-24 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 -bottom-24 w-64 h-64 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute left-10 top-1/2 -translate-y-1/2 w-48 h-48 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 w-full">
          <div className="space-y-4">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 backdrop-blur-md border border-teal-500/20 text-[10px] font-black tracking-wider uppercase text-teal-300 shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Clinical Workspace Active</span>
            </div>

            <div className="space-y-1.5">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-none font-sans bg-gradient-to-r from-white via-white to-slate-200 bg-clip-text text-transparent">
                {greeting}, {user?.name || 'Practitioner'}
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm font-semibold flex flex-wrap items-center gap-2">
                <span>Logged in at</span>
                <strong className="text-teal-300 bg-teal-500/10 backdrop-blur-md px-3 py-1 rounded-xl border border-teal-500/20 font-bold inline-flex items-center gap-1.5 shadow-2xs">
                  <Hospital className="w-3.5 h-3.5 text-teal-350" />
                  <span>{user?.clinicName || 'Clinic Practice'}</span>
                </strong>
              </p>
            </div>

            <div className="pt-1 flex flex-wrap gap-3">
              <Button
                size="sm"
                className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-450 hover:to-emerald-550 text-white font-bold rounded-xl shadow-lg shadow-teal-500/25 text-xs h-10 px-4.5 transition-all duration-200 active:scale-98 flex items-center space-x-2 border-0 cursor-pointer"
                onClick={() => setIsRegisterModalOpen(true)}
              >
                <Plus className="w-4 h-4 text-white" />
                <span>Register Patient</span>
              </Button>
              <Button
                size="sm"
                className="bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 backdrop-blur-md font-bold rounded-xl text-xs h-10 px-4.5 transition-all duration-200 active:scale-98 flex items-center space-x-2 shadow-2xs cursor-pointer"
                onClick={handleOpenBookSlotModal}
              >
                <CalendarDays className="w-4 h-4 text-teal-300" />
                <span>Book Slot</span>
              </Button>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end gap-3 shrink-0 self-stretch md:self-auto justify-between md:justify-center">
            <div className="bg-slate-950/60 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/5 text-white font-bold flex flex-col items-start md:items-end shadow-inner shadow-black/25 min-w-[220px]">
              <LiveClock iconClassName="w-5 h-5 text-teal-400 animate-pulse" />
            </div>
            <div className="bg-white/5 px-3.5 py-1.5 rounded-xl border border-white/10 text-[10px] font-black tracking-wider uppercase flex items-center gap-2 text-teal-300 shadow-2xs self-start md:self-auto">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Role: {user?.role}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Executive Metrics Bar with Customize Settings Button */}
      <div className="space-y-5">
        <div className="flex flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900/95 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-xs backdrop-blur-md">
          <div className="flex items-center gap-3 pl-1">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/10 dark:border-teal-500/30 shadow-2xs">
              <BarChart3 className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 tracking-wider uppercase">
                Dashboard Overview
              </h2>
              <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 hidden sm:block mt-0.5">
                Key performance metrics & operational stats
              </p>
            </div>
          </div>

          {/* Customize Settings Action Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsCustomizeModalOpen(true)}
            className="h-9 px-4 text-xs font-bold text-slate-700 dark:text-slate-200 border-slate-200/60 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all duration-200 flex items-center gap-2 shrink-0 cursor-pointer shadow-2xs"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-teal-500" />
            <span>Customize Settings</span>
          </Button>
        </div>

        {/* Dynamic Metric Cards Grid */}
        {(() => {
          const cardConfigs = [
            {
              id: 'today_revenue',
              title: "Today's Revenue",
              category: 'financial',
              icon: IndianRupee,
              iconBg: 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/15',
              iconColor: 'text-amber-600 dark:text-amber-400',
              borderColor: 'hover:border-amber-500/30 hover:ring-amber-550/10',
              value: `₹${todayRevenue.toLocaleString('en-IN')}`,
              subtext: 'Sum of consultation, follow-up & emergency fees',
              footerIcon: Info,
              footerText: 'Operational Revenue',
              footerColor: 'text-amber-600 dark:text-amber-400 bg-amber-500/5 border-amber-500/10'
            },
            {
              id: 'today_appts',
              title: "Today's Appointments",
              category: 'operations',
              icon: CalendarDays,
              iconBg: 'bg-teal-500/10 dark:bg-teal-500/20 border-teal-500/15',
              iconColor: 'text-teal-600 dark:text-teal-400',
              borderColor: 'hover:border-teal-500/30 hover:ring-teal-555/10',
              value: appointments.length,
              subtext: `${waitingRoom.length + inConsult.length} in queue, ${upcoming.length} upcoming`,
              footerIcon: Activity,
              footerText: 'Live Sync Active',
              footerColor: 'text-teal-600 dark:text-teal-400 bg-teal-500/5 border-teal-500/10'
            },
            {
              id: 'visited_today',
              title: "Visited Today",
              category: 'operations',
              icon: CheckCircle2,
              iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/15',
              iconColor: 'text-emerald-600 dark:text-emerald-400',
              borderColor: 'hover:border-emerald-500/30 hover:ring-emerald-555/10',
              value: completed.length,
              subtext: 'Completed consultations today',
              footerIcon: Activity,
              footerText: 'Done Consultations',
              footerColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 border-emerald-500/10'
            },
            {
              id: 'new_patients',
              title: "New Patients Today",
              category: 'patients',
              icon: Users2,
              iconBg: 'bg-sky-500/10 dark:bg-sky-500/20 border-sky-500/15',
              iconColor: 'text-sky-600 dark:text-sky-400',
              borderColor: 'hover:border-sky-500/30 hover:ring-sky-555/10',
              value: newPatientsToday,
              subtext: `Registered today (Total: ${totalPatients})`,
              footerIcon: CheckCircle2,
              footerText: 'Database Connected',
              footerColor: 'text-sky-600 dark:text-sky-400 bg-sky-500/5 border-sky-500/10'
            },
            {
              id: 'waiting_lounge',
              title: "Seated in Lounge",
              category: 'operations',
              icon: UserCheck,
              iconBg: 'bg-indigo-500/10 dark:bg-indigo-500/20 border-indigo-500/15',
              iconColor: 'text-indigo-600 dark:text-indigo-400',
              borderColor: 'hover:border-indigo-500/30 hover:ring-indigo-555/10',
              value: waitingRoom.length,
              subtext: 'Patients checked-in & seated in lounge',
              footerIcon: Clock,
              footerText: 'Queue Monitor',
              footerColor: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/5 border-indigo-500/10'
            },
            {
              id: 'in_consultation',
              title: "In Doctor Chamber",
              category: 'operations',
              icon: Stethoscope,
              iconBg: 'bg-purple-500/10 dark:bg-purple-500/20 border-purple-500/15',
              iconColor: 'text-purple-600 dark:text-purple-400',
              borderColor: 'hover:border-purple-500/30 hover:ring-purple-555/10',
              value: inConsult.length,
              subtext: 'Active consultations in doctor chamber',
              footerIcon: Activity,
              footerText: 'Chamber Active',
              footerColor: 'text-purple-600 dark:text-purple-400 bg-purple-500/5 border-purple-500/10'
            },
            {
              id: 'avg_wait',
              title: "Est. Lounge Wait",
              category: 'operations',
              icon: Clock,
              iconBg: 'bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/15',
              iconColor: 'text-rose-600 dark:text-rose-400',
              borderColor: 'hover:border-rose-500/30 hover:ring-rose-555/10',
              value: `~${waitingRoom.length > 0 ? Math.min(45, Math.max(10, waitingRoom.length * 12)) : 0} m`,
              subtext: 'Calculated average waiting time',
              footerIcon: Zap,
              footerText: 'Time Estimate',
              footerColor: 'text-rose-600 dark:text-rose-400 bg-rose-500/5 border-rose-500/10'
            },
            {
              id: 'emergency_count',
              title: "Emergency Priority",
              category: 'operations',
              icon: AlertCircle,
              iconBg: 'bg-red-500/10 dark:bg-red-500/20 border-red-500/15',
              iconColor: 'text-red-600 dark:text-red-400',
              borderColor: 'hover:border-red-500/30 hover:ring-red-555/10',
              value: appointments.filter(a => a.type === 'EMERGENCY').length,
              subtext: 'High-priority emergency visit requests',
              footerIcon: Shield,
              footerText: 'Priority Stream',
              footerColor: 'text-red-600 dark:text-red-400 bg-red-500/5 border-red-500/10'
            }
          ];

          const filteredCards = cardConfigs
            .filter(card => visibleCardIds.includes(card.id))
            .sort((a, b) => {
              const indexA = cardsOrder.indexOf(a.id);
              const indexB = cardsOrder.indexOf(b.id);
              if (indexA === -1) return 1;
              if (indexB === -1) return -1;
              return indexA - indexB;
            });

          if (filteredCards.length === 0) {
            return (
              <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-8 text-center max-w-md mx-auto">
                <SlidersHorizontal className="w-10 h-10 text-teal-500 mx-auto mb-2" />
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">No Metric Cards Visible</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Customize your visible dashboard cards using the settings button.
                </p>
                <Button
                  size="sm"
                  onClick={() => setIsCustomizeModalOpen(true)}
                  className="mt-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl"
                >
                  Customize Settings
                </Button>
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {filteredCards.map(card => {
                const isFav = favoriteCardIds.includes(card.id);
                const IconComponent = card.icon;
                const FooterIconComponent = card.footerIcon;

                return (
                  <Card key={card.id} className={`relative border border-slate-200/60 dark:border-slate-850 bg-white dark:bg-slate-900/90 hover:shadow-md hover:ring-2 rounded-2xl overflow-hidden group shadow-2xs transition-all duration-300 hover:-translate-y-1.5 ${card.borderColor}`}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative">
                      <CardTitle className="text-[11px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider pr-6">
                        {card.title}
                      </CardTitle>
                      <div className="flex items-center gap-1.5">
                        {/* Favorite Star Toggle */}
                        <button
                          type="button"
                          onClick={() => toggleFavoriteCard(card.id)}
                          className="p-1 rounded-lg text-slate-350 hover:text-amber-500 dark:text-slate-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
                          title={isFav ? 'Remove from Favorites' : 'Mark as Favorite Card'}
                        >
                          <Star className={`w-3.5 h-3.5 transition-all ${isFav ? 'fill-amber-450 text-amber-500 scale-110' : 'hover:scale-105'}`} />
                        </button>
                        <div className={`${card.iconBg} p-2 rounded-xl ${card.iconColor} border border-slate-100/50 dark:border-slate-800/80 shadow-2xs transition-all duration-300 group-hover:scale-105`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-1.5">
                      {loadingStats ? (
                        <div className="h-8 w-16 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg" />
                      ) : (
                        <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 font-mono tracking-tight">
                          {card.value}
                        </div>
                      )}
                      <p className="text-xs text-slate-400 dark:text-slate-450 font-medium mt-1 min-h-[32px] leading-relaxed">
                        {card.subtext}
                      </p>
                      <div className={`mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 text-[10px] ${card.footerColor} font-black uppercase tracking-wider flex items-center justify-center rounded-lg py-1 px-2.5 w-max border`}>
                        <FooterIconComponent className="w-3.5 h-3.5 mr-1 shrink-0" />
                        <span>{card.footerText}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* 3. Quick Actions Section */}
      <div className="space-y-4">
        <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 tracking-wider uppercase pl-1">
          Quick Action Launchers
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="h-20 border border-slate-205/60 dark:border-slate-800/80 hover:border-teal-500/40 hover:bg-teal-500/5 dark:hover:bg-teal-950/20 justify-between p-4 flex items-center rounded-2xl bg-white dark:bg-slate-900 hover:shadow-md hover:ring-2 hover:ring-teal-500/10 transition-all duration-300 cursor-pointer group text-left w-full shadow-2xs"
          >
            <div className="flex items-center space-x-3.5 text-left">
              <div className="w-11 h-11 rounded-xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-405 flex items-center justify-center border border-teal-500/10 dark:border-teal-500/30 transition-transform duration-300 group-hover:scale-105">
                <PlusCircle className="w-5.5 h-5.5" />
              </div>
              <div>
                <p className="font-extrabold text-slate-900 dark:text-slate-100 text-sm leading-tight">New Patient</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">Register patient file</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:translate-x-1.5 group-hover:text-teal-500 transition-all" />
          </button>

          <button
            onClick={handleOpenBookSlotModal}
            className="h-20 border border-slate-205/60 dark:border-slate-800/80 hover:border-teal-500/40 hover:bg-teal-500/5 dark:hover:bg-teal-950/20 justify-between p-4 flex items-center rounded-2xl bg-white dark:bg-slate-900 hover:shadow-md hover:ring-2 hover:ring-teal-500/10 transition-all duration-300 cursor-pointer group text-left w-full shadow-2xs"
          >
            <div className="flex items-center space-x-3.5 text-left">
              <div className="w-11 h-11 rounded-xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-450 flex items-center justify-center border border-teal-500/10 dark:border-teal-500/30 transition-transform duration-300 group-hover:scale-105">
                <Clock className="w-5.5 h-5.5" />
              </div>
              <div>
                <p className="font-extrabold text-slate-900 dark:text-slate-100 text-sm leading-tight">Appointments</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">Book slot calendar</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:translate-x-1.5 group-hover:text-teal-500 transition-all" />
          </button>

          <Button
            variant="outline"
            className="h-20 border-dashed border-slate-200/80 dark:border-slate-800 text-slate-400 dark:text-slate-600 justify-between p-4 flex items-center rounded-2xl bg-slate-50/40 dark:bg-slate-900/40 shadow-none cursor-not-allowed select-none opacity-60 w-full"
            disabled
          >
            <div className="flex items-center space-x-3.5 text-left">
              <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 flex items-center justify-center border border-slate-200/50 dark:border-slate-800">
                <FileText className="w-5.5 h-5.5" />
              </div>
              <div>
                <p className="font-extrabold text-slate-400 dark:text-slate-600 text-sm leading-tight">Billing</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">Phase 5 (Locked)</p>
              </div>
            </div>
          </Button>

          <Link
            href="/reports"
            className="h-20 border border-slate-205/60 dark:border-slate-800/80 hover:border-teal-500/40 hover:bg-teal-500/5 dark:hover:bg-teal-950/20 justify-between p-4 flex items-center rounded-2xl bg-white dark:bg-slate-900 hover:shadow-md hover:ring-2 hover:ring-teal-500/10 transition-all duration-300 cursor-pointer group text-left shadow-2xs"
          >
            <div className="flex items-center space-x-3.5 text-left">
              <div className="w-11 h-11 rounded-xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-455 flex items-center justify-center border border-teal-500/10 dark:border-teal-500/30 transition-transform duration-300 group-hover:scale-105">
                <BarChart3 className="w-5.5 h-5.5" />
              </div>
              <div>
                <p className="font-extrabold text-slate-905 dark:text-slate-100 text-sm leading-tight">Reports</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">Clinic analytics logs</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:translate-x-1.5 group-hover:text-teal-500 transition-all" />
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-805 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-6 backdrop-blur-xl relative overflow-hidden">
        {/* Section Header & Operations Bar */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-slate-100 dark:border-slate-800/80 pb-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-650 dark:text-slate-450">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>Live Queue Operations Hub</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Waiting Room & Doctor Queue
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium">
              Real-time patient stream, consultation workflow & waiting room management
            </p>
          </div>

          {/* Real-time Metric Badges & Controls */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Quick Stat Chips */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
              <div className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-450" />
                <span>In Consult: <strong>{inConsult.length}</strong></span>
              </div>
              <div className="px-3 py-1 rounded-xl bg-slate-105 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5">
                <span>Waiting: <strong>{waitingRoom.length}</strong></span>
              </div>
              <div className="px-3 py-1 rounded-xl bg-slate-105 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5">
                <span>Upcoming: <strong>{upcoming.length}</strong></span>
              </div>
            </div>

            {/* Doctor Filter & Actions */}
            {user?.role !== 'DOCTOR' && (
              <div className="min-w-[200px]">
                <select
                  id="doctorSelect"
                  className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-slate-350 shadow-2xs"
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                >
                  <option value="">All Doctors (Clinic Queue)</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>Dr. {d.name}</option>
                  ))}
                </select>
              </div>
            )}
            
            {(user?.role === 'DOCTOR' || user?.role === 'ADMIN') && (
              <Button
                type="button"
                variant="outline"
                className="h-10 border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-455 hover:bg-rose-50 dark:hover:bg-rose-955/40 font-bold rounded-xl flex items-center gap-1.5 text-xs shadow-2xs"
                onClick={() => {
                  setResetError(null);
                  setResetPassword('');
                  setIsResetModalOpen(true);
                }}
              >
                <X className="w-4 h-4 text-rose-500" /> Purge & Reset
              </Button>
            )}
          </div>
        </div>

        {/* Tab Stream Filter Bar */}
        <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800 pb-1.5 pt-1.5 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setQueueTab('all')}
            className={`px-4.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 flex items-center gap-2 border border-transparent cursor-pointer ${
              queueTab === 'all'
                ? 'bg-teal-600 text-white shadow-xs font-extrabold border-teal-550/20'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40'
            }`}
          >
            <span>All Stream Overview</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              queueTab === 'all'
                ? 'bg-teal-700/60 text-white'
                : 'bg-slate-200/60 dark:bg-slate-800/80 text-slate-700 dark:text-slate-350'
            }`}>
              {appointments.length}
            </span>
          </button>
          <button
            onClick={() => setQueueTab('in_consult')}
            className={`px-4.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 flex items-center gap-2 border border-transparent cursor-pointer ${
              queueTab === 'in_consult'
                ? 'bg-teal-600 text-white shadow-xs font-extrabold border-teal-550/20'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40'
            }`}
          >
            <span>Active Consultations</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              queueTab === 'in_consult'
                ? 'bg-teal-700/60 text-white'
                : 'bg-slate-200/60 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300'
            }`}>
              {inConsult.length}
            </span>
          </button>
          <button
            onClick={() => setQueueTab('waiting')}
            className={`px-4.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 flex items-center gap-2 border border-transparent cursor-pointer ${
              queueTab === 'waiting'
                ? 'bg-teal-600 text-white shadow-xs font-extrabold border-teal-550/20'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40'
            }`}
          >
            <span>Waiting Room Queue</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              queueTab === 'waiting'
                ? 'bg-teal-700/60 text-white'
                : 'bg-slate-200/60 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300'
            }`}>
              {waitingRoom.length}
            </span>
          </button>
          <button
            onClick={() => setQueueTab('upcoming')}
            className={`px-4.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 flex items-center gap-2 border border-transparent cursor-pointer ${
              queueTab === 'upcoming'
                ? 'bg-teal-600 text-white shadow-xs font-extrabold border-teal-550/20'
                : 'text-slate-500 hover:text-slate-905 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40'
            }`}
          >
            <span>Upcoming Today</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              queueTab === 'upcoming'
                ? 'bg-teal-700/60 text-white'
                : 'bg-slate-200/60 dark:bg-slate-800/80 text-slate-700 dark:text-slate-350'
            }`}>
              {upcoming.length}
            </span>
          </button>
          <button
            onClick={() => setQueueTab('completed')}
            className={`px-4.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 flex items-center gap-2 border border-transparent cursor-pointer ${
              queueTab === 'completed'
                ? 'bg-teal-600 text-white shadow-xs font-extrabold border-teal-550/20'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40'
            }`}
          >
            <span>Completed History</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              queueTab === 'completed'
                ? 'bg-teal-700/60 text-white'
                : 'bg-slate-200/60 dark:bg-slate-800/80 text-slate-700 dark:text-slate-350'
            }`}>
              {completed.length}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
          {/* Active Waiting Room Queue & In Consult Spotlight */}
          {(queueTab === 'all' || queueTab === 'in_consult' || queueTab === 'waiting') && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pl-1">
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2 tracking-wide uppercase">
                  <span className="w-2.5 h-2.5 bg-slate-400 rounded-full" />
                  <span>Waiting Room & Active Consultations</span>
                </h3>
                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shadow-2xs font-mono">
                  {waitingRoom.length + inConsult.length} Patients
                </span>
              </div>
              
              {waitingRoom.length === 0 && inConsult.length === 0 ? (
                <div className="border border-dashed border-slate-205 dark:border-slate-800 rounded-3xl p-10 text-center text-slate-400 dark:text-slate-555 bg-slate-50/40 dark:bg-slate-800/20">
                  <Users2 className="w-10 h-10 mx-auto text-slate-350 dark:text-slate-700 mb-3" />
                  <p className="text-base font-extrabold text-slate-800 dark:text-slate-250">Waiting Room Empty</p>
                  <p className="text-xs text-slate-450 dark:text-slate-500 font-semibold mt-1">Receptionists can check-in patients from the upcoming schedule.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 1. Spotlight In Consultation cards */}
                  {(queueTab === 'all' || queueTab === 'in_consult') && inConsult.map(appt => (
                    <div key={appt.id} className="relative rounded-2xl p-5 border-l-4 border-l-teal-500 border-y border-r border-slate-200/80 dark:border-slate-805 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-shadow duration-200">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="space-y-3.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/15 shadow-2xs flex items-center gap-1.5">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                              </span>
                              <span>LIVE IN CONSULTATION</span>
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-650 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
                              {appt.startTime.substring(0, 5)} - {appt.endTime.substring(0, 5)}
                            </span>
                          </div>

                          <div className="flex items-center gap-3.5 pt-1">
                            <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 font-extrabold flex items-center justify-center text-sm shrink-0 border border-slate-200 dark:border-slate-700">
                              {appt.patientName.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                {user?.role === 'DOCTOR' || user?.role === 'ADMIN' ? (
                                  <button
                                    onClick={() => handleOpenPatientFile(appt)}
                                    className="font-extrabold text-slate-900 dark:text-slate-105 hover:text-slate-700 dark:hover:text-slate-300 hover:underline text-left text-lg leading-tight cursor-pointer"
                                  >
                                    {appt.patientName}
                                  </button>
                                ) : (
                                  <Link href={`/patients/${appt.patientId}`} className="font-extrabold text-slate-900 dark:text-slate-105 hover:text-slate-700 dark:hover:text-slate-300 hover:underline text-lg leading-tight">
                                    {appt.patientName}
                                  </Link>
                                )}

                                {appt.type === 'EMERGENCY' && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-rose-600 text-white text-[10px] font-bold tracking-wider uppercase shadow-xs animate-pulse">
                                    <AlertCircle className="w-3.5 h-3.5 text-white shrink-0" />
                                    <span>Emergency</span>
                                  </span>
                                )}
                              </div>

                              <p className="text-xs font-semibold text-slate-450 dark:text-slate-500 flex items-center gap-1.5 mt-0.5">
                                <Stethoscope className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                <span>Assigned Practitioner: <strong className="text-teal-600 dark:text-teal-400 font-extrabold">Dr. {appt.doctorName}</strong></span>
                              </p>
                            </div>
                          </div>

                          {appt.reason && (
                            <div className="text-xs text-slate-600 dark:text-slate-350 bg-slate-50/80 dark:bg-slate-800/80 border border-slate-150 dark:border-slate-800 p-3 rounded-xl italic font-semibold shadow-2xs leading-relaxed">
                              &ldquo;{appt.reason}&rdquo;
                            </div>
                          )}
                        </div>

                        {(user?.role === 'DOCTOR' || user?.role === 'ADMIN') && (
                          <div className="flex flex-wrap sm:flex-col gap-2 shrink-0 self-end sm:self-center w-full sm:w-auto">
                            <Button
                              size="sm"
                              className="h-10 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-450 hover:to-emerald-550 text-white rounded-xl font-bold text-xs shadow-md shadow-teal-500/15 transition-all flex items-center justify-center gap-2 border-0 px-4 cursor-pointer active:scale-98"
                              onClick={() => handleOpenPatientFile(appt)}
                            >
                              <Stethoscope className="w-4 h-4 text-white" />
                              <span>Open EMR Workspace</span>
                            </Button>
                            <Button
                              size="sm"
                              className="h-10 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-2 px-4 cursor-pointer active:scale-98"
                              onClick={() => handleDirectComplete(appt)}
                            >
                              <CheckCircle2 className="w-4 h-4 text-slate-500" />
                              <span>Complete Visit</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* 2. Token Waiting Room Cards */}
                  {(queueTab === 'all' || queueTab === 'waiting') && waitingRoom.map((appt, idx) => {
                    const isEmergency = appt.type === 'EMERGENCY';
                    return (
                      <div
                        key={appt.id}
                        className={`rounded-2xl p-4.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border ${
                          isEmergency
                            ? 'border-rose-200 dark:border-rose-900/40 bg-rose-500/5 dark:bg-rose-955/15 shadow-2xs'
                            : 'border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 hover:shadow-xs transition-shadow duration-200'
                        }`}
                      >
                        <div className="space-y-2 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Standard Callout Token T-01 */}
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-lg shadow-2xs font-mono border ${
                              isEmergency
                                ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/15'
                                : 'bg-teal-500/10 text-teal-700 dark:text-teal-305 border-teal-500/15'
                            }`}>
                              Token T-{String(idx + 1).padStart(2, '0')}
                            </span>

                            {/* Explicit Booking Type Pill Tag */}
                            {isEmergency ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/15 text-rose-700 dark:text-rose-350 text-[10px] font-bold tracking-wider uppercase animate-pulse">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span>Emergency Priority</span>
                              </span>
                            ) : appt.type === 'FOLLOW_UP' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/15 text-amber-700 dark:text-amber-350 text-[10px] font-bold tracking-wider uppercase">
                                <span>Follow Up</span>
                              </span>
                            ) : appt.startTime ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-sky-500/10 border border-sky-500/15 text-sky-700 dark:text-sky-355 text-[10px] font-bold tracking-wider uppercase">
                                <span>Scheduled</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/15 text-emerald-700 dark:text-emerald-355 text-[10px] font-bold tracking-wider uppercase">
                                <span>Walk-In</span>
                              </span>
                            )}

                            <div className="inline-flex items-center gap-2 flex-wrap pl-1">
                              {user?.role === 'DOCTOR' || user?.role === 'ADMIN' ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPatientFile(appt)}
                                  className={`font-bold hover:underline text-left text-sm truncate cursor-pointer ${
                                    isEmergency ? 'text-rose-700 dark:text-rose-300 font-extrabold text-[15px]' : 'text-slate-905 dark:text-slate-100 hover:text-teal-650 dark:hover:text-teal-400'
                                  }`}
                                >
                                  {appt.patientName}
                                </button>
                              ) : (
                                <Link href={`/patients/${appt.patientId}`} className={`font-bold hover:underline text-sm truncate ${
                                  isEmergency ? 'text-rose-700 dark:text-rose-300 font-extrabold text-[15px]' : 'text-slate-905 dark:text-slate-100 hover:text-teal-650 dark:hover:text-teal-400'
                                }`}>
                                  {appt.patientName}
                                </Link>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-3 text-xs font-semibold text-slate-455 dark:text-slate-500 pl-0.5">
                            <span>Slot: <strong className="text-slate-805 dark:text-slate-205 font-mono">{appt.startTime.substring(0, 5)} - {appt.endTime.substring(0, 5)}</strong></span>
                            <span>•</span>
                            <span>Practitioner: Dr. {appt.doctorName}</span>
                          </div>
                          {appt.reason && (
                            <p className={`text-xs p-2.5 rounded-xl italic font-semibold ${
                              isEmergency
                                ? 'bg-rose-500/5 text-rose-800 dark:text-rose-350 border border-rose-500/10'
                                : 'bg-slate-50/80 dark:bg-slate-800/80 text-slate-650 dark:text-slate-350 border border-slate-100 dark:border-slate-800'
                            }`}>
                              &ldquo;{appt.reason}&rdquo;
                            </p>
                          )}
                        </div>

                        {user?.role === 'DOCTOR' || user?.role === 'ADMIN' ? (
                          <div className="flex flex-wrap sm:flex-nowrap gap-2 shrink-0 self-end sm:self-center">
                            <Button
                              size="sm"
                              className="h-9.5 rounded-xl font-bold text-xs shadow-md shadow-teal-500/10 transition-all flex items-center gap-1.5 px-3.5 border-0 cursor-pointer active:scale-98 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-450 hover:to-emerald-550 text-white"
                              onClick={() => handleOpenPatientFile(appt)}
                            >
                              <Stethoscope className="w-3.5 h-3.5 text-white" />
                              <span>Start Consult</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9.5 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl font-bold text-xs shadow-2xs transition-all flex items-center gap-1.5 px-3 cursor-pointer"
                              onClick={() => handleDirectComplete(appt)}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" /> Complete
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-xl border bg-slate-100 dark:bg-slate-805 text-slate-650 dark:text-slate-400 border-slate-200 dark:border-slate-700">
                            {isEmergency ? 'Priority Queue' : 'In Queue'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Upcoming Schedule Queue */}
          {(queueTab === 'all' || queueTab === 'upcoming') && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pl-1">
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2 tracking-wide uppercase">
                  <span className="w-2.5 h-2.5 bg-slate-400 rounded-full" />
                  <span>Upcoming Appointments Today</span>
                </h3>
                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shadow-2xs font-mono">
                  {upcoming.length} Scheduled
                </span>
              </div>

              {upcoming.length === 0 ? (
                <div className="border border-dashed border-slate-205 dark:border-slate-800 rounded-3xl p-10 text-center text-slate-400 dark:text-slate-555 bg-slate-50/40 dark:bg-slate-800/20">
                  <CalendarDays className="w-10 h-10 mx-auto text-slate-350 dark:text-slate-700 mb-3" />
                  <p className="text-base font-extrabold text-slate-800 dark:text-slate-250">No Upcoming Appointments</p>
                  <p className="text-xs text-slate-455 dark:text-slate-500 font-semibold mt-1">Click &ldquo;Book Slot&rdquo; in upper banner to schedule an appointment.</p>
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
                  {upcoming.map((appt) => (
                    <div key={appt.id} className="relative border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 rounded-2xl p-4.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-2xs group">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-650 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-lg font-sans">
                            {appt.type || 'Consult'}
                          </span>
                          <Link href={`/patients/${appt.patientId}`} className="font-extrabold text-slate-900 dark:text-slate-100 hover:text-slate-700 dark:hover:text-slate-300 hover:underline text-sm truncate">
                            {appt.patientName}
                          </Link>
                          {appt.type === 'EMERGENCY' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-rose-500/5 border border-rose-500/10 text-rose-700 dark:text-rose-350 text-[10px] font-bold uppercase tracking-wider">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-450 shrink-0" />
                              <span>Emergency Booked</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-slate-455 dark:text-slate-500 pl-0.5">
                          Slot: <strong className="text-slate-800 dark:text-slate-200 font-mono">{appt.startTime.substring(0, 5)} - {appt.endTime.substring(0, 5)}</strong>
                        </p>
                        <p className="text-xs font-semibold text-slate-450 dark:text-slate-550 pl-0.5">
                          Attending: Dr. {appt.doctorName}
                        </p>
                      </div>
                      
                      {/* Standard Check-In Action */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center w-full sm:w-auto">
                        <Button
                          size="sm"
                          className="h-9.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-805 dark:text-slate-205 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs shadow-2xs transition-colors duration-200 flex items-center justify-center gap-1.5 px-3.5 w-full sm:w-auto cursor-pointer"
                          onClick={() => handleCheckIn(appt.id)}
                        >
                          <span>Check In Patient</span>
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Completed list */}
        {(queueTab === 'all' || queueTab === 'completed') && completed.length > 0 && (
          <div className="pt-6 border-t border-slate-200/60 dark:border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2 tracking-wide uppercase pl-1">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                <span>Completed Consultations Today</span>
              </h3>

              <div className="flex flex-wrap items-center gap-3">
                {/* Ascending / Descending Token Filter Button */}
                <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/80 shadow-2xs">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 flex items-center gap-1">
                    <ArrowUpDown className="w-3.5 h-3.5 text-teal-650" />
                    <span>Sort Token:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setCompletedSortOrder('asc')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      completedSortOrder === 'asc'
                        ? 'bg-teal-600 text-white shadow-2xs font-extrabold'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                    title="Sort Token Ascending (T-01 → T-N)"
                  >
                    <ArrowUp className="w-3 h-3" />
                    <span>Ascending</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompletedSortOrder('desc')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      completedSortOrder === 'desc'
                        ? 'bg-teal-600 text-white shadow-2xs font-extrabold'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                    title="Sort Token Descending (T-N → T-01)"
                  >
                    <ArrowDown className="w-3 h-3" />
                    <span>Descending</span>
                  </button>
                </div>

                <span className="text-[10px] font-black uppercase text-emerald-705 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/15 shadow-2xs font-mono">
                  {completed.length} Done
                </span>
              </div>
            </div>
            
            <div className="overflow-hidden border border-slate-205/60 dark:border-slate-800 rounded-2xl shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200/60 dark:border-slate-800 text-slate-400 dark:text-slate-550 font-extrabold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4 font-black">Token #</th>
                    <th className="py-3.5 px-4 font-black">Patient Name</th>
                    <th className="py-3.5 px-4 font-black">Timing Slot</th>
                    <th className="py-3.5 px-4 font-black">Visit Type</th>
                    <th className="py-3.5 px-4 font-black">Doctor</th>
                    <th className="py-3.5 px-4 font-black">Diagnosis</th>
                    <th className="py-3.5 px-4 text-right font-black">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                  {sortedCompleted.map(appt => {
                    const tokenNum = appointmentTokenMap.get(appt.id) || 'T-01';
                    return (
                      <tr key={appt.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-black">
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-707 dark:text-emerald-300 border border-emerald-500/15 text-[10px] font-bold shadow-2xs font-mono">
                            Token {tokenNum}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-extrabold text-slate-900 dark:text-slate-100">
                          {user?.role === 'DOCTOR' || user?.role === 'ADMIN' ? (
                            <button
                              type="button"
                              onClick={() => handleOpenPatientFile(appt)}
                              className="font-extrabold text-slate-905 dark:text-slate-100 hover:text-teal-650 dark:hover:text-teal-400 hover:underline text-left cursor-pointer"
                            >
                              {appt.patientName}
                            </button>
                          ) : (
                            <Link href={`/patients/${appt.patientId}`} className="font-extrabold text-slate-905 dark:text-slate-101 hover:text-teal-650 dark:hover:text-teal-400 hover:underline">
                              {appt.patientName}
                            </Link>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-450 font-mono font-bold">
                          {appt.startTime.substring(0, 5)} - {appt.endTime.substring(0, 5)}
                        </td>
                        <td className="py-3 px-4 font-extrabold">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] uppercase font-bold border ${
                            appt.type === 'EMERGENCY'
                              ? 'bg-rose-500/10 text-rose-700 dark:text-rose-350 border-rose-500/15'
                              : appt.type === 'FOLLOW_UP'
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/15'
                              : 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/15'
                          }`}>
                            {appt.type || 'Consult'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-550 dark:text-slate-450 font-semibold">
                          Dr. {appt.doctorName}
                        </td>
                        <td className="py-3 px-4 text-slate-650 dark:text-slate-400 font-semibold max-w-[200px] truncate" title={appt.diagnosis || ''}>
                          {appt.diagnosis || <span className="text-slate-400 dark:text-slate-555 italic font-medium">None Recorded</span>}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            className="text-teal-605 dark:text-teal-400 hover:text-teal-750 dark:hover:text-teal-300 font-bold text-[11px] hover:underline flex items-center gap-1.5 ml-auto cursor-pointer"
                            onClick={() => handleOpenPatientFile(appt)}
                          >
                            <History className="w-3.5 h-3.5" /> EMR File
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 6. Reset Verification Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div 
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300" 
            onClick={() => {
              if (!isResetting) setIsResetModalOpen(false);
            }}
          />
          
          <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md z-10 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-150 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Reset Today&apos;s Session</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Authorizing clinical queue purge</p>
              </div>
              <button 
                type="button" 
                className="rounded-xl p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                onClick={() => setIsResetModalOpen(false)}
                disabled={isResetting}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleResetDashboard} className="p-6 space-y-4">
              {resetError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>{resetError}</div>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-xs space-y-2">
                <p className="font-bold flex items-center gap-1">
                  ⚠️ Warning: This is a destructive action!
                </p>
                <p className="font-medium text-amber-700">
                  This will purge all appointments for today to start fresh. Before deleting, a daily visit & earnings report file (.txt) will be generated and downloaded.
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Enter Account Login Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  className="w-full h-11 px-3 bg-white border border-slate-250 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Type your password to authorize reset"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  disabled={isResetting}
                />
              </div>

              {/* Submit */}
              <div className="pt-2 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl font-bold h-11 border-slate-250 text-slate-700 hover:bg-slate-100 px-5"
                  onClick={() => setIsResetModalOpen(false)}
                  disabled={isResetting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-red-650 hover:bg-red-700 text-white rounded-xl font-bold h-11 shadow-sm px-6 flex items-center gap-1.5"
                  disabled={isResetting}
                >
                  {isResetting ? 'Processing...' : 'Download Report & Reset'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Doctor Prescription Note Pad & EMR Workspace Modal */}
      {isPatientFileOpen && activeFileAppt && (
        <DoctorPrescriptionNotepadModal
          isOpen={isPatientFileOpen}
          onClose={() => {
            setIsPatientFileOpen(false);
            setActiveFileAppt(null);
          }}
          appointment={activeFileAppt}
          doctor={user?.role === 'DOCTOR' ? (user as unknown as Doctor) : doctors.find((d) => d.id === activeFileAppt.doctorId)}
          clinic={clinic}
          settings={null}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            setIsPatientFileOpen(false);
            setActiveFileAppt(null);
          }}
        />
      )}

      {/* Official Prescription Pad & EMR Document Print Modal */}
      {selectedPrintAppt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-100 rounded-3xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn my-auto">
            
            {/* STICKY Top Modal Controls Header */}
            <div className="sticky top-0 z-30 bg-slate-950 text-white px-6 py-4 flex justify-between items-center print:hidden border-b border-slate-800 shadow-md">
              <div className="flex items-center space-x-3">
                <div className="bg-sky-500/20 p-2 rounded-xl border border-sky-500/30 text-sky-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base leading-tight">Official Prescription & EMR Letterhead</h3>
                  <p className="text-[11px] text-slate-400 font-semibold">Standard OPD Letterhead preview for Dr. {selectedPrintAppt.doctorName}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Button
                  onClick={() => window.print()}
                  className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-extrabold text-xs h-10 px-5 rounded-xl flex items-center space-x-2 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Official Letterhead</span>
                </Button>
                <button
                  type="button"
                  onClick={() => setSelectedPrintAppt(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Document Container Body */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8">
              
              {/* Printable Rx Document Container Sheet */}
              <div className="p-8 sm:p-10 space-y-6 text-slate-800 bg-white border border-slate-200 rounded-3xl shadow-xl print:shadow-none print:border-none print:p-0 print:rounded-none max-w-4xl mx-auto" id="printable-rx">
                
                {/* Top Accent Line for Official Stationery Look */}
                <div className="h-2 w-full bg-gradient-to-r from-blue-900 via-sky-600 to-indigo-800 rounded-t-full print:rounded-none -mt-2 mb-4" />

                {/* 1. Header: Clinic Branding & Attending Doctor Credentials */}
                <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row justify-between items-start gap-6">
                  
                  {/* Left Column: Clinic Logo & Contact Details */}
                  <div className="flex items-start gap-4 flex-1">
                    {clinic?.logoUrl ? (
                      <img
                        src={clinic.logoUrl}
                        alt={clinic.name}
                        className="w-16 h-16 object-contain rounded-2xl border border-slate-200 p-1 shrink-0 bg-white shadow-xs"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-900 via-sky-700 to-indigo-800 text-white flex items-center justify-center shadow-md shrink-0 border border-white/20">
                        <Hospital className="w-9 h-9" />
                      </div>
                    )}

                    <div className="space-y-1">
                      <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-tight font-serif">
                        {clinic?.name || user?.clinicName || 'Nisschay Medical Centre'}
                      </h1>
                      <p className="text-xs font-bold text-sky-700 uppercase tracking-wider">
                        Multi-Specialty OPD Healthcare & Clinical EMR Services
                      </p>
                      <p className="text-[11px] text-slate-600 font-medium leading-relaxed max-w-md">
                        {clinic?.address || '123 Healthcare Boulevard, Medical District, City Centre'}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500 font-semibold font-mono">
                        <span>Ph: <strong>{clinic?.phone || '+91 98765 43210'}</strong></span>
                        <span>•</span>
                        <span>Email: <strong>{clinic?.email || 'contact@nisschayclinic.com'}</strong></span>
                        {clinic?.website && (
                          <>
                            <span>•</span>
                            <span>Web: <strong>{clinic.website}</strong></span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Consulting Doctor & Document Info Box */}
                  <div className="bg-slate-50 border border-slate-250 p-4 rounded-2xl text-left sm:text-right space-y-1.5 shrink-0 min-w-[220px] shadow-2xs">
                    {(() => {
                      const docProfile = doctors.find(d => d.id === selectedPrintAppt.doctorId);
                      return (
                        <div>
                          <h2 className="font-extrabold text-slate-900 text-base leading-tight">
                            Dr. {selectedPrintAppt.doctorName}
                          </h2>
                          <p className="text-xs text-sky-700 font-extrabold">
                            {docProfile?.qualification || 'MBBS, MD (General Medicine)'}
                          </p>
                          <p className="text-[11px] text-slate-600 font-semibold">
                            {docProfile?.specialization || 'Senior Consultant Physician'}
                          </p>
                          {docProfile?.experienceYears && docProfile.experienceYears > 0 && (
                            <p className="text-[10px] text-slate-500 font-medium">
                              {docProfile.experienceYears}+ Years Clinical Experience
                            </p>
                          )}
                        </div>
                      );
                    })()}
                    <div className="pt-2 border-t border-slate-250 font-mono text-[11px] text-slate-700 space-y-0.5">
                      <p className="font-bold text-slate-900">Rx No: RX-{selectedPrintAppt.id.slice(0, 8).toUpperCase()}</p>
                      <p>Date: <strong>{selectedPrintAppt.appointmentDate}</strong> ({selectedPrintAppt.startTime})</p>
                    </div>
                  </div>
                </div>

                {/* 2. Patient Profile & Vital Signs Banner */}
                <div className="bg-slate-50/90 border border-slate-250 rounded-2xl p-4.5 space-y-3 shadow-2xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold">
                    <div>
                      <span className="text-slate-400 block text-[9.5px] uppercase font-extrabold tracking-wider">Patient Name</span>
                      <strong className="text-slate-900 text-sm font-black">{selectedPrintAppt.patientName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9.5px] uppercase font-extrabold tracking-wider">Contact Phone</span>
                      <strong className="text-slate-800 font-mono">{selectedPrintAppt.patientPhone}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9.5px] uppercase font-extrabold tracking-wider">Consultant Doctor</span>
                      <strong className="text-sky-700 font-extrabold">Dr. {selectedPrintAppt.doctorName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9.5px] uppercase font-extrabold tracking-wider">EMR File ID</span>
                      <strong className="text-slate-700 font-mono text-[11px]">#{selectedPrintAppt.id.substring(0, 8)}</strong>
                    </div>
                  </div>

                  {/* Vitals Summary Strip */}
                  <div className="pt-3 border-t border-slate-200/80 flex flex-wrap gap-2 text-[11px] font-bold text-slate-700">
                    <span className="text-slate-400 uppercase text-[9.5px] font-black tracking-wider flex items-center self-center mr-1">Vitals:</span>
                    <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-slate-800 font-mono shadow-2xs">
                      BP: <strong>{selectedPrintAppt.bpSystolic && selectedPrintAppt.bpDiastolic ? `${selectedPrintAppt.bpSystolic}/${selectedPrintAppt.bpDiastolic}` : '120/80'} mmHg</strong>
                    </span>
                    <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-slate-800 font-mono shadow-2xs">
                      Pulse: <strong>{selectedPrintAppt.pulse || 72} bpm</strong>
                    </span>
                    <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-slate-800 font-mono shadow-2xs">
                      Temp: <strong>{selectedPrintAppt.temperature || 98.6} °F</strong>
                    </span>
                    <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-slate-800 font-mono shadow-2xs">
                      SpO2: <strong>{selectedPrintAppt.spo2 || 98}%</strong>
                    </span>
                    {selectedPrintAppt.weight && (
                      <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-slate-800 font-mono shadow-2xs">
                        Weight: <strong>{selectedPrintAppt.weight} kg</strong>
                      </span>
                    )}
                    {selectedPrintAppt.height && (
                      <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-slate-800 font-mono shadow-2xs">
                        Height: <strong>{selectedPrintAppt.height} cm</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Symptoms & Clinical Diagnosis Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedPrintAppt.symptoms && (
                    <div className="space-y-1.5 text-xs">
                      <span className="text-slate-500 font-extrabold uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                        <span>Chief Complaints / Symptoms</span>
                      </span>
                      <div className="bg-slate-50/60 border border-slate-200 p-3 rounded-xl text-slate-800 font-medium whitespace-pre-line leading-relaxed min-h-[50px]">
                        {selectedPrintAppt.symptoms}
                      </div>
                    </div>
                  )}

                  {selectedPrintAppt.diagnosis && (
                    <div className="space-y-1.5 text-xs">
                      <span className="text-sky-800 font-extrabold uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-600" />
                        <span>Clinical Diagnosis & Findings</span>
                      </span>
                      <div className="bg-sky-50/60 border border-sky-200/80 p-3 rounded-xl text-slate-900 font-bold leading-relaxed min-h-[50px]">
                        {selectedPrintAppt.diagnosis}
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Prescribed Medications (Rx) Section */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b-2 border-slate-900 pb-1.5">
                    <div className="flex items-center space-x-2 text-sky-700">
                      <span className="text-3xl font-black font-serif italic tracking-tight">Rx</span>
                      <span className="text-xs font-black uppercase tracking-wider text-slate-700">Prescribed Medications</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Outpatient Pharmacy Orders</span>
                  </div>

                  {/* Structured Rx Table */}
                  <div className="border border-slate-250 rounded-2xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/80 text-slate-700 font-black uppercase text-[9.5px] tracking-wider border-b border-slate-250">
                        <tr>
                          <th className="py-2.5 px-3 w-10 text-center">#</th>
                          <th className="py-2.5 px-4">Medicine Name & Formulation</th>
                          <th className="py-2.5 px-4">Dosage / Timing</th>
                          <th className="py-2.5 px-4">Duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/70 bg-white font-mono text-[11px] text-slate-900">
                        {parsePrescriptionLines(selectedPrintAppt.prescription).map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-3 px-3 text-center font-bold text-slate-400 font-sans">{idx + 1}</td>
                            <td className="py-3 px-4 font-bold text-slate-900 font-sans">{item.name}</td>
                            <td className="py-3 px-4 text-sky-900 font-semibold">{item.dosage || 'As Directed'}</td>
                            <td className="py-3 px-4 font-semibold text-slate-700">{item.duration || '—'}</td>
                          </tr>
                        ))}
                        {parsePrescriptionLines(selectedPrintAppt.prescription).length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-slate-400 italic">
                              No prescribed medications recorded.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 5. Doctor Instructions & Advice */}
                {selectedPrintAppt.notes && (
                  <div className="space-y-1.5 text-xs pt-1">
                    <span className="text-amber-800 font-extrabold uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span>Doctor Instructions, Advice & Investigations</span>
                    </span>
                    <div className="bg-amber-50/60 border border-amber-200/80 p-4 rounded-xl text-slate-800 italic leading-relaxed whitespace-pre-line font-medium">
                      {selectedPrintAppt.notes}
                    </div>
                  </div>
                )}
                {/* Official Bold Next Follow-Up Appointment Line */}
                <div className="bg-sky-50/80 border-2 border-sky-600 rounded-2xl p-3.5 text-center my-3 print:bg-white print:border-slate-900 print:rounded-none">
                  <p className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center justify-center gap-2">
                    <Calendar className="w-4 h-4 text-sky-600 shrink-0 print:hidden" />
                    <span>NEXT APPOINTMENT / FOLLOW-UP DATE:</span>
                    <strong className="text-sm font-extrabold text-blue-900 underline font-mono print:text-black">
                      {selectedPrintAppt.followUpDate || 'As Advised / Review as Needed'}
                    </strong>
                  </p>
                </div>

                {/* Billing Summary */}
                {(() => {
                  const doc = doctors.find(d => d.id === selectedPrintAppt.doctorId);
                  const consultFee = getDoctorFeeForType(doc, selectedPrintAppt.type);
                  const feeLabel = getFeeLabelForType(selectedPrintAppt.type);
                  const attachedServices = parseAttachedServices(selectedPrintAppt.notes);
                  const servicesTotal = attachedServices.reduce((sum, s) => sum + s.fee, 0);
                  const totalBill = consultFee + servicesTotal;

                  return (
                    <div className="space-y-2 pt-2 border-t border-slate-200 print:hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <IndianRupee className="w-4 h-4 text-emerald-600" />
                          <span>Billing & Payment Summary</span>
                        </span>
                        <span className="bg-emerald-100 text-emerald-800 font-black text-[10px] px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>PAID (Receipt #{selectedPrintAppt.id.slice(0, 6).toUpperCase()})</span>
                        </span>
                      </div>

                      <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
                        <div className="flex justify-between items-center text-slate-700">
                          <span>{feeLabel} (Dr. {selectedPrintAppt.doctorName})</span>
                          <span className="font-mono font-bold">₹{consultFee}</span>
                        </div>

                        {attachedServices.map(svc => (
                          <div key={svc.name} className="flex justify-between items-center text-slate-600 border-t border-slate-200/60 pt-1.5">
                            <span>• {svc.name}</span>
                            <span className="font-mono font-semibold">₹{svc.fee}</span>
                          </div>
                        ))}

                        <div className="flex justify-between items-center border-t-2 border-slate-300 pt-2 text-slate-900 font-black text-sm">
                          <span>Total Amount Paid</span>
                          <span className="font-mono text-emerald-700">₹{totalBill}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 6. Signature & Official Clinic Seal */}
                <div className="pt-10 border-t border-slate-200 flex justify-between items-end text-xs">
                  <div className="text-[10px] text-slate-400 max-w-xs leading-normal font-medium space-y-1">
                    <p className="font-bold text-slate-600">• Take medications strictly according to the specified timings.</p>
                    <p>• E-Signed EMR document under Nisschay Medical Portal.</p>
                    <p className="text-[9px] text-slate-400 font-mono">Ref ID: {selectedPrintAppt.id}</p>
                  </div>

                  <div className="text-center space-y-2">
                    <div className="w-48 border-b-2 border-slate-800 pb-1 text-xs font-black text-slate-900">
                      Dr. {selectedPrintAppt.doctorName}
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-600 font-extrabold uppercase tracking-wider block">
                        Authorized Medical Signatory
                      </span>
                      <span className="text-[9px] text-slate-400 font-semibold block">
                        {clinic?.name || user?.clinicName || 'Clinic Practice'} Seal
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* Timing & Dosage Selector Modal */}
      {timingModalMed && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 space-y-4 p-6">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                  Configure Dosage & Timing
                </span>
                <h3 className="text-base font-black text-slate-800 mt-1">{timingModalMed.name}</h3>
                {timingModalMed.saltComposition && (
                  <p className="text-xs text-slate-500 font-mono italic mt-0.5">{timingModalMed.saltComposition}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setTimingModalMed(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Custom vs Preset Toggle */}
              <div className="flex items-center justify-between bg-slate-50 p-2 rounded-2xl border border-slate-150">
                <button
                  type="button"
                  onClick={() => setUseCustomTiming(false)}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                    !useCustomTiming ? 'bg-white text-sky-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Quick Preset Timing
                </button>
                <button
                  type="button"
                  onClick={() => setUseCustomTiming(true)}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                    useCustomTiming ? 'bg-white text-sky-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Manual Doctor Timing
                </button>
              </div>

              {!useCustomTiming ? (
                <div className="space-y-3">
                  {/* Frequency Presets */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Frequency (Dose Pattern)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: '1-0-1 (Morning & Night)', value: '1-0-1' },
                        { label: '1-0-0 (Morning Only)', value: '1-0-0' },
                        { label: '0-0-1 (Night Only)', value: '0-0-1' },
                        { label: '1-1-1 (Thrice Daily)', value: '1-1-1' },
                        { label: '1-0-1-0 (Every 8 hr)', value: '1-0-1-0' },
                        { label: 'SOS (As Needed)', value: 'SOS' },
                      ].map(freq => (
                        <button
                          key={freq.value}
                          type="button"
                          onClick={() => setTimingFrequency(freq.value)}
                          className={`p-2 rounded-xl text-xs font-bold border transition-all text-center ${
                            timingFrequency === freq.value
                              ? 'bg-sky-50 border-sky-500 text-sky-800 ring-2 ring-sky-500/20'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {freq.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Meal Relation */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Meal Instructions</label>
                    <div className="grid grid-cols-4 gap-2">
                      {['After Food', 'Before Food', 'With Food', 'Empty Stomach'].map(food => (
                        <button
                          key={food}
                          type="button"
                          onClick={() => setTimingFood(food)}
                          className={`p-2 rounded-xl text-xs font-bold border transition-all text-center ${
                            timingFood === food
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {food}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Duration</label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                      {['3 days', '5 days', '7 days', '10 days', '14 days', '1 month'].map(dur => (
                        <button
                          key={dur}
                          type="button"
                          onClick={() => setTimingDuration(dur)}
                          className={`p-1.5 rounded-xl text-[11px] font-bold border transition-all text-center ${
                            timingDuration === dur
                              ? 'bg-indigo-50 border-indigo-500 text-indigo-800 ring-2 ring-indigo-500/20'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {dur}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Custom Doctor Timing Input */
                <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    Custom Doctor Timing & Manual Instructions
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Take 1 tab at 8 AM and 1 tab at 8 PM for 5 days after food"
                    className="w-full h-11 px-3 bg-white border border-slate-250 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                    value={customTimingInput}
                    onChange={(e) => setCustomTimingInput(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-450 font-medium">
                    Enter exact manual timing instructions for custom doctor schedules.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTimingModalMed(null)}
                className="rounded-xl font-bold h-10 px-4 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmAddMedicineWithTiming}
                className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold h-10 px-5 text-xs shadow-md"
              >
                Add to Prescription
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* IN-DASHBOARD REGISTER PATIENT MODAL */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 space-y-4 relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-900/60 flex items-center justify-center text-teal-600 dark:text-teal-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Register New Patient File</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Create patient profile directly in dashboard workspace</p>
                </div>
              </div>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <PatientForm
              onSuccess={handlePatientRegisteredSuccess}
              onCancel={() => setIsRegisterModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* IN-DASHBOARD BOOK APPOINTMENT MODAL */}
      {isBookApptModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg p-6 space-y-5 relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-900/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Book Appointment Slot</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Schedule consultation directly in dashboard</p>
                </div>
              </div>
              <button
                onClick={() => {
                  resetBookApptForm();
                  setIsBookApptModalOpen(false);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bookApptError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{bookApptError}</span>
              </div>
            )}

            <form onSubmit={handleBookAppointmentSubmit} className="space-y-4">
              {/* Patient Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Select Patient *</label>
                {selectedBookPatient ? (
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/60">
                    <div>
                      <p className="text-sm font-extrabold text-teal-950 dark:text-teal-100">{selectedBookPatient.name}</p>
                      <p className="text-xs font-medium text-teal-700 dark:text-teal-300">Phone: {selectedBookPatient.phone} • DOB: {selectedBookPatient.dateOfBirth || 'N/A'}</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-xs text-slate-500 hover:text-rose-600 font-bold h-8"
                      onClick={() => {
                        setSelectedBookPatient(null);
                        setBookPatientSearch('');
                      }}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={bookPatientSearch}
                      onChange={(e) => setBookPatientSearch(e.target.value)}
                      placeholder="Type patient name or mobile number..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />

                    {/* Patient Dropdown Search Results */}
                    {bookPatientSearch.trim().length >= 2 && (
                      <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-20 max-h-48 overflow-y-auto p-1 space-y-1">
                        {loadingBookPatients ? (
                          <div className="p-3 text-center text-xs text-slate-400">Searching patients...</div>
                        ) : searchedBookPatients.length === 0 ? (
                          <div className="p-3 text-center text-xs text-slate-400">
                            No patient found. Click &quot;Register Patient&quot; to create a file first.
                          </div>
                        ) : (
                          searchedBookPatients.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setSelectedBookPatient(p)}
                              className="w-full text-left p-2.5 rounded-xl hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors flex items-center justify-between"
                            >
                              <div>
                                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{p.name}</p>
                                <p className="text-[11px] text-slate-500 font-medium">{p.phone} • {p.gender}</p>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Doctor Select (Always show if multiple doctors or non-doctor role) */}
              {(user?.role !== 'DOCTOR' || doctors.length > 1) && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Assign Doctor *</span>
                    {doctors.length > 1 && !bookDoctorId && (
                      <span className="text-[10px] text-rose-500 font-semibold">Required (Please select)</span>
                    )}
                  </label>
                  <select
                    required
                    value={bookDoctorId}
                    onChange={(e) => {
                      setBookDoctorId(e.target.value);
                      if (bookApptError?.includes('doctor')) setBookApptError(null);
                    }}
                    className={`w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 border ${
                      !bookDoctorId && doctors.length > 1
                        ? 'border-amber-400 dark:border-amber-600 focus:ring-amber-500'
                        : 'border-slate-200 dark:border-slate-700 focus:ring-teal-500'
                    } rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2`}
                  >
                    <option value="">-- Choose Attending Doctor --</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        Dr. {d.name} ({d.specialization || 'General'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Consultation Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Consultation Type *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'CONSULTATION', label: 'Consultation' },
                    { id: 'FOLLOW_UP', label: 'Follow Up' },
                    { id: 'EMERGENCY', label: 'Emergency' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setBookType(t.id as 'CONSULTATION' | 'FOLLOW_UP' | 'EMERGENCY')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                        bookType === t.id
                          ? t.id === 'EMERGENCY'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-sky-600 text-white border-sky-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Appointment Date Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Appointment Date *</label>
                <input
                  type="date"
                  value={bookDate || getTodayString()}
                  onChange={(e) => setBookDate(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Click-to-Open Dedicated Time Slot Sheet Modal Trigger */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Appointment Slot Time *</label>
                <button
                  type="button"
                  onClick={() => setIsTimeSlotSheetOpen(true)}
                  className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-slate-200 dark:border-slate-700 hover:border-sky-300 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between transition-all cursor-pointer shadow-2xs group"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform" />
                    <span>Slot Time: <strong className="font-mono text-sm text-sky-700 dark:text-sky-300 ml-1">{bookStartTime}</strong></span>
                  </div>
                  <span className="text-[11px] font-extrabold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-900/60 px-3 py-1 rounded-lg border border-sky-200 dark:border-sky-800 shadow-2xs">
                    Open Time Sheet ➔
                  </span>
                </button>
              </div>

              {/* Reason / Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Chief Complaint / Reason (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. High Fever & Headache since 2 days"
                  value={bookReason}
                  onChange={(e) => setBookReason(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetBookApptForm();
                    setIsBookApptModalOpen(false);
                  }}
                  className="rounded-xl font-bold h-10 px-4 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingBookAppt}
                  className="bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold h-10 px-6 text-xs shadow-md"
                >
                  {submittingBookAppt ? 'Booking Slot...' : 'Confirm Book Slot'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEDICATED POP-UP TIME SLOT SHEET MODAL */}
      {isTimeSlotSheetOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 space-y-4 relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-900/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">Select Available Time Slot</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Click any slot to select</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTimeSlotSheetOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
              <TimeSlotGrid
                selectedTime={bookStartTime}
                bookedTime24List={bookedSlotsList}
                bookedRanges={bookedRangesList}
                slotDurationMinutes={(() => {
                  const doc = doctors.find((d) => d.id === (bookDoctorId || selectedDoctorId));
                  return doc?.slotDuration || 15;
                })()}
                onSelectSlot={(start24, end24) => {
                  setBookStartTime(start24);
                  setIsTimeSlotSheetOpen(false);
                }}
              />
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-sky-700 dark:text-sky-300">
                Selected Slot: {bookStartTime}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsTimeSlotSheetOpen(false)}
                className="rounded-xl font-bold h-9 text-xs"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Customize Dashboard Cards Modal */}
      {isCustomizeModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity" onClick={() => setIsCustomizeModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 z-10 space-y-5 animate-scaleUp">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 flex items-center justify-center">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Customize Metric Cards</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Choose which cards appear and set your favorite metrics</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomizeModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
              {cardsOrder.map((cardId, index) => {
                const metaMap: Record<string, { name: string; cat: string }> = {
                  today_revenue: { name: "Today's Revenue (₹)", cat: 'Financial' },
                  today_appts: { name: "Today's Appointments", cat: 'Operations' },
                  visited_today: { name: "Visited & Completed Today", cat: 'Operations' },
                  new_patients: { name: "New Patients Today", cat: 'Patients' },
                  waiting_lounge: { name: "Seated in Lounge", cat: 'Operations' },
                  in_consultation: { name: "In Doctor Chamber", cat: 'Operations' },
                  avg_wait: { name: "Est. Lounge Wait Time", cat: 'Operations' },
                  emergency_count: { name: "Emergency Priority Visits", cat: 'Operations' },
                };
                const cardMeta = metaMap[cardId] || { name: cardId, cat: 'Operations' };
                const isVisible = visibleCardIds.includes(cardId);
                const isFav = favoriteCardIds.includes(cardId);

                return (
                  <div key={cardId} className="flex items-center justify-between p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/70 transition-all gap-3">
                    <label className="flex items-center gap-3 cursor-pointer select-none min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={() => toggleVisibleCard(cardId)}
                        className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-slate-700"
                      />
                      <div className="truncate">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white block truncate">{index + 1}. {cardMeta.name}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{cardMeta.cat}</span>
                      </div>
                    </label>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={index === 0}
                        onClick={() => moveCardUp(index)}
                        className="h-7 w-7 p-0 rounded-lg border-slate-200 dark:border-slate-700 disabled:opacity-30 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3 h-3 text-slate-700 dark:text-slate-300" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={index === cardsOrder.length - 1}
                        onClick={() => moveCardDown(index)}
                        className="h-7 w-7 p-0 rounded-lg border-slate-200 dark:border-slate-700 disabled:opacity-30 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3 h-3 text-slate-700 dark:text-slate-300" />
                      </Button>
                      <button
                        type="button"
                        onClick={() => toggleFavoriteCard(cardId)}
                        className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer ml-1"
                        title={isFav ? 'Remove from Favorites' : 'Mark as Favorite'}
                      >
                        <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  setCardsOrder(DEFAULT_CARD_ORDER);
                  setVisibleCardIds(DEFAULT_CARD_ORDER);
                  try {
                    localStorage.setItem('clinic_dashboard_cards_order', JSON.stringify(DEFAULT_CARD_ORDER));
                    localStorage.setItem('clinic_dashboard_visible_cards', JSON.stringify(DEFAULT_CARD_ORDER));
                  } catch {}
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 underline cursor-pointer"
              >
                Reset to Defaults
              </button>
              <Button
                onClick={() => setIsCustomizeModalOpen(false)}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs h-9.5 px-5 shadow-xs cursor-pointer"
              >
                Save Preferences
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
