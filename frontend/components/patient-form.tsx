'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { patientSchema, PatientInput } from '@/lib/validations';
import { apiClient } from '@/lib/api-client';
import { Patient } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Phone,
  User,
  Mail,
  Calendar,
  MapPin,
  IdCard,
  Heart,
  Pill,
  ShieldAlert,
  FileCheck,
  Check,
  Plus,
  AlertCircle,
  X
} from 'lucide-react';

interface PatientFormProps {
  patient?: Patient;
  onSuccess?: (patient?: Patient) => void;
  onCancel?: () => void;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const REFERRAL_SOURCES = ['Walk-in', 'Doctor Referral', 'Friend / Family', 'Online / Social', 'Hospital Referral'];

const ALLERGY_PRESETS = ['Penicillin', 'Peanuts', 'Dust / Pollen', 'Latex', 'Aspirin', 'Sulfa', 'Seafood'];
const HISTORY_PRESETS = ['Hypertension', 'Type 2 Diabetes', 'Asthma', 'Thyroid', 'Cardiac History', 'Migraine'];

export const PatientForm: React.FC<PatientFormProps> = ({ patient, onSuccess, onCancel }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [age, setAge] = useState<string>('');

  const isEditMode = !!patient;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      phone: patient?.phone || '',
      name: patient?.name || '',
      gender: patient?.gender || '',
      dateOfBirth: patient?.dateOfBirth || '',
      email: patient?.email || '',
      bloodGroup: patient?.bloodGroup || '',
      address: patient?.address || '',
      city: patient?.city || '',
      pincode: patient?.pincode || '',
      governmentId: patient?.governmentId || '',
      heightCm: patient?.heightCm,
      weightKg: patient?.weightKg,
      currentMedications: patient?.currentMedications || '',
      referralSource: patient?.referralSource || '',
      insuranceProvider: patient?.insuranceProvider || '',
      insurancePolicyNo: patient?.insurancePolicyNo || '',
      allergies: patient?.allergies || '',
      medicalHistory: patient?.medicalHistory || '',
      emergencyContactName: patient?.emergencyContactName || '',
      emergencyContactPhone: patient?.emergencyContactPhone || '',
    },
  });

  const watchPhone = watch('phone');
  const watchGender = watch('gender');
  const watchDob = watch('dateOfBirth');
  const watchBloodGroup = watch('bloodGroup');
  const watchHeight = watch('heightCm');
  const watchWeight = watch('weightKg');
  const watchAllergies = watch('allergies');
  const watchHistory = watch('medicalHistory');
  const watchReferral = watch('referralSource');

  // Calculate BMI dynamically
  const bmiText = React.useMemo(() => {
    if (watchHeight && watchWeight && Number(watchHeight) > 0 && Number(watchWeight) > 0) {
      const heightM = Number(watchHeight) / 100;
      const calcBmi = Number(watchWeight) / (heightM * heightM);
      const val = calcBmi.toFixed(1);
      let status = 'Normal';
      if (calcBmi < 18.5) status = 'Underweight';
      else if (calcBmi >= 25 && calcBmi < 29.9) status = 'Overweight';
      else if (calcBmi >= 30) status = 'Obese';
      return `${val} kg/m² (${status})`;
    }
    return null;
  }, [watchHeight, watchWeight]);

  // Compute age from Date of Birth
  useEffect(() => {
    if (watchDob && watchDob.length === 10) {
      try {
        const birthDate = new Date(watchDob);
        const today = new Date();
        let calcAge = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          calcAge--;
        }
        if (calcAge >= 0) setAge(calcAge.toString());
      } catch {
        setAge('');
      }
    }
  }, [watchDob]);

  // Auto-calculate DOB from Age
  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setAge(value);

    const numericAge = parseInt(value, 10);
    if (!numericAge || isNaN(numericAge) || numericAge < 0) return;

    const birthYear = new Date().getFullYear() - numericAge;
    const fallbackDob = `${birthYear}-01-01`;
    setValue('dateOfBirth', fallbackDob, { shouldValidate: true });
  };

  const toggleAllergyPreset = (tag: string) => {
    const current = watchAllergies ? watchAllergies.split(',').map((s) => s.trim()).filter(Boolean) : [];
    if (current.includes(tag)) {
      const updated = current.filter((t) => t !== tag).join(', ');
      setValue('allergies', updated, { shouldValidate: true });
    } else {
      const updated = [...current, tag].join(', ');
      setValue('allergies', updated, { shouldValidate: true });
    }
  };

  const toggleHistoryPreset = (tag: string) => {
    const current = watchHistory ? watchHistory.split(',').map((s) => s.trim()).filter(Boolean) : [];
    if (current.includes(tag)) {
      const updated = current.filter((t) => t !== tag).join(', ');
      setValue('medicalHistory', updated, { shouldValidate: true });
    } else {
      const updated = [...current, tag].join(', ');
      setValue('medicalHistory', updated, { shouldValidate: true });
    }
  };

  const onSubmit = async (data: PatientInput) => {
    setError(null);
    setIsSubmitting(true);

    const cleanData = {
      phone: data.phone?.trim(),
      name: data.name?.trim() || undefined,
      gender: data.gender && data.gender.trim() !== '' ? data.gender : undefined,
      dateOfBirth: data.dateOfBirth && data.dateOfBirth.trim() !== '' ? data.dateOfBirth : undefined,
      email: data.email && data.email.trim() !== '' ? data.email : undefined,
      bloodGroup: data.bloodGroup && data.bloodGroup.trim() !== '' ? data.bloodGroup : undefined,
      address: data.address && data.address.trim() !== '' ? data.address : undefined,
      city: data.city && data.city.trim() !== '' ? data.city : undefined,
      pincode: data.pincode && data.pincode.trim() !== '' ? data.pincode : undefined,
      governmentId: data.governmentId && data.governmentId.trim() !== '' ? data.governmentId : undefined,
      heightCm: data.heightCm && !isNaN(Number(data.heightCm)) ? Number(data.heightCm) : undefined,
      weightKg: data.weightKg && !isNaN(Number(data.weightKg)) ? Number(data.weightKg) : undefined,
      currentMedications: data.currentMedications && data.currentMedications.trim() !== '' ? data.currentMedications : undefined,
      referralSource: data.referralSource && data.referralSource.trim() !== '' ? data.referralSource : undefined,
      insuranceProvider: data.insuranceProvider && data.insuranceProvider.trim() !== '' ? data.insuranceProvider : undefined,
      insurancePolicyNo: data.insurancePolicyNo && data.insurancePolicyNo.trim() !== '' ? data.insurancePolicyNo : undefined,
      allergies: data.allergies && data.allergies.trim() !== '' ? data.allergies : undefined,
      medicalHistory: data.medicalHistory && data.medicalHistory.trim() !== '' ? data.medicalHistory : undefined,
      emergencyContactName: data.emergencyContactName && data.emergencyContactName.trim() !== '' ? data.emergencyContactName : undefined,
      emergencyContactPhone: data.emergencyContactPhone && data.emergencyContactPhone.trim() !== '' ? data.emergencyContactPhone : undefined,
    };

    try {
      let savedPatient: Patient | undefined;
      if (isEditMode && patient) {
        const res = await apiClient.put<Patient>(`/patients/${patient.id}`, cleanData);
        savedPatient = res.data;
      } else {
        const res = await apiClient.post<Patient>('/patients', cleanData);
        savedPatient = res.data;
      }

      queryClient.invalidateQueries({ queryKey: ['patients'] });
      if (savedPatient?.id) {
        queryClient.invalidateQueries({ queryKey: ['patient', savedPatient.id] });
      }

      if (onSuccess) {
        onSuccess(savedPatient);
      } else if (savedPatient?.id) {
        router.push(`/patients/${savedPatient.id}`);
        router.refresh();
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string; error?: string } }; message?: string };
      const msg = axiosErr?.response?.data?.message || axiosErr?.response?.data?.error || axiosErr?.message || 'Failed to save patient record. Please check mobile number.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onError = (formErrors: Record<string, { message?: string }>) => {
    console.error('Patient form validation errors:', formErrors);
    const keys = Object.keys(formErrors);
    if (keys.length > 0) {
      const firstKey = keys[0];
      const errObj = formErrors[firstKey];
      setError(`Please check field "${firstKey}": ${errObj?.message || 'Invalid value'}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit(onSubmit, onError)} className="bg-white border border-[#E8EEF2] rounded-2xl shadow-2xs overflow-hidden">
        
        {/* Form Header */}
        <div className="px-5 sm:px-6 py-4.5 border-b border-[#E8EEF2] bg-[#F6F9FB]/60 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#172B34] tracking-tight">
              {isEditMode ? 'Edit Patient Profile' : 'New Patient Registration'}
            </h2>
            <p className="text-xs text-[#567781] font-normal mt-0.5">
              Enter patient demographics and clinical history. Mobile phone is primary unique identification.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onCancel && (
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                className="h-9 text-xs font-semibold text-[#567781] hover:text-[#172B34] cursor-pointer"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting || !watchPhone}
              className="h-9 bg-[#087F8C] hover:bg-[#076b77] text-white font-semibold text-xs px-5 rounded-xl transition-all shadow-md shadow-[#087F8C]/20 border-0 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Save Patient File'}
            </Button>
          </div>
        </div>

        {/* Form Error Banner */}
        {error && (
          <div className="mx-5 sm:mx-6 mt-5 p-3.5 bg-[#D64545]/10 border border-[#D64545]/20 rounded-xl text-xs text-[#D64545] font-semibold flex items-center justify-between shadow-2xs">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-[#D64545] shrink-0" />
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError(null)} className="text-[#D64545] hover:text-[#D64545]/80 p-0.5 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="p-5 sm:p-6 space-y-6">
          
          {/* SECTION 1: DEMOGRAPHICS & CONTACT */}
          <div className="space-y-4">
            <div className="text-xs font-bold text-[#567781] uppercase tracking-wider border-b border-[#E8EEF2] pb-2 flex items-center gap-2">
              <span className="p-1 rounded-md bg-[#087F8C]/10 text-[#087F8C]">
                <User className="w-3.5 h-3.5" />
              </span>
              <span>1. Demographics & Contact</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Patient Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-bold text-[#172B34]">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#567781] w-4 h-4 pointer-events-none" />
                  <Input
                    id="name"
                    placeholder="e.g. Ramesh Chandra"
                    className="pl-9 h-10 text-xs font-semibold border-[#E8EEF2] bg-[#F6F9FB] rounded-xl focus:border-[#087F8C] text-[#172B34] placeholder-[#567781]"
                    {...register('name')}
                  />
                </div>
              </div>

              {/* Mobile Phone Number */}
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-bold text-[#172B34] flex items-center gap-1">
                  <span>Mobile Phone Number</span>
                  <span className="text-[#D64545] font-bold">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-[#567781] w-4 h-4 pointer-events-none" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="e.g. 9876543210"
                    className={`pl-9 h-10 text-xs font-mono font-bold rounded-xl bg-[#F6F9FB] text-[#172B34] placeholder-[#567781] ${
                      errors.phone ? 'border-[#D64545] focus:border-[#D64545]' : 'border-[#E8EEF2] focus:border-[#087F8C]'
                    }`}
                    {...register('phone')}
                  />
                </div>
                {errors.phone ? (
                  <p className="text-[#D64545] text-[11px] font-semibold">{errors.phone.message}</p>
                ) : (
                  <p className="text-[11px] text-[#567781]">Primary identifier for patient lookup and SMS</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              {/* Gender */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#172B34] block">
                  Gender
                </Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'MALE', label: 'Male' },
                    { id: 'FEMALE', label: 'Female' },
                    { id: 'OTHER', label: 'Other' },
                  ].map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setValue('gender', watchGender === g.id ? '' : g.id, { shouldValidate: true })}
                      className={`h-10 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        watchGender === g.id
                          ? 'bg-[#087F8C] text-white border-[#087F8C] shadow-2xs'
                          : 'bg-[#F6F9FB] border-[#E8EEF2] text-[#567781] hover:text-[#172B34] hover:bg-white'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Age */}
              <div className="space-y-1.5">
                <Label htmlFor="age" className="text-xs font-bold text-[#172B34]">
                  Age (Years)
                </Label>
                <Input
                  id="age"
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 45"
                  className="h-10 text-xs font-bold border-[#E8EEF2] bg-[#F6F9FB] rounded-xl focus:border-[#087F8C] text-[#172B34]"
                  value={age}
                  onChange={handleAgeChange}
                />
              </div>

              {/* Date of Birth */}
              <div className="space-y-1.5">
                <Label htmlFor="dateOfBirth" className="text-xs font-bold text-[#172B34]">
                  Date of Birth
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[#567781] w-4 h-4 pointer-events-none" />
                  <Input
                    id="dateOfBirth"
                    type="date"
                    className="pl-9 h-10 text-xs font-semibold border-[#E8EEF2] bg-[#F6F9FB] rounded-xl focus:border-[#087F8C] text-[#172B34]"
                    {...register('dateOfBirth')}
                  />
                </div>
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="email" className="text-xs font-bold text-[#172B34]">
                Email Address <span className="text-[#567781] font-normal">(Optional)</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#567781] w-4 h-4 pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g. ramesh@example.com"
                  className="pl-9 h-10 text-xs border-[#E8EEF2] bg-[#F6F9FB] rounded-xl focus:border-[#087F8C] text-[#172B34] placeholder-[#567781]"
                  {...register('email')}
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: ADDRESS & IDENTITY */}
          <div className="space-y-4">
            <div className="text-xs font-bold text-[#567781] uppercase tracking-wider border-b border-[#E8EEF2] pb-2 flex items-center gap-2">
              <span className="p-1 rounded-md bg-[#087F8C]/10 text-[#087F8C]">
                <MapPin className="w-3.5 h-3.5" />
              </span>
              <span>2. Address & Identity</span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address" className="text-xs font-bold text-[#172B34]">
                Street Address <span className="text-[#567781] font-normal">(Optional)</span>
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-[#567781] w-4 h-4 pointer-events-none" />
                <Input
                  id="address"
                  placeholder="e.g. House No. 42, Sector 15"
                  className="pl-9 h-10 text-xs border-[#E8EEF2] bg-[#F6F9FB] rounded-xl focus:border-[#087F8C] text-[#172B34] placeholder-[#567781]"
                  {...register('address')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="city" className="text-xs font-bold text-[#172B34]">
                  City / Town <span className="text-[#567781] font-normal">(Optional)</span>
                </Label>
                <Input
                  id="city"
                  placeholder="e.g. New Delhi"
                  className="h-10 text-xs border-[#E8EEF2] bg-[#F6F9FB] rounded-xl focus:border-[#087F8C] text-[#172B34] placeholder-[#567781]"
                  {...register('city')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pincode" className="text-xs font-bold text-[#172B34]">
                  Pincode <span className="text-[#567781] font-normal">(Optional)</span>
                </Label>
                <Input
                  id="pincode"
                  placeholder="e.g. 110001"
                  className="h-10 text-xs font-mono border-[#E8EEF2] bg-[#F6F9FB] rounded-xl focus:border-[#087F8C] text-[#172B34] placeholder-[#567781]"
                  {...register('pincode')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="governmentId" className="text-xs font-bold text-[#172B34]">
                  Aadhaar / Gov ID <span className="text-[#567781] font-normal">(Optional)</span>
                </Label>
                <div className="relative">
                  <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-[#567781] w-4 h-4 pointer-events-none" />
                  <Input
                    id="governmentId"
                    placeholder="e.g. 1234 5678 9012"
                    className="pl-9 h-10 text-xs font-mono border-[#E8EEF2] bg-[#F6F9FB] rounded-xl focus:border-[#087F8C] text-[#172B34] placeholder-[#567781]"
                    {...register('governmentId')}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: CLINICAL BASELINE & HISTORY */}
          <div className="space-y-4">
            <div className="text-xs font-bold text-[#567781] uppercase tracking-wider border-b border-[#E8EEF2] pb-2 flex items-center gap-2">
              <span className="p-1 rounded-md bg-[#087F8C]/10 text-[#087F8C]">
                <Heart className="w-3.5 h-3.5" />
              </span>
              <span>3. Clinical Vitals & Medical History</span>
            </div>

            {/* Height, Weight & BMI Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="heightCm" className="text-xs font-bold text-[#172B34]">
                  Height (cm) <span className="text-[#567781] font-normal">(Optional)</span>
                </Label>
                <Input
                  id="heightCm"
                  type="number"
                  placeholder="e.g. 170"
                  className="h-10 text-xs font-semibold border-[#E8EEF2] bg-[#F6F9FB] rounded-xl focus:border-[#087F8C] text-[#172B34]"
                  {...register('heightCm')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="weightKg" className="text-xs font-bold text-[#172B34]">
                  Weight (kg) <span className="text-[#567781] font-normal">(Optional)</span>
                </Label>
                <Input
                  id="weightKg"
                  type="number"
                  placeholder="e.g. 70"
                  className="h-10 text-xs font-semibold border-[#E8EEF2] bg-[#F6F9FB] rounded-xl focus:border-[#087F8C] text-[#172B34]"
                  {...register('weightKg')}
                />
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <Label className="text-xs font-bold text-[#172B34]">Calculated BMI</Label>
                <div className="h-10 px-3 rounded-xl border border-[#E8EEF2] bg-[#F6F9FB] flex items-center text-xs font-semibold text-[#172B34]">
                  {bmiText ? bmiText : 'Enter Height & Weight'}
                </div>
              </div>
            </div>

            {/* Blood Group */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#172B34] block">
                Blood Group <span className="text-[#567781] font-normal">(Optional)</span>
              </Label>
              <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5">
                {BLOOD_GROUPS.map((bg) => (
                  <button
                    key={bg}
                    type="button"
                    onClick={() => setValue('bloodGroup', watchBloodGroup === bg ? '' : bg, { shouldValidate: true })}
                    className={`h-9 rounded-xl text-xs font-bold font-mono border transition-all cursor-pointer ${
                      watchBloodGroup === bg
                        ? 'bg-[#087F8C] text-white border-[#087F8C] shadow-2xs'
                        : 'bg-[#F6F9FB] border-[#E8EEF2] text-[#567781] hover:text-[#172B34] hover:bg-white'
                    }`}
                  >
                    {bg}
                  </button>
                ))}
              </div>
            </div>

            {/* Current Daily Medications */}
            <div className="space-y-1.5">
              <Label htmlFor="currentMedications" className="text-xs font-bold text-[#172B34]">
                Current Regular Daily Medications <span className="text-[#567781] font-normal">(Optional)</span>
              </Label>
              <div className="relative">
                <Pill className="absolute left-3 top-1/2 -translate-y-1/2 text-[#567781] w-4 h-4 pointer-events-none" />
                <Input
                  id="currentMedications"
                  placeholder="e.g. Tab Metformin 500mg, Tab Amlodipine 5mg"
                  className="pl-9 h-10 text-xs border-[#E8EEF2] bg-[#F6F9FB] rounded-xl focus:border-[#087F8C] text-[#172B34] placeholder-[#567781]"
                  {...register('currentMedications')}
                />
              </div>
            </div>

            {/* Known Allergies */}
            <div className="space-y-2">
              <Label htmlFor="allergies" className="text-xs font-bold text-[#172B34] block">
                Drug & Food Allergies <span className="text-[#567781] font-normal">(Optional)</span>
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {ALLERGY_PRESETS.map((preset) => {
                  const isSelected = watchAllergies?.includes(preset);
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => toggleAllergyPreset(preset)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                        isSelected
                          ? 'bg-[#D64545]/10 text-[#D64545] border-[#D64545]/30'
                          : 'bg-[#F6F9FB] text-[#567781] border-[#E8EEF2] hover:text-[#172B34] hover:bg-white'
                      }`}
                    >
                      {isSelected ? <Check className="w-3 h-3 text-[#D64545]" /> : <Plus className="w-3 h-3 text-[#567781]" />}
                      <span>{preset}</span>
                    </button>
                  );
                })}
              </div>
              <Input
                id="allergies"
                placeholder="e.g. Penicillin, Peanuts (comma separated)"
                className="h-10 text-xs border-[#E8EEF2] bg-[#F6F9FB] rounded-xl focus:border-[#087F8C] text-[#172B34] placeholder-[#567781]"
                {...register('allergies')}
              />
            </div>

            {/* Chronic Medical History */}
            <div className="space-y-2">
              <Label htmlFor="medicalHistory" className="text-xs font-bold text-[#172B34] block">
                Chronic Medical History <span className="text-[#567781] font-normal">(Optional)</span>
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {HISTORY_PRESETS.map((preset) => {
                  const isSelected = watchHistory?.includes(preset);
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => toggleHistoryPreset(preset)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                        isSelected
                          ? 'bg-[#087F8C]/10 text-[#087F8C] border-[#087F8C]/30'
                          : 'bg-[#F6F9FB] text-[#567781] border-[#E8EEF2] hover:text-[#172B34] hover:bg-white'
                      }`}
                    >
                      {isSelected ? <Check className="w-3 h-3 text-[#087F8C]" /> : <Plus className="w-3 h-3 text-[#567781]" />}
                      <span>{preset}</span>
                    </button>
                  );
                })}
              </div>
              <Input
                id="medicalHistory"
                placeholder="e.g. Hypertension for 5 years, Asthma"
                className="h-10 text-xs border-[#E8EEF2] bg-[#F6F9FB] rounded-xl focus:border-[#087F8C] text-[#172B34] placeholder-[#567781]"
                {...register('medicalHistory')}
              />
            </div>
          </div>

          {/* SECTION 4: EMERGENCY & ADMINISTRATIVE */}
          <div className="space-y-4">
            <div className="text-xs font-bold text-[#567781] uppercase tracking-wider border-b border-[#E8EEF2] pb-2 flex items-center gap-2">
              <span className="p-1 rounded-md bg-[#087F8C]/10 text-[#087F8C]">
                <ShieldAlert className="w-3.5 h-3.5" />
              </span>
              <span>4. Emergency Contact & Insurance</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="emergencyContactName" className="text-xs font-bold text-[#172B34]">
                  Emergency Contact Person <span className="text-[#567781] font-normal">(Optional)</span>
                </Label>
                <Input
                  id="emergencyContactName"
                  placeholder="e.g. Sarita Chandra (Spouse)"
                  className="h-10 text-xs border-[#E8EEF2] bg-[#F6F9FB] rounded-xl focus:border-[#087F8C] text-[#172B34] placeholder-[#567781]"
                  {...register('emergencyContactName')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="emergencyContactPhone" className="text-xs font-bold text-[#172B34]">
                  Emergency Contact Phone <span className="text-[#567781] font-normal">(Optional)</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-[#567781] w-4 h-4 pointer-events-none" />
                  <Input
                    id="emergencyContactPhone"
                    placeholder="e.g. 9876543211"
                    className="pl-9 h-10 text-xs font-mono border-[#E8EEF2] bg-[#F6F9FB] rounded-xl focus:border-[#087F8C] text-[#172B34] placeholder-[#567781]"
                    {...register('emergencyContactPhone')}
                  />
                </div>
              </div>
            </div>

            {/* Referral Source */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#172B34] block">
                Referral Source <span className="text-[#567781] font-normal">(Optional)</span>
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {REFERRAL_SOURCES.map((ref) => (
                  <button
                    key={ref}
                    type="button"
                    onClick={() => setValue('referralSource', watchReferral === ref ? '' : ref, { shouldValidate: true })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      watchReferral === ref
                        ? 'bg-[#087F8C] text-white border-[#087F8C] shadow-2xs'
                        : 'bg-[#F6F9FB] border-[#E8EEF2] text-[#567781] hover:text-[#172B34] hover:bg-white'
                    }`}
                  >
                    {ref}
                  </button>
                ))}
              </div>
            </div>

            {/* Insurance Provider & Policy */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="insuranceProvider" className="text-xs font-bold text-[#172B34]">
                  Insurance / TPA Provider <span className="text-[#567781] font-normal">(Optional)</span>
                </Label>
                <div className="relative">
                  <FileCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-[#567781] w-4 h-4 pointer-events-none" />
                  <Input
                    id="insuranceProvider"
                    placeholder="e.g. Star Health / ICICI Lombard"
                    className="pl-9 h-10 text-xs border-[#E8EEF2] bg-[#F6F9FB] rounded-xl focus:border-[#087F8C] text-[#172B34] placeholder-[#567781]"
                    {...register('insuranceProvider')}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="insurancePolicyNo" className="text-xs font-bold text-[#172B34]">
                  Policy Card No. <span className="text-[#567781] font-normal">(Optional)</span>
                </Label>
                <Input
                  id="insurancePolicyNo"
                  placeholder="e.g. POL-9842104"
                  className="h-10 text-xs font-mono border-[#E8EEF2] bg-[#F6F9FB] rounded-xl focus:border-[#087F8C] text-[#172B34] placeholder-[#567781]"
                  {...register('insurancePolicyNo')}
                />
              </div>
            </div>
          </div>

        </div>

        {/* Form Footer */}
        <div className="px-5 sm:px-6 py-4 bg-[#F6F9FB] border-t border-[#E8EEF2] flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel ? onCancel : () => router.push('/patients')}
            className="h-9 text-xs font-semibold text-[#567781] hover:text-[#172B34] cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting || !watchPhone}
            className="h-10 bg-[#087F8C] hover:bg-[#076b77] text-white font-bold text-xs px-6 rounded-xl shadow-md shadow-[#087F8C]/20 border-0 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Saving Record...' : isEditMode ? 'Save Profile Changes' : 'Complete Patient File'}
          </Button>
        </div>

      </form>
    </div>
  );
};
