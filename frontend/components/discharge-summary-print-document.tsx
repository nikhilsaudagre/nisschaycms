'use client';

import React from 'react';
import { Clinic, Doctor, Patient, PrescriptionSettings } from '@/types';
import { ShieldCheck, Heart, Activity, Stethoscope, AlertTriangle } from 'lucide-react';

export interface DischargeSummaryPrintDocumentProps {
  clinic?: Partial<Clinic> | null;
  doctor?: Partial<Doctor> | null;
  settings?: Partial<PrescriptionSettings> | null;
  patient?: Partial<Patient> | null;
  admissionDetails?: {
    uhid?: string;
    ipdNumber?: string;
    admissionDateTime?: string;
    dischargeDateTime?: string;
    roomWardBed?: string;
    dischargeType?: 'NORMAL' | 'REGULAR' | 'LAMA' | 'DOR' | 'TRANSFER' | 'DAYCARE' | 'EXPIRED' | string;
    conditionAtDischarge?: string;
    chiefComplaints?: string;
    provisionalDiagnosis?: string;
    finalDiagnosis?: string;
    clinicalHistory?: string;
    hospitalCourseAndProcedures?: string;
    investigationSummary?: string;
    dischargeMedications?: Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions: string;
    }>;
    followUpDate?: string;
    emergencyWarningSigns?: string;
    dietAndActivityAdvice?: string;
  };
  letterheadMode?: 'PLAIN_PAPER' | 'PREPRINTED_PAD';
  paperSize?: 'A4' | 'A5';
}

