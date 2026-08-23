'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Appointment, Patient, Doctor, Clinic, PrescriptionSettings, Medicine } from '@/types';
import { EMRPrintDocument, EMRPrintMode } from '@/components/emr-print-document';
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import {
  Stethoscope,
  Printer,
  X,
  Save,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Activity,
  FileText,
  Eye,
  Edit3,
  Columns,
  Sparkles,
  Search,
  CheckCircle2,
  AlertTriangle,
  Heart,
  Droplet,
  Thermometer,
  Pill,
  User,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  Zap,
  Check,
  Lock,
  Shield
} from 'lucide-react';

interface MedicineRow {
  id: string;
  name: string;
  form: string; // Tab., Cap., Syr., Inj., Drops, Oint.
  dosage: string;
  timing: string;
  duration: string;
  instructions: string;
}

interface DoctorPrescriptionNotepadModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  patient?: Partial<Patient> | null;
  doctor?: Partial<Doctor> | null;
  clinic?: Partial<Clinic> | null;
  settings?: Partial<PrescriptionSettings> | null;
  onSaved?: () => void;
  readOnlyRx?: boolean;
}

const COMMON_SYMPTOMS = [
  'High fever with chills (102°F)',
  'Dry persistent cough & fatigue',
  'Throat irritation & dysphagia',
  'Severe frontal headache & body pain',
  'Abdominal cramps & nausea',
  'Nasal congestion & sneezing',
  'Shortness of breath / wheezing',
  'Skin rash with itching',
  'Generalized body weakness',
];

const COMMON_DIAGNOSES = [
  { label: 'Acute Upper Respiratory Infection (URTI)', code: 'J06.9' },
  { label: 'Acute Viral Fever & Body Aches', code: 'B34.9' },
  { label: 'Acute Gastroenteritis & Acidity', code: 'A09' },
  { label: 'Essential Hypertension Stage-1', code: 'I10' },
  { label: 'Type 2 Diabetes Mellitus', code: 'E11.9' },
  { label: 'Allergic Rhinitis / Sinusitis', code: 'J30.9' },
  { label: 'Migraine Headache without Aura', code: 'G43.0' },
  { label: 'Bronchial Asthma Acute Attack', code: 'J45.9' },
  { label: 'Urinary Tract Infection (UTI)', code: 'N39.0' },
];

interface TreatmentProtocol {
  keywords: string[];
  title: string;
  medicines: {
    name: string;
    form: string;
    dosage: string;
    timing: string;
    duration: string;
    instructions: string;
  }[];
  advice?: string;
}

