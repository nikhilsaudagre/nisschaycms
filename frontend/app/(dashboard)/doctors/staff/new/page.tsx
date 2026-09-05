'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  UserPlus,
  Phone,
  Mail,
  Lock,
  Building2,
  ShieldCheck,
  AlertCircle,
  Clock,
  Landmark,
  FileCheck,
  CreditCard,
  MapPin,
  User,
  BadgeAlert,
  Droplets,
  HeartHandshake,
  CheckCircle2,
  X
} from 'lucide-react';
import { MASTER_HOSPITAL_ROLES, renderRoleIcon } from '@/components/staff-create-modal';

export default function NewStaffOnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    roleId: 'NURSE',
    department: 'General Ward',
    shiftTiming: 'Morning (08:00 - 14:00)',
    deskNumber: 'Nursing Station #1',
    bloodGroup: 'B+',
    // Address Details
    residentialAddress: '',
    city: '',
    state: '',
    pincode: '',
    // Government KYC & Statutory Compliance
    aadhaarNumber: '',
    panNumber: '',
    policeVerificationStatus: 'PENDING_SUBMISSION',
    councilRegistrationNumber: '',
    councilName: '',
    // Health & Safety
    hepatitisBStatus: 'FULLY_VACCINATED',
    // Payroll & Banking
    bankAccountNumber: '',
    bankIfscCode: '',
    bankName: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: 'Spouse'
  });

  const createStaffMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiClient.post('/users/staff', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-users-list'] });
      queryClient.invalidateQueries({ queryKey: ['doctors-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['staff-list'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['staff-roster'] });
      queryClient.invalidateQueries({ queryKey: ['staff-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['staff-monthly-summary'] });
      router.push('/doctors');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to onboard staff member.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.name.trim()) {
      setErrorMsg('Full Legal Name is required.');
      return;
    }
    if (!formData.email.trim()) {
      setErrorMsg('Login Email is required.');
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setErrorMsg('Initial login password must be at least 6 characters.');
      return;
    }

    createStaffMutation.mutate(formData);
  };

  const selectedRoleObj = MASTER_HOSPITAL_ROLES.find(r => r.id === formData.roleId) || MASTER_HOSPITAL_ROLES[2];

  return (
    <div className="w-full space-y-6 pb-16 font-sans">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-[#E8EEF2] shadow-2xs p-5 sm:p-6 transition-all no-print">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-[#087F8C]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-10 w-48 h-48 bg-[#4FA8DB]/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <button
              onClick={() => router.push('/doctors')}
              className="flex items-center space-x-2 text-[#567781] hover:text-[#172B34] font-bold text-xs transition-colors group mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Staff & Doctors Directory</span>
            </button>

            <h1 className="text-xl sm:text-2xl font-extrabold text-[#172B34] tracking-tight flex items-center gap-2.5">
              <div className="p-2 bg-[#087F8C]/10 text-[#087F8C] rounded-xl border border-[#087F8C]/20">
                <UserPlus className="w-5 h-5" />
              </div>
              <span>Onboard Hospital Staff Member</span>
            </h1>
            <p className="text-xs text-[#567781] font-medium pt-0.5">
              Register nursing staff, diagnostic technicians, pharmacy executives, ward coordinators, and administration personnel.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#087F8C]/10 text-[#087F8C] border border-[#087F8C]/20 text-xs font-bold">
              <ShieldCheck className="w-4 h-4" /> Sequential EMP ID Auto-Assigned
            </span>
          </div>
        </div>
      </div>

      {/* 2. Full-Width Form Card */}
      <form onSubmit={handleSubmit} autoComplete="off" className="bg-white border border-[#E8EEF2] rounded-2xl shadow-2xs overflow-hidden">
        
        {/* Form Top Toolbar */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#E8EEF2] bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#087F8C]/10 text-[#087F8C] flex items-center justify-center font-bold shrink-0">
              {renderRoleIcon(selectedRoleObj.iconName, "w-4 h-4 text-[#087F8C]")}
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-[#172B34]">Personnel Registration Form</h2>
              <p className="text-[11px] text-[#567781]">Role permissions, address, duty station, KYC compliance, and direct deposit</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/doctors')}
              className="flex-1 sm:flex-none min-h-[38px] text-xs font-semibold text-[#567781] hover:text-[#172B34] border-[#E8EEF2] rounded-xl px-4 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createStaffMutation.isPending}
              className="flex-1 sm:flex-none min-h-[38px] bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs px-5 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {createStaffMutation.isPending ? 'Onboarding...' : 'Onboard Staff Member'}
            </Button>
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button type="button" onClick={() => setErrorMsg('')} className="text-red-500 hover:opacity-80 p-0.5 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="p-6 space-y-6">
          
          {/* SECTION 1: ROLE & DESIGNATION */}
          <div className="space-y-3.5">
            <div className="text-[11px] font-bold text-[#087F8C] uppercase tracking-wider border-b border-[#E8EEF2] pb-1.5 flex items-center gap-1.5">
              <span>1. Hospital Role & Permission Tier</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2">
                <Label htmlFor="roleId" className="text-xs font-bold text-[#172B34] mb-1.5 block">
                  Select Designation / Role *
                </Label>
                <select
                  id="roleId"
                  value={formData.roleId}
                  onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                  className="w-full border border-[#E8EEF2] bg-[#F6F9FB] rounded-xl text-xs h-10 px-3 font-semibold text-[#172B34] focus:outline-none focus:border-[#087F8C] focus:bg-white transition-all cursor-pointer"
                >
                  <optgroup label="🩺 Doctors & Medical">
                    {MASTER_HOSPITAL_ROLES.filter(r => r.category === 'DOCTORS').map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="🫀 Nursing & Critical Care">
                    {MASTER_HOSPITAL_ROLES.filter(r => r.category === 'NURSING').map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="🧪 Diagnostics & Pharmacy">
                    {MASTER_HOSPITAL_ROLES.filter(r => r.category === 'DIAGNOSTICS').map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="💼 Administration & Billing">
                    {MASTER_HOSPITAL_ROLES.filter(r => r.category === 'ADMIN_BILLING').map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="🏢 Facility & Support">
                    {MASTER_HOSPITAL_ROLES.filter(r => r.category === 'FACILITY').map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold text-[#172B34] mb-1.5 block">
                  Permission Scope
                </Label>
                <div className="h-10 px-3 bg-[#F6F9FB] border border-[#E8EEF2] rounded-xl flex items-center text-xs text-[#087F8C] font-bold">
                  {selectedRoleObj.category} Tier Access
                </div>
              </div>
            </div>
            <p className="text-[11px] text-[#567781]">
              {selectedRoleObj.description}
            </p>
          </div>

          {/* SECTION 2: PERSONAL IDENTITY & PORTAL LOGIN */}
          <div className="space-y-3.5">
            <div className="text-[11px] font-bold text-[#087F8C] uppercase tracking-wider border-b border-[#E8EEF2] pb-1.5 flex items-center gap-1.5">
              <span>2. Personal Information & Portal Login</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div>
                <Label htmlFor="name" className="text-xs font-bold text-[#172B34] flex items-center gap-1 mb-1.5">
                  <User className="w-3.5 h-3.5 text-[#567781]" />
                  <span>Full Legal Name *</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g. Sister Anjali Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white focus:border-[#087F8C] rounded-xl text-xs h-9.5 font-medium"
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-xs font-bold text-[#172B34] flex items-center gap-1 mb-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#567781]" />
                  <span>Mobile Phone *</span>
                </Label>
                <Input
                  id="phone"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white focus:border-[#087F8C] rounded-xl text-xs h-9.5 font-mono font-medium"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-xs font-bold text-[#172B34] flex items-center gap-1 mb-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#567781]" />
                  <span>Login Email *</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="off"
                  placeholder="staff@nisschaycms.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white focus:border-[#087F8C] rounded-xl text-xs h-9.5 font-medium"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-xs font-bold text-[#172B34] flex items-center gap-1 mb-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#567781]" />
                  <span>Password *</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Min 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white focus:border-[#087F8C] rounded-xl text-xs h-9.5 font-mono font-medium"
                  required
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: RESIDENTIAL & PERMANENT ADDRESS */}
          <div className="space-y-3.5">
            <div className="text-[11px] font-bold text-[#087F8C] uppercase tracking-wider border-b border-[#E8EEF2] pb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#087F8C]" />
                <span>3. Residential & Permanent Address</span>
              </div>
              <span className="text-[9px] text-[#567781] font-mono font-medium">STATUTORY COMPLIANCE</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="sm:col-span-2">
                <Label htmlFor="residentialAddress" className="text-xs font-bold text-[#172B34] mb-1.5 block">
                  Street Address / House / Flat No.
                </Label>
                <Input
                  id="residentialAddress"
                  placeholder="e.g. Flat 302, Sai Vihar Appts, Link Road"
                  value={formData.residentialAddress}
                  onChange={(e) => setFormData({ ...formData, residentialAddress: e.target.value })}
                  className="border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white focus:border-[#087F8C] rounded-xl text-xs h-9.5 font-medium"
                />
              </div>

              <div>
                <Label htmlFor="city" className="text-xs font-bold text-[#172B34] mb-1.5 block">
                  City / Town
                </Label>
                <Input
                  id="city"
                  placeholder="e.g. Mumbai / Pune"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white focus:border-[#087F8C] rounded-xl text-xs h-9.5 font-medium"
                />
              </div>

              <div>
                <Label htmlFor="state" className="text-xs font-bold text-[#172B34] mb-1.5 block">
                  State
                </Label>
                <Input
                  id="state"
                  placeholder="e.g. Maharashtra"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white focus:border-[#087F8C] rounded-xl text-xs h-9.5 font-medium"
                />
              </div>

              <div>
                <Label htmlFor="pincode" className="text-xs font-bold text-[#172B34] mb-1.5 block">
                  Postal / PIN Code
                </Label>
                <Input
                  id="pincode"
                  placeholder="e.g. 400001"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  className="border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white focus:border-[#087F8C] rounded-xl text-xs h-9.5 font-mono font-medium"
                  maxLength={10}
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: DEPARTMENT & SHIFT TIMINGS */}
          <div className="space-y-3.5">
            <div className="text-[11px] font-bold text-[#087F8C] uppercase tracking-wider border-b border-[#E8EEF2] pb-1.5">
              4. Hospital Station, Shift Timing & Blood Group
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div>
                <Label htmlFor="department" className="text-xs font-bold text-[#172B34] flex items-center gap-1 mb-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#567781]" />
                  <span>Department / Ward</span>
                </Label>
                <Input
                  id="department"
                  placeholder="e.g. ICU / Emergency / OPD"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white focus:border-[#087F8C] rounded-xl text-xs h-9.5 font-medium"
                />
              </div>

              <div>
                <Label htmlFor="deskNumber" className="text-xs font-bold text-[#172B34] flex items-center gap-1 mb-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#567781]" />
                  <span>Station / Desk No.</span>
                </Label>
                <Input
                  id="deskNumber"
                  placeholder="e.g. Counter #2 / Bed 1-10"
                  value={formData.deskNumber}
                  onChange={(e) => setFormData({ ...formData, deskNumber: e.target.value })}
                  className="border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white focus:border-[#087F8C] rounded-xl text-xs h-9.5 font-medium"
                />
              </div>

              <div>
                <Label htmlFor="shiftTiming" className="text-xs font-bold text-[#172B34] flex items-center gap-1 mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#567781]" />
                  <span>Duty Shift Timing</span>
                </Label>
                <select
                  id="shiftTiming"
                  value={formData.shiftTiming}
                  onChange={(e) => setFormData({ ...formData, shiftTiming: e.target.value })}
                  className="w-full border border-[#E8EEF2] bg-[#F6F9FB] rounded-xl text-xs h-9.5 px-2.5 font-medium text-[#172B34] focus:outline-none focus:border-[#087F8C] focus:bg-white"
                >
                  <option value="Morning (08:00 - 14:00)">Morning (08:00 - 14:00)</option>
                  <option value="Evening (14:00 - 20:00)">Evening (14:00 - 20:00)</option>
                  <option value="Night (20:00 - 08:00)">Night (20:00 - 08:00)</option>
                  <option value="General (09:00 - 18:00)">General (09:00 - 18:00)</option>
                  <option value="24x7 Rotational Emergency">24x7 Rotational</option>
                </select>
              </div>

              <div>
                <Label htmlFor="bloodGroup" className="text-xs font-bold text-[#172B34] flex items-center gap-1 mb-1.5">
                  <Droplets className="w-3.5 h-3.5 text-rose-500" />
                  <span>Blood Group</span>
                </Label>
                <select
                  id="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                  className="w-full border border-[#E8EEF2] bg-[#F6F9FB] rounded-xl text-xs h-9.5 px-2.5 font-bold text-[#172B34] focus:outline-none focus:border-[#087F8C] focus:bg-white"
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

          {/* SECTION 5: STATUTORY KYC & LEGAL COMPLIANCE */}
          <div className="space-y-3.5">
            <div className="text-[11px] font-bold text-[#087F8C] uppercase tracking-wider border-b border-[#E8EEF2] pb-1.5 flex items-center justify-between">
              <span>5. Statutory KYC, Council Registration & Background Audit</span>
              <span className="text-[9px] text-[#567781] font-mono font-medium">CLINICAL ESTABLISHMENTS ACT</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div>
                <Label htmlFor="aadhaar" className="text-xs font-bold text-[#172B34] flex items-center gap-1 mb-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-[#567781]" />
                  <span>Aadhaar Number</span>
                </Label>
                <Input
                  id="aadhaar"
                  placeholder="12-digit Aadhaar"
                  value={formData.aadhaarNumber}
                  onChange={(e) => setFormData({ ...formData, aadhaarNumber: e.target.value })}
                  className="border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white focus:border-[#087F8C] rounded-xl text-xs h-9.5 font-mono"
                  maxLength={14}
                />
              </div>

              <div>
                <Label htmlFor="pan" className="text-xs font-bold text-[#172B34] flex items-center gap-1 mb-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-[#567781]" />
                  <span>PAN Number</span>
                </Label>
                <Input
                  id="pan"
                  placeholder="10-digit PAN"
                  value={formData.panNumber}
                  onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                  className="border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white focus:border-[#087F8C] rounded-xl text-xs h-9.5 font-mono uppercase"
                  maxLength={10}
                />
              </div>

              <div>
                <Label htmlFor="councilReg" className="text-xs font-bold text-[#172B34] flex items-center gap-1 mb-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#567781]" />
                  <span>Council Registration No.</span>
                </Label>
                <Input
                  id="councilReg"
                  placeholder="e.g. MNC-2021-98741"
                  value={formData.councilRegistrationNumber}
                  onChange={(e) => setFormData({ ...formData, councilRegistrationNumber: e.target.value })}
                  className="border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white focus:border-[#087F8C] rounded-xl text-xs h-9.5 font-mono"
                />
              </div>

              <div>
                <Label htmlFor="policeVerification" className="text-xs font-bold text-[#172B34] flex items-center gap-1 mb-1.5">
                  <BadgeAlert className="w-3.5 h-3.5 text-[#E9A23B]" />
                  <span>Police Background Audit</span>
                </Label>
                <select
                  id="policeVerification"
                  value={formData.policeVerificationStatus}
                  onChange={(e) => setFormData({ ...formData, policeVerificationStatus: e.target.value })}
                  className="w-full border border-[#E8EEF2] bg-[#F6F9FB] rounded-xl text-xs h-9.5 px-2.5 font-medium text-[#172B34] focus:outline-none focus:border-[#087F8C] focus:bg-white"
                >
                  <option value="VERIFIED">Verified & Clean Record</option>
                  <option value="PENDING_SUBMISSION">Pending Submission</option>
                  <option value="IN_PROGRESS">Police Verification In Progress</option>
                  <option value="EXEMPT">Exempted / Temporary</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 6: DIRECT PAYROLL & EMERGENCY CONTACT */}
          <div className="space-y-3.5">
            <div className="text-[11px] font-bold text-[#087F8C] uppercase tracking-wider border-b border-[#E8EEF2] pb-1.5">
              6. Bank Payroll & Emergency Next-of-Kin Contact
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <div>
                <Label htmlFor="bankName" className="text-xs font-bold text-[#172B34] flex items-center gap-1 mb-1.5">
                  <Landmark className="w-3.5 h-3.5 text-[#567781]" />
                  <span>Bank Name</span>
                </Label>
                <Input
                  id="bankName"
                  placeholder="e.g. HDFC Bank / SBI"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className="border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white focus:border-[#087F8C] rounded-xl text-xs h-9.5"
                />
              </div>

              <div>
                <Label htmlFor="accountNo" className="text-xs font-bold text-[#172B34] mb-1.5 block">
                  Bank Account Number
                </Label>
                <Input
                  id="accountNo"
                  placeholder="e.g. 50100412345678"
                  value={formData.bankAccountNumber}
                  onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                  className="border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white focus:border-[#087F8C] rounded-xl text-xs h-9.5 font-mono"
                />
              </div>

              <div>
                <Label htmlFor="ifsc" className="text-xs font-bold text-[#172B34] mb-1.5 block">
                  IFSC Code
                </Label>
                <Input
                  id="ifsc"
                  placeholder="e.g. HDFC0001234"
                  value={formData.bankIfscCode}
                  onChange={(e) => setFormData({ ...formData, bankIfscCode: e.target.value.toUpperCase() })}
                  className="border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white focus:border-[#087F8C] rounded-xl text-xs h-9.5 font-mono uppercase"
                  maxLength={11}
                />
              </div>

              <div>
                <Label htmlFor="kinName" className="text-xs font-bold text-[#172B34] flex items-center gap-1 mb-1.5">
                  <HeartHandshake className="w-3.5 h-3.5 text-[#567781]" />
                  <span>Emergency Kin Name</span>
                </Label>
                <Input
                  id="kinName"
                  placeholder="e.g. Ramesh Sharma"
                  value={formData.emergencyContactName}
                  onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                  className="border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white focus:border-[#087F8C] rounded-xl text-xs h-9.5"
                />
              </div>

              <div>
                <Label htmlFor="kinRel" className="text-xs font-bold text-[#172B34] mb-1.5 block">
                  Relationship
                </Label>
                <Input
                  id="kinRel"
                  placeholder="e.g. Spouse / Father / Sibling"
                  value={formData.emergencyContactRelationship}
                  onChange={(e) => setFormData({ ...formData, emergencyContactRelationship: e.target.value })}
                  className="border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white focus:border-[#087F8C] rounded-xl text-xs h-9.5"
                />
              </div>

              <div>
                <Label htmlFor="kinPhone" className="text-xs font-bold text-[#172B34] mb-1.5 block">
                  Kin Emergency Phone
                </Label>
                <Input
                  id="kinPhone"
                  placeholder="+91 98765 43210"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                  className="border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white focus:border-[#087F8C] rounded-xl text-xs h-9.5 font-mono"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Form Footer Actions */}
        <div className="px-5 sm:px-6 py-4 bg-white border-t border-[#E8EEF2] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/doctors')}
            className="min-h-[38px] text-xs font-semibold text-[#567781] hover:text-[#172B34] border-[#E8EEF2] rounded-xl px-4 cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={createStaffMutation.isPending}
            className="min-h-[38px] bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs px-6 rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{createStaffMutation.isPending ? 'Onboarding...' : 'Complete Staff Onboarding'}</span>
          </Button>
        </div>

      </form>
    </div>
  );
}
