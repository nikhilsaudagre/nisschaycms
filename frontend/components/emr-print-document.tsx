'use client';

import React from 'react';
import { Patient, Appointment, Doctor, Clinic, PrescriptionSettings } from '@/types';
import { QrCode } from 'lucide-react';

export type EMRPrintMode = 'EMR_CASE_SHEET' | 'PRESCRIPTION_PAD' | 'INVESTIGATION_SLIP';

export interface EMRPrintDocumentProps {
  mode?: EMRPrintMode;
  patient?: Partial<Patient> | null;
  appointment?: Partial<Appointment> | null;
  doctor?: Partial<Doctor> | null;
  clinic?: Partial<Clinic> | null;
  settings?: Partial<PrescriptionSettings> | null;
  accentColor?: string;
  letterheadMode?: 'PLAIN_PAPER' | 'PREPRINTED_PAD';
  paperSize?: 'A4' | 'A5' | 'THERMAL';
}

export const EMRPrintDocument: React.FC<EMRPrintDocumentProps> = ({
  patient,
  appointment,
  doctor,
  clinic,
  settings,
  letterheadMode,
  paperSize,
}) => {
  const selectedPaperSize = paperSize || settings?.paperSize || 'A4';
  const isA5 = selectedPaperSize === 'A5';
  const isThermal = selectedPaperSize === 'THERMAL' || selectedPaperSize === 'thermal';

  const activeLetterheadMode = letterheadMode || settings?.letterheadMode || 'PLAIN_PAPER';
  const marginMm = settings?.printMarginMm !== undefined && settings?.printMarginMm !== null ? settings.printMarginMm : 10;
  const topMarginPadMm = settings?.topMarginMm !== undefined && settings?.topMarginMm !== null ? settings.topMarginMm : 35;
  
  // Section visibility flags (Hospital & Clinic policy controlled)
  const showLogo = settings?.showLogo ?? true;
  const enableQrCode = settings?.enableQrCode ?? true;
  const showVitals = settings?.showVitals ?? true;
  const showComplaints = settings?.showComplaints ?? true;
  const showDiagnosis = settings?.showDiagnosis ?? true;
  const showMedicines = settings?.showMedicines ?? true;
  const showLabTests = settings?.showLabTests ?? true;
  const showAdvice = settings?.showAdvice ?? true;
  const showFollowUp = settings?.showFollowUp ?? true;
  const showSignature = settings?.showSignature ?? true;

  // Helper Calculations
  const calculateAge = (dobString?: string) => {
    if (!dobString) return '';
    try {
      const birthDate = new Date(dobString);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age >= 0 ? `${age} Yrs` : '';
    } catch {
      return '';
    }
  };

  const patientAgeStr =
    patient?.age !== undefined && patient?.age !== null
      ? `${patient.age} Yrs`
      : calculateAge(patient?.dateOfBirth) || (patient?.gender ? 'Adult' : '—');

  // Parse structured prescription lines
  const parsePrescriptionLines = (rxText?: string) => {
    if (!rxText || !rxText.trim()) return [];
    
    // Check if JSON
    const cleanRx = rxText.trim();
    if (cleanRx.startsWith('[') || cleanRx.startsWith('{')) {
      try {
        const jsonArr = JSON.parse(cleanRx);
        if (Array.isArray(jsonArr)) {
          return jsonArr.map((m: any, idx: number) => ({
            sNo: idx + 1,
            name: m.name || (typeof m === 'string' ? m : ''),
            dosage: m.dosage || '1-0-1',
            timing: m.timing || 'After Food',
            duration: m.duration || '5 Days',
            instructions: m.instructions || '',
            raw: typeof m === 'string' ? m : m.name,
          }));
        }
      } catch {
        // fallback to lines
      }
    }

    const lines = cleanRx.split('\n').map((l) => l.trim()).filter(Boolean);

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

  const displayMedicines = parsePrescriptionLines(appointment?.prescription);

  // Format Consultation Date
  const consultDateObj = appointment?.appointmentDate
    ? new Date(
        appointment.appointmentDate.includes('T')
          ? appointment.appointmentDate
          : `${appointment.appointmentDate}T00:00:00`
      )
    : new Date();

  const formattedConsultDate = consultDateObj.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const doctorName = appointment?.doctorName || doctor?.name || 'Dr. Nikhil Saudagre';
  const doctorSpecialization = doctor?.specialization || 'Consultant Physician & Specialist';
  const doctorQualification = doctor?.qualification || 'MBBS, MD (Internal Medicine)';
  const doctorRegNumber = doctor?.registrationNumber || 'MMC-2018-99482';
  const doctorRoom = doctor?.roomNumber ? `OPD Room ${doctor.roomNumber}` : 'Chamber 102';

  const refCode = appointment?.id
    ? `RX-${appointment.id.slice(0, 8).toUpperCase()}`
    : 'RX-2026-0842';

  return (
    <div
      id="printable-emr-document"
      className="bg-white text-slate-900 mx-auto font-sans text-[12px] leading-relaxed select-text shadow-xl border border-slate-200 print:border-0 print:shadow-none print:m-0 print:w-full print:max-w-none box-border flex flex-col justify-between"
      style={{
        width: '100%',
        maxWidth: isThermal ? '80mm' : isA5 ? '148mm' : '210mm',
        minHeight: isThermal ? 'auto' : isA5 ? '210mm' : '297mm',
        padding: isThermal ? '4mm' : `${marginMm}mm`,
      }}
    >
      <div>
        {/* ========================================================================= */}
        {/* 1. CLINIC & DOCTOR LETTERHEAD HEADER */}
        {/* ========================================================================= */}
        {activeLetterheadMode === 'PLAIN_PAPER' ? (
          <div className="border-b border-slate-300 pb-3 mb-3">
            <div className="flex justify-between items-start gap-4">
              {/* Left: Clinic Details */}
              <div className="flex items-start gap-3 min-w-0 flex-1">
                {showLogo && clinic?.logoUrl ? (
                  <img
                    src={clinic.logoUrl}
                    alt="Clinic Logo"
                    className="w-12 h-12 object-contain rounded border border-slate-200 p-0.5 shrink-0"
                  />
                ) : null}
                <div className="min-w-0">
                  <h1 className="text-base font-extrabold text-slate-900 uppercase tracking-tight">
                    {clinic?.name || 'NISSCHAY MULTISPECIALITY HEALTHCARE'}
                  </h1>
                  {settings?.headerText ? (
                    <p className="text-[11px] text-slate-600 font-medium">{settings.headerText}</p>
                  ) : clinic?.tagline ? (
                    <p className="text-[11px] text-slate-600 italic">{clinic.tagline}</p>
                  ) : null}
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {[clinic?.address, clinic?.city, clinic?.state, clinic?.pincode]
                      .filter(Boolean)
                      .join(', ') || 'Plot 42, Medical Enclave, Pune, Maharashtra 411001'}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Ph: {clinic?.phone || clinic?.emergencyPhone || '+91 9876543210'}
                    {clinic?.email ? ` | ${clinic.email}` : ''}
                  </p>
                </div>
              </div>

              {/* Right: Doctor Credentials */}
              <div className="text-right shrink-0">
                <h2 className="text-sm font-extrabold text-slate-900">Dr. {doctorName}</h2>
                <p className="text-[11px] font-semibold text-slate-700">{doctorQualification}</p>
                <p className="text-[11px] text-slate-600">{doctorSpecialization}</p>
                <p className="text-[10px] text-slate-600 font-mono mt-0.5">
                  Reg. No: <strong>{doctorRegNumber}</strong>
                </p>
                <p className="text-[10px] text-slate-500">{doctorRoom}</p>
              </div>
            </div>
          </div>
        ) : (
          /* Pre-printed stationery pad mode: Clean blank margin with alignment marker */
          <div style={{ height: `${topMarginPadMm}mm` }} className="border-b border-dashed border-slate-300 mb-3 flex items-end justify-center pb-1">
            <span className="text-[9px] text-slate-400 font-mono italic print:hidden">
              [Pre-printed Letterhead Top Clearance ({topMarginPadMm}mm)]
            </span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. PATIENT DEMOGRAPHICS & VITALS ROW */}
        {/* ========================================================================= */}
        <div className="border-b border-slate-300 pb-2 mb-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Patient Name</span>
              <strong className="text-slate-900 font-bold">{patient?.name || 'Rahul Sharma'}</strong>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Age / Gender</span>
              <span className="text-slate-900 font-medium">
                {[patientAgeStr, patient?.gender || 'Male'].filter(Boolean).join(' / ')}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">UHID / IPD No</span>
              <span className="text-slate-900 font-mono font-medium">
                {patient?.id ? `UHID-${patient.id.slice(0, 6).toUpperCase()}` : 'UHID-100482'}
              </span>
            </div>

            <div className="text-right sm:text-left">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Date & Rx ID</span>
              <span className="text-slate-900 font-medium">
                {formattedConsultDate} ({refCode})
              </span>
            </div>
          </div>

          {/* Vitals Line (Modular Toggle) */}
          {showVitals && (
            <div className="flex items-center gap-4 text-[11px] text-slate-700 mt-1.5 pt-1.5 border-t border-slate-100 flex-wrap">
              <span>
                BP: <strong>{appointment?.bpSystolic ? `${appointment.bpSystolic}/${appointment.bpDiastolic || 80}` : '120/80'} mmHg</strong>
              </span>
              <span>
                Pulse: <strong>{appointment?.pulse || 74} bpm</strong>
              </span>
              <span>
                Temp: <strong>{appointment?.temperature || 98.4} °F</strong>
              </span>
              <span>
                SpO2: <strong>{appointment?.spo2 || 99} %</strong>
              </span>
              <span>
                Weight: <strong>{appointment?.weight || patient?.weightKg || 68} kg</strong>
              </span>
              {patient?.bloodGroup && (
                <span>
                  Blood Group: <strong>{patient.bloodGroup}</strong>
                </span>
              )}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 3. CLINICAL DIAGNOSIS & CHIEF COMPLAINTS */}
        {/* ========================================================================= */}
        {(showComplaints || showDiagnosis) && (appointment?.symptoms || appointment?.diagnosis || appointment?.reason) && (
          <div className="space-y-1.5 text-xs mb-3 pb-2 border-b border-slate-200">
            {showComplaints && (appointment?.symptoms || appointment?.reason) && (
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide w-28 shrink-0">
                  Chief Complaints:
                </span>
                <span className="text-slate-900 font-medium">
                  {appointment?.symptoms || appointment?.reason}
                </span>
              </div>
            )}

            {showDiagnosis && appointment?.diagnosis && (
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide w-28 shrink-0">
                  Diagnosis:
                </span>
                <strong className="text-slate-950 font-bold">
                  {appointment.diagnosis}
                </strong>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. ℞ MEDICATIONS TABLE */}
        {/* ========================================================================= */}
        {showMedicines && (
          <div className="mb-4">
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-1 mb-1.5">
              <span className="text-sm font-black text-slate-900 font-serif italic tracking-wide">
                ℞ (Prescription)
              </span>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">
                Dosage: Morning - Afternoon - Night
              </span>
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-300 text-slate-600 text-[11px]">
                  <th className="py-1 px-1 font-bold text-center w-8">#</th>
                  <th className="py-1 px-2 font-bold">Medicine Name & Formulation</th>
                  <th className="py-1 px-2 font-bold text-center w-28">Dosage (M-A-N)</th>
                  <th className="py-1 px-2 font-bold text-center w-24">Timing</th>
                  <th className="py-1 px-2 font-bold text-center w-20">Duration</th>
                  <th className="py-1 px-2 font-bold text-left">Special Instructions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {displayMedicines.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-5 text-center text-slate-400 italic text-[11px]">
                      No prescription medications recorded for this consultation.
                    </td>
                  </tr>
                ) : (
                  displayMedicines.map((med, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2 px-1 text-center text-slate-500 font-mono">{idx + 1}</td>
                      <td className="py-2 px-2 font-bold text-slate-900">
                        <span>{med.name}</span>
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-semibold text-slate-800">
                        {med.dosage}
                      </td>
                      <td className="py-2 px-2 text-center text-slate-700">{med.timing}</td>
                      <td className="py-2 px-2 text-center text-slate-700 font-medium">
                        {med.duration}
                      </td>
                      <td className="py-2 px-2 text-slate-600 text-[11px] italic">
                        {med.instructions || 'As directed'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. CLINICAL ADVICE, TESTS & FOLLOW-UP */}
        {/* ========================================================================= */}
        {(showAdvice || showFollowUp) && (appointment?.notes || settings?.defaultAdvice || appointment?.followUpDate) && (
          <div className="space-y-2 text-xs border-t border-slate-200 pt-2.5 mb-4">
            {showAdvice && (appointment?.notes || settings?.defaultAdvice) && (
              <div>
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-0.5">
                  Advice & Dietary Guidelines:
                </span>
                <p className="text-slate-800 leading-relaxed whitespace-pre-line">
                  {appointment?.notes || settings?.defaultAdvice}
                </p>
              </div>
            )}

            {showFollowUp && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  Next Review / Follow-Up:
                </span>
                <strong className="text-slate-900">
                  {appointment?.followUpDate
                    ? new Date(appointment.followUpDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'As needed (SOS)'}
                </strong>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 6. MINIMAL FOOTER & SIGNATURE SECTION */}
      {/* ========================================================================= */}
      <div className="border-t border-slate-300 pt-3 mt-auto">
        <div className="flex justify-between items-end gap-4 text-[11px] text-slate-600">
          {/* QR Verification Code */}
          <div className="flex items-center gap-2.5">
            {enableQrCode ? (
              <div className="w-10 h-10 border border-slate-300 p-0.5 rounded flex items-center justify-center bg-white">
                <QrCode className="w-8 h-8 text-slate-800" />
              </div>
            ) : null}
            <div className="text-[10px] leading-tight space-y-0.5">
              <span className="font-semibold text-slate-700 block">
                {settings?.footerText || 'Emergency 24x7 Helpline: ' + (clinic?.emergencyPhone || '+91 9876543210')}
              </span>
              <span className="text-slate-500 block">
                * Electronically generated prescription. NMC / State Medical Council valid.
              </span>
            </div>
          </div>

          {/* Doctor Signature Block */}
          {showSignature && (
            <div className="text-right shrink-0">
              <div className="h-10 flex items-end justify-end">
                {settings?.digitalSignatureUrl || doctor?.digitalSignature ? (
                  <img
                    src={settings?.digitalSignatureUrl || doctor?.digitalSignature}
                    alt="Doctor Signature"
                    className="max-h-8 object-contain"
                  />
                ) : null}
              </div>
              <div className="border-t border-slate-400 pt-1 w-40 text-center">
                <span className="text-[10px] font-bold text-slate-900 block">
                  Dr. {doctorName}
                </span>
                <span className="text-[9px] text-slate-500 block">
                  Reg: {doctorRegNumber}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