export const DischargeSummaryPrintDocument: React.FC<DischargeSummaryPrintDocumentProps> = ({
  clinic,
  doctor,
  settings,
  patient,
  admissionDetails,
  letterheadMode = 'PLAIN_PAPER',
  paperSize = 'A4',
}) => {
  const isPreprinted = letterheadMode === 'PREPRINTED_PAD';
  const topPadMargin = settings?.topMarginMm ? `${settings.topMarginMm}mm` : '35mm';

  // Demo Fallback Data
  const defaultPatient = {
    name: patient?.name || 'Suresh Deshmukh',
    age: patient?.age || 48,
    gender: patient?.gender || 'MALE',
    phone: patient?.phone || '+91 98230 45678',
    uhid: admissionDetails?.uhid || 'UHID-2026-8842',
    ipdNumber: admissionDetails?.ipdNumber || 'IPD-9034',
    roomWardBed: admissionDetails?.roomWardBed || 'Deluxe Ward - Bed 204',
    admissionDateTime: admissionDetails?.admissionDateTime || '26 Aug 2026, 10:30 AM',
    dischargeDateTime: admissionDetails?.dischargeDateTime || '28 Aug 2026, 04:00 PM',
    dischargeType: admissionDetails?.dischargeType || 'NORMAL',
    conditionAtDischarge: admissionDetails?.conditionAtDischarge || 'Hemodynamically Stable, Afebrile, Ambulatory, Surgical site healthy.',
    chiefComplaints: admissionDetails?.chiefComplaints || 'Acute severe right lower quadrant abdominal pain for 24 hours, recurrent vomiting, and high fever (102°F).',
    provisionalDiagnosis: admissionDetails?.provisionalDiagnosis || 'Acute Appendicitis (K35.80)',
    finalDiagnosis: admissionDetails?.finalDiagnosis || 'Acute Suppurative Appendicitis (K35.89) - Post Laparoscopic Appendectomy',
    clinicalHistory: admissionDetails?.clinicalHistory || 'Patient presented with sudden onset colicky periumbilical pain shifting to right iliac fossa associated with nausea and low appetite. No past history of diabetes or hypertension.',
    hospitalCourseAndProcedures: admissionDetails?.hospitalCourseAndProcedures || 'Emergency Laparoscopic Appendectomy performed under General Anesthesia on 26 Aug 2026. Appendix was inflamed and hyperemic, safely excised and sent for histopathology. Hemostasis achieved. Post-operative period was uneventful with oral fluids started on POD-1 and normal soft diet tolerated on POD-2.',
    investigationSummary: admissionDetails?.investigationSummary || 'USG Abdomen: Inflamed, non-compressible blind-ended tubular structure measuring 8.4mm in RIF. TLC: 14,200/cumm, Hb: 13.8 g/dL, Creatinine: 0.9 mg/dL, ECG: Normal Sinus Rhythm.',
    dischargeMedications: admissionDetails?.dischargeMedications || [
      { name: 'Tab. Augmentin 625mg (Amoxicillin + Clavulanic)', dosage: '625 mg', frequency: '1-0-1 (Twice daily)', duration: '5 Days', instructions: 'After food' },
      { name: 'Tab. Pan 40 (Pantoprazole)', dosage: '40 mg', frequency: '1-0-0 (Once daily)', duration: '5 Days', instructions: 'Before breakfast' },
      { name: 'Tab. Dolo 650 (Paracetamol)', dosage: '650 mg', frequency: '1-1-1 (Thrice daily)', duration: '3 Days', instructions: 'As needed for pain' },
      { name: 'Cap. Vizylac (Pre & Probiotic)', dosage: '1 Cap', frequency: '0-0-1 (At night)', duration: '5 Days', instructions: 'After dinner' },
    ],
    followUpDate: admissionDetails?.followUpDate || '04 Sep 2026 (Friday) at OPD Chamber for suture removal and histopathology review.',
    emergencyWarningSigns: admissionDetails?.emergencyWarningSigns || 'Persistent fever above 100.5°F, severe abdominal pain, persistent vomiting, soakage/redness around laparoscopic port sites.',
    dietAndActivityAdvice: admissionDetails?.dietAndActivityAdvice || 'Light, non-spicy high fiber diet. Avoid heavy lifting (>5 kg) or strenuous exercise for 3 weeks. Normal walking encouraged.',
  };

  const docName = doctor?.name || 'Dr. Nisschay Patil';
  const docSpec = doctor?.specialization || 'Consultant General & Laparoscopic Surgeon';
  const docReg = doctor?.registrationNumber || 'MMC-2014/08/3421';

  return (
    <div
      className={`bg-white text-slate-900 shadow-xl border border-slate-300 font-sans ${
        paperSize === 'A5' ? 'w-[148mm] min-h-[210mm] p-6 text-[10px]' : 'w-[210mm] min-h-[297mm] p-8 text-xs'
      }`}
      style={{
        paddingTop: isPreprinted ? topPadMargin : undefined,
      }}
    >
      {/* 1. Header (Digital Plain Paper Mode) */}
      {!isPreprinted && (
        <div className="pb-4 border-b-2 border-[#172B34] flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              {clinic?.logoUrl ? (
                <img src={clinic.logoUrl} alt="Logo" className="w-11 h-11 object-contain rounded-lg border border-slate-200" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-[#172B34] text-white flex items-center justify-center font-black text-base">
                  {clinic?.name?.charAt(0) || 'N'}
                </div>
              )}
              <div>
                <h1 className="text-lg font-black text-[#172B34] tracking-tight leading-tight">
                  {clinic?.name || 'NISSCHAY MULTISPECIALITY HOSPITAL & SURGICAL CENTRE'}
                </h1>
                <p className="text-[11px] font-semibold text-[#087F8C]">
                  {clinic?.tagline || 'Excellence in Patient Care & NABH Accredited Healthcare'}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-slate-600 leading-tight">
              {clinic?.address || 'Plot 42, Central Medical Plaza, Station Road'}, {clinic?.city || 'Pune'} - {clinic?.pincode || '411001'}
              {clinic?.phone && ` | Emergency Phone: ${clinic.phone}`}
              {clinic?.registrationNumber && ` | Reg: ${clinic.registrationNumber}`}
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="inline-block px-3 py-1 bg-[#172B34] text-white font-extrabold text-[11px] tracking-wider uppercase rounded-md shadow-xs">
              {settings?.dischargeHeaderTitle || 'Discharge Summary'}
            </span>
            <p className="text-[10px] text-slate-500 font-semibold mt-1">IPD Medical Record</p>
          </div>
        </div>
      )}

      {/* Preprinted Pad Mode Title Banner */}
      {isPreprinted && (
        <div className="text-center pb-3 border-b-2 border-slate-800">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
            {settings?.dischargeHeaderTitle || 'Hospital Inpatient Discharge Summary'}
          </h2>
        </div>
      )}

      {/* 2. Patient Demographics & Inpatient Admission Grid */}
      <div className="my-3 p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
        <div>
          <span className="text-[9px] font-bold text-slate-500 uppercase block">Patient Name</span>
          <strong className="text-slate-950 text-xs">{defaultPatient.name}</strong>
        </div>
        <div>
          <span className="text-[9px] font-bold text-slate-500 uppercase block">Age / Gender / UHID</span>
          <span className="font-semibold text-slate-800">{defaultPatient.age} Y / {defaultPatient.gender} • {defaultPatient.uhid}</span>
        </div>
        <div>
          <span className="text-[9px] font-bold text-slate-500 uppercase block">IPD No. / Ward & Bed</span>
          <span className="font-semibold text-slate-800">{defaultPatient.ipdNumber} • {defaultPatient.roomWardBed}</span>
        </div>
        <div>
          <span className="text-[9px] font-bold text-slate-500 uppercase block">Treating Consultant</span>
          <strong className="text-[#087F8C]">{docName}</strong>
        </div>

        <div>
          <span className="text-[9px] font-bold text-slate-500 uppercase block">Admission Date & Time</span>
          <span className="font-medium text-slate-800">{defaultPatient.admissionDateTime}</span>
        </div>
        <div>
          <span className="text-[9px] font-bold text-slate-500 uppercase block">Discharge Date & Time</span>
          <span className="font-medium text-slate-800">{defaultPatient.dischargeDateTime}</span>
        </div>
        <div>
          <span className="text-[9px] font-bold text-slate-500 uppercase block">Discharge Status</span>
          <span className="inline-block px-2 py-0.5 rounded font-extrabold text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300">
            {defaultPatient.dischargeType} DISCHARGE
          </span>
        </div>
        <div>
          <span className="text-[9px] font-bold text-slate-500 uppercase block">Contact Phone</span>
          <span className="font-medium text-slate-800">{defaultPatient.phone}</span>
        </div>
      </div>

      {/* 3. Clinical Summary Sections */}
      <div className="space-y-3">
        {/* Diagnosis Strip */}
        <div className="p-2.5 bg-teal-50/70 border border-teal-200 rounded-lg space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] font-black text-teal-900 uppercase tracking-wider w-36 shrink-0">
              Final Diagnosis:
            </span>
            <strong className="text-xs text-slate-900 font-extrabold">{defaultPatient.finalDiagnosis}</strong>
          </div>
          <div className="flex items-baseline gap-2 text-[11px]">
            <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider w-36 shrink-0">
              Provisional Diagnosis:
            </span>
            <span className="text-slate-700 font-medium">{defaultPatient.provisionalDiagnosis}</span>
          </div>
        </div>

        {/* Chief Complaints */}
        <div className="space-y-0.5">
          <h3 className="text-[10px] font-black text-[#172B34] uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-0.5">
            <Activity className="w-3 h-3 text-[#087F8C]" />
            <span>Chief Complaints on Admission</span>
          </h3>
          <p className="text-slate-800 font-medium text-[11px] leading-relaxed pl-1">
            {defaultPatient.chiefComplaints}
          </p>
        </div>

        {/* Clinical History & Findings */}
        <div className="space-y-0.5">
          <h3 className="text-[10px] font-black text-[#172B34] uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-0.5">
            <Stethoscope className="w-3 h-3 text-[#087F8C]" />
            <span>Clinical History & Physical Findings</span>
          </h3>
          <p className="text-slate-800 font-medium text-[11px] leading-relaxed pl-1">
            {defaultPatient.clinicalHistory}
          </p>
        </div>

        {/* Hospital Course & Procedures Performed */}
        {(settings?.dischargeShowHospitalCourse ?? true) && (
          <div className="space-y-0.5">
            <h3 className="text-[10px] font-black text-[#172B34] uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-0.5">
              <ShieldCheck className="w-3 h-3 text-[#087F8C]" />
              <span>Hospital Course & Procedures Performed</span>
            </h3>
            <p className="text-slate-800 font-medium text-[11px] leading-relaxed pl-1">
              {defaultPatient.hospitalCourseAndProcedures}
            </p>
          </div>
        )}

        {/* Investigation Summary */}
        {(settings?.dischargeShowInvestigations ?? true) && (
          <div className="space-y-0.5">
            <h3 className="text-[10px] font-black text-[#172B34] uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-0.5">
              <span>Significant Investigations & Diagnostic Reports</span>
            </h3>
            <p className="text-slate-800 font-medium text-[11px] leading-relaxed pl-1 font-mono text-[10px]">
              {defaultPatient.investigationSummary}
            </p>
          </div>
        )}

        {/* Condition at Discharge */}
        <div className="p-2 bg-slate-100 rounded-lg border border-slate-200">
          <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mr-2">Condition on Discharge:</span>
          <strong className="text-slate-900 font-bold text-[11px]">{defaultPatient.conditionAtDischarge}</strong>
        </div>

        {/* 4. Discharge Medications (Rx to continue at home) */}
        <div className="space-y-1 pt-1">
          <h3 className="text-[10px] font-black text-[#172B34] uppercase tracking-wider border-b border-slate-200 pb-0.5">
            Discharge Medications (To Continue at Home)
          </h3>
          <table className="w-full text-left text-[11px] border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-100 font-bold text-[9px] uppercase tracking-wider text-slate-700">
              <tr>
                <th className="py-1.5 px-3">#</th>
                <th className="py-1.5 px-3">Medicine & Strength</th>
                <th className="py-1.5 px-3">Dosage & Frequency</th>
                <th className="py-1.5 px-3">Duration</th>
                <th className="py-1.5 px-3">Instructions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {defaultPatient.dischargeMedications.map((med, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60">
                  <td className="py-1 px-3 font-bold text-slate-500">{idx + 1}</td>
                  <td className="py-1 px-3 font-bold text-slate-900">{med.name}</td>
                  <td className="py-1 px-3 font-semibold text-[#087F8C]">{med.frequency}</td>
                  <td className="py-1 px-3 font-medium text-slate-800">{med.duration}</td>
                  <td className="py-1 px-3 text-slate-600">{med.instructions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 5. Follow-Up, Diet & Emergency Warning Signs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <div className="p-2.5 bg-blue-50/60 border border-blue-200 rounded-lg space-y-1 text-[11px]">
            <strong className="text-[10px] font-black text-blue-950 uppercase tracking-wider block">
              Follow-Up OPD Visit & Dressing:
            </strong>
            <p className="text-slate-800 font-semibold">{defaultPatient.followUpDate}</p>
            {(settings?.dischargeShowDietActivity ?? true) && (
              <p className="text-[10px] text-slate-600 mt-1">
                <strong>Diet & Activity:</strong> {settings?.defaultDischargeDietNotes || defaultPatient.dietAndActivityAdvice}
              </p>
            )}
          </div>

          {(settings?.dischargeShowEmergencyWarning ?? true) && (
            <div className="p-2.5 bg-rose-50/60 border border-rose-200 rounded-lg space-y-1 text-[11px]">
              <strong className="text-[10px] font-black text-rose-950 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>When to Seek Immediate Emergency Care:</span>
              </strong>
              <p className="text-rose-900 font-medium text-[10px] leading-relaxed">
                {settings?.defaultDischargeEmergencyNotes || defaultPatient.emergencyWarningSigns}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 6. Footer & Signatures */}
      <div className="mt-6 pt-4 border-t border-slate-300 flex items-end justify-between gap-4 text-[11px]">
        {(settings?.dischargeShowAttendantSignature ?? true) ? (
          <div className="space-y-1">
            <p className="text-[10px] text-slate-500">I have understood all discharge medications and warning signs.</p>
            <div className="pt-8 border-t border-dotted border-slate-400 w-48 text-center">
              <span className="text-[10px] font-bold text-slate-700">Patient / Attendant Signature</span>
            </div>
          </div>
        ) : <div />}

        <div className="text-right space-y-1">
          {doctor?.digitalSignature && (
            <img src={doctor.digitalSignature} alt="Signature" className="h-9 object-contain ml-auto" />
          )}
          <div className="pt-2 border-t border-slate-400">
            <strong className="text-slate-950 font-bold block">{docName}</strong>
            <p className="text-[10px] text-slate-600">{docSpec}</p>
            <p className="text-[10px] font-mono text-slate-500">Reg. No: {docReg}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
