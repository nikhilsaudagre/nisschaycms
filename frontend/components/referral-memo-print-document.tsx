'use client';

import React from 'react';
import { Clinic, Doctor, Patient } from '@/types';

interface ReferralMemoPrintDocumentProps {
  clinic?: Clinic | null;
  doctor?: Doctor | null;
  patient?: Patient | { name: string; age?: number; gender?: string; phone?: string; id?: string };
  referralDetails: {
    memoNumber: string;
    memoDate: string;
    destinationHospital: string;
    destinationDepartment?: string;
    reasonForReferral: string;
    provisionalDiagnosis: string;
    clinicalSummaryAndInterventions: string;
    currentVitalsAtTransfer?: string;
    accompanyingStaff?: string;
    transportMode?: string;
    referringDoctorName: string;
  };
}

export const ReferralMemoPrintDocument: React.FC<ReferralMemoPrintDocumentProps> = ({
  clinic,
  doctor,
  patient,
  referralDetails
}) => {
  return (
    <div className="bg-white text-slate-900 p-8 max-w-3xl mx-auto border border-slate-300 rounded-lg shadow-sm print:p-0 print:border-none print:shadow-none print:max-w-full font-serif">
      {/* Official Letterhead Header */}
      <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
        <h1 className="text-2xl font-bold uppercase tracking-wider text-slate-900 font-sans">
          {clinic?.name || 'NISSCHAY MULTI-SPECIALTY HOSPITAL & RESEARCH CENTRE'}
        </h1>
        <p className="text-xs text-slate-600 font-sans">
          {clinic?.address || 'Plot 42, Health City Avenue, Medical District'} • 24x7 Emergency Helpline: {clinic?.phone || '+91 98765 43210'}
        </p>
      </div>

      {/* Title Badge */}
      <div className="my-6 text-center">
        <div className="inline-block border-2 border-rose-900 bg-rose-50 px-6 py-1.5 rounded-md">
          <h2 className="text-base font-bold uppercase tracking-widest text-rose-900 font-sans">
            INTER-HOSPITAL CLINICAL REFERRAL & TRANSFER MEMO
          </h2>
          <span className="text-[10px] text-rose-700 font-sans block uppercase font-semibold">Priority Medical Handover</span>
        </div>
      </div>

      {/* Meta Info */}
      <div className="flex justify-between items-center text-xs font-sans border-b border-slate-200 pb-3 mb-6">
        <div>
          <span className="text-slate-500">Referral Memo No: </span>
          <strong className="font-mono text-slate-900">{referralDetails.memoNumber}</strong>
        </div>
        <div>
          <span className="text-slate-500">Transfer Time: </span>
          <strong className="text-slate-900">{referralDetails.memoDate}</strong>
        </div>
      </div>

      {/* Recipient Header */}
      <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg font-sans text-xs space-y-1 mb-6">
        <span className="text-slate-500 font-bold uppercase text-[10px]">Referred To:</span>
        <h3 className="text-sm font-bold text-slate-900 uppercase">
          The Medical Superintendent / Attending Consultant,
        </h3>
        <p className="font-semibold text-slate-800 text-xs">{referralDetails.destinationHospital}</p>
        {referralDetails.destinationDepartment && (
          <p className="text-slate-600 text-[11px]">Dept: {referralDetails.destinationDepartment}</p>
        )}
      </div>

      {/* Patient Clinical Profile */}
      <div className="space-y-4 text-xs font-sans leading-relaxed text-slate-800">
        <div className="grid grid-cols-3 gap-3 p-3 bg-slate-100 rounded-lg">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Patient Name:</span>
            <strong className="text-slate-900 text-xs">{patient?.name}</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Age / Gender:</span>
            <strong className="text-slate-900 text-xs">{patient?.age || '42'}Y / {patient?.gender || 'Male'}</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">UHID:</span>
            <strong className="font-mono text-slate-900 text-xs">{patient?.id ? `UHID-${patient.id.substring(0, 8).toUpperCase()}` : 'UHID-2026-9042'}</strong>
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-slate-600 block text-[10px] uppercase font-bold">Provisional / Confirmed Diagnosis:</span>
          <div className="p-2.5 bg-rose-50/60 border border-rose-200 rounded font-semibold text-rose-950 text-xs">
            {referralDetails.provisionalDiagnosis}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-slate-600 block text-[10px] uppercase font-bold">Reason for Referral / Escalation:</span>
          <p className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-900 text-xs">
            {referralDetails.reasonForReferral || 'Requires advanced tertiary ICU care, specialized intervention, or cardiac catheterization facility.'}
          </p>
        </div>

        <div className="space-y-1">
          <span className="text-slate-600 block text-[10px] uppercase font-bold">Clinical Course & Emergency Treatment Given:</span>
          <p className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-900 text-xs leading-normal">
            {referralDetails.clinicalSummaryAndInterventions || 'IV access secured, oxygen support maintained, empirical medical stabilization initiated prior to transit.'}
          </p>
        </div>

        {/* Vitals at Transfer */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/60 border border-amber-200 rounded-lg">
          <div>
            <span className="text-amber-900 block text-[10px] uppercase font-bold">Vitals at Departure:</span>
            <p className="text-amber-950 font-mono font-semibold text-xs mt-0.5">
              {referralDetails.currentVitalsAtTransfer || 'BP: 118/76 mmHg • HR: 82 bpm • SpO2: 98% on room air • GCS: 15/15'}
            </p>
          </div>
          <div>
            <span className="text-amber-900 block text-[10px] uppercase font-bold">Transport & Accompanying Staff:</span>
            <p className="text-amber-950 text-xs mt-0.5">
              {referralDetails.transportMode || 'Cardiac ALS Ambulance'} • {referralDetails.accompanyingStaff || 'Trained Paramedic / Nursing Staff'}
            </p>
          </div>
        </div>
      </div>

      {/* Signature Box */}
      <div className="mt-8 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 text-xs font-sans">
        <div className="space-y-8">
          <span className="text-slate-500 block">Ambulance Staff / Escort Signature:</span>
          <div className="w-48 border-b border-dashed border-slate-400"></div>
        </div>

        <div className="text-right space-y-1">
          <div className="h-10"></div>
          <div className="font-bold text-sm text-slate-900 font-serif">
            {referralDetails.referringDoctorName || doctor?.name || 'Dr. Patil, MD'}
          </div>
          <p className="text-[11px] text-slate-600">
            Treating Consultant / Medical Officer
          </p>
          <div className="inline-block mt-2 px-3 py-1 border border-slate-300 rounded text-[9px] text-slate-400 uppercase tracking-widest font-sans">
            Hospital Seal
          </div>
        </div>
      </div>
    </div>
  );
};