const CLINICAL_PROTOCOLS: TreatmentProtocol[] = [
  {
    keywords: ['viral fever', 'fever', 'myalgia', 'body ache', 'chills', 'b34'],
    title: 'Acute Viral Fever & Body Aches Protocol',
    medicines: [
      { name: 'Tab. Paracetamol 650mg', form: 'Tab.', dosage: '1-0-1', timing: 'After Food', duration: '5 Days', instructions: 'Take when fever > 99.5°F' },
      { name: 'Cap. Pantocid DSR 40mg', form: 'Cap.', dosage: '1-0-0', timing: 'Empty Stomach', duration: '5 Days', instructions: 'Take 30 mins before breakfast' },
      { name: 'Tab. Cetirizine 10mg', form: 'Tab.', dosage: '0-0-1', timing: 'Bedtime', duration: '5 Days', instructions: 'Reduces nasal congestion' },
      { name: 'Syr. Ascoril LS (100ml)', form: 'Syr.', dosage: '5ml TID', timing: 'After Food', duration: '5 Days', instructions: 'Take 5ml three times daily' }
    ],
    advice: 'Rest adequately, drink 3 Litres of warm fluids, monitor fever 6-hourly.'
  },
  {
    keywords: ['upper respiratory', 'urti', 'pharyngitis', 'cough', 'throat', 'j06', 'j02'],
    title: 'Upper Respiratory Tract Infection (URTI) Protocol',
    medicines: [
      { name: 'Tab. Augmentin 625 Duo', form: 'Tab.', dosage: '1-0-1', timing: 'After Food', duration: '5 Days', instructions: 'Complete full 5-day antibiotic course' },
      { name: 'Tab. Paracetamol 650mg', form: 'Tab.', dosage: '1-0-1', timing: 'After Food', duration: '5 Days', instructions: 'For fever & body pain' },
      { name: 'Cap. Pantocid 40mg', form: 'Cap.', dosage: '1-0-0', timing: 'Empty Stomach', duration: '5 Days', instructions: 'Antacid protection' },
      { name: 'Tab. Montair LC', form: 'Tab.', dosage: '0-0-1', timing: 'Bedtime', duration: '7 Days', instructions: 'Take daily at night' }
    ],
    advice: 'Steam inhalation twice daily, warm salt water gargling, avoid cold drinks.'
  },
  {
    keywords: ['gastroenteritis', 'acidity', 'nausea', 'vomiting', 'cramps', 'stomach', 'a09'],
    title: 'Acute Gastroenteritis & Acidity Protocol',
    medicines: [
      { name: 'Cap. Pantocid DSR 40mg', form: 'Cap.', dosage: '1-0-0', timing: 'Empty Stomach', duration: '7 Days', instructions: 'Take before breakfast' },
      { name: 'Tab. Ondansetron 4mg', form: 'Tab.', dosage: '1-0-1', timing: 'Before Food', duration: '3 Days', instructions: 'Take 30 mins before food for nausea' },
      { name: 'Tab. Meftal-Spas', form: 'Tab.', dosage: '1-0-1', timing: 'After Food', duration: '3 Days', instructions: 'Take SOS for abdominal cramps' },
      { name: 'ORS Hydration Powder Sachet', form: 'Syr.', dosage: '1 Sachet Daily', timing: 'With Food', duration: '3 Days', instructions: 'Mix 1 sachet in 1L water' }
    ],
    advice: 'Bland light diet (curd rice, khichdi), avoid spicy oily foods, maintain hydration.'
  },
  {
    keywords: ['hypertension', 'bp', 'high bp', 'i10'],
    title: 'Essential Hypertension Protocol',
    medicines: [
      { name: 'Tab. Telma 40mg (Telmisartan)', form: 'Tab.', dosage: '1-0-0', timing: 'Morning', duration: '1 Month', instructions: 'Take daily in morning' }
    ],
    advice: 'Low sodium salt diet, regular morning BP recording, 30 mins daily walking.'
  },
  {
    keywords: ['diabetes', 'sugar', 'hyperglycemia', 'e11'],
    title: 'Type-2 Diabetes Mellitus Protocol',
    medicines: [
      { name: 'Tab. Glycomet GP 1', form: 'Tab.', dosage: '1-0-1', timing: 'Before Food', duration: '1 Month', instructions: 'Metformin 500mg + Glimepiride 1mg' }
    ],
    advice: 'Strict low sugar & low carb diet, regular fasting & post-prandial blood sugar check.'
  },
  {
    keywords: ['allergic', 'rhinitis', 'sinusitis', 'sneezing', 'j30'],
    title: 'Allergic Rhinitis & Sinusitis Protocol',
    medicines: [
      { name: 'Tab. Montair LC', form: 'Tab.', dosage: '0-0-1', timing: 'Bedtime', duration: '10 Days', instructions: 'Montelukast + Levocetirizine' },
      { name: 'Otrivin Adult Nasal Spray', form: 'Drops', dosage: '2 Drops BD', timing: 'After Food', duration: '5 Days', instructions: 'Instill 2 drops in each nostril' }
    ],
    advice: 'Avoid dust & cold exposure, wear mask outdoors, steam inhalation.'
  },
  {
    keywords: ['migraine', 'headache', 'g43'],
    title: 'Migraine & Tension Headache Protocol',
    medicines: [
      { name: 'Tab. Naprosyn 500mg', form: 'Tab.', dosage: '1-0-1', timing: 'After Food', duration: '3 Days', instructions: 'For severe pain relief' },
      { name: 'Tab. Vasograin', form: 'Tab.', dosage: '1-0-0', timing: 'Empty Stomach', duration: '3 Days', instructions: 'Take at onset of aura' }
    ],
    advice: 'Rest in a quiet dark room, avoid screen time during headache onset.'
  },
  {
    keywords: ['asthma', 'wheezing', 'breathlessness', 'j45'],
    title: 'Bronchial Asthma Protocol',
    medicines: [
      { name: 'Tab. Deriphyllin Retard 150mg', form: 'Tab.', dosage: '1-0-1', timing: 'After Food', duration: '7 Days', instructions: 'Bronchodilator tablet' },
      { name: 'Asthalin Inhaler 100mcg', form: 'Inhaler', dosage: '2 Puffs SOS', timing: 'With Food', duration: '1 Month', instructions: 'Use 2 puffs during shortness of breath' }
    ],
    advice: 'Use spacer with inhaler, avoid cold allergens and smoke.'
  },
  {
    keywords: ['uti', 'urinary', 'dysuria', 'n39'],
    title: 'Urinary Tract Infection (UTI) Protocol',
    medicines: [
      { name: 'Tab. Norflox TZ', form: 'Tab.', dosage: '1-0-1', timing: 'After Food', duration: '5 Days', instructions: 'Complete full 5 days' },
      { name: 'Syr. Cital (100ml)', form: 'Syr.', dosage: '2 tsp TID', timing: 'After Food', duration: '5 Days', instructions: 'Mix 2 tsp in 1 glass water' }
    ],
    advice: 'Drink 3.5 Litres of water daily, maintain hygiene.'
  }
];

const COMMON_ADVICES = [
  'Rest adequately and drink 2.5-3 Litres of warm fluids daily.',
  'Avoid cold, oily, and heavily spiced food items for 5-7 days.',
  'Complete full antibiotic course as prescribed without skipping doses.',
  'Monitor Blood Pressure & Fasting Blood Sugar in morning.',
  'Steam inhalation twice daily; gargle with warm salt water.',
  'Seek immediate emergency care if fever exceeds 102°F or breathlessness occurs.',
];

