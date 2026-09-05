'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Patient, Appointment, Doctor, Clinic, HospitalBed, InpatientServiceCharge, InpatientAdvancePayment, InpatientMedicationOrder } from '@/types';
import { calculateBedStayFinancials } from '@/lib/financial-calculator';
import { formatClinicalDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { InvoicePrintDocument } from '@/components/invoice-print-document';
import {
  CreditCard,
  Receipt,
  Search,
  Plus,
  Printer,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Filter,
  Calendar,
  User,
  BedDouble,
  Stethoscope,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Maximize2,
  Minimize2,
  Trash2,
  ShoppingCart,
  Boxes,
  FileSpreadsheet,
  History,
  Layers,
  Activity,
  ArrowRightLeft,
  Percent,
  FileCheck2
} from 'lucide-react';

interface BillingRecord {
  id: string;
  invoiceNumber: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  type: 'OPD' | 'IPD';
  bedOrRoom?: string;
  doctorName: string;
  date: string;
  totalAmount: number;
  paidAmount: number;
  status: 'PAID' | 'PARTIAL' | 'PENDING';
  itemsSummary: string;
  paymentMode: string;
}

interface PosCartItem {
  id: string;
  name: string;
  category: string;
  dosage?: string;
  batchNumber?: string;
  stockRemaining: number;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
  total: number;
}

// Master Stock & Tariff Catalog with Real-Time Stock Quantities
const MASTER_BILLABLE_CATALOG = [
  { id: 'srv-1', name: 'Inj. Pantocid 40mg IV', category: 'MEDICATION', dosage: '40mg IV', batch: 'B-9021', stockRemaining: 45, unitPrice: 120, mrp: 145 },
  { id: 'srv-2', name: 'Tab. Augmentin 625 Duo', category: 'MEDICATION', dosage: '625mg', batch: 'B-4112', stockRemaining: 8, unitPrice: 180, mrp: 215 },
  { id: 'srv-3', name: 'Inj. Ceftriaxone 1gm IV', category: 'MEDICATION', dosage: '1gm Vial', batch: 'B-7822', stockRemaining: 60, unitPrice: 140, mrp: 165 },
  { id: 'srv-4', name: 'Tab. Dolo 650mg', category: 'MEDICATION', dosage: '650mg Tablet', batch: 'B-1190', stockRemaining: 120, unitPrice: 35, mrp: 42 },
  { id: 'srv-5', name: 'IV Normal Saline 500ml', category: 'MEDICATION', dosage: '0.9% NS Bottle', batch: 'FL-401', stockRemaining: 80, unitPrice: 65, mrp: 85 },
  { id: 'srv-6', name: 'Inj. Propofol 1% 20ml', category: 'MEDICATION', dosage: '10mg/ml', batch: 'OT-802', stockRemaining: 4, unitPrice: 350, mrp: 420 },
  { id: 'srv-7', name: 'Consultant Doctor OPD Consultation', category: 'DOCTOR_VISIT', dosage: 'Clinical Eval', batch: 'DOC-OPD', stockRemaining: 999, unitPrice: 500, mrp: 500 },
  { id: 'srv-8', name: 'Complete Blood Count (CBC)', category: 'INVESTIGATION', dosage: 'Haematology', batch: 'LAB-CBC', stockRemaining: 999, unitPrice: 350, mrp: 350 },
  { id: 'srv-9', name: 'Liver Function Test (LFT)', category: 'INVESTIGATION', dosage: 'Biochemistry', batch: 'LAB-LFT', stockRemaining: 999, unitPrice: 750, mrp: 750 },
  { id: 'srv-10', name: 'Kidney Function Test (KFT)', category: 'INVESTIGATION', dosage: 'Biochemistry', batch: 'LAB-KFT', stockRemaining: 999, unitPrice: 650, mrp: 650 },
  { id: 'srv-11', name: 'Digital Chest X-Ray PA View', category: 'INVESTIGATION', dosage: 'Radiology', batch: 'RAD-XRAY', stockRemaining: 999, unitPrice: 500, mrp: 500 },
  { id: 'srv-12', name: '12-Lead Electrocardiogram (ECG)', category: 'INVESTIGATION', dosage: 'Cardiology', batch: 'CARD-ECG', stockRemaining: 999, unitPrice: 300, mrp: 300 },
  { id: 'srv-13', name: 'Nursing Care & Vitals Monitoring (Per Day)', category: 'NURSING', dosage: 'Ward Care', batch: 'NUR-01', stockRemaining: 999, unitPrice: 400, mrp: 400 },
];

export default function BillingPage() {
  const queryClient = useQueryClient();

  // Primary Workstation Tabs
  const [activeBillingTab, setActiveBillingTab] = useState<'WORKSTATION_POS' | 'IPD_MATRIX' | 'DISCHARGE_QUEUE' | 'HISTORY_AUDIT'>('WORKSTATION_POS');

  // POS State
  const [posCustomerType, setPosCustomerType] = useState<'WALK_IN' | 'OPD_PATIENT' | 'IPD_BED'>('WALK_IN');
  const [posPatientName, setPosPatientName] = useState('Walk-in Retail Patient');
  const [posPatientPhone, setPosPatientPhone] = useState('');
  const [posSelectedPatientId, setPosSelectedPatientId] = useState('');
  const [posSelectedBedId, setPosSelectedBedId] = useState('');
  const [posDoctorName, setPosDoctorName] = useState('');
  const [posPaymentMode, setPosPaymentMode] = useState<'CASH' | 'UPI' | 'CARD' | 'IPD_BILL'>('UPI');
  const [posDiscountPercent, setPosDiscountPercent] = useState<string>('0');

  // Auto-suggest Search State for POS Item Selection
  const [itemSearchInput, setItemSearchInput] = useState('');
  const [showItemSuggestions, setShowItemSuggestions] = useState(false);
  const itemSuggestRef = useRef<HTMLDivElement>(null);

  // POS Cart Items
  const [cartItems, setCartItems] = useState<PosCartItem[]>([
    { id: 'it-1', name: 'Inj. Pantocid 40mg IV', category: 'MEDICATION', dosage: '40mg IV', batchNumber: 'B-9021', stockRemaining: 45, quantity: 2, unitPrice: 120, discountPercent: 0, taxPercent: 5, total: 252 },
    { id: 'it-2', name: 'Complete Blood Count (CBC)', category: 'INVESTIGATION', dosage: 'Haematology', batchNumber: 'LAB-CBC', stockRemaining: 999, quantity: 1, unitPrice: 350, discountPercent: 0, taxPercent: 0, total: 350 },
  ]);

  // History Search & Filters
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'ALL' | 'PAID' | 'PARTIAL' | 'PENDING'>('ALL');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'ALL' | 'OPD' | 'IPD'>('ALL');
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<BillingRecord | null>(null);

  // Selected Inpatient Bed for Deep Ledger Drawer
  const [selectedBedForLedger, setSelectedBedForLedger] = useState<HospitalBed | null>(null);
  const [ledgerModalCategoryFilter, setLedgerModalCategoryFilter] = useState<'ALL' | 'MEDICATION' | 'INVESTIGATION' | 'ROOM_RENT' | 'DOCTOR_VISIT' | 'ADVANCES'>('ALL');

  // Quick Record Payment Modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [payTargetRecord, setPayTargetRecord] = useState<BillingRecord | null>(null);
  const [payAmount, setPayAmount] = useState('1000');
  const [payMode, setPayMode] = useState('UPI');
  const [payNotes, setPayNotes] = useState('Payment settlement');

  // Discharge Settlement Modal in Billing Desk
  const [dischargeClearanceBed, setDischargeClearanceBed] = useState<HospitalBed | null>(null);
  const [dischargePayMode, setDischargePayMode] = useState<string>('UPI');
  const [dischargePayNotes, setDischargePayNotes] = useState<string>('');
  const [dischargeUpiUtr, setDischargeUpiUtr] = useState<string>('');
  const [dischargeCashTendered, setDischargeCashTendered] = useState<string>('');
  const [dischargeCardDetails, setDischargeCardDetails] = useState<string>('');
  const [dischargeInsuranceClaimNo, setDischargeInsuranceClaimNo] = useState<string>('');
  const [isProcessingDischargeSettle, setIsProcessingDischargeSettle] = useState<boolean>(false);
  const [dischargeSettledNotification, setDischargeSettledNotification] = useState<string>('');
  const [dischargeQueueFilter, setDischargeQueueFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
  const [dischargeQueueSearch, setDischargeQueueSearch] = useState<string>('');

  // Fetch Patients
  const { data: patientsData } = useQuery<{ content: Patient[] }>({
    queryKey: ['patients-list'],
    queryFn: async () => {
      const res = await apiClient.get('/patients?size=100');
      return res.data;
    },
  });
  const patients = patientsData?.content || [];

  // Fetch Appointments
  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ['appointments-all'],
    queryFn: async () => {
      const res = await apiClient.get('/appointments');
      return res.data || [];
    },
  });

  // Fetch Doctors
  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ['doctors-list'],
    queryFn: async () => {
      const res = await apiClient.get('/doctors');
      return res.data || [];
    },
  });

  // Fetch Clinic
  const { data: clinic } = useQuery<Clinic>({
    queryKey: ['clinic-me'],
    queryFn: async () => {
      const res = await apiClient.get('/clinics/me');
      return res.data;
    },
  });

  // Fetch Hospital Beds Data
  const [ipdBeds, setIpdBeds] = useState<HospitalBed[]>([]);
  useEffect(() => {
    const fetchHospitalData = async () => {
      try {
        const res = await apiClient.get<any>('/clinics/hospital-data');
        if (res.data?.beds) {
          const parsed = typeof res.data.beds === 'string' ? JSON.parse(res.data.beds) : res.data.beds;
          if (Array.isArray(parsed)) setIpdBeds(parsed);
        } else {
          const saved = localStorage.getItem('nisschay_hospital_beds');
          if (saved) setIpdBeds(JSON.parse(saved));
        }
      } catch {
        const saved = localStorage.getItem('nisschay_hospital_beds');
        if (saved) setIpdBeds(JSON.parse(saved));
      }
    };
    fetchHospitalData();

    // Poll every 2.5 seconds & listen to cross-tab BroadcastChannel
    const interval = setInterval(fetchHospitalData, 2500);
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('nisschay_hospital_sync');
      channel.onmessage = (event) => {
        if (event.data?.type === 'HOSPITAL_DATA_UPDATED' && event.data?.beds) {
          setIpdBeds(event.data.beds);
        } else {
          fetchHospitalData();
        }
      };
    } catch {}

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'nisschay_hospital_beds') {
        fetchHospitalData();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(interval);
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const saveBedsToBackend = async (updated: HospitalBed[]) => {
    setIpdBeds(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nisschay_hospital_beds', JSON.stringify(updated));
      try {
        const bc = new BroadcastChannel('nisschay_hospital_sync');
        bc.postMessage({ type: 'HOSPITAL_DATA_UPDATED', beds: updated });
        bc.close();
      } catch {}
    }
    try {
      await apiClient.post('/clinics/hospital-data', { beds: JSON.stringify(updated) });
    } catch {}
  };

  // Close Auto-suggestions on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (itemSuggestRef.current && !itemSuggestRef.current.contains(event.target as Node)) {
        setShowItemSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter Auto-Suggestions for typing medicine/service name
  const filteredCatalogSuggestions = useMemo(() => {
    const term = itemSearchInput.trim().toLowerCase();
    if (!term || term.length < 1) return [];

    return MASTER_BILLABLE_CATALOG.filter(item =>
      item.name.toLowerCase().includes(term) || item.category.toLowerCase().includes(term) || (item.dosage || '').toLowerCase().includes(term)
    ).slice(0, 6);
  }, [itemSearchInput]);

  // Add Item to POS Cart
  const handleAddItemToCart = (catalogItem: typeof MASTER_BILLABLE_CATALOG[0]) => {
    const tax = catalogItem.category === 'MEDICATION' ? 5 : 0;
    const rate = catalogItem.unitPrice;
    const total = Math.round(rate * (1 + tax / 100));

    const newItem: PosCartItem = {
      id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: catalogItem.name,
      category: catalogItem.category,
      dosage: catalogItem.dosage,
      batchNumber: catalogItem.batch,
      stockRemaining: catalogItem.stockRemaining,
      quantity: 1,
      unitPrice: rate,
      discountPercent: 0,
      taxPercent: tax,
      total: total
    };

    setCartItems([...cartItems, newItem]);
    setItemSearchInput('');
    setShowItemSuggestions(false);
  };

  // Update Cart Item Quantity
  const handleUpdateItemQuantity = (id: string, newQty: number) => {
    if (newQty <= 0) {
      setCartItems(cartItems.filter(i => i.id !== id));
      return;
    }

    setCartItems(cartItems.map(item => {
      if (item.id === id) {
        const discountedRate = item.unitPrice * (1 - item.discountPercent / 100);
        const withTax = discountedRate * (1 + item.taxPercent / 100);
        return {
          ...item,
          quantity: newQty,
          total: Math.round(withTax * newQty)
        };
      }
      return item;
    }));
  };

  // Update Cart Item Discount
  const handleUpdateItemDiscount = (id: string, discount: number) => {
    setCartItems(cartItems.map(item => {
      if (item.id === id) {
        const discountedRate = item.unitPrice * (1 - discount / 100);
        const withTax = discountedRate * (1 + item.taxPercent / 100);
        return {
          ...item,
          discountPercent: discount,
          total: Math.round(withTax * item.quantity)
        };
      }
      return item;
    }));
  };

  // Cart Calculations
  const cartFinancials = useMemo(() => {
    const subtotal = cartItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
    const totalTax = cartItems.reduce((acc, item) => acc + ((item.unitPrice * item.quantity * item.taxPercent) / 100), 0);
    const overallDiscountNum = parseFloat(posDiscountPercent) || 0;
    const grossTotal = subtotal + totalTax;
    const discountAmount = Math.round((grossTotal * overallDiscountNum) / 100);
    const netPayable = Math.max(0, grossTotal - discountAmount);

    return { subtotal, totalTax, discountAmount, netPayable };
  }, [cartItems, posDiscountPercent]);

  // Complete POS Billing
  const handleCompletePosBill = () => {
    if (cartItems.length === 0) return;

    const invoiceNo = `INV-POS-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const nowIso = new Date().toISOString();

    // If customer is admitted IPD bed & chosen to add to bed bill
    if (posCustomerType === 'IPD_BED' && posSelectedBedId) {
      const targetBed = ipdBeds.find((b) => b.id === posSelectedBedId);
      if (targetBed) {
        const newCharges: InpatientServiceCharge[] = cartItems.map((item) => ({
          id: `srv-pos-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          category: (item.category as any) || 'OTHER',
          serviceName: `${item.name} (${item.dosage || 'Standard'}) x${item.quantity}`,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          totalAmount: item.total,
          dateAdded: nowIso,
          notes: `Batch: ${item.batchNumber || 'POS Dispense'}`
        }));

        const updated = ipdBeds.map((b) =>
          b.id === posSelectedBedId
            ? { ...b, billingCharges: [...(b.billingCharges || []), ...newCharges] }
            : b
        );
        saveBedsToBackend(updated);
      }
    }

    const customerName =
      posCustomerType === 'IPD_BED'
        ? ipdBeds.find((b) => b.id === posSelectedBedId)?.patientName || 'Inpatient Bed Patient'
        : posCustomerType === 'OPD_PATIENT'
        ? patients.find((p) => p.id === posSelectedPatientId)?.name || 'OPD Patient'
        : posPatientName;

    setSelectedInvoiceForPrint({
      id: `bill-${Date.now()}`,
      invoiceNumber: invoiceNo,
      patientId: posSelectedPatientId || 'walkin',
      patientName: customerName,
      patientPhone: posPatientPhone || 'N/A',
      type: posCustomerType === 'IPD_BED' ? 'IPD' : 'OPD',
      doctorName: posDoctorName || (doctors[0]?.name ? `Dr. ${doctors[0].name}` : 'Attending Consultant'),
      date: nowIso,
      totalAmount: cartFinancials.netPayable,
      paidAmount: posCustomerType === 'IPD_BED' ? 0 : cartFinancials.netPayable,
      status: posCustomerType === 'IPD_BED' ? 'PENDING' : 'PAID',
      itemsSummary: cartItems.map(i => `${i.name} x${i.quantity}`).join(', '),
      paymentMode: posCustomerType === 'IPD_BED' ? 'Added to Running Inpatient Bill' : posPaymentMode
    });

    setCartItems([]);
  };

  // Synthesize Complete Historical Billing Ledger
  const historicalBillingRecords: BillingRecord[] = useMemo(() => {
    const records: BillingRecord[] = [];

    // 1. IPD Inpatient Hospital Bills
    ipdBeds.forEach((bed, idx) => {
      if (bed.status === 'OCCUPIED' || bed.status === 'DISCHARGE_PLANNED' || (bed.patientName && bed.patientName.trim())) {
        const fin = calculateBedStayFinancials(bed);

        let status: 'PAID' | 'PARTIAL' | 'PENDING' = 'PENDING';
        if (fin.advances >= fin.grossTotal && fin.grossTotal > 0) status = 'PAID';
        else if (fin.advances > 0) status = 'PARTIAL';

        records.push({
          id: `ipd-bill-${bed.id}`,
          invoiceNumber: `INV-IPD-${bed.ipdNumber?.replace('IPD-', '') || `2026-${idx + 101}`}`,
          patientId: bed.patientId || `ipd-${bed.id}`,
          patientName: bed.patientName || 'Inpatient Patient',
          patientPhone: bed.patientPhone || 'Inpatient',
          type: 'IPD',
          bedOrRoom: `${bed.wardName} (${bed.bedNumber})`,
          doctorName: bed.consultantDoctorName || 'Attending Consultant',
          date: bed.admissionDate || '2026-08-28',
          totalAmount: fin.grossTotal,
          paidAmount: fin.advances,
          status,
          itemsSummary: `Bed Rent (${fin.stayDays}d @ ₹${fin.dailyRate}) + ${bed.billingCharges?.length || 0} Hospital Services`,
          paymentMode: fin.advances > 0 ? 'Advance Deposits + UPI' : 'Pending at Discharge'
        });
      }
    });

    // 2. OPD Consultation Invoices
    appointments.forEach((appt, idx) => {
      if (appt.status === 'COMPLETED' || appt.prescription) {
        records.push({
          id: `opd-bill-${appt.id}`,
          invoiceNumber: `INV-OPD-2026-${1000 + idx}`,
          patientId: appt.patientId,
          patientName: appt.patientName || 'Outpatient',
          patientPhone: appt.patientPhone || 'N/A',
          type: 'OPD',
          doctorName: appt.doctorName || 'Specialist',
          date: appt.appointmentDate,
          totalAmount: 500,
          paidAmount: 500,
          status: 'PAID',
          itemsSummary: `OPD Clinical Consultation (${appt.type || 'General'})`,
          paymentMode: 'UPI'
        });
      }
    });

    return records;
  }, [ipdBeds, appointments]);

  // Filtered History
  const filteredHistory = useMemo(() => {
    return historicalBillingRecords.filter((rec) => {
      const matchesSearch =
        !historySearchQuery ||
        rec.patientName.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
        rec.invoiceNumber.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
        rec.patientPhone.includes(historySearchQuery);

      const matchesStatus = historyStatusFilter === 'ALL' || rec.status === historyStatusFilter;
      const matchesType = historyTypeFilter === 'ALL' || rec.type === historyTypeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [historicalBillingRecords, historySearchQuery, historyStatusFilter, historyTypeFilter]);

  // Overall Financial Metrics
  const metrics = useMemo(() => {
    const totalBilled = historicalBillingRecords.reduce((acc, r) => acc + r.totalAmount, 0);
    const totalCollected = historicalBillingRecords.reduce((acc, r) => acc + r.paidAmount, 0);
    const totalOutstanding = Math.max(0, totalBilled - totalCollected);
    const settledCount = historicalBillingRecords.filter((r) => r.status === 'PAID').length;
    const pendingCount = historicalBillingRecords.filter((r) => r.status !== 'PAID').length;

    return { totalBilled, totalCollected, totalOutstanding, settledCount, pendingCount };
  }, [historicalBillingRecords]);

  // Record Settlement Payment
  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTargetRecord) return;
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) return;

    if (payTargetRecord.type === 'IPD') {
      const targetBedId = payTargetRecord.id.replace('ipd-bill-', '');
      const today = new Date().toISOString().split('T')[0];
      const newAdv: InpatientAdvancePayment = {
        id: `adv-${Date.now()}`,
        amount: amt,
        paymentMode: payMode,
        receiptNumber: `REC-${Math.floor(100000 + Math.random() * 900000)}`,
        datePaid: today,
        notes: payNotes
      };

      const updatedBeds = ipdBeds.map((b) =>
        b.id === targetBedId ? { ...b, advancePayments: [...(b.advancePayments || []), newAdv] } : b
      );

      saveBedsToBackend(updatedBeds);
    }

    setShowPayModal(false);
  };

  return (
    <div className="space-y-4 font-sans min-w-0">
      {/* 1. TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-[#E8EEF2] shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#087F8C] to-[#065A63] text-white flex items-center justify-center font-bold shadow-xs">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-[#172B34] tracking-tight">
              Hospital Billing & Revenue Workstation
            </h1>
            <p className="text-xs text-[#567781] mt-0.5">
              Rapid POS counter billing with live stock lookup, Inpatient bed medication matrices, and historical revenue audit.
            </p>
          </div>
        </div>

        {/* 3 CORE WORKSPACE TABS */}
        <div className="flex items-center gap-1 bg-[#F6F9FB] p-1 rounded-xl border border-[#E8EEF2] overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveBillingTab('WORKSTATION_POS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeBillingTab === 'WORKSTATION_POS'
                ? 'bg-[#087F8C] text-white shadow-2xs'
                : 'text-[#567781] hover:text-[#172B34]'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>POS Billing Counter</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveBillingTab('IPD_MATRIX')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeBillingTab === 'IPD_MATRIX'
                ? 'bg-rose-700 text-white shadow-2xs'
                : 'text-[#567781] hover:text-[#172B34]'
            }`}
          >
            <BedDouble className="w-3.5 h-3.5" />
            <span>IPD Bed Ledger Matrix ({ipdBeds.filter(b => b.patientName).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveBillingTab('DISCHARGE_QUEUE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeBillingTab === 'DISCHARGE_QUEUE'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-[#567781] hover:text-amber-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Discharge Clearance Queue</span>
            {ipdBeds.filter(b => b.dischargePlan?.dossierStatus === 'SENT_TO_BILLING').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-mono font-bold animate-pulse">
                {ipdBeds.filter(b => b.dischargePlan?.dossierStatus === 'SENT_TO_BILLING').length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveBillingTab('HISTORY_AUDIT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeBillingTab === 'HISTORY_AUDIT'
                ? 'bg-[#172B34] text-white shadow-2xs'
                : 'text-[#567781] hover:text-[#172B34]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Billing History & Audit</span>
          </button>
        </div>
      </div>

      {/* Discharge Requests Alert Banner */}
      {ipdBeds.filter(b => b.dischargePlan?.dossierStatus === 'SENT_TO_BILLING').length > 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between gap-3 text-amber-950 text-xs shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <strong className="block text-amber-900 font-bold">
                🔔 {ipdBeds.filter(b => b.dischargePlan?.dossierStatus === 'SENT_TO_BILLING').length} Inpatient Discharge Settlement Request(s) Pending!
              </strong>
              <span className="text-[11px] text-amber-800">
                Doctor certified clinical dossier and requested billing team clearance.
              </span>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setActiveBillingTab('DISCHARGE_QUEUE')}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-7.5 px-3 rounded-xl border-0 cursor-pointer shadow-xs"
          >
            Open Queue
          </Button>
        </div>
      )}

      {/* Discharge Settled Notification */}
      {dischargeSettledNotification && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-2 text-emerald-950 text-xs font-semibold shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{dischargeSettledNotification}</span>
        </div>
      )}

      {/* 2. EXECUTIVE FINANCIAL KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-[#E8EEF2] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[#567781]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Billed Volume</span>
            <Receipt className="w-4 h-4 text-[#087F8C]" />
          </div>
          <div className="text-xl font-black text-[#172B34] font-mono">
            ₹{metrics.totalBilled.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-[#567781] block">{historicalBillingRecords.length} Consolidated Invoices</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E8EEF2] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[#567781]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Collected</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-700 font-mono">
            ₹{metrics.totalCollected.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-emerald-700 block font-medium">{metrics.settledCount} Settled Invoices</span>
        </div>

        <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-rose-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Outstanding Dues</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-black text-rose-900 font-mono">
            ₹{metrics.totalOutstanding.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-rose-700 block font-medium">{metrics.pendingCount} Inpatient Dues Active</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E8EEF2] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[#567781]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Admitted Beds Active</span>
            <BedDouble className="w-4 h-4 text-[#087F8C]" />
          </div>
          <div className="text-xl font-black text-[#172B34] font-mono">
            {ipdBeds.filter(b => b.status === 'OCCUPIED').length} Occupied Beds
          </div>
          <span className="text-[11px] text-[#567781] block">Running Ledger Enabled</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: RAPID POS BILLING COUNTER WORKSPACE (FULLSCREEN / MAXIMUM SCREEN)  */}
      {/* ========================================================================= */}
      {activeBillingTab === 'WORKSTATION_POS' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Col (7/12): Patient & Item Auto-Suggest Selector */}
            <div className="lg:col-span-7 space-y-3.5">
              <div className="bg-white p-4 rounded-2xl border border-[#E8EEF2] shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-2.5">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-[#087F8C]" />
                    <h3 className="text-xs font-bold text-[#172B34] uppercase tracking-wider">
                      Patient & Billing Destination
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                    Real-time Ledger Connected
                  </span>
                </div>

                {/* Patient Category Select */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#172B34] block">Billing Category *</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPosCustomerType('WALK_IN')}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        posCustomerType === 'WALK_IN' ? 'bg-[#172B34] text-white border-[#172B34]' : 'bg-[#F6F9FB] border-[#E8EEF2] text-[#567781]'
                      }`}
                    >
                      Walk-In Counter
                    </button>
                    <button
                      type="button"
                      onClick={() => setPosCustomerType('OPD_PATIENT')}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        posCustomerType === 'OPD_PATIENT' ? 'bg-[#087F8C] text-white border-[#087F8C]' : 'bg-[#F6F9FB] border-[#E8EEF2] text-[#567781]'
                      }`}
                    >
                      OPD Consultation
                    </button>
                    <button
                      type="button"
                      onClick={() => setPosCustomerType('IPD_BED')}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        posCustomerType === 'IPD_BED' ? 'bg-rose-700 text-white border-rose-700' : 'bg-[#F6F9FB] border-[#E8EEF2] text-[#567781]'
                      }`}
                    >
                      Inpatient Ward Bed
                    </button>
                  </div>
                </div>

                {/* Dynamic Patient Selection */}
                {posCustomerType === 'WALK_IN' && (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Walk-In Customer Name"
                      value={posPatientName}
                      onChange={(e) => setPosPatientName(e.target.value)}
                      className="h-8.5 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Mobile Phone (Optional)"
                      value={posPatientPhone}
                      onChange={(e) => setPosPatientPhone(e.target.value)}
                      className="h-8.5 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs font-mono"
                    />
                  </div>
                )}

                {posCustomerType === 'OPD_PATIENT' && (
                  <select
                    value={posSelectedPatientId}
                    onChange={(e) => setPosSelectedPatientId(e.target.value)}
                    className="w-full h-8.5 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs font-medium cursor-pointer"
                  >
                    <option value="">-- Choose Registered OPD Patient --</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>
                    ))}
                  </select>
                )}

                {posCustomerType === 'IPD_BED' && (
                  <select
                    value={posSelectedBedId}
                    onChange={(e) => setPosSelectedBedId(e.target.value)}
                    className="w-full h-8.5 px-2.5 bg-[#F6F9FB] border border-rose-200 rounded-xl text-xs font-bold text-rose-900 cursor-pointer"
                  >
                    <option value="">-- Select Occupied Inpatient Bed --</option>
                    {ipdBeds.filter(b => b.patientName).map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.patientName} — Bed {b.bedNumber} ({b.wardName}) • Total Incurred: ₹{(b.billingCharges || []).reduce((acc, c) => acc + c.totalAmount, 0)}
                      </option>
                    ))}
                  </select>
                )}

                {/* Auto-suggest Medicine / Service Search Input with Live Remaining Stock */}
                <div className="p-3.5 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] space-y-2 relative" ref={itemSuggestRef}>
                  <label className="font-bold text-[#172B34] text-xs flex items-center justify-between">
                    <span>Search Medicine / Tariff Service to Add</span>
                    <span className="text-[10px] text-[#087F8C] font-semibold">⚡ Displays live remaining stock on typing</span>
                  </label>

                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#567781]" />
                    <input
                      type="text"
                      placeholder="Type medicine or service name e.g. 'Pantocid', 'Augmentin', 'CBC', 'Dolo'..."
                      value={itemSearchInput}
                      onChange={(e) => {
                        setItemSearchInput(e.target.value);
                        setShowItemSuggestions(true);
                      }}
                      onFocus={() => setShowItemSuggestions(true)}
                      className="w-full h-9 pl-9 pr-3 bg-white border border-[#E8EEF2] rounded-xl text-xs focus:outline-none focus:border-[#087F8C]"
                    />
                  </div>

                  {/* Auto-Suggest Results Dropdown with Live Stock Display */}
                  {showItemSuggestions && filteredCatalogSuggestions.length > 0 && (
                    <div className="absolute left-3.5 right-3.5 top-full mt-1 bg-white border border-[#E8EEF2] rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-[#E8EEF2]">
                      {filteredCatalogSuggestions.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleAddItemToCart(item)}
                          className="w-full p-3 text-left hover:bg-[#F6F9FB] flex items-center justify-between cursor-pointer transition-colors"
                        >
                          <div>
                            <strong className="text-xs text-[#172B34] block">{item.name}</strong>
                            <span className="text-[11px] text-[#567781]">{item.dosage} • Category: {item.category}</span>
                          </div>

                          <div className="text-right">
                            <span className="font-mono font-bold text-xs text-[#087F8C] block">₹{item.unitPrice}</span>
                            {item.stockRemaining < 900 ? (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                item.stockRemaining <= 10 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                              }`}>
                                {item.stockRemaining} units in stock
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500">Hospital Tariff Service</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Col (5/12): Live Itemized Cart, Taxes & Instant Checkout */}
            <div className="lg:col-span-5 space-y-3.5">
              <div className="bg-white p-4 rounded-2xl border border-[#E8EEF2] shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-2">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-[#087F8C]" />
                    <h3 className="text-xs font-bold text-[#172B34] uppercase tracking-wider">
                      Itemized Bill Cart ({cartItems.length})
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-[#567781]">Live Calculation</span>
                </div>

                {cartItems.length === 0 ? (
                  <div className="p-8 bg-[#F6F9FB] rounded-xl text-center space-y-1">
                    <ShoppingCart className="w-7 h-7 text-[#567781] mx-auto opacity-40" />
                    <span className="text-xs font-bold text-[#172B34] block">Billing Cart is Empty</span>
                    <p className="text-[11px] text-[#567781]">Type in the search box to add medicines or hospital services.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                    {cartItems.map((item) => (
                      <div key={item.id} className="p-2.5 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] text-xs space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <strong className="text-xs text-[#172B34] block">{item.name}</strong>
                            <span className="text-[10.5px] text-[#567781]">
                              Rate: ₹{item.unitPrice} {item.stockRemaining < 900 ? `• Stock: ${item.stockRemaining}` : ''}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQuantity(item.id, 0)}
                            className="text-rose-600 hover:text-rose-800 p-0.5 cursor-pointer text-xs"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-[#567781]">Qty:</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQuantity(item.id, item.quantity - 1)}
                              className="w-5 h-5 rounded bg-white border border-[#E8EEF2] flex items-center justify-center font-bold text-xs cursor-pointer"
                            >
                              -
                            </button>
                            <span className="font-mono font-bold px-1.5">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQuantity(item.id, item.quantity + 1)}
                              className="w-5 h-5 rounded bg-white border border-[#E8EEF2] flex items-center justify-center font-bold text-xs cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-[#567781]">Disc %:</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discountPercent}
                              onChange={(e) => handleUpdateItemDiscount(item.id, parseFloat(e.target.value) || 0)}
                              className="w-10 h-6 px-1 text-center bg-white border border-[#E8EEF2] rounded text-[11px] font-mono"
                            />
                          </div>

                          <span className="font-mono font-bold text-xs text-[#172B34]">
                            ₹{item.total}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Financial Summary & Checkout */}
                {cartItems.length > 0 && (
                  <div className="p-3.5 bg-[#172B34] text-white rounded-xl space-y-2.5">
                    <div className="space-y-1 text-xs text-slate-300 border-b border-white/10 pb-2">
                      <div className="flex justify-between">
                        <span>Items Subtotal:</span>
                        <span className="font-mono font-bold text-white">₹{cartFinancials.subtotal}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>GST / Tax:</span>
                        <span className="font-mono font-bold text-white">₹{cartFinancials.totalTax}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Overall Discount %:</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={posDiscountPercent}
                          onChange={(e) => setPosDiscountPercent(e.target.value)}
                          className="w-12 h-6 px-1 text-center bg-white/10 border border-white/20 rounded text-xs text-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">Net Payable:</span>
                      <span className="text-xl font-black font-mono text-emerald-400">₹{cartFinancials.netPayable}</span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      {posCustomerType === 'IPD_BED' ? (
                        <span className="text-[11px] text-amber-300 font-semibold">
                          Posts to Admitted Inpatient Bed Bill.
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-300">Mode:</span>
                          <select
                            value={posPaymentMode}
                            onChange={(e) => setPosPaymentMode(e.target.value as any)}
                            className="bg-white/10 text-white rounded-lg px-2 py-1 text-xs border border-white/20"
                          >
                            <option value="UPI" className="text-black">UPI / QR</option>
                            <option value="CASH" className="text-black">Cash</option>
                            <option value="CARD" className="text-black">Card</option>
                          </select>
                        </div>
                      )}

                      <Button
                        size="sm"
                        onClick={handleCompletePosBill}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs h-8 px-4 rounded-lg border-0 cursor-pointer shadow-xs"
                      >
                        Issue Invoice & Settle ✓
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INPATIENT (IPD) RUNNING BED LEDGER & MEDICATION METRICS MATRIX     */}
      {/* ========================================================================= */}
      {activeBillingTab === 'IPD_MATRIX' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-[#E8EEF2] shadow-2xs space-y-1">
            <h3 className="text-xs font-bold text-[#172B34] uppercase tracking-wider flex items-center gap-2">
              <BedDouble className="w-4 h-4 text-rose-600" />
              <span>Inpatient Ward Bed Financial Ledger Matrix</span>
            </h3>
            <p className="text-xs text-[#567781]">
              Live breakdown of Incurred Bed Rent, Pharmacy Meds, Labs, Doctor Visits, Advance Deposits, and Balance Due across all admitted patients.
            </p>
          </div>

          {ipdBeds.filter(b => b.patientName).length === 0 ? (
            <div className="p-10 bg-white rounded-2xl border border-[#E8EEF2] text-center space-y-2">
              <BedDouble className="w-8 h-8 text-[#567781] mx-auto opacity-40" />
              <h4 className="text-xs font-bold text-[#172B34]">No Admitted Patients</h4>
              <p className="text-[11px] text-[#567781]">When patients are admitted to beds in the Command Center, their running ledgers display here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ipdBeds.filter(b => b.patientName).map((bed) => {
                const stayDays = (() => {
                  if (!bed.admissionDate) return 1;
                  const adm = new Date(bed.admissionDate);
                  const now = new Date();
                  return Math.max(1, Math.ceil(Math.abs(now.getTime() - adm.getTime()) / (1000 * 60 * 60 * 24)));
                })();

                const bedRent = (bed.dailyRate || 1000) * stayDays;
                const medsTotal = (bed.billingCharges || []).filter(c => c.category === 'MEDICATION').reduce((acc, c) => acc + c.totalAmount, 0);
                const labsTotal = (bed.billingCharges || []).filter(c => c.category === 'INVESTIGATION').reduce((acc, c) => acc + c.totalAmount, 0);
                const docTotal = (bed.billingCharges || []).filter(c => c.category === 'DOCTOR_VISIT').reduce((acc, c) => acc + c.totalAmount, 0);
                const otherTotal = (bed.billingCharges || []).filter(c => !['MEDICATION', 'INVESTIGATION', 'DOCTOR_VISIT'].includes(c.category)).reduce((acc, c) => acc + c.totalAmount, 0);
                const grossTotal = bedRent + medsTotal + labsTotal + docTotal + otherTotal;
                const paidTotal = (bed.advancePayments || []).reduce((acc, a) => acc + a.amount, 0);
                const netBalance = Math.max(0, grossTotal - paidTotal);

                return (
                  <div key={bed.id} className="p-4 bg-white rounded-2xl border border-[#E8EEF2] shadow-2xs space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between border-b border-[#E8EEF2] pb-2.5">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs font-black bg-[#172B34] text-white px-2 py-0.5 rounded">
                              Bed {bed.bedNumber}
                            </span>
                            <strong className="text-sm text-[#172B34]">{bed.patientName}</strong>
                          </div>
                          <span className="text-[11px] text-[#567781] block mt-0.5">
                            {bed.wardName} • Admitted: {bed.admissionDate || '2026-08-28'} ({stayDays} Days)
                          </span>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          netBalance === 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {netBalance === 0 ? 'SETTLED' : `DUE: ₹${netBalance}`}
                        </span>
                      </div>

                      {/* 5-Metric Breakdown Matrix */}
                      <div className="grid grid-cols-3 gap-2 pt-2.5 text-xs">
                        <div className="p-2 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2]">
                          <span className="text-[9.5px] font-bold text-[#567781] uppercase block">Bed Rent ({stayDays}d)</span>
                          <strong className="text-xs font-bold text-[#172B34] font-mono">₹{bedRent}</strong>
                        </div>
                        <div className="p-2 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2]">
                          <span className="text-[9.5px] font-bold text-[#567781] uppercase block">Pharmacy Meds</span>
                          <strong className="text-xs font-bold text-[#087F8C] font-mono">₹{medsTotal}</strong>
                        </div>
                        <div className="p-2 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2]">
                          <span className="text-[9.5px] font-bold text-[#567781] uppercase block">Lab & Diagnostics</span>
                          <strong className="text-xs font-bold text-purple-700 font-mono">₹{labsTotal}</strong>
                        </div>
                        <div className="p-2 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2]">
                          <span className="text-[9.5px] font-bold text-[#567781] uppercase block">Doctor Rounds</span>
                          <strong className="text-xs font-bold text-[#172B34] font-mono">₹{docTotal}</strong>
                        </div>
                        <div className="p-2 bg-emerald-50/70 rounded-xl border border-emerald-200">
                          <span className="text-[9.5px] font-bold text-emerald-800 uppercase block">Advance Paid</span>
                          <strong className="text-xs font-bold text-emerald-700 font-mono">₹{paidTotal}</strong>
                        </div>
                        <div className={`p-2 rounded-xl border ${netBalance > 0 ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
                          <span className="text-[9.5px] font-bold uppercase block">Balance Due</span>
                          <strong className="text-xs font-black font-mono">₹{netBalance}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#E8EEF2]">
                      <span className="text-[11px] text-[#567781]">Total Incurred: <strong className="text-[#172B34]">₹{grossTotal}</strong></span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedBedForLedger(bed)}
                          className="px-3 py-1 bg-[#087F8C] hover:bg-[#076b77] text-white rounded-lg text-xs font-bold cursor-pointer shadow-2xs flex items-center gap-1"
                        >
                          <Maximize2 className="w-3 h-3" />
                          <span>Open Full Ledger</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DISCHARGE CLEARANCE REQUEST CARDS WORKSTATION                          */}
      {/* ========================================================================= */}
      {activeBillingTab === 'DISCHARGE_QUEUE' && (() => {
        // Collect all beds with active discharge workflows
        const dischargeBedsList = ipdBeds.filter((b) => {
          if (!b.patientName) return false;
          return (
            b.dischargePlan !== undefined ||
            b.status === 'DISCHARGE_PLANNED'
          );
        });

        // Filter by Status & Search
        const filteredDischargeList = dischargeBedsList.filter((b) => {
          const isPaid = b.dischargePlan?.dossierStatus === 'BILL_PAID_READY_TO_GO';
          if (dischargeQueueFilter === 'PENDING' && isPaid) return false;
          if (dischargeQueueFilter === 'PAID' && !isPaid) return false;

          if (dischargeQueueSearch.trim()) {
            const q = dischargeQueueSearch.toLowerCase();
            const matchName = (b.patientName || '').toLowerCase().includes(q);
            const matchBed = (b.bedNumber || '').toLowerCase().includes(q);
            const matchWard = (b.wardName || '').toLowerCase().includes(q);
            const matchDoc = (b.consultantDoctorName || '').toLowerCase().includes(q);
            const matchDiag = (b.admittingDiagnosis || '').toLowerCase().includes(q);
            const matchPhone = (b.patientPhone || '').includes(q);
            return matchName || matchBed || matchWard || matchDoc || matchDiag || matchPhone;
          }
          return true;
        });

        const pendingCount = dischargeBedsList.filter(b => b.dischargePlan?.dossierStatus !== 'BILL_PAID_READY_TO_GO').length;
        const paidCount = dischargeBedsList.filter(b => b.dischargePlan?.dossierStatus === 'BILL_PAID_READY_TO_GO').length;

        return (
          <div className="space-y-4">
            {/* Header & Metric Banner */}
            <div className="bg-white p-4.5 rounded-2xl border border-[#E8EEF2] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-50 rounded-xl text-amber-700">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#172B34] tracking-tight">
                      Inpatient Discharge Clearance Queue & Settlement Cards
                    </h3>
                    <p className="text-xs text-[#567781]">
                      Review clinical discharge dossiers, audit itemized stay & pharmacy ledgers, collect balance payments, and issue final tax invoices.
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span><strong>{pendingCount}</strong> Pending Settlement</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span><strong>{paidCount}</strong> Billed & Cleared</span>
                </div>
              </div>
            </div>

            {/* Filter Chips & Search Bar */}
            <div className="bg-white p-3 rounded-2xl border border-[#E8EEF2] shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#567781]" />
                <input
                  type="text"
                  placeholder="Search request card by patient name, bed number, doctor, phone..."
                  value={dischargeQueueSearch}
                  onChange={(e) => setDischargeQueueSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs text-[#172B34] focus:outline-none focus:border-[#087F8C]"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-[#F6F9FB] p-1 rounded-xl border border-[#E8EEF2]">
                <button
                  type="button"
                  onClick={() => setDischargeQueueFilter('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    dischargeQueueFilter === 'ALL' ? 'bg-white text-[#172B34] shadow-2xs' : 'text-[#567781] hover:text-[#172B34]'
                  }`}
                >
                  All Requests ({dischargeBedsList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDischargeQueueFilter('PENDING')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    dischargeQueueFilter === 'PENDING' ? 'bg-amber-600 text-white shadow-2xs' : 'text-[#567781] hover:text-amber-700'
                  }`}
                >
                  Action Required ({pendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setDischargeQueueFilter('PAID')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    dischargeQueueFilter === 'PAID' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-[#567781] hover:text-emerald-700'
                  }`}
                >
                  Cleared / Paid ({paidCount})
                </button>
              </div>
            </div>

            {/* Request Cards Grid (Compact, Sleek 3-Column Layout) */}
            {filteredDischargeList.length === 0 ? (
              <div className="p-10 bg-white rounded-2xl border border-[#E8EEF2] text-center space-y-2.5 max-w-md mx-auto shadow-2xs">
                <Receipt className="w-10 h-10 text-[#567781]/40 mx-auto" />
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-[#172B34]">No Discharge Requests Found</h4>
                  <p className="text-xs text-[#567781]">
                    When doctors mark patients as "Plan Discharge" or send requests to billing, compact clearance cards will appear here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                {filteredDischargeList.map((bed) => {
                  const admissionDate = bed.admissionDate ? new Date(bed.admissionDate) : new Date();
                  const today = new Date();
                  const diffTime = Math.abs(today.getTime() - admissionDate.getTime());
                  const stayDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                  const bedRent = (bed.dailyRate || 1000) * stayDays;

                  const medsTotal = (bed.billingCharges || []).filter(c => c.category === 'MEDICATION').reduce((acc, c) => acc + (c.totalAmount || 0), 0);
                  const labsTotal = (bed.billingCharges || []).filter(c => c.category === 'INVESTIGATION').reduce((acc, c) => acc + (c.totalAmount || 0), 0);
                  const docTotal = (bed.billingCharges || []).filter(c => c.category === 'DOCTOR_VISIT').reduce((acc, c) => acc + (c.totalAmount || 0), 0);
                  const otherTotal = (bed.billingCharges || []).filter(c => !['MEDICATION', 'INVESTIGATION', 'DOCTOR_VISIT'].includes(c.category)).reduce((acc, c) => acc + (c.totalAmount || 0), 0);
                  const grossTotal = bedRent + medsTotal + labsTotal + docTotal + otherTotal;

                  const advances = (bed.advancePayments || []).reduce((acc, p) => acc + (p.amount || 0), 0);
                  const balanceDue = Math.max(0, grossTotal - advances);

                  const isPaid = bed.dischargePlan?.dossierStatus === 'BILL_PAID_READY_TO_GO';
                  const isSentToBilling = bed.dischargePlan?.dossierStatus === 'SENT_TO_BILLING';
                  const isDocsReady = bed.dischargePlan?.dossierStatus === 'DOCS_CERTIFIED_READY';

                  return (
                    <div
                      key={bed.id}
                      className={`p-3.5 rounded-2xl border transition-all shadow-2xs flex flex-col justify-between space-y-2.5 ${
                        isPaid
                          ? 'bg-white border-emerald-200 hover:border-emerald-300'
                          : isSentToBilling
                          ? 'bg-amber-50/20 border-amber-300 ring-1 ring-amber-300/60 hover:shadow-xs'
                          : 'bg-white border-[#E8EEF2] hover:border-[#087F8C]/40'
                      }`}
                    >
                      <div className="space-y-2">
                        {/* Card Header */}
                        <div className="flex items-start justify-between gap-1.5 border-b border-[#E8EEF2]/80 pb-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded-md bg-[#172B34] text-white">
                                Bed {bed.bedNumber}
                              </span>
                              <span className="text-[11px] font-semibold text-[#567781] truncate">{bed.wardName}</span>
                            </div>
                            <h4 className="text-xs font-bold text-[#172B34] mt-1 truncate">
                              {bed.patientName} {bed.patientAgeGender ? <span className="text-[10px] text-[#567781] font-normal">({bed.patientAgeGender})</span> : null}
                            </h4>
                          </div>

                          {/* Status Badge */}
                          <div className="shrink-0">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 text-[9.5px] font-bold">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Paid (₹0)</span>
                              </span>
                            ) : isSentToBilling ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500 text-white text-[9.5px] font-bold animate-pulse shadow-2xs">
                                <AlertCircle className="w-3 h-3" />
                                <span>Action: Settle</span>
                              </span>
                            ) : isDocsReady ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9.5px] font-semibold">
                                <FileCheck2 className="w-3 h-3 text-emerald-600" />
                                <span>Docs Ready</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-[#567781] text-[9.5px] font-medium">
                                <Clock className="w-3 h-3" />
                                <span>In Plan</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Middle Info */}
                        <div className="text-[11px] text-[#567781] space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="truncate">Diagnosis: <strong className="text-[#172B34]">{bed.admittingDiagnosis || 'Care'}</strong></span>
                            <span className="shrink-0">{stayDays}d stay</span>
                          </div>
                          <div className="flex justify-between items-center text-[10.5px]">
                            <span className="truncate">Doctor: <strong>{bed.consultantDoctorName || 'Consultant'}</strong></span>
                            <span className="text-amber-800 font-medium">{bed.dischargePlan?.plannedTime || 'Today'}</span>
                          </div>
                        </div>

                        {/* Compact Financial Strip */}
                        <div className="p-2 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] grid grid-cols-3 gap-1 text-center text-xs">
                          <div>
                            <span className="text-[9px] text-[#567781] block">Gross Bill</span>
                            <strong className="text-[11px] font-mono text-[#172B34]">₹{grossTotal}</strong>
                          </div>
                          <div>
                            <span className="text-[9px] text-emerald-700 block">Advance</span>
                            <strong className="text-[11px] font-mono text-emerald-700">₹{advances}</strong>
                          </div>
                          <div>
                            <span className="text-[9px] block font-bold text-rose-800">Net Due</span>
                            <strong className={`text-[11.5px] font-mono font-black ${balanceDue > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                              {balanceDue > 0 ? `₹${balanceDue}` : '₹0'}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* 2 Action Buttons */}
                      <div className="pt-2 border-t border-[#E8EEF2] flex items-center justify-between gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedBedForLedger(bed);
                            setLedgerModalCategoryFilter('ALL');
                          }}
                          className="h-7.5 text-[11px] font-semibold rounded-lg border-[#E8EEF2] text-[#087F8C] hover:bg-[#F6F9FB] flex-1 flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Maximize2 className="w-3 h-3 text-[#087F8C]" />
                          <span>View History</span>
                        </Button>

                        {!isPaid ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              setDischargeClearanceBed(bed);
                              setDischargePayMode('UPI');
                              setDischargeUpiUtr('');
                              setDischargeCashTendered('');
                              setDischargeCardDetails('');
                              setDischargeInsuranceClaimNo('');
                              setDischargePayNotes('Inpatient Final Discharge Clearance');
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] h-7.5 px-3 rounded-lg border-0 cursor-pointer flex-1 flex items-center justify-center gap-1 shadow-2xs"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>Settle Bill</span>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => {
                              const invRec: BillingRecord = {
                                id: `inv-${bed.id}`,
                                invoiceNumber: bed.dischargePlan?.billingInvoiceNo || `INV-IPD-${bed.bedNumber}-${Math.floor(1000 + Math.random() * 9000)}`,
                                patientId: bed.patientId || '',
                                patientName: bed.patientName || 'Inpatient',
                                patientPhone: bed.patientPhone || '',
                                type: 'IPD',
                                bedOrRoom: `${bed.wardName} (${bed.bedNumber})`,
                                doctorName: bed.consultantDoctorName || 'Doctor',
                                date: new Date().toISOString().split('T')[0],
                                totalAmount: grossTotal,
                                paidAmount: grossTotal,
                                status: 'PAID',
                                itemsSummary: `${stayDays} Days Stay + Treatments`,
                                paymentMode: 'Cash/UPI Clearance'
                              };
                              setSelectedInvoiceForPrint(invRec);
                            }}
                            className="bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-[11px] h-7.5 px-3 rounded-lg border-0 cursor-pointer flex-1 flex items-center justify-center gap-1 shadow-2xs"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Tax Invoice</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* 4. HISTORICAL INVOICES & AUDIT WORKSTATION                                */}
      {/* ========================================================================= */}
      {activeBillingTab === 'HISTORY_AUDIT' && (
        <div className="space-y-4">
          <div className="bg-white p-3 rounded-2xl border border-[#E8EEF2] shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#567781]" />
              <input
                type="text"
                placeholder="Search history by patient name, invoice no, or phone..."
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs text-[#172B34] focus:outline-none focus:border-[#087F8C]"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              <div className="flex items-center gap-1 bg-[#F6F9FB] p-1 rounded-xl border border-[#E8EEF2]">
                <button
                  type="button"
                  onClick={() => setHistoryTypeFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    historyTypeFilter === 'ALL' ? 'bg-white text-[#172B34] shadow-2xs' : 'text-[#567781]'
                  }`}
                >
                  All Types
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTypeFilter('OPD')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    historyTypeFilter === 'OPD' ? 'bg-[#087F8C] text-white shadow-2xs' : 'text-[#567781]'
                  }`}
                >
                  OPD
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTypeFilter('IPD')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    historyTypeFilter === 'IPD' ? 'bg-rose-700 text-white shadow-2xs' : 'text-[#567781]'
                  }`}
                >
                  IPD Bed
                </button>
              </div>

              <select
                value={historyStatusFilter}
                onChange={(e) => setHistoryStatusFilter(e.target.value as any)}
                className="h-9 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs font-semibold text-[#172B34] cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value="PAID">Paid / Settled</option>
                <option value="PARTIAL">Partially Paid</option>
                <option value="PENDING">Pending Settlement</option>
              </select>
            </div>
          </div>

          {/* Historical Invoices Table */}
          <div className="bg-white rounded-2xl border border-[#E8EEF2] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F6F9FB] border-b border-[#E8EEF2] text-[#567781] font-bold text-[11px] uppercase">
                    <th className="p-3.5">Invoice No</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Patient Details</th>
                    <th className="p-3.5">Care Type</th>
                    <th className="p-3.5">Doctor</th>
                    <th className="p-3.5 text-right">Billed Amount</th>
                    <th className="p-3.5 text-right">Paid Amount</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EEF2]">
                  {filteredHistory.map((rec) => {
                    const balanceDue = Math.max(0, rec.totalAmount - rec.paidAmount);

                    return (
                      <tr key={rec.id} className="hover:bg-[#F6F9FB]/60 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-[#087F8C]">{rec.invoiceNumber}</td>
                        <td className="p-3.5 text-[#567781] whitespace-nowrap">{formatClinicalDateTime(rec.date)}</td>
                        <td className="p-3.5">
                          <Link href={`/patients/${rec.patientId}`} className="font-bold text-[#172B34] hover:text-[#087F8C] hover:underline block">
                            {rec.patientName}
                          </Link>
                          <span className="text-[11px] text-[#567781]">{rec.patientPhone}</span>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rec.type === 'IPD' ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-sky-50 text-sky-800 border border-sky-200'
                          }`}>
                            {rec.type === 'IPD' ? `IPD: ${rec.bedOrRoom || 'Ward'}` : 'OPD Consultation'}
                          </span>
                        </td>
                        <td className="p-3.5 text-[#567781] truncate max-w-[140px]">{rec.doctorName}</td>
                        <td className="p-3.5 text-right font-mono font-bold text-[#172B34]">₹{rec.totalAmount.toLocaleString('en-IN')}</td>
                        <td className="p-3.5 text-right font-mono text-emerald-700 font-bold">₹{rec.paidAmount.toLocaleString('en-IN')}</td>
                        <td className="p-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rec.status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : rec.status === 'PARTIAL'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {rec.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {balanceDue > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPayTargetRecord(rec);
                                  setPayAmount(String(balanceDue));
                                  setShowPayModal(true);
                                }}
                                className="px-2 py-1 rounded bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-[11px] font-bold cursor-pointer"
                              >
                                + Pay
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedInvoiceForPrint(rec)}
                              className="p-1 rounded text-[#567781] hover:text-[#087F8C] cursor-pointer"
                              title="Print Invoice"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: FULL INPATIENT (IPD) RUNNING BED DOSSIER & CATEGORIZED LEDGER    */}
      {/* ========================================================================= */}
      {selectedBedForLedger && (() => {
        const fin = calculateBedStayFinancials(selectedBedForLedger);
        const stayDays = fin.stayDays;
        const roomCharges = fin.roomCharges;
        const grossTotal = fin.grossTotal;
        const advances = fin.advances;
        const balanceDue = fin.balanceDue;

        const medsList = (selectedBedForLedger.billingCharges || []).filter(c => c.category === 'MEDICATION');
        const labsList = (selectedBedForLedger.billingCharges || []).filter(c => c.category === 'INVESTIGATION');
        const docList = (selectedBedForLedger.billingCharges || []).filter(c => c.category === 'DOCTOR_VISIT');
        const otherList = (selectedBedForLedger.billingCharges || []).filter(c => !['MEDICATION', 'INVESTIGATION', 'DOCTOR_VISIT'].includes(c.category));

        const medsTotal = medsList.reduce((acc, c) => acc + (c.totalAmount || 0), 0);
        const labsTotal = labsList.reduce((acc, c) => acc + (c.totalAmount || 0), 0);
        const docTotal = docList.reduce((acc, c) => acc + (c.totalAmount || 0), 0);
        const otherTotal = otherList.reduce((acc, c) => acc + (c.totalAmount || 0), 0);

        // Filter charges by category tab
        const filteredCharges = (selectedBedForLedger.billingCharges || []).filter(c => {
          if (ledgerModalCategoryFilter === 'ALL') return true;
          if (ledgerModalCategoryFilter === 'MEDICATION') return c.category === 'MEDICATION';
          if (ledgerModalCategoryFilter === 'INVESTIGATION') return c.category === 'INVESTIGATION';
          if (ledgerModalCategoryFilter === 'DOCTOR_VISIT') return c.category === 'DOCTOR_VISIT' || !['MEDICATION', 'INVESTIGATION'].includes(c.category);
          return true;
        });

        return (
          <div className="fixed inset-0 bg-[#172B34]/70 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-[#E8EEF2] p-5 space-y-4 max-h-[90vh] flex flex-col justify-between overflow-hidden">
              {/* Modal Top Header */}
              <div className="flex justify-between items-start border-b border-[#E8EEF2] pb-3 shrink-0">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-[#172B34] text-white text-xs font-mono font-bold">
                      Bed {selectedBedForLedger.bedNumber}
                    </span>
                    <span className="text-xs font-bold text-[#567781]">{selectedBedForLedger.wardName}</span>
                    {selectedBedForLedger.ipdNumber && (
                      <span className="text-[10px] font-mono text-[#087F8C] bg-[#087F8C]/10 px-1.5 py-0.5 rounded font-bold">
                        {selectedBedForLedger.ipdNumber}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-[#172B34] flex items-center gap-1.5 mt-1">
                    <User className="w-4 h-4 text-[#087F8C]" />
                    <span>{selectedBedForLedger.patientName}</span>
                    <span className="text-xs font-normal text-[#567781]">({selectedBedForLedger.patientAgeGender || 'Adult'} • {selectedBedForLedger.patientPhone})</span>
                  </h3>
                  <p className="text-[11px] text-[#567781]">
                    Admitted: <strong>{selectedBedForLedger.admissionDate || 'Today'}</strong> ({stayDays} Days stay) • Consultant: <strong>{selectedBedForLedger.consultantDoctorName || 'Doctor'}</strong> • Diagnosis: <strong>{selectedBedForLedger.admittingDiagnosis || 'Clinical Care'}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBedForLedger(null)}
                  className="text-[#567781] hover:text-[#172B34] p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Financial KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs shrink-0">
                <div className="p-2.5 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2]">
                  <span className="text-[10px] text-[#567781] uppercase block font-semibold">Room Stay ({stayDays}d)</span>
                  <strong className="text-xs font-mono text-[#172B34]">₹{roomCharges.toLocaleString('en-IN')}</strong>
                </div>
                <div className="p-2.5 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2]">
                  <span className="text-[10px] text-[#567781] uppercase block font-semibold">Pharmacy & Labs</span>
                  <strong className="text-xs font-mono text-[#087F8C]">₹{(medsTotal + labsTotal).toLocaleString('en-IN')}</strong>
                </div>
                <div className="p-2.5 bg-emerald-50/80 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-emerald-800 uppercase block font-semibold">Advances Received</span>
                  <strong className="text-xs font-mono text-emerald-700">₹{advances.toLocaleString('en-IN')}</strong>
                </div>
                <div className={`p-2.5 rounded-xl border ${balanceDue > 0 ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
                  <span className="text-[10px] uppercase block font-bold">Net Balance Due</span>
                  <strong className="text-xs font-mono font-black">
                    {balanceDue > 0 ? `₹${balanceDue.toLocaleString('en-IN')}` : 'PAID / CLEARED'}
                  </strong>
                </div>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[#E8EEF2] pb-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setLedgerModalCategoryFilter('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    ledgerModalCategoryFilter === 'ALL' ? 'bg-[#172B34] text-white shadow-2xs' : 'bg-[#F6F9FB] text-[#567781] hover:text-[#172B34]'
                  }`}
                >
                  All Items ({(selectedBedForLedger.billingCharges || []).length + 1})
                </button>
                <button
                  type="button"
                  onClick={() => setLedgerModalCategoryFilter('MEDICATION')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    ledgerModalCategoryFilter === 'MEDICATION' ? 'bg-[#087F8C] text-white shadow-2xs' : 'bg-[#F6F9FB] text-[#567781] hover:text-[#087F8C]'
                  }`}
                >
                  💊 Pharmacy ({medsList.length} • ₹{medsTotal})
                </button>
                <button
                  type="button"
                  onClick={() => setLedgerModalCategoryFilter('INVESTIGATION')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    ledgerModalCategoryFilter === 'INVESTIGATION' ? 'bg-purple-700 text-white shadow-2xs' : 'bg-[#F6F9FB] text-[#567781] hover:text-purple-700'
                  }`}
                >
                  🧪 Lab & Diagnostics ({labsList.length} • ₹{labsTotal})
                </button>
                <button
                  type="button"
                  onClick={() => setLedgerModalCategoryFilter('ROOM_RENT')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    ledgerModalCategoryFilter === 'ROOM_RENT' ? 'bg-amber-700 text-white shadow-2xs' : 'bg-[#F6F9FB] text-[#567781] hover:text-amber-700'
                  }`}
                >
                  🛏️ Bed Stay (₹{roomCharges})
                </button>
                <button
                  type="button"
                  onClick={() => setLedgerModalCategoryFilter('ADVANCES')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    ledgerModalCategoryFilter === 'ADVANCES' ? 'bg-emerald-700 text-white shadow-2xs' : 'bg-[#F6F9FB] text-[#567781] hover:text-emerald-700'
                  }`}
                >
                  💵 Advances ({(selectedBedForLedger.advancePayments || []).length} • ₹{advances})
                </button>
              </div>

              {/* Categorized Ledger Table Body */}
              <div className="overflow-y-auto flex-1 border border-[#E8EEF2] rounded-xl">
                {ledgerModalCategoryFilter === 'ADVANCES' ? (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#F6F9FB] text-[10.5px] font-bold text-[#567781] uppercase sticky top-0">
                      <tr>
                        <th className="p-2.5">Date & Time</th>
                        <th className="p-2.5">Receipt No</th>
                        <th className="p-2.5">Mode</th>
                        <th className="p-2.5">Reference / Notes</th>
                        <th className="p-2.5 text-right">Amount Received</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8EEF2]">
                      {(selectedBedForLedger.advancePayments || []).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-[#567781]">No advance deposits recorded yet.</td>
                        </tr>
                      ) : (
                        (selectedBedForLedger.advancePayments || []).map((p) => (
                          <tr key={p.id} className="hover:bg-[#F6F9FB]/60">
                            <td className="p-2.5 text-[#567781] font-mono">{formatClinicalDateTime(p.datePaid)}</td>
                            <td className="p-2.5 font-bold font-mono text-[#172B34]">{p.receiptNumber}</td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold text-[10px]">
                                {p.paymentMode}
                              </span>
                            </td>
                            <td className="p-2.5 text-[#567781]">{p.notes || '-'}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-emerald-700">₹{p.amount?.toLocaleString('en-IN')}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                ) : ledgerModalCategoryFilter === 'ROOM_RENT' ? (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#F6F9FB] text-[10.5px] font-bold text-[#567781] uppercase sticky top-0">
                      <tr>
                        <th className="p-2.5">Period</th>
                        <th className="p-2.5">Ward & Category</th>
                        <th className="p-2.5">Daily Rate</th>
                        <th className="p-2.5">Stay Length</th>
                        <th className="p-2.5 text-right">Total Charge</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8EEF2]">
                      <tr className="hover:bg-[#F6F9FB]/60">
                        <td className="p-2.5 text-[#567781]">{formatClinicalDateTime(selectedBedForLedger.admissionDate)} to Today</td>
                        <td className="p-2.5 font-bold text-[#172B34]">{selectedBedForLedger.wardName} (Bed {selectedBedForLedger.bedNumber})</td>
                        <td className="p-2.5 font-mono text-[#567781]">₹{selectedBedForLedger.dailyRate || 1000}/day</td>
                        <td className="p-2.5 font-semibold text-[#172B34]">{stayDays} Days</td>
                        <td className="p-2.5 text-right font-mono font-bold text-[#087F8C]">₹{roomCharges.toLocaleString('en-IN')}</td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#F6F9FB] text-[10.5px] font-bold text-[#567781] uppercase sticky top-0">
                      <tr>
                        <th className="p-2.5">Date & Time Added</th>
                        <th className="p-2.5">Service / Medicine Item</th>
                        <th className="p-2.5">Category</th>
                        <th className="p-2.5">Rate × Qty</th>
                        <th className="p-2.5 text-right">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8EEF2]">
                      {filteredCharges.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-[#567781]">No charges logged under this category.</td>
                        </tr>
                      ) : (
                        filteredCharges.map((c) => (
                          <tr key={c.id} className="hover:bg-[#F6F9FB]/60">
                            <td className="p-2.5 font-mono text-[11px] text-[#567781]">{formatClinicalDateTime(c.dateAdded || c.createdAt)}</td>
                            <td className="p-2.5 font-bold text-[#172B34]">{c.serviceName}</td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                c.category === 'MEDICATION'
                                  ? 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                                  : c.category === 'INVESTIGATION'
                                  ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                  : 'bg-slate-100 text-slate-800'
                              }`}>
                                {c.category}
                              </span>
                            </td>
                            <td className="p-2.5 font-mono text-[#567781]">₹{c.unitPrice || c.totalAmount} × {c.quantity || 1}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-[#087F8C]">₹{c.totalAmount?.toLocaleString('en-IN')}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-[#E8EEF2] flex justify-between items-center shrink-0">
                <div className="text-xs text-[#567781]">
                  Total Gross Inpatient Ledger: <strong className="font-mono text-[#172B34] text-sm">₹{grossTotal.toLocaleString('en-IN')}</strong>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedBedForLedger(null)}
                    className="h-8 text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Close
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const bed = selectedBedForLedger;
                      setSelectedBedForLedger(null);
                      setDischargeClearanceBed(bed);
                      setDischargePayMode('UPI');
                      setDischargeUpiUtr('');
                      setDischargeCashTendered('');
                      setDischargeCardDetails('');
                      setDischargeInsuranceClaimNo('');
                      setDischargePayNotes('Inpatient Final Discharge Clearance');
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-4 rounded-lg border-0 cursor-pointer shadow-xs flex items-center gap-1"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Proceed to Settle Bill</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL 2: PRINT PREVIEW TAX INVOICE                                        */}
      {/* ========================================================================= */}
      {selectedInvoiceForPrint && (
        <div className="fixed inset-0 bg-[#172B34]/70 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-[#E8EEF2] p-5 space-y-4 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#E8EEF2] pb-3 no-print">
              <h3 className="text-sm font-bold text-[#172B34]">Print Tax Invoice ({selectedInvoiceForPrint.invoiceNumber})</h3>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs rounded-lg h-7.5 px-3 border-0 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  Print Document
                </Button>
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceForPrint(null)}
                  className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <InvoicePrintDocument
              clinic={clinic}
              doctor={doctors[0]}
              patient={{
                name: selectedInvoiceForPrint.patientName,
                phone: selectedInvoiceForPrint.patientPhone
              }}
              invoiceNumber={selectedInvoiceForPrint.invoiceNumber}
              invoiceDate={selectedInvoiceForPrint.date}
              items={[
                {
                  description: selectedInvoiceForPrint.itemsSummary,
                  rate: selectedInvoiceForPrint.totalAmount,
                  quantity: 1,
                  total: selectedInvoiceForPrint.totalAmount
                }
              ]}
              subtotal={selectedInvoiceForPrint.totalAmount}
              grandTotal={selectedInvoiceForPrint.totalAmount}
              paymentStatus={selectedInvoiceForPrint.status}
              paymentMode={(['CASH', 'UPI', 'CARD', 'NET_BANKING', 'INSURANCE'].includes(selectedInvoiceForPrint.paymentMode) ? selectedInvoiceForPrint.paymentMode : 'UPI') as any}
              notes="Thank you for choosing our healthcare facility. Wishing you health and wellness."
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: RECORD PAYMENT RECEIPT                                           */}
      {/* ========================================================================= */}
      {showPayModal && payTargetRecord && (
        <div className="fixed inset-0 bg-[#172B34]/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-[#E8EEF2] p-4 space-y-3">
            <div className="flex justify-between items-start border-b border-[#E8EEF2] pb-2">
              <div>
                <h3 className="text-sm font-bold text-[#172B34] flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>Record Payment Settlement</span>
                </h3>
                <p className="text-[11px] text-[#567781]">{payTargetRecord.patientName}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-2.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[#172B34]">Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-sm font-mono font-bold text-emerald-700"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#172B34]">Payment Mode</label>
                <select
                  className="w-full h-8 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs cursor-pointer font-medium"
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value)}
                >
                  <option value="UPI">UPI / QR Code</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Debit / Credit Card</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#E8EEF2]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPayModal(false)}
                  className="h-8 text-xs rounded-lg cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-4 rounded-lg border-0 cursor-pointer shadow-xs"
                >
                  Save Payment ✓
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: INPATIENT DISCHARGE SETTLEMENT & TAX INVOICE CLEARANCE           */}
      {/* ========================================================================= */}
      {dischargeClearanceBed && (() => {
        const fin = calculateBedStayFinancials(dischargeClearanceBed);
        const stayDays = fin.stayDays;
        const grossTotal = fin.grossTotal;
        const advances = fin.advances;
        const balanceDue = fin.balanceDue;

        const cashTenderedNum = parseFloat(dischargeCashTendered) || 0;
        const cashChangeReturn = Math.max(0, cashTenderedNum - balanceDue);

        const handleConfirmDischargeClearance = async (e: React.FormEvent) => {
          e.preventDefault();
          if (balanceDue > 0 && dischargePayMode === 'UPI' && !dischargeUpiUtr.trim()) {
            alert('Please enter the UPI Transaction ID / UTR number for verification.');
            return;
          }

          setIsProcessingDischargeSettle(true);

          try {
            const todayStr = new Date().toISOString().split('T')[0];
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const invoiceNumber = `INV-IPD-${dischargeClearanceBed.bedNumber}-${Math.floor(10000 + Math.random() * 90000)}`;

            const updatedAdvances = [...(dischargeClearanceBed.advancePayments || [])];
            if (balanceDue > 0) {
              let receiptNotes = dischargePayNotes || 'Discharge Clearance Payment';
              if (dischargePayMode === 'UPI') {
                receiptNotes = `UPI UTR: ${dischargeUpiUtr.trim()}${dischargePayNotes ? ' • ' + dischargePayNotes : ''}`;
              } else if (dischargePayMode === 'CASH') {
                receiptNotes = `Cash Received: ₹${cashTenderedNum} (Change: ₹${cashChangeReturn})${dischargePayNotes ? ' • ' + dischargePayNotes : ''}`;
              } else if (dischargePayMode === 'CARD') {
                receiptNotes = `Card POS: ${dischargeCardDetails}${dischargePayNotes ? ' • ' + dischargePayNotes : ''}`;
              } else if (dischargePayMode === 'INSURANCE') {
                receiptNotes = `TPA Claim ID: ${dischargeInsuranceClaimNo}${dischargePayNotes ? ' • ' + dischargePayNotes : ''}`;
              }

              const paymentReceipt: InpatientAdvancePayment = {
                id: `adv-discharge-${Date.now()}`,
                amount: balanceDue,
                paymentMode: dischargePayMode,
                receiptNumber: `REC-${Math.floor(100000 + Math.random() * 900000)}`,
                datePaid: `${todayStr} ${timeStr}`,
                notes: receiptNotes
              };
              updatedAdvances.push(paymentReceipt);
            }

            const updatedBeds = ipdBeds.map((b) =>
              b.id === dischargeClearanceBed.id
                ? {
                    ...b,
                    advancePayments: updatedAdvances,
                    dischargePlan: {
                      ...(b.dischargePlan || {
                        plannedDate: todayStr,
                        plannedTime: timeStr,
                        dischargeType: 'REGULAR'
                      }),
                      dossierStatus: 'BILL_PAID_READY_TO_GO' as const,
                      clearedByBilling: true,
                      billingSettledAt: `${todayStr} ${timeStr}`,
                      billingSettledBy: 'Billing Desk Cashier',
                      billingInvoiceNo: invoiceNumber
                    }
                  }
                : b
            );

            localStorage.setItem('nisschay_hospital_beds', JSON.stringify(updatedBeds));
            const channel = new BroadcastChannel('nisschay_hospital_sync');
            channel.postMessage({ type: 'HOSPITAL_DATA_UPDATED', beds: updatedBeds });
            channel.close();
            await apiClient.post('/clinics/hospital-data', { beds: JSON.stringify(updatedBeds) });

            // Post discharge settlement to centralized backend financial ledger
            if (dischargeClearanceBed.patientId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dischargeClearanceBed.patientId)) {
              try {
                await apiClient.post('/billing/ledger/settle-discharge', {
                  patientId: dischargeClearanceBed.patientId,
                  encounterId: dischargeClearanceBed.bedNumber,
                  settlementAmount: balanceDue,
                  paymentMode: dischargePayMode,
                  receiptNumber: invoiceNumber,
                  notes: `Discharge Final Settlement (${dischargePayMode})`
                });
              } catch (err) {
                console.error('Failed to post discharge settlement to backend ledger:', err);
              }
            }

            setDischargeSettledNotification(
              `✓ Bill cleared for ${dischargeClearanceBed.patientName} (Bed ${dischargeClearanceBed.bedNumber}). Inpatient File updated to "READY TO GO — Vacate Bed"!`
            );
            setTimeout(() => setDischargeSettledNotification(''), 7000);

            // Open print preview invoice
            const invRecord: BillingRecord = {
              id: `inv-${dischargeClearanceBed.id}`,
              invoiceNumber,
              patientId: dischargeClearanceBed.patientId || '',
              patientName: dischargeClearanceBed.patientName || 'Inpatient',
              patientPhone: dischargeClearanceBed.patientPhone || '',
              type: 'IPD',
              bedOrRoom: `${dischargeClearanceBed.wardName} (${dischargeClearanceBed.bedNumber})`,
              doctorName: dischargeClearanceBed.consultantDoctorName || 'Consultant',
              date: todayStr,
              totalAmount: grossTotal,
              paidAmount: grossTotal,
              status: 'PAID',
              itemsSummary: `${stayDays} Days Stay + Inpatient Medications & Procedures`,
              paymentMode: dischargePayMode === 'UPI' ? `UPI (UTR: ${dischargeUpiUtr.trim() || 'Online'})` : dischargePayMode
            };
            setSelectedInvoiceForPrint(invRecord);
            setDischargeClearanceBed(null);
          } catch (err) {
            console.error('Failed to confirm discharge clearance', err);
          } finally {
            setIsProcessingDischargeSettle(false);
          }
        };

        return (
          <div className="fixed inset-0 bg-[#172B34]/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-[#E8EEF2] p-5 space-y-4 max-h-[92vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex justify-between items-start border-b border-[#E8EEF2] pb-3">
                <div>
                  <h3 className="text-base font-bold text-[#172B34] flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-emerald-600" />
                    <span>Inpatient Final Settlement & Tax Invoice</span>
                  </h3>
                  <p className="text-xs text-[#567781]">Bed {dischargeClearanceBed.bedNumber} • {dischargeClearanceBed.patientName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDischargeClearanceBed(null)}
                  className="text-[#567781] hover:text-[#172B34] p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Financial Calculation Summary */}
              <div className="p-3.5 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] space-y-2 text-xs">
                <div className="flex justify-between items-center text-[#567781]">
                  <span>Stay Charges ({stayDays} Days @ ₹{dischargeClearanceBed.dailyRate}/day):</span>
                  <strong className="font-mono text-[#172B34]">₹{fin.roomCharges.toLocaleString('en-IN')}</strong>
                </div>
                <div className="flex justify-between items-center text-[#567781]">
                  <span>Pharmacy & Clinical Services ({dischargeClearanceBed.billingCharges?.length || 0} items):</span>
                  <strong className="font-mono text-[#172B34]">₹{fin.servicesTotal.toLocaleString('en-IN')}</strong>
                </div>
                <div className="flex justify-between items-center text-emerald-700">
                  <span>Advance Deposits Already Paid:</span>
                  <strong className="font-mono">₹{advances.toLocaleString('en-IN')}</strong>
                </div>
                <div className="pt-2 border-t border-[#E8EEF2] flex justify-between items-center text-sm font-bold">
                  <span className={balanceDue > 0 ? 'text-rose-900' : 'text-emerald-900'}>
                    {balanceDue > 0 ? 'Net Balance Payable Now:' : 'Clearance Status:'}
                  </span>
                  <span className={`font-mono text-base ${balanceDue > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {balanceDue > 0 ? `₹${balanceDue.toLocaleString('en-IN')}` : 'FULLY CLEARED (₹0)'}
                  </span>
                </div>
              </div>

              {/* Settlement Form */}
              <form onSubmit={handleConfirmDischargeClearance} className="space-y-3.5 text-xs">
                {balanceDue > 0 ? (
                  <div className="space-y-3">
                    {/* Payment Mode Selection Chips */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-[#172B34]">Select Mode of Payment *</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDischargePayMode('UPI')}
                          className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                            dischargePayMode === 'UPI' ? 'bg-[#087F8C] text-white border-[#087F8C] shadow-2xs' : 'bg-[#F6F9FB] text-[#172B34] border-[#E8EEF2]'
                          }`}
                        >
                          <span>📱 UPI</span>
                          <span className="text-[9.5px] opacity-80">QR / GPay</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDischargePayMode('CASH')}
                          className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                            dischargePayMode === 'CASH' ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs' : 'bg-[#F6F9FB] text-[#172B34] border-[#E8EEF2]'
                          }`}
                        >
                          <span>💵 Cash</span>
                          <span className="text-[9.5px] opacity-80">Desk Cash</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDischargePayMode('CARD')}
                          className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                            dischargePayMode === 'CARD' ? 'bg-purple-600 text-white border-purple-600 shadow-2xs' : 'bg-[#F6F9FB] text-[#172B34] border-[#E8EEF2]'
                          }`}
                        >
                          <span>💳 Card</span>
                          <span className="text-[9.5px] opacity-80">POS Swipe</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDischargePayMode('INSURANCE')}
                          className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                            dischargePayMode === 'INSURANCE' ? 'bg-blue-600 text-white border-blue-600 shadow-2xs' : 'bg-[#F6F9FB] text-[#172B34] border-[#E8EEF2]'
                          }`}
                        >
                          <span>🏥 TPA</span>
                          <span className="text-[9.5px] opacity-80">Cashless</span>
                        </button>
                      </div>
                    </div>

                    {/* Mode Specific Dynamic Inputs */}
                    {dischargePayMode === 'UPI' && (
                      <div className="p-3 bg-cyan-50/60 border border-cyan-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="font-bold text-[#172B34]">UPI Transaction ID / UTR Number *</label>
                          <span className="text-[10px] font-bold text-[#087F8C]">12-Digit Ref</span>
                        </div>
                        <input
                          type="text"
                          required
                          value={dischargeUpiUtr}
                          onChange={(e) => setDischargeUpiUtr(e.target.value)}
                          placeholder="e.g. 423892019231 / UPI-REF-9921"
                          className="w-full h-8.5 px-2.5 bg-white border border-cyan-300 rounded-lg text-xs font-mono font-bold text-[#172B34] focus:outline-none focus:ring-1 focus:ring-[#087F8C]"
                        />
                        <p className="text-[10.5px] text-[#567781]">
                          Scan hospital counter QR on GPay, PhonePe, or Paytm and type the 12-digit UTR confirmation code.
                        </p>
                      </div>
                    )}

                    {dischargePayMode === 'CASH' && (
                      <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-bold text-[#172B34] block mb-1">Cash Tendered (₹)</label>
                            <input
                              type="number"
                              value={dischargeCashTendered}
                              onChange={(e) => setDischargeCashTendered(e.target.value)}
                              placeholder={`e.g. ${balanceDue}`}
                              className="w-full h-8.5 px-2.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-bold text-[#172B34]"
                            />
                          </div>
                          <div>
                            <label className="font-bold text-[#172B34] block mb-1">Change to Return</label>
                            <div className="h-8.5 px-2.5 bg-emerald-100/70 border border-emerald-300 rounded-lg text-xs font-mono font-bold text-emerald-900 flex items-center">
                              ₹{cashChangeReturn.toLocaleString('en-IN')}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {dischargePayMode === 'CARD' && (
                      <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-xl space-y-1.5">
                        <label className="font-bold text-[#172B34]">Card Last 4 Digits & POS Slip Reference</label>
                        <input
                          type="text"
                          value={dischargeCardDetails}
                          onChange={(e) => setDischargeCardDetails(e.target.value)}
                          placeholder="e.g. Card **** 4921 • POS Auth: 88219"
                          className="w-full h-8.5 px-2.5 bg-white border border-purple-300 rounded-lg text-xs font-mono"
                        />
                      </div>
                    )}

                    {dischargePayMode === 'INSURANCE' && (
                      <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-1.5">
                        <label className="font-bold text-[#172B34]">TPA Company & Pre-Auth Claim Approval No.</label>
                        <input
                          type="text"
                          value={dischargeInsuranceClaimNo}
                          onChange={(e) => setDischargeInsuranceClaimNo(e.target.value)}
                          placeholder="e.g. Star Health TPA • Pre-Auth: SH-8921820"
                          className="w-full h-8.5 px-2.5 bg-white border border-blue-300 rounded-lg text-xs font-mono"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="font-bold text-[#172B34]">Additional Settlement Notes (Optional)</label>
                      <input
                        type="text"
                        value={dischargePayNotes}
                        onChange={(e) => setDischargePayNotes(e.target.value)}
                        placeholder="e.g. Cleared at Counter 1 by Cashier"
                        className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold">No Balance Payable (100% Cleared by Advances)</p>
                      <p className="text-[11px] text-emerald-800">You can directly generate the final official Tax Invoice.</p>
                    </div>
                  </div>
                )}

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-[#567781] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Settlement updates Inpatient File to <strong>"READY TO GO"</strong> and allows ward staff to vacate the bed.</span>
                </div>

                <div className="pt-2 flex justify-between items-center border-t border-[#E8EEF2]">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDischargeClearanceBed(null)}
                    className="h-8.5 text-xs rounded-lg cursor-pointer"
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    size="sm"
                    disabled={isProcessingDischargeSettle}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8.5 px-4 rounded-lg border-0 cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isProcessingDischargeSettle ? 'Processing...' : 'Confirm Paid & Issue Tax Invoice ✓'}</span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
