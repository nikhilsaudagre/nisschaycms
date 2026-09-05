'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Doctor } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DoctorForm } from '@/components/doctor-form';
import { StaffCreateModal, MASTER_HOSPITAL_ROLES, renderRoleIcon } from '@/components/staff-create-modal';
import { StaffMonthlyTimecardModal, StaffTimecardUser } from '@/components/staff-monthly-timecard-modal';
import {
  Stethoscope,
  Plus,
  Search,
  Users,
  UserCheck,
  Phone,
  Mail,
  Clock,
  IndianRupee,
  Award,
  Calendar,
  Edit2,
  Eye,
  ToggleLeft,
  ToggleRight,
  LayoutGrid,
  List,
  CheckCircle2,
  X,
  CalendarPlus,
  ShieldCheck,
  AlertCircle,
  Briefcase,
  UserPlus,
  Trash2,
  Lock,
  ClipboardList,
  MapPin,
  Flame,
  CalendarDays,
  ShieldAlert,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Sparkles,
  Activity,
  HeartPulse,
  FlaskConical,
  Building2,
  Shield,
  Clock3,
  BadgeCheck,
  DoorOpen,
  BarChart3,
  Percent,
  FileSpreadsheet,
  LogIn,
  LogOut,
  Filter,
  Check,
  Layers,
  Grid3X3,
  Radio,
  Timer,
  CheckSquare,
  ArrowRight,
  Building,
  BedDouble,
  Pill,
  CreditCard,
  Wrench
} from 'lucide-react';

const CATEGORY_TABS = [
  { id: 'ALL', label: 'All Hospital Personnel', iconName: 'Users' },
  { id: 'DOCTORS', label: 'Doctors & Specialists', iconName: 'Stethoscope' },
  { id: 'NURSING', label: 'Nursing & Critical Care', iconName: 'HeartPulse' },
  { id: 'DIAGNOSTICS', label: 'Diagnostics & Pharmacy', iconName: 'FlaskConical' },
  { id: 'ADMIN_BILLING', label: 'Admin & Billing', iconName: 'Briefcase' },
  { id: 'FACILITY', label: 'Facility & Support', iconName: 'Building2' },
];

const DAYS_OF_WEEK = [
  { id: 'MONDAY', label: 'Monday' },
  { id: 'TUESDAY', label: 'Tuesday' },
  { id: 'WEDNESDAY', label: 'Wednesday' },
  { id: 'THURSDAY', label: 'Thursday' },
  { id: 'FRIDAY', label: 'Friday' },
  { id: 'SATURDAY', label: 'Saturday' },
  { id: 'SUNDAY', label: 'Sunday' },
];

const SHIFT_OPTIONS = [
  'Morning (08:00 AM - 02:00 PM)',
  'Evening (02:00 PM - 08:00 PM)',
  'Night (08:00 PM - 08:00 AM)',
  'General Day (09:00 AM - 06:00 PM)',
  'Emergency 24x7 Rotational',
  'Weekly Off / Holiday'
];

export default function DoctorsAndStaffDirectoryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  // Workstation View Modes
  const [activeModuleTab, setActiveModuleTab] = useState<'DIRECTORY' | 'DAILY_ATTENDANCE' | 'MONTHLY_SUMMARY' | 'WEEKLY_ROSTER'>('DIRECTORY');

  // Directory Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // Attendance Date & Monthly Matrix Filter
  const getTodayString = () => new Date().toISOString().split('T')[0];
  const [attendanceDate, setAttendanceDate] = useState<string>(getTodayString());
  const [selectedRosterDay, setSelectedRosterDay] = useState<string>('MONDAY');

  // Attendance Workstation Smart Filters & View Mode
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [attendanceShiftFilter, setAttendanceShiftFilter] = useState<string>('ALL');
  const [attendanceDeptFilter, setAttendanceDeptFilter] = useState<string>('ALL');
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<string>('ALL');
  const [attendanceViewMode, setAttendanceViewMode] = useState<'table' | 'floor_grid'>('table');

  const currentDate = new Date();
  const [summaryYear, setSummaryYear] = useState<number>(currentDate.getFullYear());
  const [summaryMonth, setSummaryMonth] = useState<number>(currentDate.getMonth() + 1);

  // Modals
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [selectedStaffTimecard, setSelectedStaffTimecard] = useState<StaffTimecardUser | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Custom Time Punch / Adjust Modal State
  const [punchEditModal, setPunchEditModal] = useState<{
    isOpen: boolean;
    staffId: string;
    staffName: string;
    employeeId: string;
    roleName: string;
    category: string;
    status: string;
    clockInTime: string;
    clockOutTime: string;
    shiftName: string;
    location: string;
    remarks: string;
  } | null>(null);

  // 1. Fetch doctors profiles
  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ['doctors-profiles'],
    queryFn: async () => {
      const response = await apiClient.get('/doctors');
      return response.data || [];
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // 2. Fetch all hospital staff users
  const { data: staffUsers = [] } = useQuery<any[]>({
    queryKey: ['staff-users-list'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/users/staff');
        return response.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // 3. Fetch Daily Attendance Records
  const { data: attendanceRecords = [], refetch: refetchAttendance } = useQuery<any[]>({
    queryKey: ['staff-attendance', attendanceDate],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/staff/attendance', {
          params: { date: attendanceDate }
        });
        return response.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // 4. Fetch Monthly Attendance Summary Matrix
  const { data: monthlySummary = [], isLoading: isSummaryLoading, refetch: refetchSummary } = useQuery<any[]>({
    queryKey: ['staff-monthly-summary', summaryYear, summaryMonth],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/staff/attendance/summary', {
          params: { year: summaryYear, month: summaryMonth }
        });
        return response.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // 5. Fetch Weekly Duty Roster Records
  const { data: rosterRecords = [], refetch: refetchRoster } = useQuery<any[]>({
    queryKey: ['staff-roster'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/staff/roster');
        return response.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // Mutations
  const toggleDoctorStatusMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/doctors/${id}/status`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      queryClient.invalidateQueries({ queryKey: ['doctors-list'] });
      queryClient.invalidateQueries({ queryKey: ['staff-users-list'] });
      queryClient.invalidateQueries({ queryKey: ['staff-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['staff-monthly-summary'] });
      setToastMsg('Doctor status updated');
      setTimeout(() => setToastMsg(null), 3000);
    },
  });

  const deleteStaffMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!confirm('Are you sure you want to remove this staff member?')) return;
      await apiClient.delete(`/users/staff/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-users-list'] });
      queryClient.invalidateQueries({ queryKey: ['doctors-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['staff-list'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['staff-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['staff-monthly-summary'] });
      queryClient.invalidateQueries({ queryKey: ['staff-roster'] });
      setToastMsg('Staff member removed successfully');
      setTimeout(() => setToastMsg(null), 3000);
    },
  });

  // Punch Attendance Mutation
  const punchAttendanceMutation = useMutation({
    mutationFn: async ({ userId, status, shiftName, location, clockInTime, clockOutTime, remarks }: any) => {
      const today = getTodayString();
      if (attendanceDate !== today) {
        throw new Error('Attendance punching is locked to today only. Historical past records are read-only.');
      }
      await apiClient.post('/staff/attendance/punch', {
        userId,
        date: attendanceDate,
        status,
        shiftName: shiftName || 'Morning (08:00 - 14:00)',
        location: location || 'Hospital Station',
        clockInTime: clockInTime !== undefined ? clockInTime : null,
        clockOutTime: clockOutTime !== undefined ? clockOutTime : null,
        remarks: remarks || 'Direct punch from Daily Desk'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-attendance', attendanceDate] });
      queryClient.invalidateQueries({ queryKey: ['staff-monthly-summary'] });
      setToastMsg('✓ Staff attendance punch recorded');
      setTimeout(() => setToastMsg(null), 3000);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to record attendance punch';
      setToastMsg(`⚠️ ${msg}`);
      setTimeout(() => setToastMsg(null), 3500);
    }
  });


  // Save Roster Slot Mutation
  const saveRosterSlotMutation = useMutation({
    mutationFn: async ({ userId, dayOfWeek, shiftName, wardOrCabin, isOffDay }: any) => {
      await apiClient.post('/staff/roster/save', {
        userId,
        dayOfWeek,
        shiftName,
        wardOrCabin,
        isOffDay: !!isOffDay
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-roster'] });
      setToastMsg('✓ Weekly duty roster slot saved');
      setTimeout(() => setToastMsg(null), 3000);
    },
  });

  // Combine Doctors & Staff into unified roster with Sequential IDs
  const combinedRoster = useMemo(() => {
    // 1. Map Doctors
    const doctorItems = doctors.map((d, index) => {
      const docCode = d.employeeId || `DOC-2026-${String(index + 1).padStart(4, '0')}`;
      return {
        id: d.id,
        employeeId: docCode,
        name: d.name.startsWith('Dr.') ? d.name : `Dr. ${d.name}`,
        roleId: 'DOCTOR',
        roleName: 'Consultant Doctor',
        category: 'DOCTORS',
        specialization: d.specialization || 'General Medicine',
        qualification: d.qualification || 'MBBS, MD',
        registrationNumber: d.registrationNumber || '',
        phone: d.phone,
        email: d.email,
        department: d.specialization || 'Clinical Services',
        shiftTiming: 'Morning & Evening OPD',
        deskNumber: d.roomNumber || 'OPD Cabin #1',
        consultationFee: d.consultationFee || 500,
        active: d.active,
        isDoctorEntity: true,
        iconName: 'Stethoscope',
        raw: d
      };
    });

    // 2. Map Staff
    const existingDoctorEmails = new Set(doctors.map(d => d.email?.toLowerCase()));
    const staffItems = staffUsers
      .filter(u => !existingDoctorEmails.has(u.email?.toLowerCase()))
      .map((u, index) => {
        const roleDef = MASTER_HOSPITAL_ROLES.find(r => r.id === u.role) || {
          id: u.role || 'STAFF',
          name: u.role || 'Hospital Staff',
          category: 'ADMIN_BILLING',
          description: 'Hospital Team Member',
          iconName: 'UserCheck'
        };
        const empCode = u.employeeId || `EMP-2026-${String(index + 10).padStart(4, '0')}`;
        return {
          id: u.id,
          employeeId: empCode,
          name: u.name,
          roleId: u.role,
          roleName: roleDef.name,
          category: roleDef.category,
          specialization: roleDef.name,
          qualification: 'Staff Member',
          registrationNumber: '',
          phone: u.phone,
          email: u.email,
          department: u.department || 'General Operations',
          shiftTiming: u.shiftTiming || 'Morning (08:00 AM - 04:00 PM)',
          deskNumber: u.deskNumber || 'Staff Counter',
          consultationFee: 0,
          active: u.active !== undefined ? u.active : true,
          isDoctorEntity: false,
          iconName: roleDef.iconName || 'UserCheck',
          raw: u
        };
      });

    return [...doctorItems, ...staffItems];
  }, [doctors, staffUsers]);

  // Filtered Roster
  const filteredRoster = useMemo(() => {
    return combinedRoster.filter(item => {
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
      if (selectedRoleFilter !== 'ALL' && item.roleId !== selectedRoleFilter) return false;
      if (statusFilter === 'ACTIVE' && !item.active) return false;
      if (statusFilter === 'INACTIVE' && item.active) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const idMatch = item.employeeId?.toLowerCase().includes(q);
        const nameMatch = item.name?.toLowerCase().includes(q);
        const specMatch = item.specialization?.toLowerCase().includes(q);
        const roleMatch = item.roleName?.toLowerCase().includes(q);
        const phoneMatch = item.phone?.toLowerCase().includes(q);
        const emailMatch = item.email?.toLowerCase().includes(q);
        const regMatch = item.registrationNumber?.toLowerCase().includes(q);
        return idMatch || nameMatch || specMatch || roleMatch || phoneMatch || emailMatch || regMatch;
      }
      return true;
    });
  }, [combinedRoster, selectedCategory, selectedRoleFilter, statusFilter, searchTerm]);

  // Metrics
  const totalStaff = combinedRoster.length;
  const totalDoctorsCount = combinedRoster.filter(i => i.category === 'DOCTORS').length;
  const totalNursingCount = combinedRoster.filter(i => i.category === 'NURSING').length;
  const totalAdminCount = combinedRoster.filter(i => i.category === 'ADMIN_BILLING').length;

  // Attendance Desk Statistics
  const attendanceStats = useMemo(() => {
    const total = combinedRoster.length;
    let present = 0;
    let onLeave = 0;
    let halfDay = 0;
    let late = 0;
    let absent = 0;
    
    // Group attendance records by user
    const recordMap = new Map<string, any>();
    attendanceRecords.forEach((rec: any) => {
      recordMap.set(rec.userId, rec);
      if (rec.status === 'PRESENT') present++;
      else if (rec.status === 'ON_LEAVE') onLeave++;
      else if (rec.status === 'HALF_DAY') halfDay++;
      else if (rec.status === 'LATE') late++;
      else if (rec.status === 'ABSENT') absent++;
    });

    const markedCount = present + onLeave + halfDay + late + absent;
    const pending = Math.max(0, total - markedCount);
    const complianceRate = total > 0 ? Math.round(((present + late + (halfDay * 0.5)) / total) * 100) : 0;

    return {
      total,
      present,
      onLeave,
      halfDay,
      late,
      absent,
      pending,
      complianceRate,
      recordMap
    };
  }, [combinedRoster, attendanceRecords]);

  // Filtered Attendance List
  const filteredAttendanceRoster = useMemo(() => {
    return combinedRoster.filter((staff) => {
      if (attendanceDeptFilter !== 'ALL' && staff.category !== attendanceDeptFilter) return false;
      
      const rec = attendanceStats.recordMap.get(staff.id);
      const shift = rec?.shiftName || staff.shiftTiming || '';
      
      if (attendanceShiftFilter !== 'ALL') {
        if (!shift.toLowerCase().includes(attendanceShiftFilter.toLowerCase())) return false;
      }

      if (attendanceStatusFilter !== 'ALL') {
        const status = rec?.status || 'PENDING';
        if (attendanceStatusFilter === 'PRESENT' && status !== 'PRESENT') return false;
        if (attendanceStatusFilter === 'LATE' && status !== 'LATE') return false;
        if (attendanceStatusFilter === 'HALF_DAY' && status !== 'HALF_DAY') return false;
        if (attendanceStatusFilter === 'ON_LEAVE' && status !== 'ON_LEAVE') return false;
        if (attendanceStatusFilter === 'ABSENT' && status !== 'ABSENT') return false;
        if (attendanceStatusFilter === 'PENDING' && status !== 'PENDING' && status !== 'ABSENT') return false;
      }

      if (attendanceSearch.trim()) {
        const q = attendanceSearch.toLowerCase().trim();
        const idMatch = staff.employeeId?.toLowerCase().includes(q);
        const nameMatch = staff.name?.toLowerCase().includes(q);
        const roleMatch = staff.roleName?.toLowerCase().includes(q);
        const deptMatch = staff.department?.toLowerCase().includes(q);
        const deskMatch = (rec?.assignedLocation || staff.deskNumber)?.toLowerCase().includes(q);
        return idMatch || nameMatch || roleMatch || deptMatch || deskMatch;
      }

      return true;
    });
  }, [combinedRoster, attendanceDeptFilter, attendanceShiftFilter, attendanceStatusFilter, attendanceSearch, attendanceStats.recordMap]);

  // Hospital Duty Zones for Floor Grid View
  const hospitalDutyZones = useMemo(() => {
    return [
      {
        id: 'OPD_CLINIC',
        name: 'OPD Chambers & Specialist Suites',
        category: 'DOCTORS',
        locationTag: 'Ground & 1st Floor Wing A',
        icon: Stethoscope,
        accentColor: '#087F8C',
        bgLight: 'bg-[#087F8C]/10',
        staffList: filteredAttendanceRoster.filter(s => s.category === 'DOCTORS')
      },
      {
        id: 'CRITICAL_CARE',
        name: 'Inpatient & ICU Critical Care Wards',
        category: 'NURSING',
        locationTag: '2nd & 3rd Floor Wing B',
        icon: HeartPulse,
        accentColor: '#22A06B',
        bgLight: 'bg-[#22A06B]/10',
        staffList: filteredAttendanceRoster.filter(s => s.category === 'NURSING')
      },
      {
        id: 'DIAGNOSTICS_PHARMACY',
        name: 'Diagnostics, Lab & 24/7 Pharmacy',
        category: 'DIAGNOSTICS',
        locationTag: 'Basement & Main Atrium',
        icon: FlaskConical,
        accentColor: '#4FA8DB',
        bgLight: 'bg-[#4FA8DB]/10',
        staffList: filteredAttendanceRoster.filter(s => s.category === 'DIAGNOSTICS')
      },
      {
        id: 'FRONT_DESK_BILLING',
        name: 'Front Desk, Admissions & Billing Desks',
        category: 'ADMIN_BILLING',
        locationTag: 'Main Entrance Lobby',
        icon: Briefcase,
        accentColor: '#E9A23B',
        bgLight: 'bg-[#E9A23B]/10',
        staffList: filteredAttendanceRoster.filter(s => s.category === 'ADMIN_BILLING')
      },
      {
        id: 'FACILITY_SUPPORT',
        name: 'Facility, Security & Housekeeping',
        category: 'FACILITY',
        locationTag: 'Campus & Operational Wings',
        icon: Building2,
        accentColor: '#567781',
        bgLight: 'bg-[#567781]/10',
        staffList: filteredAttendanceRoster.filter(s => s.category === 'FACILITY')
      }
    ].filter(zone => zone.staffList.length > 0);
  }, [filteredAttendanceRoster]);

  // Date Navigation Helpers
  const shiftAttendanceDate = (days: number) => {
    const today = getTodayString();
    const current = new Date(attendanceDate);
    current.setDate(current.getDate() + days);
    const targetDate = current.toISOString().split('T')[0];
    if (targetDate > today) {
      setToastMsg('⚠️ Future date attendance is not allowed');
      return;
    }
    setAttendanceDate(targetDate);
  };

  const isAttendanceToday = attendanceDate === getTodayString();

  const formatLongDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatTimeDisplay = (timeVal?: string | null) => {
    if (!timeVal) return null;
    try {
      const parts = timeVal.split(':');
      let hour = parseInt(parts[0], 10);
      const min = parts[1] || '00';
      const ampm = hour >= 12 ? 'PM' : 'AM';
      hour = hour % 12 || 12;
      return `${String(hour).padStart(2, '0')}:${min} ${ampm}`;
    } catch {
      return timeVal;
    }
  };

  const getSystemCurrentTimeStr = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const openPunchModal = (staff: any) => {
    const existingRec = attendanceStats.recordMap.get(staff.id);
    setPunchEditModal({
      isOpen: true,
      staffId: staff.id,
      staffName: staff.name,
      employeeId: staff.employeeId,
      roleName: staff.roleName,
      category: staff.category,
      status: existingRec?.status || 'PRESENT',
      clockInTime: existingRec?.clockInTime ? String(existingRec.clockInTime).substring(0, 5) : getSystemCurrentTimeStr(),
      clockOutTime: existingRec?.clockOutTime ? String(existingRec.clockOutTime).substring(0, 5) : '',
      shiftName: existingRec?.shiftName || staff.shiftTiming || 'Morning (08:00 AM - 02:00 PM)',
      location: existingRec?.assignedLocation || staff.deskNumber || 'General Station Desk',
      remarks: existingRec?.remarks || ''
    });
  };

  const getInitials = (name: string) => {
    if (!name) return 'ST';
    const clean = name.replace(/^dr\.?\s*/i, '').trim();
    const parts = clean.split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const renderCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Users': return <Users className="w-3.5 h-3.5" />;
      case 'Stethoscope': return <Stethoscope className="w-3.5 h-3.5 text-[#087F8C]" />;
      case 'HeartPulse': return <HeartPulse className="w-3.5 h-3.5 text-[#22A06B]" />;
      case 'FlaskConical': return <FlaskConical className="w-3.5 h-3.5 text-[#4FA8DB]" />;
      case 'Briefcase': return <Briefcase className="w-3.5 h-3.5 text-[#E9A23B]" />;
      case 'Building2': return <Building2 className="w-3.5 h-3.5 text-[#567781]" />;
      default: return <Users className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#172B34] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-2 border border-white/10">
          <CheckCircle2 className="w-4 h-4 text-[#22A06B]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. TOP EXECUTIVE BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-[#E8EEF2] shadow-2xs p-5 sm:p-6 transition-all no-print">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-[#087F8C]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-10 w-48 h-48 bg-[#4FA8DB]/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-[#087F8C] to-[#172B34] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#087F8C]/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#172B34] tracking-tight flex items-center gap-2.5">
                <span>Doctors & Staff Management</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#087F8C]/10 text-[#087F8C] font-mono font-bold">
                  {totalStaff} Members
                </span>
              </h1>
              <p className="text-xs text-[#567781] font-medium pt-0.5">
                Hospital personnel directory, sequential employee IDs, daily attendance registers, and 7-day duty shift rosters.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 flex-wrap">
            <Link href="/doctors/staff/new" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full sm:w-auto min-h-[42px] sm:min-h-[38px] border-[#E8EEF2] bg-white text-[#172B34] hover:border-[#087F8C]/40 font-bold text-xs px-3.5 rounded-xl shadow-2xs cursor-pointer flex items-center justify-center gap-2 transition-all"
              >
                <UserPlus className="w-3.5 h-3.5 text-[#087F8C]" />
                <span>+ Onboard Staff Member</span>
              </Button>
            </Link>
            
            <Link href="/doctors/new" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto min-h-[42px] sm:min-h-[38px] bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs px-4 rounded-xl shadow-md shadow-[#087F8C]/20 cursor-pointer flex items-center justify-center gap-1.5 border-0 transition-all">
                <Plus className="w-4 h-4" />
                <span>+ Add Doctor</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. FOUR PRIMARY WORKSTATION MODULE TABS (Touch-Optimized for iPad & Mobile) */}
      <div className="grid grid-cols-2 md:flex items-center gap-1.5 sm:gap-2 bg-[#F6F9FB] p-1.5 rounded-2xl border border-[#E8EEF2]">
        <button
          onClick={() => setActiveModuleTab('DIRECTORY')}
          className={`py-2.5 px-3 sm:px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px] ${
            activeModuleTab === 'DIRECTORY'
              ? 'bg-white text-[#172B34] shadow-xs border border-[#E8EEF2]'
              : 'text-[#567781] hover:text-[#172B34]'
          }`}
        >
          <Users className="w-4 h-4 text-[#087F8C] shrink-0" />
          <span className="truncate">Team Directory</span>
        </button>

        <button
          onClick={() => setActiveModuleTab('DAILY_ATTENDANCE')}
          className={`py-2.5 px-3 sm:px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px] ${
            activeModuleTab === 'DAILY_ATTENDANCE'
              ? 'bg-white text-[#172B34] shadow-xs border border-[#E8EEF2]'
              : 'text-[#567781] hover:text-[#172B34]'
          }`}
        >
          <ClipboardList className="w-4 h-4 text-[#22A06B] shrink-0" />
          <span className="truncate">Daily Punch Desk</span>
        </button>

        <button
          onClick={() => setActiveModuleTab('MONTHLY_SUMMARY')}
          className={`py-2.5 px-3 sm:px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px] ${
            activeModuleTab === 'MONTHLY_SUMMARY'
              ? 'bg-white text-[#172B34] shadow-xs border border-[#E8EEF2]'
              : 'text-[#567781] hover:text-[#172B34]'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-[#E9A23B] shrink-0" />
          <span className="truncate">Monthly Time-Card</span>
        </button>

        <button
          onClick={() => setActiveModuleTab('WEEKLY_ROSTER')}
          className={`py-2.5 px-3 sm:px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px] ${
            activeModuleTab === 'WEEKLY_ROSTER'
              ? 'bg-white text-[#172B34] shadow-xs border border-[#E8EEF2]'
              : 'text-[#567781] hover:text-[#172B34]'
          }`}
        >
          <CalendarDays className="w-4 h-4 text-[#4FA8DB] shrink-0" />
          <span className="truncate">7-Day Roster</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* WORKSTATION 1: TEAM DIRECTORY                                 */}
      {/* ------------------------------------------------------------- */}
      {activeModuleTab === 'DIRECTORY' && (
        <div className="space-y-5">
          {/* STATS CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 min-w-0">
            <div className="bg-white border border-[#E8EEF2] rounded-2xl p-3.5 sm:p-4 shadow-2xs flex items-center justify-between hover:border-[#087F8C]/30 transition-all">
              <div className="space-y-1 min-w-0">
                <span className="text-[10px] sm:text-[11px] font-bold text-[#567781] uppercase tracking-wider block truncate">Total Team</span>
                <div className="text-xl sm:text-2xl font-extrabold text-[#172B34] tracking-tight">{totalStaff}</div>
              </div>
              <div className="w-9 h-9 sm:w-10.5 sm:h-10.5 bg-[#087F8C]/10 rounded-xl flex items-center justify-center text-[#087F8C] border border-[#087F8C]/20 shrink-0">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>

            <div className="bg-white border border-[#E8EEF2] rounded-2xl p-3.5 sm:p-4 shadow-2xs flex items-center justify-between hover:border-[#22A06B]/30 transition-all">
              <div className="space-y-1 min-w-0">
                <span className="text-[10px] sm:text-[11px] font-bold text-[#22A06B] uppercase tracking-wider block flex items-center gap-1 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22A06B] animate-pulse" />
                  <span>Doctors</span>
                </span>
                <div className="text-xl sm:text-2xl font-extrabold text-[#22A06B] tracking-tight">{totalDoctorsCount}</div>
              </div>
              <div className="w-9 h-9 sm:w-10.5 sm:h-10.5 bg-[#22A06B]/10 rounded-xl flex items-center justify-center text-[#22A06B] border border-[#22A06B]/20 shrink-0">
                <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>

            <div className="bg-white border border-[#E8EEF2] rounded-2xl p-3.5 sm:p-4 shadow-2xs flex items-center justify-between hover:border-[#4FA8DB]/30 transition-all">
              <div className="space-y-1 min-w-0">
                <span className="text-[10px] sm:text-[11px] font-bold text-[#567781] uppercase tracking-wider block truncate">Nursing & Wards</span>
                <div className="text-xl sm:text-2xl font-extrabold text-[#4FA8DB] tracking-tight">{totalNursingCount}</div>
              </div>
              <div className="w-9 h-9 sm:w-10.5 sm:h-10.5 bg-[#4FA8DB]/10 rounded-xl flex items-center justify-center text-[#4FA8DB] border border-[#4FA8DB]/20 shrink-0">
                <HeartPulse className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>

            <div className="bg-white border border-[#E8EEF2] rounded-2xl p-3.5 sm:p-4 shadow-2xs flex items-center justify-between hover:border-[#E9A23B]/30 transition-all">
              <div className="space-y-1 min-w-0">
                <span className="text-[10px] sm:text-[11px] font-bold text-[#567781] uppercase tracking-wider block truncate">Admin & Billing</span>
                <div className="text-xl sm:text-2xl font-extrabold text-[#E9A23B] tracking-tight">{totalAdminCount}</div>
              </div>
              <div className="w-9 h-9 sm:w-10.5 sm:h-10.5 bg-[#E9A23B]/10 rounded-xl flex items-center justify-center text-[#E9A23B] border border-[#E9A23B]/20 shrink-0">
                <Briefcase className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
          </div>

          {/* CATEGORY SELECTOR TABS WITH LUXURY ICONS (Fluid touch scroll for mobile/iPad) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
            {CATEGORY_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer min-h-[38px] ${
                  selectedCategory === tab.id
                    ? 'bg-[#172B34] text-white shadow-md'
                    : 'bg-white border border-[#E8EEF2] text-[#567781] hover:text-[#172B34] hover:bg-[#F6F9FB]'
                }`}
              >
                <span>{renderCategoryIcon(tab.iconName)}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* SEARCH & FILTER TOOLBAR */}
          <div className="bg-white border border-[#E8EEF2] p-3 sm:p-4 rounded-2xl shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row gap-2.5 sm:gap-3 items-stretch md:items-center justify-between">
              
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#567781] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search Employee ID, Name, Role, Ward..."
                  className="pl-9.5 pr-8 h-9.5 text-xs rounded-xl bg-[#F6F9FB] border-[#E8EEF2] focus-visible:ring-[#087F8C] text-[#172B34] placeholder:text-[#567781]"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#567781] hover:text-[#172B34] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="w-full md:w-56 shrink-0">
                <select
                  value={selectedRoleFilter}
                  onChange={(e) => setSelectedRoleFilter(e.target.value)}
                  className="w-full h-9.5 px-3 text-xs font-semibold rounded-xl bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] focus:outline-hidden focus:ring-2 focus:ring-[#087F8C] cursor-pointer"
                >
                  <option value="ALL">All Specific Roles</option>
                  {MASTER_HOSPITAL_ROLES.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between sm:justify-start gap-2">
                <div className="flex bg-[#F6F9FB] p-1 rounded-xl shrink-0 border border-[#E8EEF2]">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer min-h-[34px] ${
                      statusFilter === 'ALL'
                        ? 'bg-white text-[#172B34] shadow-2xs border border-[#E8EEF2]'
                        : 'text-[#567781] hover:text-[#172B34]'
                    }`}
                  >
                    All ({combinedRoster.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ACTIVE')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer min-h-[34px] ${
                      statusFilter === 'ACTIVE'
                        ? 'bg-white text-[#22A06B] shadow-2xs border border-[#E8EEF2]'
                        : 'text-[#567781] hover:text-[#22A06B]'
                    }`}
                  >
                    Active
                  </button>
                </div>

                {/* View Mode Toggle: Active across Mobile, iPad & Desktop */}
                <div className="flex bg-[#F6F9FB] p-1 rounded-xl shrink-0 border border-[#E8EEF2]">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    title="Card Grid View"
                    className={`p-2 rounded-lg transition-all cursor-pointer min-h-[34px] min-w-[34px] flex items-center justify-center ${
                      viewMode === 'grid'
                        ? 'bg-white text-[#087F8C] shadow-2xs border border-[#E8EEF2]'
                        : 'text-[#567781] hover:text-[#172B34]'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    title="Dense Table View"
                    className={`p-2 rounded-lg transition-all cursor-pointer min-h-[34px] min-w-[34px] flex items-center justify-center ${
                      viewMode === 'table'
                        ? 'bg-white text-[#087F8C] shadow-2xs border border-[#E8EEF2]'
                        : 'text-[#567781] hover:text-[#172B34]'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* GRID OF PERSONNEL */}
          {filteredRoster.length === 0 ? (
            <div className="bg-white border border-[#E8EEF2] rounded-2xl p-12 text-center shadow-2xs">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-[#172B34]">No hospital personnel found</h3>
              <p className="text-xs text-[#567781] mt-1">Try resetting your search query or onboard a new employee.</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRoster.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-[#E8EEF2] rounded-2xl p-5 shadow-2xs hover:shadow-md hover:border-[#087F8C]/30 transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Header with Signature Circular Avatar & Employee ID */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-xs shadow-2xs border ${
                            item.category === 'DOCTORS' ? 'bg-[#087F8C]/10 text-[#087F8C] border-[#087F8C]/30' :
                            item.category === 'NURSING' ? 'bg-[#22A06B]/10 text-[#22A06B] border-[#22A06B]/30' :
                            item.category === 'DIAGNOSTICS' ? 'bg-[#4FA8DB]/10 text-[#4FA8DB] border-[#4FA8DB]/30' :
                            item.category === 'ADMIN_BILLING' ? 'bg-[#E9A23B]/10 text-[#E9A23B] border-[#E9A23B]/30' :
                            'bg-slate-100 text-[#567781] border-slate-200'
                          }`}>
                            {item.raw?.profilePictureUrl ? (
                              <img src={item.raw.profilePictureUrl} alt={item.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <span>{getInitials(item.name)}</span>
                            )}
                          </div>
                          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                            item.active ? 'bg-[#22A06B]' : 'bg-slate-300'
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F6F9FB] text-[#087F8C] border border-[#E8EEF2]">
                              {item.employeeId}
                            </span>
                          </div>
                          <h4 className="text-sm font-extrabold text-[#172B34] leading-tight mt-1 group-hover:text-[#087F8C] transition-colors">
                            {item.name}
                          </h4>
                          <div className="text-[11px] font-bold text-[#087F8C] mt-0.5 flex items-center gap-1">
                            {renderRoleIcon(item.iconName, "w-3 h-3 text-[#087F8C]")}
                            <span>{item.roleName}</span>
                          </div>
                        </div>
                      </div>

                      {item.isDoctorEntity ? (
                        <button
                          onClick={() => toggleDoctorStatusMutation.mutate(item.id)}
                          className={`p-1 rounded-lg border transition-colors cursor-pointer ${
                            item.active ? 'bg-[#22A06B]/10 text-[#22A06B] border-[#22A06B]/20' : 'bg-red-50 text-red-500 border-red-200'
                          }`}
                        >
                          {item.active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                      ) : (
                        <button
                          onClick={() => deleteStaffMutation.mutate(item.id)}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Details */}
                    <div className="space-y-2 text-xs text-[#567781] border-t border-[#E8EEF2] pt-3">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-mono text-slate-700">
                          <Phone className="w-3.5 h-3.5 text-[#087F8C]" />
                          <span>{item.phone || 'No phone'}</span>
                        </span>
                        {item.isDoctorEntity && (
                          <span className="font-bold text-[#172B34] font-mono text-xs">
                            ₹{item.consultationFee} <span className="text-[10px] text-slate-400 font-normal">/ consult</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate text-[11px] text-slate-600">{item.email}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="flex items-center gap-1 text-slate-600">
                          <MapPin className="w-3 h-3 text-[#4FA8DB]" />
                          <span>{item.deskNumber || item.department}</span>
                        </span>
                        <span className="text-slate-500 font-medium flex items-center gap-1">
                          <Clock3 className="w-3 h-3 text-[#E9A23B]" />
                          <span>{item.shiftTiming}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom */}
                  <div className="mt-4 pt-3 border-t border-[#E8EEF2] flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      item.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {item.active ? '● On Active Duty' : '○ Suspended'}
                    </span>

                    {item.isDoctorEntity ? (
                      <Link href={`/doctors/${item.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs font-bold text-[#087F8C] hover:bg-[#087F8C]/10 rounded-xl gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Doctor File</span>
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/staff/${item.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs font-bold text-[#087F8C] hover:bg-[#087F8C]/10 rounded-xl gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Staff Dossier</span>
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* TABLE VIEW */
            <div className="bg-white border border-[#E8EEF2] rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead className="bg-[#F6F9FB] border-b border-[#E8EEF2] text-[#567781] font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5">ID & Name</th>
                      <th className="p-3.5">Role & Department</th>
                      <th className="p-3.5">Contact Details</th>
                      <th className="p-3.5">Shift / Location</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8EEF2]">
                    {filteredRoster.map((item) => (
                      <tr key={item.id} className="hover:bg-[#F6F9FB]/50">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 border ${
                              item.category === 'DOCTORS' ? 'bg-[#087F8C]/10 text-[#087F8C] border-[#087F8C]/30' :
                              item.category === 'NURSING' ? 'bg-[#22A06B]/10 text-[#22A06B] border-[#22A06B]/30' :
                              item.category === 'DIAGNOSTICS' ? 'bg-[#4FA8DB]/10 text-[#4FA8DB] border-[#4FA8DB]/30' :
                              item.category === 'ADMIN_BILLING' ? 'bg-[#E9A23B]/10 text-[#E9A23B] border-[#E9A23B]/30' :
                              'bg-slate-100 text-[#567781] border-slate-200'
                            }`}>
                              {getInitials(item.name)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#F6F9FB] text-[#087F8C] border border-[#E8EEF2]">
                                  {item.employeeId}
                                </span>
                                <span className="font-bold text-[#172B34]">{item.name}</span>
                              </div>
                              <div className="text-[10px] text-[#567781]">{item.department}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            {renderRoleIcon(item.iconName, "w-3.5 h-3.5 text-[#087F8C]")}
                            <span>{item.roleName}</span>
                          </div>
                          <div className="text-[10px] text-[#567781]">{item.department}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-mono text-slate-800">{item.phone}</div>
                          <div className="text-[10px] text-[#567781]">{item.email}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="text-slate-700">{item.deskNumber}</div>
                          <div className="text-[10px] text-[#567781]">{item.shiftTiming}</div>
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {item.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {item.isDoctorEntity ? (
                              <Link href={`/doctors/${item.id}`}>
                                <Button variant="ghost" size="sm" className="h-7 text-xs font-bold text-[#087F8C] hover:bg-[#087F8C]/10 cursor-pointer">
                                  View File
                                </Button>
                              </Link>
                            ) : (
                              <Link href={`/staff/${item.id}`}>
                                <Button variant="ghost" size="sm" className="h-7 text-xs font-bold text-[#087F8C] hover:bg-[#087F8C]/10 cursor-pointer">
                                  Staff Dossier
                                </Button>
                              </Link>
                            )}
                            {!item.isDoctorEntity && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteStaffMutation.mutate(item.id)}
                                className="h-7 text-xs font-bold text-red-500 hover:bg-red-50 cursor-pointer"
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* WORKSTATION 2: DAILY ATTENDANCE & PUNCH-IN DESK               */}
      {/* ------------------------------------------------------------- */}
      {activeModuleTab === 'DAILY_ATTENDANCE' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          
          {/* Top Control Toolbar & Date Navigator */}
          <div className="bg-white border border-[#E8EEF2] p-4 sm:p-5 rounded-2xl shadow-2xs flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#22A06B]/10 text-[#22A06B] border border-[#22A06B]/20 flex items-center justify-center shrink-0">
                <ClipboardList className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-[#172B34]">Hospital Daily Attendance & Punch Desk</h3>
                  {isAttendanceToday && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      LIVE TODAY
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#567781] font-medium pt-0.5">
                  Real-time employee duty logs, live clock timestamps, and instant shift punch verification for {formatLongDate(attendanceDate)}.
                </p>
              </div>
            </div>

            {/* Date Navigator & Supervisor Bulk Action */}
            <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto justify-start xl:justify-end">
              <div className="flex items-center bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl p-1 gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => shiftAttendanceDate(-1)}
                  title="Previous Day"
                  className="h-7 w-7 p-0 rounded-lg text-[#567781] hover:text-[#172B34] hover:bg-white cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <Button
                  variant={isAttendanceToday ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setAttendanceDate(getTodayString())}
                  className={`h-7 px-2.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                    isAttendanceToday
                      ? 'bg-[#087F8C] text-white shadow-2xs'
                      : 'text-[#567781] hover:text-[#172B34] hover:bg-white'
                  }`}
                >
                  Today
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 1);
                    setAttendanceDate(d.toISOString().split('T')[0]);
                  }}
                  className={`h-7 px-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                    (() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 1);
                      return attendanceDate === d.toISOString().split('T')[0];
                    })()
                      ? 'bg-[#087F8C] text-white shadow-2xs'
                      : 'text-[#567781] hover:text-[#172B34] hover:bg-white'
                  }`}
                >
                  Yesterday
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  disabled={attendanceDate >= getTodayString()}
                  onClick={() => shiftAttendanceDate(1)}
                  title={attendanceDate >= getTodayString() ? "Future dates not allowed" : "Next Day"}
                  className="h-7 w-7 p-0 rounded-lg text-[#567781] hover:text-[#172B34] hover:bg-white cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>

                <div className="h-4 w-px bg-[#E8EEF2] mx-0.5" />

                <Input
                  type="date"
                  max={getTodayString()}
                  value={attendanceDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val > getTodayString()) {
                      setToastMsg('⚠️ Future date attendance is not allowed');
                      return;
                    }
                    setAttendanceDate(val);
                  }}
                  className="h-7 w-32 border-0 bg-transparent text-xs font-mono font-bold text-[#172B34] focus-visible:ring-0 p-1 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Historical Date Read-Only Notice Banner */}
          {!isAttendanceToday && (
            <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-300">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wide">Locked Historical Record (Read-Only)</h4>
                  <p className="text-[11px] text-amber-800/90">
                    Viewing past attendance logs for <span className="font-bold font-mono">{formatLongDate(attendanceDate)}</span>. New attendance punches and modifications are locked to today's active shift.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAttendanceDate(getTodayString())}
                className="h-8 text-xs font-bold border-amber-300 bg-white text-amber-900 hover:bg-amber-100 cursor-pointer shrink-0 shadow-2xs"
              >
                Jump to Today (Live Desk)
              </Button>
            </div>
          )}

          {/* Real-Time Live Metrics Strip - CLICKABLE FILTER CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* 1. Total Scheduled */}
            <button
              type="button"
              onClick={() => setAttendanceStatusFilter('ALL')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                attendanceStatusFilter === 'ALL'
                  ? 'bg-white border-[#087F8C] shadow-md ring-2 ring-[#087F8C]/20'
                  : 'bg-white border-[#E8EEF2] shadow-2xs hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#567781] uppercase tracking-wider">All Personnel</span>
                <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#172B34] font-mono">{attendanceStats.total}</span>
                <span className="text-[11px] text-[#567781] font-medium">Total</span>
              </div>
              <p className="text-[10px] text-[#567781] mt-1">Click to view all roster</p>
            </button>

            {/* 2. Clocked In / Present */}
            <button
              type="button"
              onClick={() => setAttendanceStatusFilter(attendanceStatusFilter === 'PRESENT' ? 'ALL' : 'PRESENT')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                attendanceStatusFilter === 'PRESENT'
                  ? 'bg-emerald-50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                  : 'bg-emerald-50/50 border-emerald-200/80 shadow-2xs hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Present / Duty</span>
                <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <UserCheck className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-900 font-mono">{attendanceStats.present}</span>
                <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded-md">
                  {attendanceStats.complianceRate}%
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-semibold mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Filter present staff</span>
              </div>
            </button>

            {/* 3. On Leave */}
            <button
              type="button"
              onClick={() => setAttendanceStatusFilter(attendanceStatusFilter === 'ON_LEAVE' ? 'ALL' : 'ON_LEAVE')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                attendanceStatusFilter === 'ON_LEAVE'
                  ? 'bg-amber-50 border-amber-500 shadow-md ring-2 ring-amber-500/20'
                  : 'bg-amber-50/50 border-amber-200/80 shadow-2xs hover:border-amber-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">On Leave</span>
                <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <CalendarDays className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-900 font-mono">{attendanceStats.onLeave}</span>
                <span className="text-[11px] text-amber-700 font-medium">Off Duty</span>
              </div>
              <p className="text-[10px] text-amber-700 mt-1">Filter sanctioned leaves</p>
            </button>

            {/* 4. Late Arrival */}
            <button
              type="button"
              onClick={() => setAttendanceStatusFilter(attendanceStatusFilter === 'LATE' ? 'ALL' : 'LATE')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                attendanceStatusFilter === 'LATE'
                  ? 'bg-orange-50 border-orange-500 shadow-md ring-2 ring-orange-500/20'
                  : 'bg-orange-50/50 border-orange-200/80 shadow-2xs hover:border-orange-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-orange-800 uppercase tracking-wider">Late Arrival</span>
                <div className="w-7 h-7 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center">
                  <Clock3 className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-orange-900 font-mono">{attendanceStats.late}</span>
                <span className="text-[11px] text-orange-700 font-medium">Delayed</span>
              </div>
              <p className="text-[10px] text-orange-700 mt-1">Filter late punches</p>
            </button>

            {/* 5. Pending / Absent */}
            <button
              type="button"
              onClick={() => setAttendanceStatusFilter(attendanceStatusFilter === 'ABSENT' ? 'ALL' : 'ABSENT')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden col-span-2 sm:col-span-1 ${
                attendanceStatusFilter === 'ABSENT'
                  ? 'bg-red-50 border-red-500 shadow-md ring-2 ring-red-500/20'
                  : 'bg-white border-[#E8EEF2] shadow-2xs hover:border-red-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider">Absent / Unmarked</span>
                <div className="w-7 h-7 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <ShieldAlert className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-red-800 font-mono">{attendanceStats.pending + attendanceStats.absent}</span>
                <span className="text-[11px] text-red-600 font-medium">Absent</span>
              </div>
              <p className="text-[10px] text-red-600 mt-1">Filter absent staff for date</p>
            </button>
          </div>

          {/* Quick Status Filter Pills Ribbon */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { id: 'ALL', label: 'All Personnel', count: attendanceStats.total, color: 'bg-slate-100 text-slate-700 border-slate-200' },
              { id: 'PRESENT', label: 'Present / On Duty', count: attendanceStats.present, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
              { id: 'LATE', label: 'Late Punch', count: attendanceStats.late, color: 'bg-orange-50 text-orange-700 border-orange-200' },
              { id: 'HALF_DAY', label: 'Half-Day', count: attendanceStats.halfDay, color: 'bg-purple-50 text-purple-700 border-purple-200' },
              { id: 'ON_LEAVE', label: 'On Leave', count: attendanceStats.onLeave, color: 'bg-amber-50 text-amber-700 border-amber-200' },
              { id: 'ABSENT', label: 'Absent / Unmarked', count: attendanceStats.pending + attendanceStats.absent, color: 'bg-red-50 text-red-700 border-red-200' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAttendanceStatusFilter(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 ${
                  attendanceStatusFilter === tab.id
                    ? 'bg-[#087F8C] text-white border-[#087F8C] shadow-xs'
                    : `${tab.color} hover:opacity-90`
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-black ${
                  attendanceStatusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-white/80'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Smart Filter Bar & View Mode Switcher */}
          <div className="bg-white border border-[#E8EEF2] p-3.5 rounded-2xl shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-1 flex-wrap items-center gap-2.5">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#567781]" />
                <Input
                  type="text"
                  placeholder="Search by name, ID, desk, role..."
                  value={attendanceSearch}
                  onChange={(e) => setAttendanceSearch(e.target.value)}
                  className="pl-8.5 h-9 text-xs rounded-xl border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white"
                />
                {attendanceSearch && (
                  <button
                    onClick={() => setAttendanceSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#567781] hover:text-[#172B34] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Shift Filter Dropdown */}
              <select
                value={attendanceShiftFilter}
                onChange={(e) => setAttendanceShiftFilter(e.target.value)}
                className="h-9 px-3 text-xs font-semibold rounded-xl border border-[#E8EEF2] bg-[#F6F9FB] text-[#172B34] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#087F8C]"
              >
                <option value="ALL">All Shifts</option>
                <option value="Morning">Morning Shift</option>
                <option value="Evening">Evening Shift</option>
                <option value="Night">Night Shift</option>
                <option value="General">General Day</option>
                <option value="Emergency">Emergency Rotational</option>
              </select>

              {/* Department Filter Dropdown */}
              <select
                value={attendanceDeptFilter}
                onChange={(e) => setAttendanceDeptFilter(e.target.value)}
                className="h-9 px-3 text-xs font-semibold rounded-xl border border-[#E8EEF2] bg-[#F6F9FB] text-[#172B34] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#087F8C]"
              >
                <option value="ALL">All Departments</option>
                <option value="DOCTORS">Doctors & Specialists</option>
                <option value="NURSING">Nursing & ICU Care</option>
                <option value="DIAGNOSTICS">Diagnostics & Pharmacy</option>
                <option value="ADMIN_BILLING">Admin & Billing</option>
                <option value="FACILITY">Facility & Support</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-[#567781] font-semibold hidden sm:inline">
                Showing {filteredAttendanceRoster.length} of {combinedRoster.length}
              </span>

              <div className="flex items-center bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl p-1 gap-1">
                <button
                  onClick={() => setAttendanceViewMode('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    attendanceViewMode === 'table'
                      ? 'bg-white text-[#087F8C] shadow-2xs border border-[#E8EEF2]'
                      : 'text-[#567781] hover:text-[#172B34]'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Dense Table</span>
                </button>
                <button
                  onClick={() => setAttendanceViewMode('floor_grid')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    attendanceViewMode === 'floor_grid'
                      ? 'bg-white text-[#087F8C] shadow-2xs border border-[#E8EEF2]'
                      : 'text-[#567781] hover:text-[#172B34]'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Floor Station Grid</span>
                </button>
              </div>
            </div>
          </div>

          {/* VIEW MODE A: DENSE ACTION TABLE */}
          {attendanceViewMode === 'table' && (
            <div className="bg-white border border-[#E8EEF2] rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#F6F9FB] border-b border-[#E8EEF2] text-[#567781] font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5">Staff & Employee ID</th>
                      <th className="p-3.5">Role & Department</th>
                      <th className="p-3.5">Assigned Shift & Station</th>
                      <th className="p-3.5">Clock In / Out Log</th>
                      <th className="p-3.5 text-center">Duty Status</th>
                      <th className="p-3.5 text-right">Quick Punch Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8EEF2]">
                    {filteredAttendanceRoster.map((staff) => {
                      const existingRec = attendanceStats.recordMap.get(staff.id);
                      const currentStatus = existingRec ? existingRec.status : 'PENDING';
                      const clockInVal = existingRec?.clockInTime ? String(existingRec.clockInTime).substring(0, 5) : null;
                      const clockOutVal = existingRec?.clockOutTime ? String(existingRec.clockOutTime).substring(0, 5) : null;
                      const dossierLink = staff.isDoctorEntity ? `/doctors/${staff.id}` : `/staff/${staff.id}`;

                      return (
                        <tr key={staff.id} className="hover:bg-[#F6F9FB]/60 transition-colors">
                          {/* Staff & Sequential ID */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#087F8C]/15 to-[#172B34]/15 border border-[#087F8C]/20 flex items-center justify-center font-black text-xs text-[#087F8C]">
                                  {getInitials(staff.name)}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white border border-[#E8EEF2] flex items-center justify-center shadow-xs">
                                  {renderRoleIcon(staff.iconName, "w-2.5 h-2.5 text-[#087F8C]")}
                                </div>
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={dossierLink}
                                    className="font-bold text-[#172B34] hover:text-[#087F8C] transition-colors"
                                  >
                                    {staff.name}
                                  </Link>
                                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#F6F9FB] text-[#087F8C] border border-[#E8EEF2]">
                                    {staff.employeeId}
                                  </span>
                                </div>
                                <div className="text-[10px] text-[#567781] flex items-center gap-2 pt-0.5">
                                  {staff.phone && <span>📞 {staff.phone}</span>}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Role & Department */}
                          <td className="p-3.5">
                            <div className="font-bold text-[#172B34] flex items-center gap-1.5">
                              <span>{staff.roleName}</span>
                            </div>
                            <div className="text-[10px] text-[#567781] font-medium">{staff.department}</div>
                          </td>

                          {/* Shift & Duty Station */}
                          <td className="p-3.5">
                            <div className="text-[#172B34] font-semibold flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-[#087F8C]" />
                              <span>{existingRec?.shiftName || staff.shiftTiming || 'Morning Shift'}</span>
                            </div>
                            <div className="text-[10px] text-[#567781] flex items-center gap-1 mt-0.5">
                              <MapPin className="w-2.5 h-2.5 text-[#567781]" />
                              <span>{existingRec?.assignedLocation || staff.deskNumber || 'Station Desk'}</span>
                            </div>
                          </td>

                          {/* Clock In / Out Timestamps */}
                          <td className="p-3.5">
                            <button
                              onClick={() => openPunchModal(staff)}
                              title="Click to adjust or enter custom punch times"
                              className="flex flex-col gap-1 text-left group cursor-pointer"
                            >
                              <div className="flex items-center gap-1.5 text-[11px] font-mono">
                                <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 group-hover:border-[#087F8C]">
                                  🟢 In: {formatTimeDisplay(clockInVal) || '--:--'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] font-mono">
                                <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 group-hover:border-[#087F8C]">
                                  🔴 Out: {formatTimeDisplay(clockOutVal) || '--:--'}
                                </span>
                              </div>
                            </button>
                          </td>

                          {/* Duty Status */}
                          <td className="p-3.5 text-center">
                            {currentStatus === 'PRESENT' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase font-mono bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                PRESENT
                              </span>
                            )}
                            {currentStatus === 'HALF_DAY' && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase font-mono bg-purple-100 text-purple-800 border border-purple-200">
                                ◑ HALF DAY (0.5x)
                              </span>
                            )}
                            {currentStatus === 'ON_LEAVE' && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase font-mono bg-amber-100 text-amber-800 border border-amber-200">
                                ● ON LEAVE
                              </span>
                            )}
                            {currentStatus === 'LATE' && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase font-mono bg-orange-100 text-orange-800 border border-orange-200">
                                ● LATE
                              </span>
                            )}
                            {currentStatus === 'ABSENT' && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase font-mono bg-red-100 text-red-800 border border-red-200">
                                ● ABSENT
                              </span>
                            )}
                            {currentStatus === 'PENDING' && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase font-mono bg-slate-100 text-slate-700 border border-slate-200">
                                ○ PENDING
                              </span>
                            )}
                          </td>

                          {/* Quick Punch Actions */}
                          <td className="p-3.5 text-right">
                            {isAttendanceToday ? (
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {/* Clock In (Live / Exact Now) */}
                                <button
                                  onClick={() => punchAttendanceMutation.mutate({
                                    userId: staff.id,
                                    status: 'PRESENT',
                                    shiftName: existingRec?.shiftName || staff.shiftTiming,
                                    location: existingRec?.assignedLocation || staff.deskNumber,
                                    clockInTime: getSystemCurrentTimeStr(),
                                    clockOutTime: clockOutVal,
                                    remarks: 'Clock In Verified'
                                  })}
                                  title="Clock In (Log live arrival timestamp)"
                                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 cursor-pointer flex items-center gap-1 transition-all"
                                >
                                  <LogIn className="w-3 h-3" />
                                  <span>Clock In</span>
                                </button>

                                {/* Clock Out (Live / Exact Now) */}
                                <button
                                  onClick={() => punchAttendanceMutation.mutate({
                                    userId: staff.id,
                                    status: existingRec?.status || 'PRESENT',
                                    shiftName: existingRec?.shiftName || staff.shiftTiming,
                                    location: existingRec?.assignedLocation || staff.deskNumber,
                                    clockInTime: clockInVal,
                                    clockOutTime: getSystemCurrentTimeStr(),
                                    remarks: 'Clock Out Logged'
                                  })}
                                  title="Clock Out (Log live departure timestamp)"
                                  className="px-2 py-1 text-[11px] font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 cursor-pointer flex items-center gap-1 transition-all"
                                >
                                  <LogOut className="w-3 h-3" />
                                  <span>Out</span>
                                </button>

                                {/* Custom Time / Adjust Button */}
                                <button
                                  onClick={() => openPunchModal(staff)}
                                  title="Set exact custom hour/minute or change shift"
                                  className="px-2 py-1 text-[11px] font-bold rounded-lg bg-white text-[#087F8C] hover:bg-[#087F8C]/10 border border-[#087F8C]/30 cursor-pointer flex items-center gap-1 transition-all shadow-2xs"
                                >
                                  <Clock className="w-3 h-3" />
                                  <span>Time/Edit</span>
                                </button>

                                {/* Half Day */}
                                <button
                                  onClick={() => punchAttendanceMutation.mutate({
                                    userId: staff.id,
                                    status: 'HALF_DAY',
                                    shiftName: existingRec?.shiftName || staff.shiftTiming,
                                    location: existingRec?.assignedLocation || staff.deskNumber,
                                    clockInTime: clockInVal || getSystemCurrentTimeStr(),
                                    clockOutTime: clockOutVal,
                                    remarks: 'Half Day Shift (0.5x Duty)'
                                  })}
                                  title="Record Half Day (0.5 Day for Payroll)"
                                  className="px-2 py-1 text-[11px] font-bold rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 cursor-pointer transition-all"
                                >
                                  Half Day
                                </button>

                                {/* Leave */}
                                <button
                                  onClick={() => punchAttendanceMutation.mutate({
                                    userId: staff.id,
                                    status: 'ON_LEAVE',
                                    shiftName: existingRec?.shiftName || staff.shiftTiming,
                                    location: existingRec?.assignedLocation || staff.deskNumber,
                                    clockInTime: null,
                                    clockOutTime: null,
                                    remarks: 'Approved Leave'
                                  })}
                                  className="px-2 py-1 text-[11px] font-bold rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 cursor-pointer transition-all"
                                >
                                  Leave
                                </button>

                                {/* Late */}
                                <button
                                  onClick={() => punchAttendanceMutation.mutate({
                                    userId: staff.id,
                                    status: 'LATE',
                                    shiftName: existingRec?.shiftName || staff.shiftTiming,
                                    location: existingRec?.assignedLocation || staff.deskNumber,
                                    clockInTime: clockInVal || getSystemCurrentTimeStr(),
                                    clockOutTime: clockOutVal,
                                    remarks: 'Late Punch Logged'
                                  })}
                                  className="px-2 py-1 text-[11px] font-bold rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 cursor-pointer transition-all"
                                >
                                  Late
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5 text-slate-500 font-mono text-[11px]">
                                <Lock className="w-3 h-3 text-slate-400" />
                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold text-[10px] border border-slate-200">
                                  Historical Log (Locked)
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {filteredAttendanceRoster.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-[#567781]">
                          <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                          <p className="font-bold text-sm text-[#172B34]">No personnel found matching current filters</p>
                          <p className="text-xs text-[#567781] mt-1">Try resetting the search bar or department filters.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW MODE B: HOSPITAL DUTY STATION FLOOR GRID */}
          {attendanceViewMode === 'floor_grid' && (
            <div className="space-y-6">
              {hospitalDutyZones.map((zone) => {
                const ZoneIcon = zone.icon;
                const zonePresentCount = zone.staffList.filter(s => {
                  const rec = attendanceStats.recordMap.get(s.id);
                  return rec && rec.status === 'PRESENT';
                }).length;

                return (
                  <div key={zone.id} className="bg-white border border-[#E8EEF2] rounded-2xl overflow-hidden shadow-2xs">
                    {/* Zone Header Banner */}
                    <div className="bg-[#F6F9FB] border-b border-[#E8EEF2] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${zone.bgLight} flex items-center justify-center shrink-0`}>
                          <ZoneIcon className="w-5 h-5" style={{ color: zone.accentColor }} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-sm text-[#172B34]">{zone.name}</h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-[#E8EEF2] text-[#567781]">
                              {zone.locationTag}
                            </span>
                          </div>
                          <p className="text-xs text-[#567781] font-medium">
                            Assigned Duty Station Personnel & Live Floor Presence
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#172B34] bg-white border border-[#E8EEF2] px-3 py-1 rounded-xl shadow-2xs">
                          🟢 <span className="font-mono">{zonePresentCount}</span> / <span className="font-mono">{zone.staffList.length}</span> Active on Duty
                        </span>
                      </div>
                    </div>

                    {/* Zone Station Member Cards */}
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {zone.staffList.map((staff) => {
                        const existingRec = attendanceStats.recordMap.get(staff.id);
                        const currentStatus = existingRec ? existingRec.status : 'PENDING';
                        const clockInVal = existingRec?.clockInTime ? String(existingRec.clockInTime).substring(0, 5) : null;
                        const clockOutVal = existingRec?.clockOutTime ? String(existingRec.clockOutTime).substring(0, 5) : null;
                        const dossierLink = staff.isDoctorEntity ? `/doctors/${staff.id}` : `/staff/${staff.id}`;

                        return (
                          <div
                            key={staff.id}
                            className="border border-[#E8EEF2] rounded-xl p-3.5 bg-white hover:border-[#087F8C]/40 hover:shadow-xs transition-all flex flex-col justify-between gap-3"
                          >
                            <div>
                              {/* Header: Avatar, Name, Status */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#087F8C]/15 to-[#172B34]/15 border border-[#087F8C]/20 flex items-center justify-center font-black text-xs text-[#087F8C] shrink-0">
                                    {getInitials(staff.name)}
                                  </div>
                                  <div>
                                    <Link
                                      href={dossierLink}
                                      className="font-bold text-xs text-[#172B34] hover:text-[#087F8C] line-clamp-1"
                                    >
                                      {staff.name}
                                    </Link>
                                    <div className="flex items-center gap-1 text-[10px] text-[#567781]">
                                      <span className="font-mono font-bold text-[#087F8C]">{staff.employeeId}</span>
                                      <span>•</span>
                                      <span className="line-clamp-1">{staff.roleName}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Status Pill */}
                                <div>
                                  {currentStatus === 'PRESENT' && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase font-mono bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      <span className="w-1 h-1 rounded-full bg-emerald-600 animate-pulse" />
                                      PRESENT
                                    </span>
                                  )}
                                  {currentStatus === 'HALF_DAY' && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase font-mono bg-purple-100 text-purple-800 border border-purple-200">
                                      HALF DAY
                                    </span>
                                  )}
                                  {currentStatus === 'ON_LEAVE' && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase font-mono bg-amber-100 text-amber-800 border border-amber-200">
                                      LEAVE
                                    </span>
                                  )}
                                  {currentStatus === 'LATE' && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase font-mono bg-orange-100 text-orange-800 border border-orange-200">
                                      LATE
                                    </span>
                                  )}
                                  {currentStatus === 'ABSENT' && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase font-mono bg-red-100 text-red-800 border border-red-200">
                                      ABSENT
                                    </span>
                                  )}
                                  {currentStatus === 'PENDING' && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase font-mono bg-slate-100 text-slate-600 border border-slate-200">
                                      PENDING
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Station & Shift Info */}
                              <div className="mt-2.5 bg-[#F6F9FB] rounded-lg p-2 text-[11px] space-y-1">
                                <div className="flex items-center justify-between text-[#567781]">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5 text-[#087F8C]" />
                                    <span>Shift:</span>
                                  </span>
                                  <span className="font-semibold text-[#172B34]">
                                    {existingRec?.shiftName || staff.shiftTiming || 'Morning'}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-[#567781]">
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-2.5 h-2.5 text-[#087F8C]" />
                                    <span>Station:</span>
                                  </span>
                                  <span className="font-semibold text-[#172B34] truncate max-w-[150px]">
                                    {existingRec?.assignedLocation || staff.deskNumber || 'Station Desk'}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => openPunchModal(staff)}
                                  title="Click to adjust/set custom time"
                                  className="w-full flex items-center justify-between pt-1 border-t border-[#E8EEF2]/60 font-mono text-[10px] text-left hover:text-[#087F8C] cursor-pointer"
                                >
                                  <span className="text-emerald-700 font-bold">
                                    In: {formatTimeDisplay(clockInVal) || '--:--'}
                                  </span>
                                  <span className="text-slate-600 font-bold">
                                    Out: {formatTimeDisplay(clockOutVal) || '--:--'}
                                  </span>
                                </button>
                              </div>
                            </div>

                            {/* Quick Punch Bar for Card */}
                            <div className="pt-1">
                              {isAttendanceToday ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => punchAttendanceMutation.mutate({
                                      userId: staff.id,
                                      status: 'PRESENT',
                                      shiftName: existingRec?.shiftName || staff.shiftTiming,
                                      location: existingRec?.assignedLocation || staff.deskNumber,
                                      clockInTime: getSystemCurrentTimeStr(),
                                      clockOutTime: clockOutVal,
                                      remarks: 'Duty station card punch'
                                    })}
                                    className="flex-1 py-1 text-[10px] font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 cursor-pointer text-center transition-all flex items-center justify-center gap-1"
                                  >
                                    <LogIn className="w-2.5 h-2.5" />
                                    <span>Clock In</span>
                                  </button>

                                  <button
                                    onClick={() => punchAttendanceMutation.mutate({
                                      userId: staff.id,
                                      status: existingRec?.status || 'PRESENT',
                                      shiftName: existingRec?.shiftName || staff.shiftTiming,
                                      location: existingRec?.assignedLocation || staff.deskNumber,
                                      clockInTime: clockInVal,
                                      clockOutTime: getSystemCurrentTimeStr(),
                                      remarks: 'Duty station card clock-out'
                                    })}
                                    className="py-1 px-2 text-[10px] font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 cursor-pointer transition-all"
                                  >
                                    Out
                                  </button>

                                  <button
                                    onClick={() => punchAttendanceMutation.mutate({
                                      userId: staff.id,
                                      status: 'HALF_DAY',
                                      shiftName: existingRec?.shiftName || staff.shiftTiming,
                                      location: existingRec?.assignedLocation || staff.deskNumber,
                                      clockInTime: clockInVal || getSystemCurrentTimeStr(),
                                      clockOutTime: clockOutVal,
                                      remarks: 'Half Day duty shift (0.5x)'
                                    })}
                                    className="py-1 px-2 text-[10px] font-bold rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 cursor-pointer transition-all"
                                  >
                                    Half
                                  </button>

                                  <button
                                    onClick={() => openPunchModal(staff)}
                                    title="Adjust exact custom time"
                                    className="py-1 px-2 text-[10px] font-bold rounded-lg bg-white text-[#087F8C] hover:bg-[#087F8C]/10 border border-[#087F8C]/30 cursor-pointer transition-all shadow-2xs"
                                  >
                                    ⏱️ Time
                                  </button>

                                  <button
                                    onClick={() => punchAttendanceMutation.mutate({
                                      userId: staff.id,
                                      status: 'ON_LEAVE',
                                      shiftName: existingRec?.shiftName || staff.shiftTiming,
                                      location: existingRec?.assignedLocation || staff.deskNumber,
                                      clockInTime: null,
                                      clockOutTime: null,
                                      remarks: 'Leave from station card'
                                    })}
                                    className="py-1 px-2 text-[10px] font-bold rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 cursor-pointer transition-all"
                                  >
                                    Leave
                                  </button>
                                </div>
                              ) : (
                                <div className="py-1.5 px-2 text-[10px] font-bold rounded-lg bg-slate-100 text-slate-500 border border-slate-200 text-center flex items-center justify-center gap-1 font-mono">
                                  <Lock className="w-2.5 h-2.5 text-slate-400" />
                                  <span>Past Shift Log (Locked)</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {hospitalDutyZones.length === 0 && (
                <div className="bg-white border border-[#E8EEF2] rounded-2xl p-8 text-center text-[#567781]">
                  <Building2 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-sm text-[#172B34]">No hospital zones found matching current filters</p>
                  <p className="text-xs text-[#567781] mt-1">Adjust search terms or shift filters to view station assignments.</p>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* WORKSTATION 3: MONTHLY ATTENDANCE SUMMARY & TIME-CARD MATRIX  */}
      {/* ------------------------------------------------------------- */}
      {activeModuleTab === 'MONTHLY_SUMMARY' && (
        <div className="space-y-5">
          {/* Header Bar with Month/Year Filter */}
          <div className="bg-white border border-[#E8EEF2] p-4 rounded-2xl shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E9A23B]/10 text-[#E9A23B] border border-[#E9A23B]/20 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#172B34]">Monthly Staff Attendance & Time-Card Matrix</h3>
                <p className="text-xs text-[#567781]">Clinic-wide monthly aggregation, duty compliance, and punch rate metrics.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={summaryMonth}
                onChange={(e) => setSummaryMonth(Number(e.target.value))}
                className="h-9 px-3 text-xs font-semibold rounded-xl bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] focus:outline-hidden focus:ring-2 focus:ring-[#087F8C] cursor-pointer"
              >
                {[
                  { m: 1, name: 'January' },
                  { m: 2, name: 'February' },
                  { m: 3, name: 'March' },
                  { m: 4, name: 'April' },
                  { m: 5, name: 'May' },
                  { m: 6, name: 'June' },
                  { m: 7, name: 'July' },
                  { m: 8, name: 'August' },
                  { m: 9, name: 'September' },
                  { m: 10, name: 'October' },
                  { m: 11, name: 'November' },
                  { m: 12, name: 'December' },
                ].map((item) => (
                  <option key={item.m} value={item.m}>
                    {item.name}
                  </option>
                ))}
              </select>

              <select
                value={summaryYear}
                onChange={(e) => setSummaryYear(Number(e.target.value))}
                className="h-9 px-3 text-xs font-semibold rounded-xl bg-[#F6F9FB] border border-[#E8EEF2] text-[#172B34] focus:outline-hidden focus:ring-2 focus:ring-[#087F8C] cursor-pointer"
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchSummary()}
                className="h-9 border-[#E8EEF2] bg-[#F6F9FB] hover:bg-white text-[#567781] hover:text-[#172B34] rounded-xl cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Aggregate Metrics Strip */}
          {(() => {
            const totalStaffSummaries = monthlySummary.length;
            const avgAttendance = totalStaffSummaries > 0
              ? Math.round(monthlySummary.reduce((acc: number, s: any) => acc + (s.attendancePercentage || 0), 0) / totalStaffSummaries)
              : 0;
            const totalPresentPunches = monthlySummary.reduce((acc: number, s: any) => acc + (s.presentDays || 0), 0);
            const totalLeavePunches = monthlySummary.reduce((acc: number, s: any) => acc + (s.leaveDays || 0), 0);

            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white border border-[#E8EEF2] rounded-2xl p-4 shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold text-[#567781] uppercase tracking-wider block">Staff Tracked</span>
                  <div className="text-2xl font-extrabold text-[#172B34]">{totalStaffSummaries}</div>
                  <span className="text-[10px] text-[#567781]">Active roster members</span>
                </div>

                <div className="bg-white border border-[#E8EEF2] rounded-2xl p-4 shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold text-[#22A06B] uppercase tracking-wider block">Avg Compliance</span>
                  <div className="text-2xl font-extrabold text-[#22A06B]">{avgAttendance}%</div>
                  <span className="text-[10px] text-[#22A06B]">Overall punch rate</span>
                </div>

                <div className="bg-white border border-[#E8EEF2] rounded-2xl p-4 shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold text-[#087F8C] uppercase tracking-wider block">Total Present Days</span>
                  <div className="text-2xl font-extrabold text-[#087F8C]">{totalPresentPunches}</div>
                  <span className="text-[10px] text-[#087F8C]">Completed duty shifts</span>
                </div>

                <div className="bg-white border border-[#E8EEF2] rounded-2xl p-4 shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold text-[#D97706] uppercase tracking-wider block">Approved Leaves</span>
                  <div className="text-2xl font-extrabold text-[#D97706]">{totalLeavePunches}</div>
                  <span className="text-[10px] text-[#D97706]">Logged leaves & offs</span>
                </div>
              </div>
            );
          })()}

          {/* Interactive Date Inspector Ribbon for Active Month */}
          <div className="bg-white border border-[#E8EEF2] p-4 rounded-2xl shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#087F8C]" />
                <h4 className="text-xs font-extrabold text-[#172B34] uppercase tracking-wider">
                  Jump to Specific Date in {new Date(summaryYear, summaryMonth - 1).toLocaleString('default', { month: 'long' })} {summaryYear}
                </h4>
              </div>
              <span className="text-[10px] text-[#567781] font-semibold">Click any day to open its full daily attendance muster</span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-1">
              {(() => {
                const daysInMonth = new Date(summaryYear, summaryMonth, 0).getDate();
                const todayStr = getTodayString();
                const days = [];

                for (let day = 1; day <= daysInMonth; day++) {
                  const dayStr = String(day).padStart(2, '0');
                  const monthStr = String(summaryMonth).padStart(2, '0');
                  const formattedDate = `${summaryYear}-${monthStr}-${dayStr}`;
                  const isFuture = formattedDate > todayStr;
                  const isToday = formattedDate === todayStr;
                  const dayOfWeek = new Date(summaryYear, summaryMonth - 1, day).toLocaleDateString('en-US', { weekday: 'narrow' });

                  days.push(
                    <button
                      key={day}
                      disabled={isFuture}
                      onClick={() => {
                        setAttendanceDate(formattedDate);
                        setActiveModuleTab('DAILY_ATTENDANCE');
                        setToastMsg(`📅 Showing attendance records for ${dayStr}-${monthStr}-${summaryYear}`);
                        setTimeout(() => setToastMsg(null), 3000);
                      }}
                      title={isFuture ? 'Future date (not elapsed)' : `Click to view attendance on ${formattedDate}`}
                      className={`flex flex-col items-center justify-center min-w-[38px] h-12 rounded-xl border text-center transition-all cursor-pointer shrink-0 ${
                        isToday
                          ? 'bg-[#087F8C] text-white border-[#087F8C] shadow-xs font-black'
                          : isFuture
                          ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-50'
                          : 'bg-[#F6F9FB] hover:bg-white text-[#172B34] border-[#E8EEF2] hover:border-[#087F8C]'
                      }`}
                    >
                      <span className={`text-[9px] uppercase ${isToday ? 'text-white/80' : 'text-[#567781]'}`}>{dayOfWeek}</span>
                      <span className="text-xs font-extrabold font-mono">{day}</span>
                    </button>
                  );
                }

                return days;
              })()}
            </div>
          </div>

          {/* Matrix Table */}
          <div className="bg-white border border-[#E8EEF2] rounded-2xl overflow-hidden shadow-2xs">
            {isSummaryLoading ? (
              <div className="p-12 text-center space-y-2">
                <div className="w-8 h-8 border-3 border-[#087F8C]/20 border-t-[#087F8C] rounded-full animate-spin mx-auto" />
                <p className="text-xs font-semibold text-[#567781]">Computing monthly attendance records...</p>
              </div>
            ) : monthlySummary.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-[#172B34]">No attendance logs found for this month</p>
                <p className="text-[11px] text-[#567781]">Use the Daily Punch Desk tab to record attendance logs.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F6F9FB] border-b border-[#E8EEF2] text-[#567781] font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3.5">Employee ID & Staff</th>
                      <th className="p-3.5">Role / Dept</th>
                      <th className="p-3.5 text-center">Scheduled</th>
                      <th className="p-3.5 text-center">Present</th>
                      <th className="p-3.5 text-center">Leave</th>
                      <th className="p-3.5 text-center">Half-Day</th>
                      <th className="p-3.5 text-center">Late</th>
                      <th className="p-3.5 text-center">Absent</th>
                      <th className="p-3.5">Attendance Rate</th>
                      <th className="p-3.5 text-right">Attendance Dossier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8EEF2]">
                    {monthlySummary.map((row: any) => (
                      <tr key={row.userId} className="hover:bg-[#F6F9FB]/50 transition-colors">
                        <td className="p-3.5">
                          <button
                            type="button"
                            onClick={() => setSelectedStaffTimecard({
                              id: row.userId,
                              name: row.staffName || row.fullName || 'Staff Member',
                              employeeId: row.employeeId,
                              role: row.role,
                              roleName: row.role,
                              department: row.department,
                            })}
                            className="group/item text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F6F9FB] text-[#087F8C] border border-[#E8EEF2]">
                                {row.employeeId || 'STAFF'}
                              </span>
                              <span className="font-bold text-[#172B34] group-hover/item:text-[#087F8C] transition-colors">
                                {row.staffName || row.fullName}
                              </span>
                            </div>
                          </button>
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-800">{row.role || 'Staff'}</div>
                          <div className="text-[10px] text-[#567781]">{row.department || 'General'}</div>
                        </td>
                        <td className="p-3.5 text-center font-bold text-slate-700">
                          {row.totalDaysInMonth || row.totalScheduledDays}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                            {row.presentDays}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200">
                            {row.leaveDays}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 font-bold text-[11px] border border-orange-200">
                            {row.halfDays}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200">
                            {row.lateMarks !== undefined ? row.lateMarks : row.lateDays}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-red-50 text-red-700 font-bold text-[11px] border border-red-200">
                            {row.absentDays}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  row.attendancePercentage >= 90
                                    ? 'bg-[#22A06B]'
                                    : row.attendancePercentage >= 75
                                    ? 'bg-[#087F8C]'
                                    : row.attendancePercentage >= 50
                                    ? 'bg-[#E9A23B]'
                                    : 'bg-[#D64545]'
                                }`}
                                style={{ width: `${Math.min(100, row.attendancePercentage || 0)}%` }}
                              />
                            </div>
                            <span className="font-mono text-xs font-bold text-[#172B34]">
                              {Math.round(row.attendancePercentage || 0)}%
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedStaffTimecard({
                              id: row.userId,
                              name: row.staffName || row.fullName || 'Staff Member',
                              employeeId: row.employeeId,
                              role: row.role,
                              roleName: row.role,
                              department: row.department,
                            })}
                            className="h-7 text-xs font-bold text-[#087F8C] bg-[#087F8C]/5 border-[#087F8C]/20 hover:bg-[#087F8C] hover:text-white transition-all cursor-pointer shadow-xs gap-1"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Time-Card Dossier</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* WORKSTATION 3: 7-DAY WEEKLY DUTY SHIFT ROSTER                 */}
      {/* ------------------------------------------------------------- */}
      {activeModuleTab === 'WEEKLY_ROSTER' && (
        <div className="space-y-5">
          <div className="bg-white border border-[#E8EEF2] p-4 rounded-2xl shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CalendarDays className="w-5 h-5 text-[#4FA8DB]" />
              <div>
                <h3 className="text-sm font-extrabold text-[#172B34]">Weekly Hospital Duty Shift Roster</h3>
                <p className="text-xs text-[#567781]">Assign morning, evening, and night ward duties across the week.</p>
              </div>
            </div>

            {/* Day Selector */}
            <div className="flex items-center gap-1 bg-[#F6F9FB] p-1 rounded-xl border border-[#E8EEF2] overflow-x-auto w-full md:w-auto">
              {DAYS_OF_WEEK.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedRosterDay(d.id)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    selectedRosterDay === d.id
                      ? 'bg-[#087F8C] text-white shadow-xs'
                      : 'text-[#567781] hover:text-[#172B34]'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Roster Grid */}
          <div className="bg-white border border-[#E8EEF2] rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-[#F6F9FB] border-b border-[#E8EEF2] text-[#567781] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Staff & Employee ID</th>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5">Assigned Duty Shift for {selectedRosterDay}</th>
                    <th className="p-3.5">Assigned Ward / Station</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EEF2]">
                  {combinedRoster.map((staff) => {
                    const existingRoster = rosterRecords.find(
                      (r: any) => r.userId === staff.id && r.dayOfWeek === selectedRosterDay
                    );
                    const activeShift = existingRoster?.shiftName || 'Morning (08:00 AM - 02:00 PM)';
                    const activeStation = existingRoster?.assignedWardOrCabin || staff.deskNumber || 'General Ward';

                    return (
                      <tr key={staff.id} className="hover:bg-[#F6F9FB]/50">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F6F9FB] text-[#087F8C] border border-[#E8EEF2]">
                              {staff.employeeId}
                            </span>
                            <span className="font-bold text-[#172B34]">{staff.name}</span>
                          </div>
                        </td>
                        <td className="p-3.5 font-semibold text-slate-800 flex items-center gap-1.5">
                          {renderRoleIcon(staff.iconName, "w-3.5 h-3.5 text-[#087F8C]")}
                          <span>{staff.roleName}</span>
                        </td>
                        <td className="p-3.5">
                          <select
                            defaultValue={activeShift}
                            onChange={(e) => saveRosterSlotMutation.mutate({
                              userId: staff.id,
                              dayOfWeek: selectedRosterDay,
                              shiftName: e.target.value,
                              wardOrCabin: activeStation
                            })}
                            className="h-8 px-2.5 bg-white border border-[#E8EEF2] rounded-lg text-xs font-medium text-slate-800"
                          >
                            {SHIFT_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3.5">
                          <input
                            defaultValue={activeStation}
                            onBlur={(e) => saveRosterSlotMutation.mutate({
                              userId: staff.id,
                              dayOfWeek: selectedRosterDay,
                              shiftName: activeShift,
                              wardOrCabin: e.target.value
                            })}
                            placeholder="e.g. ICU Bed 01-05"
                            className="h-8 px-2.5 bg-white border border-[#E8EEF2] rounded-lg text-xs text-slate-800 w-48"
                          />
                        </td>
                        <td className="p-3.5 text-right">
                          <span className="text-[11px] text-emerald-600 font-bold">
                            ✓ Assigned
                          </span>
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

      {/* ------------------------------------------------------------- */}
      {/* CUSTOM TIME PUNCH & ATTENDANCE ADJUST MODAL                   */}
      {/* ------------------------------------------------------------- */}
      {punchEditModal && punchEditModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#E8EEF2] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 bg-[#F6F9FB] border-b border-[#E8EEF2] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#087F8C]/10 text-[#087F8C] border border-[#087F8C]/20 flex items-center justify-center font-black">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#172B34]">Punch Duty & Time Adjust</h3>
                  <p className="text-xs text-[#567781]">Log exact custom arrival, departure & shift details</p>
                </div>
              </div>
              <button
                onClick={() => setPunchEditModal(null)}
                className="w-8 h-8 rounded-lg text-[#567781] hover:text-[#172B34] hover:bg-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1">
              {/* Staff Summary Card */}
              <div className="bg-[#F6F9FB] p-3 rounded-xl border border-[#E8EEF2] flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-[#172B34]">{punchEditModal.staffName}</div>
                  <div className="text-[#567781] flex items-center gap-1.5 mt-0.5 font-medium">
                    <span className="font-mono font-bold text-[#087F8C]">{punchEditModal.employeeId}</span>
                    <span>•</span>
                    <span>{punchEditModal.roleName}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-[#567781] uppercase">Duty Date</div>
                  <div className="font-mono font-bold text-[#172B34]">{attendanceDate}</div>
                </div>
              </div>

              {/* Status Selector */}
              <div>
                <Label className="text-xs font-bold text-[#172B34] mb-1.5 block">Attendance Duty Status</Label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'PRESENT', label: 'Present', color: 'text-emerald-700 bg-emerald-50 border-emerald-300' },
                    { id: 'HALF_DAY', label: 'Half Day (0.5x)', color: 'text-purple-700 bg-purple-50 border-purple-300' },
                    { id: 'LATE', label: 'Late', color: 'text-orange-700 bg-orange-50 border-orange-300' },
                    { id: 'ON_LEAVE', label: 'On Leave', color: 'text-amber-700 bg-amber-50 border-amber-300' },
                    { id: 'ABSENT', label: 'Absent', color: 'text-red-700 bg-red-50 border-red-300' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setPunchEditModal({ ...punchEditModal, status: st.id })}
                      className={`py-2 px-2 rounded-xl font-bold text-xs border text-center transition-all cursor-pointer ${
                        punchEditModal.status === st.id
                          ? `${st.color} ring-2 ring-[#087F8C]/30 shadow-xs font-black`
                          : 'bg-white border-[#E8EEF2] text-[#567781] hover:bg-[#F6F9FB]'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Exact Clock-In & Clock-Out Time Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Clock In Time */}
                <div className="space-y-1.5 bg-[#F6F9FB] p-3 rounded-xl border border-[#E8EEF2]">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Clock-In Time</span>
                    </Label>
                    <button
                      type="button"
                      onClick={() => setPunchEditModal({ ...punchEditModal, clockInTime: getSystemCurrentTimeStr() })}
                      className="text-[10px] font-bold text-[#087F8C] hover:underline cursor-pointer"
                    >
                      Set Now ({getSystemCurrentTimeStr()})
                    </button>
                  </div>
                  <Input
                    type="time"
                    value={punchEditModal.clockInTime}
                    onChange={(e) => setPunchEditModal({ ...punchEditModal, clockInTime: e.target.value })}
                    className="h-9 bg-white border-[#E8EEF2] font-mono font-bold text-sm text-[#172B34]"
                  />
                  <p className="text-[10px] text-[#567781]">Time staff reported for duty</p>
                </div>

                {/* Clock Out Time */}
                <div className="space-y-1.5 bg-[#F6F9FB] p-3 rounded-xl border border-[#E8EEF2]">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Clock-Out Time</span>
                    </Label>
                    <button
                      type="button"
                      onClick={() => setPunchEditModal({ ...punchEditModal, clockOutTime: getSystemCurrentTimeStr() })}
                      className="text-[10px] font-bold text-[#087F8C] hover:underline cursor-pointer"
                    >
                      Set Now ({getSystemCurrentTimeStr()})
                    </button>
                  </div>
                  <Input
                    type="time"
                    value={punchEditModal.clockOutTime}
                    onChange={(e) => setPunchEditModal({ ...punchEditModal, clockOutTime: e.target.value })}
                    className="h-9 bg-white border-[#E8EEF2] font-mono font-bold text-sm text-[#172B34]"
                  />
                  <p className="text-[10px] text-[#567781]">Time staff departed from duty</p>
                </div>
              </div>

              {/* Shift Timing & Station Desk */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-[#172B34] mb-1 block">Duty Shift</Label>
                  <select
                    value={punchEditModal.shiftName}
                    onChange={(e) => setPunchEditModal({ ...punchEditModal, shiftName: e.target.value })}
                    className="w-full h-9 px-3 bg-white border border-[#E8EEF2] rounded-xl text-xs font-medium text-[#172B34]"
                  >
                    {SHIFT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-bold text-[#172B34] mb-1 block">Assigned Station / Desk</Label>
                  <Input
                    type="text"
                    value={punchEditModal.location}
                    onChange={(e) => setPunchEditModal({ ...punchEditModal, location: e.target.value })}
                    placeholder="e.g. OPD Cabin #1, ICU Station"
                    className="h-9 text-xs rounded-xl border-[#E8EEF2]"
                  />
                </div>
              </div>

              {/* Punch Remarks */}
              <div>
                <Label className="text-xs font-bold text-[#172B34] mb-1 block">Remarks / Supervisor Note (Optional)</Label>
                <Input
                  type="text"
                  value={punchEditModal.remarks}
                  onChange={(e) => setPunchEditModal({ ...punchEditModal, remarks: e.target.value })}
                  placeholder="e.g. Afternoon shift coverage, emergency rotation, swap"
                  className="h-9 text-xs rounded-xl border-[#E8EEF2]"
                />
              </div>

              {/* Locked Warning for Past Date */}
              {!isAttendanceToday && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-semibold flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>This is a historical record for {formatLongDate(attendanceDate)}. Attendance modifications are locked to today only.</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#F6F9FB] border-t border-[#E8EEF2] flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                onClick={() => setPunchEditModal(null)}
                className="h-9 text-xs font-bold border-[#E8EEF2] rounded-xl cursor-pointer"
              >
                {isAttendanceToday ? 'Cancel' : 'Close (Read-Only)'}
              </Button>

              <Button
                onClick={() => {
                  punchAttendanceMutation.mutate({
                    userId: punchEditModal.staffId,
                    status: punchEditModal.status,
                    shiftName: punchEditModal.shiftName,
                    location: punchEditModal.location,
                    clockInTime: punchEditModal.clockInTime || null,
                    clockOutTime: punchEditModal.clockOutTime || null,
                    remarks: punchEditModal.remarks || 'Supervisor Custom Time Punch'
                  });
                  setPunchEditModal(null);
                }}
                disabled={punchAttendanceMutation.isPending || !isAttendanceToday}
                className="h-9 bg-[#087F8C] hover:bg-[#076b77] text-white text-xs font-bold px-4 rounded-xl shadow-xs cursor-pointer flex items-center gap-2 border-0 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {punchAttendanceMutation.isPending ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>{isAttendanceToday ? 'Save & Record Punch Log' : 'Locked (Historical)'}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Onboarding Modal */}
      <StaffCreateModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        onSuccess={() => {
          setToastMsg('✓ New hospital staff member onboarded successfully!');
          setTimeout(() => setToastMsg(null), 3000);
        }}
      />

      {/* Staff Monthly Attendance Time-Card Dossier Modal */}
      <StaffMonthlyTimecardModal
        isOpen={!!selectedStaffTimecard}
        onClose={() => setSelectedStaffTimecard(null)}
        staff={selectedStaffTimecard}
        initialYear={summaryYear}
        initialMonth={summaryMonth}
      />

    </div>
  );
}
