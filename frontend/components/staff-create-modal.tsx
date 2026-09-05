'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  X,
  Phone,
  Mail,
  Lock,
  Building2,
  ShieldCheck,
  AlertCircle,
  Stethoscope,
  HeartPulse,
  Scissors,
  Pill,
  FlaskConical,
  ScanLine,
  Apple,
  Crown,
  Briefcase,
  Laptop,
  Receipt,
  BarChart3,
  FolderArchive,
  BedDouble,
  Truck,
  Sparkles,
  Shield,
  Wrench,
  Clock,
  Landmark,
  FileCheck,
  CreditCard,
  Syringe,
  MapPin,
  User,
  BadgeAlert,
  Droplets,
  ChevronDown,
  ChevronUp,
  HeartHandshake
} from 'lucide-react';

export interface StaffRoleDefinition {
  id: string;
  name: string;
  category: 'DOCTORS' | 'NURSING' | 'DIAGNOSTICS' | 'ADMIN_BILLING' | 'FACILITY';
  description: string;
  iconName: string;
}

export const MASTER_HOSPITAL_ROLES: StaffRoleDefinition[] = [
  // 1. Doctors & Medical
  { id: 'DOCTOR', name: 'Consultant Doctor / Specialist', category: 'DOCTORS', description: 'Clinical consultations, prescriptions, and inpatient rounds', iconName: 'Stethoscope' },
  { id: 'RMO', name: 'Resident Medical Officer (RMO)', category: 'DOCTORS', description: '24/7 duty doctor for emergency and inpatient wards', iconName: 'HeartPulse' },
  
  // 2. Nursing & Critical Care
  { id: 'NURSE', name: 'Staff Nurse / Ward In-Charge', category: 'NURSING', description: 'Bedside patient care, vitals charting, medication logs (MAR)', iconName: 'HeartPulse' },
  { id: 'OT_TECHNICIAN', name: 'Operation Theatre (OT) Technician', category: 'NURSING', description: 'OT sterilization, surgical trays, and surgeon assistance', iconName: 'Scissors' },
  { id: 'ICU_TECHNICIAN', name: 'ICU / Critical Care Technician', category: 'NURSING', description: 'Ventilator management and critical care equipment', iconName: 'HeartPulse' },
  
  // 3. Diagnostics, Pharmacy & Allied Health
  { id: 'PHARMACIST', name: 'Hospital Pharmacist', category: 'DIAGNOSTICS', description: 'Pharmacy sales counter, prescription dispensing, and medicine stock', iconName: 'Pill' },
  { id: 'LAB_TECHNICIAN', name: 'Lab / Pathology Technician', category: 'DIAGNOSTICS', description: 'Blood/pathology specimen analysis and test reports', iconName: 'FlaskConical' },
  { id: 'RADIOLOGIST', name: 'Radiology Technician', category: 'DIAGNOSTICS', description: 'X-Ray, CT, Ultrasound, and scan image reporting', iconName: 'ScanLine' },
  { id: 'PHYSIOTHERAPIST', name: 'Physiotherapist', category: 'DIAGNOSTICS', description: 'Physical rehab and orthopedic mobility therapy', iconName: 'HeartPulse' },
  { id: 'DIETICIAN', name: 'Clinical Dietician / Nutritionist', category: 'DIAGNOSTICS', description: 'Inpatient dietary charts and therapeutic nutrition planning', iconName: 'Apple' },
  
  // 4. Administration, Billing & Insurance
  { id: 'ADMIN', name: 'Hospital Administrator', category: 'ADMIN_BILLING', description: 'Full administrative control over clinic settings and team', iconName: 'Crown' },
  { id: 'HOSPITAL_MANAGER', name: 'Operations / Clinic Manager', category: 'ADMIN_BILLING', description: 'Manages daily clinic and hospital workflows', iconName: 'Briefcase' },
  { id: 'RECEPTIONIST', name: 'Receptionist / Front Desk', category: 'ADMIN_BILLING', description: 'Patient registration, appointments, and token queue management', iconName: 'Laptop' },
  { id: 'CASHIER', name: 'Billing & Cashier Executive', category: 'ADMIN_BILLING', description: 'OPD POS counters, bed admission advance collection, and tax invoicing', iconName: 'Receipt' },
  { id: 'ACCOUNTANT', name: 'Hospital Accountant', category: 'ADMIN_BILLING', description: 'Financial bookkeeping, ledger audit, and shift reconciliation', iconName: 'BarChart3' },
  { id: 'TPA_EXECUTIVE', name: 'TPA & Cashless Insurance Desk', category: 'ADMIN_BILLING', description: 'Insurance pre-authorizations, claim paperwork, and cashless approvals', iconName: 'ShieldCheck' },
  { id: 'MRD_OFFICER', name: 'Medical Records (MRD) Officer', category: 'ADMIN_BILLING', description: 'Patient medical history archiving, MLC records, and certificates', iconName: 'FolderArchive' },
  { id: 'WARD_COORDINATOR', name: 'Ward / IPD Coordinator', category: 'ADMIN_BILLING', description: 'Bed allocations, room transfers, and discharge logistics', iconName: 'BedDouble' },
  
  // 5. Facility & Support Services
  { id: 'AMBULANCE_DRIVER', name: 'Ambulance Driver / EMT', category: 'FACILITY', description: 'Emergency transit and ambulance dispatch logs', iconName: 'Truck' },
  { id: 'HOUSEKEEPING', name: 'Housekeeping & Sanitization', category: 'FACILITY', description: 'Ward cleanliness, bed sanitization, and biohazard waste', iconName: 'Sparkles' },
  { id: 'SECURITY', name: 'Hospital Security Guard', category: 'FACILITY', description: 'Premises safety, visitor gate passes, and emergency triage', iconName: 'Shield' },
  { id: 'MAINTENANCE', name: 'Biomedical & Maintenance Technician', category: 'FACILITY', description: 'Hospital equipment calibration and electrical infrastructure', iconName: 'Wrench' }
];

