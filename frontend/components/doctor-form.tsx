'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { doctorSchema, DoctorInput } from '@/lib/validations';
import { apiClient } from '@/lib/api-client';
import { Doctor } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  User,
  Phone,
  Mail,
  Lock,
  Stethoscope,
  Award,
  Clock,
  IndianRupee,
  Building,
  AlertCircle,
  X,
  Calendar,
  Globe,
  PenTool,
  ShieldCheck,
  CheckCircle2,
  FileText,
  MapPin
} from 'lucide-react';

interface DoctorFormProps {
  doctor?: Doctor;
  onSuccess?: (doctor?: Doctor) => void;
  onCancel?: () => void;
}

const SPECIALIZATIONS = [
  'General Medicine',
  'Cardiology',
  'Pediatrics',
  'Dermatology',
  'Orthopedics',
  'Gynecology & Obstetrics',
  'General Surgery',
  'ENT (Otolaryngology)',
  'Ophthalmology',
  'Neurology',
  'Nephrology',
  'Pulmonology',
  'Psychiatry',
  'Dental Surgery',
  'Physiotherapy',
  'Anesthesiology',
  'Radiology',
  'Pathology',
  'Emergency Medicine'
];

const SLOT_DURATIONS = [
  { value: 10, label: '10 Minutes' },
  { value: 15, label: '15 Minutes (Default)' },
  { value: 20, label: '20 Minutes' },
  { value: 30, label: '30 Minutes' },
  { value: 45, label: '45 Minutes' },
  { value: 60, label: '60 Minutes' },
];

