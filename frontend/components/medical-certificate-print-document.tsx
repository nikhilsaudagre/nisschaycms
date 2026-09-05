'use client';

import React from 'react';
import { Clinic, Doctor, Patient } from '@/types';

interface MedicalCertificatePrintDocumentProps {
  clinic?: Clinic | Partial<Clinic> | null;
  doctor?: Doctor | Partial<Doctor> | null;
  patient?: Patient | Partial<Patient> | { name?: string; age?: number; gender?: string; phone?: string; id?: string } | null;
  settings?: any;
  letterheadMode?: any;
  paperSize?: any;
  certificateDetails?: {
    certificateNumber?: string;
    certificateDate?: string;
    certificateType?: 'SICKNESS_REST' | 'FITNESS_RESUME' | 'BOTH';
    diagnosis?: string;
    restStartDate?: string;
    restEndDate?: string;
    totalDaysRest?: number;
    fitToResumeDate?: string;
    remarks?: string;
    consultantDoctorName?: string;
    consultantRegistrationNo?: string;
  };
}

export const MedicalCertificatePrintDocument: React.FC<MedicalCertificatePrintDocumentProps> = ({
  clinic,
  doctor,
  patient,
  certificateDetails = {
    certificateNumber: 'MC-2026-001',
    certificateDate: new Date().toISOString().split('T')[0],
    certificateType: 'BOTH',
    diagnosis: 'Medical condition under care'
  }
}) => {
  const isSickness = certificateDetails.certificateType === 'SICKNESS_REST' || certificateDetails.certificateType === 'BOTH';
  const isFitness = certificateDetails.certificateType === 'FITNESS_RESUME' || certificateDetails.certificateType === 'BOTH';

  return (
    <div className="bg-white text-slate-900 p-8 max-w-3xl mx-auto border border-slate-300 rounded-lg shadow-sm print:p-0 print:border-none print:shadow-none print:max-w-full font-serif">
      {/* Official Clinic Letterhead Header */}
      <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
        <h1 className="text-2xl font-bold uppercase tracking-wider text-slate-900 font-sans">
          {clinic?.name || 'NISSCHAY MULTI-SPECIALTY HOSPITAL & RESEARCH CENTRE'}
        </h1>
        <p className="text-xs text-slate-600 font-sans">
          {clinic?.address || 'Plot 42, Health City Avenue, Medical District'} • Phone: {clinic?.phone || '+91 98765 43210'}
        </p>
        <p className="text-[11px] text-slate-500 font-sans">
          Govt. Regd. No: MH-HOSP-2026-8942 • GSTIN: 27AAAAA0000A1Z5
        </p>
      </div>

      {/* Certificate Title Badge */}
      <div className="my-6 text-center">
        <div className="inline-block border-2 border-slate-900 px-6 py-1.5 rounded-md bg-slate-50">
          <h2 className="text-base font-bold uppercase tracking-widest text-slate-900 font-sans">
            {certificateDetails.certificateType === 'BOTH'
              ? 'MEDICAL SICKNESS & FITNESS CERTIFICATE'
              : certificateDetails.certificateType === 'FITNESS_RESUME'
              ? 'MEDICAL FITNESS CERTIFICATE'
              : 'MEDICAL SICKNESS / LEAVE CERTIFICATE'}
          </h2>
        </div>
      </div>

      {/* Meta Info: Cert No & Date */}
      <div className="flex justify-between items-center text-xs font-sans border-b border-slate-200 pb-3 mb-6">
        <div>
          <span className="text-slate-500">Certificate No: </span>
          <strong className="font-mono text-slate-900">{certificateDetails.certificateNumber}</strong>
        </div>
        <div>
          <span className="text-slate-500">Date of Issue: </span>
          <strong className="text-slate-900">{certificateDetails.certificateDate}</strong>
        </div>
      </div>

      {/* Certificate Legal Body Text */}
      <div className="space-y-6 text-sm leading-relaxed text-slate-800 text-justify">
        <p>
          This is to solemnly certify that <strong className="text-slate-950 font-bold underline underline-offset-4">{patient?.name || 'The Patient'}</strong>
          {patient?.gender ? `, a ${patient.gender.toLowerCase()} patient` : ''} 
          {patient?.age ? ` aged about ${patient.age} years` : ''}, residing at {patient && 'address' in patient && patient.address ? patient.address : 'as per hospital records'},
          has been under my professional medical care and clinical treatment at this healthcare institution.
        </p>

        <div className="p-4 bg-slate-50 border-l-4 border-slate-800 rounded-r-lg space-y-1 font-sans">
          <span className="text-[11px] uppercase font-bold text-slate-500 block">Clinical Diagnosis / Condition:</span>
          <p className="font-semibold text-slate-900 text-sm">
            {certificateDetails.diagnosis || 'Acute Inpatient Medical Illness'}
          </p>
        </div>

        {isSickness && (
          <p>
            I hereby certify that in consequence of the above-mentioned medical condition, the patient was suffering from illness and was advised absolute medical confinement and rest from work/duty for a period of{' '}
            <strong className="text-slate-950 font-bold underline underline-offset-4">
              {certificateDetails.restStartDate || certificateDetails.certificateDate}
            </strong>{' '}
            to{' '}
            <strong className="text-slate-950 font-bold underline underline-offset-4">
              {certificateDetails.restEndDate || certificateDetails.certificateDate}
            </strong>{' '}
            (inclusive).
          </p>
        )}

        {isFitness && (
          <p>
            I have carefully re-examined <strong className="text-slate-950">{patient?.name}</strong> on <strong className="font-sans">{certificateDetails.certificateDate}</strong> and certify that {patient?.gender?.toLowerCase() === 'female' ? 'she' : 'he'} has recovered satisfactorily from {patient?.gender?.toLowerCase() === 'female' ? 'her' : 'his'} illness, is now clinically asymptomatic, and is{' '}
            <strong className="text-emerald-900 bg-emerald-50 px-2 py-0.5 border border-emerald-300 rounded font-bold uppercase font-sans">
              Fit to Resume Official Duties / Studies
            </strong>{' '}
            with effect from{' '}
            <strong className="text-slate-950 font-bold underline underline-offset-4 font-sans">
              {certificateDetails.fitToResumeDate || certificateDetails.certificateDate}
            </strong>.
          </p>
        )}

        {certificateDetails.remarks && (
          <p className="text-xs text-slate-700 font-sans italic">
            <strong>Doctor's Remarks / Limitations:</strong> {certificateDetails.remarks}
          </p>
        )}
      </div>

      {/* Patient Identification Sign */}
      <div className="mt-8 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 text-xs font-sans">
        <div className="space-y-8">
          <span className="text-slate-500 block">Patient Signature / Thumb Impression:</span>
          <div className="w-48 border-b border-dashed border-slate-400"></div>
        </div>

        {/* Certifying Doctor Sign & Seal */}
        <div className="text-right space-y-1">
          <div className="h-12"></div>
          <div className="font-bold text-sm text-slate-900 font-serif">
            {certificateDetails.consultantDoctorName || doctor?.name || 'Dr. Patil, MD'}
          </div>
          <p className="text-[11px] text-slate-600">
            {doctor?.specialization || 'Chief Medical Officer / Consultant Physician'}
          </p>
          <p className="text-[11px] font-mono text-slate-500">
            Reg. No: {certificateDetails.consultantRegistrationNo || doctor?.registrationNumber || 'MMC-2018/04/1092'}
          </p>
          <div className="inline-block mt-2 px-3 py-1 border border-slate-300 rounded text-[9px] text-slate-400 uppercase tracking-widest font-sans">
            Official Seal
          </div>
        </div>
      </div>
    </div>
  );
};
