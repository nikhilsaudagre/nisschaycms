/**
 * Centralized Financial Calculator Engine (Aligned 100% with Spring Boot Backend Billing Ledger)
 * Eliminates ad-hoc frontend math across Inpatient Cockpit, Discharge Centre, Billing Desk, and Pharmacy POS.
 */

import { HospitalBed, InpatientServiceCharge, InpatientAdvancePayment } from '@/types';

export interface BedStayFinancials {
  stayDays: number;
  dailyRate: number;
  roomCharges: number;
  servicesTotal: number;
  grossTotal: number;
  advances: number;
  balanceDue: number;
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID';
}

export interface PosFinancials {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  cashTendered: number;
  changeDue: number;
}

/**
 * Calculates authoritative financial breakdown for an inpatient bed stay
 */
export function calculateBedStayFinancials(bed?: HospitalBed | null): BedStayFinancials {
  if (!bed) {
    return {
      stayDays: 1,
      dailyRate: 1000,
      roomCharges: 1000,
      servicesTotal: 0,
      grossTotal: 1000,
      advances: 0,
      balanceDue: 1000,
      paymentStatus: 'UNPAID'
    };
  }

  // 1. Calculate Stay Days
  let stayDays = 1;
  if (bed.admissionDate) {
    try {
      const adm = new Date(bed.admissionDate);
      const dis = bed.dischargePlan?.plannedDate ? new Date(bed.dischargePlan.plannedDate) : new Date();
      const diffTime = Math.abs(dis.getTime() - adm.getTime());
      stayDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    } catch {
      stayDays = 1;
    }
  }

  const dailyRate = bed.dailyRate || 1000;
  const roomCharges = dailyRate * stayDays;

  // 2. Calculate Services Total
  const servicesTotal = (bed.billingCharges || []).reduce(
    (acc: number, curr: InpatientServiceCharge) => acc + (curr.totalAmount || 0),
    0
  );

  const grossTotal = roomCharges + servicesTotal;

  // 3. Calculate Advances & Payments
  const advances = (bed.advancePayments || []).reduce(
    (acc: number, curr: InpatientAdvancePayment) => acc + (curr.amount || 0),
    0
  );

  let balanceDue = Math.max(0, grossTotal - advances);

  // If stay is discharged and cleared by billing, zero out balance
  if (bed.dischargePlan?.clearedByBilling || bed.status === 'CLEANING' || bed.status === 'AVAILABLE') {
    balanceDue = 0;
  }

  let paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID' = 'PAID';
  if (balanceDue > 0) {
    paymentStatus = advances > 0 ? 'PARTIAL' : 'UNPAID';
  }

  return {
    stayDays,
    dailyRate,
    roomCharges,
    servicesTotal,
    grossTotal,
    advances,
    balanceDue,
    paymentStatus
  };
}

/**
 * Calculates POS retail sale totals, GST/taxes, discount, and cash change return
 */
export function calculatePosFinancials(
  items: Array<{ unitPrice: number; quantity: number }>,
  taxRate: number = 12,
  discountAmount: number = 0,
  cashTendered: number = 0
): PosFinancials {
  const subtotal = items.reduce((acc, item) => acc + ((item.unitPrice || 0) * (item.quantity || 1)), 0);
  const taxAmount = Math.round(((subtotal * taxRate) / 100) * 100) / 100;
  const grandTotal = Math.max(0, Math.round((subtotal + taxAmount - discountAmount) * 100) / 100);
  const changeDue = Math.max(0, Math.round((cashTendered - grandTotal) * 100) / 100);

  return {
    subtotal,
    taxRate,
    taxAmount,
    discountAmount,
    grandTotal,
    cashTendered,
    changeDue
  };
}
