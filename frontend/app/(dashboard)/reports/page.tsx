'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BarChart3,
  Calendar,
  Download,
  Users,
  TrendingUp,
  IndianRupee,
  UserCheck,
  Award,
  Stethoscope,
  PieChart,
  Activity,
  CheckCircle2,
  FileSpreadsheet,
  X,
  Filter,
  Check,
  Sparkles
} from 'lucide-react';

interface ReportSummary {
  totalConsultations: number;
  totalRevenue: number;
  averageConsultationFee: number;
  activePatients: number;
}

interface RevenueTrend {
  date: string;
  amount: number;
  count: number;
}

interface DoctorShare {
  doctorName: string;
  consultationCount: number;
  revenueShare: number;
}

interface DemographicStats {
  ageDistribution: Record<string, number>;
  genderDistribution: Record<string, number>;
}

interface Doctor {
  id: string;
  name: string;
  specialization: string;
}

const REPORT_TYPES = [
  {
    id: 'FINANCIAL',
    title: 'Financial & Revenue Ledger',
    desc: 'Consultation dates, patient names, doctor, visit type, fee charged, and status.',
    icon: IndianRupee,
  },
  {
    id: 'CLINICAL',
    title: 'Clinical OPD Consultations Log',
    desc: 'Patient symptoms, medical diagnoses, prescriptions, and follow-up dates.',
    icon: Stethoscope,
  },
  {
    id: 'PATIENTS',
    title: 'Patients Directory & Registry',
    desc: 'Complete patient profiles, phone, email, gender, blood group, allergies, and history.',
    icon: Users,
  },
  {
    id: 'DOCTOR_PERFORMANCE',
    title: 'Doctor Productivity & Share',
    desc: 'Completed OPD visits, total collections, and average consultation fee per doctor.',
    icon: Award,
  },
];

