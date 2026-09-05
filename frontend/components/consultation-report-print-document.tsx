'use client';

import React from 'react';
import { Clinic, Doctor, Patient, PrescriptionSettings } from '@/types';
import { Stethoscope, Activity, FileText, CheckCircle2, QrCode } from 'lucide-react';

export interface ConsultationReportPrintDocumentProps {
  clinic?: Partial<Clinic> | null;
  doctor?: Partial<Doctor> | null;
  settings?: Partial<PrescriptionSettings> | null;
  patient?: Partial<Patient> | null;
  consultationDetails?: {
    visitDate?: string;
    visitTime?: string;
    visitType?: 'OPD_CONSULTATION' | 'FOLLOW_UP' | 'SPECIALIST_OPINION' | 'EMERGENCY';
    chiefComplaints?: string;
    historyOfPresentIllness?: string;
    vitals?: {
      bp?: string;
      pulse?: string;
      temp?: string;
      spo2?: string;
      weight?: string;
      bmi?: string;
    };
    systemicExamination?: string;
    clinicalImpression?: string;
    investigationsOrdered?: string;
    treatmentPlan?: string;
    specialistReferralNotes?: string;
    followUpDate?: string;
  };
  letterheadMode?: 'PLAIN_PAPER' | 'PREPRINTED_PAD';
  paperSize?: 'A4' | 'A5';
}

