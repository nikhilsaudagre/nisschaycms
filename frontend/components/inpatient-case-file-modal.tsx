'use client';

import React, { useState } from 'react';
import {
  X,
  BedDouble,
  Activity,
  Pill,
  FileText,
  Clock,
  User,
  Phone,
  Calendar,
  Heart,
  Stethoscope,
  Printer,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  FlaskConical,
  Receipt,
  Plus,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Clinic, Doctor, Patient, DailyCheckingLog, InpatientMedicationOrder } from '@/types';
import { apiClient } from '@/lib/api-client';
import { formatClinicalDateTime } from '@/lib/utils';

interface InpatientCaseFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  admission: any;
  doctor?: Partial<Doctor> | null;
  clinic?: Partial<Clinic> | null;
  onRefresh?: () => void;
}

export const InpatientCaseFileModal: React.FC<InpatientCaseFileModalProps> = ({
  isOpen,
  onClose,
  admission,
  doctor,
  clinic,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ROUNDS' | 'MEDS' | 'JOURNEY' | 'BILLING'>('OVERVIEW');
  const [currentAdm, setCurrentAdm] = useState<any>(admission);

  // Quick Action Forms inside Case File
  const [showAddRoundForm, setShowAddRoundForm] = useState(false);
  const [showAddMedForm, setShowAddMedForm] = useState(false);
  const [savingAction, setSavingAction] = useState(false);

  // New Round Form State
  const [newRoundBp, setNewRoundBp] = useState('120/80');
  const [newRoundPulse, setNewRoundPulse] = useState('78');
  const [newRoundTemp, setNewRoundTemp] = useState('98.6');
  const [newRoundSpo2, setNewRoundSpo2] = useState('99');
  const [newRoundRespRate, setNewRoundRespRate] = useState('18');
  const [newRoundNotes, setNewRoundNotes] = useState('');
  const [newRoundTreatment, setNewRoundTreatment] = useState('');

  // New Medication Form State
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('1 Amp / 1 Tab');
  const [newMedRoute, setNewMedRoute] = useState('IV');
  const [newMedFrequency, setNewMedFrequency] = useState('Twice Daily (BD - 1-0-1)');
  const [newMedNotes, setNewMedNotes] = useState('');

  React.useEffect(() => {
    setCurrentAdm(admission);
  }, [admission]);

  if (!isOpen || !currentAdm) return null;

  const isAdmitted = currentAdm.status === 'ACTIVE' || currentAdm.status === 'ADMITTED' || currentAdm.status === 'OCCUPIED' || currentAdm.status === 'DISCHARGE_PLANNED';
  const isDischarged = currentAdm.status === 'DISCHARGED' || Boolean(currentAdm.dischargeDate);

  // Clean doctor name formatting
  const formatDoctorName = (rawName?: string) => {
    if (!rawName) return doctor?.name ? `Dr. ${doctor.name.replace(/^dr\.?\s*/i, '')}` : 'Attending Consultant';
    const clean = rawName.replace(/^dr\.?\s*/gi, '').trim();
    return `Dr. ${clean}`;
  };

  const consultantName = formatDoctorName(currentAdm.consultantDoctorName || doctor?.name);
  const patientName = currentAdm.patientName || 'Inpatient';
  const patientPhone = currentAdm.patientPhone || '—';
  const patientAgeGender = currentAdm.patientAgeGender || (currentAdm.patientAge ? `${currentAdm.patientAge}Y / ${currentAdm.patientGender || 'M'}` : 'Adult');
  const uhid = currentAdm.patientId ? `UHID-${currentAdm.patientId.slice(0, 8).toUpperCase()}` : (currentAdm.uhid || 'UHID-REG');
  const ipdNo = currentAdm.ipdNumber || `IPD-${currentAdm.bedNumber || 'ACTIVE'}`;
  const bedWard = `${currentAdm.bedNumber || 'Bed'} • ${currentAdm.wardName || currentAdm.wardType || 'General Ward'}`;

  // Dates & Duration
  const admissionDateStr = currentAdm.admissionDate
    ? new Date(currentAdm.admissionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
  const admissionTimeStr = currentAdm.admissionTime || '10:00 AM';

  const dischargeDateStr = currentAdm.dischargeDate
    ? new Date(currentAdm.dischargeDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  let stayDays = 1;
  if (currentAdm.admissionDate) {
    const start = new Date(currentAdm.admissionDate).getTime();
    const end = currentAdm.dischargeDate ? new Date(currentAdm.dischargeDate).getTime() : Date.now();
    const diff = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
    stayDays = diff;
  }

  // Clinical records
  const dailyLogs: DailyCheckingLog[] = Array.isArray(currentAdm.dailyLogs) ? currentAdm.dailyLogs : [];
  const medications: InpatientMedicationOrder[] = Array.isArray(currentAdm.inpatientMedications) ? currentAdm.inpatientMedications : [];
  const services = Array.isArray(currentAdm.billingCharges) ? currentAdm.billingCharges : [];
  const advances = Array.isArray(currentAdm.advancePayments) ? currentAdm.advancePayments : [];
  const totalBilled = services.reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0);
  const totalAdvance = advances.reduce((sum: number, a: any) => sum + (a.amount || 0), 0);
  const netDue = Math.max(0, totalBilled - totalAdvance);

  // Discharge Details
  const dischargePlan = currentAdm.dischargePlan || {};
  const dischargeDiagnosis = currentAdm.finalDiagnosis || dischargePlan.finalDiagnosis || currentAdm.admittingDiagnosis || 'Inpatient Clinical Care Completed';
  const dischargeCondition = currentAdm.conditionAtDischarge || dischargePlan.conditionAtDischarge || 'Hemodynamically Stable, Afebrile, Ambulatory';
  const dischargeSummary = currentAdm.dischargeSummary || dischargePlan.summary || 'Patient responded well to hospital treatment course. Vital parameters within normal limits.';
  const dischargeMeds = dischargePlan.takeHomeMedications || dischargePlan.dischargeMedicines || [];

  // Helper to persist updates
  const saveUpdatedAdmission = async (updatedBed: any) => {
    setCurrentAdm(updatedBed);
    try {
      if (typeof window !== 'undefined') {
        const local = localStorage.getItem('nisschay_hospital_beds');
        if (local) {
          try {
            const beds: any[] = JSON.parse(local);
            const nextBeds = beds.map((b) => (b.id === updatedBed.id || b.bedNumber === updatedBed.bedNumber ? { ...b, ...updatedBed } : b));
            localStorage.setItem('nisschay_hospital_beds', JSON.stringify(nextBeds));
            window.dispatchEvent(new CustomEvent('hospital-beds-updated', { detail: nextBeds }));
            await apiClient.post('/clinics/hospital-data', { beds: JSON.stringify(nextBeds) });
          } catch {}
        }
      }
    } catch (e) {
      console.error('Sync failed:', e);
    }
    if (onRefresh) onRefresh();
  };

  // Add Round
  const handleAddRoundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAction(true);
    try {
      const nowIso = new Date().toISOString();

      const newLog: DailyCheckingLog = {
        id: `log-${Date.now()}`,
        timestamp: nowIso,
        recordedBy: consultantName,
        bp: newRoundBp ? `${newRoundBp} mmHg` : '120/80 mmHg',
        pulse: newRoundPulse ? `${newRoundPulse} bpm` : '78 bpm',
        temp: newRoundTemp ? `${newRoundTemp} °F` : '98.6 °F',
        spo2: newRoundSpo2 ? `${newRoundSpo2}%` : '99%',
        respRate: newRoundRespRate ? `${newRoundRespRate} /min` : '18 /min',
        clinicalNotes: newRoundNotes || 'Patient evaluated. Parameters stable.',
        treatmentGiven: newRoundTreatment || 'Advised continuation of treatment plan.'
      };

      const nextLogs = [newLog, ...dailyLogs];
      const updatedBed = { ...currentAdm, dailyLogs: nextLogs };
      await saveUpdatedAdmission(updatedBed);

      setShowAddRoundForm(false);
      setNewRoundNotes('');
      setNewRoundTreatment('');
    } finally {
      setSavingAction(false);
    }
  };

  // Add Medication
  const handleAddMedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedName.trim()) return;
    setSavingAction(true);
    try {
      const nowIso = new Date().toISOString();

      const newMedOrder: InpatientMedicationOrder = {
        id: `med-${Date.now()}`,
        indentNumber: `IND-${Math.floor(1000 + Math.random() * 9000)}`,
        medicineName: newMedName.trim(),
        dosage: `${newMedDosage} (${newMedRoute})`,
        frequency: newMedFrequency,
        source: 'HOSPITAL_PHARMACY',
        price: 150,
        dateOrdered: nowIso,
        status: 'ADMINISTERED',
        prescribedBy: consultantName,
        requestedByNurse: 'Ward Nurse',
        notes: newMedNotes || 'Administer as scheduled',
        items: [
          {
            id: `item-${Date.now()}`,
            name: newMedName.trim(),
            dosage: `${newMedDosage} [${newMedRoute}]`,
            frequency: newMedFrequency,
            source: 'HOSPITAL_PHARMACY',
            status: 'ADMINISTERED'
          }
        ]
      };

      const nextMeds = [newMedOrder, ...medications];
      const updatedBed = { ...currentAdm, inpatientMedications: nextMeds };
      await saveUpdatedAdmission(updatedBed);

      setShowAddMedForm(false);
      setNewMedName('');
      setNewMedNotes('');
    } finally {
      setSavingAction(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#172B34]/60 backdrop-blur-xs font-sans animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl border border-[#E8EEF2] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden my-auto">
        
        {/* SLEEK MINIMAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-[#E8EEF2] bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#087F8C]/10 border border-[#087F8C]/20 flex items-center justify-center text-[#087F8C] shrink-0 font-bold">
              <BedDouble className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-extrabold text-[#172B34]">{patientName}</h2>
                <span className="text-xs text-[#567781] font-semibold">{patientAgeGender}</span>
                <span className="font-mono text-[11px] font-bold text-[#087F8C] bg-[#087F8C]/10 px-2 py-0.5 rounded-md">
                  {ipdNo}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                  isAdmitted
                    ? 'bg-[#22A06B]/10 text-[#22A06B] border-[#22A06B]/20'
                    : 'bg-[#94A3B8]/10 text-[#567781] border-[#94A3B8]/20'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isAdmitted ? 'bg-[#22A06B] animate-pulse' : 'bg-[#94A3B8]'}`} />
                  <span>{isAdmitted ? 'Active Stay' : 'Discharged'}</span>
                </span>
              </div>
              <p className="text-xs text-[#567781] mt-0.5 flex items-center gap-2 flex-wrap">
                <span>{bedWard}</span>
                <span>•</span>
                <span>Doctor: <strong className="text-[#172B34] font-semibold">{consultantName}</strong></span>
                <span>•</span>
                <span className="font-mono text-[11px]">{uhid}</span>
                {patientPhone !== '—' && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-[11px]">{patientPhone}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {isAdmitted && (
              <>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setShowAddRoundForm(true);
                    setActiveTab('ROUNDS');
                  }}
                  className="h-8 px-3 bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs rounded-xl shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>+ Add Vitals</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowAddMedForm(true);
                    setActiveTab('MEDS');
                  }}
                  className="h-8 px-3 border-[#E8EEF2] bg-[#F6F9FB] hover:bg-white text-[#087F8C] font-bold text-xs rounded-xl shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <Pill className="w-3.5 h-3.5" />
                  <span>+ Add Med</span>
                </Button>
              </>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="h-8 px-3 border-[#E8EEF2] bg-[#F6F9FB] hover:bg-white text-[#172B34] font-bold text-xs rounded-xl shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-[#087F8C]" />
              <span>Print</span>
            </Button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-[#567781] hover:text-[#172B34] hover:bg-[#F6F9FB] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* WORKSTATION TABS */}
        <div className="flex items-center gap-1.5 px-4 pt-2.5 pb-2 bg-[#F6F9FB] border-b border-[#E8EEF2] overflow-x-auto scrollbar-none shrink-0 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('OVERVIEW')}
            className={`py-1.5 px-3 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'OVERVIEW'
                ? 'bg-white text-[#172B34] shadow-xs border border-[#E8EEF2]'
                : 'text-[#567781] hover:text-[#172B34]'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5 text-[#087F8C]" />
            <span>Admission & Diagnosis</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ROUNDS')}
            className={`py-1.5 px-3 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'ROUNDS'
                ? 'bg-white text-[#172B34] shadow-xs border border-[#E8EEF2]'
                : 'text-[#567781] hover:text-[#172B34]'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-[#22A06B]" />
            <span>Doctor Rounds & Vitals ({dailyLogs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('MEDS')}
            className={`py-1.5 px-3 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'MEDS'
                ? 'bg-white text-[#172B34] shadow-xs border border-[#E8EEF2]'
                : 'text-[#567781] hover:text-[#172B34]'
            }`}
          >
            <Pill className="w-3.5 h-3.5 text-[#E9A23B]" />
            <span>Medication Chart ({medications.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('JOURNEY')}
            className={`py-1.5 px-3 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'JOURNEY'
                ? 'bg-white text-[#172B34] shadow-xs border border-[#E8EEF2]'
                : 'text-[#567781] hover:text-[#172B34]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-[#4FA8DB]" />
            <span>Clinical Journey & Summary</span>
          </button>

          {services.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('BILLING')}
              className={`py-1.5 px-3 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'BILLING'
                  ? 'bg-white text-[#172B34] shadow-xs border border-[#E8EEF2]'
                  : 'text-[#567781] hover:text-[#172B34]'
              }`}
            >
              <Receipt className="w-3.5 h-3.5 text-[#567781]" />
              <span>Billing Ledger</span>
            </button>
          )}
        </div>

        {/* MODAL CONTENT BODY */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 bg-white">
          
          {/* COMPACT STATS STRIP */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#F6F9FB] p-3 rounded-xl border border-[#E8EEF2] space-y-0.5">
              <span className="text-[10px] font-bold text-[#567781] uppercase tracking-wider block">Admission Date</span>
              <div className="text-xs font-bold text-[#172B34]">{admissionDateStr}</div>
              <span className="text-[10px] text-[#567781] font-mono">{admissionTimeStr}</span>
            </div>

            <div className="bg-[#F6F9FB] p-3 rounded-xl border border-[#E8EEF2] space-y-0.5">
              <span className="text-[10px] font-bold text-[#087F8C] uppercase tracking-wider block">Length of Stay</span>
              <div className="text-xs font-bold text-[#087F8C]">{stayDays} {stayDays === 1 ? 'Day' : 'Days'}</div>
              <span className="text-[10px] text-[#567781]">{isAdmitted ? 'Active Stay' : 'Completed'}</span>
            </div>

            <div className="bg-[#F6F9FB] p-3 rounded-xl border border-[#E8EEF2] space-y-0.5">
              <span className="text-[10px] font-bold text-[#22A06B] uppercase tracking-wider block">Doctor Rounds</span>
              <div className="text-xs font-bold text-[#22A06B]">{dailyLogs.length} Logged</div>
              <span className="text-[10px] text-[#567781]">Bedside checks</span>
            </div>

            <div className="bg-[#F6F9FB] p-3 rounded-xl border border-[#E8EEF2] space-y-0.5">
              <span className="text-[10px] font-bold text-[#E9A23B] uppercase tracking-wider block">Medications</span>
              <div className="text-xs font-bold text-[#172B34]">{medications.length} Prescribed</div>
              <span className="text-[10px] text-[#567781]">MAR chart</span>
            </div>
          </div>

          {/* TAB 1: ADMISSION INTAKE & DIAGNOSIS */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-3.5">
              <div className="p-4 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] space-y-3">
                <div className="flex items-center gap-2 border-b border-[#E8EEF2] pb-2">
                  <Stethoscope className="w-4 h-4 text-[#087F8C]" />
                  <h3 className="text-xs font-bold text-[#172B34] uppercase tracking-wide">Admission Details</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-[#567781] uppercase block">Admitting Diagnosis</span>
                    <p className="font-bold text-[#172B34] mt-0.5">
                      {currentAdm.admittingDiagnosis || currentAdm.diagnosis || 'Inpatient Care & Observation'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-[#567781] uppercase block">Assigned Bed & Ward</span>
                    <p className="font-semibold text-[#172B34] mt-0.5">{bedWard}</p>
                  </div>
                </div>

                {/* Baseline Vitals */}
                <div className="pt-1">
                  <span className="text-[10px] font-bold text-[#567781] uppercase block mb-1.5">Intake Vitals on Admission:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                    <div className="p-2 bg-white rounded-lg border border-[#E8EEF2]">
                      <span className="text-[10px] text-[#567781] block">BP</span>
                      <strong className="font-mono text-[#172B34]">{dailyLogs[0]?.bp || currentAdm.bp || '120/80'}</strong>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-[#E8EEF2]">
                      <span className="text-[10px] text-[#567781] block">Pulse</span>
                      <strong className="font-mono text-[#172B34]">{dailyLogs[0]?.pulse || currentAdm.pulse || '78 bpm'}</strong>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-[#E8EEF2]">
                      <span className="text-[10px] text-[#567781] block">Temp</span>
                      <strong className="font-mono text-[#172B34]">{dailyLogs[0]?.temp || currentAdm.temp || '98.6 °F'}</strong>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-[#E8EEF2]">
                      <span className="text-[10px] text-[#567781] block">SpO2</span>
                      <strong className="font-mono text-[#22A06B]">{dailyLogs[0]?.spo2 || currentAdm.spo2 || '99%'}</strong>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-[#E8EEF2]">
                      <span className="text-[10px] text-[#567781] block">Resp Rate</span>
                      <strong className="font-mono text-[#172B34]">{dailyLogs[0]?.respRate || currentAdm.respRate || '18 /min'}</strong>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {(currentAdm.clinicalNotes || dailyLogs[0]?.clinicalNotes) && (
                  <div className="p-3 bg-white rounded-lg border border-[#E8EEF2] text-xs space-y-0.5">
                    <span className="text-[10px] font-bold text-[#567781] uppercase block">Admission Notes</span>
                    <p className="text-[#172B34] font-medium leading-relaxed">
                      {currentAdm.clinicalNotes || dailyLogs[0]?.clinicalNotes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: DOCTOR ROUNDS & VITALS */}
          {activeTab === 'ROUNDS' && (
            <div className="space-y-3">
              {/* Form: Record Round */}
              {showAddRoundForm && (
                <form onSubmit={handleAddRoundSubmit} className="p-4 bg-[#F6F9FB] rounded-xl border border-[#087F8C]/40 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-2">
                    <span className="font-bold text-[#172B34]">Record Bedside Doctor Round</span>
                    <button
                      type="button"
                      onClick={() => setShowAddRoundForm(false)}
                      className="text-[#567781] hover:text-[#172B34] text-xs"
                    >
                      Cancel ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-[#567781] block mb-0.5">BP</label>
                      <input
                        type="text"
                        value={newRoundBp}
                        onChange={(e) => setNewRoundBp(e.target.value)}
                        placeholder="120/80"
                        className="w-full h-7 px-2 bg-white border border-[#E8EEF2] rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#567781] block mb-0.5">Pulse</label>
                      <input
                        type="text"
                        value={newRoundPulse}
                        onChange={(e) => setNewRoundPulse(e.target.value)}
                        placeholder="78"
                        className="w-full h-7 px-2 bg-white border border-[#E8EEF2] rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#567781] block mb-0.5">Temp</label>
                      <input
                        type="text"
                        value={newRoundTemp}
                        onChange={(e) => setNewRoundTemp(e.target.value)}
                        placeholder="98.6"
                        className="w-full h-7 px-2 bg-white border border-[#E8EEF2] rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#567781] block mb-0.5">SpO2</label>
                      <input
                        type="text"
                        value={newRoundSpo2}
                        onChange={(e) => setNewRoundSpo2(e.target.value)}
                        placeholder="99"
                        className="w-full h-7 px-2 bg-white border border-[#E8EEF2] rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#567781] block mb-0.5">Resp Rate</label>
                      <input
                        type="text"
                        value={newRoundRespRate}
                        onChange={(e) => setNewRoundRespRate(e.target.value)}
                        placeholder="18"
                        className="w-full h-7 px-2 bg-white border border-[#E8EEF2] rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-[#567781] block mb-0.5">Observations / Clinical Notes</label>
                    <input
                      type="text"
                      value={newRoundNotes}
                      onChange={(e) => setNewRoundNotes(e.target.value)}
                      placeholder="e.g. Patient stable, afebrile, chest clear..."
                      className="w-full h-7.5 px-2.5 bg-white border border-[#E8EEF2] rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-[#567781] block mb-0.5">Treatment / Orders</label>
                    <input
                      type="text"
                      value={newRoundTreatment}
                      onChange={(e) => setNewRoundTreatment(e.target.value)}
                      placeholder="e.g. Continue IV fluids, monitor morning BP..."
                      className="w-full h-7.5 px-2.5 bg-white border border-[#E8EEF2] rounded-lg text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddRoundForm(false)}
                      className="h-7 text-xs border-[#E8EEF2]"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={savingAction}
                      className="h-7 bg-[#087F8C] hover:bg-[#076b77] text-white text-xs font-bold px-3 rounded-lg"
                    >
                      {savingAction ? 'Saving...' : 'Save Round'}
                    </Button>
                  </div>
                </form>
              )}

              {dailyLogs.length === 0 ? (
                <div className="p-8 text-center space-y-2 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2]">
                  <Activity className="w-8 h-8 text-[#CBD5E1] mx-auto" />
                  <p className="text-xs font-bold text-[#172B34]">No Doctor Round Logs Recorded Yet</p>
                  <p className="text-[11px] text-[#567781]">Click "+ Add Vitals" above to log round parameters.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {dailyLogs.map((log: DailyCheckingLog, idx: number) => (
                    <div key={log.id || idx} className="p-3 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] space-y-2 text-xs">
                      <div className="flex justify-between items-center border-b border-[#E8EEF2] pb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#172B34]">#{dailyLogs.length - idx} • {formatClinicalDateTime(log.timestamp || 'Round Log')}</span>
                        </div>
                        <span className="text-[11px] text-[#567781]">
                          By: <strong className="text-[#172B34]">{formatDoctorName(log.recordedBy || consultantName)}</strong>
                        </span>
                      </div>

                      {/* Vitals */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-center text-xs">
                        <div className="p-1.5 bg-white rounded-lg border border-[#E8EEF2]">
                          <span className="text-[9px] text-[#567781] block">BP</span>
                          <strong className="font-mono text-[#172B34]">{log.bp || '—'}</strong>
                        </div>
                        <div className="p-1.5 bg-white rounded-lg border border-[#E8EEF2]">
                          <span className="text-[9px] text-[#567781] block">Pulse</span>
                          <strong className="font-mono text-[#172B34]">{log.pulse || '—'}</strong>
                        </div>
                        <div className="p-1.5 bg-white rounded-lg border border-[#E8EEF2]">
                          <span className="text-[9px] text-[#567781] block">Temp</span>
                          <strong className="font-mono text-[#172B34]">{log.temp || '—'}</strong>
                        </div>
                        <div className="p-1.5 bg-white rounded-lg border border-[#E8EEF2]">
                          <span className="text-[9px] text-[#567781] block">SpO2</span>
                          <strong className="font-mono text-[#22A06B]">{log.spo2 || '—'}</strong>
                        </div>
                        <div className="p-1.5 bg-white rounded-lg border border-[#E8EEF2]">
                          <span className="text-[9px] text-[#567781] block">Resp</span>
                          <strong className="font-mono text-[#172B34]">{log.respRate || '—'}</strong>
                        </div>
                      </div>

                      {log.clinicalNotes && (
                        <div className="text-xs text-[#172B34] bg-white p-2 rounded-lg border border-[#E8EEF2]">
                          <strong className="text-[10px] text-[#087F8C] block uppercase">Notes:</strong>
                          <p className="mt-0.5">{log.clinicalNotes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MEDICATION CHART */}
          {activeTab === 'MEDS' && (
            <div className="space-y-3">
              {showAddMedForm && (
                <form onSubmit={handleAddMedSubmit} className="p-4 bg-[#F6F9FB] rounded-xl border border-[#087F8C]/40 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-2">
                    <span className="font-bold text-[#172B34]">Prescribe Inpatient Medication</span>
                    <button
                      type="button"
                      onClick={() => setShowAddMedForm(false)}
                      className="text-[#567781] hover:text-[#172B34] text-xs"
                    >
                      Cancel ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-[#567781] block mb-0.5">Medicine Name *</label>
                      <input
                        type="text"
                        required
                        value={newMedName}
                        onChange={(e) => setNewMedName(e.target.value)}
                        placeholder="e.g. Inj. Ceftriaxone 1g"
                        className="w-full h-7.5 px-2.5 bg-white border border-[#E8EEF2] rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#567781] block mb-0.5">Dosage</label>
                      <input
                        type="text"
                        value={newMedDosage}
                        onChange={(e) => setNewMedDosage(e.target.value)}
                        placeholder="1g / 1 Tab"
                        className="w-full h-7.5 px-2.5 bg-white border border-[#E8EEF2] rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#567781] block mb-0.5">Route</label>
                      <select
                        value={newMedRoute}
                        onChange={(e) => setNewMedRoute(e.target.value)}
                        className="w-full h-7.5 px-2 bg-white border border-[#E8EEF2] rounded-lg text-xs"
                      >
                        <option value="IV">IV</option>
                        <option value="ORAL">Oral</option>
                        <option value="IM">IM</option>
                        <option value="INFUSION">Infusion</option>
                        <option value="NEB">Nebulization</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-[#567781] block mb-0.5">Frequency</label>
                      <select
                        value={newMedFrequency}
                        onChange={(e) => setNewMedFrequency(e.target.value)}
                        className="w-full h-7.5 px-2 bg-white border border-[#E8EEF2] rounded-lg text-xs"
                      >
                        <option value="Twice Daily (BD - 1-0-1)">Twice Daily (BD - 1-0-1)</option>
                        <option value="Once Daily (OD - 1-0-0)">Once Daily (OD - 1-0-0)</option>
                        <option value="Thrice Daily (TDS - 1-1-1)">Thrice Daily (TDS - 1-1-1)</option>
                        <option value="STAT (Immediately)">STAT (Immediately)</option>
                        <option value="SOS (As needed)">SOS (As needed)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#567781] block mb-0.5">Instructions</label>
                      <input
                        type="text"
                        value={newMedNotes}
                        onChange={(e) => setNewMedNotes(e.target.value)}
                        placeholder="e.g. Infuse over 30 mins"
                        className="w-full h-7.5 px-2.5 bg-white border border-[#E8EEF2] rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddMedForm(false)}
                      className="h-7 text-xs border-[#E8EEF2]"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={savingAction}
                      className="h-7 bg-[#087F8C] hover:bg-[#076b77] text-white text-xs font-bold px-3 rounded-lg"
                    >
                      {savingAction ? 'Adding...' : 'Add Medicine'}
                    </Button>
                  </div>
                </form>
              )}

              {medications.length === 0 ? (
                <div className="p-8 text-center space-y-2 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2]">
                  <Pill className="w-8 h-8 text-[#CBD5E1] mx-auto" />
                  <p className="text-xs font-bold text-[#172B34]">No Inpatient Medications Prescribed Yet</p>
                  <p className="text-[11px] text-[#567781]">Click "+ Add Med" above to add medicines or IV injections.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#E8EEF2]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F6F9FB] text-[#567781] uppercase font-bold text-[10px] tracking-wider border-b border-[#E8EEF2]">
                      <tr>
                        <th className="py-2.5 px-3">Date & Time</th>
                        <th className="py-2.5 px-3">Medicine / Injection</th>
                        <th className="py-2.5 px-3">Dosage & Route</th>
                        <th className="py-2.5 px-3">Frequency</th>
                        <th className="py-2.5 px-3">Prescribed By</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8EEF2]">
                      {medications.map((order: InpatientMedicationOrder, idx: number) => {
                        const items = order.items && order.items.length > 0 ? order.items : [
                          {
                            id: order.id,
                            name: order.medicineName,
                            dosage: order.dosage,
                            frequency: order.frequency,
                            status: order.status
                          }
                        ];

                        return items.map((item, subIdx) => (
                          <tr key={`${order.id}-${subIdx}`} className="hover:bg-[#F6F9FB]/60">
                            <td className="py-2.5 px-3 font-mono text-[#567781] text-[11px]">
                              {formatClinicalDateTime(order.dispatchedAt || order.dateOrdered)}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-[#172B34]">
                              {item.name || order.medicineName}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-[#087F8C]">
                              {item.dosage || order.dosage || 'Standard'}
                            </td>
                            <td className="py-2.5 px-3 text-[#172B34]">
                              {item.frequency || order.frequency || 'OD'}
                            </td>
                            <td className="py-2.5 px-3 text-[#567781]">
                              {formatDoctorName(order.prescribedBy || consultantName)}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#22A06B]/10 text-[#22A06B] border border-[#22A06B]/20">
                                {item.status || order.status || 'ADMINISTERED'}
                              </span>
                            </td>
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CLINICAL JOURNEY & SUMMARY */}
          {activeTab === 'JOURNEY' && (
            <div className="space-y-3 text-xs">
              <div className="p-4 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] space-y-3">
                <div className="flex justify-between items-center border-b border-[#E8EEF2] pb-2">
                  <h3 className="font-bold text-[#172B34] uppercase tracking-wide">Inpatient Timeline & Summary</h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                    isDischarged
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}>
                    {isDischarged ? 'DISCHARGED' : 'ADMITTED'}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-[#E8EEF2] space-y-1.5">
                      <span className="text-[10px] text-[#567781] font-bold uppercase block">Admission Timeline:</span>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-[#567781]">Admitted Date:</span>
                          <span className="font-mono font-bold text-[#172B34]">{formatClinicalDateTime(currentAdm.admissionDate)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#567781]">Current Length of Stay:</span>
                          <span className="font-bold text-[#087F8C]">{stayDays} Days</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#567781]">Ward & Bed:</span>
                          <span className="font-bold text-[#172B34]">{currentAdm.wardName || 'General Ward'} (Bed {currentAdm.bedNumber})</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-[#E8EEF2] space-y-1.5">
                      <span className="text-[10px] text-[#567781] font-bold uppercase block">Primary Consultant:</span>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-[#567781]">Doctor:</span>
                          <span className="font-bold text-[#172B34]">{formatDoctorName(consultantName)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#567781]">Specialization:</span>
                          <span className="text-[#172B34]">{doctor?.specialization || 'Consultant Physician'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#567781]">Admission Diagnosis:</span>
                          <span className="font-semibold text-rose-700">{currentAdm.diagnosis || 'Clinical Evaluation'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {dischargeSummary && (
                    <div className="p-3 bg-white rounded-xl border border-[#E8EEF2] space-y-1">
                      <span className="text-[10px] text-[#567781] font-bold uppercase block">Discharge Summary / Clinical Notes:</span>
                      <p className="text-[#172B34] leading-relaxed">{dischargeSummary}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: BILLING */}
          {activeTab === 'BILLING' && (
            <div className="space-y-3 text-xs">
              <div className="p-4 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] space-y-3">
                <div className="flex justify-between items-center border-b border-[#E8EEF2] pb-2">
                  <h3 className="font-bold text-[#172B34] uppercase tracking-wide">Billing Breakdown</h3>
                  <div className="flex items-center gap-3">
                    <span>Billed: <strong className="text-[#172B34]">₹{totalBilled.toLocaleString()}</strong></span>
                    <span>Paid: <strong className="text-[#22A06B]">₹{totalAdvance.toLocaleString()}</strong></span>
                    <span>Due: <strong className="text-[#D64545]">₹{netDue.toLocaleString()}</strong></span>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-[#E8EEF2] bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F6F9FB] text-[#567781] uppercase font-bold text-[10px] tracking-wider border-b border-[#E8EEF2]">
                      <tr>
                        <th className="py-2 px-3">Date & Time</th>
                        <th className="py-2 px-3">Service / Medication</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3 text-right">Rate</th>
                        <th className="py-2 px-3 text-center">Qty</th>
                        <th className="py-2 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8EEF2]">
                      {services.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-[#567781]">No charges logged yet.</td>
                        </tr>
                      ) : (
                        services.map((srv: any, idx: number) => (
                          <tr key={srv.id || idx} className="hover:bg-[#F6F9FB]/60">
                            <td className="py-2 px-3 font-mono text-[11px] text-[#567781]">
                              {formatClinicalDateTime(srv.dateAdded || srv.createdAt || currentAdm.admissionDate)}
                            </td>
                            <td className="py-2 px-3 font-semibold text-[#172B34]">
                              <div>{srv.serviceName}</div>
                              {srv.notes && <span className="text-[10px] text-[#567781] font-normal block">{srv.notes}</span>}
                            </td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                srv.category === 'MEDICATION'
                                  ? 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                                  : srv.category === 'INVESTIGATION'
                                  ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                  : 'bg-slate-100 text-slate-800'
                              }`}>
                                {srv.category || 'General'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono">₹{srv.unitPrice || 0}</td>
                            <td className="py-2 px-3 text-center font-mono">{srv.quantity || 1}</td>
                            <td className="py-2 px-3 text-right font-bold text-[#172B34] font-mono">₹{srv.totalAmount || 0}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="p-3.5 sm:p-4 border-t border-[#E8EEF2] bg-white flex justify-between items-center gap-3 shrink-0">
          <span className="text-[11px] text-[#567781] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22A06B]" />
            <span>Nisschay Inpatient EMR Live</span>
          </span>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 px-4 rounded-xl border-[#E8EEF2] text-[#567781] hover:text-[#172B34] font-bold text-xs cursor-pointer shadow-2xs"
          >
            Close File
          </Button>
        </div>

      </div>
    </div>
  );
};