const POPULAR_MEDICINE_PRESETS = [
  { name: 'Tab. Paracetamol 650mg', form: 'Tab.', dosage: '1-0-1', timing: 'After Food', duration: '5 Days', instructions: 'Take when fever > 99.5°F' },
  { name: 'Tab. Augmentin 625 Duo', form: 'Tab.', dosage: '1-0-1', timing: 'After Food', duration: '5 Days', instructions: 'Complete full 5-day course' },
  { name: 'Cap. Pantocid DSR 40mg', form: 'Cap.', dosage: '1-0-0', timing: 'Empty Stomach', duration: '7 Days', instructions: 'Take 30 mins before breakfast' },
  { name: 'Tab. Cetirizine 10mg', form: 'Tab.', dosage: '0-0-1', timing: 'Bedtime', duration: '5 Days', instructions: 'May cause mild drowsiness' },
  { name: 'Syr. Ascoril LS (100ml)', form: 'Syr.', dosage: '5ml TID', timing: 'After Food', duration: '5 Days', instructions: 'Take 5ml three times daily' },
  { name: 'Tab. Montair LC', form: 'Tab.', dosage: '0-0-1', timing: 'Bedtime', duration: '10 Days', instructions: 'Take daily at night' },
  { name: 'Tab. Azithromycin 500mg', form: 'Tab.', dosage: '1-0-0', timing: 'After Food', duration: '3 Days', instructions: 'Take once daily for 3 days' },
  { name: 'Tab. Telma 40mg', form: 'Tab.', dosage: '1-0-0', timing: 'Morning', duration: '1 Month', instructions: 'Regular BP management' },
];

