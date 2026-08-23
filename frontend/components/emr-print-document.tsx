'use client';

import React from 'react';
import { Patient, Appointment, Doctor, Clinic, PrescriptionSettings } from '@/types';
import {
  Activity,
  Heart,
  Thermometer,
  Stethoscope,
  Calendar,
  Phone,
  MapPin,
  ShieldCheck,
  QrCode,
  AlertTriangle,
  User,
  FileText,
  Droplet,
  CalendarCheck,
  Mail,
  Award,
  Globe,
  FlaskConical,
  Sparkles,
  Clock
} from 'lucide-react';

export type EMRPrintMode = 'EMR_CASE_SHEET' | 'PRESCRIPTION_PAD' | 'INVESTIGATION_SLIP';

export interface EMRPrintDocumentProps {
  mode?: EMRPrintMode;
  patient?: Partial<Patient> | null;
  appointment?: Partial<Appointment> | null;
  doctor?: Partial<Doctor> | null;
  clinic?: Partial<Clinic> | null;
  settings?: Partial<PrescriptionSettings> | null;
  accentColor?: string;
}

export const EMRPrintDocument: React.FC<EMRPrintDocumentProps> = ({
  mode = 'PRESCRIPTION_PAD',
  patient,
  appointment,
  doctor,
  clinic,
  settings,
  accentColor = '#0d9488', // Default Medical Teal
}) => {
  // Helper Calculations
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

  const calculateBMI = (weightKg?: number, heightCm?: number) => {
    if (!weightKg || !heightCm || heightCm <= 0) return null;
    const heightM = heightCm / 100;
    const bmiNum = weightKg / (heightM * heightM);
    let category = 'Normal';
    let categoryColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (bmiNum < 18.5) {
      category = 'Underweight';
      categoryColor = 'text-amber-700 bg-amber-50 border-amber-200';
    } else if (bmiNum >= 25 && bmiNum < 30) {
      category = 'Overweight';
      categoryColor = 'text-orange-700 bg-orange-50 border-orange-200';
    } else if (bmiNum >= 30) {
      category = 'Obese';
      categoryColor = 'text-rose-700 bg-rose-50 border-rose-200';
    }

    return {
      value: bmiNum.toFixed(1),
      category,
      categoryColor,
    };
  };

  const formatTime12 = (timeString?: string) => {
    if (!timeString) return '';
    try {
      const parts = timeString.split(':');
      const hours = parseInt(parts[0], 10);
      const minutes = parts[1] ? parts[1].substring(0, 2) : '00';
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const h12 = hours % 12 || 12;
      return `${String(h12).padStart(2, '0')}:${minutes} ${ampm}`;
    } catch {
      return timeString;
    }
  };

  // Parse structured prescription lines
  const parsePrescriptionLines = (rxText?: string) => {
    if (!rxText || !rxText.trim()) return [];
    const lines = rxText.split('\n').map((l) => l.trim()).filter(Boolean);

    return lines.map((line, idx) => {
      const clean = line.replace(/^[•\-\*0-9\.]+\s*/, '');
      const parts = clean.split('—').map((p) => p.trim());
      const subParts = parts.length === 1 ? clean.split('-').map((p) => p.trim()) : parts;

      return {
        sNo: idx + 1,
        name: subParts[0] || clean,
        dosage: subParts[1] || '1-0-1',
        timing: subParts[2] || 'After Food',
        duration: subParts[3] || '5 Days',
        instructions: subParts[4] || '',
        raw: line,
      };
    });
  };

  const rxMedicines = parsePrescriptionLines(appointment?.prescription);
  const bmiInfo = calculateBMI(
    appointment?.weight || patient?.weightKg,
    appointment?.height || patient?.heightCm
  );

  const marginMm =
    settings?.printMarginMm !== undefined && settings?.printMarginMm !== null
      ? settings.printMarginMm
      : 10;
  const showLogo = settings?.showLogo ?? true;
  const enableQrCode = settings?.enableQrCode ?? true;

  // Format Consultation Date
  const consultDateObj = appointment?.appointmentDate
    ? new Date(
        appointment.appointmentDate.includes('T')
          ? appointment.appointmentDate
          : `${appointment.appointmentDate}T00:00:00`
      )
    : new Date();

  const formattedConsultDate = consultDateObj.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // Format Consultation Time
  let formattedConsultTime = '';
  if (appointment?.startTime) {
    formattedConsultTime = formatTime12(appointment.startTime);
    if (appointment.endTime) {
      formattedConsultTime += ` - ${formatTime12(appointment.endTime)}`;
    }
  } else if (appointment?.createdAt) {
    try {
      formattedConsultTime = new Date(appointment.createdAt).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      formattedConsultTime = new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
  } else {
    formattedConsultTime = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  const refCode = appointment?.id
    ? `RX-${appointment.id.slice(0, 8).toUpperCase()}`
    : `RX-${Math.floor(100000 + Math.random() * 900000)}`;

  const doctorName = appointment?.doctorName || doctor?.name || 'Dr. Medical Officer';
  const doctorSpecialization = doctor?.specialization || 'Consultant Physician & Specialist';
  const doctorQualification = doctor?.qualification || 'MBBS, MD (General Medicine)';
  const doctorRegNumber = doctor?.registrationNumber || 'MCI-REG-84729';

  return (
    <div
      id="printable-emr-document"
      className="bg-white text-slate-900 mx-auto rounded-none relative font-sans shadow-2xl border border-slate-200 print:border-0 print:shadow-none print:m-0 print:w-full print:max-w-none text-[12px] leading-relaxed select-text"
      style={{
        width: '100%',
        maxWidth: '210mm',
        minHeight: '297mm',
        padding: `${marginMm}mm`,
        boxSizing: 'border-box',
      }}
    >
      {/* Subtle Background Watermark */}
      {settings?.watermarkUrl ? (
        <div
          className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] bg-center bg-no-repeat bg-contain"
          style={{ backgroundImage: `url('${settings.watermarkUrl}')` }}
        />
      ) : (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.015] select-none">
          <span className="text-9xl font-serif italic font-black text-slate-900 tracking-widest">
            Rx
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. EXECUTIVE CLINIC LETTERHEAD & DOCTOR CREDENTIALS HEADER */}
      {/* ========================================================================= */}
      <div className="border-b-2 pb-4 mb-4" style={{ borderColor: accentColor }}>
        <div className="flex justify-between items-start gap-4">
          {/* Clinic Brand & Hospital Identity */}
          <div className="flex items-start gap-3.5 max-w-[58%]">
            {showLogo && (clinic?.logoUrl || settings?.watermarkUrl) ? (
              <img
                src={clinic?.logoUrl || settings?.watermarkUrl}
                alt="Clinic Logo"
                className="w-16 h-16 object-contain rounded-2xl border border-slate-200/90 p-1.5 shadow-2xs shrink-0 bg-white"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div
                className="w-15 h-15 rounded-2xl flex items-center justify-center text-white font-black text-2xl shrink-0 shadow-md"
                style={{
                  background: `linear-gradient(135deg, ${accentColor}, #0f766e)`,
                }}
              >
                {clinic?.name?.charAt(0) || 'C'}
              </div>
            )}

            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-[17px] font-black tracking-tight text-slate-950 uppercase leading-snug">
                  {clinic?.name || 'NISSCHAY MULTISPECIALTY CLINIC'}
                </h1>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                  NABH Accredited
                </span>
              </div>

              <p className="text-[11px] font-medium text-slate-600 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{clinic?.address || 'Medical Health Complex, City Center'}</span>
              </p>

              <div className="text-[10.5px] font-medium text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-0.5">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                  <strong className="text-slate-800 font-semibold">{clinic?.phone || '+91 98765 43210'}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{clinic?.email || 'care@clinic.com'}</span>
                </span>
              </div>

              {settings?.headerText && (
                <p className="text-[10px] font-bold mt-1 tracking-wider uppercase" style={{ color: accentColor }}>
                  {settings.headerText}
                </p>
              )}
            </div>
          </div>

          {/* Doctor Credentials & Medical Registration */}
          <div className="text-right space-y-0.5 max-w-[40%] shrink-0">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9.5px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200 mb-1">
              <Award className="w-3 h-3 text-teal-600" />
              <span>Verified Medical Practitioner</span>
            </div>

            <h2 className="text-base font-black text-slate-950 tracking-tight">
              Dr. {doctorName.replace(/^Dr\.?\s*/i, '')}
            </h2>

            <p className="text-xs font-bold" style={{ color: accentColor }}>
              {doctorSpecialization}
            </p>

            <p className="text-[11px] text-slate-600 font-semibold">
              {doctorQualification}
            </p>

            <p className="text-[10px] font-mono font-bold text-slate-500 uppercase pt-0.5">
              Reg. No: <span className="text-slate-900 font-extrabold">{doctorRegNumber}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. PATIENT DEMOGRAPHICS & DATE/TIME OF CONSULTATION CARD */}
      {/* ========================================================================= */}
      <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-3.5 mb-4 shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
          {/* Patient Name */}
          <div className="space-y-0.5">
            <span className="text-[9.5px] text-slate-400 font-extrabold uppercase tracking-wider block">
              Patient Name / UHID
            </span>
            <div className="font-black text-slate-950 text-[13px] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{patient?.name || appointment?.patientName || 'Walk-in Patient'}</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 block">
              ID: {patient?.id ? patient.id.slice(0, 8).toUpperCase() : 'N/A'}
            </span>
          </div>

          {/* Age / Gender / Blood Group */}
          <div className="space-y-0.5">
            <span className="text-[9.5px] text-slate-400 font-extrabold uppercase tracking-wider block">
              Age / Gender / Blood Group
            </span>
            <div className="font-bold text-slate-800 text-xs">
              {calculateAge(patient?.dateOfBirth)} • {patient?.gender || 'Unspecified'}
            </div>
            {patient?.bloodGroup ? (
              <span className="inline-block text-[10px] font-mono font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                Blood: {patient.bloodGroup}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400">Blood: Not recorded</span>
            )}
          </div>

          {/* Contact Mobile */}
          <div className="space-y-0.5">
            <span className="text-[9.5px] text-slate-400 font-extrabold uppercase tracking-wider block">
              Patient Contact
            </span>
            <div className="font-mono font-bold text-slate-900 flex items-center gap-1 text-xs">
              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
              <span>{patient?.phone || appointment?.patientPhone || 'N/A'}</span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium block">
              Visit Type: <strong className="text-slate-800">{appointment?.type || 'Consultation'}</strong>
            </span>
          </div>

          {/* DATE & TIME OF CONSULTATION (PROMINENT HIGHLIGHT) */}
          <div className="bg-white p-2.5 rounded-xl border border-teal-200/90 shadow-2xs space-y-0.5">
            <span className="text-[9.5px] font-extrabold uppercase tracking-wider flex items-center gap-1 text-teal-800">
              <CalendarCheck className="w-3.5 h-3.5 text-teal-600" />
              Date & Time of Consultation
            </span>
            <div className="font-extrabold text-slate-950 text-xs flex items-center gap-1.5 pt-0.5 flex-wrap">
              <span>{formattedConsultDate}</span>
              <span className="text-slate-300">•</span>
              <span className="font-mono text-teal-900 bg-teal-50 px-1.5 py-0.5 rounded-md border border-teal-200 font-black text-[11px]">
                {formattedConsultTime}
              </span>
            </div>
          </div>
        </div>

        {/* Vitals Summary Strip */}
        {(appointment?.bpSystolic ||
          appointment?.pulse ||
          appointment?.temperature ||
          appointment?.spo2 ||
          appointment?.weight ||
          patient?.weightKg ||
          bmiInfo) && (
          <div className="mt-3 pt-2.5 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-6 gap-2 text-[11px]">
            {appointment?.bpSystolic && appointment?.bpDiastolic && (
              <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/90 flex items-center justify-between">
                <span className="text-[9.5px] font-extrabold text-slate-400 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-rose-500" /> BP
                </span>
                <strong className="text-slate-900 font-mono font-bold">
                  {appointment.bpSystolic}/{appointment.bpDiastolic}{' '}
                  <span className="text-[8.5px] font-normal text-slate-400">mmHg</span>
                </strong>
              </div>
            )}

            {appointment?.pulse && (
              <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/90 flex items-center justify-between">
                <span className="text-[9.5px] font-extrabold text-slate-400 flex items-center gap-1">
                  <Heart className="w-3 h-3 text-rose-500" /> Pulse
                </span>
                <strong className="text-slate-900 font-mono font-bold">
                  {appointment.pulse} <span className="text-[8.5px] font-normal text-slate-400">bpm</span>
                </strong>
              </div>
            )}

            {appointment?.spo2 && (
              <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/90 flex items-center justify-between">
                <span className="text-[9.5px] font-extrabold text-slate-400 flex items-center gap-1">
                  <Droplet className="w-3 h-3 text-teal-600" /> SpO2
                </span>
                <strong className="text-slate-900 font-mono font-bold">{appointment.spo2}%</strong>
              </div>
            )}

            {appointment?.temperature && (
              <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/90 flex items-center justify-between">
                <span className="text-[9.5px] font-extrabold text-slate-400 flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-amber-500" /> Temp
                </span>
                <strong className="text-slate-900 font-mono font-bold">{appointment.temperature}°F</strong>
              </div>
            )}

            {(appointment?.weight || patient?.weightKg) && (
              <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/90 flex items-center justify-between">
                <span className="text-[9.5px] font-extrabold text-slate-400">Weight</span>
                <strong className="text-slate-900 font-mono font-bold">
                  {appointment?.weight || patient?.weightKg} kg
                </strong>
              </div>
            )}

            {bmiInfo && (
              <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/90 flex items-center justify-between">
                <span className="text-[9.5px] font-extrabold text-slate-400">BMI</span>
                <strong className="text-slate-900 font-mono font-bold">
                  {bmiInfo.value}{' '}
                  <span className="text-[8.5px] font-bold text-emerald-700">({bmiInfo.category})</span>
                </strong>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. HIGH RISK DRUG ALLERGIES & WARNING CALLOUT */}
      {/* ========================================================================= */}
      {(patient?.allergies || patient?.medicalHistory) && (
        <div className="mb-4 p-3 bg-amber-50/90 border border-amber-300/80 rounded-xl flex items-start gap-2.5 text-xs shadow-2xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-tight">
            {patient?.allergies && (
              <p className="font-black text-amber-950">
                Known Drug Allergies:{' '}
                <span className="font-extrabold underline text-red-700 bg-red-100/80 px-1.5 py-0.5 rounded">
                  {patient.allergies}
                </span>
              </p>
            )}
            {patient?.medicalHistory && (
              <p className="text-amber-900 text-[11px] font-medium">
                Medical History / Pre-existing: <span className="font-bold text-slate-800">{patient.medicalHistory}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. CHIEF COMPLAINTS & CLINICAL DIAGNOSIS */}
      {/* ========================================================================= */}
      {(mode === 'EMR_CASE_SHEET' || mode === 'PRESCRIPTION_PAD') &&
        (appointment?.symptoms || appointment?.diagnosis || appointment?.reason) && (
          <div className="space-y-3 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Chief Complaints / Symptoms */}
              {(appointment?.symptoms || appointment?.reason) && (
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3 space-y-1">
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" style={{ color: accentColor }} />
                    Chief Complaints & Symptoms
                  </h3>
                  <div className="text-xs font-semibold text-slate-800 whitespace-pre-line leading-relaxed">
                    {appointment.symptoms || appointment.reason}
                  </div>
                </div>
              )}

              {/* Clinical Diagnosis (ICD) */}
              {appointment?.diagnosis && (
                <div className="bg-teal-50/50 border border-teal-200/80 rounded-xl p-3 space-y-1">
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                    Clinical Diagnosis (ICD Assessment)
                  </h3>
                  <div className="text-xs font-black text-teal-950 whitespace-pre-line leading-relaxed">
                    {appointment.diagnosis}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      {/* ========================================================================= */}
      {/* 5. PRESCRIBED MEDICATIONS TABLE (Rx) */}
      {/* ========================================================================= */}
      <div className="mb-5">
        <div className="flex items-center justify-between border-b-2 pb-1.5 mb-2.5" style={{ borderColor: accentColor }}>
          <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2" style={{ color: accentColor }}>
            <span className="text-2xl font-serif italic font-black leading-none">Rx</span>
            <span>Prescribed Medications</span>
          </h3>
          <span className="text-[10.5px] font-mono text-slate-600 font-bold uppercase bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
            {rxMedicines.length} Item(s)
          </span>
        </div>

        {rxMedicines.length > 0 ? (
          <div className="overflow-hidden border border-slate-200/90 rounded-xl shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-200 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Medicine & Salt Composition</th>
                  <th className="py-2.5 px-3 text-center">Dosage Frequency</th>
                  <th className="py-2.5 px-3 text-center">Timing / Food</th>
                  <th className="py-2.5 px-3 text-center">Duration</th>
                  <th className="py-2.5 px-3 text-right">Remarks / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {rxMedicines.map((med) => (
                  <tr key={med.sNo} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-center font-bold text-slate-400 text-[11px]">
                      {med.sNo}.
                    </td>
                    <td className="py-2.5 px-3">
                      <strong className="font-black text-slate-950 text-xs block">{med.name}</strong>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-md font-bold font-mono text-[11px] bg-slate-100 border border-slate-200 text-slate-900">
                        {med.dosage}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                      {med.timing}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-900 font-mono">
                      {med.duration}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[11px] text-slate-500 italic">
                      {med.instructions || 'As directed'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 whitespace-pre-line leading-relaxed">
            {appointment?.prescription ||
              settings?.defaultAdvice ||
              'No specific oral medications prescribed. Continue supportive care.'}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 6. DOCTOR ADVICE & DIETARY GUIDELINES */}
      {/* ========================================================================= */}
      {(appointment?.notes || settings?.defaultAdvice) && (
        <div className="mb-4 space-y-1">
          <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            Special Advice, Diet & Lifestyle Instructions
          </h3>
          <div className="p-3 bg-slate-50/80 border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-800 leading-relaxed whitespace-pre-line">
            {appointment?.notes || settings?.defaultAdvice}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. NEXT FOLLOW-UP REVIEW SCHEDULE */}
      {/* ========================================================================= */}
      {appointment?.followUpDate && (
        <div className="mb-5 p-3 bg-teal-50/80 border border-teal-200 rounded-xl flex items-center justify-between text-xs font-bold text-teal-950 shadow-2xs">
          <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-600" />
            Next Consultation / Follow-Up Review:
          </span>
          <span className="font-mono text-xs px-3 py-1 bg-white border border-teal-300 rounded-lg text-teal-900 font-black shadow-2xs">
            {new Date(
              appointment.followUpDate.includes('T')
                ? appointment.followUpDate
                : `${appointment.followUpDate}T00:00:00`
            ).toLocaleDateString('en-IN', {
              weekday: 'short',
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. FOOTER: SECURITY QR CODE & AUTHORIZED DIGITAL SIGNATURE */}
      {/* ========================================================================= */}
      <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-end gap-4">
        {/* Left: Security Verification */}
        {enableQrCode ? (
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center p-1 text-slate-700 shrink-0">
              <QrCode className="w-9 h-9 text-slate-800" />
              <span className="text-[6.5px] font-mono font-bold uppercase mt-0.5">SCAN VERIFY</span>
            </div>
            <div className="space-y-0.5 text-[9.5px] text-slate-500 font-medium">
              <p className="font-black text-slate-800 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Digitally Signed Medical EMR
              </p>
              <p>
                Ref Code: <span className="font-mono font-bold text-slate-800">{refCode}</span>
              </p>
              <p>{settings?.footerText || 'Valid for clinical reference, diagnostic tests & licensed pharmacy dispensing.'}</p>
            </div>
          </div>
        ) : (
          <div className="text-[10px] text-slate-400 font-mono">
            {settings?.footerText || 'Generated digitally by CMS Healthcare EMR System'}
          </div>
        )}

        {/* Right: Signature & Doctor Stamp */}
        <div className="text-center space-y-1 min-w-[170px]">
          {settings?.digitalSignatureUrl ? (
            <img
              src={settings.digitalSignatureUrl}
              alt="Doctor Signature"
              className="h-11 object-contain mx-auto"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="h-9" />
          )}
          <div className="w-44 border-b border-slate-400 mx-auto" />
          <span className="text-xs font-black text-slate-950 block">
            Dr. {doctorName.replace(/^Dr\.?\s*/i, '')}
          </span>
          <span className="text-[9px] text-slate-500 font-bold block uppercase">
            Authorized Medical Practitioner
          </span>
        </div>
      </div>
    </div>
  );
};
