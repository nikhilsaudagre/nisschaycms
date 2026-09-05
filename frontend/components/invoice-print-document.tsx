'use client';

import React from 'react';
import { Clinic, Doctor, Patient } from '@/types';
import { QrCode, CheckCircle2, ShieldCheck } from 'lucide-react';
import { formatClinicalDateTime } from '@/lib/utils';

export interface InvoiceItem {
  id?: string;
  description: string;
  hsnSacCode?: string;
  rate: number;
  quantity: number;
  discount?: number;
  taxRate?: number;
  total: number;
}

export interface InvoicePrintDocumentProps {
  invoiceNumber?: string;
  invoiceDate?: string;
  paymentStatus?: 'PAID' | 'PARTIAL' | 'PENDING';
  paymentMode?: 'CASH' | 'UPI' | 'CARD' | 'NET_BANKING' | 'INSURANCE';
  transactionRef?: string;
  clinic?: Partial<Clinic> | null;
  doctor?: Partial<Doctor> | null;
  patient?: Partial<Patient> | null;
  items?: InvoiceItem[];
  subtotal?: number;
  discountTotal?: number;
  taxTotal?: number;
  grandTotal?: number;
  notes?: string;
  paperSize?: 'A4' | 'A5';
  letterheadMode?: 'PLAIN_PAPER' | 'PREPRINTED_PAD';
}