export const DoctorForm: React.FC<DoctorFormProps> = ({ doctor, onSuccess, onCancel }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!doctor;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      name: doctor?.name || '',
      phone: doctor?.phone || '',
      email: doctor?.email || '',
      password: '',
      gender: doctor?.gender || '',
      registrationNumber: doctor?.registrationNumber || '',
      medicalCouncil: doctor?.medicalCouncil || '',
      registrationYear: doctor?.registrationYear,
      specialization: doctor?.specialization || 'General Medicine',
      subSpecialization: doctor?.subSpecialization || '',
      qualification: doctor?.qualification || '',
      languagesSpoken: doctor?.languagesSpoken || 'English, Hindi',
      experienceYears: doctor?.experienceYears,
      consultationFee: doctor?.consultationFee || 500,
      followUpFee: doctor?.followUpFee || 300,
      emergencyFee: doctor?.emergencyFee || 1000,
      roomNumber: doctor?.roomNumber || '',
      slotDuration: doctor?.slotDuration || 15,
      availabilitySchedule: doctor?.availabilitySchedule || 'Mon-Sat: 09:00 AM - 01:00 PM, 05:00 PM - 08:30 PM',
      biography: doctor?.biography || '',
      digitalSignature: doctor?.digitalSignature || '',
    },
  });

  const onSubmit = async (data: DoctorInput) => {
    setError(null);
    setIsSubmitting(true);

    const cleanData = {
      name: data.name.trim(),
      phone: data.phone?.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password && data.password.trim() !== '' ? data.password : undefined,
      gender: data.gender && data.gender.trim() !== '' ? data.gender : undefined,
      registrationNumber: data.registrationNumber && data.registrationNumber.trim() !== '' ? data.registrationNumber : undefined,
      medicalCouncil: data.medicalCouncil && data.medicalCouncil.trim() !== '' ? data.medicalCouncil : undefined,
      registrationYear: data.registrationYear && !isNaN(Number(data.registrationYear)) ? Number(data.registrationYear) : undefined,
      specialization: data.specialization.trim(),
      subSpecialization: data.subSpecialization && data.subSpecialization.trim() !== '' ? data.subSpecialization : undefined,
      qualification: data.qualification && data.qualification.trim() !== '' ? data.qualification : undefined,
      languagesSpoken: data.languagesSpoken && data.languagesSpoken.trim() !== '' ? data.languagesSpoken : undefined,
      experienceYears: data.experienceYears && !isNaN(Number(data.experienceYears)) ? Number(data.experienceYears) : undefined,
      consultationFee: data.consultationFee && !isNaN(Number(data.consultationFee)) ? Number(data.consultationFee) : 0,
      followUpFee: data.followUpFee && !isNaN(Number(data.followUpFee)) ? Number(data.followUpFee) : undefined,
      emergencyFee: data.emergencyFee && !isNaN(Number(data.emergencyFee)) ? Number(data.emergencyFee) : undefined,
      roomNumber: data.roomNumber && data.roomNumber.trim() !== '' ? data.roomNumber : undefined,
      slotDuration: data.slotDuration && !isNaN(Number(data.slotDuration)) ? Number(data.slotDuration) : 15,
      availabilitySchedule: data.availabilitySchedule && data.availabilitySchedule.trim() !== '' ? data.availabilitySchedule : undefined,
      biography: data.biography && data.biography.trim() !== '' ? data.biography : undefined,
      digitalSignature: data.digitalSignature && data.digitalSignature.trim() !== '' ? data.digitalSignature : undefined,
    };

    try {
      let savedDoctor: Doctor | undefined;
      if (isEditMode && doctor) {
        const res = await apiClient.put<Doctor>(`/doctors/${doctor.id}`, cleanData);
        savedDoctor = res.data;
      } else {
        const res = await apiClient.post<Doctor>('/doctors', cleanData);
        savedDoctor = res.data;
      }

      // If OPD schedule was updated, record a simple notification for admin
      if (isEditMode && doctor && cleanData.availabilitySchedule && cleanData.availabilitySchedule !== doctor.availabilitySchedule) {
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem('nisschay_admin_schedule_alerts');
            const existing = raw ? JSON.parse(raw) : [];
            const docName = cleanData.name.startsWith('Dr.') ? cleanData.name : `Dr. ${cleanData.name}`;
            const newAlert = {
              id: String(Date.now()),
              doctorName: docName,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            const updated = [newAlert, ...(Array.isArray(existing) ? existing.filter((x: any) => x.id !== newAlert.id) : [])].slice(0, 10);
            localStorage.setItem('nisschay_admin_schedule_alerts', JSON.stringify(updated));
          } catch {}
        }
      }

      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      queryClient.invalidateQueries({ queryKey: ['doctors-list'] });
      queryClient.invalidateQueries({ queryKey: ['doctors-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['staff-users-list'] });
      queryClient.invalidateQueries({ queryKey: ['staff-list'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['staff-roster'] });
      queryClient.invalidateQueries({ queryKey: ['staff-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['staff-monthly-summary'] });
      if (doctor?.id) {
        queryClient.invalidateQueries({ queryKey: ['doctor', doctor.id] });
      }

      if (onSuccess) {
        onSuccess(savedDoctor);
      } else {
        router.push('/doctors');
        router.refresh();
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string; error?: string } }; message?: string };
      const msg = axiosErr?.response?.data?.message || axiosErr?.response?.data?.error || axiosErr?.message || 'Failed to save doctor profile.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onError = (formErrors: Record<string, { message?: string }>) => {
    console.error('Doctor form validation errors:', formErrors);
    const keys = Object.keys(formErrors);
    if (keys.length > 0) {
      const firstKey = keys[0];
      const errObj = formErrors[firstKey];
      setError(`Please check "${firstKey}": ${errObj?.message || 'Invalid input'}`);
    }
  };

  return (
    <div className="w-full font-sans">
      <form onSubmit={handleSubmit(onSubmit, onError)} autoComplete="off" className="bg-white border border-[#E8EEF2] rounded-2xl shadow-2xs overflow-hidden">
        
        {/* Form Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#E8EEF2] bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#087F8C]/10 text-[#087F8C] flex items-center justify-center font-bold shrink-0">
              <Stethoscope className="w-5 h-5 text-[#087F8C]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#172B34] tracking-tight">
                {isEditMode ? `Edit Doctor: ${doctor?.name}` : 'Register New Doctor'}
              </h2>
              <p className="text-xs text-[#567781] mt-0.5">
                Medical council license, OPD tariffs, consulting chamber, and schedule
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1 sm:flex-none min-h-[38px] text-xs font-semibold text-[#567781] hover:text-[#172B34] border-[#E8EEF2] rounded-xl px-4 cursor-pointer"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 sm:flex-none min-h-[38px] bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs px-5 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Register Doctor'}
            </Button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mx-6 mt-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError(null)} className="text-red-500 hover:opacity-80 p-0.5 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="p-6 space-y-6">
          
          {/* SECTION 1: BASIC INFORMATION */}
          <div className="space-y-3.5">
            <div className="text-[11px] font-bold text-[#087F8C] uppercase tracking-wider border-b border-[#E8EEF2] pb-1.5 flex items-center gap-1.5">
              <span>1. Basic Profile & Login Account</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2">
                <Label htmlFor="name" className="text-xs font-bold text-[#172B34] flex items-center gap-1 mb-1.5">
                  <User className="w-3.5 h-3.5 text-[#567781]" />
                  <span>Doctor Full Name *</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g. Dr. Ananya Sharma"
                  className={`h-9.5 text-xs font-medium border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white rounded-xl focus-visible:ring-[#087F8C] text-[#172B34] ${
                    errors.name ? 'border-red-500' : ''
                  }`}
                  {...register('name')}
                />
                {errors.name && <p className="text-red-500 text-[11px] font-medium mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <Label htmlFor="gender" className="text-xs font-bold text-[#172B34] mb-1.5 block">
                  Gender
                </Label>
                <select
                  id="gender"
                  className="h-9.5 w-full text-xs font-medium border border-[#E8EEF2] rounded-xl bg-[#F6F9FB] text-[#172B34] px-3 focus:outline-none focus:border-[#087F8C] focus:bg-white cursor-pointer"
                  {...register('gender')}
                >
                  <option value="">Select Gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <Label htmlFor="phone" className="text-xs font-bold text-[#172B34] flex items-center gap-1 mb-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#567781]" />
                  <span>Mobile Phone *</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  className={`h-9.5 text-xs font-mono font-medium border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white rounded-xl focus-visible:ring-[#087F8C] text-[#172B34] ${
                    errors.phone ? 'border-red-500' : ''
                  }`}
                  {...register('phone')}
                />
                {errors.phone && <p className="text-red-500 text-[11px] font-medium mt-1">{errors.phone.message}</p>}
              </div>

              <div>
                <Label htmlFor="email" className="text-xs font-bold text-[#172B34] flex items-center gap-1 mb-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#567781]" />
                  <span>Portal Email (Login) *</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="off"
                  placeholder="doctor@nisschaycms.com"
                  className={`h-9.5 text-xs font-medium border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white rounded-xl focus-visible:ring-[#087F8C] text-[#172B34] ${
                    errors.email ? 'border-red-500' : ''
                  }`}
                  {...register('email')}
                />
                {errors.email && <p className="text-red-500 text-[11px] font-medium mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <Label htmlFor="password" className="text-xs font-bold text-[#172B34] flex items-center gap-1 mb-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#567781]" />
                  <span>Login Password {!isEditMode && '*'}</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder={isEditMode ? 'Leave blank to keep' : 'Min 6 characters'}
                  className="h-9.5 text-xs font-mono font-medium border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white rounded-xl focus-visible:ring-[#087F8C] text-[#172B34]"
                  {...register('password')}
                />
                {errors.password && <p className="text-red-500 text-[11px] font-medium mt-1">{errors.password.message}</p>}
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="languagesSpoken" className="text-xs font-bold text-[#172B34] flex items-center gap-1 mb-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#567781]" />
                  <span>Languages Spoken</span>
                </Label>
                <Input
                  id="languagesSpoken"
                  placeholder="e.g. English, Hindi, Marathi"
                  className="h-9.5 text-xs font-medium border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white rounded-xl focus-visible:ring-[#087F8C] text-[#172B34]"
                  {...register('languagesSpoken')}
                />
              </div>

              <div>
                <Label htmlFor="experienceYears" className="text-xs font-bold text-[#172B34] flex items-center gap-1 mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#567781]" />
                  <span>Experience (Years)</span>
                </Label>
                <Input
                  id="experienceYears"
                  type="number"
                  placeholder="e.g. 10"
                  className="h-9.5 text-xs font-medium border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white rounded-xl focus-visible:ring-[#087F8C] text-[#172B34]"
                  {...register('experienceYears')}
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: RESIDENTIAL & PERMANENT ADDRESS */}
          <div className="space-y-3.5">
            <div className="text-[11px] font-bold text-[#087F8C] uppercase tracking-wider border-b border-[#E8EEF2] pb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#087F8C]" />
                <span>2. Residential & Permanent Address</span>
              </div>
              <span className="text-[9px] text-[#567781] font-mono font-medium">STATUTORY RECORD</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="sm:col-span-2">
                <Label htmlFor="address" className="text-xs font-bold text-[#172B34] mb-1.5 block">
                  Street Address / House / Flat No.
                </Label>
                <Input
                  id="address"
                  placeholder="e.g. 402 Doctor Enclave, MG Road"
                  className="h-9.5 text-xs font-medium border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white rounded-xl focus-visible:ring-[#087F8C] text-[#172B34]"
                  {...register('biography')}
                />
              </div>

              <div>
                <Label htmlFor="city" className="text-xs font-bold text-[#172B34] mb-1.5 block">
                  City / Town
                </Label>
                <Input
                  id="city"
                  placeholder="e.g. Mumbai / Pune"
                  className="h-9.5 text-xs font-medium border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white rounded-xl focus-visible:ring-[#087F8C] text-[#172B34]"
                />
              </div>

              <div>
                <Label htmlFor="state" className="text-xs font-bold text-[#172B34] mb-1.5 block">
                  State & PIN Code
                </Label>
                <Input
                  id="state"
                  placeholder="e.g. Maharashtra - 400001"
                  className="h-9.5 text-xs font-medium border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white rounded-xl focus-visible:ring-[#087F8C] text-[#172B34]"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: MEDICAL REGISTRATION & QUALIFICATIONS */}
          <div className="space-y-3.5">
            <div className="text-[11px] font-bold text-[#087F8C] uppercase tracking-wider border-b border-[#E8EEF2] pb-1.5 flex items-center justify-between">
              <span>3. Medical Registration & Credentials</span>
              <span className="text-[9px] text-[#567781] font-mono font-medium">NMC ACT 2019</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <Label htmlFor="specialization" className="text-xs font-bold text-[#172B34] flex items-center gap-1 mb-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-[#087F8C]" />
                  <span>Primary Specialization *</span>
                </Label>
                <select
                  id="specialization"
                  className="h-9.5 w-full text-xs font-bold border border-[#E8EEF2] rounded-xl bg-[#F6F9FB] text-[#172B34] px-3 focus:outline-none focus:border-[#087F8C] focus:bg-white cursor-pointer"
                  {...register('specialization')}
                >
                  {SPECIALIZATIONS.map((spec) => (
                    <option key={spec} value={spec}>
                      {spec}
                    </option>
                  ))}
                </select>
                {errors.specialization && <p className="text-red-500 text-[11px] font-medium mt-1">{errors.specialization.message}</p>}
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="subSpecialization" className="text-xs font-bold text-[#172B34] mb-1.5 block">
                  Sub-Specialty / Clinical Focus
                </Label>
                <Input
                  id="subSpecialization"
                  placeholder="e.g. Interventional Cardiology / Arthroscopy"
                  className="h-9.5 text-xs font-medium border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white rounded-xl focus-visible:ring-[#087F8C] text-[#172B34]"
                  {...register('subSpecialization')}
                />
              </div>

              <div>
                <Label htmlFor="registrationNumber" className="text-xs font-bold text-[#172B34] flex items-center gap-1 mb-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#567781]" />
                  <span>Council Registration No.</span>
                </Label>
                <Input
                  id="registrationNumber"
                  placeholder="e.g. MMC-2015-12345"
                  className="h-9.5 text-xs font-mono font-medium border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white rounded-xl focus-visible:ring-[#087F8C] text-[#172B34]"
                  {...register('registrationNumber')}
                />
              </div>

              <div>
                <Label htmlFor="medicalCouncil" className="text-xs font-bold text-[#172B34] mb-1.5 block">
                  State Medical Council
                </Label>
                <Input
                  id="medicalCouncil"
                  placeholder="e.g. Maharashtra Medical Council"
                  className="h-9.5 text-xs font-medium border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white rounded-xl focus-visible:ring-[#087F8C] text-[#172B34]"
                  {...register('medicalCouncil')}
                />
              </div>

              <div>
                <Label htmlFor="registrationYear" className="text-xs font-bold text-[#172B34] mb-1.5 block">
                  Registration Year
                </Label>
                <Input
                  id="registrationYear"
                  type="number"
                  placeholder="e.g. 2015"
                  className="h-9.5 text-xs font-medium border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white rounded-xl focus-visible:ring-[#087F8C] text-[#172B34]"
                  {...register('registrationYear')}
                />
              </div>

              <div className="sm:col-span-3">
                <Label htmlFor="qualification" className="text-xs font-bold text-[#172B34] flex items-center gap-1 mb-1.5">
                  <Award className="w-3.5 h-3.5 text-[#567781]" />
                  <span>Degrees & Qualifications (e.g. MBBS, MD, MS, DM, MCh, DNB)</span>
                </Label>
                <Input
                  id="qualification"
                  placeholder="e.g. MBBS, MD (General Medicine), DM (Cardiology)"
                  className="h-9.5 text-xs font-medium border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white rounded-xl focus-visible:ring-[#087F8C] text-[#172B34]"
                  {...register('qualification')}
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: CONSULTATION FEES & OPD SCHEDULE */}
          <div className="space-y-3.5">
            <div className="text-[11px] font-bold text-[#087F8C] uppercase tracking-wider border-b border-[#E8EEF2] pb-1.5">
              3. Consultation Fees & OPD Chamber Setup
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <Label htmlFor="consultationFee" className="text-xs font-bold text-[#172B34] flex items-center gap-1 mb-1.5">
                  <IndianRupee className="w-3.5 h-3.5 text-[#22A06B]" />
                  <span>OPD Consultation Fee (₹) *</span>
                </Label>
                <Input
                  id="consultationFee"
                  type="number"
                  placeholder="500"
                  className={`h-9.5 text-xs font-mono font-bold border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white rounded-xl focus-visible:ring-[#087F8C] text-[#172B34] ${
                    errors.consultationFee ? 'border-red-500' : ''
                  }`}
                  {...register('consultationFee')}
                />
              </div>

              <div>
                <Label htmlFor="followUpFee" className="text-xs font-bold text-[#172B34] flex items-center gap-1 mb-1.5">
                  <IndianRupee className="w-3.5 h-3.5 text-[#4FA8DB]" />
                  <span>Follow-Up Visit Fee (₹)</span>
                </Label>
                <Input
                  id="followUpFee"
                  type="number"
                  placeholder="300"
                  className="h-9.5 text-xs font-mono font-bold border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white rounded-xl focus-visible:ring-[#087F8C] text-[#172B34]"
                  {...register('followUpFee')}
                />
              </div>

              <div>
                <Label htmlFor="emergencyFee" className="text-xs font-bold text-[#172B34] flex items-center gap-1 mb-1.5">
                  <IndianRupee className="w-3.5 h-3.5 text-[#E9A23B]" />
                  <span>Emergency Fee (₹)</span>
                </Label>
                <Input
                  id="emergencyFee"
                  type="number"
                  placeholder="1000"
                  className="h-9.5 text-xs font-mono font-bold border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white rounded-xl focus-visible:ring-[#087F8C] text-[#172B34]"
                  {...register('emergencyFee')}
                />
              </div>

              <div>
                <Label htmlFor="roomNumber" className="text-xs font-bold text-[#172B34] flex items-center gap-1 mb-1.5">
                  <Building className="w-3.5 h-3.5 text-[#567781]" />
                  <span>OPD Chamber / Room No.</span>
                </Label>
                <Input
                  id="roomNumber"
                  placeholder="e.g. Cabin #104, 1st Floor"
                  className="h-9.5 text-xs font-medium border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white rounded-xl focus-visible:ring-[#087F8C] text-[#172B34]"
                  {...register('roomNumber')}
                />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="slotDuration" className="text-xs font-bold text-[#172B34] flex items-center gap-1 mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#567781]" />
                  <span>Appointment Slot Duration</span>
                </Label>
                <select
                  id="slotDuration"
                  className="h-9.5 w-full text-xs font-medium border border-[#E8EEF2] rounded-xl bg-[#F6F9FB] text-[#172B34] px-3 focus:outline-none focus:border-[#087F8C] focus:bg-white cursor-pointer"
                  {...register('slotDuration')}
                >
                  {SLOT_DURATIONS.map((dur) => (
                    <option key={dur.value} value={dur.value}>
                      {dur.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <Label htmlFor="availabilitySchedule" className="text-xs font-bold text-[#172B34] flex items-center gap-1 mb-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#567781]" />
                  <span>Weekly OPD Timings</span>
                </Label>
                <Input
                  id="availabilitySchedule"
                  placeholder="e.g. Mon-Sat: 09:00 AM - 01:00 PM, 05:00 PM - 08:30 PM"
                  className="h-9.5 text-xs font-medium border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white rounded-xl focus-visible:ring-[#087F8C] text-[#172B34]"
                  {...register('availabilitySchedule')}
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: BIOGRAPHY & DIGITAL STAMP */}
          <div className="space-y-3.5">
            <div className="text-[11px] font-bold text-[#087F8C] uppercase tracking-wider border-b border-[#E8EEF2] pb-1.5">
              4. Clinical Biography & Digital Prescription Header
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="biography" className="text-xs font-bold text-[#172B34] mb-1.5 block">
                  Doctor Summary & Background <span className="text-[#567781] font-normal">(Optional)</span>
                </Label>
                <textarea
                  id="biography"
                  rows={2}
                  placeholder="Brief clinical summary or expertise note..."
                  className="w-full p-2.5 text-xs font-medium border border-[#E8EEF2] rounded-xl bg-[#F6F9FB] text-[#172B34] focus:outline-none focus:border-[#087F8C] focus:bg-white transition-colors"
                  {...register('biography')}
                />
              </div>

              <div>
                <Label htmlFor="digitalSignature" className="text-xs font-bold text-[#172B34] flex items-center gap-1 mb-1.5">
                  <PenTool className="w-3.5 h-3.5 text-[#567781]" />
                  <span>Digital Prescription Signatory Stamp Line <span className="text-[#567781] font-normal">(Optional)</span></span>
                </Label>
                <Input
                  id="digitalSignature"
                  placeholder="e.g. Dr. Ananya Sharma, MD, Reg #MMC-2015-12345"
                  className="h-9.5 text-xs font-medium border-[#E8EEF2] bg-[#F6F9FB] focus:bg-white rounded-xl focus-visible:ring-[#087F8C] text-[#172B34]"
                  {...register('digitalSignature')}
                />
              </div>
            </div>
          </div>

        </div>

        {/* Form Footer */}
        <div className="px-5 sm:px-6 py-4 bg-white border-t border-[#E8EEF2] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel ? onCancel : () => router.push('/doctors')}
            className="min-h-[38px] text-xs font-semibold text-[#567781] hover:text-[#172B34] border-[#E8EEF2] rounded-xl px-4 cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="min-h-[38px] bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs px-6 rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            {isSubmitting ? 'Saving Record...' : isEditMode ? 'Save Changes' : 'Complete Doctor Registration'}
          </Button>
        </div>

      </form>
    </div>
  );
};
