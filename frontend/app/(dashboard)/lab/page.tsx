'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Patient, Doctor, Clinic, LabInvestigationOrder, HospitalBed, InpatientServiceCharge } from '@/types';
import { Button } from '@/components/ui/button';
import {
  FlaskConical,
  Search,
  Plus,
  Printer,
  CheckCircle2,
  AlertCircle,
  Clock,
  Filter,
  User,
  BedDouble,
  Stethoscope,
  ExternalLink,
  ChevronRight,
  TestTube2,
  FileCheck,
  Activity,
  Microscope,
  Send,
  Download
} from 'lucide-react';

const HOSPITAL_LAB_CATALOG = [
  { id: 'srv-lab-cbc', name: 'Complete Blood Count (CBC)', category: 'Haematology', price: 350 },
  { id: 'srv-lab-lft', name: 'Liver Function Test (LFT)', category: 'Biochemistry', price: 750 },
  { id: 'srv-lab-kft', name: 'Kidney / Renal Function (KFT/RFT)', category: 'Biochemistry', price: 650 },
  { id: 'srv-lab-lipid', name: 'Lipid Profile (Cholesterol)', category: 'Biochemistry', price: 600 },
  { id: 'srv-lab-tsh', name: 'Thyroid Profile (T3, T4, TSH)', category: 'Endocrinology', price: 550 },
  { id: 'srv-lab-hba1c', name: 'HbA1c Glycated Hemoglobin', category: 'Diabetology', price: 450 },
  { id: 'srv-lab-ur', name: 'Urine Routine & Microscopy', category: 'Clinical Pathology', price: 200 },
  { id: 'srv-lab-ecg', name: '12-Lead ECG with Rhythm Strip', category: 'Cardiology', price: 300 },
  { id: 'srv-lab-xray', name: 'Digital Chest X-Ray (PA View)', category: 'Radiology', price: 500 },
  { id: 'srv-lab-usg', name: 'Ultrasound Whole Abdomen', category: 'Radiology', price: 1200 },
];