export const renderRoleIcon = (iconName: string, className = "w-4 h-4") => {
  switch (iconName) {
    case 'Stethoscope': return <Stethoscope className={className} />;
    case 'HeartPulse': return <HeartPulse className={className} />;
    case 'Scissors': return <Scissors className={className} />;
    case 'Pill': return <Pill className={className} />;
    case 'FlaskConical': return <FlaskConical className={className} />;
    case 'ScanLine': return <ScanLine className={className} />;
    case 'Apple': return <Apple className={className} />;
    case 'Crown': return <Crown className={className} />;
    case 'Briefcase': return <Briefcase className={className} />;
    case 'Laptop': return <Laptop className={className} />;
    case 'Receipt': return <Receipt className={className} />;
    case 'BarChart3': return <BarChart3 className={className} />;
    case 'ShieldCheck': return <ShieldCheck className={className} />;
    case 'FolderArchive': return <FolderArchive className={className} />;
    case 'BedDouble': return <BedDouble className={className} />;
    case 'Truck': return <Truck className={className} />;
    case 'Sparkles': return <Sparkles className={className} />;
    case 'Shield': return <Shield className={className} />;
    case 'Wrench': return <Wrench className={className} />;
    default: return <User className={className} />;
  }
};

interface StaffCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const StaffCreateModal: React.FC<StaffCreateModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const [showCompliance, setShowCompliance] = useState(false);

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
    // Government KYC & Statutory Compliance
    aadhaarNumber: '',
    panNumber: '',
    residentialAddress: '',
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

  const [errorMsg, setErrorMsg] = useState('');

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
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to onboard staff member.');
    }
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.name.trim()) {
      setErrorMsg('Full Name is required.');
      return;
    }
    if (!formData.email.trim()) {
      setErrorMsg('Official Email is required.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl border border-[#E8EEF2] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp font-sans">
        
        {/* Sleek Minimal Header */}
        <div className="px-6 py-4 border-b border-[#E8EEF2] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#087F8C]/10 text-[#087F8C] flex items-center justify-center font-bold">
              {renderRoleIcon(selectedRoleObj.iconName, "w-4 h-4 text-[#087F8C]")}
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#172B34]">Onboard Staff Member</h3>
              <p className="text-[11px] text-[#567781]">Add personnel to hospital directory, duty roster, and attendance log</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* Minimal Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          
          {/* SECTION 1: ROLE & PERMISSION */}
          <div>
            <Label className="text-xs font-bold text-[#172B34] flex items-center gap-1.5 mb-1.5">
              <span>Hospital Role & Permission *</span>
            </Label>
            <div className="relative">
              <select
                value={formData.roleId}
                onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                className="w-full border border-[#E8EEF2] bg-[#F6F9FB] rounded-xl text-xs h-10 px-3 pr-8 font-semibold text-[#172B34] focus:outline-none focus:border-[#087F8C] focus:bg-white transition-all cursor-pointer"
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
            <p className="text-[11px] text-[#567781] mt-1">
              {selectedRoleObj.description}
            </p>
          </div>

          {/* SECTION 2: IDENTITY & LOGIN DETAILS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <Label className="text-xs font-bold text-[#172B34] flex items-center gap-1.5 mb-1.5">
                <User className="w-3.5 h-3.5 text-[#567781]" />
                <span>Full Name *</span>
              </Label>
              <Input
                placeholder="e.g. Rahul Sharma"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white focus:border-[#087F8C] rounded-xl text-xs h-9.5 font-medium"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-[#172B34] flex items-center gap-1.5 mb-1.5">
                <Phone className="w-3.5 h-3.5 text-[#567781]" />
                <span>Mobile Phone *</span>
              </Label>
              <Input
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white focus:border-[#087F8C] rounded-xl text-xs h-9.5 font-mono font-medium"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-[#172B34] flex items-center gap-1.5 mb-1.5">
                <Mail className="w-3.5 h-3.5 text-[#567781]" />
                <span>Login Email *</span>
              </Label>
              <Input
                type="email"
                placeholder="staff@nisschaycms.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white focus:border-[#087F8C] rounded-xl text-xs h-9.5 font-medium"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-[#172B34] flex items-center gap-1.5 mb-1.5">
                <Lock className="w-3.5 h-3.5 text-[#567781]" />
                <span>Password *</span>
              </Label>
              <Input
                type="password"
                placeholder="Min 6 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white focus:border-[#087F8C] rounded-xl text-xs h-9.5 font-mono font-medium"
                required
              />
            </div>
          </div>

          {/* SECTION 3: DEPARTMENT & SHIFT */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
            <div>
              <Label className="text-xs font-bold text-[#172B34] flex items-center gap-1.5 mb-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#567781]" />
                <span>Department / Unit</span>
              </Label>
              <Input
                placeholder="e.g. ICU / OPD Desk"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white focus:border-[#087F8C] rounded-xl text-xs h-9.5 font-medium"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-[#172B34] flex items-center gap-1.5 mb-1.5">
                <Clock className="w-3.5 h-3.5 text-[#567781]" />
                <span>Shift Timing</span>
              </Label>
              <select
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
              <Label className="text-xs font-bold text-[#172B34] flex items-center gap-1.5 mb-1.5">
                <Droplets className="w-3.5 h-3.5 text-rose-500" />
                <span>Blood Group</span>
              </Label>
              <select
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

          {/* SECTION 4: STATUTORY KYC & COMPLIANCE (COLLAPSIBLE / OPTIONAL ACCORDION) */}
          <div className="border border-[#E8EEF2] rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowCompliance(!showCompliance)}
              className="w-full px-4 py-3 bg-[#F6F9FB] hover:bg-[#F0F4F8] flex items-center justify-between text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#087F8C]" />
                <span className="text-xs font-bold text-[#172B34]">Statutory KYC, Council & Banking Details</span>
                <span className="text-[10px] text-[#567781] font-normal">(Aadhaar, PAN, Council Reg, Payroll)</span>
              </div>
              {showCompliance ? <ChevronUp className="w-4 h-4 text-[#567781]" /> : <ChevronDown className="w-4 h-4 text-[#567781]" />}
            </button>

            {showCompliance && (
              <div className="p-4 space-y-4 bg-white border-t border-[#E8EEF2] animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <Label className="text-[11px] font-bold text-[#172B34] mb-1 block">Aadhaar Number</Label>
                    <Input
                      placeholder="12-digit Aadhaar"
                      value={formData.aadhaarNumber}
                      onChange={(e) => setFormData({ ...formData, aadhaarNumber: e.target.value })}
                      className="border-[#E8EEF2] bg-[#F6F9FB] text-xs h-9 font-mono"
                      maxLength={14}
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-bold text-[#172B34] mb-1 block">PAN Number</Label>
                    <Input
                      placeholder="10-digit PAN"
                      value={formData.panNumber}
                      onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                      className="border-[#E8EEF2] bg-[#F6F9FB] text-xs h-9 font-mono uppercase"
                      maxLength={10}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <Label className="text-[11px] font-bold text-[#172B34] mb-1 block">Council Registration No.</Label>
                    <Input
                      placeholder="e.g. MNC-2021-98741"
                      value={formData.councilRegistrationNumber}
                      onChange={(e) => setFormData({ ...formData, councilRegistrationNumber: e.target.value })}
                      className="border-[#E8EEF2] bg-[#F6F9FB] text-xs h-9 font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-bold text-[#172B34] mb-1 block">Police Verification Status</Label>
                    <select
                      value={formData.policeVerificationStatus}
                      onChange={(e) => setFormData({ ...formData, policeVerificationStatus: e.target.value })}
                      className="w-full border border-[#E8EEF2] bg-[#F6F9FB] rounded-xl text-xs h-9 px-2 font-medium"
                    >
                      <option value="VERIFIED">Verified & Clean</option>
                      <option value="PENDING_SUBMISSION">Pending Submission</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="EXEMPT">Exempted</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <Label className="text-[11px] font-bold text-[#172B34] mb-1 block">Bank Name</Label>
                    <Input
                      placeholder="e.g. HDFC Bank"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="border-[#E8EEF2] bg-[#F6F9FB] text-xs h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-bold text-[#172B34] mb-1 block">Bank Account No.</Label>
                    <Input
                      placeholder="Account Number"
                      value={formData.bankAccountNumber}
                      onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                      className="border-[#E8EEF2] bg-[#F6F9FB] text-xs h-9 font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-bold text-[#172B34] mb-1 block">IFSC Code</Label>
                    <Input
                      placeholder="e.g. HDFC0001234"
                      value={formData.bankIfscCode}
                      onChange={(e) => setFormData({ ...formData, bankIfscCode: e.target.value.toUpperCase() })}
                      className="border-[#E8EEF2] bg-[#F6F9FB] text-xs h-9 font-mono uppercase"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8EEF2]">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-9 text-xs font-semibold text-[#567781] hover:text-[#172B34] border-[#E8EEF2] rounded-xl px-4 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createStaffMutation.isPending}
              className="h-9 bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs px-5 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              {createStaffMutation.isPending ? 'Onboarding...' : 'Onboard Staff Member'}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
};
