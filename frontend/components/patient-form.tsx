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
      <form onSubmit={handleSubmit(onSubmit, onError)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        
        {/* Form Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              {isEditMode ? 'Edit Patient Profile' : 'New Patient Registration'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
              Enter patient demographics and clinical history. Mobile phone is required as primary identification.
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
              disabled={isSubmitting || !watchPhone}
              className="h-9 bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs px-5 rounded-lg transition-all shadow-2xs border-0 cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Save Patient File'}
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
          
          {/* SECTION 1: DEMOGRAPHICS & CONTACT */}
          <div className="space-y-4">
            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
              1. Demographics & Contact
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Patient Full Name (First Field) */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="name"
                    placeholder="e.g. Ramesh Chandra"
                    className="pl-9 h-10 text-sm font-medium border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-teal-600"
                    {...register('name')}
                  />
                </div>
              </div>

              {/* Mobile Phone Number (Required Unique ID) */}
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
                {errors.phone ? (
                  <p className="text-rose-600 text-[11px] font-medium">{errors.phone.message}</p>
                ) : (
                  <p className="text-[11px] text-slate-400">Primary identifier for patient lookup and SMS</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
              {/* Gender */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
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
                      className={`h-10 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                        watchGender === g.id
                          ? 'bg-slate-900 text-white border-slate-900 dark:bg-teal-600 dark:border-teal-600'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Age */}
              <div className="space-y-1.5">
                <Label htmlFor="age" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Age (Years)
                </Label>
                <Input
                  id="age"
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 45"
                  className="h-10 text-sm font-medium border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-teal-600"
                  value={age}
                  onChange={handleAgeChange}
                />
              </div>

              {/* Date of Birth */}
              <div className="space-y-1.5">
                <Label htmlFor="dateOfBirth" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Date of Birth
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                  <Input
                    id="dateOfBirth"
                    type="date"
                    className="pl-9 h-10 text-sm font-medium border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-teal-600"
                    {...register('dateOfBirth')}
                  />
                </div>
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Email Address <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g. ramesh@example.com"
                  className="pl-9 h-10 text-sm font-medium border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-teal-600"
                  {...register('email')}
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: ADDRESS & IDENTITY */}
          <div className="space-y-4">
            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
              2. Address & Identity
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Street Address <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                <Input
                  id="address"
                  placeholder="e.g. House No. 42, Sector 15"
                  className="pl-9 h-10 text-sm font-medium border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-teal-600"
                  {...register('address')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="city" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  City / Town <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <Input
                  id="city"
                  placeholder="e.g. New Delhi"
                  className="h-10 text-sm font-medium border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-teal-600"
                  {...register('city')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pincode" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Pincode <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <Input
                  id="pincode"
                  placeholder="e.g. 110001"
                  className="h-10 text-sm font-medium border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-teal-600"
                  {...register('pincode')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="governmentId" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Aadhaar / Gov ID <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <div className="relative">
                  <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                  <Input
                    id="governmentId"
                    placeholder="e.g. 1234 5678 9012"
                    className="pl-9 h-10 text-sm font-medium border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-teal-600"
                    {...register('governmentId')}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: CLINICAL BASELINE & HISTORY */}
          <div className="space-y-4">
            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
              3. Clinical Vitals & Medical History
            </div>

            {/* Height, Weight & BMI Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="heightCm" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Height (cm) <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <Input
                  id="heightCm"
                  type="number"
                  placeholder="e.g. 170"
                  className="h-10 text-sm font-medium border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-teal-600"
                  {...register('heightCm')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="weightKg" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Weight (kg) <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <Input
                  id="weightKg"
                  type="number"
                  placeholder="e.g. 70"
                  className="h-10 text-sm font-medium border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-teal-600"
                  {...register('weightKg')}
                />
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Calculated BMI</Label>
                <div className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex items-center text-xs font-medium text-slate-700 dark:text-slate-300">
                  {bmiText ? bmiText : 'Enter Height & Weight'}
                </div>
              </div>
            </div>

            {/* Blood Group */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Blood Group <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5">
                {BLOOD_GROUPS.map((bg) => (
                  <button
                    key={bg}
                    type="button"
                    onClick={() => setValue('bloodGroup', watchBloodGroup === bg ? '' : bg, { shouldValidate: true })}
                    className={`h-9 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      watchBloodGroup === bg
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {bg}
                  </button>
                ))}
              </div>
            </div>

            {/* Current Daily Medications */}
            <div className="space-y-1.5">
              <Label htmlFor="currentMedications" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Current Regular Daily Medications <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <div className="relative">
                <Pill className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                <Input
                  id="currentMedications"
                  placeholder="e.g. Tab Metformin 500mg, Tab Amlodipine 5mg"
                  className="pl-9 h-10 text-sm font-medium border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-teal-600"
                  {...register('currentMedications')}
                />
              </div>
            </div>

            {/* Known Allergies */}
            <div className="space-y-2">
              <Label htmlFor="allergies" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Drug & Food Allergies <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <div className="flex flex-wrap gap-1">
                {ALLERGY_PRESETS.map((preset) => {
                  const isSelected = watchAllergies?.includes(preset);
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => toggleAllergyPreset(preset)}
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-md border transition-all flex items-center gap-1 cursor-pointer ${
                        isSelected
                          ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected ? <Check className="w-3 h-3 text-rose-600" /> : <Plus className="w-3 h-3 text-slate-400" />}
                      <span>{preset}</span>
                    </button>
                  );
                })}
              </div>
              <Input
                id="allergies"
                placeholder="e.g. Penicillin, Peanuts (comma separated)"
                className="h-10 text-sm font-medium border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-teal-600"
                {...register('allergies')}
              />
            </div>

            {/* Chronic Medical History */}
            <div className="space-y-2">
              <Label htmlFor="medicalHistory" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Chronic Medical History <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <div className="flex flex-wrap gap-1">
                {HISTORY_PRESETS.map((preset) => {
                  const isSelected = watchHistory?.includes(preset);
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => toggleHistoryPreset(preset)}
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-md border transition-all flex items-center gap-1 cursor-pointer ${
                        isSelected
                          ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected ? <Check className="w-3 h-3 text-teal-600" /> : <Plus className="w-3 h-3 text-slate-400" />}
                      <span>{preset}</span>
                    </button>
                  );
                })}
              </div>
              <Input
                id="medicalHistory"
                placeholder="e.g. Hypertension for 5 years, Asthma"
                className="h-10 text-sm font-medium border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-teal-600"
                {...register('medicalHistory')}
              />
            </div>
          </div>

          {/* SECTION 4: EMERGENCY & ADMINISTRATIVE */}
          <div className="space-y-4">
            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
              4. Emergency Contact & Insurance
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="emergencyContactName" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Emergency Contact Person <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <Input
                  id="emergencyContactName"
                  placeholder="e.g. Sarita Chandra (Spouse)"
                  className="h-10 text-sm font-medium border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-teal-600"
                  {...register('emergencyContactName')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="emergencyContactPhone" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Emergency Contact Phone <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                  <Input
                    id="emergencyContactPhone"
                    placeholder="e.g. 9876543211"
                    className="pl-9 h-10 text-sm font-medium border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-teal-600"
                    {...register('emergencyContactPhone')}
                  />
                </div>
              </div>
            </div>

            {/* Referral Source */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Referral Source <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {REFERRAL_SOURCES.map((ref) => (
                  <button
                    key={ref}
                    type="button"
                    onClick={() => setValue('referralSource', watchReferral === ref ? '' : ref, { shouldValidate: true })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      watchReferral === ref
                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-teal-600 dark:border-teal-600'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {ref}
                  </button>
                ))}
              </div>
            </div>

            {/* Insurance Provider & Policy */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="insuranceProvider" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Insurance / TPA Provider <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <div className="relative">
                  <FileCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                  <Input
                    id="insuranceProvider"
                    placeholder="e.g. Star Health / ICICI Lombard"
                    className="pl-9 h-10 text-sm font-medium border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-teal-600"
                    {...register('insuranceProvider')}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="insurancePolicyNo" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Policy Card No. <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <Input
                  id="insurancePolicyNo"
                  placeholder="e.g. POL-9842104"
                  className="h-10 text-sm font-medium border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-teal-600"
                  {...register('insurancePolicyNo')}
                />
              </div>
            </div>
          </div>

        </div>

        {/* Form Footer */}
        <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel ? onCancel : () => router.push('/dashboard')}
            className="h-9 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting || !watchPhone}
            className="h-10 bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs px-6 rounded-lg shadow-2xs border-0 cursor-pointer"
          >
            {isSubmitting ? 'Saving Record...' : isEditMode ? 'Save Profile Changes' : 'Complete Patient File'}
          </Button>
        </div>

      </form>
    </div>
  );
};
