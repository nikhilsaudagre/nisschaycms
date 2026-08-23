'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  BarChart3,
  Calendar,
  Download,
  Users,
  TrendingUp,
  IndianRupee,
  UserCheck,
  RefreshCw,
  Clock,
  ChevronRight,
  Activity,
  Award,
  Stethoscope,
  PieChart,
  ShieldCheck,
  Building
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
      setStartDate(formatDate(start));
      setEndDate(formatDate(end));
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

  const handleExportCSV = async () => {
    if (!startDate || !endDate) return;
    setExporting(true);
    try {
      const response = await apiClient.get('/reports/export-csv', {
        params: { startDate, endDate },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `clinic_ledger_report_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('CSV download failed', err);
    } finally {
      setExporting(false);
    }
  };

  // Helper to render dynamic SVG Line Chart
  const renderTrendSVG = () => {
    if (trends.length === 0) {
      return (
        <div className="h-64 flex flex-col items-center justify-center text-slate-400">
          <BarChart3 className="w-10 h-10 opacity-40 mb-2" />
          <span className="text-xs font-semibold">No revenue data recorded for this date range</span>
        </div>
      );
    }

    const width = 700;
    const height = 260;
    const paddingLeft = 55;
    const paddingRight = 25;
    const paddingTop = 30;
    const paddingBottom = 40;

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
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d9488" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#0d9488" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = paddingTop + chartHeight * ratio;
            const val = Math.round(maxVal * (1 - ratio));
            return (
              <g key={idx} className="opacity-40">
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#cbd5e1" strokeDasharray="4 4" strokeWidth="1" />
                <text x={paddingLeft - 8} y={y + 4} textAnchor="end" className="text-[10px] font-bold fill-slate-400 font-mono">
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
              stroke="#0d9488"
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
                    stroke="#0d9488"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                    className="opacity-70"
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 6 : 4}
                  fill={isHovered ? '#042f2e' : '#0d9488'}
                  stroke="#ffffff"
                  strokeWidth="2"
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
                <text key={idx} x={p.x} y={height - 12} textAnchor="middle" className="text-[10px] font-bold fill-slate-400 font-mono">
                  {label}
                </text>
              );
            })}
        </svg>

        {/* Hover Tooltip */}
        {hoveredTrendIdx !== null && trends[hoveredTrendIdx] && (
          <div
            className="absolute bg-slate-900/95 backdrop-blur-sm text-white px-3.5 py-2 rounded-xl text-xs shadow-xl border border-slate-700 pointer-events-none transition-all duration-100 flex flex-col font-sans z-10"
            style={{
              left: `${(points[hoveredTrendIdx].x / width) * 100}%`,
              top: `${Math.max(10, ((points[hoveredTrendIdx].y - 50) / height) * 100)}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <span className="font-bold text-slate-300 text-[10px] uppercase tracking-wider">{trends[hoveredTrendIdx].date}</span>
            <span className="font-extrabold text-sm text-teal-300 mt-0.5">₹{trends[hoveredTrendIdx].amount}</span>
            <span className="text-[10px] font-semibold text-slate-400 mt-0.5">{trends[hoveredTrendIdx].count} Consultations</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. EXECUTIVE HEADER BANNER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2.5 bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 rounded-2xl border border-teal-100 dark:border-teal-800">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Financial & Clinical Intelligence
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Analyze clinic consultation revenue, practitioner productivity, and patient demographic distribution in real-time.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button
            onClick={handleExportCSV}
            disabled={exporting || loading}
            className="h-10 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs px-5 rounded-xl shadow-xs cursor-pointer flex items-center gap-2 border-0"
          >
            <Download className="w-4 h-4" />
            <span>{exporting ? 'Generating Ledger...' : 'Export CSV Ledger'}</span>
          </Button>
        </div>
      </div>

      {/* STATS CARDS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Total Revenue</span>
            <div className="text-2xl font-extrabold text-teal-600 dark:text-teal-400">
              ₹{summary?.totalRevenue ?? 0}
            </div>
          </div>
          <div className="w-11 h-11 bg-teal-50 dark:bg-teal-950/50 rounded-xl flex items-center justify-center text-teal-600 dark:text-teal-400">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Consultations Done</span>
            <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
              {summary?.totalConsultations ?? 0}
            </div>
          </div>
          <div className="w-11 h-11 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Avg Fee / Visit</span>
            <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
              ₹{summary?.averageConsultationFee ?? 0}
            </div>
          </div>
          <div className="w-11 h-11 bg-amber-50 dark:bg-amber-950/50 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Patients</span>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {summary?.activePatients ?? 0}
            </div>
          </div>
          <div className="w-11 h-11 bg-slate-50 dark:bg-slate-850 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. FILTER CONTROLS TOOLBAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Preset Buttons */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0 overflow-x-auto">
            {(['today', 'yesterday', '7days', '30days', 'custom'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  preset === p
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
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

          {/* Date Pickers & Doctor Filter */}
          <div className="flex flex-wrap items-center gap-3 justify-end">
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPreset('custom');
                }}
                className="h-10 text-xs rounded-xl w-34 bg-slate-50 dark:bg-slate-850"
              />
              <span className="text-slate-400 text-xs font-bold">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPreset('custom');
                }}
                className="h-10 text-xs rounded-xl w-34 bg-slate-50 dark:bg-slate-850"
              />
            </div>

            {user?.role === 'ADMIN' && (
              <div className="w-full sm:w-52 shrink-0">
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">All Attending Doctors</option>
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
      </div>

      {/* 3. CHARTS & PRODUCTIVITY BREAKDOWNS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Revenue Trend Chart */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-600" />
                <span>Revenue & Consultation Velocity</span>
              </h3>
              <p className="text-xs text-slate-400 font-medium">Daily income timeline across selected interval</p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
              {startDate} — {endDate}
            </span>
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-8 h-8 border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
            </div>
          ) : (
            renderTrendSVG()
          )}
        </div>

        {/* Doctor Revenue Share Breakdown */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-600" />
              <span>Practitioner Productivity</span>
            </h3>
            <p className="text-xs text-slate-400 font-medium">Revenue contribution by doctor</p>
          </div>

          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
          ) : doctorShare.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-400">
              <UserCheck className="w-8 h-8 opacity-40 mb-2" />
              <span className="text-xs font-semibold">No doctor revenues found</span>
            </div>
          ) : (
            <div className="space-y-4">
              {(() => {
                const totalDocRev = doctorShare.reduce((s, d) => s + d.revenueShare, 0);
                return doctorShare.map((doc, idx) => {
                  const pct = totalDocRev === 0 ? 0 : Math.round((doc.revenueShare / totalDocRev) * 100);
                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                        <span>Dr. {doc.doctorName}</span>
                        <span className="font-mono text-teal-600 dark:text-teal-400">₹{doc.revenueShare} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="bg-teal-600 rounded-full h-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 font-medium">
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

      {/* 4. DEMOGRAPHICS SPLIT CARDS */}
      {demographics && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <PieChart className="w-4 h-4 text-teal-600" />
              <span>Patient Demographic Distribution</span>
            </h3>
            <p className="text-xs text-slate-400 font-medium">Age brackets and gender distribution of registered patients</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Age Groups */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Age Distribution</h4>
              {(() => {
                const totalAge = Object.values(demographics.ageDistribution).reduce((a, b) => a + b, 0);
                return Object.entries(demographics.ageDistribution).map(([bracket, count]) => {
                  const pct = totalAge === 0 ? 0 : Math.round((count / totalAge) * 100);
                  return (
                    <div key={bracket} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                        <span>{bracket} Years</span>
                        <span>{count} Patients ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 rounded-full h-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Gender Distribution */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Gender Breakdown</h4>
              {(() => {
                const totalGender = Object.values(demographics.genderDistribution).reduce((a, b) => a + b, 0);
                return Object.entries(demographics.genderDistribution).map(([gender, count]) => {
                  const pct = totalGender === 0 ? 0 : Math.round((count / totalGender) * 100);
                  let color = 'bg-teal-500';
                  if (gender.toLowerCase().includes('female')) color = 'bg-pink-500';
                  if (gender.toLowerCase().includes('other')) color = 'bg-amber-500';

                  return (
                    <div key={gender} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                        <span className="uppercase tracking-wide">{gender}</span>
                        <span>{count} Patients ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`${color} rounded-full h-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
