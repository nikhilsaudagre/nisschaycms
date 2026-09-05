'use client';

import React, { useState, useMemo, useDeferredValue, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Medicine, Patient, Doctor, Clinic, HospitalBed, InpatientMedicationOrder, InpatientServiceCharge } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Pill,
  Search,
  Plus,
  X,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Tag,
  Upload,
  Download,
  LayoutGrid,
  List,
  Building,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Info,
  Sparkles,
  FileText,
  Syringe,
  Droplets,
  Flame,
  ShieldCheck,
  ShoppingCart,
  Receipt,
  BedDouble,
  ExternalLink,
  Printer,
  Clock,
  ArrowRightLeft,
  DollarSign,
  Package,
  Layers,
  User,
  Stethoscope,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  Boxes,
  Database,
  Scissors,
  Repeat,
  FileSpreadsheet,
  Truck,
  Percent,
  Calendar,
  Wallet,
  Check,
  Zap,
  Maximize2,
  Calculator,
  Coins,
  QrCode,
  CreditCard,
  Banknote,
  History,
  Phone,
  UserCheck,
  Eye
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface InHouseStockItem {
  id: string;
  name: string;
  category: 'GENERAL_ORAL' | 'INJECTABLE_IV' | 'OT_SURGICAL' | 'EMERGENCY';
  saltComposition: string;
  batchNumber: string;
  expiryDate: string;
  currentStock: number;
  minThreshold: number;
  unitPrice: number;
  mrp: number;
  location: string;
  isScheduleH?: boolean;
  purchaseCost?: number;
}

interface PharmacyCartItem {
  id: string;
  name: string;
  dosage: string;
  saltComposition?: string;
  quantity: number;
  unitPrice: number;
  mrp?: number;
  total: number;
  batchNumber?: string;
  isScheduleH?: boolean;
  discountPercent?: number;
}

interface PharmacySalesHistoryRecord {
  id: string;
  invoiceNo: string;
  dateTime: string;
  customerType: 'WALK_IN' | 'OPD_PATIENT' | 'IPD_BED';
  patientName: string;
  patientPhone: string;
  bedNumber?: string;
  wardName?: string;
  doctorName: string;
  dispensedBy: string;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    batchNumber?: string;
    total: number;
  }[];
  subtotal: number;
  tax: number;
  discount: number;
  grandTotal: number;
  paymentMode: string;
  cashTendered?: number;
  changeReturned?: number;
}

interface ReturnToPharmacyRecord {
  id: string;
  returnDate: string;
  patientName: string;
  bedNumber?: string;
  medicineName: string;
  quantityReturned: number;
  refundRate: number;
  totalCreditAmount: number;
  reason: string;
  processedBy: string;
}

interface SupplierGrnRecord {
  id: string;
  grnNumber: string;
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  medicineName: string;
  category: string;
  batchNumber: string;
  expiryDate: string;
  billedQty: number;
  freeQty: number;
  purchaseCost: number;
  mrp: number;
  sellingRate: number;
  gstPercent: number;
  marginPercent: number;
  totalInwardCost: number;
}

