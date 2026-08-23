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
  FileText,
  AlertCircle,
  X,
  CheckCircle2,
  Calendar
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
  'ENT (Otolaryngology)',
  'Ophthalmology',
  'Neurology',
  'Psychiatry',
  'Dental Surgery',
  'Physiotherapy',
];

const SLOT_DURATIONS = [
  { value: 10, label: '10 Minutes' },
  { value: 15, label: '15 Minutes (Default)' },
  { value: 20, label: '20 Minutes' },
  { value: 30, label: '30 Minutes' },
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
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      name: doctor?.name || '',
      phone: doctor?.phone || '',
      email: doctor?.email || '',
      password: '',
      registrationNumber: doctor?.registrationNumber || '',
      specialization: doctor?.specialization || 'General Medicine',
      qualification: doctor?.qualification || '',
      experienceYears: doctor?.experienceYears,
      consultationFee: doctor?.consultationFee || 500,
      followUpFee: doctor?.followUpFee || 300,
      emergencyFee: doctor?.emergencyFee || 1000,
      roomNumber: doctor?.roomNumber || '',
      slotDuration: doctor?.slotDuration || 15,
      availabilitySchedule: doctor?.availabilitySchedule || 'Mon-Sat: 09:00 AM - 01:00 PM, 05:00 PM - 08:30 PM',
      biography: doctor?.biography || '',
    },
  });

  const watchPhone = watch('phone');
  const watchSpecialization = watch('specialization');
  const watchDuration = watch('slotDuration');

  const onSubmit = async (data: DoctorInput) => {
    setError(null);
    setIsSubmitting(true);

    const cleanData = {
      name: data.name.trim(),
      phone: data.phone?.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password && data.password.trim() !== '' ? data.password : undefined,
      registrationNumber: data.registrationNumber && data.registrationNumber.trim() !== '' ? data.registrationNumber : undefined,
      specialization: data.specialization.trim(),
      qualification: data.qualification && data.qualification.trim() !== '' ? data.qualification : undefined,
      experienceYears: data.experienceYears && !isNaN(Number(data.experienceYears)) ? Number(data.experienceYears) : undefined,
      consultationFee: data.consultationFee && !isNaN(Number(data.consultationFee)) ? Number(data.consultationFee) : 0,
      followUpFee: data.followUpFee && !isNaN(Number(data.followUpFee)) ? Number(data.followUpFee) : undefined,
      emergencyFee: data.emergencyFee && !isNaN(Number(data.emergencyFee)) ? Number(data.emergencyFee) : undefined,
      roomNumber: data.roomNumber && data.roomNumber.trim() !== '' ? data.roomNumber : undefined,
      slotDuration: data.slotDuration && !isNaN(Number(data.slotDuration)) ? Number(data.slotDuration) : 15,
      availabilitySchedule: data.availabilitySchedule && data.availabilitySchedule.trim() !== '' ? data.availabilitySchedule : undefined,
      biography: data.biography && data.biography.trim() !== '' ? data.biography : undefined,
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

      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      queryClient.invalidateQueries({ queryKey: ['doctors-list'] });

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
      setError(`Please check field "${firstKey}": ${errObj?.message || 'Invalid value'}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit(onSubmit, onError)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        
        {/* Form Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              {isEditMode ? 'Edit Doctor Profile' : 'Register New Doctor'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
              Enter doctor credentials, medical license, consultation fees, and OPD schedule.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onCancel && (
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                className="h-9 text-xs font-medium text-slate-600 dark:text-slate-400"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-9 bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs px-5 rounded-lg transition-all shadow-2xs border-0 cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Register Doctor'}
            </Button>
          </div>
        </div>

        {/* Form Error Banner */}
        {error && (
          <div className="mx-6 mt-6 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-medium flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600 p-0.5">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="p-6 space-y-8">
          
          {/* SECTION 1: DEMOGRAPHICS & BASIC INFORMATION */}
          <div className="space-y-4">
            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
              1. Demographics & Basic Information
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Doctor Full Name (Required) */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <span>Doctor Full Name</span>
                  <span className="text-rose-500 font-bold">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="name"
                    placeholder="e.g. Dr. Ananya Sharma"
                    className={`pl-9 h-10 text-sm font-medium border-slate-200 dark:border-slate-700 rounded-lg ${
                      errors.name ? 'border-rose-500 focus-visible:ring-rose-500' : 'focus-visible:ring-teal-600'
                    }`}
                    {...register('name')}
                  />
                </div>
                {errors.name && <p className="text-rose-600 text-[11px] font-medium">{errors.name.message}</p>}
              </div>

              {/* Mobile Phone Number (Required) */}
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <span>Mobile Phone Number</span>
                  <span className="text-rose-500 font-bold">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="e.g. 9876543210"
                    className={`pl-9 h-10 text-sm font-medium border-slate-200 dark:border-slate-700 rounded-lg ${
                      errors.phone ? 'border-rose-500 focus-visible:ring-rose-500' : 'focus-visible:ring-teal-600'
                    }`}
                    {...register('phone')}
                  />
                </div>
                {errors.phone && <p className="text-rose-600 text-[11px] font-medium">{errors.phone.message}</p>}
              </div>

              {/* Email Address (Required) */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <span>Email Address (Account Login)</span>
                  <span className="text-rose-500 font-bold">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="e.g. dr.ananya@clinic.com"
                    className={`pl-9 h-10 text-sm font-medium border-slate-200 dark:border-slate-700 rounded-lg ${
                      errors.email ? 'border-rose-500 focus-visible:ring-rose-500' : 'focus-visible:ring-teal-600'
                    }`}
                    {...register('email')}
                  />
                </div>
                {errors.email && <p className="text-rose-600 text-[11px] font-medium">{errors.email.message}</p>}
              </div>

              {/* Login Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <span>Login Password</span>
                  {!isEditMode && <span className="text-rose-500 font-bold">*</span>}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="password"
                    type="password"
                    placeholder={isEditMode ? 'Leave blank to keep current' : 'Min 6 characters'}
                    className="pl-9 h-10 text-sm font-medium border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-teal-600"
                    {...register('password')}
                  />
                </div>
                {errors.password && <p className="text-rose-600 text-[11px] font-medium">{errors.password.message}</p>}
              </div>
            </div>
          </div>

          {/* SECTION 2: MEDICAL REGISTRATION & QUALIFICATIONS */}
          <div className="space-y-4">
            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
              2. Medical Registration & Qualifications
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Medical Council Registration Number */}
              <div className="space-y-1.5">
                <Label htmlFor="registrationNumber" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Medical Council Reg. No. <span className="text-slate-400 font-normal">(License No.)</span>
                </Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="registrationNumber"
                    placeholder="e.g. MCI-12345 / DMC-6789"
                    className="pl-9 h-10 text-sm font-medium border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-teal-600"
                    {...register('registrationNumber')}
                  />
                </div>
              </div>

              {/* Specialization (Required) */}
              <div className="space-y-1.5">
                <Label htmlFor="specialization" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <span>Medical Specialization</span>
                  <span className="text-rose-500 font-bold">*</span>
                </Label>
                <div className="relative">
                  <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none z-10" />
                  <select
                    id="specialization"
                    className="pl-9 h-10 w-full text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                    {...register('specialization')}
                  >
                    {SPECIALIZATIONS.map((spec) => (
                      <option key={spec} value={spec}>
                        {spec}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.specialization && <p className="text-rose-600 text-[11px] font-medium">{errors.specialization.message}</p>}
              </div>

              {/* Qualification / Degrees */}
              <div className="space-y-1.5">
                <Label htmlFor="qualification" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Qualifications & Degrees <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <div className="relative">
                  <Award className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="qualification"
                    placeholder="e.g. MBBS, MD (Medicine), DNB"
                    className="pl-9 h-10 text-sm font-medium border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-teal-600"
                    {...register('qualification')}
                  />
                </div>
              </div>

              {/* Experience Years */}
              <div className="space-y-1.5">
                <Label htmlFor="experienceYears" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Years of Experience <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <Input
                  id="experienceYears"
                  type="number"
                  placeholder="e.g. 12"
                  className="h-10 text-sm font-medium border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-teal-600"
                  {...register('experienceYears')}
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: CONSULTATION FEES & OPERATIONAL SCHEDULE */}
          <div className="space-y-4">
            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
              3. Consultation Fees & Operational Schedule
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Standard Consultation Fee (Required) */}
              <div className="space-y-1.5">
                <Label htmlFor="consultationFee" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <span>Consultation Fee (₹)</span>
                  <span className="text-rose-500 font-bold">*</span>
                </Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="consultationFee"
                    type="number"
                    placeholder="e.g. 500"
                    className={`pl-9 h-10 text-sm font-medium border-slate-200 dark:border-slate-700 rounded-lg ${
                      errors.consultationFee ? 'border-rose-500 focus-visible:ring-rose-500' : 'focus-visible:ring-teal-600'
                    }`}
                    {...register('consultationFee')}
                  />
                </div>
              </div>

              {/* Follow-up Fee */}
              <div className="space-y-1.5">
                <Label htmlFor="followUpFee" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Follow-Up Visit Fee (₹) <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="followUpFee"
                    type="number"
                    placeholder="e.g. 300"
                    className="pl-9 h-10 text-sm font-medium border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-teal-600"
                    {...register('followUpFee')}
                  />
                </div>
              </div>

              {/* Emergency Fee */}
              <div className="space-y-1.5">
                <Label htmlFor="emergencyFee" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Emergency Fee (₹) <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="emergencyFee"
                    type="number"
                    placeholder="e.g. 1000"
                    className="pl-9 h-10 text-sm font-medium border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-teal-600"
                    {...register('emergencyFee')}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
              {/* Room / OPD Chamber Number */}
              <div className="space-y-1.5">
                <Label htmlFor="roomNumber" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  OPD Chamber / Room No. <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="roomNumber"
                    placeholder="e.g. Chamber 104, 1st Floor"
                    className="pl-9 h-10 text-sm font-medium border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-teal-600"
                    {...register('roomNumber')}
                  />
                </div>
              </div>

              {/* Slot Duration */}
              <div className="space-y-1.5">
                <Label htmlFor="slotDuration" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Consultation Slot Duration
                </Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none z-10" />
                  <select
                    id="slotDuration"
                    className="pl-9 h-10 w-full text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                    {...register('slotDuration')}
                  >
                    {SLOT_DURATIONS.map((dur) => (
                      <option key={dur.value} value={dur.value}>
                        {dur.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Availability Working Hours Schedule */}
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="availabilitySchedule" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Working Days & OPD Schedule
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                <Input
                  id="availabilitySchedule"
                  placeholder="e.g. Mon-Sat: 09:00 AM - 01:00 PM, 05:00 PM - 08:30 PM"
                  className="pl-9 h-10 text-sm font-medium border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-teal-600"
                  {...register('availabilitySchedule')}
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: CLINICAL PROFILE (DOCTOR BIOGRAPHY) */}
          <div className="space-y-4">
            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
              4. Clinical Profile
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="biography" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Doctor Profile Biography / Introduction <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <textarea
                id="biography"
                rows={3}
                placeholder="Brief introduction of doctor's background, clinical achievements, and patient care philosophy..."
                className="w-full p-3 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                {...register('biography')}
              />
            </div>
          </div>

        </div>

        {/* Form Footer */}
        <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel ? onCancel : () => router.push('/doctors')}
            className="h-9 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-10 bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs px-6 rounded-lg shadow-2xs border-0 cursor-pointer"
          >
            {isSubmitting ? 'Saving Doctor Record...' : isEditMode ? 'Save Profile Changes' : 'Complete Doctor Registration'}
          </Button>
        </div>

      </form>
    </div>
  );
};