export const InvoicePrintDocument: React.FC<InvoicePrintDocumentProps> = ({
  invoiceNumber = 'INV-2026-0042',
  invoiceDate,
  paymentStatus = 'PAID',
  paymentMode = 'UPI',
  transactionRef = 'UPI/482910482918',
  clinic,
  doctor,
  patient,
  items,
  subtotal,
  discountTotal = 0,
  taxTotal = 0,
  grandTotal,
  notes,
  paperSize = 'A4',
  letterheadMode = 'PLAIN_PAPER',
}) => {
  // Sample fallback items if none provided
  const sampleItems: InvoiceItem[] = [
    {
      description: 'General OPD Consultation (Dr. ' + (doctor?.name || 'Nikhil Saudagre') + ')',
      hsnSacCode: '999312',
      rate: doctor?.consultationFee || 500,
      quantity: 1,
      discount: 0,
      taxRate: clinic?.taxPercentage || 0,
      total: doctor?.consultationFee || 500,
    },
    {
      description: 'Complete Blood Count (CBC) & Vitals Screening',
      hsnSacCode: '999313',
      rate: 350,
      quantity: 1,
      discount: 0,
      taxRate: clinic?.taxPercentage || 0,
      total: 350,
    },
  ];

  const lineItems = items && items.length > 0 ? items : sampleItems;

  const computedSubtotal =
    subtotal !== undefined
      ? subtotal
      : lineItems.reduce((acc, item) => acc + item.rate * item.quantity, 0);

  const computedTax =
    taxTotal !== undefined
      ? taxTotal
      : (computedSubtotal - discountTotal) * ((clinic?.taxPercentage || 0) / 100);

  const computedGrandTotal =
    grandTotal !== undefined
      ? grandTotal
      : computedSubtotal - discountTotal + computedTax;

  const formattedDate = formatClinicalDateTime(invoiceDate || new Date());

  // Convert Number to Words (Indian format)
  const numberToWords = (num: number): string => {
    const a = [
      '',
      'One',
      'Two',
      'Three',
      'Four',
      'Five',
      'Six',
      'Seven',
      'Eight',
      'Nine',
      'Ten',
      'Eleven',
      'Twelve',
      'Thirteen',
      'Fourteen',
      'Fifteen',
      'Sixteen',
      'Seventeen',
      'Eighteen',
      'Nineteen',
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const inWords = (n: number): string => {
      if (n === 0) return 'Zero';
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
      if (n < 1000)
        return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + inWords(n % 100) : '');
      if (n < 100000)
        return (
          inWords(Math.floor(n / 1000)) +
          ' Thousand' +
          (n % 1000 !== 0 ? ' ' + inWords(n % 1000) : '')
        );
      if (n < 10000000)
        return (
          inWords(Math.floor(n / 100000)) +
          ' Lakh' +
          (n % 100000 !== 0 ? ' ' + inWords(n % 100000) : '')
        );
      return (
        inWords(Math.floor(n / 10000000)) +
        ' Crore' +
        (n % 10000000 !== 0 ? ' ' + inWords(n % 10000000) : '')
      );
    };

    const rounded = Math.round(num);
    return `${inWords(rounded)} Rupees Only`;
  };

  const isA5 = paperSize === 'A5';

  return (
    <div
      id="printable-invoice-document"
      className="bg-white text-slate-900 mx-auto font-sans text-[12px] leading-relaxed select-text shadow-xl border border-slate-200 print:border-0 print:shadow-none print:m-0 print:w-full print:max-w-none box-border"
      style={{
        width: '100%',
        maxWidth: isA5 ? '148mm' : '210mm',
        minHeight: isA5 ? '210mm' : '297mm',
        padding: '12mm',
      }}
    >
      {/* 1. CLINIC LETTERHEAD & INVOICE TITLE */}
      {letterheadMode === 'PLAIN_PAPER' ? (
        <div className="border-b border-slate-300 pb-3 mb-3">
          <div className="flex justify-between items-start gap-4">
            {/* Clinic Info */}
            <div className="flex items-start gap-3 min-w-0 flex-1">
              {clinic?.logoUrl ? (
                <img
                  src={clinic.logoUrl}
                  alt="Clinic Logo"
                  className="w-12 h-12 object-contain rounded-lg border border-slate-200 p-1 shrink-0"
                />
              ) : null}
              <div className="min-w-0">
                <h1 className="text-base font-extrabold text-slate-900 uppercase tracking-tight">
                  {clinic?.name || 'NISSCHAY MULTISPECIALITY HEALTHCARE'}
                </h1>
                {clinic?.tagline && (
                  <p className="text-[11px] text-slate-600 italic font-medium">{clinic.tagline}</p>
                )}
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {[clinic?.address, clinic?.city, clinic?.state, clinic?.pincode]
                    .filter(Boolean)
                    .join(', ') || 'Plot 42, Medical Enclave, Pune, Maharashtra 411001'}
                </p>
                <div className="flex items-center gap-3 text-[11px] text-slate-600 mt-0.5 flex-wrap">
                  <span>Ph: {clinic?.phone || clinic?.emergencyPhone || '+91 9876543210'}</span>
                  {clinic?.email && <span>Email: {clinic.email}</span>}
                  {clinic?.gstNumber && (
                    <span>
                      GSTIN: <strong>{clinic.gstNumber}</strong>
                    </span>
                  )}
                  {clinic?.registrationNumber && (
                    <span>
                      Reg: <strong>{clinic.registrationNumber}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Invoice Meta */}
            <div className="text-right shrink-0">
              <div className="inline-block text-right">
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">
                  TAX INVOICE / RECEIPT
                </span>
                <span className="text-sm font-extrabold text-slate-900 font-mono block">
                  {invoiceNumber}
                </span>
                <span className="text-[11px] text-slate-600 block mt-0.5">
                  Date: <strong>{formattedDate}</strong>
                </span>
                <span
                  className={`inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border mt-1 ${
                    paymentStatus === 'PAID'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : paymentStatus === 'PARTIAL'
                      ? 'bg-amber-50 text-amber-700 border-amber-300'
                      : 'bg-rose-50 text-rose-700 border-rose-300'
                  }`}
                >
                  {paymentStatus}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ height: '35mm' }} className="border-b border-dashed border-slate-300 mb-3" />
      )}

      {/* 2. PATIENT & DOCTOR INFO ROW */}
      <div className="border-b border-slate-300 pb-2.5 mb-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Billed To (Patient)</span>
            <strong className="text-slate-900 block font-bold">
              {patient?.name || 'Rahul Sharma'}
            </strong>
            <span className="text-[11px] text-slate-600">
              {[patient?.gender, patient?.age ? `${patient.age} Yrs` : '32 Yrs']
                .filter(Boolean)
                .join(' / ')}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Patient ID / UHID</span>
            <strong className="text-slate-900 font-mono font-semibold block">
              {patient?.id ? `P-${patient.id.slice(0, 6).toUpperCase()}` : 'P-100482'}
            </strong>
            <span className="text-[11px] text-slate-600">{patient?.phone || '+91 9876543210'}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Attending Doctor</span>
            <strong className="text-slate-900 block font-bold">
              Dr. {doctor?.name || 'Nikhil Saudagre'}
            </strong>
            <span className="text-[11px] text-slate-600">
              {doctor?.specialization || 'General Physician'}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Payment Method</span>
            <strong className="text-slate-900 block font-bold capitalize">
              {paymentMode.toLowerCase()}
            </strong>
            <span className="text-[10px] text-slate-500 font-mono truncate block">
              {transactionRef}
            </span>
          </div>
        </div>
      </div>

      {/* 3. ITEMIZED CHARGES TABLE */}
      <div className="mb-3">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b-2 border-slate-900 text-slate-900">
              <th className="py-1.5 px-1 font-bold text-center w-8">#</th>
              <th className="py-1.5 px-2 font-bold">Particulars / Service Description</th>
              <th className="py-1.5 px-2 font-bold text-center w-18">SAC/HSN</th>
              <th className="py-1.5 px-2 font-bold text-right w-16">Rate (₹)</th>
              <th className="py-1.5 px-2 font-bold text-center w-12">Qty</th>
              {discountTotal > 0 && <th className="py-1.5 px-2 font-bold text-right w-16">Disc</th>}
              <th className="py-1.5 px-2 font-bold text-right w-20">Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {lineItems.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50">
                <td className="py-2 px-1 text-center text-slate-500 font-mono">{idx + 1}</td>
                <td className="py-2 px-2 font-medium text-slate-900">
                  <span>{item.description}</span>
                </td>
                <td className="py-2 px-2 text-center text-slate-500 font-mono text-[11px]">
                  {item.hsnSacCode || '999312'}
                </td>
                <td className="py-2 px-2 text-right font-mono">{item.rate.toFixed(2)}</td>
                <td className="py-2 px-2 text-center font-mono">{item.quantity}</td>
                {discountTotal > 0 && (
                  <td className="py-2 px-2 text-right font-mono text-emerald-700">
                    {(item.discount || 0).toFixed(2)}
                  </td>
                )}
                <td className="py-2 px-2 text-right font-bold font-mono text-slate-900">
                  {item.total.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4. TOTALS & SUMMARY SECTION */}
      <div className="border-t-2 border-slate-900 pt-2 mb-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
          {/* Amount In Words & Notes */}
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">
                Amount Chargeable (in words):
              </span>
              <strong className="text-slate-900 font-semibold block italic">
                {numberToWords(computedGrandTotal)}
              </strong>
            </div>

            {clinic?.upiId && (
              <div className="flex items-center gap-2.5 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="w-8 h-8 bg-white border border-slate-200 flex items-center justify-center rounded">
                  <QrCode className="w-5 h-5 text-slate-800" />
                </div>
                <div className="text-[11px] leading-tight">
                  <span className="font-bold text-slate-800 block">UPI Scan & Pay:</span>
                  <span className="font-mono text-slate-600">{clinic.upiId}</span>
                </div>
              </div>
            )}

            {notes && (
              <p className="text-[11px] text-slate-600">
                <strong>Notes:</strong> {notes}
              </p>
            )}
          </div>

          {/* Amount Calculations Box */}
          <div className="space-y-1 text-xs sm:max-w-xs sm:ml-auto w-full">
            <div className="flex justify-between py-0.5 text-slate-600">
              <span>Subtotal Amount:</span>
              <span className="font-mono">₹{computedSubtotal.toFixed(2)}</span>
            </div>

            {discountTotal > 0 && (
              <div className="flex justify-between py-0.5 text-emerald-700">
                <span>Total Discount:</span>
                <span className="font-mono">-₹{discountTotal.toFixed(2)}</span>
              </div>
            )}

            {clinic?.taxPercentage && clinic.taxPercentage > 0 ? (
              <>
                <div className="flex justify-between py-0.5 text-slate-600 text-[11px]">
                  <span>CGST ({(clinic.taxPercentage / 2).toFixed(1)}%):</span>
                  <span className="font-mono">₹{(computedTax / 2).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-0.5 text-slate-600 text-[11px]">
                  <span>SGST ({(clinic.taxPercentage / 2).toFixed(1)}%):</span>
                  <span className="font-mono">₹{(computedTax / 2).toFixed(2)}</span>
                </div>
              </>
            ) : null}

            <div className="flex justify-between py-1.5 border-t border-b border-slate-900 text-sm font-black text-slate-900 mt-1">
              <span>Total Received:</span>
              <span className="font-mono">₹{computedGrandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. FOOTER & AUTHORIZED SIGNATORY */}
      <div className="border-t border-slate-300 pt-3 mt-auto">
        <div className="flex justify-between items-end gap-4 text-[11px] text-slate-600">
          <div className="space-y-0.5">
            <p className="font-medium text-slate-700">
              * This is a computer-generated tax invoice and receipt.
            </p>
            <p className="text-[10px] text-slate-500">
              Thank you for trusting {clinic?.name || 'our clinic'} with your healthcare.
            </p>
          </div>

          <div className="text-right shrink-0">
            <div className="h-10 flex items-end justify-end">
              {doctor?.digitalSignature ? (
                <img
                  src={doctor.digitalSignature}
                  alt="Doctor Signature"
                  className="max-h-8 object-contain"
                />
              ) : null}
            </div>
            <div className="border-t border-slate-400 pt-1 w-36 text-center">
              <span className="text-[10px] font-bold text-slate-900 block">Authorized Signatory</span>
              <span className="text-[9px] text-slate-500 block">
                {clinic?.name || 'Clinic Administration'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