export const ConsultationReportPrintDocument: React.FC<ConsultationReportPrintDocumentProps> = ({
  clinic,
  doctor,
  settings,
  patient,
  consultationDetails,
  letterheadMode = 'PLAIN_PAPER',
  paperSize = 'A4',
}) => {
  const isPreprinted = letterheadMode === 'PREPRINTED_PAD';
  const topPadMargin = settings?.topMarginMm ? `${settings.topMarginMm}mm` : '35mm';

  const defaultPatient = {
    name: patient?.name || 'Anita Sharma',
    age: patient?.age || 34,
    gender: patient?.gender || 'FEMALE',
    phone: patient?.phone || '+91 98765 43210',
    uhid: patient?.id ? `UHID-${patient.id.slice(0, 8)}` : 'UHID-2026-7712',
    visitDate: consultationDetails?.visitDate || '28 Aug 2026',
    visitTime: consultationDetails?.visitTime || '11:15 AM',
    visitType: consultationDetails?.visitType || 'OPD_CONSULTATION',
    chiefComplaints: consultationDetails?.chiefComplaints || 'Persistent dry cough, exertional shortness of breath for 10 days, accompanied by low grade evening fever.',
    historyOfPresentIllness: consultationDetails?.historyOfPresentIllness || 'Patient was in normal health until 10 days ago when she developed upper respiratory infection symptoms with productive mucoid sputum. No history of wheezing or chest pain.',
    vitals: consultationDetails?.vitals || {
      bp: '120/80 mmHg',
      pulse: '76 bpm',
      temp: '98.6 °F',
      spo2: '99%',
      weight: '62 kg',
      bmi: '22.8 kg/m²',
    },
    systemicExamination: consultationDetails?.systemicExamination || 'Chest: Bilateral vesicular breath sounds heard, mild bilateral rhonchi on forced expiration. CVS: S1 S2 normal, no murmurs. Abdomen: Soft, non-tender, no organomegaly.',
    clinicalImpression: consultationDetails?.clinicalImpression || 'Acute Bronchitis (J20.9) with mild reactive airway disease',
    investigationsOrdered: consultationDetails?.investigationsOrdered || 'Chest X-Ray PA View, Complete Blood Count (CBC) with Absolute Eosinophil Count, Serum IgE.',
    treatmentPlan: consultationDetails?.treatmentPlan || 'Nebulization SOS, oral bronchodilator with inhaled corticosteroid (Budesonide 200mcg MDI twice daily), steam inhalation, hydration.',
    specialistReferralNotes: consultationDetails?.specialistReferralNotes || 'Follow-up with Chest X-Ray report in 5 days. Referred to Pulmonologist if nocturnal cough persists.',
    followUpDate: consultationDetails?.followUpDate || '02 Sep 2026 at 10:00 AM',
  };

  const docName = doctor?.name || 'Dr. Nisschay Patil';
  const docSpec = doctor?.specialization || 'MBBS, MD - Consultant Physician';
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
      {/* 1. Header */}
      {!isPreprinted && (
        <div className="pb-4 border-b-2 border-[#172B34] flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              {clinic?.logoUrl ? (
                <img src={clinic.logoUrl} alt="Logo" className="w-11 h-11 object-contain rounded-lg border border-slate-200" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-[#087F8C] text-white flex items-center justify-center font-black text-base">
                  {clinic?.name?.charAt(0) || 'N'}
                </div>
              )}
              <div>
                <h1 className="text-lg font-black text-[#172B34] tracking-tight leading-tight">
                  {clinic?.name || 'NISSCHAY HEALTHCARE & SPECIALITY CLINIC'}
                </h1>
                <p className="text-[11px] font-semibold text-[#087F8C]">
                  {clinic?.tagline || 'Excellence in Comprehensive Outpatient Care'}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-slate-600 leading-tight">
              {clinic?.address || 'Plot 42, Central Medical Plaza'}, {clinic?.city || 'Pune'} - {clinic?.pincode || '411001'} | Phone: {clinic?.phone || '+91 98765 00000'}
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="inline-block px-3 py-1 bg-[#087F8C] text-white font-extrabold text-[11px] tracking-wider uppercase rounded-md shadow-xs">
              {settings?.consultationReportTitle || 'Consultation Report'}
            </span>
            <p className="text-[10px] text-slate-500 font-semibold mt-1">OPD Clinical Summary</p>
          </div>
        </div>
      )}

      {isPreprinted && (
        <div className="text-center pb-3 border-b-2 border-slate-800">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
            {settings?.consultationReportTitle || 'Clinical Consultation & Medical Encounter Report'}
          </h2>
        </div>
      )}

      {/* 2. Patient Demographics & Encounter Info */}
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
          <span className="text-[9px] font-bold text-slate-500 uppercase block">Consulting Doctor</span>
          <strong className="text-[#087F8C]">{docName}</strong>
        </div>
        <div>
          <span className="text-[9px] font-bold text-slate-500 uppercase block">Visit Date & Time</span>
          <span className="font-semibold text-slate-800">{defaultPatient.visitDate} • {defaultPatient.visitTime}</span>
        </div>
      </div>

      {/* 3. Vitals Strip */}
      {(settings?.consultationShowVitals ?? true) && (
        <div className="p-2.5 bg-[#F6F9FB] rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-[11px]">
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase block">Blood Pressure</span>
            <strong className="text-slate-900">{defaultPatient.vitals.bp}</strong>
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase block">Pulse / Heart Rate</span>
            <strong className="text-slate-900">{defaultPatient.vitals.pulse}</strong>
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase block">Temperature</span>
            <strong className="text-slate-900">{defaultPatient.vitals.temp}</strong>
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase block">Oxygen SpO2</span>
            <strong className="text-slate-900">{defaultPatient.vitals.spo2}</strong>
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase block">Body Weight & BMI</span>
            <strong className="text-slate-900">{defaultPatient.vitals.weight} ({defaultPatient.vitals.bmi})</strong>
          </div>
        </div>
      )}

      {/* 4. Clinical Details */}
      <div className="space-y-3 mt-3">
        {/* Chief Complaints */}
        <div className="space-y-0.5">
          <h3 className="text-[10px] font-black text-[#172B34] uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-0.5">
            <Activity className="w-3 h-3 text-[#087F8C]" />
            <span>Chief Complaints</span>
          </h3>
          <p className="text-slate-800 font-medium text-[11px] leading-relaxed pl-1">
            {defaultPatient.chiefComplaints}
          </p>
        </div>

        {/* History of Present Illness */}
        <div className="space-y-0.5">
          <h3 className="text-[10px] font-black text-[#172B34] uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-0.5">
            <FileText className="w-3 h-3 text-[#087F8C]" />
            <span>History of Present Illness (HPI)</span>
          </h3>
          <p className="text-slate-800 font-medium text-[11px] leading-relaxed pl-1">
            {defaultPatient.historyOfPresentIllness}
          </p>
        </div>

        {/* Systemic Examination */}
        {(settings?.consultationShowSystemicExam ?? true) && (
          <div className="space-y-0.5">
            <h3 className="text-[10px] font-black text-[#172B34] uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-0.5">
              <Stethoscope className="w-3 h-3 text-[#087F8C]" />
              <span>Systemic & Physical Examination</span>
            </h3>
            <p className="text-slate-800 font-medium text-[11px] leading-relaxed pl-1">
              {defaultPatient.systemicExamination}
            </p>
          </div>
        )}

        {/* Clinical Impression & Diagnosis */}
        <div className="p-2.5 bg-teal-50/70 border border-teal-200 rounded-lg">
          <span className="text-[10px] font-black text-teal-900 uppercase tracking-wider mr-2">Clinical Diagnosis:</span>
          <strong className="text-xs text-slate-900 font-extrabold">{defaultPatient.clinicalImpression}</strong>
        </div>

        {/* Diagnostic Tests Ordered */}
        {(settings?.consultationShowInvestigations ?? true) && (
          <div className="space-y-0.5">
            <h3 className="text-[10px] font-black text-[#172B34] uppercase tracking-wider border-b border-slate-200 pb-0.5">
              Recommended Diagnostic Tests / Investigations
            </h3>
            <p className="text-slate-800 font-medium text-[11px] leading-relaxed pl-1 font-mono text-[10px]">
              {defaultPatient.investigationsOrdered}
            </p>
          </div>
        )}

        {/* Treatment Plan & Specialist Advice */}
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
          <h4 className="text-[10px] font-black text-[#172B34] uppercase tracking-wider">
            Management Protocol & Advice:
          </h4>
          <p className="text-slate-800 font-medium text-[11px] leading-relaxed">
            {defaultPatient.treatmentPlan}
          </p>
          {(settings?.consultationShowReferralNotes ?? true) && defaultPatient.specialistReferralNotes && (
            <p className="text-[10px] text-slate-600 font-semibold pt-1">
              <strong>Referral / Next Steps:</strong> {defaultPatient.specialistReferralNotes}
            </p>
          )}
        </div>

        {/* Follow-up */}
        <div className="p-2 bg-blue-50/60 border border-blue-200 rounded-lg text-[11px] flex items-center justify-between">
          <span><strong>Next Review / Follow-up:</strong> {defaultPatient.followUpDate}</span>
          <span className="text-[10px] text-blue-700 font-bold">
            {settings?.defaultConsultationDisclaimer || 'Please bring this report & test results on next visit'}
          </span>
        </div>
      </div>

      {/* 5. Footer & Signature */}
      <div className="mt-8 pt-4 border-t border-slate-300 flex items-end justify-between gap-4 text-[11px]">
        <div className="space-y-0.5 text-[10px] text-slate-500">
          <p>Electronically generated clinical report via Nisschay CMS EMR System.</p>
          <p>Report Date: {defaultPatient.visitDate} | Valid for Medical Records & Insurance</p>
        </div>

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
