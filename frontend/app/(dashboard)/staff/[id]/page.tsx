'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MASTER_HOSPITAL_ROLES, renderRoleIcon } from '@/components/staff-create-modal';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Building2,
  Clock,
  IndianRupee,
  ShieldCheck,
  Calendar,
  Edit2,
  UserCheck,
  UserX,
  AlertCircle,
  Briefcase,
  Layers,
  Sparkles,
  MapPin,
  HeartPulse,
  Award,
  FileCheck,
  CreditCard,
  Syringe,
  CheckCircle2,
  ClipboardList,
  CalendarDays,
  Clock3,
  BadgeAlert,
  Droplets,
  Building,
  KeyRound,
  X
} from 'lucide-react';

const DAYS_OF_WEEK = [
  { id: 'MONDAY', label: 'Monday' },
  { id: 'TUESDAY', label: 'Tuesday' },
  { id: 'WEDNESDAY', label: 'Wednesday' },
  { id: 'THURSDAY', label: 'Thursday' },
  { id: 'FRIDAY', label: 'Friday' },
  { id: 'SATURDAY', label: 'Saturday' },
  { id: 'SUNDAY', label: 'Sunday' },
];

export default function StaffDossierPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const staffId = resolvedParams.id;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'PROFILE' | 'ATTENDANCE' | 'ROSTER'>('PROFILE');
  const [isEditing, setIsEditing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // 1. Fetch Single Staff User Profile
  const {
    data: staff,
    isLoading: isStaffLoading,
    isError: isStaffError,
    error: staffError,
    refetch: refetchStaff
  } = useQuery<any>({
    queryKey: ['staff-member', staffId],
    queryFn: async () => {
      try {
        const res = await apiClient.get(`/users/staff/${staffId}`);
        if (res.data) return res.data;
      } catch (e) {
        console.warn('Single staff fetch error, falling back to /users/staff list:', e);
      }
      const listRes = await apiClient.get('/users/staff');
      const found = (listRes.data || []).find((s: any) => s.id === staffId);
      if (found) return found;
      throw new Error('Staff personnel record not found in hospital directory.');
    },
  });

  // 2. Fetch Staff Attendance History
  const { data: attendanceHistory = [] } = useQuery<any[]>({
    queryKey: ['staff-attendance-history', staffId],
    queryFn: async () => {
      try {
        const res = await apiClient.get(`/staff/attendance/user/${staffId}`);
        return res.data || [];
      } catch {
        return [];
      }
    },
    enabled: !!staffId,
  });

  // 3. Fetch Clinic Weekly Roster
  const { data: rosterRecords = [] } = useQuery<any[]>({
    queryKey: ['staff-roster'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/staff/roster');
        return res.data || [];
      } catch {
        return [];
      }
    },
  });

  const staffRoster = rosterRecords.filter((r: any) => r.userId === staffId);

  // Edit form state
  const [formData, setFormData] = useState<any>({});
  const [editTab, setEditTab] = useState<'BASIC' | 'KYC' | 'ADDRESS' | 'BANKING'>('BASIC');

  const startEdit = () => {
    if (!staff) return;
    setFormData({
      name: staff.name || '',
      email: staff.email || '',
      password: '',
      phone: staff.phone || '',
      roleId: staff.role || 'STAFF',
      active: staff.active !== undefined ? staff.active : true,
      department: staff.department || '',
      shiftTiming: staff.shiftTiming || 'Morning (08:00 - 14:00)',
      deskNumber: staff.deskNumber || '',
      bloodGroup: staff.bloodGroup || 'B+',
      aadhaarNumber: staff.aadhaarNumber || '',
      panNumber: staff.panNumber || '',
      residentialAddress: staff.residentialAddress || '',
      city: staff.city || '',
      state: staff.state || '',
      pincode: staff.pincode || '',
      policeVerificationStatus: staff.policeVerificationStatus || 'PENDING_SUBMISSION',
      councilRegistrationNumber: staff.councilRegistrationNumber || '',
      councilName: staff.councilName || '',
      hepatitisBStatus: staff.hepatitisBStatus || 'VACCINATED',
      bankAccountNumber: staff.bankAccountNumber || '',
      bankIfscCode: staff.bankIfscCode || '',
      bankName: staff.bankName || '',
      emergencyContactName: staff.emergencyContactName || '',
      emergencyContactPhone: staff.emergencyContactPhone || '',
      emergencyContactRelationship: staff.emergencyContactRelationship || 'Spouse',
    });
    setEditTab('BASIC');
    setIsEditing(true);
  };

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.put(`/users/staff/${staffId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-member', staffId] });
      queryClient.invalidateQueries({ queryKey: ['staff-users-list'] });
      setIsEditing(false);
      setToastMsg('Staff dossier updated successfully with all details!');
      setTimeout(() => setToastMsg(null), 3000);
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || err.message || 'Failed to update staff dossier.');
    }
  });

  const roleDef = MASTER_HOSPITAL_ROLES.find((r) => r.id === staff?.role) || {
    id: staff?.role || 'STAFF',
    name: staff?.role || 'Hospital Staff',
    category: 'FACILITY',
    description: 'Hospital employee',
    iconName: 'User',
  };

  const getInitials = (name: string) => {
    if (!name) return 'ST';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  if (isStaffLoading) {
    return (
      <div className="w-full p-16 text-center bg-white border border-[#E8EEF2] rounded-2xl shadow-2xs space-y-3 font-sans">
        <div className="w-9 h-9 border-3 border-[#087F8C]/20 border-t-[#087F8C] rounded-full animate-spin mx-auto"></div>
        <p className="text-xs font-semibold text-[#567781]">Loading staff personnel dossier...</p>
      </div>
    );
  }

  if (isStaffError || !staff) {
    return (
      <div className="w-full p-16 text-center bg-white border border-[#E8EEF2] rounded-2xl shadow-2xs space-y-3 font-sans">
        <AlertCircle className="w-10 h-10 text-[#D64545] mx-auto" />
        <h2 className="text-base font-bold text-[#172B34]">Staff Record Not Found</h2>
        <p className="text-xs text-[#567781]">{(staffError as Error)?.message || 'The requested employee record could not be found.'}</p>
        <Link href="/doctors">
          <Button variant="outline" size="sm" className="mt-2 text-xs border-[#E8EEF2] text-[#567781] hover:text-[#172B34]">
            Back to Personnel Directory
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-16 font-sans">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#172B34] text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-[#22A06B]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. TOP HEADER BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-[#E8EEF2] shadow-2xs p-5 sm:p-6 transition-all no-print space-y-4">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-[#087F8C]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-10 w-48 h-48 bg-[#4FA8DB]/5 rounded-full blur-2xl pointer-events-none" />

        {/* Row 1: Avatar + Name + Role */}
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
            <Link
              href="/doctors"
              className="p-2 rounded-xl bg-[#F6F9FB] border border-[#E8EEF2] text-[#567781] hover:text-[#087F8C] hover:border-[#087F8C]/40 transition-colors shadow-2xs cursor-pointer shrink-0"
              title="Back to Personnel Directory"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            {/* Circular Avatar */}
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-full bg-[#087F8C]/10 text-[#087F8C] border border-[#087F8C]/20 flex items-center justify-center font-extrabold text-base shadow-2xs">
                {getInitials(staff.name)}
              </div>
              <span
                className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white bg-[#22A06B]"
                title="Active Personnel"
              />
            </div>

            {/* Staff Info */}
            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-extrabold text-[#172B34] tracking-tight flex items-center gap-2">
                  <span>{staff.name}</span>
                </h1>
                <span className="inline-block px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-[#087F8C]/10 text-[#087F8C] border border-[#087F8C]/20 font-mono">
                  {staff.employeeId || `EMP-${staff.id.slice(0, 4).toUpperCase()}`}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-[#F6F9FB] text-[#172B34] border border-[#E8EEF2]">
                  {renderRoleIcon(roleDef.iconName, "w-3.5 h-3.5 text-[#087F8C]")}
                  <span>{roleDef.name}</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap text-xs text-[#567781]">
                <span>{staff.department || 'Hospital Operations'}</span>
                {staff.shiftTiming && <span>• {staff.shiftTiming}</span>}
                {staff.deskNumber && <span className="text-[#087F8C] font-semibold">• Desk: {staff.deskNumber}</span>}
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 shrink-0 pt-1 lg:pt-0 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={startEdit}
              className="w-full sm:w-auto min-h-[38px] border-[#E8EEF2] bg-white text-[#087F8C] hover:border-[#087F8C]/40 font-bold text-xs rounded-xl shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 px-3.5"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Staff Dossier</span>
            </Button>
          </div>
        </div>

        {/* Row 2: Metadata Strip */}
        <div className="relative z-10 pt-2.5 border-t border-[#E8EEF2]/80 flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-[#F6F9FB] px-3.5 sm:px-4 py-2.5 rounded-xl text-xs">
          <div className="flex items-center gap-4 text-[#567781] flex-wrap">
            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[#087F8C]" />
              <span>Mobile: <strong className="text-[#172B34] font-mono">{staff.phone || 'Not provided'}</strong></span>
            </div>

            <span className="text-[#CBD5E1] hidden sm:inline">•</span>

            <div className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#567781]" />
              <span>Portal Login: <strong className="text-[#172B34] font-mono">{staff.email}</strong></span>
            </div>

            {staff.bloodGroup && (
              <>
                <span className="text-[#CBD5E1] hidden sm:inline">•</span>
                <div className="flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-[#D64545]" />
                  <span>Blood: <strong className="text-[#D64545] font-bold">{staff.bloodGroup}</strong></span>
                </div>
              </>
            )}

            {staff.policeVerificationStatus && (
              <>
                <span className="text-[#CBD5E1] hidden sm:inline">•</span>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#22A06B]" />
                  <span>KYC: <strong className="text-[#22A06B] font-bold">{staff.policeVerificationStatus}</strong></span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#22A06B] flex items-center gap-1 bg-[#22A06B]/10 px-2.5 py-0.5 rounded-md border border-[#22A06B]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22A06B] animate-pulse" />
              <span>Active Employee Record</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. STATS STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-[#E8EEF2] rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-[#567781] uppercase tracking-wider block">Assigned Role</span>
          <div className="text-base sm:text-lg font-extrabold text-[#172B34] truncate">{roleDef.name}</div>
          <span className="text-[10px] text-[#567781]">{roleDef.category}</span>
        </div>

        <div className="bg-white border border-[#E8EEF2] rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-[#087F8C] uppercase tracking-wider block">Shift Timing</span>
          <div className="text-base sm:text-lg font-extrabold text-[#087F8C] truncate">{staff.shiftTiming || 'General Day'}</div>
          <span className="text-[10px] text-[#087F8C]">Desk: {staff.deskNumber || 'Station #1'}</span>
        </div>

        <div className="bg-white border border-[#E8EEF2] rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-[#22A06B] uppercase tracking-wider block">Attendance Punches</span>
          <div className="text-xl sm:text-2xl font-extrabold text-[#22A06B]">{attendanceHistory.length}</div>
          <span className="text-[10px] text-[#22A06B]">Recent shift logs</span>
        </div>

        <div className="bg-white border border-[#E8EEF2] rounded-2xl p-4 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-[#E9A23B] uppercase tracking-wider block">Roster Slots</span>
          <div className="text-xl sm:text-2xl font-extrabold text-[#172B34]">{staffRoster.length} Days</div>
          <span className="text-[10px] text-[#567781]">Weekly duty allocated</span>
        </div>
      </div>

      {/* 3. WORKSTATION TABS (Touch-Optimized for iPad & Mobile) */}
      <div className="flex items-center gap-1.5 sm:gap-2 bg-[#F6F9FB] p-1.5 rounded-2xl border border-[#E8EEF2] overflow-x-auto scrollbar-none -mx-1 px-1">
        <button
          onClick={() => setActiveTab('PROFILE')}
          className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap min-h-[44px] shrink-0 sm:flex-1 ${
            activeTab === 'PROFILE'
              ? 'bg-white text-[#172B34] shadow-xs border border-[#E8EEF2]'
              : 'text-[#567781] hover:text-[#172B34]'
          }`}
        >
          <User className="w-4 h-4 text-[#087F8C] shrink-0" />
          <span>Staff Dossier & Information</span>
        </button>

        <button
          onClick={() => setActiveTab('ATTENDANCE')}
          className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap min-h-[44px] shrink-0 sm:flex-1 ${
            activeTab === 'ATTENDANCE'
              ? 'bg-white text-[#172B34] shadow-xs border border-[#E8EEF2]'
              : 'text-[#567781] hover:text-[#172B34]'
          }`}
        >
          <Clock3 className="w-4 h-4 text-[#22A06B] shrink-0" />
          <span>Attendance & Time-Card ({attendanceHistory.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ROSTER')}
          className={`px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap min-h-[44px] shrink-0 sm:flex-1 ${
            activeTab === 'ROSTER'
              ? 'bg-white text-[#172B34] shadow-xs border border-[#E8EEF2]'
              : 'text-[#567781] hover:text-[#172B34]'
          }`}
        >
          <CalendarDays className="w-4 h-4 text-[#E9A23B] shrink-0" />
          <span>Weekly Duty Roster ({staffRoster.length})</span>
        </button>
      </div>

      {/* 4. WORKSTATION CONTENT */}

      {/* TAB 1: STAFF DOSSIER & INFORMATION */}
      {activeTab === 'PROFILE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Employment & Station Allocation */}
          <div className="bg-white border border-[#E8EEF2] rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E8EEF2] pb-3">
              <Briefcase className="w-4 h-4 text-[#087F8C]" />
              <h3 className="text-sm font-extrabold text-[#172B34]">1. Employment & Station Assignment</h3>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-[#E8EEF2]/60">
                <span className="text-[#567781] font-medium">Full Name:</span>
                <strong className="text-[#172B34] font-bold">{staff.name}</strong>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#E8EEF2]/60">
                <span className="text-[#567781] font-medium">Employee Code:</span>
                <strong className="text-[#087F8C] font-mono font-bold">{staff.employeeId || `EMP-${staff.id.slice(0, 4).toUpperCase()}`}</strong>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#E8EEF2]/60">
                <span className="text-[#567781] font-medium">Designation / Role:</span>
                <strong className="text-[#172B34] font-semibold">{roleDef.name}</strong>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#E8EEF2]/60">
                <span className="text-[#567781] font-medium">Assigned Department:</span>
                <strong className="text-[#172B34] font-semibold">{staff.department || 'Hospital Operations'}</strong>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#E8EEF2]/60">
                <span className="text-[#567781] font-medium">Default Shift:</span>
                <strong className="text-[#172B34] font-semibold">{staff.shiftTiming || 'General Day (09:00 AM - 06:00 PM)'}</strong>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[#567781] font-medium">Chamber / Desk:</span>
                <strong className="text-[#087F8C] font-semibold">{staff.deskNumber || 'Unassigned Desk'}</strong>
              </div>
            </div>
          </div>

          {/* Card 2: Statutory Identity & Clinical Compliance */}
          <div className="bg-white border border-[#E8EEF2] rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E8EEF2] pb-3">
              <ShieldCheck className="w-4 h-4 text-[#22A06B]" />
              <h3 className="text-sm font-extrabold text-[#172B34]">2. Statutory Identity & Health Compliance</h3>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-[#E8EEF2]/60">
                <span className="text-[#567781] font-medium">Aadhaar Number:</span>
                <strong className="text-[#172B34] font-mono font-bold">{staff.aadhaarNumber || 'Not specified'}</strong>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#E8EEF2]/60">
                <span className="text-[#567781] font-medium">PAN Number:</span>
                <strong className="text-[#172B34] font-mono font-bold uppercase">{staff.panNumber || 'Not specified'}</strong>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#E8EEF2]/60">
                <span className="text-[#567781] font-medium">Council Reg No (Nursing/Pharmacy):</span>
                <strong className="text-[#172B34] font-mono font-semibold">{staff.councilRegistrationNumber || 'N/A'}</strong>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#E8EEF2]/60">
                <span className="text-[#567781] font-medium">State Council Board:</span>
                <strong className="text-[#172B34] font-semibold">{staff.councilName || 'N/A'}</strong>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#E8EEF2]/60">
                <span className="text-[#567781] font-medium">Hepatitis-B Vaccination:</span>
                <strong className="text-[#22A06B] font-bold">{staff.hepatitisBStatus === 'YES' ? 'Vaccinated (Protected)' : 'Not Recorded'}</strong>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[#567781] font-medium">Police Verification:</span>
                <strong className="text-[#172B34] font-semibold uppercase">{staff.policeVerificationStatus || 'PENDING'}</strong>
              </div>
            </div>
          </div>

          {/* Card 3: Residential Address & Emergency Contacts */}
          <div className="bg-white border border-[#E8EEF2] rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E8EEF2] pb-3">
              <MapPin className="w-4 h-4 text-[#E9A23B]" />
              <h3 className="text-sm font-extrabold text-[#172B34]">3. Residential Address & Emergency Contacts</h3>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-start justify-between py-1 border-b border-[#E8EEF2]/60">
                <span className="text-[#567781] font-medium">Address:</span>
                <strong className="text-[#172B34] text-right font-medium max-w-[220px]">{staff.residentialAddress || 'Not specified'}</strong>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#E8EEF2]/60">
                <span className="text-[#567781] font-medium">City / State / PIN:</span>
                <strong className="text-[#172B34] font-semibold">{[staff.city, staff.state, staff.pincode].filter(Boolean).join(', ') || 'Not specified'}</strong>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#E8EEF2]/60">
                <span className="text-[#567781] font-medium">Emergency Contact Person:</span>
                <strong className="text-[#172B34] font-bold">{staff.emergencyContactName || 'Not specified'}</strong>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#E8EEF2]/60">
                <span className="text-[#567781] font-medium">Emergency Phone:</span>
                <strong className="text-[#D64545] font-mono font-bold">{staff.emergencyContactPhone || 'Not specified'}</strong>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[#567781] font-medium">Relationship:</span>
                <strong className="text-[#172B34] font-semibold">{staff.emergencyContactRelationship || 'Not specified'}</strong>
              </div>
            </div>
          </div>

          {/* Card 4: Banking & Payroll Details */}
          <div className="bg-white border border-[#E8EEF2] rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E8EEF2] pb-3">
              <CreditCard className="w-4 h-4 text-[#087F8C]" />
              <h3 className="text-sm font-extrabold text-[#172B34]">4. Banking & Salary Account</h3>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-[#E8EEF2]/60">
                <span className="text-[#567781] font-medium">Bank Name:</span>
                <strong className="text-[#172B34] font-semibold">{staff.bankName || 'Not specified'}</strong>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#E8EEF2]/60">
                <span className="text-[#567781] font-medium">Account Number:</span>
                <strong className="text-[#172B34] font-mono font-bold">{staff.bankAccountNumber || 'Not specified'}</strong>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#E8EEF2]/60">
                <span className="text-[#567781] font-medium">IFSC Code:</span>
                <strong className="text-[#172B34] font-mono font-bold uppercase">{staff.bankIfscCode || 'Not specified'}</strong>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[#567781] font-medium">Salary Disbursal:</span>
                <strong className="text-[#22A06B] font-bold">Direct Bank Transfer (NEFT/IMPS)</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ATTENDANCE & TIME-CARD */}
      {activeTab === 'ATTENDANCE' && (
        <div className="bg-white border border-[#E8EEF2] rounded-2xl shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-[#E8EEF2] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock3 className="w-4 h-4 text-[#22A06B]" />
              <h3 className="text-sm font-extrabold text-[#172B34]">Attendance History for {staff.name}</h3>
            </div>
            <span className="text-xs font-bold text-[#567781]">{attendanceHistory.length} Recorded Punches</span>
          </div>

          {attendanceHistory.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Clock3 className="w-10 h-10 text-[#CBD5E1] mx-auto" />
              <p className="text-xs font-bold text-[#172B34]">No attendance punches recorded for this employee</p>
              <p className="text-[11px] text-[#567781]">Daily attendance punched from the Personnel Directory will automatically appear in this time-card.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[680px]">
                <thead className="bg-[#F6F9FB] text-[#567781] uppercase font-bold text-[10px] tracking-wider border-b border-[#E8EEF2]">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Clock In</th>
                    <th className="py-3 px-4">Clock Out</th>
                    <th className="py-3 px-4">Shift Name</th>
                    <th className="py-3 px-4">Station / Ward</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EEF2]">
                  {attendanceHistory.map((att: any) => (
                    <tr key={att.id} className="hover:bg-[#F6F9FB]/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-[#172B34]">{att.attendanceDate}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-[#087F8C]">{att.clockInTime ? att.clockInTime.substring(0, 5) : '--:--'}</td>
                      <td className="py-3 px-4 font-mono text-[#567781]">{att.clockOutTime ? att.clockOutTime.substring(0, 5) : '--:--'}</td>
                      <td className="py-3 px-4 font-medium text-[#172B34]">{att.shiftName || 'General'}</td>
                      <td className="py-3 px-4 text-[#567781]">{att.assignedLocation || 'Hospital'}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase ${
                          att.status === 'PRESENT'
                            ? 'bg-[#22A06B]/10 text-[#22A06B] border border-[#22A06B]/20'
                            : att.status === 'LATE'
                            ? 'bg-[#E9A23B]/10 text-[#E9A23B] border border-[#E9A23B]/20'
                            : att.status === 'ON_LEAVE'
                            ? 'bg-[#087F8C]/10 text-[#087F8C] border border-[#087F8C]/20'
                            : 'bg-[#D64545]/10 text-[#D64545] border border-[#D64545]/20'
                        }`}>
                          {att.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#567781] text-[11px]">{att.remarks || '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: WEEKLY DUTY ROSTER */}
      {activeTab === 'ROSTER' && (
        <div className="bg-white border border-[#E8EEF2] rounded-2xl shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#E9A23B]" />
              <h3 className="text-sm font-extrabold text-[#172B34]">Weekly Assigned Duty Schedule</h3>
            </div>
            <span className="text-xs text-[#567781] font-medium">Assigned via Hospital Roster Master</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-3">
            {DAYS_OF_WEEK.map((d) => {
              const slot = staffRoster.find((r: any) => r.dayOfWeek === d.id);
              return (
                <div
                  key={d.id}
                  className={`p-3.5 rounded-xl border text-xs space-y-1.5 transition-all ${
                    slot && !slot.isOffDay
                      ? 'bg-[#087F8C]/5 border-[#087F8C]/30'
                      : 'bg-[#F6F9FB] border-[#E8EEF2]'
                  }`}
                >
                  <div className="font-extrabold text-[#172B34] text-[11px] uppercase tracking-wider">{d.label}</div>
                  {slot ? (
                    slot.isOffDay ? (
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[#E8EEF2] text-[#567781]">
                        Weekly Off
                      </span>
                    ) : (
                      <div className="space-y-1">
                        <div className="font-bold text-[#087F8C] text-xs">{slot.shiftName || 'General Shift'}</div>
                        <div className="text-[10px] text-[#567781]">{slot.assignedWardOrCabin || 'Hospital'}</div>
                      </div>
                    )
                  ) : (
                    <span className="text-[10px] text-[#94A3B8] italic">Unassigned</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. EDIT STAFF MODAL - COMPREHENSIVE FULL EDIT */}
      {isEditing && (
        <div className="fixed inset-0 bg-[#172B34]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-[#E8EEF2] rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#E8EEF2] flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#087F8C]/10 text-[#087F8C] flex items-center justify-center font-bold">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#172B34]">Edit Staff Dossier: {staff.name}</h3>
                  <p className="text-[11px] text-[#567781]">Modify personal, role, statutory KYC, address, emergency and banking details</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Sub-Tabs */}
            <div className="flex items-center gap-1.5 px-5 py-2.5 bg-[#F6F9FB] border-b border-[#E8EEF2] overflow-x-auto scrollbar-none shrink-0 text-xs">
              <button
                type="button"
                onClick={() => setEditTab('BASIC')}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  editTab === 'BASIC'
                    ? 'bg-white text-[#087F8C] shadow-xs border border-[#E8EEF2]'
                    : 'text-[#567781] hover:text-[#172B34]'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>1. Role & Identity</span>
              </button>

              <button
                type="button"
                onClick={() => setEditTab('KYC')}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  editTab === 'KYC'
                    ? 'bg-white text-[#22A06B] shadow-xs border border-[#E8EEF2]'
                    : 'text-[#567781] hover:text-[#172B34]'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>2. Statutory KYC & Council</span>
              </button>

              <button
                type="button"
                onClick={() => setEditTab('ADDRESS')}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  editTab === 'ADDRESS'
                    ? 'bg-white text-[#4FA8DB] shadow-xs border border-[#E8EEF2]'
                    : 'text-[#567781] hover:text-[#172B34]'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>3. Address & Emergency</span>
              </button>

              <button
                type="button"
                onClick={() => setEditTab('BANKING')}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  editTab === 'BANKING'
                    ? 'bg-white text-[#E9A23B] shadow-xs border border-[#E8EEF2]'
                    : 'text-[#567781] hover:text-[#172B34]'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>4. Banking & Payroll</span>
              </button>
            </div>

            {/* Form Content */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate(formData);
              }}
              className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar text-xs font-sans"
            >
              {/* TAB 1: BASIC PROFILE, ROLE & WORKSTATION */}
              {editTab === 'BASIC' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold text-[#172B34] mb-1.5 block">Full Name *</Label>
                      <Input
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="h-9.5 text-xs rounded-xl border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white font-medium"
                        required
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-[#172B34] mb-1.5 block">Mobile Phone *</Label>
                      <Input
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="h-9.5 text-xs font-mono rounded-xl border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white font-medium"
                        required
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-[#172B34] mb-1.5 block">Portal Login Email *</Label>
                      <Input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="h-9.5 text-xs rounded-xl border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white font-medium"
                        required
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-[#172B34] mb-1.5 block">Reset Login Password (Optional)</Label>
                      <Input
                        type="password"
                        placeholder="Leave blank to keep unchanged"
                        value={formData.password || ''}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="h-9.5 text-xs font-mono rounded-xl border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-[#172B34] mb-1.5 block">Hospital Role & Permission *</Label>
                      <select
                        value={formData.roleId || 'STAFF'}
                        onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                        className="w-full h-9.5 text-xs border border-[#E8EEF2] rounded-xl px-3 bg-[#F6F9FB] focus:bg-white font-semibold text-[#172B34] focus:outline-none focus:border-[#087F8C]"
                      >
                        <optgroup label="🩺 Medical & Clinical">
                          {MASTER_HOSPITAL_ROLES.filter(r => r.category === 'DOCTORS').map((r) => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </optgroup>
                        <optgroup label="🫀 Nursing & Critical Care">
                          {MASTER_HOSPITAL_ROLES.filter(r => r.category === 'NURSING').map((r) => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </optgroup>
                        <optgroup label="🧪 Diagnostics & Allied Health">
                          {MASTER_HOSPITAL_ROLES.filter(r => r.category === 'DIAGNOSTICS').map((r) => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </optgroup>
                        <optgroup label="💼 Administration & Billing">
                          {MASTER_HOSPITAL_ROLES.filter(r => r.category === 'ADMIN_BILLING').map((r) => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </optgroup>
                        <optgroup label="🏢 Facility & Operations">
                          {MASTER_HOSPITAL_ROLES.filter(r => r.category === 'FACILITY').map((r) => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </optgroup>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-[#172B34] mb-1.5 block">Active Employment Status</Label>
                      <select
                        value={formData.active ? 'ACTIVE' : 'INACTIVE'}
                        onChange={(e) => setFormData({ ...formData, active: e.target.value === 'ACTIVE' })}
                        className="w-full h-9.5 text-xs border border-[#E8EEF2] rounded-xl px-3 bg-[#F6F9FB] focus:bg-white font-bold text-[#172B34] focus:outline-none focus:border-[#087F8C]"
                      >
                        <option value="ACTIVE">● On Active Duty (Authorized)</option>
                        <option value="INACTIVE">○ Suspended / Inactive</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-[#172B34] mb-1.5 block">Department / Unit</Label>
                      <Input
                        value={formData.department || ''}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        placeholder="e.g. ICU / OPD Counter / Pathology"
                        className="h-9.5 text-xs rounded-xl border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-[#172B34] mb-1.5 block">Default Shift Timing</Label>
                      <select
                        value={formData.shiftTiming || 'Morning (08:00 - 14:00)'}
                        onChange={(e) => setFormData({ ...formData, shiftTiming: e.target.value })}
                        className="w-full h-9.5 text-xs border border-[#E8EEF2] rounded-xl px-3 bg-[#F6F9FB] focus:bg-white font-medium text-[#172B34] focus:outline-none focus:border-[#087F8C]"
                      >
                        <option value="Morning (08:00 - 14:00)">Morning (08:00 - 14:00)</option>
                        <option value="Evening (14:00 - 20:00)">Evening (14:00 - 20:00)</option>
                        <option value="Night (20:00 - 08:00)">Night (20:00 - 08:00)</option>
                        <option value="General (09:00 - 18:00)">General (09:00 - 18:00)</option>
                        <option value="24x7 Rotational Emergency">24x7 Rotational Emergency</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-[#172B34] mb-1.5 block">Chamber / Desk Station</Label>
                      <Input
                        value={formData.deskNumber || ''}
                        onChange={(e) => setFormData({ ...formData, deskNumber: e.target.value })}
                        placeholder="e.g. Nursing Station #2 / Desk #1"
                        className="h-9.5 text-xs rounded-xl border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-[#172B34] mb-1.5 block">Blood Group</Label>
                      <select
                        value={formData.bloodGroup || 'B+'}
                        onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                        className="w-full h-9.5 text-xs border border-[#E8EEF2] rounded-xl px-3 bg-[#F6F9FB] focus:bg-white font-bold text-[#172B34] focus:outline-none focus:border-[#087F8C]"
                      >
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: STATUTORY KYC & LICENSING COMPLIANCE */}
              {editTab === 'KYC' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold text-[#172B34] mb-1.5 block">Aadhaar Card Number</Label>
                      <Input
                        value={formData.aadhaarNumber || ''}
                        onChange={(e) => setFormData({ ...formData, aadhaarNumber: e.target.value })}
                        placeholder="12-digit Aadhaar Number"
                        className="h-9.5 text-xs font-mono rounded-xl border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white font-medium"
                        maxLength={14}
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-[#172B34] mb-1.5 block">PAN Card Number</Label>
                      <Input
                        value={formData.panNumber || ''}
                        onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                        placeholder="10-digit PAN"
                        className="h-9.5 text-xs font-mono uppercase rounded-xl border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white font-medium"
                        maxLength={10}
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-[#172B34] mb-1.5 block">Council Registration Number</Label>
                      <Input
                        value={formData.councilRegistrationNumber || ''}
                        onChange={(e) => setFormData({ ...formData, councilRegistrationNumber: e.target.value })}
                        placeholder="e.g. MNC-2021-98741"
                        className="h-9.5 text-xs font-mono rounded-xl border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-[#172B34] mb-1.5 block">State / Licensing Council Board</Label>
                      <Input
                        value={formData.councilName || ''}
                        onChange={(e) => setFormData({ ...formData, councilName: e.target.value })}
                        placeholder="e.g. State Nursing Council / Pharmacy Council"
                        className="h-9.5 text-xs rounded-xl border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-[#172B34] mb-1.5 block">Police Verification Status</Label>
                      <select
                        value={formData.policeVerificationStatus || 'PENDING_SUBMISSION'}
                        onChange={(e) => setFormData({ ...formData, policeVerificationStatus: e.target.value })}
                        className="w-full h-9.5 text-xs border border-[#E8EEF2] rounded-xl px-3 bg-[#F6F9FB] focus:bg-white font-semibold text-[#172B34]"
                      >
                        <option value="VERIFIED">Verified & Clean</option>
                        <option value="PENDING_SUBMISSION">Pending Submission</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="EXEMPT">Exempted</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-[#172B34] mb-1.5 block">Hepatitis B Vaccination Status</Label>
                      <select
                        value={formData.hepatitisBStatus || 'VACCINATED'}
                        onChange={(e) => setFormData({ ...formData, hepatitisBStatus: e.target.value })}
                        className="w-full h-9.5 text-xs border border-[#E8EEF2] rounded-xl px-3 bg-[#F6F9FB] focus:bg-white font-semibold text-[#172B34]"
                      >
                        <option value="VACCINATED">Fully Vaccinated</option>
                        <option value="PARTIAL">Partially Vaccinated</option>
                        <option value="NOT_VACCINATED">Not Vaccinated</option>
                        <option value="EXEMPT">Exempted</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: RESIDENTIAL ADDRESS & EMERGENCY CONTACT */}
              {editTab === 'ADDRESS' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs font-bold text-[#172B34] mb-1.5 block">Residential Address</Label>
                      <textarea
                        rows={2}
                        value={formData.residentialAddress || ''}
                        onChange={(e) => setFormData({ ...formData, residentialAddress: e.target.value })}
                        placeholder="House / Flat No, Street, Landmark..."
                        className="w-full p-2.5 rounded-xl border border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white text-xs text-[#172B34] resize-none focus:outline-none focus:border-[#087F8C]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div>
                        <Label className="text-xs font-bold text-[#172B34] mb-1.5 block">City</Label>
                        <Input
                          value={formData.city || ''}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          placeholder="City"
                          className="h-9.5 text-xs rounded-xl border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-bold text-[#172B34] mb-1.5 block">State</Label>
                        <Input
                          value={formData.state || ''}
                          onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                          placeholder="State"
                          className="h-9.5 text-xs rounded-xl border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-bold text-[#172B34] mb-1.5 block">PIN Code</Label>
                        <Input
                          value={formData.pincode || ''}
                          onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                          placeholder="6-digit PIN"
                          className="h-9.5 text-xs font-mono rounded-xl border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#E8EEF2]">
                    <h4 className="text-xs font-extrabold text-[#172B34] mb-3 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#D64545]" />
                      <span>Emergency Contact Details</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div>
                        <Label className="text-xs font-bold text-[#172B34] mb-1.5 block">Emergency Contact Name</Label>
                        <Input
                          value={formData.emergencyContactName || ''}
                          onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                          placeholder="e.g. Suman Sharma"
                          className="h-9.5 text-xs rounded-xl border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-bold text-[#172B34] mb-1.5 block">Emergency Phone</Label>
                        <Input
                          value={formData.emergencyContactPhone || ''}
                          onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                          placeholder="+91 98765 43210"
                          className="h-9.5 text-xs font-mono rounded-xl border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-bold text-[#172B34] mb-1.5 block">Relationship</Label>
                        <select
                          value={formData.emergencyContactRelationship || 'Spouse'}
                          onChange={(e) => setFormData({ ...formData, emergencyContactRelationship: e.target.value })}
                          className="w-full h-9.5 text-xs border border-[#E8EEF2] rounded-xl px-3 bg-[#F6F9FB] focus:bg-white font-medium text-[#172B34]"
                        >
                          <option value="Spouse">Spouse</option>
                          <option value="Parent">Parent</option>
                          <option value="Sibling">Sibling</option>
                          <option value="Child">Child</option>
                          <option value="Guardian">Guardian</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: BANKING & PAYROLL */}
              {editTab === 'BANKING' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs font-bold text-[#172B34] mb-1.5 block">Bank Name</Label>
                      <Input
                        value={formData.bankName || ''}
                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                        placeholder="e.g. HDFC Bank / SBI"
                        className="h-9.5 text-xs rounded-xl border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-[#172B34] mb-1.5 block">Bank Account Number</Label>
                      <Input
                        value={formData.bankAccountNumber || ''}
                        onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                        placeholder="Account Number"
                        className="h-9.5 text-xs font-mono rounded-xl border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-[#172B34] mb-1.5 block">IFSC Code</Label>
                      <Input
                        value={formData.bankIfscCode || ''}
                        onChange={(e) => setFormData({ ...formData, bankIfscCode: e.target.value.toUpperCase() })}
                        placeholder="e.g. HDFC0001234"
                        className="h-9.5 text-xs font-mono uppercase rounded-xl border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-4 border-t border-[#E8EEF2] mt-4 gap-3">
                <div className="flex items-center gap-2">
                  {editTab !== 'BASIC' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (editTab === 'BANKING') setEditTab('ADDRESS');
                        else if (editTab === 'ADDRESS') setEditTab('KYC');
                        else if (editTab === 'KYC') setEditTab('BASIC');
                      }}
                      className="min-h-[38px] text-xs border-[#E8EEF2] flex-1 sm:flex-none cursor-pointer"
                    >
                      ← Previous
                    </Button>
                  )}
                  {editTab !== 'BANKING' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (editTab === 'BASIC') setEditTab('KYC');
                        else if (editTab === 'KYC') setEditTab('ADDRESS');
                        else if (editTab === 'ADDRESS') setEditTab('BANKING');
                      }}
                      className="min-h-[38px] text-xs border-[#E8EEF2] flex-1 sm:flex-none cursor-pointer"
                    >
                      Next Section →
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                    className="min-h-[38px] text-xs border-[#E8EEF2] text-[#567781] flex-1 sm:flex-none cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                    size="sm"
                    className="min-h-[38px] bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs px-5 rounded-xl shadow-xs flex-1 sm:flex-none cursor-pointer"
                  >
                    {updateMutation.isPending ? 'Saving All Details...' : 'Save Complete Dossier'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
