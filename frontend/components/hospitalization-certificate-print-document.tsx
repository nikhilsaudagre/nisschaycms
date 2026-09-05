'use client';

import React from 'react';
import { Clinic, Doctor, Patient } from '@/types';

interface HospitalizationCertificatePrintDocumentProps {
  clinic?: Clinic | null;
  doctor?: Doctor | null;
  patient?: Patient | { name: string; age?: number; gender?: string; phone?: string; id?: string };
  stayDetails: {
    certificateNumber: string;
    certificateDate: string;
    ipdNumber: string;
    uhid: string;
    admissionDateTime: string;
    dischargeDateTime: string;
    wardRoomBed: string;
    treatingDoctor: string;
    diagnosis: string;
    purpose?: string;
    remarks?: string;
  };
}

export const HospitalizationCertificatePrintDocument: React.FC<HospitalizationCertificatePrintDocumentProps> = ({
  clinic,
  doctor,
  patient,
  stayDetails
}) => {
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
          Govt. Regd. No: MH-HOSP-2026-8942 • NABH Accredited Healthcare Institution
        </p>
      </div>

      {/* Title Badge */}
      <div className="my-6 text-center">
        <div className="inline-block border-2 border-slate-900 px-6 py-1.5 rounded-md bg-slate-50">
          <h2 className="text-base font-bold uppercase tracking-widest text-slate-900 font-sans">
            CERTIFICATE OF INPATIENT HOSPITALIZATION
          </h2>
          <span className="text-[10px] text-slate-500 font-sans block uppercase">(To Whomsoever It May Concern)</span>
        </div>
      </div>

      {/* Meta Info */}
      <div className="flex justify-between items-center text-xs font-sans border-b border-slate-200 pb-3 mb-6">
        <div>
          <span className="text-slate-500">Cert Ref: </span>
          <strong className="font-mono text-slate-900">{stayDetails.certificateNumber}</strong>
        </div>
        <div>
          <span className="text-slate-500">Date of Issue: </span>
          <strong className="text-slate-900">{stayDetails.certificateDate}</strong>
        </div>
      </div>

      {/* Certificate Body */}
      <div className="space-y-6 text-sm leading-relaxed text-slate-800 text-justify">
        <p>
          This is to formally certify that <strong className="text-slate-950 font-bold underline underline-offset-4">{patient?.name || 'The Patient'}</strong>
          {patient?.gender ? `, a ${patient.gender.toLowerCase()} patient` : ''} 
          {patient?.age ? ` aged ${patient.age} years` : ''}, bearing Hospital UHID <strong className="font-mono font-bold text-slate-900">{stayDetails.uhid}</strong>, was admitted as an indoor patient (IPD) at this hospital under IPD Registration No. <strong className="font-mono font-bold text-slate-900">{stayDetails.ipdNumber}</strong>.
        </p>

        {/* Admission Details Table */}
        <div className="bg-slate-50 border border-slate-300 rounded-lg p-4 font-sans text-xs space-y-2.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Date & Time of Admission:</span>
              <strong className="text-slate-900 text-xs font-mono">{stayDetails.admissionDateTime}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Date & Time of Discharge:</span>
              <strong className="text-slate-900 text-xs font-mono">{stayDetails.dischargeDateTime}</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Ward / Room Category:</span>
              <strong className="text-slate-900 text-xs">{stayDetails.wardRoomBed}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Treating Medical Consultant:</span>
              <strong className="text-slate-900 text-xs">{stayDetails.treatingDoctor}</strong>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Clinical Diagnosis on Record:</span>
            <strong className="text-slate-900 text-xs">{stayDetails.diagnosis}</strong>
          </div>
        </div>

        <p>
          During the aforesaid duration of hospitalization, the patient was kept under continuous clinical observation, diagnostic evaluations, nursing supervision, and medical management.
        </p>

        {stayDetails.purpose && (
          <p className="text-xs text-slate-700 font-sans italic">
            <strong>Issued for the purpose of:</strong> {stayDetails.purpose} (Mediclaim / Insurance Reimbursement / Employer Record).
          </p>
        )}
      </div>

      {/* Signatures */}
      <div className="mt-12 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 text-xs font-sans">
        <div className="space-y-8">
          <span className="text-slate-500 block">Hospital Superintendent / Admin Authority:</span>
          <div className="w-48 border-b border-dashed border-slate-400"></div>
        </div>

        <div className="text-right space-y-1">
          <div className="h-10"></div>
          <div className="font-bold text-sm text-slate-900 font-serif">
            {stayDetails.treatingDoctor || doctor?.name || 'Dr. Patil, MD'}
          </div>
          <p className="text-[11px] text-slate-600">
            Attending Inpatient Consultant
          </p>
          <div className="inline-block mt-2 px-3 py-1 border border-slate-300 rounded text-[9px] text-slate-400 uppercase tracking-widest font-sans">
            Hospital Seal
          </div>
        </div>
      </div>
    </div>
  );
};