export default function LabDashboardPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'OPD' | 'IPD'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ORDERED' | 'SAMPLE_COLLECTED' | 'COMPLETED'>('ALL');

  // New Lab Order Modal
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [customPatientName, setCustomPatientName] = useState('');
  const [selectedTestId, setSelectedTestId] = useState(HOSPITAL_LAB_CATALOG[0].id);
  const [orderDoctor, setOrderDoctor] = useState('');
  const [orderUrgency, setOrderUrgency] = useState<'ROUTINE' | 'STAT_EMERGENCY'>('ROUTINE');
  const [orderSource, setOrderSource] = useState<'IN_HOUSE' | 'OUTSIDE'>('IN_HOUSE');
  const [orderNotes, setOrderNotes] = useState('');

  // Complete / Enter Results Modal
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedLabForResults, setSelectedLabForResults] = useState<LabInvestigationOrder | null>(null);
  const [resultObservations, setResultObservations] = useState('All parameters within normal clinical limits. No acute pathology observed.');
  const [technicianName, setTechnicianName] = useState('Senior Lab Technologist');

  // Fetch Patients
  const { data: patientsData } = useQuery<{ content: Patient[] }>({
    queryKey: ['patients-list'],
    queryFn: async () => {
      const res = await apiClient.get('/patients?size=100');
      return res.data;
    },
  });
  const patients = patientsData?.content || [];

  // Fetch Doctors
  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ['doctors-list'],
    queryFn: async () => {
      const res = await apiClient.get('/doctors');
      return res.data || [];
    },
  });

  // Fetch Hospital Data (Labs & Beds)
  const [labOrders, setLabOrders] = useState<LabInvestigationOrder[]>([]);
  const [ipdBeds, setIpdBeds] = useState<HospitalBed[]>([]);

  useEffect(() => {
    const fetchHospitalData = async () => {
      try {
        const res = await apiClient.get<{ beds?: string; labs?: string }>('/clinics/hospital-data');
        if (res.data?.labs) {
          const parsed = JSON.parse(res.data.labs);
          if (Array.isArray(parsed)) setLabOrders(parsed);
        }
        if (res.data?.beds) {
          const parsed = JSON.parse(res.data.beds);
          if (Array.isArray(parsed)) setIpdBeds(parsed);
        }
      } catch {
        const savedLabs = localStorage.getItem('nisschay_hospital_labs');
        if (savedLabs) setLabOrders(JSON.parse(savedLabs));
        const savedBeds = localStorage.getItem('nisschay_hospital_beds');
        if (savedBeds) setIpdBeds(JSON.parse(savedBeds));
      }
    };
    fetchHospitalData();
  }, []);

  const persistHospitalData = (updatedLabs: LabInvestigationOrder[]) => {
    setLabOrders(updatedLabs);
    localStorage.setItem('nisschay_hospital_labs', JSON.stringify(updatedLabs));
    apiClient.post('/clinics/hospital-data', {
      beds: JSON.stringify(ipdBeds),
      labs: JSON.stringify(updatedLabs)
    }).catch(() => {});
  };

  // Filtered Lab Orders
  const filteredLabs = useMemo(() => {
    return labOrders.filter((lab) => {
      const matchesSearch =
        !searchQuery ||
        lab.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lab.testName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lab.doctorName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || lab.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [labOrders, searchQuery, statusFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const total = labOrders.length;
    const pendingSamples = labOrders.filter(l => l.status === 'ORDERED').length;
    const inProcessing = labOrders.filter(l => l.status === 'SAMPLE_COLLECTED').length;
    const completed = labOrders.filter(l => l.status === 'COMPLETED').length;

    return { total, pendingSamples, inProcessing, completed };
  }, [labOrders]);

  // Handle Create New Lab Order
  const handleCreateLabOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const catalogItem = HOSPITAL_LAB_CATALOG.find(t => t.id === selectedTestId) || HOSPITAL_LAB_CATALOG[0];
    const patientObj = patients.find(p => p.id === selectedPatientId);
    const patName = patientObj?.name || customPatientName.trim() || 'Walk-in Patient';
    const patId = patientObj?.id || `walkin-${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];

    const newLab: LabInvestigationOrder = {
      id: `lab-${Date.now()}`,
      patientId: patId,
      patientName: patName,
      testName: catalogItem.name,
      category: catalogItem.category,
      doctorName: orderDoctor || (doctors[0]?.name ? `Dr. ${doctors[0].name}` : 'Consultant'),
      orderDate: today,
      status: 'ORDERED',
      price: orderSource === 'IN_HOUSE' ? catalogItem.price : 0,
      urgency: orderUrgency,
      notes: orderNotes || (orderSource === 'OUTSIDE' ? 'Patient undergoing scan/test outside' : 'Hospital lab requisition')
    };

    const updated = [newLab, ...labOrders];
    persistHospitalData(updated);
    setShowOrderModal(false);
    setCustomPatientName('');
    setOrderNotes('');
  };

  // Handle Update Status
  const handleUpdateStatus = (labId: string, nextStatus: 'SAMPLE_COLLECTED' | 'COMPLETED') => {
    const updated = labOrders.map(l => l.id === labId ? { ...l, status: nextStatus } : l);
    persistHospitalData(updated);
  };

  // Handle Save Results
  const handleSaveResults = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLabForResults) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const today = new Date().toISOString().split('T')[0];

    const updated = labOrders.map(l =>
      l.id === selectedLabForResults.id
        ? {
            ...l,
            status: 'COMPLETED' as const,
            notes: `Verified by ${technicianName} at ${today} ${time}. Findings: ${resultObservations}`
          }
        : l
    );

    persistHospitalData(updated);
    setShowResultModal(false);
  };

  return (
    <div className="space-y-4 font-sans min-w-0">
      {/* 1. TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-[#E8EEF2] shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#087F8C] to-[#065A63] text-white flex items-center justify-center font-bold shadow-xs">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-[#172B34] tracking-tight">
              Diagnostic Pathology & Laboratory Hub
            </h1>
            <p className="text-xs text-[#567781] mt-0.5">
              Live sample processing queue, pathology requisitions & diagnostic report generation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setShowOrderModal(true)}
            className="bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs rounded-xl h-8.5 px-3.5 border-0 cursor-pointer shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Order New Test</span>
          </Button>
        </div>
      </div>

      {/* 2. LAB METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-[#E8EEF2] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[#567781]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Requisitions</span>
            <Microscope className="w-4 h-4 text-[#087F8C]" />
          </div>
          <div className="text-xl font-black text-[#172B34] font-mono">{metrics.total}</div>
          <span className="text-[11px] text-[#567781] block">Across OPD & IPD Wards</span>
        </div>

        <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Sample Collection</span>
            <TestTube2 className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-900 font-mono">{metrics.pendingSamples}</div>
          <span className="text-[11px] text-amber-700 block font-medium">Awaiting Phlebotomy</span>
        </div>

        <div className="p-4 bg-sky-50/60 rounded-2xl border border-sky-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-sky-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">In-Processing / Analyzer</span>
            <Activity className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-xl font-black text-sky-900 font-mono">{metrics.inProcessing}</div>
          <span className="text-[11px] text-sky-700 block font-medium">Under Laboratory Analysis</span>
        </div>

        <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">Reports Ready</span>
            <FileCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-900 font-mono">{metrics.completed}</div>
          <span className="text-[11px] text-emerald-700 block font-medium">Dispatched to EMR Profile</span>
        </div>
      </div>

      {/* 3. SEARCH & STATUS FILTERS */}
      <div className="bg-white p-3 rounded-2xl border border-[#E8EEF2] shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#567781]" />
          <input
            type="text"
            placeholder="Search by patient name, investigation test, or doctor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs text-[#172B34] focus:outline-none focus:border-[#087F8C]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-9 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl text-xs font-semibold text-[#172B34] cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="ORDERED">Pending Collection</option>
            <option value="SAMPLE_COLLECTED">In-Processing</option>
            <option value="COMPLETED">Report Ready</option>
          </select>
        </div>
      </div>

      {/* 4. LAB REQUISITIONS TABLE */}
      <div className="bg-white rounded-2xl border border-[#E8EEF2] overflow-hidden shadow-2xs">
        {filteredLabs.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <FlaskConical className="w-8 h-8 text-[#567781] mx-auto opacity-40" />
            <h4 className="text-xs font-bold text-[#172B34]">No Diagnostic Requisitions Found</h4>
            <p className="text-[11px] text-[#567781]">Click + Order New Test to request bloodwork, scans, or pathology.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F6F9FB] border-b border-[#E8EEF2] text-[#567781] font-bold text-[11px] uppercase">
                  <th className="p-3.5">Order Date</th>
                  <th className="p-3.5">Patient Details</th>
                  <th className="p-3.5">Investigation Test</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Prescribing Doctor</th>
                  <th className="p-3.5">Urgency</th>
                  <th className="p-3.5 text-right">Tariff Fee</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Workflow Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8EEF2]">
                {filteredLabs.map((lab) => (
                  <tr key={lab.id} className="hover:bg-[#F6F9FB]/60 transition-colors">
                    <td className="p-3.5 font-mono text-[11px] text-[#567781] whitespace-nowrap">
                      {lab.orderDate}
                    </td>
                    <td className="p-3.5">
                      <Link
                        href={`/patients/${lab.patientId}`}
                        className="font-bold text-[#172B34] hover:text-[#087F8C] hover:underline block"
                      >
                        {lab.patientName}
                      </Link>
                    </td>
                    <td className="p-3.5 font-bold text-[#172B34]">
                      {lab.testName}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {lab.category}
                      </span>
                    </td>
                    <td className="p-3.5 text-[#567781]">
                      {lab.doctorName}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        lab.urgency === 'STAT_EMERGENCY'
                          ? 'bg-rose-600 text-white font-black animate-pulse'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {lab.urgency === 'STAT_EMERGENCY' ? 'STAT 🚨 EMERGENCY' : 'ROUTINE'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-[#087F8C]">
                      {lab.price > 0 ? `₹${lab.price}` : 'Outside (₹0)'}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        lab.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : lab.status === 'SAMPLE_COLLECTED'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {lab.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {lab.status === 'ORDERED' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(lab.id, 'SAMPLE_COLLECTED')}
                            className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 hover:bg-sky-100 text-[11px] font-bold cursor-pointer border border-sky-200"
                          >
                            Collect Sample 🧪
                          </button>
                        )}

                        {lab.status === 'SAMPLE_COLLECTED' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLabForResults(lab);
                              setShowResultModal(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-purple-600 text-white hover:bg-purple-700 text-[11px] font-bold cursor-pointer shadow-2xs"
                          >
                            Enter Results 📄
                          </button>
                        )}

                        {lab.status === 'COMPLETED' && (
                          <span className="text-[11px] text-emerald-700 font-bold flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Report Ready</span>
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ORDER NEW LAB TEST                                               */}
      {/* ========================================================================= */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-[#172B34]/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#E8EEF2] p-4 space-y-3">
            <div className="flex justify-between items-start border-b border-[#E8EEF2] pb-2">
              <div>
                <h3 className="text-sm font-bold text-[#172B34] flex items-center gap-1.5">
                  <FlaskConical className="w-4 h-4 text-[#087F8C]" />
                  <span>Order Diagnostic Requisition</span>
                </h3>
                <p className="text-[11px] text-[#567781]">Requisition bloodwork, imaging, or specialized pathology.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowOrderModal(false)}
                className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLabOrder} className="space-y-2.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[#172B34]">Patient Selection</label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full h-8 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs cursor-pointer font-medium"
                >
                  <option value="">-- Choose Registered Patient (or enter below) --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>
                  ))}
                </select>
              </div>

              {!selectedPatientId && (
                <div className="space-y-1">
                  <label className="font-semibold text-[#172B34]">Walk-In / External Patient Name</label>
                  <input
                    type="text"
                    value={customPatientName}
                    onChange={(e) => setCustomPatientName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-[#172B34]">Investigation / Test from Master Catalog *</label>
                <select
                  value={selectedTestId}
                  onChange={(e) => setSelectedTestId(e.target.value)}
                  className="w-full h-8 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs cursor-pointer font-medium"
                >
                  {HOSPITAL_LAB_CATALOG.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — ₹{t.price} ({t.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-[#172B34]">Prescribing Doctor</label>
                  <select
                    value={orderDoctor}
                    onChange={(e) => setOrderDoctor(e.target.value)}
                    className="w-full h-8 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs cursor-pointer"
                  >
                    <option value="">{doctors[0]?.name ? `Dr. ${doctors[0].name}` : 'Attending Doctor'}</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={`Dr. ${d.name}`}>Dr. {d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#172B34]">Urgency Level</label>
                  <select
                    value={orderUrgency}
                    onChange={(e) => setOrderUrgency(e.target.value as any)}
                    className="w-full h-8 px-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs cursor-pointer font-bold text-rose-700"
                  >
                    <option value="ROUTINE">Routine (Standard)</option>
                    <option value="STAT_EMERGENCY">STAT 🚨 (Emergency Immediate)</option>
                  </select>
                </div>
              </div>

              {/* Sourcing Toggle */}
              <div className="p-2.5 bg-[#F6F9FB] rounded-lg border border-[#E8EEF2] space-y-1.5">
                <label className="font-bold text-[#172B34] text-[11px] block">Testing Facility *</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`p-2 rounded-lg border flex items-start gap-2 cursor-pointer bg-white ${
                    orderSource === 'IN_HOUSE' ? 'border-[#087F8C] ring-1 ring-[#087F8C]' : 'border-[#E8EEF2]'
                  }`}>
                    <input
                      type="radio"
                      name="orderSource"
                      checked={orderSource === 'IN_HOUSE'}
                      onChange={() => setOrderSource('IN_HOUSE')}
                      className="mt-0.5 text-[#087F8C]"
                    />
                    <div>
                      <strong className="text-xs block text-[#172B34]">In-House Lab</strong>
                      <span className="text-[10px] text-[#567781]">Standard Tariff Fee</span>
                    </div>
                  </label>

                  <label className={`p-2 rounded-lg border flex items-start gap-2 cursor-pointer bg-white ${
                    orderSource === 'OUTSIDE' ? 'border-amber-400 ring-1 ring-amber-400' : 'border-[#E8EEF2]'
                  }`}>
                    <input
                      type="radio"
                      name="orderSource"
                      checked={orderSource === 'OUTSIDE'}
                      onChange={() => setOrderSource('OUTSIDE')}
                      className="mt-0.5 text-amber-600"
                    />
                    <div>
                      <strong className="text-xs block text-amber-900">Outside Center</strong>
                      <span className="text-[10px] text-amber-700">₹0 hospital charge</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#172B34]">Clinical Indication / Instructions</label>
                <input
                  type="text"
                  placeholder="e.g. Fasting sample, Pre-op screening"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#E8EEF2]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOrderModal(false)}
                  className="h-8 text-xs rounded-lg cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs h-8 px-4 rounded-lg border-0 cursor-pointer shadow-xs"
                >
                  Submit Order
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ENTER TEST RESULTS & VERIFY REPORT                               */}
      {/* ========================================================================= */}
      {showResultModal && selectedLabForResults && (
        <div className="fixed inset-0 bg-[#172B34]/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#E8EEF2] p-4 space-y-3">
            <div className="flex justify-between items-start border-b border-[#E8EEF2] pb-2">
              <div>
                <h3 className="text-sm font-bold text-[#172B34] flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-purple-600" />
                  <span>Enter Diagnostic Findings & Sign Off</span>
                </h3>
                <p className="text-[11px] text-[#567781]">
                  {selectedLabForResults.testName} • {selectedLabForResults.patientName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowResultModal(false)}
                className="text-[#567781] hover:text-[#172B34] p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveResults} className="space-y-2.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[#172B34]">Verifying Pathologist / Technologist *</label>
                <input
                  type="text"
                  required
                  value={technicianName}
                  onChange={(e) => setTechnicianName(e.target.value)}
                  className="w-full h-8 px-2.5 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#172B34]">Clinical Observations & Report Findings *</label>
                <textarea
                  required
                  rows={4}
                  value={resultObservations}
                  onChange={(e) => setResultObservations(e.target.value)}
                  className="w-full p-2 bg-[#F6F9FB] border border-[#E8EEF2] rounded-lg text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#E8EEF2]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowResultModal(false)}
                  className="h-8 text-xs rounded-lg cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-8 px-4 rounded-lg border-0 cursor-pointer shadow-xs"
                >
                  Authorize & Sign Off Report
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