export const DoctorPrescriptionNotepadModal: React.FC<DoctorPrescriptionNotepadModalProps> = ({
  isOpen,
  onClose,
  appointment,
  patient,
  doctor,
  clinic,
  settings,
  onSaved,
  readOnlyRx,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Role restriction logic: Receptionist/Assistant/Staff can edit vitals, view Rx & Print, but cannot edit Rx/Diagnosis
  const isStaffRole = user?.role === 'RECEPTIONIST' || (user?.role as string) === 'ASSISTANT' || (user?.role as string) === 'STAFF';
  const isRxReadOnly = readOnlyRx !== undefined ? readOnlyRx : isStaffRole;

  // Layout View Mode
  const [viewLayout, setViewLayout] = useState<'split' | 'notepad' | 'preview'>('split');
  const [printMode, setPrintMode] = useState<EMRPrintMode>('PRESCRIPTION_PAD');

  // Consultation Date & Time
  const [consultDate, setConsultDate] = useState<string>('');
  const [consultTime, setConsultTime] = useState<string>('');

  // Clinical Vitals (Editable by both Doctor & Reception/Assistant)
  const [bpSystolic, setBpSystolic] = useState<string>('');
  const [bpDiastolic, setBpDiastolic] = useState<string>('');
  const [pulse, setPulse] = useState<string>('');
  const [temperature, setTemperature] = useState<string>('');
  const [spo2, setSpo2] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [height, setHeight] = useState<string>('');

  // Clinical Assessment & Prescription
  const [symptoms, setSymptoms] = useState<string>('');
  const [diagnosis, setDiagnosis] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [followUpDate, setFollowUpDate] = useState<string>('');

  // Prescribed Medicines Structured List
  const [medicines, setMedicines] = useState<MedicineRow[]>([
    {
      id: '1',
      name: 'Tab. Paracetamol 650mg',
      form: 'Tab.',
      dosage: '1-0-1',
      timing: 'After Food',
      duration: '5 Days',
      instructions: 'Take when fever > 99.5°F',
    },
  ]);

  // Dynamic Matched Clinical Protocols based on Diagnosis text
  const matchedProtocol = useMemo(() => {
    if (!diagnosis.trim() && !symptoms.trim()) return null;
    const searchText = `${diagnosis} ${symptoms}`.toLowerCase();
    
    return CLINICAL_PROTOCOLS.find((p) =>
      p.keywords.some((kw) => searchText.includes(kw))
    ) || null;
  }, [diagnosis, symptoms]);

  // Sync state from appointment when modal opens
  useEffect(() => {
    if (appointment && isOpen) {
      const today = new Date();
      const todayDateStr = today.toISOString().split('T')[0];
      const currentTimeStr = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

      setConsultDate(appointment.appointmentDate || todayDateStr);
      setConsultTime(appointment.startTime || currentTimeStr);

      setBpSystolic(appointment.bpSystolic ? String(appointment.bpSystolic) : '');
      setBpDiastolic(appointment.bpDiastolic ? String(appointment.bpDiastolic) : '');
      setPulse(appointment.pulse ? String(appointment.pulse) : '');
      setTemperature(appointment.temperature ? String(appointment.temperature) : '');
      setSpo2(appointment.spo2 ? String(appointment.spo2) : '');
      setWeight(
        appointment.weight
          ? String(appointment.weight)
          : patient?.weightKg
          ? String(patient.weightKg)
          : ''
      );
      setHeight(
        appointment.height
          ? String(appointment.height)
          : patient?.heightCm
          ? String(patient.heightCm)
          : ''
      );

      setSymptoms(appointment.symptoms || appointment.reason || '');
      setDiagnosis(appointment.diagnosis || '');
      setNotes(appointment.notes || settings?.defaultAdvice || '');
      setFollowUpDate(appointment.followUpDate || '');

      if (appointment.prescription && appointment.prescription.trim()) {
        const rawLines = appointment.prescription.split('\n').filter(Boolean);
        const parsed: MedicineRow[] = rawLines.map((line, idx) => {
          const clean = line.replace(/^[•\-\*0-9\.]+\s*/, '');
          const parts = clean.split('—').map((p) => p.trim());
          const subParts = parts.length === 1 ? clean.split('-').map((p) => p.trim()) : parts;
          return {
            id: String(idx + 1),
            name: subParts[0] || clean,
            form: (subParts[0] || '').split(' ')[0] || 'Tab.',
            dosage: subParts[1] || '1-0-1',
            timing: subParts[2] || 'After Food',
            duration: subParts[3] || '5 Days',
            instructions: subParts[4] || '',
          };
        });
        if (parsed.length > 0) {
          setMedicines(parsed);
        }
      }
    }
  }, [appointment, patient, settings, isOpen]);

  // Convert medicines array into standard Rx formatted text
  const getFormattedPrescriptionText = () => {
    return medicines
      .filter((m) => m.name.trim())
      .map(
        (m) =>
          `${m.name} — ${m.dosage || '1-0-1'} — ${m.timing || 'After Food'} — ${m.duration || '5 Days'}${
            m.instructions ? ` — ${m.instructions}` : ''
          }`
      )
      .join('\n');
  };

  // Apply Full Protocol Medications (Doctors only)
  const handleApplyFullProtocol = (protocol: TreatmentProtocol) => {
    if (isRxReadOnly) return;
    const newRows: MedicineRow[] = protocol.medicines.map((m, idx) => ({
      id: String(Date.now() + idx),
      name: m.name,
      form: m.form,
      dosage: m.dosage,
      timing: m.timing,
      duration: m.duration,
      instructions: m.instructions,
    }));
    setMedicines(newRows);
    if (protocol.advice && !notes.includes(protocol.advice)) {
      setNotes((prev) => (prev ? `${prev}\n• ${protocol.advice}` : `• ${protocol.advice}`));
    }
  };

  // Add Medicine Row
  const handleAddMedicine = (preset?: typeof POPULAR_MEDICINE_PRESETS[0] | TreatmentProtocol['medicines'][0]) => {
    if (isRxReadOnly) return;
    setMedicines((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: preset?.name || '',
        form: preset?.form || 'Tab.',
        dosage: preset?.dosage || '1-0-1',
        timing: preset?.timing || 'After Food',
        duration: preset?.duration || '5 Days',
        instructions: preset?.instructions || '',
      },
    ]);
  };

  // Remove Medicine Row
  const handleRemoveMedicine = (id: string) => {
    if (isRxReadOnly) return;
    setMedicines((prev) => prev.filter((m) => m.id !== id));
  };

  // Update Medicine field
  const handleUpdateMedicine = (id: string, field: keyof MedicineRow, val: string) => {
    if (isRxReadOnly) return;
    setMedicines((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: val } : m))
    );
  };

  // Save consultation mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!appointment) return;
      const rxText = getFormattedPrescriptionText();
      await apiClient.post(`/appointments/${appointment.id}/consultation`, {
        symptoms,
        diagnosis,
        prescription: rxText,
        notes,
        bpSystolic: bpSystolic ? parseInt(bpSystolic, 10) : null,
        bpDiastolic: bpDiastolic ? parseInt(bpDiastolic, 10) : null,
        pulse: pulse ? parseInt(pulse, 10) : null,
        temperature: temperature ? parseFloat(temperature) : null,
        spo2: spo2 ? parseInt(spo2, 10) : null,
        weight: weight ? parseFloat(weight) : null,
        height: height ? parseFloat(height) : null,
        followUpDate: followUpDate || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['queue-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['patient-appointments'] });
      if (onSaved) onSaved();
    },
  });

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen || !appointment) return null;

  // Build live appointment object for live preview
  const liveAppointment: Appointment = {
    ...appointment,
    appointmentDate: consultDate,
    startTime: consultTime,
    symptoms,
    diagnosis,
    prescription: getFormattedPrescriptionText(),
    notes,
    followUpDate,
    bpSystolic: bpSystolic ? parseInt(bpSystolic, 10) : undefined,
    bpDiastolic: bpDiastolic ? parseInt(bpDiastolic, 10) : undefined,
    pulse: pulse ? parseInt(pulse, 10) : undefined,
    temperature: temperature ? parseFloat(temperature) : undefined,
    spo2: spo2 ? parseInt(spo2, 10) : undefined,
    weight: weight ? parseFloat(weight) : undefined,
    height: height ? parseFloat(height) : undefined,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-3 bg-slate-950/85 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-[98vw] h-[96vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* ========================================================================= */}
        {/* 1. TOP EXECUTIVE APP BAR */}
        {/* ========================================================================= */}
        <div className="bg-slate-950 text-white px-5 py-3 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-teal-500/20 text-teal-400 rounded-xl border border-teal-500/30">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-extrabold text-white tracking-tight">
                  {isRxReadOnly ? 'Reception Patient Intake & Rx Preview' : 'Doctor Clinical Chamber & Prescription Workspace'}
                </h2>
                {isRxReadOnly ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-400" /> Reception / Staff Intake Mode (Vitals Editable • Rx Protected)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-500/20 text-teal-300 border border-teal-500/40 uppercase tracking-wider">
                    Smart Auto-Rx Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Patient: <strong className="text-white font-bold">{appointment.patientName}</strong> • Attending:{' '}
                <strong className="text-teal-300">Dr. {appointment.doctorName || doctor?.name}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Switcher */}
            <div className="hidden md:flex bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setViewLayout('split')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewLayout === 'split' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
                title="Side-by-side Composer and Live A4 Letterhead"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Split Workspace</span>
              </button>

              <button
                type="button"
                onClick={() => setViewLayout('notepad')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewLayout === 'notepad' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Full Composer</span>
              </button>

              <button
                type="button"
                onClick={() => setViewLayout('preview')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewLayout === 'preview' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>A4 Letterhead Only</span>
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white border-0 font-extrabold text-xs rounded-xl shadow-xs px-3.5 flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Rx</span>
            </Button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. MAIN BODY (SPLIT OR FULL VIEW) */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-slate-100/70 dark:bg-slate-950">
          {/* ========================================================================= */}
          {/* LEFT PANE: CLINICAL COMPOSER */}
          {/* ========================================================================= */}
          {(viewLayout === 'split' || viewLayout === 'notepad') && (
            <div
              className={`overflow-y-auto p-4 sm:p-5 space-y-5 ${
                viewLayout === 'split' ? 'w-full md:w-1/2 lg:w-[54%] border-r border-slate-200 dark:border-slate-800' : 'w-full max-w-5xl mx-auto'
              }`}
            >
              {/* DATE & TIME OF CONSULTATION */}
              <div className="bg-white dark:bg-slate-900 border border-teal-200/90 dark:border-teal-900/60 p-4 rounded-2xl shadow-xs space-y-2.5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider">
                        Date & Time of Consultation
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Official timestamp rendered on the patient prescription letter
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                    <div className="flex items-center space-x-1">
                      <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Date:</Label>
                      <Input
                        type="date"
                        value={consultDate}
                        disabled={isRxReadOnly}
                        onChange={(e) => setConsultDate(e.target.value)}
                        className="h-8.5 text-xs font-bold rounded-xl w-36 bg-slate-50 dark:bg-slate-800"
                      />
                    </div>

                    <div className="flex items-center space-x-1">
                      <Label className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-teal-600" /> Time:
                      </Label>
                      <Input
                        type="time"
                        value={consultTime}
                        disabled={isRxReadOnly}
                        onChange={(e) => setConsultTime(e.target.value)}
                        className="h-8.5 text-xs font-bold rounded-xl w-28 bg-slate-50 dark:bg-slate-800"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* PATIENT VITALS STRIP (EDITABLE BY RECEPTION & ASSISTANT) */}
              <div className="bg-white dark:bg-slate-900 border-2 border-emerald-300/80 dark:border-emerald-800/80 p-4 rounded-2xl shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-rose-500" />
                    <span>Patient Vitals & Intake Metrics</span>
                  </h4>
                  {isRxReadOnly ? (
                    <span className="text-[10.5px] font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                      ⚡ Vitals Input Active (Reception / Assistant)
                    </span>
                  ) : (
                    <span className="text-[10.5px] font-semibold text-slate-400">Live Clinical Observations</span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div>
                    <Label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">BP (mmHg)</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        placeholder="120"
                        value={bpSystolic}
                        onChange={(e) => setBpSystolic(e.target.value)}
                        className="h-8 text-xs text-center font-mono font-bold rounded-lg bg-slate-50 dark:bg-slate-800 border-emerald-300 dark:border-emerald-800 focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="text-slate-400">/</span>
                      <Input
                        placeholder="80"
                        value={bpDiastolic}
                        onChange={(e) => setBpDiastolic(e.target.value)}
                        className="h-8 text-xs text-center font-mono font-bold rounded-lg bg-slate-50 dark:bg-slate-800 border-emerald-300 dark:border-emerald-800 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Pulse (bpm)</Label>
                    <Input
                      placeholder="72"
                      value={pulse}
                      onChange={(e) => setPulse(e.target.value)}
                      className="h-8 text-xs text-center font-mono font-bold rounded-lg bg-slate-50 dark:bg-slate-800 border-emerald-300 dark:border-emerald-800 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">SpO2 (%)</Label>
                    <Input
                      placeholder="98"
                      value={spo2}
                      onChange={(e) => setSpo2(e.target.value)}
                      className="h-8 text-xs text-center font-mono font-bold rounded-lg bg-slate-50 dark:bg-slate-800 border-emerald-300 dark:border-emerald-800 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Temp (°F)</Label>
                    <Input
                      placeholder="98.6"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      className="h-8 text-xs text-center font-mono font-bold rounded-lg bg-slate-50 dark:bg-slate-800 border-emerald-300 dark:border-emerald-800 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Weight (kg)</Label>
                    <Input
                      placeholder="70"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="h-8 text-xs text-center font-mono font-bold rounded-lg bg-slate-50 dark:bg-slate-800 border-emerald-300 dark:border-emerald-800 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Height (cm)</Label>
                    <Input
                      placeholder="170"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="h-8 text-xs text-center font-mono font-bold rounded-lg bg-slate-50 dark:bg-slate-800 border-emerald-300 dark:border-emerald-800 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* CHIEF COMPLAINTS & CLINICAL DIAGNOSIS */}
              <div className="space-y-4">
                {/* Chief Complaints / Symptoms */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-teal-600" />
                      <span>Chief Complaints & Presenting Symptoms</span>
                    </Label>
                    {isRxReadOnly && (
                      <span className="text-[10px] font-extrabold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-400" /> Protected
                      </span>
                    )}
                  </div>

                  <textarea
                    rows={2}
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    readOnly={isRxReadOnly}
                    disabled={isRxReadOnly}
                    placeholder={isRxReadOnly ? 'No chief symptoms entered' : 'Enter patient complaints, duration, fever spike, pain localized...'}
                    className={`w-full text-xs font-medium p-3 rounded-xl border border-slate-200 dark:border-slate-750 focus:ring-2 focus:ring-teal-500 focus:outline-none ${
                      isRxReadOnly ? 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 cursor-not-allowed' : 'bg-slate-50/60 dark:bg-slate-800'
                    }`}
                  />

                  {/* 1-Click Quick Symptoms */}
                  {!isRxReadOnly && (
                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_SYMPTOMS.map((sym) => (
                        <button
                          key={sym}
                          type="button"
                          onClick={() =>
                            setSymptoms((prev) => (prev ? `${prev}\n• ${sym}` : `• ${sym}`))
                          }
                          className="text-[10.5px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-950 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                        >
                          + {sym}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Clinical Assessment & Diagnosis */}
                <div className="bg-white dark:bg-slate-900 border border-teal-200/90 dark:border-teal-900/60 p-4 rounded-2xl shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-black text-teal-950 dark:text-teal-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                      <span>Clinical Assessment & Diagnosis (ICD)</span>
                    </Label>
                    {isRxReadOnly && (
                      <span className="text-[10px] font-extrabold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-400" /> Doctor Only
                      </span>
                    )}
                  </div>

                  <textarea
                    rows={2}
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    readOnly={isRxReadOnly}
                    disabled={isRxReadOnly}
                    placeholder={isRxReadOnly ? 'Doctor clinical diagnosis view only' : 'Enter primary clinical diagnosis (e.g. Acute Viral Fever, URTI, Gastroenteritis)...'}
                    className={`w-full text-xs font-extrabold p-3 rounded-xl border border-teal-200 dark:border-teal-900/60 text-teal-950 dark:text-teal-100 focus:ring-2 focus:ring-teal-500 focus:outline-none ${
                      isRxReadOnly ? 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 cursor-not-allowed' : 'bg-teal-50/40 dark:bg-teal-950/20'
                    }`}
                  />

                  {/* Quick ICD Diagnosis Tags */}
                  {!isRxReadOnly && (
                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_DIAGNOSES.map((diag) => (
                        <button
                          key={diag.label}
                          type="button"
                          onClick={() =>
                            setDiagnosis((prev) =>
                              prev ? `${prev}\n${diag.label} (${diag.code})` : `${diag.label} (${diag.code})`
                            )
                          }
                          className="text-[10.5px] font-bold px-2 py-0.5 rounded-lg bg-teal-50 text-teal-900 dark:bg-teal-950/60 dark:text-teal-200 hover:bg-teal-100 border border-teal-200 dark:border-teal-800 transition-all cursor-pointer"
                        >
                          + {diag.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* SMART DIAGNOSIS-TO-MEDICINE AUTO-SUGGESTION ENGINE (DOCTORS ONLY) */}
              {matchedProtocol && !isRxReadOnly && (
                <div className="bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-teal-500/10 border-2 border-teal-500/40 rounded-2xl p-4 space-y-3 animate-in fade-in duration-300 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 bg-teal-500 text-white rounded-xl shadow-xs">
                        <Zap className="w-4 h-4 fill-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-teal-950 dark:text-teal-100 uppercase tracking-wider">
                            Smart Rx Engine Match: {matchedProtocol.title}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase tracking-wider">
                            Recommended Treatment Protocol
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">
                          Click below to automatically pre-fill recommended medications for this diagnosis
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleApplyFullProtocol(matchedProtocol)}
                      className="bg-teal-600 hover:bg-teal-700 text-white font-black text-xs h-9 px-4 rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Check className="w-4 h-4" />
                      <span>Apply Full Protocol ({matchedProtocol.medicines.length} Medicines)</span>
                    </Button>
                  </div>

                  {/* Individual Medicine Chips */}
                  <div className="pt-1 border-t border-teal-200/80 dark:border-teal-800/80">
                    <span className="text-[10px] font-black text-teal-800 dark:text-teal-300 uppercase tracking-wider block mb-1.5">
                      Or Add Individual Suggested Drugs:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {matchedProtocol.medicines.map((med) => (
                        <button
                          key={med.name}
                          type="button"
                          onClick={() => handleAddMedicine(med)}
                          className="bg-white dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950 border border-teal-300 dark:border-teal-700 rounded-xl px-2.5 py-1 text-xs font-bold text-teal-900 dark:text-teal-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5 text-teal-600" />
                          <span>{med.name}</span>
                          <span className="font-mono text-[10px] text-slate-500 font-semibold">({med.dosage})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* SMART Rx MEDICINE BUILDER */}
              {/* ========================================================================= */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-serif italic font-black text-teal-600">Rx</span>
                    <div>
                      <h4 className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider">
                        Prescribed Medications & Dosing Schedule
                      </h4>
                      <p className="text-[10.5px] text-slate-400">
                        {isRxReadOnly ? 'Doctor prescribed medications (View-only for Reception & Staff)' : 'Add medicines with dosage, meal timing, and treatment duration'}
                      </p>
                    </div>
                  </div>

                  {!isRxReadOnly && (
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => handleAddMedicine()}
                      className="h-8.5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1.5 px-3.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Medicine</span>
                    </Button>
                  )}
                </div>

                {/* Popular Medicine Fast Presets */}
                {!isRxReadOnly && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      Quick Add Frequent Medicines:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {POPULAR_MEDICINE_PRESETS.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => handleAddMedicine(preset)}
                          className="text-[10.5px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-teal-950 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                        >
                          + {preset.name.split(' ')[1]} {preset.dosage}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prescribed Medicine Rows */}
                <div className="space-y-3 pt-1">
                  {medicines.length === 0 && (
                    <div className="p-6 text-center bg-slate-50 dark:bg-slate-850/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                      <Pill className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                        No Oral Medications Prescribed
                      </p>
                      {!isRxReadOnly && (
                        <>
                          <p className="text-[11px] text-slate-400">
                            Click &quot;+ Add Medicine&quot; or select a preset above to add medicines.
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleAddMedicine()}
                            className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-2xs mt-1 cursor-pointer"
                          >
                            + Add First Medicine
                          </Button>
                        </>
                      )}
                    </div>
                  )}

                  {medicines.map((med, index) => (
                    <div
                      key={med.id}
                      className="p-3.5 bg-slate-50/90 dark:bg-slate-850/70 rounded-2xl border border-slate-200 dark:border-slate-750 space-y-2.5 shadow-2xs"
                    >
                      {/* Top Row: Form, Medicine Name, and Delete */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-black text-slate-400 w-5 text-center">
                          {index + 1}.
                        </span>

                        {/* Form Selector */}
                        <select
                          value={med.form}
                          disabled={isRxReadOnly}
                          onChange={(e) => {
                            const newForm = e.target.value;
                            handleUpdateMedicine(med.id, 'form', newForm);
                            if (med.name && !med.name.startsWith(newForm)) {
                              const cleanedName = med.name.replace(/^(Tab\.|Cap\.|Syr\.|Inj\.|Drops|Oint\.)\s*/, '');
                              handleUpdateMedicine(med.id, 'name', `${newForm} ${cleanedName}`);
                            }
                          }}
                          className={`h-8.5 px-2 rounded-xl border text-xs font-black shrink-0 ${
                            isRxReadOnly
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-teal-800 dark:text-teal-300'
                          }`}
                        >
                          <option value="Tab.">Tab.</option>
                          <option value="Cap.">Cap.</option>
                          <option value="Syr.">Syr.</option>
                          <option value="Inj.">Inj.</option>
                          <option value="Drops">Drops</option>
                          <option value="Oint.">Oint.</option>
                          <option value="Inhaler">Inhaler</option>
                        </select>

                        {/* Medicine Name */}
                        <div className="flex-1 min-w-[220px]">
                          <Input
                            placeholder="Type medicine name..."
                            value={med.name}
                            readOnly={isRxReadOnly}
                            disabled={isRxReadOnly}
                            onChange={(e) => handleUpdateMedicine(med.id, 'name', e.target.value)}
                            className={`h-8.5 text-xs font-black rounded-xl ${
                              isRxReadOnly
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 cursor-not-allowed border-slate-200 dark:border-slate-700'
                                : 'bg-white dark:bg-slate-900'
                            }`}
                          />
                        </div>

                        {/* Delete Row */}
                        {!isRxReadOnly && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMedicine(med.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Bottom Row: Dosage, Timing, Duration, Remarks */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pl-7">
                        {/* Dosage Frequency */}
                        <div>
                          <Label className="text-[9.5px] font-extrabold text-slate-400 uppercase block mb-0.5">
                            Dosage Frequency
                          </Label>
                          <select
                            value={med.dosage}
                            disabled={isRxReadOnly}
                            onChange={(e) => handleUpdateMedicine(med.id, 'dosage', e.target.value)}
                            className={`w-full h-8 px-2 rounded-lg border text-xs font-bold ${
                              isRxReadOnly
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                                : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <option value="1-0-1">1-0-1 (Morning & Night)</option>
                            <option value="1-0-0">1-0-0 (Morning only)</option>
                            <option value="0-0-1">0-0-1 (Night only)</option>
                            <option value="1-1-1">1-1-1 (Thrice daily)</option>
                            <option value="1-0-1-0">1-0-1-0 (Four times)</option>
                            <option value="SOS">SOS (As needed)</option>
                            <option value="Once Daily">Once Daily</option>
                            <option value="Once Weekly">Once Weekly</option>
                            <option value="5ml TID">5ml Thrice Daily</option>
                            <option value="10ml BD">10ml Twice Daily</option>
                          </select>
                        </div>

                        {/* Meal Relation / Food */}
                        <div>
                          <Label className="text-[9.5px] font-extrabold text-slate-400 uppercase block mb-0.5">
                            Food Relation
                          </Label>
                          <select
                            value={med.timing}
                            disabled={isRxReadOnly}
                            onChange={(e) => handleUpdateMedicine(med.id, 'timing', e.target.value)}
                            className={`w-full h-8 px-2 rounded-lg border text-xs font-semibold ${
                              isRxReadOnly
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                                : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <option value="After Food">After Food</option>
                            <option value="Before Food">Before Food</option>
                            <option value="With Food">With Food</option>
                            <option value="Bedtime">At Bedtime</option>
                            <option value="Empty Stomach">Empty Stomach</option>
                          </select>
                        </div>

                        {/* Duration */}
                        <div>
                          <Label className="text-[9.5px] font-extrabold text-slate-400 uppercase block mb-0.5">
                            Duration
                          </Label>
                          <select
                            value={med.duration}
                            disabled={isRxReadOnly}
                            onChange={(e) => handleUpdateMedicine(med.id, 'duration', e.target.value)}
                            className={`w-full h-8 px-2 rounded-lg border text-xs font-bold ${
                              isRxReadOnly
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                                : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <option value="3 Days">3 Days</option>
                            <option value="5 Days">5 Days</option>
                            <option value="7 Days">7 Days</option>
                            <option value="10 Days">10 Days</option>
                            <option value="15 Days">15 Days</option>
                            <option value="1 Month">1 Month</option>
                            <option value="3 Months">3 Months</option>
                          </select>
                        </div>

                        {/* Remarks / Instructions */}
                        <div>
                          <Label className="text-[9.5px] font-extrabold text-slate-400 uppercase block mb-0.5">
                            Special Remarks
                          </Label>
                          <Input
                            placeholder="Special remarks..."
                            value={med.instructions}
                            readOnly={isRxReadOnly}
                            disabled={isRxReadOnly}
                            onChange={(e) => handleUpdateMedicine(med.id, 'instructions', e.target.value)}
                            className={`h-8 text-xs rounded-lg ${
                              isRxReadOnly
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                                : 'bg-white dark:bg-slate-900'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* DOCTOR ADVICE & FOLLOW-UP SCHEDULE */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Advice & Lifestyle */}
                <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs space-y-2">
                  <Label className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Special Advice, Diet & Lifestyle Instructions</span>
                  </Label>
                  <textarea
                    rows={2}
                    value={notes}
                    readOnly={isRxReadOnly}
                    disabled={isRxReadOnly}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={isRxReadOnly ? 'No special advice recorded by doctor' : 'Enter dietary precautions, hydration advice, red flags...'}
                    className={`w-full text-xs font-medium p-3 rounded-xl border border-slate-200 dark:border-slate-750 focus:ring-2 focus:ring-teal-500 focus:outline-none ${
                      isRxReadOnly ? 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 cursor-not-allowed' : 'bg-slate-50/60 dark:bg-slate-800'
                    }`}
                  />
                  {!isRxReadOnly && (
                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_ADVICES.slice(0, 3).map((adv) => (
                        <button
                          key={adv}
                          type="button"
                          onClick={() =>
                            setNotes((prev) => (prev ? `${prev}\n• ${adv}` : `• ${adv}`))
                          }
                          className="text-[10.5px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-all cursor-pointer truncate max-w-xs"
                        >
                          + {adv.substring(0, 34)}...
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Follow Up Date */}
                <div className="bg-white dark:bg-slate-900 border border-teal-200/90 dark:border-teal-900/60 p-4 rounded-2xl shadow-xs space-y-2.5">
                  <Label className="text-xs font-black text-teal-950 dark:text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-teal-600" />
                    <span>Follow-Up Review Date</span>
                  </Label>
                  <Input
                    type="date"
                    value={followUpDate}
                    disabled={isRxReadOnly}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="h-9 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800"
                  />
                  {!isRxReadOnly && (
                    <div className="grid grid-cols-3 gap-1 pt-0.5">
                      {[
                        { label: '+3 Days', days: 3 },
                        { label: '+7 Days', days: 7 },
                        { label: '+14 Days', days: 14 },
                      ].map((btn) => (
                        <button
                          key={btn.label}
                          type="button"
                          onClick={() => {
                            const d = new Date();
                            d.setDate(d.getDate() + btn.days);
                            setFollowUpDate(d.toISOString().split('T')[0]);
                          }}
                          className="text-[10.5px] font-bold py-1 px-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-900 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 transition-all cursor-pointer text-center"
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* RIGHT PANE: REAL-TIME A4 PRESCRIPTION LETTERHEAD PREVIEW */}
          {/* ========================================================================= */}
          {(viewLayout === 'split' || viewLayout === 'preview') && (
            <div
              className={`overflow-y-auto p-4 sm:p-5 flex flex-col items-center bg-slate-200/80 dark:bg-slate-950 ${
                viewLayout === 'split' ? 'w-full md:w-1/2 lg:w-[46%]' : 'w-full'
              }`}
            >
              {/* Header Bar above letter */}
              <div className="w-full max-w-[210mm] flex items-center justify-between mb-3 bg-slate-900 text-white px-4 py-2 rounded-2xl shadow-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs font-black uppercase tracking-wider">
                    Live Official A4 Prescription Letter
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                    {(['PRESCRIPTION_PAD', 'EMR_CASE_SHEET'] as EMRPrintMode[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPrintMode(m)}
                        className={`px-2.5 py-1 text-[10.5px] font-extrabold rounded-md transition-all cursor-pointer ${
                          printMode === m ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {m === 'PRESCRIPTION_PAD' ? 'Rx Letter Only' : 'Full EMR File'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Printable Live Document Canvas */}
              <div className="printable-modal-overlay w-full flex justify-center pb-8">
                <div
                  className={`printable-modal-content origin-top transition-all duration-200 shadow-2xl rounded-none ${
                    viewLayout === 'split' ? 'transform scale-[0.78] sm:scale-[0.88] lg:scale-[0.92]' : 'transform scale-100'
                  }`}
                >
                  <EMRPrintDocument
                    mode={printMode}
                    appointment={liveAppointment}
                    patient={patient}
                    doctor={doctor}
                    clinic={clinic}
                    settings={settings}
                    accentColor="#0d9488"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 3. MODAL FOOTER BAR */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-5 py-3 flex items-center justify-between shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-10 text-xs font-extrabold rounded-xl border-slate-200 dark:border-slate-750 px-4 cursor-pointer"
          >
            Cancel / Close
          </Button>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-10 text-xs font-black rounded-xl border-teal-300 text-teal-800 dark:text-teal-300 hover:bg-teal-50 px-4 flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Printer className="w-4 h-4 text-teal-600" />
              <span>Print A4 Prescription Letter</span>
            </Button>

            <Button
              size="sm"
              disabled={saveMutation.isPending}
              onClick={async () => {
                await saveMutation.mutateAsync();
                onClose();
              }}
              className="h-10 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-xl shadow-md px-6 flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>
                {saveMutation.isPending
                  ? 'Saving Record...'
                  : isRxReadOnly
                  ? 'Save Patient Vitals Intake'
                  : 'Complete & Save Prescription'}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