export default function MedicinesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 8 Dedicated Master Hospital Pharmacy Workspaces
  const [activePharmacyTab, setActivePharmacyTab] = useState<
    'POS_TERMINAL' | 'SALES_HISTORY' | 'WARD_INDENTS' | 'IN_HOUSE_STOCK' | 'RTP_RETURNS' | 'PURCHASE_GRN' | 'OUTSIDE_RX' | 'OPEN_SOURCE_CATALOG'
  >('POS_TERMINAL');

  // In-House Stock State (Pure empty initial, loaded from local storage if saved)
  const [inHouseStock, setInHouseStock] = useState<InHouseStockItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nisschay_in_house_stock');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return [];
  });

  const [stockCategoryFilter, setStockCategoryFilter] = useState<'ALL' | 'GENERAL_ORAL' | 'INJECTABLE_IV' | 'OT_SURGICAL' | 'EMERGENCY'>('ALL');
  const [stockExpiryFilter, setStockExpiryFilter] = useState<'ALL' | 'CRITICAL_30' | 'NEAR_60' | 'WARN_90' | 'GOOD'>('ALL');
  const [stockSearchQuery, setStockSearchQuery] = useState('');

  // Restock Modal
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockTargetItem, setRestockTargetItem] = useState<InHouseStockItem | null>(null);
  const [restockQuantity, setRestockQuantity] = useState('50');

  // Stock Bulk Upload Modal
  const [showStockUploadModal, setShowStockUploadModal] = useState(false);
  const [stockUploadError, setStockUploadError] = useState<string | null>(null);
  const [stockUploadSuccess, setStockUploadSuccess] = useState<string | null>(null);

  // Add In-House Medicine Modal
  const [showAddInHouseModal, setShowAddInHouseModal] = useState(false);
  const [newStockName, setNewStockName] = useState('');
  const [newStockCategory, setNewStockCategory] = useState<'GENERAL_ORAL' | 'INJECTABLE_IV' | 'OT_SURGICAL' | 'EMERGENCY'>('GENERAL_ORAL');
  const [newStockSalt, setNewStockSalt] = useState('');
  const [newStockBatch, setNewStockBatch] = useState('');
  const [newStockQty, setNewStockQty] = useState('50');
  const [newStockMin, setNewStockMin] = useState('15');
  const [newStockPrice, setNewStockPrice] = useState('100');
  const [newStockMrp, setNewStockMrp] = useState('120');
  const [newStockCost, setNewStockCost] = useState('70');
  const [newStockLocation, setNewStockLocation] = useState('Main Pharmacy Shelf');
  const [newStockScheduleH, setNewStockScheduleH] = useState(false);

  // Sales History State (Pure empty initial)
  const [salesHistory, setSalesHistory] = useState<PharmacySalesHistoryRecord[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nisschay_pharmacy_sales_history');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return [];
  });
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'ALL' | 'WALK_IN' | 'OPD_PATIENT' | 'IPD_BED'>('ALL');
  const [selectedInvoiceToPrint, setSelectedInvoiceToPrint] = useState<PharmacySalesHistoryRecord | null>(null);

  // RTP (Return to Pharmacy) State (Pure empty initial)
  const [rtpRecords, setRtpRecords] = useState<ReturnToPharmacyRecord[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nisschay_rtp_records');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return [];
  });
  const [showRtpModal, setShowRtpModal] = useState(false);
  const [rtpSelectedBedId, setRtpSelectedBedId] = useState('');
  const [rtpMedicineName, setRtpMedicineName] = useState('');
  const [rtpQuantity, setRtpQuantity] = useState('1');
  const [rtpRefundRate, setRtpRefundRate] = useState('100');
  const [rtpReason, setRtpReason] = useState('Treatment altered by physician');

  // Supplier GRN Inwarding State (Pure empty initial)
  const [grnRecords, setGrnRecords] = useState<SupplierGrnRecord[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nisschay_grn_records');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return [];
  });
  const [showGrnModal, setShowGrnModal] = useState(false);
  const [grnSupplier, setGrnSupplier] = useState('');
  const [grnInvoiceNo, setGrnInvoiceNo] = useState('');
  const [grnMedName, setGrnMedName] = useState('');
  const [grnCategory, setGrnCategory] = useState<'GENERAL_ORAL' | 'INJECTABLE_IV' | 'OT_SURGICAL' | 'EMERGENCY'>('GENERAL_ORAL');
  const [grnSalt, setGrnSalt] = useState('');
  const [grnBatch, setGrnBatch] = useState('');
  const [grnExpiry, setGrnExpiry] = useState('');
  const [grnBilledQty, setGrnBilledQty] = useState('50');
  const [grnFreeQty, setGrnFreeQty] = useState('0');
  const [grnCost, setGrnCost] = useState('100');
  const [grnMrp, setGrnMrp] = useState('150');
  const [grnSelling, setGrnSelling] = useState('130');
  const [grnGst, setGrnGst] = useState('12');

  // Cashier Day-End Drawer Closure Modal
  const [showDrawerModal, setShowDrawerModal] = useState(false);

  // Generic Substitutes State
  const [selectedMedForSubstitutes, setSelectedMedForSubstitutes] = useState<InHouseStockItem | null>(null);

  // Bottom Live Stock & Batch Inspector State
  const [highlightedStockMed, setHighlightedStockMed] = useState<InHouseStockItem | null>(null);

  // Open-Source Global Catalog State
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  const [showAddCatalogModal, setShowAddCatalogModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // ==========================================
  // UNIVERSAL PATIENT & POS HEADER STATES
  // ==========================================
  const [posCustomerType, setPosCustomerType] = useState<'WALK_IN' | 'OPD_PATIENT' | 'IPD_BED'>('WALK_IN');
  const [posPatientName, setPosPatientName] = useState('');
  const [posPatientMobile, setPosPatientMobile] = useState('');
  const [posDoctorName, setPosDoctorName] = useState('');
  const [posBedInfo, setPosBedInfo] = useState('');
  const [posSelectedDispenser, setPosSelectedDispenser] = useState('');

  const [posPaymentMethod, setPosPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD' | 'IPD_BILL'>('UPI');
  const [posQuickCategory, setPosQuickCategory] = useState<'ALL' | 'FAST_PICKS' | 'ORAL' | 'INJECTABLE' | 'EMERGENCY'>('ALL');

  // Cashier Tendered Cash & Change Calculation
  const [cashTendered, setCashTendered] = useState<string>('');
  const [posBillDiscount, setPosBillDiscount] = useState<string>('0');

  // Auto-suggest Medicine Search in POS
  const [posSearchTerm, setPosSearchTerm] = useState('');
  const [showPosSuggestDropdown, setShowPosSuggestDropdown] = useState(false);
  const posSuggestRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // POS Cart (Clean empty initial)
  const [pharmacyCart, setPharmacyCart] = useState<PharmacyCartItem[]>([]);
  const [lastGeneratedBill, setLastGeneratedBill] = useState<{
    billNo: string;
    date: string;
    customerName: string;
    customerMobile: string;
    customerType: string;
    doctorName: string;
    dispensedBy: string;
    items: PharmacyCartItem[];
    subtotal: number;
    tax: number;
    discount: number;
    grandTotal: number;
    paymentMode: string;
    cashTendered?: number;
    changeDue?: number;
  } | null>(null);

  // Toast Notification state
  const [toastNotification, setToastNotification] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (toastNotification) {
      const timer = setTimeout(() => setToastNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastNotification]);

  // Ward Indents Sub-Tab State
  const [wardIndentSubTab, setWardIndentSubTab] = useState<'PENDING' | 'DISPENSED' | 'OUTSIDE'>('PENDING');
  const [wardIndentSearch, setWardIndentSearch] = useState('');
  const [dispensingActionId, setDispensingActionId] = useState<string | null>(null);

  // Review & Dispense Modal State
  const [reviewIndentModal, setReviewIndentModal] = useState<{
    bedId: string;
    bedNumber: string;
    wardName: string;
    patientName: string;
    patientAgeGender?: string;
    doctorName?: string;
    medication: InpatientMedicationOrder;
  } | null>(null);
  const [modalDispenseQty, setModalDispenseQty] = useState('1');
  const [modalUnitPrice, setModalUnitPrice] = useState('120');
  const [modalDiscount, setModalDiscount] = useState('0');
  const [modalDispenserName, setModalDispenserName] = useState('');
  const [modalNotes, setModalNotes] = useState('');

  // Safe helper to extract beds array
  const parseHospitalBeds = (data: any): HospitalBed[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.beds) {
      if (Array.isArray(data.beds)) return data.beds;
      if (typeof data.beds === 'string') {
        try {
          const parsed = JSON.parse(data.beds);
          if (Array.isArray(parsed)) return parsed;
        } catch {}
      }
    }
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  };

  // Fetch Hospital Data
  const [hospitalBeds, setHospitalBeds] = useState<HospitalBed[]>([]);
  useEffect(() => {
    const fetchHospitalData = async () => {
      try {
        const res = await apiClient.get<any>('/clinics/hospital-data');
        let loaded = parseHospitalBeds(res.data);
        if (loaded.length === 0) {
          const saved = localStorage.getItem('nisschay_hospital_beds');
          if (saved) {
            try { loaded = parseHospitalBeds(JSON.parse(saved)); } catch {}
          }
        }
        if (loaded.length > 0) setHospitalBeds(loaded);
      } catch {
        const saved = localStorage.getItem('nisschay_hospital_beds');
        if (saved) {
          try { setHospitalBeds(parseHospitalBeds(JSON.parse(saved))); } catch {}
        }
      }
    };
    fetchHospitalData();

    // Listen to real-time sync across hospital command center and beds
    const channel = new BroadcastChannel('nisschay_hospital_sync');
    channel.onmessage = (event) => {
      if (event.data?.type === 'HOSPITAL_DATA_UPDATED' && event.data?.beds) {
        setHospitalBeds(parseHospitalBeds(event.data.beds));
      }
    };

    return () => {
      channel.close();
    };
  }, []);

  const saveBedsToBackend = (updated: HospitalBed[]) => {
    setHospitalBeds(updated);
    try {
      localStorage.setItem('nisschay_hospital_beds', JSON.stringify(updated));
      const channel = new BroadcastChannel('nisschay_hospital_sync');
      channel.postMessage({ type: 'HOSPITAL_DATA_UPDATED', beds: updated });
      channel.close();
    } catch (e) {
      console.warn('Sync broadcast error', e);
    }
    apiClient.post('/clinics/hospital-data', { beds: JSON.stringify(updated) }).catch(() => {});
  };

  // Fetch Patients & Doctors
  const { data: patientsData } = useQuery<{ content: Patient[] }>({
    queryKey: ['patients-list'],
    queryFn: async () => {
      const res = await apiClient.get('/patients?size=100');
      return res.data;
    },
  });
  const patients = patientsData?.content || [];

  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ['doctors-list'],
    queryFn: async () => {
      const res = await apiClient.get('/doctors');
      return res.data || [];
    },
  });

  const { data: clinic } = useQuery<Clinic>({
    queryKey: ['clinic-me'],
    queryFn: async () => {
      const res = await apiClient.get('/clinics/me');
      return res.data;
    },
  });

  // Dynamic Pharmacist / Dispenser List
  const registeredPharmacists = useMemo(() => {
    const list: { id: string; name: string }[] = [];
    if (user?.name) {
      list.push({ id: 'user-current', name: `${user.name} (${user.role?.replace('ROLE_', '') || 'Staff'})` });
    }
    doctors.forEach((d) => {
      list.push({ id: `doc-${d.id}`, name: `Dr. ${d.name} (${d.specialization || 'Medical Officer'})` });
    });
    if (list.length === 0) {
      list.push({ id: 'duty-pharma', name: 'Duty Pharmacist' });
    }
    return list;
  }, [user, doctors]);

  // Sync default dispenser
  useEffect(() => {
    if (!posSelectedDispenser && registeredPharmacists.length > 0) {
      setPosSelectedDispenser(registeredPharmacists[0].name);
    }
  }, [registeredPharmacists, posSelectedDispenser]);

  // Set default highlighted stock med when in-house stock changes
  useEffect(() => {
    if (!highlightedStockMed && inHouseStock.length > 0) {
      setHighlightedStockMed(inHouseStock[0]);
    }
  }, [inHouseStock, highlightedStockMed]);

  // Handle OPD Patient Selection Auto-Fill
  const handleSelectOpdPatient = (patientId: string) => {
    const p = patients.find(pat => pat.id === patientId);
    if (p) {
      setPosPatientName(p.name || 'OPD Patient');
      setPosPatientMobile(p.phone || '');
      setPosBedInfo('');
      if (doctors.length > 0) {
        setPosDoctorName(`Dr. ${doctors[0].name} (${doctors[0].specialization || 'General Medicine'})`);
      }
    }
  };

  // Handle IPD Patient Selection Auto-Fill
  const handleSelectIpdBed = (bedId: string) => {
    const b = hospitalBeds.find(bed => bed.id === bedId);
    if (b) {
      setPosPatientName(b.patientName || 'Inpatient');
      setPosPatientMobile(b.patientPhone || 'Hospital Inpatient');
      setPosBedInfo(`Bed ${b.bedNumber} — ${b.wardName} (${b.floor})`);
      setPosDoctorName(b.consultantDoctorName || 'Attending Consultant');
    }
  };

  // Outside / Patient Own Prescriptions
  const outsidePrescriptions = useMemo(() => {
    const list: {
      bedId: string;
      bedNumber: string;
      wardName: string;
      patientName: string;
      medication: InpatientMedicationOrder;
    }[] = [];

    hospitalBeds.forEach((bed) => {
      if (bed.patientName && bed.inpatientMedications) {
        bed.inpatientMedications.forEach((med) => {
          if (med.source === 'OUTSIDE_PATIENT_OWN') {
            list.push({
              bedId: bed.id,
              bedNumber: bed.bedNumber,
              wardName: bed.wardName,
              patientName: bed.patientName || 'Inpatient',
              medication: med
            });
          }
        });
      }
    });

    return list;
  }, [hospitalBeds]);

  // Inpatient Hospital Requisition Orders - Pending Dispense
  const pendingInpatientOrders = useMemo(() => {
    const list: {
      bedId: string;
      bedNumber: string;
      wardName: string;
      patientName: string;
      patientAgeGender?: string;
      doctorName?: string;
      medication: InpatientMedicationOrder;
    }[] = [];

    hospitalBeds.forEach((bed) => {
      if (bed.patientName && bed.inpatientMedications) {
        bed.inpatientMedications.forEach((med) => {
          if (med.source !== 'OUTSIDE_PATIENT_OWN' && med.status !== 'DISPENSED' && med.status !== 'ADMINISTERED') {
            list.push({
              bedId: bed.id,
              bedNumber: bed.bedNumber,
              wardName: bed.wardName,
              patientName: bed.patientName || 'Inpatient',
              patientAgeGender: bed.patientAgeGender || 'Adult',
              doctorName: bed.consultantDoctorName || 'Attending Consultant',
              medication: med
            });
          }
        });
      }
    });

    return list;
  }, [hospitalBeds]);

  // Inpatient Hospital Requisition Orders - Dispensed History
  const dispensedInpatientOrders = useMemo(() => {
    const list: {
      bedId: string;
      bedNumber: string;
      wardName: string;
      patientName: string;
      patientAgeGender?: string;
      doctorName?: string;
      medication: InpatientMedicationOrder;
    }[] = [];

    hospitalBeds.forEach((bed) => {
      if (bed.patientName && bed.inpatientMedications) {
        bed.inpatientMedications.forEach((med) => {
          if (med.source !== 'OUTSIDE_PATIENT_OWN' && (med.status === 'DISPENSED' || med.status === 'ADMINISTERED')) {
            list.push({
              bedId: bed.id,
              bedNumber: bed.bedNumber,
              wardName: bed.wardName,
              patientName: bed.patientName || 'Inpatient',
              patientAgeGender: bed.patientAgeGender || 'Adult',
              doctorName: bed.consultantDoctorName || 'Attending Consultant',
              medication: med
            });
          }
        });
      }
    });

    return list;
  }, [hospitalBeds]);

  // Fetch Open-Source Global Catalog
  const { data: catalogData } = useQuery<{ content: Medicine[]; totalElements: number; totalPages: number }>({
    queryKey: ['medicines-catalog', catalogSearchQuery, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: (currentPage - 1).toString(),
        size: itemsPerPage.toString(),
      });
      if (catalogSearchQuery) params.append('search', catalogSearchQuery);
      const res = await apiClient.get(`/medicines?${params.toString()}`);
      return res.data;
    },
  });

  // Expiry Helper
  const getDaysUntilExpiry = (expiryDateStr: string) => {
    if (!expiryDateStr) return 999;
    try {
      const exp = new Date(expiryDateStr);
      const now = new Date();
      const diffTime = exp.getTime() - now.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return 999;
    }
  };

  // Filter In-House Stock
  const filteredInHouseStock = useMemo(() => {
    return inHouseStock.filter((item) => {
      const matchesSearch =
        !stockSearchQuery ||
        item.name.toLowerCase().includes(stockSearchQuery.toLowerCase()) ||
        item.saltComposition.toLowerCase().includes(stockSearchQuery.toLowerCase()) ||
        item.batchNumber.toLowerCase().includes(stockSearchQuery.toLowerCase());

      const matchesCat = stockCategoryFilter === 'ALL' || item.category === stockCategoryFilter;

      let matchesExpiry = true;
      const daysLeft = getDaysUntilExpiry(item.expiryDate);

      if (stockExpiryFilter === 'CRITICAL_30') matchesExpiry = daysLeft <= 30;
      else if (stockExpiryFilter === 'NEAR_60') matchesExpiry = daysLeft > 30 && daysLeft <= 60;
      else if (stockExpiryFilter === 'WARN_90') matchesExpiry = daysLeft > 60 && daysLeft <= 90;
      else if (stockExpiryFilter === 'GOOD') matchesExpiry = daysLeft > 90;

      return matchesSearch && matchesCat && matchesExpiry;
    });
  }, [inHouseStock, stockSearchQuery, stockCategoryFilter, stockExpiryFilter]);

  // Executive KPIs (Pure dynamic calculations)
  const pharmacyKPIs = useMemo(() => {
    const totalUnits = inHouseStock.reduce((acc, i) => acc + i.currentStock, 0);
    const lowStockCount = inHouseStock.filter((i) => i.currentStock > 0 && i.currentStock <= i.minThreshold).length;
    const outOfStockCount = inHouseStock.filter((i) => i.currentStock === 0).length;
    const criticalExpiryCount = inHouseStock.filter((i) => getDaysUntilExpiry(i.expiryDate) <= 30).length;
    const pendingIpdOrders = pendingInpatientOrders.length;
    const todaysBillsCount = salesHistory.length;
    const todaysSalesAmount = salesHistory.reduce((acc, s) => acc + s.grandTotal, 0);

    return { totalUnits, lowStockCount, outOfStockCount, criticalExpiryCount, pendingIpdOrders, todaysBillsCount, todaysSalesAmount };
  }, [inHouseStock, pendingInpatientOrders, salesHistory]);

  // Quick Pick Items
  const quickPickMeds = useMemo(() => {
    if (posQuickCategory === 'FAST_PICKS') {
      return inHouseStock.slice(0, 8);
    }
    if (posQuickCategory === 'ORAL') {
      return inHouseStock.filter(i => i.category === 'GENERAL_ORAL');
    }
    if (posQuickCategory === 'INJECTABLE') {
      return inHouseStock.filter(i => i.category === 'INJECTABLE_IV');
    }
    if (posQuickCategory === 'EMERGENCY') {
      return inHouseStock.filter(i => i.category === 'EMERGENCY' || i.category === 'OT_SURGICAL');
    }
    return inHouseStock.slice(0, 10);
  }, [inHouseStock, posQuickCategory]);

  // Auto-Suggest Filter for POS
  const posSuggestions = useMemo(() => {
    const query = posSearchTerm.trim().toLowerCase();
    if (!query || query.length < 1) return [];

    return inHouseStock.filter((m) =>
      m.name.toLowerCase().includes(query) ||
      m.saltComposition.toLowerCase().includes(query) ||
      m.batchNumber.toLowerCase().includes(query)
    ).slice(0, 8);
  }, [inHouseStock, posSearchTerm]);

  // Generic Substitutes
  const genericSubstitutes = useMemo(() => {
    if (!selectedMedForSubstitutes) return [];
    const targetSalt = selectedMedForSubstitutes.saltComposition.trim().toLowerCase();

    return inHouseStock.filter((item) =>
      item.id !== selectedMedForSubstitutes.id &&
      (item.saltComposition.toLowerCase().includes(targetSalt) || targetSalt.includes(item.saltComposition.toLowerCase()))
    );
  }, [inHouseStock, selectedMedForSubstitutes]);

  // Calculate live remaining stock for the inspector
  const inspectorStockInfo = useMemo(() => {
    if (!highlightedStockMed) return null;
    const cartItem = pharmacyCart.find(c => c.name === highlightedStockMed.name);
    const inCartQty = cartItem ? cartItem.quantity : 0;
    const stockAfterSale = Math.max(0, highlightedStockMed.currentStock - inCartQty);

    return {
      current: highlightedStockMed.currentStock,
      inCart: inCartQty,
      remaining: stockAfterSale
    };
  }, [highlightedStockMed, pharmacyCart]);

  // Drawer Cash Reconciliation (Pure Dynamic Computation)
  const drawerReconciliation = useMemo(() => {
    const cashCollections = salesHistory.filter(s => s.paymentMode === 'Cash' || s.paymentMode === 'CASH').reduce((a, b) => a + b.grandTotal, 0);
    const upiCollections = salesHistory.filter(s => s.paymentMode.includes('UPI')).reduce((a, b) => a + b.grandTotal, 0);
    const cardCollections = salesHistory.filter(s => s.paymentMode.includes('Card') || s.paymentMode.includes('CARD')).reduce((a, b) => a + b.grandTotal, 0);
    const totalRtpRefunds = rtpRecords.reduce((a, b) => a + b.totalCreditAmount, 0);
    const netTotal = Math.max(0, (cashCollections + upiCollections + cardCollections) - totalRtpRefunds);

    return { cashCollections, upiCollections, cardCollections, totalRtpRefunds, netTotal };
  }, [salesHistory, rtpRecords]);

  // Close auto-suggest on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (posSuggestRef.current && !posSuggestRef.current.contains(event.target as Node)) {
        setShowPosSuggestDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Add Medicine to POS Cart
  const handleAddToCart = (item: InHouseStockItem) => {
    setHighlightedStockMed(item);
    const existing = pharmacyCart.find((c) => c.name === item.name);
    if (existing) {
      setPharmacyCart(
        pharmacyCart.map((c) =>
          c.name === item.name
            ? { ...c, quantity: c.quantity + 1, total: (c.quantity + 1) * c.unitPrice }
            : c
        )
      );
    } else {
      setPharmacyCart([
        ...pharmacyCart,
        {
          id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: item.name,
          dosage: item.category === 'INJECTABLE_IV' ? 'IV / IM' : 'Oral',
          saltComposition: item.saltComposition,
          quantity: 1,
          unitPrice: item.unitPrice,
          mrp: item.mrp,
          total: item.unitPrice,
          batchNumber: item.batchNumber,
          isScheduleH: item.isScheduleH,
          discountPercent: 0
        }
      ]);
    }
    setPosSearchTerm('');
    setShowPosSuggestDropdown(false);
  };

  // Cart Calculations
  const cartFinancials = useMemo(() => {
    const subtotal = pharmacyCart.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0);
    const tax = Math.round(subtotal * 0.05); // 5% GST on Meds
    const discPercent = parseFloat(posBillDiscount) || 0;
    const discountAmount = Math.round(((subtotal + tax) * discPercent) / 100);
    const grandTotal = Math.max(0, subtotal + tax - discountAmount);

    const tenderedNum = parseFloat(cashTendered) || 0;
    const changeDue = Math.max(0, tenderedNum - grandTotal);

    return { subtotal, tax, discountAmount, grandTotal, tenderedNum, changeDue };
  }, [pharmacyCart, posBillDiscount, cashTendered]);

  // Complete POS Sale and record in history
  const handleCompleteSale = () => {
    if (pharmacyCart.length === 0) return;

    // 1. Deduct in-house stock
    const updatedStock = inHouseStock.map((stockItem) => {
      const sold = pharmacyCart.find((c) => c.name === stockItem.name);
      if (sold) {
        return { ...stockItem, currentStock: Math.max(0, stockItem.currentStock - sold.quantity) };
      }
      return stockItem;
    });
    setInHouseStock(updatedStock);
    localStorage.setItem('nisschay_in_house_stock', JSON.stringify(updatedStock));

    // 2. If IPD Bed, add to bed running bill
    if (posCustomerType === 'IPD_BED' && posBedInfo) {
      const targetBed = hospitalBeds.find((b) => posBedInfo.includes(`Bed ${b.bedNumber}`));
      if (targetBed) {
        const nowIso = new Date().toISOString();
        const newCharges: InpatientServiceCharge[] = pharmacyCart.map((c) => ({
          id: `srv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          category: 'MEDICATION',
          serviceName: `${c.name} (${c.dosage}) x${c.quantity}`,
          unitPrice: c.unitPrice,
          quantity: c.quantity,
          totalAmount: c.total,
          dateAdded: nowIso,
          notes: `Batch: ${c.batchNumber || 'POS Dispensed'} • Dispensed by: ${posSelectedDispenser}`
        }));

        const updatedBeds = hospitalBeds.map((b) =>
          b.id === targetBed.id
            ? { ...b, billingCharges: [...(b.billingCharges || []), ...newCharges] }
            : b
        );
        saveBedsToBackend(updatedBeds);
      }
    }

    const billNo = `PHARM-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();

    // 3. Create Sales History Entry
    const newSaleRecord: PharmacySalesHistoryRecord = {
      id: `sale-${Date.now()}`,
      invoiceNo: billNo,
      dateTime: nowStr,
      customerType: posCustomerType,
      patientName: posPatientName || 'Walk-In Customer',
      patientPhone: posPatientMobile || 'N/A',
      bedNumber: posBedInfo || undefined,
      doctorName: posDoctorName || 'Attending Doctor',
      dispensedBy: posSelectedDispenser || 'Duty Pharmacist',
      items: pharmacyCart.map(c => ({
        name: c.name,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
        batchNumber: c.batchNumber,
        total: c.total
      })),
      subtotal: cartFinancials.subtotal,
      tax: cartFinancials.tax,
      discount: cartFinancials.discountAmount,
      grandTotal: cartFinancials.grandTotal,
      paymentMode: posCustomerType === 'IPD_BED' ? 'Added to Inpatient Bed Ledger' : posPaymentMethod,
      cashTendered: cartFinancials.tenderedNum > 0 ? cartFinancials.tenderedNum : undefined,
      changeReturned: cartFinancials.changeDue > 0 ? cartFinancials.changeDue : undefined
    };

    const updatedHistory = [newSaleRecord, ...salesHistory];
    setSalesHistory(updatedHistory);
    localStorage.setItem('nisschay_pharmacy_sales_history', JSON.stringify(updatedHistory));

    setLastGeneratedBill({
      billNo,
      date: nowStr,
      customerName: posPatientName || 'Customer',
      customerMobile: posPatientMobile || 'N/A',
      customerType: posCustomerType,
      doctorName: posDoctorName || 'Doctor',
      dispensedBy: posSelectedDispenser || 'Pharmacist',
      items: [...pharmacyCart],
      subtotal: cartFinancials.subtotal,
      tax: cartFinancials.tax,
      discount: cartFinancials.discountAmount,
      grandTotal: cartFinancials.grandTotal,
      paymentMode: posCustomerType === 'IPD_BED' ? 'Added to Inpatient Bed Ledger' : posPaymentMethod,
      cashTendered: cartFinancials.tenderedNum > 0 ? cartFinancials.tenderedNum : undefined,
      changeDue: cartFinancials.changeDue > 0 ? cartFinancials.changeDue : undefined
    });

    setPharmacyCart([]);
    setCashTendered('');
  };

  // Open Ward Indent Review & Dispense Modal
  const openWardIndentReview = (ord: {
    bedId: string;
    bedNumber: string;
    wardName: string;
    patientName: string;
    patientAgeGender?: string;
    doctorName?: string;
    medication: InpatientMedicationOrder;
  }) => {
    setReviewIndentModal(ord);
    const matched = inHouseStock.find(
      (s) =>
        s.name.toLowerCase().includes(ord.medication.medicineName.toLowerCase()) ||
        ord.medication.medicineName.toLowerCase().includes(s.name.toLowerCase())
    );
    const price = ord.medication.price || matched?.unitPrice || matched?.mrp || 120;
    setModalUnitPrice(price.toString());
    setModalDispenseQty('1');
    setModalDiscount('0');
    setModalDispenserName(posSelectedDispenser || (user?.name ? `${user.name} (Pharmacist)` : 'Duty Pharmacist'));
    setModalNotes(ord.medication.notes || '');
  };

  // Confirm Dispense from Modal with Full Financial & Inventory Logging
  const handleConfirmModalDispense = () => {
    if (!reviewIndentModal) return;
    const { bedId, medication, bedNumber, patientName } = reviewIndentModal;
    const medName = medication.medicineName;
    const qty = Math.max(1, parseInt(modalDispenseQty) || 1);
    const unitPrice = Math.max(0, parseFloat(modalUnitPrice) || 0);
    const discount = Math.max(0, parseFloat(modalDiscount) || 0);
    const netTotal = Math.max(0, qty * unitPrice - discount);
    const dispenserName = modalDispenserName.trim() || posSelectedDispenser || (user?.name ? `${user.name} (Pharmacist)` : 'Duty Pharmacist');
    const nowIso = new Date().toISOString();
    const invoiceNo = `IND-DISP-${Date.now().toString().slice(-6)}`;

    setDispensingActionId(medication.id);

    // Match in-house stock item
    const matchedStock = inHouseStock.find(
      (s) => s.name.toLowerCase().includes(medName.toLowerCase()) || medName.toLowerCase().includes(s.name.toLowerCase())
    );
    const batchNumber = matchedStock?.batchNumber || `B-${Math.floor(1000 + Math.random() * 9000)}`;

    // Deduct stock if in stock
    if (matchedStock && matchedStock.currentStock > 0) {
      const updatedStock = inHouseStock.map((s) =>
        s.id === matchedStock.id
          ? { ...s, currentStock: Math.max(0, s.currentStock - qty) }
          : s
      );
      setInHouseStock(updatedStock);
      localStorage.setItem('nisschay_in_house_stock', JSON.stringify(updatedStock));
    }

    // Update bed record
    const updatedBeds = hospitalBeds.map((b) => {
      if (b.id === bedId) {
        const updatedMeds = (b.inpatientMedications || []).map((m) => {
          if (m.id === medication.id) {
            return {
              ...m,
              status: 'DISPENSED' as const,
              dispensedBy: dispenserName,
              dispatchedAt: nowIso,
              invoiceNo: invoiceNo,
              price: netTotal,
              notes: modalNotes ? `${m.notes ? m.notes + ' • ' : ''}${modalNotes}` : m.notes
            };
          }
          return m;
        });

        const newCharge: InpatientServiceCharge = {
          id: `srv-med-${Date.now()}`,
          category: 'MEDICATION',
          serviceName: `Ward Pharmacy Dispensed: ${medName} (Qty: ${qty}, Batch: ${batchNumber})`,
          unitPrice: unitPrice,
          quantity: qty,
          totalAmount: netTotal,
          dateAdded: nowIso,
          notes: `Indent Ref #${invoiceNo} • Dispensed By: ${dispenserName}${discount > 0 ? ` (Discount: ₹${discount})` : ''}`
        };

        return {
          ...b,
          inpatientMedications: updatedMeds,
          billingCharges: [...(b.billingCharges || []), newCharge]
        };
      }
      return b;
    });

    saveBedsToBackend(updatedBeds);
    setDispensingActionId(null);
    setReviewIndentModal(null);

    setToastNotification({
      type: 'success',
      title: 'Dispensed Successfully! 💊',
      message: `✓ Dispensed "${medName}" (x${qty}) for Bed ${bedNumber} (${patientName}). ₹${netTotal} billed to Bed Ledger by ${dispenserName}.`
    });
  };

  // Mark for Outside Patient-Arranged from Modal
  const handleModalMarkOutside = () => {
    if (!reviewIndentModal) return;
    const { bedId, medication, bedNumber, patientName } = reviewIndentModal;
    const updatedBeds = hospitalBeds.map((bed) => {
      if (bed.id === bedId) {
        const updatedMeds = (bed.inpatientMedications || []).map((m) =>
          m.id === medication.id ? { ...m, source: 'OUTSIDE_PATIENT_OWN' as const, status: 'SELF_PROVIDED' as const } : m
        );
        return {
          ...bed,
          inpatientMedications: updatedMeds
        };
      }
      return bed;
    });
    saveBedsToBackend(updatedBeds);
    setReviewIndentModal(null);
    setToastNotification({
      type: 'info',
      title: 'Marked for Outside Purchase',
      message: `"${medication.medicineName}" for Bed ${bedNumber} (${patientName}) designated for patient attendant outside purchase.`
    });
  };

  // Keep in Queue (Awaiting Stock Inward) from Modal
  const handleModalKeepAwaitingStock = () => {
    if (!reviewIndentModal) return;
    const { bedId, medication, bedNumber } = reviewIndentModal;
    const updatedBeds = hospitalBeds.map((bed) => {
      if (bed.id === bedId) {
        const updatedMeds = (bed.inpatientMedications || []).map((m) =>
          m.id === medication.id ? { ...m, notes: `${m.notes ? m.notes + ' • ' : ''}Awaiting Pharmacy Stock Inward` } : m
        );
        return {
          ...bed,
          inpatientMedications: updatedMeds
        };
      }
      return bed;
    });
    saveBedsToBackend(updatedBeds);
    setReviewIndentModal(null);
    setToastNotification({
      type: 'info',
      title: 'Queued as Awaiting Stock',
      message: `"${medication.medicineName}" for Bed ${bedNumber} marked as 'Awaiting Pharmacy Stock Inward'.`
    });
  };

  // Direct Dispense Inpatient Order (Fallback)
  const handleDispenseInpatientOrder = (bedId: string, medId: string, medName: string) => {
    setDispensingActionId(medId);

    // Find matching in-house stock item if available
    const matchedStock = inHouseStock.find(
      (s) => s.name.toLowerCase().includes(medName.toLowerCase()) || medName.toLowerCase().includes(s.name.toLowerCase())
    );
    const unitPrice = matchedStock?.unitPrice || matchedStock?.mrp || 120;
    const batchNumber = matchedStock?.batchNumber || `B-${Math.floor(1000 + Math.random() * 9000)}`;
    const invoiceNo = `IND-DISP-${Date.now().toString().slice(-6)}`;
    const dispenserName = posSelectedDispenser || (user?.name ? `${user.name} (Pharmacist)` : 'Duty Pharmacist');
    const nowIso = new Date().toISOString();

    // Deduct stock if matched in inventory
    if (matchedStock && matchedStock.currentStock > 0) {
      const updatedStock = inHouseStock.map((s) =>
        s.id === matchedStock.id
          ? { ...s, currentStock: Math.max(0, s.currentStock - 1) }
          : s
      );
      setInHouseStock(updatedStock);
      localStorage.setItem('nisschay_in_house_stock', JSON.stringify(updatedStock));
    }

    let targetBedNumber = '';
    let targetPatientName = '';

    const updatedBeds = hospitalBeds.map((b) => {
      if (b.id === bedId) {
        targetBedNumber = b.bedNumber;
        targetPatientName = b.patientName || 'Inpatient';

        // Update medication order status to DISPENSED
        const updatedMeds = (b.inpatientMedications || []).map((m) => {
          if (m.id === medId) {
            return {
              ...m,
              status: 'DISPENSED' as const,
              dispensedBy: dispenserName,
              dispatchedAt: nowIso,
              invoiceNo: invoiceNo,
              price: m.price || unitPrice
            };
          }
          return m;
        });

        // Add billing charge for bed ledger
        const newCharge: InpatientServiceCharge = {
          id: `srv-med-${Date.now()}`,
          category: 'MEDICATION',
          serviceName: `Ward Pharmacy Dispensed: ${medName} (Batch: ${batchNumber})`,
          unitPrice: unitPrice,
          quantity: 1,
          totalAmount: unitPrice,
          dateAdded: nowIso,
          notes: `Indent Ref #${invoiceNo} Dispensed by: ${dispenserName}`
        };

        return {
          ...b,
          inpatientMedications: updatedMeds,
          billingCharges: [...(b.billingCharges || []), newCharge]
        };
      }
      return b;
    });

    saveBedsToBackend(updatedBeds);
    setDispensingActionId(null);

    // Trigger clear on-screen success toast
    setToastNotification({
      type: 'success',
      title: 'Medication Dispensed to Ward',
      message: `✓ Successfully dispensed "${medName}" for Bed ${targetBedNumber} (${targetPatientName}). Stock deducted and +₹${unitPrice} billed to Bed Ledger.`
    });
  };

  // Switch Outside Med to Hospital
  const handleSwitchOutsideToHospital = (bedId: string, medId: string, medName: string) => {
    let targetBedNumber = '';
    let targetPatientName = '';

    const updatedBeds = hospitalBeds.map((bed) => {
      if (bed.id === bedId) {
        targetBedNumber = bed.bedNumber;
        targetPatientName = bed.patientName || 'Inpatient';
        const updatedMeds = (bed.inpatientMedications || []).map((m) =>
          m.id === medId ? { ...m, source: 'HOSPITAL_PHARMACY' as const, status: 'QUEUED_PHARMACY' as const } : m
        );
        return {
          ...bed,
          inpatientMedications: updatedMeds
        };
      }
      return bed;
    });

    saveBedsToBackend(updatedBeds);

    setToastNotification({
      type: 'info',
      title: 'Converted to Hospital Requisition',
      message: `"${medName}" for Bed ${targetBedNumber} (${targetPatientName}) is now queued in Hospital Ward Indents for pharmacy dispensing.`
    });
  };

  // Restock In-House Item
  const handleConfirmRestock = () => {
    if (!restockTargetItem) return;
    const qty = parseInt(restockQuantity) || 0;
    if (qty <= 0) return;

    const updated = inHouseStock.map((i) =>
      i.id === restockTargetItem.id ? { ...i, currentStock: i.currentStock + qty } : i
    );
    setInHouseStock(updated);
    localStorage.setItem('nisschay_in_house_stock', JSON.stringify(updated));
    setShowRestockModal(false);
    setRestockTargetItem(null);
  };

  // Add New In-House Medicine
  const handleAddInHouseStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStockName.trim()) return;

    const newItem: InHouseStockItem = {
      id: `stk-${Date.now()}`,
      name: newStockName.trim(),
      category: newStockCategory,
      saltComposition: newStockSalt.trim() || 'Active Formulation',
      batchNumber: newStockBatch.trim() || `B-${Math.floor(1000 + Math.random() * 9000)}`,
      expiryDate: '2027-12-31',
      currentStock: parseInt(newStockQty) || 50,
      minThreshold: parseInt(newStockMin) || 15,
      unitPrice: parseFloat(newStockPrice) || 100,
      mrp: parseFloat(newStockMrp) || 120,
      purchaseCost: parseFloat(newStockCost) || 70,
      location: newStockLocation.trim() || 'Pharmacy Main Shelf',
      isScheduleH: newStockScheduleH
    };

    const updated = [newItem, ...inHouseStock];
    setInHouseStock(updated);
    localStorage.setItem('nisschay_in_house_stock', JSON.stringify(updated));

    setShowAddInHouseModal(false);
    setNewStockName('');
    setNewStockSalt('');
  };

  // Process Return to Pharmacy (RTP)
  const handleProcessRtp = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(rtpQuantity) || 0;
    const rate = parseFloat(rtpRefundRate) || 0;
    if (qty <= 0 || !rtpMedicineName.trim()) return;

    const totalCredit = qty * rate;
    const today = new Date().toISOString().split('T')[0];

    const targetBed = hospitalBeds.find((b) => b.id === rtpSelectedBedId);
    const patientName = targetBed?.patientName || 'Discharged Inpatient';
    const bedNum = targetBed?.bedNumber || 'Ward';

    const updatedStock = inHouseStock.map((item) =>
      item.name.toLowerCase().includes(rtpMedicineName.toLowerCase()) || rtpMedicineName.toLowerCase().includes(item.name.toLowerCase())
        ? { ...item, currentStock: item.currentStock + qty }
        : item
    );
    setInHouseStock(updatedStock);
    localStorage.setItem('nisschay_in_house_stock', JSON.stringify(updatedStock));

    if (rtpSelectedBedId) {
      const nowIso = new Date().toISOString();
      const creditCharge: InpatientServiceCharge = {
        id: `srv-rtp-credit-${Date.now()}`,
        category: 'MEDICATION',
        serviceName: `[RETURN CREDIT] ${rtpMedicineName} x${qty}`,
        unitPrice: -rate,
        quantity: qty,
        totalAmount: -totalCredit,
        dateAdded: nowIso,
        notes: `RTP Return Reason: ${rtpReason}`
      };

      const updatedBeds = hospitalBeds.map((b) =>
        b.id === rtpSelectedBedId
          ? { ...b, billingCharges: [...(b.billingCharges || []), creditCharge] }
          : b
      );
      saveBedsToBackend(updatedBeds);
    }

    const newRecord: ReturnToPharmacyRecord = {
      id: `rtp-${Date.now()}`,
      returnDate: today,
      patientName: `${patientName} (Bed ${bedNum})`,
      bedNumber: bedNum,
      medicineName: rtpMedicineName,
      quantityReturned: qty,
      refundRate: rate,
      totalCreditAmount: totalCredit,
      reason: rtpReason,
      processedBy: posSelectedDispenser || 'Duty Pharmacist'
    };

    const updatedLogs = [newRecord, ...rtpRecords];
    setRtpRecords(updatedLogs);
    localStorage.setItem('nisschay_rtp_records', JSON.stringify(updatedLogs));

    setShowRtpModal(false);
    setRtpMedicineName('');
  };

  // Process Supplier GRN Inwarding
  const handleProcessGrn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!grnMedName.trim()) return;

    const billed = parseInt(grnBilledQty) || 0;
    const free = parseInt(grnFreeQty) || 0;
    const totalUnits = billed + free;
    const cost = parseFloat(grnCost) || 0;
    const mrp = parseFloat(grnMrp) || 0;
    const selling = parseFloat(grnSelling) || 0;
    const gst = parseFloat(grnGst) || 12;
    const totalInward = billed * cost;
    const margin = selling > 0 ? Math.round(((selling - cost) / selling) * 100 * 100) / 100 : 0;

    const grnNo = `GRN-${Date.now().toString().slice(-6)}`;
    const today = new Date().toISOString().split('T')[0];

    const existingStock = inHouseStock.find((s) => s.name.toLowerCase() === grnMedName.toLowerCase());
    let updatedStock: InHouseStockItem[];

    if (existingStock) {
      updatedStock = inHouseStock.map((s) =>
        s.id === existingStock.id
          ? {
              ...s,
              currentStock: s.currentStock + totalUnits,
              batchNumber: grnBatch || s.batchNumber,
              expiryDate: grnExpiry || s.expiryDate,
              unitPrice: selling,
              mrp: mrp,
              purchaseCost: cost
            }
          : s
      );
    } else {
      const newItem: InHouseStockItem = {
        id: `stk-${Date.now()}`,
        name: grnMedName.trim(),
        category: grnCategory,
        saltComposition: grnSalt.trim() || 'Active Formulation',
        batchNumber: grnBatch || `B-${Math.floor(1000 + Math.random() * 9000)}`,
        expiryDate: grnExpiry || '2027-12-31',
        currentStock: totalUnits,
        minThreshold: 20,
        unitPrice: selling,
        mrp: mrp,
        purchaseCost: cost,
        location: 'Main Pharmacy Warehouse',
        isScheduleH: true
      };
      updatedStock = [newItem, ...inHouseStock];
    }

    setInHouseStock(updatedStock);
    localStorage.setItem('nisschay_in_house_stock', JSON.stringify(updatedStock));

    const newGrn: SupplierGrnRecord = {
      id: `grn-${Date.now()}`,
      grnNumber: grnNo,
      supplierName: grnSupplier || 'Direct Supplier',
      invoiceNumber: grnInvoiceNo || 'INV-' + Date.now().toString().slice(-4),
      invoiceDate: today,
      medicineName: grnMedName,
      category: grnCategory,
      batchNumber: grnBatch,
      expiryDate: grnExpiry,
      billedQty: billed,
      freeQty: free,
      purchaseCost: cost,
      mrp: mrp,
      sellingRate: selling,
      gstPercent: gst,
      marginPercent: margin,
      totalInwardCost: totalInward
    };

    const updatedGrnList = [newGrn, ...grnRecords];
    setGrnRecords(updatedGrnList);
    localStorage.setItem('nisschay_grn_records', JSON.stringify(updatedGrnList));

    setShowGrnModal(false);
    setGrnMedName('');
  };

  // Download Standard CSV Template
  const downloadStandardStockTemplate = () => {
    const headers = 'MedicineName,Category,SaltComposition,BatchNumber,ExpiryDate,CurrentStock,MinThreshold,UnitPrice,MRP,Location\n';
    const sampleRows = [
      'Inj. Pantocid 40mg IV,INJECTABLE_IV,Pantoprazole (40mg),B-9021,2027-04-30,50,15,120,145,Ward Refrigerator',
      'Tab. Augmentin 625 Duo,GENERAL_ORAL,Amoxicillin + Clavulanic Acid,B-4112,2026-11-30,40,20,180,215,Rack A-3',
      'Inj. Ceftriaxone 1gm IV/IM,INJECTABLE_IV,Ceftriaxone Sodium,B-7822,2027-01-15,60,20,140,165,Rack B-1',
      'Tab. Dolo 650mg,GENERAL_ORAL,Paracetamol (650mg),B-1190,2027-08-31,120,30,35,42,Rack A-1',
      'Inj. Propofol 1% 20ml,OT_SURGICAL,Propofol (10mg/ml),OT-802,2026-10-31,20,10,350,420,OT Safe Vault',
      'Inj. Adrenaline (1:1000) 1ml,EMERGENCY,Epinephrine (1mg/ml),EM-102,2027-06-30,30,10,45,60,Emergency Crash Cart'
    ].join('\n');

    const blob = new Blob([headers + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'hospital_pharmacy_stock_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Stock File Upload Handler
  const handleStockFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStockUploadError(null);
    setStockUploadSuccess(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        let newItems: InHouseStockItem[] = [];

        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            newItems = parsed.map((item: any, idx: number) => ({
              id: `stk-${Date.now()}-${idx}`,
              name: item.name || item.MedicineName || 'Medicine',
              category: item.category || item.Category || 'GENERAL_ORAL',
              saltComposition: item.saltComposition || item.SaltComposition || 'Standard',
              batchNumber: item.batchNumber || item.BatchNumber || `B-${Math.floor(1000 + Math.random() * 9000)}`,
              expiryDate: item.expiryDate || item.ExpiryDate || '2027-12-31',
              currentStock: parseInt(item.currentStock || item.CurrentStock) || 50,
              minThreshold: parseInt(item.minThreshold || item.MinThreshold) || 15,
              unitPrice: parseFloat(item.unitPrice || item.UnitPrice) || 100,
              mrp: parseFloat(item.mrp || item.MRP) || 120,
              location: item.location || item.Location || 'Main Pharmacy Rack',
              isScheduleH: true
            }));
          }
        } else {
          const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
          if (lines.length <= 1) {
            setStockUploadError('CSV file is empty or missing data rows.');
            return;
          }

          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
            if (cols.length >= 1 && cols[0]) {
              newItems.push({
                id: `stk-${Date.now()}-${i}`,
                name: cols[0],
                category: (cols[1] as any) || 'GENERAL_ORAL',
                saltComposition: cols[2] || 'Active Formulation',
                batchNumber: cols[3] || `B-${Math.floor(1000 + Math.random() * 9000)}`,
                expiryDate: cols[4] || '2027-12-31',
                currentStock: parseInt(cols[5]) || 50,
                minThreshold: parseInt(cols[6]) || 15,
                unitPrice: parseFloat(cols[7]) || 100,
                mrp: parseFloat(cols[8]) || 120,
                location: cols[9] || 'Main Pharmacy Rack',
                isScheduleH: true
              });
            }
          }
        }

        if (newItems.length === 0) {
          setStockUploadError('Could not find valid medicine stock rows in the file.');
          return;
        }

        const updated = [...newItems, ...inHouseStock];
        setInHouseStock(updated);
        localStorage.setItem('nisschay_in_house_stock', JSON.stringify(updated));
        setStockUploadSuccess(`Successfully ingested ${newItems.length} medicine stock items into Hospital Pharmacy!`);
      } catch (err: any) {
        setStockUploadError('Failed to parse file: ' + err.message);
      }
    };

    reader.readAsText(file);
  };

  // Filtered Sales History
  const filteredSalesHistory = useMemo(() => {
    return salesHistory.filter(s => {
      const matchesSearch = !historySearchTerm ||
        s.invoiceNo.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
        s.patientName.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
        s.patientPhone.includes(historySearchTerm) ||
        s.doctorName.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
        s.dispensedBy.toLowerCase().includes(historySearchTerm.toLowerCase());

      const matchesType = historyTypeFilter === 'ALL' || s.customerType === historyTypeFilter;

      return matchesSearch && matchesType;
    });
  }, [salesHistory, historySearchTerm, historyTypeFilter]);

  return (
    <div className="space-y-4 font-sans min-w-0">
      {/* FLOATING SUCCESS / ACTION TOAST NOTIFICATION POPUP */}
      {toastNotification && (
        <div className="fixed top-5 right-5 z-[9999] max-w-md w-[calc(100%-2.5rem)] sm:w-auto animate-in slide-in-from-top-4 fade-in duration-200">
          <div
            className={`p-4 rounded-2xl border flex items-start justify-between gap-3 shadow-2xl backdrop-blur-md ${
              toastNotification.type === 'success'
                ? 'bg-emerald-950/95 text-white border-emerald-500/50 ring-1 ring-emerald-500/30'
                : toastNotification.type === 'error'
                ? 'bg-rose-950/95 text-white border-rose-500/50 ring-1 ring-rose-500/30'
                : 'bg-cyan-950/95 text-white border-cyan-500/50 ring-1 ring-cyan-500/30'
            }`}
          >
            <div className="flex items-start gap-3">
              {toastNotification.type === 'success' && (
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Check className="w-5 h-5 stroke-[3]" />
                </div>
              )}
              {toastNotification.type === 'error' && (
                <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <AlertCircle className="w-5 h-5 stroke-[3]" />
                </div>
              )}
              {toastNotification.type === 'info' && (
                <div className="w-8 h-8 rounded-xl bg-cyan-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Info className="w-5 h-5 stroke-[3]" />
                </div>
              )}
              <div>
                <h4 className="text-sm font-black tracking-tight">{toastNotification.title}</h4>
                <p className="text-xs mt-0.5 text-slate-200 leading-relaxed font-medium">{toastNotification.message}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setToastNotification(null)}
              className="text-white/60 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 1. TOP EXECUTIVE PHARMACY HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-[#E8EEF2] shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#087F8C] to-[#065A63] text-white flex items-center justify-center font-bold shadow-xs">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-[#172B34] tracking-tight">
              Hospital Pharmacy & Clinical Inventory Hub
            </h1>
            <p className="text-xs text-[#567781] mt-0.5">
              Live Stock POS, Universal OPD/IPD Auto-Fill, Sales History & Ward Requisitions.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowDrawerModal(true)}
            className="text-xs font-bold rounded-xl h-8.5 border-[#E8EEF2] bg-[#F6F9FB] text-[#172B34] hover:bg-slate-100 cursor-pointer shadow-2xs flex items-center gap-1.5"
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cash Drawer (Day-End)</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setShowAddInHouseModal(true)}
            className="bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs rounded-xl h-8.5 px-3.5 border-0 cursor-pointer shadow-xs flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Medicine</span>
          </Button>
        </div>
      </div>

      {/* 2. EXECUTIVE PHARMACY KPIS (6 DYNAMIC METRICS) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 bg-white rounded-2xl border border-[#E8EEF2] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[#567781]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Storage Stock</span>
            <Package className="w-3.5 h-3.5 text-[#087F8C]" />
          </div>
          <div className="text-lg font-black text-[#172B34] font-mono">
            {pharmacyKPIs.totalUnits} <span className="text-[11px] font-normal text-[#567781]">Units</span>
          </div>
          <span className="text-[10px] text-[#567781] block">{inHouseStock.length} Formulations</span>
        </div>

        <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-[10px] font-bold uppercase tracking-wider">Low Stock</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-lg font-black text-amber-900 font-mono">
            {pharmacyKPIs.lowStockCount} <span className="text-[11px] font-normal text-amber-800">Batches</span>
          </div>
          <span className="text-[10px] text-amber-700 block font-medium">Reorder Alert</span>
        </div>

        <div className="p-3 bg-rose-50/60 rounded-2xl border border-rose-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-rose-800">
            <span className="text-[10px] font-bold uppercase tracking-wider">Out of Stock</span>
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-lg font-black text-rose-900 font-mono">
            {pharmacyKPIs.outOfStockCount} <span className="text-[11px] font-normal text-rose-800">Items</span>
          </div>
          <span className="text-[10px] text-rose-700 block font-medium">Restock Req.</span>
        </div>

        <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-purple-800">
            <span className="text-[10px] font-bold uppercase tracking-wider">Near Expiry (&lt;30d)</span>
            <Calendar className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-lg font-black text-purple-900 font-mono">
            {pharmacyKPIs.criticalExpiryCount} <span className="text-[11px] font-normal text-purple-800">Batches</span>
          </div>
          <span className="text-[10px] text-purple-700 block font-medium">FEFO Prioritized</span>
        </div>

        <div className="p-3 bg-white rounded-2xl border border-[#E8EEF2] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[#567781]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Ward Indents</span>
            <BedDouble className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-lg font-black text-rose-700 font-mono">
            {pharmacyKPIs.pendingIpdOrders} <span className="text-[11px] font-normal text-[#567781]">Pending</span>
          </div>
          <span className="text-[10px] text-[#567781] block">Dedicated Ward Tab</span>
        </div>

        <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[10px] font-bold uppercase tracking-wider">Sales Revenue</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-lg font-black text-emerald-900 font-mono">
            ₹{pharmacyKPIs.todaysSalesAmount.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-emerald-700 block font-medium">{pharmacyKPIs.todaysBillsCount} Invoices Settled</span>
        </div>
      </div>

      {/* 3. 8 MASTER WORKSPACE TABS */}
      <div className="flex items-center gap-1 bg-[#F6F9FB] p-1.5 rounded-2xl border border-[#E8EEF2] overflow-x-auto scrollbar-none shadow-2xs">
        <button
          type="button"
          onClick={() => setActivePharmacyTab('POS_TERMINAL')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activePharmacyTab === 'POS_TERMINAL'
              ? 'bg-[#087F8C] text-white shadow-2xs'
              : 'text-[#567781] hover:text-[#172B34]'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>1. POS Terminal & Cashier</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePharmacyTab('SALES_HISTORY')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activePharmacyTab === 'SALES_HISTORY'
              ? 'bg-[#172B34] text-white shadow-2xs'
              : 'text-[#567781] hover:text-[#172B34]'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>2. Sales History ({salesHistory.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePharmacyTab('WARD_INDENTS')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activePharmacyTab === 'WARD_INDENTS'
              ? 'bg-rose-700 text-white shadow-2xs'
              : 'text-[#567781] hover:text-[#172B34]'
          }`}
        >
          <BedDouble className="w-3.5 h-3.5" />
          <span>3. Ward Indents ({pendingInpatientOrders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePharmacyTab('IN_HOUSE_STOCK')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activePharmacyTab === 'IN_HOUSE_STOCK'
              ? 'bg-[#087F8C] text-white shadow-2xs'
              : 'text-[#567781] hover:text-[#172B34]'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>4. In-House Stock ({inHouseStock.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePharmacyTab('RTP_RETURNS')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activePharmacyTab === 'RTP_RETURNS'
              ? 'bg-rose-700 text-white shadow-2xs'
              : 'text-[#567781] hover:text-[#172B34]'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>5. RTP Credits ({rtpRecords.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePharmacyTab('PURCHASE_GRN')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activePharmacyTab === 'PURCHASE_GRN'
              ? 'bg-indigo-700 text-white shadow-2xs'
              : 'text-[#567781] hover:text-[#172B34]'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>6. Supplier GRN ({grnRecords.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePharmacyTab('OUTSIDE_RX')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activePharmacyTab === 'OUTSIDE_RX'
              ? 'bg-amber-600 text-white shadow-2xs'
              : 'text-[#567781] hover:text-[#172B34]'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>7. Outside Rx ({outsidePrescriptions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePharmacyTab('OPEN_SOURCE_CATALOG')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activePharmacyTab === 'OPEN_SOURCE_CATALOG'
              ? 'bg-[#172B34] text-white shadow-2xs'
              : 'text-[#567781] hover:text-[#172B34]'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>8. Formulations</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: 50-50 SPLIT POS COCKPIT WITH BOTTOM LIVE STOCK INSPECTOR          */}
      {/* ========================================================================= */}
      {activePharmacyTab === 'POS_TERMINAL' && (
        <div className="space-y-3.5">
          {/* Universal Single-Format Patient & Pharmacist Header */}
          <div className="bg-white p-4 rounded-2xl border border-[#E8EEF2] shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8EEF2] pb-2.5">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#087F8C]" />
                <h3 className="text-xs font-bold text-[#172B34] uppercase tracking-wider">
                  Patient & Dispensing Authority Details
                </h3>
              </div>

              {/* Patient Category Switcher */}
              <div className="flex items-center gap-1 bg-[#F6F9FB] p-0.5 rounded-xl border border-[#E8EEF2]">
                <button
                  type="button"
                  onClick={() => {
                    setPosCustomerType('WALK_IN');
                    setPosPatientName('');
                    setPosPatientMobile('');
                    setPosBedInfo('');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    posCustomerType === 'WALK_IN' ? 'bg-[#172B34] text-white shadow-2xs' : 'text-[#567781]'
                  }`}
                >
                  Walk-In Retail
                </button>
                <button
                  type="button"
                  onClick={() => setPosCustomerType('OPD_PATIENT')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    posCustomerType === 'OPD_PATIENT' ? 'bg-[#087F8C] text-white shadow-2xs' : 'text-[#567781]'
                  }`}
                >
                  OPD Consultation
                </button>
                <button
                  type="button"
                  onClick={() => setPosCustomerType('IPD_BED')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    posCustomerType === 'IPD_BED' ? 'bg-rose-700 text-white shadow-2xs' : 'text-[#567781]'
                  }`}
                >
                  Inpatient Bed
                </button>
              </div>
            </div>

            {/* Universal Form Fields (Patient Name, Mobile, Doctor, Dispensing Pharmacist) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Field 1: Patient Name (or Search Select) */}
              <div className="space-y-1">
                <label className="font-bold text-[#172B34] block">Patient / Customer Name *</label>
                {posCustomerType === 'WALK_IN' && (
                  <input
                    type="text"
                    value={posPatientName}
                    onChange={(e) => setPosPatientName(e.target.value)}
                    placeholder="Enter customer name"
                    className="w-full h-8.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs font-semibold"
                  />
                )}
                {posCustomerType === 'OPD_PATIENT' && (
                  <select
                    onChange={(e) => handleSelectOpdPatient(e.target.value)}
                    className="w-full h-8.5 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs font-bold text-[#087F8C] cursor-pointer"
                  >
                    <option value="">-- Search & Choose OPD Patient --</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>
                    ))}
                  </select>
                )}
                {posCustomerType === 'IPD_BED' && (
                  <select
                    onChange={(e) => handleSelectIpdBed(e.target.value)}
                    className="w-full h-8.5 px-2.5 bg-[#F6F9FB] border border-rose-200 rounded-xl text-xs font-bold text-rose-900 cursor-pointer"
                  >
                    <option value="">-- Search & Choose Admitted Bed --</option>
                    {hospitalBeds.filter(b => b.patientName).map(b => (
                      <option key={b.id} value={b.id}>
                        {b.patientName} (Bed {b.bedNumber} - {b.wardName})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Field 2: Mobile Number */}
              <div className="space-y-1">
                <label className="font-bold text-[#172B34] block">Mobile Phone Number *</label>
                <input
                  type="text"
                  value={posPatientMobile}
                  onChange={(e) => setPosPatientMobile(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full h-8.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs font-mono font-bold"
                />
              </div>

              {/* Field 3: Prescribing Doctor / Admitted Bed Info */}
              <div className="space-y-1">
                <label className="font-bold text-[#172B34] block">
                  {posCustomerType === 'IPD_BED' ? 'Bed & Doctor Info *' : 'Prescribing Doctor *'}
                </label>
                <input
                  type="text"
                  value={posBedInfo ? `${posBedInfo} • ${posDoctorName}` : posDoctorName}
                  onChange={(e) => setPosDoctorName(e.target.value)}
                  placeholder="Doctor Name"
                  className="w-full h-8.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs text-[#172B34]"
                />
              </div>

              {/* Field 4: Who is Giving Medicine (Pre-registered Pharmacists) */}
              <div className="space-y-1">
                <label className="font-bold text-[#172B34] block">Dispensing Pharmacist *</label>
                <select
                  value={posSelectedDispenser}
                  onChange={(e) => setPosSelectedDispenser(e.target.value)}
                  className="w-full h-8.5 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs font-bold text-emerald-800 cursor-pointer"
                >
                  {registeredPharmacists.map(ph => (
                    <option key={ph.id} value={ph.name}>{ph.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 50-50 SPLIT SCREEN: LEFT = MEDICINE SELECTION & INSPECTOR | RIGHT = BILLING TERMINAL */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* ========================================================================= */}
            {/* LEFT HALF (6/12): SEARCH, QUICK-PICK GRID & BOTTOM LIVE STOCK INSPECTOR */}
            {/* ========================================================================= */}
            <div className="lg:col-span-6 space-y-3.5">
              {/* Smart Search Bar */}
              <div className="bg-white p-3.5 rounded-2xl border border-[#E8EEF2] shadow-2xs space-y-2.5 relative" ref={posSuggestRef}>
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#172B34] text-xs flex items-center gap-1.5">
                    <Search className="w-4 h-4 text-[#087F8C]" />
                    <span>Search Medicine / Salt (Type to Auto-Suggest)</span>
                  </label>
                  <span className="text-[10px] text-[#567781]">FEFO Prioritized</span>
                </div>

                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Type name e.g. Paracetamol, Pantoprazole, Ceftriaxone..."
                    value={posSearchTerm}
                    onChange={(e) => {
                      setPosSearchTerm(e.target.value);
                      setShowPosSuggestDropdown(true);
                    }}
                    onFocus={() => setShowPosSuggestDropdown(true)}
                    className="w-full h-9 pl-3 pr-8 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs text-[#172B34] font-medium focus:outline-none focus:border-[#087F8C] focus:bg-white"
                  />
                  {posSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setPosSearchTerm('')}
                      className="absolute right-2.5 top-2.5 text-[#567781] hover:text-[#172B34] text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Floating Search Dropdown */}
                {showPosSuggestDropdown && posSuggestions.length > 0 && (
                  <div className="absolute left-3.5 right-3.5 top-full mt-1 bg-white border border-[#E8EEF2] rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-[#E8EEF2] max-h-64 overflow-y-auto">
                    {posSuggestions.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 hover:bg-[#F6F9FB] flex items-center justify-between transition-colors cursor-pointer"
                        onClick={() => handleAddToCart(item)}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <strong className="text-xs text-[#172B34]">{item.name}</strong>
                            {item.isScheduleH && (
                              <span className="bg-rose-100 text-rose-800 text-[8.5px] font-black px-1 rounded">SCH-H</span>
                            )}
                          </div>
                          <span className="text-[10.5px] text-[#567781] block">
                            {item.saltComposition} • Batch: {item.batchNumber} • {item.location}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <div className="text-right">
                            <span className="font-mono font-bold text-xs text-[#087F8C] block">₹{item.unitPrice}</span>
                            <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded ${
                              item.currentStock === 0 ? 'bg-rose-100 text-rose-800' : item.currentStock <= item.minThreshold ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {item.currentStock} in stock
                            </span>
                          </div>

                          <Button
                            size="sm"
                            onClick={() => handleAddToCart(item)}
                            className="h-6 text-[10px] bg-[#087F8C] hover:bg-[#076b77] text-white rounded font-bold px-2 cursor-pointer"
                          >
                            + Add
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick-Pick Medicine Cards Grid */}
              <div className="bg-white p-3.5 rounded-2xl border border-[#E8EEF2] shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#172B34] flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>In-House Quick Dispense Grid ({quickPickMeds.length})</span>
                  </span>

                  <div className="flex items-center gap-1 bg-[#F6F9FB] p-0.5 rounded-lg border border-[#E8EEF2] overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => setPosQuickCategory('ALL')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        posQuickCategory === 'ALL' ? 'bg-white text-[#172B34] shadow-2xs' : 'text-[#567781]'
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setPosQuickCategory('FAST_PICKS')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        posQuickCategory === 'FAST_PICKS' ? 'bg-[#087F8C] text-white shadow-2xs' : 'text-[#567781]'
                      }`}
                    >
                      Fast Picks
                    </button>
                    <button
                      type="button"
                      onClick={() => setPosQuickCategory('ORAL')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        posQuickCategory === 'ORAL' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-[#567781]'
                      }`}
                    >
                      Oral
                    </button>
                    <button
                      type="button"
                      onClick={() => setPosQuickCategory('INJECTABLE')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        posQuickCategory === 'INJECTABLE' ? 'bg-sky-600 text-white shadow-2xs' : 'text-[#567781]'
                      }`}
                    >
                      Injections
                    </button>
                  </div>
                </div>

                {quickPickMeds.length === 0 ? (
                  <div className="p-6 bg-[#F6F9FB] rounded-xl text-center space-y-1">
                    <Boxes className="w-6 h-6 text-[#567781] mx-auto opacity-40" />
                    <span className="text-xs font-bold text-[#172B34] block">No In-House Stock Added Yet</span>
                    <p className="text-[11px] text-[#567781]">Add medicines in Tab 4 (In-House Stock) or upload a CSV.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {quickPickMeds.map((med) => {
                      const isSelected = highlightedStockMed?.id === med.id;

                      return (
                        <button
                          key={med.id}
                          type="button"
                          onClick={() => handleAddToCart(med)}
                          className={`p-2.5 rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between border ${
                            isSelected
                              ? 'bg-[#087F8C]/10 border-[#087F8C] shadow-2xs'
                              : 'bg-[#F6F9FB] hover:bg-slate-100 border-[#E8EEF2]'
                          }`}
                        >
                          <div>
                            <strong className="text-xs text-[#172B34] line-clamp-1 block">{med.name}</strong>
                            <span className="text-[10px] text-[#567781] line-clamp-1 block mt-0.5">{med.saltComposition}</span>
                          </div>
                          <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-[#E8EEF2]/60 text-[11px]">
                            <span className="font-mono font-bold text-[#087F8C]">₹{med.unitPrice}</span>
                            <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded ${
                              med.currentStock <= med.minThreshold ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-800'
                            }`}>
                              {med.currentStock} left
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ========================================================================= */}
              {/* BOTTOM DEDICATED LIVE STOCK & BATCH INSPECTOR CARD                         */}
              {/* ========================================================================= */}
              {highlightedStockMed && inspectorStockInfo ? (
                <div className="bg-gradient-to-br from-[#172B34] to-[#1e3845] text-white p-4 rounded-2xl shadow-md border border-slate-700 space-y-3">
                  <div className="flex items-start justify-between border-b border-white/15 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <Boxes className="w-4 h-4 text-emerald-400" />
                        <h4 className="text-sm font-black tracking-tight text-white">{highlightedStockMed.name}</h4>
                        {highlightedStockMed.isScheduleH && (
                          <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded">
                            SCHEDULE-H
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-300 block mt-0.5">
                        Active Salt: <strong>{highlightedStockMed.saltComposition}</strong>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedMedForSubstitutes(highlightedStockMed)}
                      className="px-2.5 py-1 rounded-lg bg-sky-500/30 hover:bg-sky-500/50 text-sky-200 border border-sky-400/40 text-xs font-bold cursor-pointer"
                    >
                      ⇄ Generic Substitutes
                    </button>
                  </div>

                  {/* 4-Stat Stock Ledger Strip */}
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2 bg-white/10 rounded-xl border border-white/10">
                      <span className="text-[10px] text-slate-300 uppercase block font-bold">Physical Stock</span>
                      <strong className="text-base font-mono font-black text-white">{inspectorStockInfo.current}</strong>
                    </div>

                    <div className="p-2 bg-amber-500/20 rounded-xl border border-amber-400/30">
                      <span className="text-[10px] text-amber-200 uppercase block font-bold">In POS Cart</span>
                      <strong className="text-base font-mono font-black text-amber-300">{inspectorStockInfo.inCart}</strong>
                    </div>

                    <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-400/30">
                      <span className="text-[10px] text-emerald-200 uppercase block font-bold">Remaining Stock</span>
                      <strong className="text-base font-mono font-black text-emerald-300">{inspectorStockInfo.remaining}</strong>
                    </div>

                    <div className="p-2 bg-white/10 rounded-xl border border-white/10">
                      <span className="text-[10px] text-slate-300 uppercase block font-bold">Selling Rate</span>
                      <strong className="text-base font-mono font-black text-white">₹{highlightedStockMed.unitPrice}</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1">
                    <span>Batch: <strong className="font-mono text-white">{highlightedStockMed.batchNumber}</strong> (Exp: {highlightedStockMed.expiryDate})</span>
                    <span>Storage: <strong className="text-white">{highlightedStockMed.location}</strong></span>
                  </div>
                </div>
              ) : null}
            </div>

            {/* ========================================================================= */}
            {/* RIGHT HALF (6/12): DEDICATED BILLING TERMINAL, DISCOUNT & PAYMENT TERMINAL */}
            {/* ========================================================================= */}
            <div className="lg:col-span-6 space-y-3.5">
              <div className="bg-white p-4 rounded-2xl border border-[#E8EEF2] shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-2">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-[#087F8C]" />
                    <h3 className="text-xs font-bold text-[#172B34] uppercase tracking-wider">
                      Itemized Bill Cart ({pharmacyCart.length} Meds)
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-[#567781]">GST 5% Breakup</span>
                </div>

                {/* Cart Items List */}
                {pharmacyCart.length === 0 ? (
                  <div className="p-8 bg-[#F6F9FB] rounded-xl text-center space-y-1">
                    <ShoppingCart className="w-8 h-8 text-[#567781] mx-auto opacity-30" />
                    <span className="text-xs font-bold text-[#172B34] block">No Medicines in Terminal Cart</span>
                    <p className="text-[11px] text-[#567781]">Search or click medicines on the left to add to bill.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {pharmacyCart.map((item) => (
                      <div key={item.id} className="p-2.5 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] text-xs space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <strong className="text-xs text-[#172B34]">{item.name}</strong>
                              {item.isScheduleH && (
                                <span className="bg-rose-100 text-rose-800 text-[8px] font-black px-1 rounded">SCH-H</span>
                              )}
                            </div>
                            <span className="text-[10.5px] text-[#567781]">
                              Batch: {item.batchNumber || 'Direct Batch'} • Rate: ₹{item.unitPrice}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPharmacyCart(pharmacyCart.filter(c => c.id !== item.id))}
                            className="text-rose-600 hover:text-rose-800 text-xs p-0.5 cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-[#567781]">Qty:</span>
                            <button
                              type="button"
                              onClick={() => {
                                const newQ = item.quantity - 1;
                                if (newQ <= 0) setPharmacyCart(pharmacyCart.filter(c => c.id !== item.id));
                                else setPharmacyCart(pharmacyCart.map(c => c.id === item.id ? { ...c, quantity: newQ, total: newQ * c.unitPrice } : c));
                              }}
                              className="w-5 h-5 rounded bg-white border border-[#E8EEF2] flex items-center justify-center font-bold text-xs cursor-pointer"
                            >
                              -
                            </button>
                            <span className="font-mono font-bold px-1.5">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const newQ = item.quantity + 1;
                                setPharmacyCart(pharmacyCart.map(c => c.id === item.id ? { ...c, quantity: newQ, total: newQ * c.unitPrice } : c));
                              }}
                              className="w-5 h-5 rounded bg-white border border-[#E8EEF2] flex items-center justify-center font-bold text-xs cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          <span className="font-mono font-bold text-xs text-[#172B34]">
                            ₹{item.total}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Financial Summary, Discount, and Payment Execution */}
                {pharmacyCart.length > 0 && (
                  <div className="p-4 bg-[#172B34] text-white rounded-2xl space-y-3">
                    <div className="space-y-1.5 text-xs text-slate-300 border-b border-white/10 pb-2.5">
                      <div className="flex justify-between">
                        <span>Medicines Subtotal:</span>
                        <span className="font-mono font-bold text-white">₹{cartFinancials.subtotal}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>GST Pharma Tax (5%):</span>
                        <span className="font-mono font-bold text-white">₹{cartFinancials.tax}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Special Bill Discount %:</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={posBillDiscount}
                            onChange={(e) => setPosBillDiscount(e.target.value)}
                            className="w-14 h-6 px-1.5 text-center bg-white/10 border border-white/20 rounded text-xs text-white font-mono"
                          />
                          <span className="text-[11px] text-slate-400">%</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">Net Payable Amount:</span>
                      <span className="text-2xl font-black font-mono text-emerald-400">₹{cartFinancials.grandTotal}</span>
                    </div>

                    {/* Payment Mode Selector */}
                    {posCustomerType === 'IPD_BED' ? (
                      <div className="p-2 bg-amber-500/20 border border-amber-400/30 rounded-xl text-amber-300 text-xs font-semibold">
                        ✓ Charges will post automatically to {posPatientName || 'Inpatient'}'s running bed bill.
                      </div>
                    ) : (
                      <div className="space-y-2 pt-1 border-t border-white/10">
                        <div className="flex items-center justify-between gap-1 text-xs">
                          <button
                            type="button"
                            onClick={() => setPosPaymentMethod('UPI')}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                              posPaymentMethod === 'UPI' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-white/10 border-white/10 text-slate-300'
                            }`}
                          >
                            UPI / QR Code
                          </button>
                          <button
                            type="button"
                            onClick={() => setPosPaymentMethod('CASH')}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                              posPaymentMethod === 'CASH' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-white/10 border-white/10 text-slate-300'
                            }`}
                          >
                            Cash in Hand
                          </button>
                          <button
                            type="button"
                            onClick={() => setPosPaymentMethod('CARD')}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                              posPaymentMethod === 'CARD' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-white/10 border-white/10 text-slate-300'
                            }`}
                          >
                            Card Swipe
                          </button>
                        </div>

                        {/* Cash Tendered & Change Due Calculator */}
                        {posPaymentMethod === 'CASH' && (
                          <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl space-y-2 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-300 text-xs">Cash Tendered by Customer:</span>
                              <input
                                type="number"
                                placeholder={`e.g. ₹${cartFinancials.grandTotal}`}
                                value={cashTendered}
                                onChange={(e) => setCashTendered(e.target.value)}
                                className="w-28 h-7 px-2 text-right bg-white text-black font-mono font-bold rounded-lg text-xs"
                              />
                            </div>

                            <div className="flex gap-1.5 justify-end">
                              <button
                                type="button"
                                onClick={() => setCashTendered(String(cartFinancials.grandTotal))}
                                className="px-2 py-0.5 bg-white/10 hover:bg-white/20 rounded text-[11px] text-white cursor-pointer font-mono"
                              >
                                Exact
                              </button>
                              <button
                                type="button"
                                onClick={() => setCashTendered('500')}
                                className="px-2 py-0.5 bg-white/10 hover:bg-white/20 rounded text-[11px] text-white cursor-pointer font-mono"
                              >
                                ₹500
                              </button>
                              <button
                                type="button"
                                onClick={() => setCashTendered('1000')}
                                className="px-2 py-0.5 bg-white/10 hover:bg-white/20 rounded text-[11px] text-white cursor-pointer font-mono"
                              >
                                ₹1000
                              </button>
                            </div>

                            {cartFinancials.tenderedNum > 0 && (
                              <div className="flex justify-between items-center text-xs font-bold pt-1.5 border-t border-white/10">
                                <span className="text-amber-300">Change Due to Return:</span>
                                <span className="font-mono text-emerald-400 text-base">₹{cartFinancials.changeDue}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <Button
                      size="sm"
                      onClick={handleCompleteSale}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs h-9.5 rounded-xl border-0 cursor-pointer shadow-xs"
                    >
                      Complete Sale & Settle Invoice ✓
                    </Button>
                  </div>
                )}
              </div>

              {/* Printable Cash Bill Preview */}
              {lastGeneratedBill && (
                <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                    <div>
                      <strong className="text-xs text-emerald-900 block font-mono">{lastGeneratedBill.billNo}</strong>
                      <span className="text-[11px] text-emerald-800">
                        {lastGeneratedBill.customerName} ({lastGeneratedBill.customerType}) • {lastGeneratedBill.customerMobile}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => window.print()}
                      className="h-7 text-xs bg-emerald-700 text-white rounded-lg cursor-pointer"
                    >
                      <Printer className="w-3 h-3 mr-1" /> Print Slip
                    </Button>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                    <span>Total Amount Billed:</span>
                    <span className="font-mono text-sm">₹{lastGeneratedBill.grandTotal}</span>
                  </div>
                  {lastGeneratedBill.changeDue !== undefined && (
                    <div className="flex items-center justify-between text-xs text-emerald-800 font-mono">
                      <span>Change Returned:</span>
                      <span>₹{lastGeneratedBill.changeDue}</span>
                    </div>
                  )}
                  <span className="text-[10px] text-emerald-700 block">Dispensed by: {lastGeneratedBill.dispensedBy}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PHARMACY SALES HISTORY & DETAILED AUDIT TRAIL                     */}
      {/* ========================================================================= */}
      {activePharmacyTab === 'SALES_HISTORY' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-2xl border border-[#E8EEF2] shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#567781]" />
              <input
                type="text"
                placeholder="Search history by invoice no, patient name, phone, doctor, or pharmacist..."
                value={historySearchTerm}
                onChange={(e) => setHistorySearchTerm(e.target.value)}
                className="w-full h-9 pl-9 pr-3 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs text-[#172B34] focus:outline-none focus:border-[#087F8C]"
              />
            </div>

            <div className="flex items-center gap-1 bg-[#F6F9FB] p-1 rounded-xl border border-[#E8EEF2] overflow-x-auto">
              <button
                type="button"
                onClick={() => setHistoryTypeFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  historyTypeFilter === 'ALL' ? 'bg-white text-[#172B34] shadow-2xs' : 'text-[#567781]'
                }`}
              >
                All Sales ({salesHistory.length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryTypeFilter('WALK_IN')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  historyTypeFilter === 'WALK_IN' ? 'bg-[#172B34] text-white shadow-2xs' : 'text-[#567781]'
                }`}
              >
                Walk-In
              </button>
              <button
                type="button"
                onClick={() => setHistoryTypeFilter('OPD_PATIENT')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  historyTypeFilter === 'OPD_PATIENT' ? 'bg-[#087F8C] text-white shadow-2xs' : 'text-[#567781]'
                }`}
              >
                OPD
              </button>
              <button
                type="button"
                onClick={() => setHistoryTypeFilter('IPD_BED')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  historyTypeFilter === 'IPD_BED' ? 'bg-rose-700 text-white shadow-2xs' : 'text-[#567781]'
                }`}
              >
                IPD Bed
              </button>
            </div>
          </div>

          {/* Master Sales History Table */}
          <div className="bg-white rounded-2xl border border-[#E8EEF2] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F6F9FB] border-b border-[#E8EEF2] text-[#567781] font-bold text-[11px] uppercase">
                    <th className="p-3.5">Invoice & Date</th>
                    <th className="p-3.5">Patient Details</th>
                    <th className="p-3.5">Prescriber & Dispenser</th>
                    <th className="p-3.5">Items Dispensed</th>
                    <th className="p-3.5 text-right">Subtotal / Tax</th>
                    <th className="p-3.5 text-right">Grand Total</th>
                    <th className="p-3.5">Payment Mode</th>
                    <th className="p-3.5 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EEF2]">
                  {filteredSalesHistory.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-[#567781]">
                        No sales transactions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    filteredSalesHistory.map((s) => (
                      <tr key={s.id} className="hover:bg-[#F6F9FB]/60 transition-colors">
                        <td className="p-3.5">
                          <strong className="font-mono font-bold text-[#087F8C] block">{s.invoiceNo}</strong>
                          <span className="text-[10.5px] text-[#567781]">{s.dateTime}</span>
                        </td>
                        <td className="p-3.5">
                          <strong className="text-xs text-[#172B34] block">{s.patientName}</strong>
                          <span className="text-[11px] text-[#567781] block font-mono">{s.patientPhone}</span>
                          {s.bedNumber && (
                            <span className="text-[10px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-1.5 rounded inline-block mt-0.5">
                              {s.bedNumber}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className="text-[#172B34] block">Dr: {s.doctorName}</span>
                          <span className="text-[10.5px] text-emerald-800 font-semibold block mt-0.5">
                            By: {s.dispensedBy}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="text-xs text-[#172B34] block font-medium">
                            {s.items.map(i => `${i.name} x${i.quantity}`).join(', ')}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-mono text-[11px] text-[#567781]">
                          ₹{s.subtotal} + ₹{s.tax}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-xs text-emerald-700">
                          ₹{s.grandTotal}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                            {s.paymentMode}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedInvoiceToPrint(s)}
                            className="p-1 rounded text-[#567781] hover:text-[#087F8C] cursor-pointer"
                            title="Print Receipt"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DEDICATED INPATIENT WARD INDENTS REQUISITION QUEUE                */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* TAB 3: DEDICATED INPATIENT WARD INDENTS REQUISITION QUEUE                */}
      {/* ========================================================================= */}
      {activePharmacyTab === 'WARD_INDENTS' && (() => {
        const query = wardIndentSearch.trim().toLowerCase();

        const filteredPending = pendingInpatientOrders.filter((ord) => {
          if (!query) return true;
          return (
            ord.bedNumber.toLowerCase().includes(query) ||
            ord.patientName.toLowerCase().includes(query) ||
            ord.wardName.toLowerCase().includes(query) ||
            (ord.doctorName && ord.doctorName.toLowerCase().includes(query)) ||
            ord.medication.medicineName.toLowerCase().includes(query) ||
            (ord.medication.dosage && ord.medication.dosage.toLowerCase().includes(query))
          );
        });

        const filteredDispensed = dispensedInpatientOrders.filter((ord) => {
          if (!query) return true;
          return (
            ord.bedNumber.toLowerCase().includes(query) ||
            ord.patientName.toLowerCase().includes(query) ||
            ord.wardName.toLowerCase().includes(query) ||
            (ord.doctorName && ord.doctorName.toLowerCase().includes(query)) ||
            ord.medication.medicineName.toLowerCase().includes(query) ||
            (ord.medication.invoiceNo && ord.medication.invoiceNo.toLowerCase().includes(query)) ||
            (ord.medication.dispensedBy && ord.medication.dispensedBy.toLowerCase().includes(query))
          );
        });

        const filteredOutside = outsidePrescriptions.filter((ord) => {
          if (!query) return true;
          return (
            ord.bedNumber.toLowerCase().includes(query) ||
            ord.patientName.toLowerCase().includes(query) ||
            ord.wardName.toLowerCase().includes(query) ||
            ord.medication.medicineName.toLowerCase().includes(query)
          );
        });

        return (
          <div className="space-y-4">
            {/* Header & Controls Bar */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E8EEF2] shadow-2xs space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
                      <BedDouble className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-[#172B34] flex items-center gap-2">
                        <span>Inpatient Ward Bed Medication Requisitions</span>
                        <span className="text-xs font-mono font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                          {pendingInpatientOrders.length} Pending
                        </span>
                      </h3>
                      <p className="text-xs text-[#567781] mt-0.5">
                        Live medication requisitions ordered from Inpatient Case Files & Nurse MAR stations. Dispensing deducts central inventory and auto-posts charges to the admitted Bed Ledger.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dispensing Pharmacist Selector */}
                <div className="flex items-center gap-2 bg-[#F6F9FB] p-2 rounded-xl border border-[#E8EEF2] shrink-0">
                  <UserCheck className="w-4 h-4 text-[#087F8C]" />
                  <div className="text-left">
                    <label className="text-[10px] font-bold text-[#567781] uppercase block">Dispenser On Duty</label>
                    <select
                      value={posSelectedDispenser}
                      onChange={(e) => setPosSelectedDispenser(e.target.value)}
                      className="bg-transparent text-xs font-bold text-[#172B34] focus:outline-none cursor-pointer"
                    >
                      {registeredPharmacists.map((ph) => (
                        <option key={ph.id} value={ph.name}>
                          {ph.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Sub-Tabs & Filter Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#E8EEF2]">
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setWardIndentSubTab('PENDING')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                      wardIndentSubTab === 'PENDING'
                        ? 'bg-rose-700 text-white shadow-xs'
                        : 'bg-[#F6F9FB] text-[#567781] hover:text-[#172B34] border border-[#E8EEF2]'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Pending Requisitions</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black ${
                        wardIndentSubTab === 'PENDING'
                          ? 'bg-white text-rose-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {pendingInpatientOrders.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWardIndentSubTab('DISPENSED')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                      wardIndentSubTab === 'DISPENSED'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-[#F6F9FB] text-[#567781] hover:text-[#172B34] border border-[#E8EEF2]'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Dispensed History</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black ${
                        wardIndentSubTab === 'DISPENSED'
                          ? 'bg-white text-emerald-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {dispensedInpatientOrders.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWardIndentSubTab('OUTSIDE')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                      wardIndentSubTab === 'OUTSIDE'
                        ? 'bg-amber-700 text-white shadow-xs'
                        : 'bg-[#F6F9FB] text-[#567781] hover:text-[#172B34] border border-[#E8EEF2]'
                    }`}
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Outside Prescriptions</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black ${
                        wardIndentSubTab === 'OUTSIDE'
                          ? 'bg-white text-amber-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {outsidePrescriptions.length}
                    </span>
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#567781]" />
                  <input
                    type="text"
                    placeholder="Filter by bed, patient, medicine..."
                    value={wardIndentSearch}
                    onChange={(e) => setWardIndentSearch(e.target.value)}
                    className="w-full h-8.5 pl-8.5 pr-3 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs text-[#172B34] focus:outline-none focus:border-[#087F8C]"
                  />
                  {wardIndentSearch && (
                    <button
                      type="button"
                      onClick={() => setWardIndentSearch('')}
                      className="absolute right-2.5 top-2 text-[#567781] hover:text-[#172B34]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* SUB-TAB 1: PENDING REQUISITIONS (COMPACT & SLEEK CARDS)                   */}
            {/* ========================================================================= */}
            {wardIndentSubTab === 'PENDING' && (
              <>
                {filteredPending.length === 0 ? (
                  <div className="p-12 bg-white rounded-2xl border border-[#E8EEF2] text-center space-y-3 shadow-2xs">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                      <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-[#172B34]">All Inpatient Ward Indents Dispensed</h4>
                      <p className="text-xs text-[#567781] max-w-md mx-auto">
                        {wardIndentSearch
                          ? 'No pending requisitions matching your filter query.'
                          : 'There are currently no outstanding ward medication requisitions in the hospital queue.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {filteredPending.map((ord) => {
                      // Match in-house stock
                      const matched = inHouseStock.find(
                        (s) =>
                          s.name.toLowerCase().includes(ord.medication.medicineName.toLowerCase()) ||
                          ord.medication.medicineName.toLowerCase().includes(s.name.toLowerCase())
                      );
                      const unitPrice = ord.medication.price || matched?.unitPrice || matched?.mrp || 120;

                      return (
                        <div
                          key={`${ord.bedId}-${ord.medication.id}`}
                          className="bg-white rounded-2xl border border-[#E8EEF2] shadow-2xs hover:border-[#087F8C]/40 hover:shadow-xs transition-all flex flex-col justify-between p-3.5 space-y-3"
                        >
                          {/* Header: Bed badge, patient name & ward */}
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-mono text-[11px] font-black bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-lg shrink-0">
                                Bed {ord.bedNumber}
                              </span>
                              <div className="min-w-0">
                                <strong className="text-xs font-bold text-[#172B34] truncate block">
                                  {ord.patientName}
                                </strong>
                                <span className="text-[10px] text-[#567781] block truncate">
                                  {ord.wardName}
                                </span>
                              </div>
                            </div>

                            {/* Mini Stock Tag */}
                            {matched ? (
                              matched.currentStock > 0 ? (
                                <span className="text-[9.5px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md shrink-0 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  <span>In Stock ({matched.currentStock})</span>
                                </span>
                              ) : (
                                <span className="text-[9.5px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md shrink-0 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                  <span>Out of Stock</span>
                                </span>
                              )
                            ) : (
                              <span className="text-[9.5px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0">
                                Standard
                              </span>
                            )}
                          </div>

                          {/* Medicine & Dosage Details */}
                          <div className="space-y-1.5">
                            <h4 className="text-xs font-black text-[#172B34] line-clamp-1 tracking-tight">
                              {ord.medication.medicineName}
                            </h4>
                            <div className="flex items-center gap-1 text-[10px] text-[#567781] flex-wrap">
                              {ord.medication.dosage && (
                                <span className="font-semibold bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-[#172B34]">
                                  {ord.medication.dosage}
                                </span>
                              )}
                              {ord.medication.frequency && (
                                <span className="font-semibold bg-cyan-50 border border-cyan-100 px-1.5 py-0.5 rounded text-[#087F8C]">
                                  {ord.medication.frequency}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#567781] block truncate">
                              Dr: <em>{ord.doctorName || 'Attending Physician'}</em>
                            </span>
                          </div>

                          {/* Action Footer: Sleek View / Review Button */}
                          <div className="pt-2 border-t border-[#E8EEF2] flex items-center justify-between gap-2">
                            <span className="text-xs font-mono font-black text-[#172B34]">
                              ₹{unitPrice}
                            </span>
                            <Button
                              size="sm"
                              onClick={() => openWardIndentReview(ord)}
                              className="h-7.5 px-3 bg-[#087F8C] hover:bg-[#076b77] text-white text-[11px] font-bold rounded-xl border-0 shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View & Dispense</span>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ========================================================================= */}
            {/* SUB-TAB 2: DISPENSED HISTORY                                             */}
            {/* ========================================================================= */}
            {wardIndentSubTab === 'DISPENSED' && (
              <div className="bg-white rounded-2xl border border-[#E8EEF2] overflow-hidden shadow-2xs">
                {filteredDispensed.length === 0 ? (
                  <div className="p-12 text-center space-y-2">
                    <History className="w-10 h-10 text-[#567781] mx-auto opacity-30" />
                    <h4 className="text-sm font-bold text-[#172B34]">No Dispensed Records Found</h4>
                    <p className="text-xs text-[#567781]">
                      Medications dispensed to inpatient wards will be permanently archived and tracked here.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#F6F9FB] border-b border-[#E8EEF2] text-[#567781] font-bold text-[11px] uppercase">
                          <th className="p-3.5">Bed & Patient</th>
                          <th className="p-3.5">Medication & Dosage</th>
                          <th className="p-3.5">Prescribed / Dispensed By</th>
                          <th className="p-3.5">Dispatched Time</th>
                          <th className="p-3.5">Indent Ref #</th>
                          <th className="p-3.5 text-right">Ledger Amount</th>
                          <th className="p-3.5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8EEF2]">
                        {filteredDispensed.map((ord) => (
                          <tr key={`${ord.bedId}-${ord.medication.id}`} className="hover:bg-[#F6F9FB]/60 transition-colors">
                            <td className="p-3.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-black bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded">
                                  {ord.bedNumber}
                                </span>
                                <div>
                                  <strong className="text-xs text-[#172B34] block">{ord.patientName}</strong>
                                  <span className="text-[10px] text-[#567781]">{ord.wardName}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5">
                              <strong className="text-xs text-[#172B34] block">{ord.medication.medicineName}</strong>
                              <span className="text-[11px] text-[#567781]">
                                {ord.medication.dosage} • {ord.medication.frequency}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <span className="text-[#172B34] block">Dr: {ord.doctorName || 'Attending Physician'}</span>
                              <span className="text-[10.5px] text-emerald-800 font-semibold block mt-0.5">
                                By: {ord.medication.dispensedBy || 'Duty Pharmacist'}
                              </span>
                            </td>
                            <td className="p-3.5 font-mono text-[11px] text-[#567781]">
                              {ord.medication.dispatchedAt || ord.medication.dateOrdered || 'Recently Dispensed'}
                            </td>
                            <td className="p-3.5 font-mono font-bold text-xs text-[#087F8C]">
                              {ord.medication.invoiceNo || `IND-${ord.medication.id.slice(-6)}`}
                            </td>
                            <td className="p-3.5 text-right font-mono font-bold text-xs text-emerald-700">
                              ₹{ord.medication.price || 120}
                            </td>
                            <td className="p-3.5 text-center">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>DISPENSED</span>
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* SUB-TAB 3: OUTSIDE PATIENT PRESCRIPTIONS                                  */}
            {/* ========================================================================= */}
            {wardIndentSubTab === 'OUTSIDE' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between gap-3 text-amber-950 text-xs">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>
                      These medicines are marked as patient-arranged from outside pharmacies. You can convert them to Hospital Pharmacy supply if requested.
                    </span>
                  </div>
                </div>

                {filteredOutside.length === 0 ? (
                  <div className="p-10 bg-white rounded-2xl border border-[#E8EEF2] text-center space-y-2">
                    <p className="text-xs text-[#567781]">No outside patient-provided medications recorded.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredOutside.map((ord) => (
                      <div
                        key={`${ord.bedId}-${ord.medication.id}`}
                        className="p-4 bg-white rounded-2xl border border-amber-200 shadow-2xs space-y-3 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-black bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                                Bed {ord.bedNumber}
                              </span>
                              <div>
                                <strong className="text-xs text-[#172B34] block">{ord.patientName}</strong>
                                <span className="text-[10px] text-[#567781]">{ord.wardName}</span>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                              Patient Own
                            </span>
                          </div>

                          <div className="pt-2 text-xs space-y-1">
                            <strong className="text-sm font-bold text-[#172B34]">
                              {ord.medication.medicineName}
                            </strong>
                            <div className="flex items-center gap-2 text-[#567781] text-[11px]">
                              <span>Dosage: <strong>{ord.medication.dosage}</strong></span>
                              <span>•</span>
                              <span>Freq: <strong>{ord.medication.frequency}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#E8EEF2] flex items-center justify-between">
                          <span className="text-[11px] text-[#567781]">Convert to hospital supply</span>
                          <Button
                            size="sm"
                            onClick={() => handleSwitchOutsideToHospital(ord.bedId, ord.medication.id, ord.medication.medicineName)}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8 px-3 rounded-xl border-0 cursor-pointer shadow-xs flex items-center gap-1.5"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>Switch & Queue in Pharmacy</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* REVIEW & DISPENSE MODAL DIALOG (CLEAN & MINIMAL CLINICAL SEQUENTIAL DESIGN)*/}
            {/* ========================================================================= */}
            {reviewIndentModal && (() => {
              const matchedStock = inHouseStock.find(
                (s) =>
                  s.name.toLowerCase().includes(reviewIndentModal.medication.medicineName.toLowerCase()) ||
                  reviewIndentModal.medication.medicineName.toLowerCase().includes(s.name.toLowerCase())
              );
              const qtyNum = Math.max(1, parseInt(modalDispenseQty) || 1);
              const unitPriceNum = Math.max(0, parseFloat(modalUnitPrice) || 0);
              const discountNum = Math.max(0, parseFloat(modalDiscount) || 0);
              const grossSubtotal = qtyNum * unitPriceNum;
              const netTotal = Math.max(0, grossSubtotal - discountNum);
              const isDispensing = dispensingActionId === reviewIndentModal.medication.id;
              const isAvailable = matchedStock && matchedStock.currentStock > 0;
              const requesterName = reviewIndentModal.doctorName || reviewIndentModal.medication.prescribedBy || 'Attending Consultant';

              return (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
                  <div className="bg-white w-full max-w-xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col my-auto max-h-[94vh]">
                    {/* MODAL HEADER */}
                    <div className="bg-[#102A30] text-white px-5 py-3.5 flex items-center justify-between gap-3 shrink-0">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#087F8C] text-white flex items-center justify-center font-bold shadow-xs">
                          <Pill className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white tracking-tight">Dispense Ward Medication</h3>
                          <p className="text-[11px] text-slate-300">Review prescription, verify stock & bill to bed</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReviewIndentModal(null)}
                        className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all flex items-center justify-center cursor-pointer"
                        title="Close"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* MODAL BODY (CLEAN VERTICAL STEP-BY-STEP FLOW) */}
                    <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto">
                      {/* STEP 1: REQUESTER & PATIENT INFO (FIRST SHOW REQUESTER NAME) */}
                      <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#567781] flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-[#087F8C]" />
                            <span>Requester & Inpatient Details</span>
                          </span>
                          <span className="font-mono text-[10px] text-[#567781]">
                            {reviewIndentModal.medication.dateOrdered || 'Today (Ward Station)'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                          <div>
                            <span className="text-[10px] font-bold text-[#567781] block">Requested / Prescribed By:</span>
                            <strong className="text-sm font-bold text-[#172B34] block truncate">
                              Dr. {requesterName}
                            </strong>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-[#567781] block">Patient & Location:</span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-[11px] font-black bg-rose-50 text-rose-800 border border-rose-200 px-1.5 py-0.2 rounded">
                                Bed {reviewIndentModal.bedNumber}
                              </span>
                              <strong className="text-xs font-bold text-[#172B34]">{reviewIndentModal.patientName}</strong>
                              <span className="text-[11px] text-[#567781]">({reviewIndentModal.wardName})</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* STEP 2: MEDICINE NAME & REAL STOCK CHECK */}
                      <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-slate-200/80 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#567781] flex items-center gap-1.5">
                            <Pill className="w-3.5 h-3.5 text-[#087F8C]" />
                            <span>Prescribed Medicine & Stock Availability</span>
                          </span>
                          <span className="text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full font-mono">
                            {reviewIndentModal.medication.status || 'QUEUED_PHARMACY'}
                          </span>
                        </div>

                        {/* Medicine Name & Dosage */}
                        <div>
                          <h4 className="text-base font-black text-[#172B34] tracking-tight">
                            {reviewIndentModal.medication.medicineName}
                          </h4>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {reviewIndentModal.medication.dosage && (
                              <span className="text-[11px] font-bold text-[#172B34] bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                                Dosage: {reviewIndentModal.medication.dosage}
                              </span>
                            )}
                            {reviewIndentModal.medication.frequency && (
                              <span className="text-[11px] font-bold text-[#087F8C] bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-md">
                                Freq: {reviewIndentModal.medication.frequency}
                              </span>
                            )}
                          </div>
                          {reviewIndentModal.medication.notes && (
                            <p className="text-[11px] text-[#567781] mt-1 bg-white p-2 rounded-lg border border-slate-200">
                              <strong>Clinical Note: </strong>{reviewIndentModal.medication.notes}
                            </p>
                          )}
                        </div>

                        {/* Live Stock Check Indicator */}
                        {isAvailable ? (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <strong className="text-emerald-950 font-bold">In Stock:</strong>
                                  <span className="font-mono font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                                    {matchedStock.currentStock} Units Available
                                  </span>
                                </div>
                                <span className="text-[11px] text-emerald-700 truncate block mt-0.5">
                                  Batch: {matchedStock.batchNumber} • Exp: {matchedStock.expiryDate} • Shelf: {matchedStock.location || 'Rack A'}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 border border-emerald-300 px-2 py-1 rounded-md shrink-0">
                              Verified
                            </span>
                          </div>
                        ) : (
                          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-2.5 text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
                                <AlertCircle className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                              <div>
                                <strong className="text-rose-950 font-bold block">Out of Stock (0 Units in Central Pharmacy)</strong>
                                <span className="text-[11px] text-rose-700">Choose action for inpatient supply:</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={handleModalMarkOutside}
                                className="h-8 text-[11px] font-bold bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 cursor-pointer flex items-center justify-center gap-1"
                              >
                                <ArrowRightLeft className="w-3 h-3 text-amber-700" />
                                <span>Ask Patient (Outside)</span>
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={handleModalKeepAwaitingStock}
                                className="h-8 text-[11px] font-bold bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100 cursor-pointer flex items-center justify-center gap-1"
                              >
                                <Clock className="w-3 h-3 text-slate-600" />
                                <span>Keep on Hold (Inward)</span>
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* STEP 3: PAYMENT BAR & DISCOUNT */}
                      <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-slate-200/80 space-y-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#567781] flex items-center gap-1.5">
                          <Receipt className="w-3.5 h-3.5 text-[#087F8C]" />
                          <span>Payment & Discount Setup</span>
                        </span>

                        <div className="grid grid-cols-3 gap-2.5">
                          <div className="space-y-1">
                            <label className="text-[10.5px] font-bold text-[#567781] block">Dispense Qty</label>
                            <Input
                              type="number"
                              min="1"
                              value={modalDispenseQty}
                              onChange={(e) => setModalDispenseQty(e.target.value)}
                              className="h-9 rounded-xl bg-white border-slate-200 text-xs font-mono font-bold text-[#172B34] text-center"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10.5px] font-bold text-[#567781] block">Unit Price (₹)</label>
                            <Input
                              type="number"
                              min="0"
                              value={modalUnitPrice}
                              onChange={(e) => setModalUnitPrice(e.target.value)}
                              className="h-9 rounded-xl bg-white border-slate-200 text-xs font-mono font-bold text-[#172B34] text-center"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10.5px] font-bold text-[#567781] block">Discount (₹)</label>
                            <Input
                              type="number"
                              min="0"
                              value={modalDiscount}
                              onChange={(e) => setModalDiscount(e.target.value)}
                              className="h-9 rounded-xl bg-white border-slate-200 text-xs font-mono font-bold text-rose-700 text-center"
                            />
                          </div>
                        </div>

                        {/* Clean Payment Summary Bar */}
                        <div className="bg-[#102A30] text-white p-3 rounded-xl flex items-center justify-between">
                          <div className="text-xs">
                            <span className="text-slate-300 block text-[11px]">
                              Gross: {qtyNum} × ₹{unitPriceNum} = ₹{grossSubtotal}
                              {discountNum > 0 && <span className="text-rose-300 ml-1.5 font-bold">(-₹{discountNum} disc)</span>}
                            </span>
                            <span className="text-[10px] text-emerald-400 font-bold uppercase">
                              Auto-Bill to Bed {reviewIndentModal.bedNumber}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block uppercase">Net Total</span>
                            <span className="text-lg font-black font-mono text-emerald-400">₹{netTotal}</span>
                          </div>
                        </div>
                      </div>

                      {/* STEP 4: DISPENSING STAFF */}
                      <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                        <label className="text-[10.5px] font-bold text-[#567781] flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-[#087F8C]" />
                          <span>Dispensing Pharmacist / Staff Name</span>
                        </label>
                        <select
                          value={modalDispenserName}
                          onChange={(e) => setModalDispenserName(e.target.value)}
                          className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-[#172B34] focus:outline-none focus:border-[#087F8C] cursor-pointer"
                        >
                          {registeredPharmacists.map((ph) => (
                            <option key={ph.id} value={ph.name}>
                              {ph.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* STEP 5: ACTIONS & DISPENSE BUTTON (FOOTER) */}
                    <div className="p-4 bg-[#F8FAFC] border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setReviewIndentModal(null)}
                        className="text-xs font-bold rounded-xl h-9 px-4 border-slate-200 bg-white text-[#567781] hover:text-[#172B34] cursor-pointer"
                      >
                        Cancel
                      </Button>

                      <Button
                        type="button"
                        disabled={isDispensing}
                        onClick={handleConfirmModalDispense}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm h-9.5 px-6 rounded-xl border-0 cursor-pointer shadow-md flex items-center gap-2 transition-transform active:scale-95"
                      >
                        {isDispensing ? (
                          <>
                            <RotateCcw className="w-4 h-4 animate-spin" />
                            <span>Dispensing...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>Dispense to Ward (₹{netTotal}) 💊</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* TAB 4: IN-HOUSE STOCK & EXPIRY MATRIX (FEFO FIRST-EXPIRY-FIRST-OUT)       */}
      {/* ========================================================================= */}
      {activePharmacyTab === 'IN_HOUSE_STOCK' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-2xl border border-[#E8EEF2] shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#567781]" />
              <input
                type="text"
                placeholder="Search stock by brand name, salt/molecule, or batch no..."
                value={stockSearchQuery}
                onChange={(e) => setStockSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs text-[#172B34] focus:outline-none focus:border-[#087F8C]"
              />
            </div>

            <div className="flex items-center gap-1 bg-[#F6F9FB] p-1 rounded-xl border border-[#E8EEF2] overflow-x-auto">
              <button
                type="button"
                onClick={() => setStockCategoryFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  stockCategoryFilter === 'ALL' ? 'bg-white text-[#172B34] shadow-2xs' : 'text-[#567781]'
                }`}
              >
                All ({inHouseStock.length})
              </button>
              <button
                type="button"
                onClick={() => setStockCategoryFilter('GENERAL_ORAL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  stockCategoryFilter === 'GENERAL_ORAL' ? 'bg-[#087F8C] text-white shadow-2xs' : 'text-[#567781]'
                }`}
              >
                Oral Meds
              </button>
              <button
                type="button"
                onClick={() => setStockCategoryFilter('INJECTABLE_IV')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  stockCategoryFilter === 'INJECTABLE_IV' ? 'bg-sky-600 text-white shadow-2xs' : 'text-[#567781]'
                }`}
              >
                Injections & IV
              </button>
              <button
                type="button"
                onClick={() => setStockCategoryFilter('OT_SURGICAL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  stockCategoryFilter === 'OT_SURGICAL' ? 'bg-purple-600 text-white shadow-2xs' : 'text-[#567781]'
                }`}
              >
                OT & Surgical
              </button>
              <button
                type="button"
                onClick={() => setStockCategoryFilter('EMERGENCY')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  stockCategoryFilter === 'EMERGENCY' ? 'bg-rose-600 text-white shadow-2xs' : 'text-[#567781]'
                }`}
              >
                Emergency
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowStockUploadModal(true)}
                className="text-xs font-bold rounded-xl h-8.5 border-[#E8EEF2] bg-white text-[#567781] hover:text-[#087F8C] cursor-pointer shadow-2xs flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload CSV</span>
              </Button>
              <Button
                size="sm"
                onClick={() => setShowAddInHouseModal(true)}
                className="bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs rounded-xl h-8.5 px-3.5 border-0 cursor-pointer shadow-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Manually</span>
              </Button>
            </div>
          </div>

          {/* Near-Expiry FEFO Filter Matrix Sub-Bar */}
          <div className="bg-[#F6F9FB] border border-[#E8EEF2] p-2.5 rounded-xl flex items-center justify-between gap-2 overflow-x-auto text-xs">
            <span className="font-bold text-[#172B34] shrink-0 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-700" />
              <span>Expiry Filter Matrix:</span>
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setStockExpiryFilter('ALL')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                  stockExpiryFilter === 'ALL' ? 'bg-white text-[#172B34] border border-[#E8EEF2]' : 'text-[#567781]'
                }`}
              >
                All Batches
              </button>
              <button
                type="button"
                onClick={() => setStockExpiryFilter('CRITICAL_30')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                  stockExpiryFilter === 'CRITICAL_30' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                🔴 Critical (&lt;30d)
              </button>
              <button
                type="button"
                onClick={() => setStockExpiryFilter('NEAR_60')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                  stockExpiryFilter === 'NEAR_60' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                🟡 Near Expiry (&lt;60d)
              </button>
              <button
                type="button"
                onClick={() => setStockExpiryFilter('WARN_90')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                  stockExpiryFilter === 'WARN_90' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-800 border border-purple-200'
                }`}
              >
                🔵 90 Days
              </button>
              <button
                type="button"
                onClick={() => setStockExpiryFilter('GOOD')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                  stockExpiryFilter === 'GOOD' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                🟢 Valid (&gt;90d)
              </button>
            </div>
          </div>

          {/* Master In-House Inventory Table */}
          <div className="bg-white rounded-2xl border border-[#E8EEF2] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F6F9FB] border-b border-[#E8EEF2] text-[#567781] font-bold text-[11px] uppercase">
                    <th className="p-3.5">Medicine & Salt Molecule</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Batch / Shelf Location</th>
                    <th className="p-3.5">Expiry Date</th>
                    <th className="p-3.5 text-right">Current Stock</th>
                    <th className="p-3.5 text-right">Cost / Rate / MRP</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EEF2]">
                  {filteredInHouseStock.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-[#567781]">
                        No in-house physical stock registered yet. Add medicines or upload a CSV.
                      </td>
                    </tr>
                  ) : (
                    filteredInHouseStock.map((item) => {
                      const daysLeft = getDaysUntilExpiry(item.expiryDate);
                      const isLow = item.currentStock > 0 && item.currentStock <= item.minThreshold;
                      const isOut = item.currentStock === 0;

                      return (
                        <tr key={item.id} className="hover:bg-[#F6F9FB]/60 transition-colors">
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5">
                              <strong className="text-xs text-[#172B34]">{item.name}</strong>
                              {item.isScheduleH && (
                                <span className="bg-rose-100 text-rose-800 text-[8.5px] font-black px-1 rounded">SCH-H</span>
                              )}
                            </div>
                            <span className="text-[11px] text-[#567781] block mt-0.5">{item.saltComposition}</span>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.category === 'GENERAL_ORAL'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : item.category === 'INJECTABLE_IV'
                                ? 'bg-sky-50 text-sky-800 border border-sky-200'
                                : item.category === 'OT_SURGICAL'
                                ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                : 'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}>
                              {item.category.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className="font-mono font-bold text-[#172B34] block">{item.batchNumber}</span>
                            <span className="text-[11px] text-[#567781]">{item.location}</span>
                          </td>
                          <td className="p-3.5">
                            <span className={`font-mono text-xs font-bold block ${
                              daysLeft <= 30 ? 'text-rose-600' : daysLeft <= 60 ? 'text-amber-600' : 'text-[#172B34]'
                            }`}>
                              {item.expiryDate || 'N/A'}
                            </span>
                            <span className="text-[10px] text-[#567781]">{daysLeft !== 999 ? `${daysLeft} days left` : ''}</span>
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-sm text-[#172B34]">
                            {item.currentStock}
                          </td>
                          <td className="p-3.5 text-right font-mono text-xs">
                            <span className="text-[#087F8C] font-bold block">Rate: ₹{item.unitPrice}</span>
                            <span className="text-[10px] text-[#567781]">MRP: ₹{item.mrp} (Cost: ₹{item.purchaseCost || 0})</span>
                          </td>
                          <td className="p-3.5 text-center">
                            {isOut ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                OUT OF STOCK
                              </span>
                            ) : isLow ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                LOW STOCK
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                AVAILABLE
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedMedForSubstitutes(item)}
                                className="px-2 py-1 rounded bg-sky-50 text-sky-700 hover:bg-sky-100 text-[10px] font-bold cursor-pointer"
                                title="Find Generic Equivalents"
                              >
                                ⇄ Sub
                              </button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setRestockTargetItem(item);
                                  setShowRestockModal(true);
                                }}
                                className="h-7 text-[11px] font-bold rounded-lg border-[#087F8C]/30 text-[#087F8C] hover:bg-[#087F8C]/10 cursor-pointer"
                              >
                                + Restock
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: RETURN TO PHARMACY (RTP) & PATIENT REFUND CREDITS                  */}
      {/* ========================================================================= */}
      {activePharmacyTab === 'RTP_RETURNS' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-[#E8EEF2] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-[#172B34] uppercase tracking-wider flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-rose-600" />
                <span>Return to Pharmacy (RTP) & Inpatient Patient Refund Credits</span>
              </h3>
              <p className="text-xs text-[#567781] mt-0.5">
                Process unused unexpired medicines returned from wards, auto-restock physical inventory, and credit the refund back to the patient's running bill.
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => setShowRtpModal(true)}
              className="bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl h-8.5 px-3.5 border-0 cursor-pointer shadow-xs flex items-center gap-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Process Medicine Return</span>
            </Button>
          </div>

          {/* RTP History Table */}
          <div className="bg-white rounded-2xl border border-[#E8EEF2] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F6F9FB] border-b border-[#E8EEF2] text-[#567781] font-bold text-[11px] uppercase">
                    <th className="p-3.5">Return Date</th>
                    <th className="p-3.5">Patient / Ward Bed</th>
                    <th className="p-3.5">Medicine Name</th>
                    <th className="p-3.5 text-center">Qty Returned</th>
                    <th className="p-3.5 text-right">Refund Rate</th>
                    <th className="p-3.5 text-right">Total Credited Amount</th>
                    <th className="p-3.5">Clinical Reason</th>
                    <th className="p-3.5">Verified Pharmacist</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EEF2]">
                  {rtpRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-[#567781]">
                        No return to pharmacy records logged yet.
                      </td>
                    </tr>
                  ) : (
                    rtpRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-[#F6F9FB]/60 transition-colors">
                        <td className="p-3.5 font-mono text-[#567781] whitespace-nowrap">{r.returnDate}</td>
                        <td className="p-3.5 font-bold text-[#172B34]">{r.patientName}</td>
                        <td className="p-3.5 text-[#087F8C] font-semibold">{r.medicineName}</td>
                        <td className="p-3.5 text-center font-mono font-bold bg-emerald-50 text-emerald-800">+{r.quantityReturned}</td>
                        <td className="p-3.5 text-right font-mono">₹{r.refundRate}</td>
                        <td className="p-3.5 text-right font-mono font-bold text-emerald-700">₹{r.totalCreditAmount} (Credited)</td>
                        <td className="p-3.5 text-[#567781]">{r.reason}</td>
                        <td className="p-3.5 text-[#172B34] font-medium">{r.processedBy}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: SUPPLIER GRN INWARDING & MARGIN ANALYSIS                          */}
      {/* ========================================================================= */}
      {activePharmacyTab === 'PURCHASE_GRN' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-[#E8EEF2] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-[#172B34] uppercase tracking-wider flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-600" />
                <span>Supplier Purchase Inwarding & Goods Receipt Note (GRN)</span>
              </h3>
              <p className="text-xs text-[#567781] mt-0.5">
                Record vendor purchase invoices, scheme free units, GST input tax, and automated gross profit margin calculations.
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => setShowGrnModal(true)}
              className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs rounded-xl h-8.5 px-3.5 border-0 cursor-pointer shadow-xs flex items-center gap-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Inward Supplier GRN</span>
            </Button>
          </div>

          {/* GRN Inwarding History */}
          <div className="bg-white rounded-2xl border border-[#E8EEF2] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F6F9FB] border-b border-[#E8EEF2] text-[#567781] font-bold text-[11px] uppercase">
                    <th className="p-3.5">GRN No & Date</th>
                    <th className="p-3.5">Distributor / Supplier</th>
                    <th className="p-3.5">Medicine Name & Batch</th>
                    <th className="p-3.5 text-center">Billed + Free Qty</th>
                    <th className="p-3.5 text-right">Purchase Cost</th>
                    <th className="p-3.5 text-right">Hospital Selling Rate</th>
                    <th className="p-3.5 text-right">Profit Margin %</th>
                    <th className="p-3.5 text-right">Total Invoice Inward</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EEF2]">
                  {grnRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-[#567781]">
                        No supplier GRN purchase invoices inwarded yet.
                      </td>
                    </tr>
                  ) : (
                    grnRecords.map((g) => (
                      <tr key={g.id} className="hover:bg-[#F6F9FB]/60 transition-colors">
                        <td className="p-3.5">
                          <strong className="font-mono text-[#087F8C] block">{g.grnNumber}</strong>
                          <span className="text-[10px] text-[#567781]">{g.invoiceDate} (Inv: {g.invoiceNumber})</span>
                        </td>
                        <td className="p-3.5 font-bold text-[#172B34]">{g.supplierName}</td>
                        <td className="p-3.5">
                          <strong className="text-xs text-[#172B34] block">{g.medicineName}</strong>
                          <span className="text-[10px] text-[#567781]">Batch: {g.batchNumber} (Exp: {g.expiryDate})</span>
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold">
                          {g.billedQty} <span className="text-emerald-700 font-normal">+{g.freeQty} Free</span>
                        </td>
                        <td className="p-3.5 text-right font-mono">₹{g.purchaseCost}</td>
                        <td className="p-3.5 text-right font-mono font-bold text-[#087F8C]">₹{g.sellingRate}</td>
                        <td className="p-3.5 text-right font-mono font-bold text-emerald-700">{g.marginPercent}%</td>
                        <td className="p-3.5 text-right font-mono font-bold text-[#172B34]">₹{g.totalInwardCost.toLocaleString('en-IN')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: OUTSIDE / PATIENT-ARRANGED MEDICATIONS                             */}
      {/* ========================================================================= */}
      {activePharmacyTab === 'OUTSIDE_RX' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-[#E8EEF2] shadow-2xs space-y-1">
            <h3 className="text-xs font-bold text-[#172B34] uppercase tracking-wider flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-amber-600" />
              <span>Outside / Patient-Arranged Medication Tracker (₹0 Fee)</span>
            </h3>
            <p className="text-xs text-[#567781]">
              Medicines provided by the patient attendant with ₹0 hospital fee. If the attendant cannot arrange stock, click <em>Switch to Hospital & Bill</em> to dispense and charge automatically.
            </p>
          </div>

          {outsidePrescriptions.length === 0 ? (
            <div className="p-8 bg-white rounded-2xl border border-[#E8EEF2] text-center space-y-1">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto opacity-50" />
              <span className="text-xs font-bold text-[#172B34] block">No Outside Prescriptions Registered</span>
              <p className="text-[11px] text-[#567781]">All inpatient medications are currently sourced in-house by central pharmacy.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {outsidePrescriptions.map((item, idx) => (
                <div key={idx} className="p-4 bg-white rounded-2xl border border-[#E8EEF2] shadow-2xs space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-2">
                      <div>
                        <span className="bg-amber-100 text-amber-900 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                          Bed {item.bedNumber} ({item.wardName})
                        </span>
                        <strong className="text-xs text-[#172B34] block mt-1">{item.patientName}</strong>
                      </div>
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        Outside ₹0 Charge
                      </span>
                    </div>

                    <div className="pt-2 text-xs space-y-1">
                      <strong className="text-sm font-bold text-[#172B34]">{item.medication.medicineName}</strong>
                      <div className="flex items-center gap-2 text-[#567781] text-[11px]">
                        <span>Dosage: <strong>{item.medication.dosage}</strong></span>
                        <span>•</span>
                        <span>Freq: <strong>{item.medication.frequency}</strong></span>
                      </div>
                      <span className="text-[11px] text-[#567781] block">
                        Prescribing Doctor: <em>{item.medication.prescribedBy}</em>
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E8EEF2] flex items-center justify-between">
                    <span className="text-[11px] text-amber-800 font-semibold">Patient Arranged</span>
                    <Button
                      size="sm"
                      onClick={() => handleSwitchOutsideToHospital(item.bedId, item.medication.id, item.medication.medicineName)}
                      className="bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs h-7.5 px-3 rounded-lg border-0 cursor-pointer shadow-2xs flex items-center gap-1"
                    >
                      <span>Switch to Hospital & Bill →</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: MASTER OPEN-SOURCE FORMULATIONS CATALOG                           */}
      {/* ========================================================================= */}
      {activePharmacyTab === 'OPEN_SOURCE_CATALOG' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-2xl border border-[#E8EEF2] shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#567781]" />
              <input
                type="text"
                placeholder="Search global formulations by name or active salt..."
                value={catalogSearchQuery}
                onChange={(e) => setCatalogSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs text-[#172B34] focus:outline-none focus:border-[#087F8C]"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                onClick={() => setShowAddCatalogModal(true)}
                className="bg-[#172B34] hover:bg-slate-800 text-white font-bold text-xs rounded-xl h-8.5 px-3.5 border-0 cursor-pointer shadow-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Formulation</span>
              </Button>
            </div>
          </div>

          {/* Catalog Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {(catalogData?.content || []).map((med) => (
              <div key={med.id} className="p-4 bg-white rounded-2xl border border-[#E8EEF2] shadow-2xs space-y-2 flex flex-col justify-between">
                <div>
                  <strong className="text-xs font-bold text-[#172B34] block">{med.name}</strong>
                  <span className="text-[11px] text-[#567781] block mt-0.5">Salt: {med.saltComposition || 'Active Composition'}</span>
                  {med.manufacturerName && <span className="text-[10px] text-slate-500 block">Mfg: {med.manufacturerName}</span>}
                </div>
                <div className="pt-2 border-t border-[#E8EEF2] flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[#087F8C] font-bold">Standard Formula</span>
                  <button
                    type="button"
                    onClick={() => {
                      setNewStockName(med.name);
                      setNewStockSalt(med.saltComposition || '');
                      setShowAddInHouseModal(true);
                    }}
                    className="px-2.5 py-1 rounded bg-[#087F8C]/10 text-[#087F8C] hover:bg-[#087F8C] hover:text-white text-[11px] font-bold cursor-pointer transition-colors"
                  >
                    + Stock in Hospital
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: RESTOCK INVENTORY ITEM                                          */}
      {/* ========================================================================= */}
      {showRestockModal && restockTargetItem && (
        <div className="fixed inset-0 bg-[#172B34]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-[#E8EEF2] p-5 space-y-4">
            <div className="flex justify-between items-start border-b border-[#E8EEF2] pb-2">
              <div>
                <h3 className="text-sm font-bold text-[#172B34]">Restock Medicine Batch</h3>
                <p className="text-xs text-[#567781]">{restockTargetItem.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowRestockModal(false)}
                className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[#172B34]">Add Quantity Units *</label>
                <input
                  type="number"
                  min="1"
                  value={restockQuantity}
                  onChange={(e) => setRestockQuantity(e.target.value)}
                  className="w-full h-8.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#E8EEF2]">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowRestockModal(false)}
                  className="h-8 text-xs rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirmRestock}
                  className="bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs h-8 px-4 rounded-xl border-0 cursor-pointer shadow-xs"
                >
                  Confirm Restock ✓
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD IN-HOUSE MEDICINE MANUALLY                                   */}
      {/* ========================================================================= */}
      {showAddInHouseModal && (
        <div className="fixed inset-0 bg-[#172B34]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-[#E8EEF2] p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-[#E8EEF2] pb-2">
              <div>
                <h3 className="text-sm font-bold text-[#172B34]">Add Medicine to In-House Stock</h3>
                <p className="text-xs text-[#567781]">Register batch-wise physical stock in hospital pharmacy.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddInHouseModal(false)}
                className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddInHouseStock} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[#172B34]">Medicine Commercial Brand Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inj. Meropenem 1gm IV"
                  value={newStockName}
                  onChange={(e) => setNewStockName(e.target.value)}
                  className="w-full h-8.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-[#172B34]">Stock Category *</label>
                  <select
                    value={newStockCategory}
                    onChange={(e) => setNewStockCategory(e.target.value as any)}
                    className="w-full h-8.5 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs cursor-pointer font-medium"
                  >
                    <option value="GENERAL_ORAL">General Oral</option>
                    <option value="INJECTABLE_IV">Injectable & IV Fluids</option>
                    <option value="OT_SURGICAL">OT & Surgical</option>
                    <option value="EMERGENCY">Emergency Crash Cart</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[#172B34]">Active Salt Molecule</label>
                  <input
                    type="text"
                    placeholder="e.g. Meropenem Trihydrate (1g)"
                    value={newStockSalt}
                    onChange={(e) => setNewStockSalt(e.target.value)}
                    className="w-full h-8.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-[#172B34]">Batch No *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. B-9021"
                    value={newStockBatch}
                    onChange={(e) => setNewStockBatch(e.target.value)}
                    className="w-full h-8.5 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[#172B34]">Initial Units *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newStockQty}
                    onChange={(e) => setNewStockQty(e.target.value)}
                    className="w-full h-8.5 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[#172B34]">Min Safety Limit</label>
                  <input
                    type="number"
                    min="1"
                    value={newStockMin}
                    onChange={(e) => setNewStockMin(e.target.value)}
                    className="w-full h-8.5 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-[#172B34]">Selling Rate (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newStockPrice}
                    onChange={(e) => setNewStockPrice(e.target.value)}
                    className="w-full h-8.5 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs font-mono font-bold text-[#087F8C]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[#172B34]">MRP (₹)</label>
                  <input
                    type="number"
                    min="1"
                    value={newStockMrp}
                    onChange={(e) => setNewStockMrp(e.target.value)}
                    className="w-full h-8.5 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[#172B34]">Storage Rack</label>
                  <input
                    type="text"
                    value={newStockLocation}
                    onChange={(e) => setNewStockLocation(e.target.value)}
                    className="w-full h-8.5 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#E8EEF2]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddInHouseModal(false)}
                  className="h-8 text-xs rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs h-8 px-4 rounded-xl border-0 cursor-pointer shadow-xs"
                >
                  Save In-House Stock ✓
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: BULK STOCK UPLOAD (CSV / JSON)                                   */}
      {/* ========================================================================= */}
      {showStockUploadModal && (
        <div className="fixed inset-0 bg-[#172B34]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-[#E8EEF2] p-5 space-y-4">
            <div className="flex justify-between items-start border-b border-[#E8EEF2] pb-2">
              <div>
                <h3 className="text-sm font-bold text-[#172B34] flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-[#087F8C]" />
                  <span>Upload Hospital Stock Spreadsheet</span>
                </h3>
                <p className="text-xs text-[#567781]">Bulk ingest supplier batches into hospital pharmacy.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowStockUploadModal(false);
                  setStockUploadError(null);
                  setStockUploadSuccess(null);
                }}
                className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {stockUploadError && (
              <div className="p-2.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs font-semibold">
                {stockUploadError}
              </div>
            )}

            {stockUploadSuccess && (
              <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold">
                {stockUploadSuccess}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="p-5 border-2 border-dashed border-[#087F8C]/40 rounded-2xl text-center space-y-2 bg-[#F6F9FB]">
                <Upload className="w-7 h-7 mx-auto text-[#087F8C]" />
                <p className="font-bold text-[#172B34]">Select CSV or JSON File</p>
                <input
                  type="file"
                  accept=".csv,.json"
                  onChange={handleStockFileUpload}
                  className="text-xs text-[#567781] file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#087F8C] file:text-white hover:file:bg-[#076b77] cursor-pointer"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-[#E8EEF2] flex items-center justify-between">
                <div>
                  <strong className="text-xs text-[#172B34] block">Download Template</strong>
                  <span className="text-[11px] text-[#567781]">Pre-formatted Excel/CSV with columns</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={downloadStandardStockTemplate}
                  className="text-xs font-bold rounded-xl h-7.5 border-[#087F8C]/30 text-[#087F8C] hover:bg-[#087F8C]/10 cursor-pointer"
                >
                  <Download className="w-3 h-3 mr-1" /> Template.csv
                </Button>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  size="sm"
                  onClick={() => setShowStockUploadModal(false)}
                  className="bg-[#172B34] text-white text-xs font-bold rounded-xl px-4"
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: PROCESS RTP (RETURN TO PHARMACY) & CREDIT NOTE                   */}
      {/* ========================================================================= */}
      {showRtpModal && (
        <div className="fixed inset-0 bg-[#172B34]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#E8EEF2] p-5 space-y-4">
            <div className="flex justify-between items-start border-b border-[#E8EEF2] pb-2">
              <div>
                <h3 className="text-sm font-bold text-[#172B34] flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-rose-600" />
                  <span>Return to Pharmacy & Bill Credit</span>
                </h3>
                <p className="text-xs text-[#567781]">Re-stock physical units & credit patient bill.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowRtpModal(false)}
                className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProcessRtp} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[#172B34]">Inpatient Ward Bed (to credit) *</label>
                <select
                  required
                  value={rtpSelectedBedId}
                  onChange={(e) => setRtpSelectedBedId(e.target.value)}
                  className="w-full h-8.5 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs cursor-pointer font-bold text-rose-900"
                >
                  <option value="">-- Choose Admitted Bed --</option>
                  {hospitalBeds.filter(b => b.patientName).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.patientName} — Bed {b.bedNumber} ({b.wardName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#172B34]">Medicine Name Being Returned *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inj. Ceftriaxone 1gm IV"
                  value={rtpMedicineName}
                  onChange={(e) => setRtpMedicineName(e.target.value)}
                  className="w-full h-8.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-[#172B34]">Quantity Returned *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={rtpQuantity}
                    onChange={(e) => setRtpQuantity(e.target.value)}
                    className="w-full h-8.5 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs font-mono font-bold text-emerald-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[#172B34]">Refund Unit Rate (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={rtpRefundRate}
                    onChange={(e) => setRtpRefundRate(e.target.value)}
                    className="w-full h-8.5 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#172B34]">Clinical Return Reason</label>
                <input
                  type="text"
                  value={rtpReason}
                  onChange={(e) => setRtpReason(e.target.value)}
                  className="w-full h-8.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs"
                />
              </div>

              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <span className="font-bold text-emerald-900">Total Credit to Bed Bill:</span>
                <span className="font-mono font-black text-sm text-emerald-700">
                  ₹{(parseInt(rtpQuantity) || 0) * (parseFloat(rtpRefundRate) || 0)}
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#E8EEF2]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRtpModal(false)}
                  className="h-8 text-xs rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs h-8 px-4 rounded-xl border-0 cursor-pointer shadow-xs"
                >
                  Process Credit ✓
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: SUPPLIER GRN PURCHASE INWARDING                                  */}
      {/* ========================================================================= */}
      {showGrnModal && (
        <div className="fixed inset-0 bg-[#172B34]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-[#E8EEF2] p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-[#E8EEF2] pb-2">
              <div>
                <h3 className="text-sm font-bold text-[#172B34] flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-indigo-600" />
                  <span>Inward Supplier GRN Purchase</span>
                </h3>
                <p className="text-xs text-[#567781]">Record invoice, scheme units, and margin %.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowGrnModal(false)}
                className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProcessGrn} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-[#172B34]">Distributor / Supplier *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apollo Meditech Distributors"
                    value={grnSupplier}
                    onChange={(e) => setGrnSupplier(e.target.value)}
                    className="w-full h-8.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[#172B34]">Supplier Invoice No *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INV-9921"
                    value={grnInvoiceNo}
                    onChange={(e) => setGrnInvoiceNo(e.target.value)}
                    className="w-full h-8.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#172B34]">Medicine Brand Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tab. Augmentin 625 Duo"
                  value={grnMedName}
                  onChange={(e) => setGrnMedName(e.target.value)}
                  className="w-full h-8.5 px-3 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-[#172B34]">Batch No *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. B-101"
                    value={grnBatch}
                    onChange={(e) => setGrnBatch(e.target.value)}
                    className="w-full h-8.5 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[#172B34]">Billed Qty *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={grnBilledQty}
                    onChange={(e) => setGrnBilledQty(e.target.value)}
                    className="w-full h-8.5 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[#172B34]">Scheme Free Qty</label>
                  <input
                    type="number"
                    min="0"
                    value={grnFreeQty}
                    onChange={(e) => setGrnFreeQty(e.target.value)}
                    className="w-full h-8.5 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs font-mono text-emerald-700 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-[#172B34]">Purchase Cost (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={grnCost}
                    onChange={(e) => setGrnCost(e.target.value)}
                    className="w-full h-8.5 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[#172B34]">Hospital Selling Rate (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={grnSelling}
                    onChange={(e) => setGrnSelling(e.target.value)}
                    className="w-full h-8.5 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs font-mono font-bold text-[#087F8C]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[#172B34]">MRP (₹)</label>
                  <input
                    type="number"
                    min="1"
                    value={grnMrp}
                    onChange={(e) => setGrnMrp(e.target.value)}
                    className="w-full h-8.5 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#E8EEF2]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGrnModal(false)}
                  className="h-8 text-xs rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs h-8 px-4 rounded-xl border-0 cursor-pointer shadow-xs"
                >
                  Save Inward GRN ✓
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: CASHIER DAY-END DRAWER CLOSURE SUMMARY                           */}
      {/* ========================================================================= */}
      {showDrawerModal && (
        <div className="fixed inset-0 bg-[#172B34]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#E8EEF2] p-5 space-y-4">
            <div className="flex justify-between items-start border-b border-[#E8EEF2] pb-2">
              <div>
                <h3 className="text-sm font-bold text-[#172B34] flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  <span>Cashier Day-End Drawer Closure</span>
                </h3>
                <p className="text-xs text-[#567781]">Live reconciliation of cash & digital shift handovers.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowDrawerModal(false)}
                className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] space-y-1.5">
                <div className="flex justify-between text-[#567781]">
                  <span>Cash Collections in Drawer:</span>
                  <strong className="text-[#172B34] font-mono">₹{drawerReconciliation.cashCollections}</strong>
                </div>
                <div className="flex justify-between text-[#567781]">
                  <span>UPI / QR Digital Receipts:</span>
                  <strong className="text-[#172B34] font-mono">₹{drawerReconciliation.upiCollections}</strong>
                </div>
                <div className="flex justify-between text-[#567781]">
                  <span>Debit / Credit Card Swipes:</span>
                  <strong className="text-[#172B34] font-mono">₹{drawerReconciliation.cardCollections}</strong>
                </div>
                <div className="flex justify-between text-rose-700 border-t border-[#E8EEF2] pt-1">
                  <span>Less: RTP Returns / Refunds:</span>
                  <strong className="font-mono">-₹{drawerReconciliation.totalRtpRefunds}</strong>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <strong className="text-xs text-emerald-900 block">Net Shift Total</strong>
                  <span className="text-[10px] text-emerald-800">{salesHistory.length} transactions settled</span>
                </div>
                <span className="font-mono font-black text-base text-emerald-700">₹{drawerReconciliation.netTotal}</span>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#E8EEF2]">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.print()}
                  className="h-8 text-xs rounded-xl"
                >
                  <Printer className="w-3.5 h-3.5 mr-1" /> Print Handover
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowDrawerModal(false)}
                  className="bg-[#172B34] text-white text-xs font-bold rounded-xl px-4"
                >
                  Close Shift ✓
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: RE-PRINT INVOICE FROM SALES HISTORY                             */}
      {/* ========================================================================= */}
      {selectedInvoiceToPrint && (
        <div className="fixed inset-0 bg-[#172B34]/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#E8EEF2] p-5 space-y-4">
            <div className="flex justify-between items-start border-b border-[#E8EEF2] pb-3 no-print">
              <div>
                <h3 className="text-sm font-bold text-[#172B34] flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-[#087F8C]" />
                  <span>Thermal Receipt ({selectedInvoiceToPrint.invoiceNo})</span>
                </h3>
                <p className="text-xs text-[#567781]">{selectedInvoiceToPrint.dateTime}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoiceToPrint(null)}
                className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-[#E8EEF2]">
              <div className="border-b border-dashed border-slate-300 pb-2 text-center space-y-0.5">
                <strong className="text-sm text-[#172B34] block">{clinic?.name || 'NISSCHAY MULTI-SPECIALTY HOSPITAL'}</strong>
                <span className="text-[10px] text-[#567781] block">Pharmacy Retail & Inpatient Dispense Slip</span>
              </div>

              <div className="text-[11px] space-y-1 text-[#567781] border-b border-dashed border-slate-300 pb-2">
                <div className="flex justify-between">
                  <span>Patient:</span>
                  <strong className="text-[#172B34]">{selectedInvoiceToPrint.patientName} ({selectedInvoiceToPrint.customerType})</strong>
                </div>
                <div className="flex justify-between">
                  <span>Mobile:</span>
                  <span className="font-mono">{selectedInvoiceToPrint.patientPhone}</span>
                </div>
                {selectedInvoiceToPrint.bedNumber && (
                  <div className="flex justify-between text-rose-800 font-bold">
                    <span>Admitted Bed:</span>
                    <span>{selectedInvoiceToPrint.bedNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Prescriber:</span>
                  <span>{selectedInvoiceToPrint.doctorName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Dispensed By:</span>
                  <span>{selectedInvoiceToPrint.dispensedBy}</span>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <span className="font-bold text-[#172B34] block">Dispensed Items:</span>
                {selectedInvoiceToPrint.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <span>{it.name} x{it.quantity}</span>
                    <span className="font-mono font-bold">₹{it.total}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-slate-300 pt-2 space-y-1 text-xs font-bold">
                <div className="flex justify-between text-[#172B34]">
                  <span>Grand Total:</span>
                  <span className="font-mono text-emerald-700">₹{selectedInvoiceToPrint.grandTotal}</span>
                </div>
                <div className="flex justify-between text-[10.5px] text-[#567781] font-normal">
                  <span>Payment Mode:</span>
                  <span>{selectedInvoiceToPrint.paymentMode}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-[#E8EEF2] no-print">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedInvoiceToPrint(null)}
                className="h-8 text-xs rounded-xl"
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => window.print()}
                className="bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs h-8 px-4 rounded-xl border-0 cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt Slip</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
