'use client';

import React, { useState } from 'react';
import { Clinic, Doctor, Patient, PrescriptionSettings } from '@/types';
import { EMRPrintDocument } from '@/components/emr-print-document';
import { InvoicePrintDocument } from '@/components/invoice-print-document';
import { DischargeSummaryPrintDocument } from '@/components/discharge-summary-print-document';
import { ConsultationReportPrintDocument } from '@/components/consultation-report-print-document';
import { MedicalCertificatePrintDocument } from '@/components/medical-certificate-print-document';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Receipt,
  Printer,
  X,
  Hospital,
  Stethoscope,
  Award,
  Layers
} from 'lucide-react';

export type SupportedDocType =
  | 'PRESCRIPTION'
  | 'DISCHARGE_SUMMARY'
  | 'CONSULTATION_REPORT'
  | 'MEDICAL_CERTIFICATE'
  | 'INVOICE';

export interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDocType?: SupportedDocType;
  clinic?: Partial<Clinic> | null;
  doctor?: Partial<Doctor> | null;
  settings?: Partial<PrescriptionSettings> | null;
  patient?: Partial<Patient> | null;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  defaultDocType = 'PRESCRIPTION',
  clinic,
  doctor,
  settings,
  patient,
}) => {
  const [docType, setDocType] = useState<SupportedDocType>(defaultDocType);
  const [letterheadMode, setLetterheadMode] = useState<'PLAIN_PAPER' | 'PREPRINTED_PAD'>('PLAIN_PAPER');
  const [paperSize, setPaperSize] = useState<'A4' | 'A5'>('A4');

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const DOC_TABS: Array<{ id: SupportedDocType; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'PRESCRIPTION', label: 'Prescription (Rx)', icon: FileText },
    { id: 'DISCHARGE_SUMMARY', label: 'Discharge Summary', icon: Hospital },
    { id: 'CONSULTATION_REPORT', label: 'Consultation Report', icon: Stethoscope },
    { id: 'MEDICAL_CERTIFICATE', label: 'Medical Certificate', icon: Award },
    { id: 'INVOICE', label: 'Tax Invoice / Bill', icon: Receipt },
  ];

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-1 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#F6F9FB] w-full max-w-5xl h-full max-h-[96vh] sm:max-h-[95vh] rounded-2xl border border-slate-300 shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Top Control Bar */}
        <div className="p-3 sm:p-4 bg-white border-b border-slate-200 flex flex-col gap-2.5 shrink-0">
          {/* Top Row: Switcher & Close Button */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto">
            {/* Multi-Doc Type Switcher Tabs */}
            <div className="flex items-center gap-1 bg-[#F6F9FB] p-1 rounded-xl border border-slate-200 shrink-0 overflow-x-auto custom-scrollbar">
              {DOC_TABS.map((tab) => {
                const IconComponent = tab.icon;
                const isActive = docType === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDocType(tab.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-[#087F8C] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer shrink-0 ml-auto"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Bottom Row: Paper & Print Controls */}
          <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
            {/* Letterhead Mode */}
            <div className="flex items-center text-xs font-semibold text-slate-700 bg-[#F6F9FB] px-2 py-1 rounded-xl border border-slate-200 gap-1">
              <span className="text-[10px] text-slate-500 font-bold hidden xs:inline">Mode:</span>
              <button
                type="button"
                onClick={() => setLetterheadMode('PLAIN_PAPER')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                  letterheadMode === 'PLAIN_PAPER' ? 'bg-white text-[#087F8C] shadow-2xs' : 'text-slate-500'
                }`}
              >
                Digital Header
              </button>
              <button
                type="button"
                onClick={() => setLetterheadMode('PREPRINTED_PAD')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                  letterheadMode === 'PREPRINTED_PAD' ? 'bg-white text-[#087F8C] shadow-2xs' : 'text-slate-500'
                }`}
              >
                Doctor Pad
              </button>
            </div>

            {/* Paper Size */}
            <div className="flex items-center text-xs font-semibold text-slate-700 bg-[#F6F9FB] px-2 py-1 rounded-xl border border-slate-200 gap-1">
              <button
                type="button"
                onClick={() => setPaperSize('A4')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                  paperSize === 'A4' ? 'bg-white text-[#087F8C] shadow-2xs' : 'text-slate-500'
                }`}
              >
                A4
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('A5')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                  paperSize === 'A5' ? 'bg-white text-[#087F8C] shadow-2xs' : 'text-slate-500'
                }`}
              >
                A5
              </button>
            </div>

            {/* Print Action */}
            <Button
              type="button"
              onClick={handlePrint}
              className="bg-[#172B34] hover:bg-[#101e25] text-white rounded-xl text-xs font-bold h-8 px-3.5 flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 ml-auto sm:ml-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </Button>
          </div>
        </div>

        {/* Scrollable Document Render Area */}
        <div className="flex-1 overflow-y-auto overflow-x-auto p-2 sm:p-6 bg-slate-200/60 custom-scrollbar">
          <div className="min-w-fit w-full flex justify-center py-2">
            {docType === 'PRESCRIPTION' && (
              <EMRPrintDocument
                clinic={clinic}
                doctor={doctor}
                settings={settings}
                letterheadMode={letterheadMode}
                paperSize={paperSize}
              />
            )}

            {docType === 'DISCHARGE_SUMMARY' && (
              <DischargeSummaryPrintDocument
                clinic={clinic}
                doctor={doctor}
                settings={settings}
                patient={patient}
                letterheadMode={letterheadMode}
                paperSize={paperSize}
              />
            )}

            {docType === 'CONSULTATION_REPORT' && (
              <ConsultationReportPrintDocument
                clinic={clinic}
                doctor={doctor}
                settings={settings}
                patient={patient}
                letterheadMode={letterheadMode}
                paperSize={paperSize}
              />
            )}

            {docType === 'MEDICAL_CERTIFICATE' && (
              <MedicalCertificatePrintDocument
                clinic={clinic}
                doctor={doctor}
                settings={settings}
                patient={patient}
                letterheadMode={letterheadMode}
                paperSize={paperSize}
              />
            )}

            {docType === 'INVOICE' && (
              <InvoicePrintDocument
                clinic={clinic}
                doctor={doctor}
                letterheadMode={letterheadMode}
                paperSize={paperSize}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