export default function ReportsPage() {
  const { user } = useAuth();

  // Filters state
  const [preset, setPreset] = useState<'today' | 'yesterday' | '7days' | '30days' | 'custom'>('7days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');

  // Data states
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [trends, setTrends] = useState<RevenueTrend[]>([]);
  const [doctorShare, setDoctorShare] = useState<DoctorShare[]>([]);
  const [demographics, setDemographics] = useState<DemographicStats | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  // UI states
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState<number | null>(null);

  // Custom Report Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportReportType, setExportReportType] = useState('FINANCIAL');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportDoctorId, setExportDoctorId] = useState('');
  const [exportStatus, setExportStatus] = useState('ALL');

  const formatDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Set date ranges based on preset
  useEffect(() => {
    const today = new Date();
    const start = new Date();
    const end = new Date();

    if (preset === 'today') {
      // Keep today
    } else if (preset === 'yesterday') {
      start.setDate(today.getDate() - 1);
      end.setDate(today.getDate() - 1);
    } else if (preset === '7days') {
      start.setDate(today.getDate() - 6);
    } else if (preset === '30days') {
      start.setDate(today.getDate() - 29);
    }

    if (preset !== 'custom') {
      const s = formatDate(start);
      const e = formatDate(end);
      setStartDate(s);
      setEndDate(e);
      setExportStartDate(s);
      setExportEndDate(e);
    }
  }, [preset]);

  // Load doctors list
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      apiClient
        .get<Doctor[]>('/doctors')
        .then((res) => setDoctors(res.data))
        .catch((err) => console.error('Failed to load doctors filter', err));
    }
  }, [user]);

  // Fetch report data
  useEffect(() => {
    if (!user || !startDate || !endDate) return;

    const fetchReportData = async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = { startDate, endDate };
        if (selectedDoctorId) {
          params.doctorId = selectedDoctorId;
        }

        const [summaryRes, trendsRes, demoRes] = await Promise.all([
          apiClient.get<ReportSummary>('/reports/summary', { params }),
          apiClient.get<RevenueTrend[]>('/reports/revenue-trends', { params }),
          apiClient.get<DemographicStats>('/reports/demographics'),
        ]);

        setSummary(summaryRes.data);
        setTrends(trendsRes.data);
        setDemographics(demoRes.data);

        if (user.role === 'ADMIN') {
          const shareRes = await apiClient.get<DoctorShare[]>('/reports/doctor-share', { params });
          setDoctorShare(shareRes.data);
        }
      } catch (err) {
        console.error('Failed to retrieve analytics', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [user, startDate, endDate, selectedDoctorId]);

  // Execute Customized Report Export
  const executeCustomExport = async () => {
    setExporting(true);
    try {
      const params: Record<string, string> = {
        reportType: exportReportType,
        startDate: exportStartDate || startDate,
        endDate: exportEndDate || endDate,
        status: exportStatus,
      };

      if (exportDoctorId) {
        params.doctorId = exportDoctorId;
      }

      const response = await apiClient.get('/reports/export-csv', {
        params,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const typeLabel = exportReportType.toLowerCase();
      link.setAttribute('download', `${typeLabel}_report_${params.startDate}_to_${params.endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setShowExportModal(false);
    } catch (err) {
      console.error('CSV download failed', err);
      alert('Failed to generate report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Helper to render interactive SVG Line Chart
  const renderTrendSVG = () => {
    if (trends.length === 0) {
      return (
        <div className="h-64 flex flex-col items-center justify-center text-[#567781] space-y-2">
          <BarChart3 className="w-10 h-10 opacity-30 text-[#087F8C]" />
          <span className="text-xs font-bold text-[#567781]">No revenue entries found for this date range</span>
          <span className="text-[11px] text-[#94A3B8]">Completed appointments will display income trends here.</span>
        </div>
      );
    }

    const width = 700;
    const height = 250;
    const paddingLeft = 55;
    const paddingRight = 25;
    const paddingTop = 25;
    const paddingBottom = 35;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const maxVal = Math.max(...trends.map((t) => t.amount), 1000);
    const N = trends.length;

    const points = trends.map((t, idx) => {
      const x = paddingLeft + idx * (chartWidth / Math.max(1, N - 1));
      const y = paddingTop + chartHeight - (t.amount / maxVal) * chartHeight;
      return { x, y, data: t, index: idx };
    });

    let linePath = '';
    let areaPath = '';

    if (points.length > 0) {
      linePath = `M ${points[0].x} ${points[0].y}`;
      areaPath = `M ${points[0].x} ${paddingTop + chartHeight} L ${points[0].x} ${points[0].y}`;

      for (let i = 1; i < points.length; i++) {
        linePath += ` L ${points[i].x} ${points[i].y}`;
        areaPath += ` L ${points[i].x} ${points[i].y}`;
      }

      areaPath += ` L ${points[points.length - 1].x} ${paddingTop + chartHeight} Z`;
    }

    return (
      <div className="relative font-sans">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#087F8C" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#087F8C" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = paddingTop + chartHeight * ratio;
            const val = Math.round(maxVal * (1 - ratio));
            return (
              <g key={idx} className="opacity-60">
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#E8EEF2" strokeDasharray="3 3" strokeWidth="1" />
                <text x={paddingLeft - 8} y={y + 4} textAnchor="end" className="text-[10px] font-bold fill-[#567781] font-mono">
                  ₹{val}
                </text>
              </g>
            );
          })}

          {/* Area under line */}
          {areaPath && <path d={areaPath} fill="url(#chartGradient)" />}

          {/* Core path line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#087F8C"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data interactive circle markers & overlay hover lines */}
          {points.map((p, idx) => {
            const isHovered = hoveredTrendIdx === idx;
            return (
              <g key={idx}>
                {isHovered && (
                  <line
                    x1={p.x}
                    y1={paddingTop}
                    x2={p.x}
                    y2={paddingTop + chartHeight}
                    stroke="#087F8C"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                    className="opacity-70"
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 6 : 4}
                  fill={isHovered ? '#087F8C' : '#ffffff'}
                  stroke="#087F8C"
                  strokeWidth="2.5"
                  className="transition-all duration-150 cursor-pointer"
                  onMouseEnter={() => setHoveredTrendIdx(idx)}
                  onMouseLeave={() => setHoveredTrendIdx(null)}
                />
                <rect
                  x={p.x - 12}
                  y={paddingTop}
                  width={24}
                  height={chartHeight}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredTrendIdx(idx)}
                  onMouseLeave={() => setHoveredTrendIdx(null)}
                />
              </g>
            );
          })}

          {/* X Axis labels */}
          {points
            .filter((_, i) => N < 8 || i % Math.ceil(N / 6) === 0)
            .map((p, idx) => {
              const parts = p.data.date.split('-');
              const label = parts.length >= 3 ? `${parts[2]}/${parts[1]}` : p.data.date;
              return (
                <text key={idx} x={p.x} y={height - 10} textAnchor="middle" className="text-[10px] font-bold fill-[#567781] font-mono">
                  {label}
                </text>
              );
            })}
        </svg>

        {/* Hover Tooltip */}
        {hoveredTrendIdx !== null && trends[hoveredTrendIdx] && (
          <div
            className="absolute bg-[#172B34] text-white px-3.5 py-2 rounded-xl text-xs shadow-xl border border-[#172B34] pointer-events-none transition-all duration-100 flex flex-col font-sans z-10"
            style={{
              left: `${(points[hoveredTrendIdx].x / width) * 100}%`,
              top: `${Math.max(10, ((points[hoveredTrendIdx].y - 50) / height) * 100)}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <span className="font-bold text-[#4FA8DB] text-[10px] uppercase tracking-wider">{trends[hoveredTrendIdx].date}</span>
            <span className="font-extrabold text-sm text-white mt-0.5">₹{trends[hoveredTrendIdx].amount}</span>
            <span className="text-[10px] font-semibold text-[#CBD5E1] mt-0.5">{trends[hoveredTrendIdx].count} Consultations</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      {/* 1. TOP HEADER BANNER - Simple English & Action Controls */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-[#E8EEF2] shadow-2xs p-5 sm:p-6 transition-all space-y-4">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-[#087F8C]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-10 w-48 h-48 bg-[#4FA8DB]/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#087F8C]/10 text-[#087F8C] border border-[#087F8C]/20 flex items-center justify-center font-bold shrink-0 shadow-2xs">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#172B34] tracking-tight">
                Reports & Analytics
              </h1>
              <p className="text-xs text-[#567781] font-medium mt-0.5">
                Track clinic revenue, patient visits, doctor performance, and patient demographics.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <Button
              onClick={() => setShowExportModal(true)}
              className="h-9 bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs px-4.5 rounded-xl shadow-xs shadow-[#087F8C]/20 border-0 cursor-pointer flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Generate Custom Report</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Revenue */}
        <div className="bg-white border border-[#E8EEF2] rounded-2xl p-4.5 shadow-2xs space-y-1">
          <span className="text-[10px] sm:text-[11px] font-bold text-[#087F8C] uppercase tracking-wider block">
            Total Revenue
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-[#087F8C]">
            ₹{summary?.totalRevenue?.toLocaleString('en-IN') ?? 0}
          </div>
          <span className="text-[11px] text-[#567781] font-medium">Across selected period</span>
        </div>

        {/* Consultations Done */}
        <div className="bg-white border border-[#E8EEF2] rounded-2xl p-4.5 shadow-2xs space-y-1">
          <span className="text-[10px] sm:text-[11px] font-bold text-[#22A06B] uppercase tracking-wider block">
            Consultations Done
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-[#22A06B]">
            {summary?.totalConsultations ?? 0}
          </div>
          <span className="text-[11px] text-[#567781] font-medium">Completed patient visits</span>
        </div>

        {/* Avg Fee / Visit */}
        <div className="bg-white border border-[#E8EEF2] rounded-2xl p-4.5 shadow-2xs space-y-1">
          <span className="text-[10px] sm:text-[11px] font-bold text-[#E9A23B] uppercase tracking-wider block">
            Avg Fee / Visit
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-[#172B34]">
            ₹{summary?.averageConsultationFee ?? 0}
          </div>
          <span className="text-[11px] text-[#567781] font-medium">Average consultation fee</span>
        </div>

        {/* Active Patients */}
        <div className="bg-white border border-[#E8EEF2] rounded-2xl p-4.5 shadow-2xs space-y-1">
          <span className="text-[10px] sm:text-[11px] font-bold text-[#567781] uppercase tracking-wider block">
            Active Patients
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-[#172B34]">
            {summary?.activePatients ?? 0}
          </div>
          <span className="text-[11px] text-[#567781] font-medium">Registered clinic patients</span>
        </div>
      </div>

      {/* 3. FILTER CONTROLS TOOLBAR - Perfectly Optimized for iPad, Mobile & Laptop */}
      <div className="bg-white border border-[#E8EEF2] p-3.5 sm:p-4 rounded-2xl shadow-2xs flex flex-col xl:flex-row gap-3.5 xl:items-center justify-between">
        {/* Preset Range Buttons */}
        <div className="flex bg-[#F6F9FB] p-1 rounded-xl border border-[#E8EEF2] overflow-x-auto shrink-0 gap-1">
          {(['today', 'yesterday', '7days', '30days', 'custom'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex-1 sm:flex-initial text-center ${
                preset === p
                  ? 'bg-white text-[#087F8C] shadow-2xs border border-[#E8EEF2]'
                  : 'text-[#567781] hover:text-[#172B34]'
              }`}
            >
              {p === 'today' && 'Today'}
              {p === 'yesterday' && 'Yesterday'}
              {p === '7days' && 'Last 7 Days'}
              {p === '30days' && 'Last 30 Days'}
              {p === 'custom' && 'Custom Dates'}
            </button>
          ))}
        </div>

        {/* Date Range Inputs & Doctor Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full xl:w-auto">
          {/* Date range picker box */}
          <div className="flex items-center gap-1.5 bg-[#F6F9FB] p-1 rounded-xl border border-[#E8EEF2] flex-1 sm:flex-initial">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPreset('custom');
              }}
              className="h-8 text-xs rounded-lg flex-1 sm:w-32 bg-white border border-[#E8EEF2] text-[#172B34] focus-visible:ring-[#087F8C] px-2 shadow-2xs"
            />
            <span className="text-[#567781] text-[11px] font-bold px-1">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPreset('custom');
              }}
              className="h-8 text-xs rounded-lg flex-1 sm:w-32 bg-white border border-[#E8EEF2] text-[#172B34] focus-visible:ring-[#087F8C] px-2 shadow-2xs"
            />
          </div>

          {/* Doctor Selector */}
          {user?.role === 'ADMIN' && (
            <div className="w-full sm:w-48 shrink-0">
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full h-8.5 px-3 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] text-xs font-semibold text-[#172B34] focus:outline-none focus:ring-2 focus:ring-[#087F8C] cursor-pointer"
              >
                <option value="">All Doctors</option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    Dr. {doc.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 4. REVENUE CHARTS & PRODUCTIVITY BREAKDOWN */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 sm:gap-6">
        {/* Revenue Velocity SVG Chart */}
        <div className="xl:col-span-8 bg-white border border-[#E8EEF2] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex justify-between items-center border-b border-[#E8EEF2] pb-3.5">
            <div>
              <h3 className="font-extrabold text-[#172B34] text-sm sm:text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#087F8C]" />
                <span>Revenue & Consultation Trends</span>
              </h3>
              <p className="text-xs text-[#567781] font-medium mt-0.5">Daily earnings timeline across selected interval</p>
            </div>
            <span className="text-[11px] font-mono font-bold text-[#567781] bg-[#F6F9FB] px-2.5 py-1 rounded-lg border border-[#E8EEF2]">
              {startDate} — {endDate}
            </span>
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-8 h-8 border-3 border-[#087F8C]/20 border-t-[#087F8C] rounded-full animate-spin"></div>
            </div>
          ) : (
            renderTrendSVG()
          )}
        </div>

        {/* Doctor Share Productivity */}
        <div className="xl:col-span-4 bg-white border border-[#E8EEF2] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="border-b border-[#E8EEF2] pb-3.5">
            <h3 className="font-extrabold text-[#172B34] text-sm sm:text-base flex items-center gap-2">
              <Award className="w-4 h-4 text-[#087F8C]" />
              <span>Doctor Performance</span>
            </h3>
            <p className="text-xs text-[#567781] font-medium mt-0.5">Revenue and OPD consults by practitioner</p>
          </div>

          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-[#087F8C]/20 border-t-[#087F8C] rounded-full animate-spin"></div>
            </div>
          ) : doctorShare.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-[#567781] space-y-1">
              <UserCheck className="w-8 h-8 opacity-30 text-[#087F8C] mb-1" />
              <span className="text-xs font-bold">No doctor consults recorded</span>
              <span className="text-[11px] text-[#94A3B8]">Completed visits will rank here.</span>
            </div>
          ) : (
            <div className="space-y-4">
              {(() => {
                const totalDocRev = doctorShare.reduce((s, d) => s + d.revenueShare, 0);
                return doctorShare.map((doc, idx) => {
                  const pct = totalDocRev === 0 ? 0 : Math.round((doc.revenueShare / totalDocRev) * 100);
                  return (
                    <div key={idx} className="space-y-1.5 bg-[#F6F9FB] p-3 rounded-xl border border-[#E8EEF2]">
                      <div className="flex justify-between text-xs font-bold text-[#172B34]">
                        <span>Dr. {doc.doctorName}</span>
                        <span className="font-mono text-[#087F8C]">₹{doc.revenueShare.toLocaleString('en-IN')} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-[#E8EEF2] rounded-full overflow-hidden">
                        <div className="bg-[#087F8C] rounded-full h-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between text-[11px] text-[#567781] font-medium pt-0.5">
                        <span>{doc.consultationCount} completed consults</span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      </div>

      {/* 5. PATIENT DEMOGRAPHICS DISTRIBUTION */}
      {demographics && (
        <div className="bg-white border border-[#E8EEF2] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
          <div className="border-b border-[#E8EEF2] pb-3.5">
            <h3 className="font-extrabold text-[#172B34] text-sm sm:text-base flex items-center gap-2">
              <PieChart className="w-4 h-4 text-[#087F8C]" />
              <span>Patient Demographic Mix</span>
            </h3>
            <p className="text-xs text-[#567781] font-medium mt-0.5">Age brackets and gender distribution of registered patients</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Age Groups */}
            <div className="space-y-3 bg-[#F6F9FB] p-4 rounded-xl border border-[#E8EEF2]">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#567781] border-b border-[#E8EEF2] pb-2">
                Age Distribution
              </h4>
              {(() => {
                const totalAge = Object.values(demographics.ageDistribution).reduce((a, b) => a + b, 0);
                return Object.entries(demographics.ageDistribution).map(([bracket, count]) => {
                  const pct = totalAge === 0 ? 0 : Math.round((count / totalAge) * 100);
                  return (
                    <div key={bracket} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-[#172B34]">
                        <span>{bracket} Years</span>
                        <span className="text-[#567781] font-semibold">{count} Patients ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-[#E8EEF2] rounded-full overflow-hidden">
                        <div className="bg-[#087F8C] rounded-full h-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Gender Distribution */}
            <div className="space-y-3 bg-[#F6F9FB] p-4 rounded-xl border border-[#E8EEF2]">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#567781] border-b border-[#E8EEF2] pb-2">
                Gender Breakdown
              </h4>
              {(() => {
                const totalGender = Object.values(demographics.genderDistribution).reduce((a, b) => a + b, 0);
                return Object.entries(demographics.genderDistribution).map(([gender, count]) => {
                  const pct = totalGender === 0 ? 0 : Math.round((count / totalGender) * 100);
                  let barColor = 'bg-[#087F8C]';
                  if (gender.toLowerCase().includes('female')) barColor = 'bg-[#4FA8DB]';
                  if (gender.toLowerCase().includes('other')) barColor = 'bg-[#E9A23B]';

                  return (
                    <div key={gender} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-[#172B34]">
                        <span className="capitalize">{gender.toLowerCase()}</span>
                        <span className="text-[#567781] font-semibold">{count} Patients ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-[#E8EEF2] rounded-full overflow-hidden">
                        <div className={`${barColor} rounded-full h-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* 6. CUSTOM REPORT GENERATOR MODAL */}
      {showExportModal && (
        <div className="fixed inset-0 bg-[#172B34]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-[#E8EEF2] p-5 sm:p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-[#E8EEF2] pb-3.5">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#172B34] flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-[#087F8C]" />
                  <span>Generate Custom CSV Report</span>
                </h2>
                <p className="text-xs text-[#567781] font-medium mt-0.5">
                  Select report category and filters according to your exact requirements.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="p-1 text-[#567781] hover:text-[#172B34] rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Select Report Type */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#172B34] block">
                1. Select Report Category
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {REPORT_TYPES.map((rt) => {
                  const Icon = rt.icon;
                  const isSelected = exportReportType === rt.id;
                  return (
                    <button
                      key={rt.id}
                      type="button"
                      onClick={() => setExportReportType(rt.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer space-y-1 ${
                        isSelected
                          ? 'border-[#087F8C] bg-[#087F8C]/5 shadow-2xs'
                          : 'border-[#E8EEF2] bg-[#F6F9FB] hover:border-[#CBD5E1]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-[#087F8C]' : 'text-[#567781]'}`} />
                          <span className={`text-xs font-bold ${isSelected ? 'text-[#087F8C]' : 'text-[#172B34]'}`}>
                            {rt.title}
                          </span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#087F8C]" />}
                      </div>
                      <p className="text-[11px] text-[#567781] leading-snug line-clamp-2">
                        {rt.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Date Range & Filters (Shown for non-patient reports) */}
            {exportReportType !== 'PATIENTS' && (
              <div className="space-y-3 pt-1 border-t border-[#E8EEF2]">
                <label className="text-xs font-bold text-[#172B34] block">
                  2. Customize Date Range & Filters
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Start Date */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-[#567781]">From Date:</span>
                    <Input
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                      className="h-9 text-xs rounded-xl bg-[#F6F9FB] border-[#E8EEF2] text-[#172B34] focus-visible:ring-[#087F8C]"
                    />
                  </div>

                  {/* End Date */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-[#567781]">To Date:</span>
                    <Input
                      type="date"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                      className="h-9 text-xs rounded-xl bg-[#F6F9FB] border-[#E8EEF2] text-[#172B34] focus-visible:ring-[#087F8C]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Doctor Filter */}
                  {user?.role === 'ADMIN' && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-[#567781]">Attending Doctor:</span>
                      <select
                        value={exportDoctorId}
                        onChange={(e) => setExportDoctorId(e.target.value)}
                        className="w-full h-9 px-3 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] text-xs font-semibold text-[#172B34] focus:outline-none focus:ring-2 focus:ring-[#087F8C] cursor-pointer"
                      >
                        <option value="">All Doctors</option>
                        {doctors.map((doc) => (
                          <option key={doc.id} value={doc.id}>
                            Dr. {doc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Status Filter (for Financial / Clinical) */}
                  {(exportReportType === 'FINANCIAL' || exportReportType === 'CLINICAL') && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-[#567781]">Visit Status:</span>
                      <select
                        value={exportStatus}
                        onChange={(e) => setExportStatus(e.target.value)}
                        className="w-full h-9 px-3 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] text-xs font-semibold text-[#172B34] focus:outline-none focus:ring-2 focus:ring-[#087F8C] cursor-pointer"
                      >
                        <option value="ALL">All Statuses (Completed, Scheduled, etc.)</option>
                        <option value="COMPLETED">Completed Only</option>
                        <option value="SCHEDULED">Scheduled Only</option>
                        <option value="CANCELLED">Cancelled Only</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-3 flex items-center justify-between border-t border-[#E8EEF2]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowExportModal(false)}
                className="text-xs font-bold rounded-xl border-[#E8EEF2] text-[#567781] hover:text-[#172B34] cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={executeCustomExport}
                disabled={exporting}
                className="bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs rounded-xl px-5 border-0 cursor-pointer shadow-xs shadow-[#087F8C]/20 flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{exporting ? 'Exporting File...' : 'Download CSV Report'}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
