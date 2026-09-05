'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clinicRegisterSchema, ClinicRegisterInput } from '@/lib/validations';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Mail, Phone, MapPin, User, Lock, Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck, Hospital, CheckCircle2, Check } from 'lucide-react';

export default function RegisterClinicPage() {
  const { registerClinic } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClinicRegisterInput>({
    resolver: zodResolver(clinicRegisterSchema),
  });

  const onSubmit = async (data: ClinicRegisterInput) => {
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      const user = await registerClinic(data);
      setIsSuccess(true);
      setSuccessMessage(`Clinic registered successfully! Welcome, Dr. ${user.name || 'Doctor'}. Setting up your workspace...`);
      setTimeout(() => {
        router.push('/dashboard');
      }, 1100);
    } catch (err: unknown) {
      setError(typeof err === 'string' ? err : 'Failed to register clinic. Please check all fields.');
      setIsSubmitting(false);
      setIsSuccess(false);
    }
  };

  return (
    <div className="space-y-6 max-h-[85vh] overflow-y-auto pr-1 custom-scrollbar">
      {/* Page Title */}
      <div className="space-y-1.5 text-center sm:text-left">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-50 text-teal-700 border border-sky-100 text-xs font-bold mb-1">
          <Hospital className="w-3.5 h-3.5 text-teal-600" />
          <span>Clinic Onboarding</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Register Clinic</h1>
        <p className="text-slate-500 font-normal text-xs sm:text-sm">
          Set up your clinic account and practitioner login details.
        </p>
      </div>

      {/* Success Alert Card */}
      {successMessage && (
        <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl text-xs text-teal-800 font-bold flex items-start space-x-3 shadow-xs animate-fadeIn">
          <CheckCircle2 className="w-4.5 h-4.5 text-teal-600 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Alert Card */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-start space-x-3 shadow-2xs animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Section 1: Facility Type & Hospital Information */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8EEF2] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-3">
            <h2 className="text-xs font-black text-[#172B34] uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#087F8C]" />
              <span>1. Hospital & Facility Profile</span>
            </h2>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#087F8C]/10 text-[#087F8C]">
              Step 1 of 2
            </span>
          </div>

          {/* Facility Type Selector */}
          <div className="space-y-2">
            <Label className="text-[#172B34] text-xs font-bold uppercase tracking-wider">
              Facility Type *
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                { id: 'HOSPITAL', label: 'Multi-Specialty Hospital', desc: 'OPD + IPD + OT + Beds', icon: Hospital },
                { id: 'POLYCLINIC', label: 'Polyclinic & Day Care', desc: 'Multi-Doctor + Minor Care', icon: Building2 },
                { id: 'CLINIC', label: 'Single Doctor Clinic', desc: 'OPD Consultations', icon: User },
              ].map((item) => (
                <label
                  key={item.id}
                  className={`relative flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                    register('facilityType')
                      ? 'border-[#087F8C] bg-[#087F8C]/5 shadow-xs'
                      : 'border-[#E8EEF2] bg-[#F6F9FB] hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    value={item.id}
                    defaultChecked={item.id === 'HOSPITAL'}
                    {...register('facilityType')}
                    className="sr-only"
                  />
                  <div className="flex items-center space-x-2">
                    <item.icon className="w-4 h-4 text-[#087F8C]" />
                    <span className="text-xs font-extrabold text-[#172B34]">{item.label}</span>
                  </div>
                  <span className="text-[11px] text-[#567781] font-medium mt-1">{item.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Facility Name & Contact */}
          <div className="space-y-1.5">
            <Label htmlFor="clinicName" className="text-[#172B34] text-xs font-bold uppercase tracking-wider">
              Hospital / Clinic Name *
            </Label>
            <div className="relative">
              <Hospital className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
              <Input
                id="clinicName"
                placeholder="e.g. LifeCare Multi-Specialty Hospital & Research Centre"
                className={`pl-11 h-11 text-sm bg-white rounded-xl font-medium transition-all ${
                  errors.clinicName ? 'border-rose-400 focus-visible:ring-rose-400' : 'border-[#E8EEF2] focus-visible:ring-[#087F8C]'
                }`}
                {...register('clinicName')}
              />
            </div>
            {errors.clinicName && (
              <p className="text-rose-500 text-xs font-medium mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>{errors.clinicName.message}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="clinicEmail" className="text-[#172B34] text-xs font-bold uppercase tracking-wider">
                Official Email ID *
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
                <Input
                  id="clinicEmail"
                  type="email"
                  placeholder="contact@hospital.com"
                  className={`pl-11 h-11 text-sm bg-white rounded-xl font-medium transition-all ${
                    errors.clinicEmail ? 'border-rose-400 focus-visible:ring-rose-400' : 'border-[#E8EEF2] focus-visible:ring-[#087F8C]'
                  }`}
                  {...register('clinicEmail')}
                />
              </div>
              {errors.clinicEmail && (
                <p className="text-rose-500 text-xs font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.clinicEmail.message}</span>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="clinicPhone" className="text-[#172B34] text-xs font-bold uppercase tracking-wider">
                Hospital Reception Phone *
              </Label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
                <Input
                  id="clinicPhone"
                  placeholder="08025256262"
                  className={`pl-11 h-11 text-sm bg-white rounded-xl font-medium transition-all ${
                    errors.clinicPhone ? 'border-rose-400 focus-visible:ring-rose-400' : 'border-[#E8EEF2] focus-visible:ring-[#087F8C]'
                  }`}
                  {...register('clinicPhone')}
                />
              </div>
              {errors.clinicPhone && (
                <p className="text-rose-500 text-xs font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.clinicPhone.message}</span>
                </p>
              )}
            </div>
          </div>

          {/* Hospital Infrastructure Scale */}
          <div className="p-3.5 bg-[#F6F9FB] rounded-xl border border-[#E8EEF2] space-y-3">
            <div className="text-[11px] font-bold text-[#172B34] uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#087F8C]" />
              <span>Hospital Capacity & Infrastructure</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="totalBeds" className="text-[11px] font-bold text-[#567781]">
                  Total Beds
                </Label>
                <Input
                  id="totalBeds"
                  type="number"
                  defaultValue={50}
                  placeholder="50"
                  className="h-9 text-xs bg-white border-[#E8EEF2] rounded-lg mt-1 font-bold text-[#172B34]"
                  {...register('totalBeds')}
                />
              </div>
              <div>
                <Label htmlFor="totalIcuBeds" className="text-[11px] font-bold text-[#567781]">
                  ICU / CCU Beds
                </Label>
                <Input
                  id="totalIcuBeds"
                  type="number"
                  defaultValue={10}
                  placeholder="10"
                  className="h-9 text-xs bg-white border-[#E8EEF2] rounded-lg mt-1 font-bold text-[#172B34]"
                  {...register('totalIcuBeds')}
                />
              </div>
              <div>
                <Label htmlFor="totalOtRooms" className="text-[11px] font-bold text-[#567781]">
                  OT Rooms
                </Label>
                <Input
                  id="totalOtRooms"
                  type="number"
                  defaultValue={2}
                  placeholder="2"
                  className="h-9 text-xs bg-white border-[#E8EEF2] rounded-lg mt-1 font-bold text-[#172B34]"
                  {...register('totalOtRooms')}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="clinicAddress" className="text-[#172B34] text-xs font-bold uppercase tracking-wider">
              Hospital Address & Location
            </Label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
              <Input
                id="clinicAddress"
                placeholder="Hospital building, Road / Area, City, State, Pincode"
                className="pl-11 h-11 text-sm bg-white border-[#E8EEF2] focus-visible:ring-[#087F8C] rounded-xl font-medium"
                {...register('clinicAddress')}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Owner/Doctor Account */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8EEF2] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-3">
            <h2 className="text-xs font-black text-[#172B34] uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#087F8C]" />
              <span>2. Medical Director / Doctor Admin Login</span>
            </h2>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#087F8C]/10 text-[#087F8C]">
              Step 2 of 2
            </span>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adminName" className="text-[#172B34] text-xs font-bold uppercase tracking-wider">
              Doctor / Admin Full Name *
            </Label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
              <Input
                id="adminName"
                placeholder="Dr. Rajesh Kumar (MD, MS)"
                className={`pl-11 h-11 text-sm bg-white rounded-xl font-medium transition-all ${
                  errors.adminName ? 'border-rose-400 focus-visible:ring-rose-400' : 'border-[#E8EEF2] focus-visible:ring-[#087F8C]'
                }`}
                {...register('adminName')}
              />
            </div>
            {errors.adminName && (
              <p className="text-rose-500 text-xs font-medium mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>{errors.adminName.message}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="adminEmail" className="text-[#172B34] text-xs font-bold uppercase tracking-wider">
                Login Email ID *
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder="doctor@hospital.com"
                  className={`pl-11 h-11 text-sm bg-white rounded-xl font-medium transition-all ${
                    errors.adminEmail ? 'border-rose-400 focus-visible:ring-rose-400' : 'border-[#E8EEF2] focus-visible:ring-[#087F8C]'
                  }`}
                  {...register('adminEmail')}
                />
              </div>
              {errors.adminEmail && (
                <p className="text-rose-500 text-xs font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.adminEmail.message}</span>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adminPhone" className="text-[#172B34] text-xs font-bold uppercase tracking-wider">
                Personal Mobile Number
              </Label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
                <Input
                  id="adminPhone"
                  placeholder="9876543210"
                  className={`pl-11 h-11 text-sm bg-white rounded-xl font-medium transition-all ${
                    errors.adminPhone ? 'border-rose-400 focus-visible:ring-rose-400' : 'border-[#E8EEF2] focus-visible:ring-[#087F8C]'
                  }`}
                  {...register('adminPhone')}
                />
              </div>
              {errors.adminPhone && (
                <p className="text-rose-500 text-xs font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.adminPhone.message}</span>
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="adminPassword" className="text-[#172B34] text-xs font-bold uppercase tracking-wider">
                Password *
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
                <Input
                  id="adminPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  className={`pl-11 pr-11 h-11 text-sm bg-white rounded-xl font-medium transition-all ${
                    errors.adminPassword ? 'border-rose-400 focus-visible:ring-rose-400' : 'border-[#E8EEF2] focus-visible:ring-[#087F8C]'
                  }`}
                  {...register('adminPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
              {errors.adminPassword && (
                <p className="text-rose-500 text-xs font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.adminPassword.message}</span>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-[#172B34] text-xs font-bold uppercase tracking-wider">
                Confirm Password *
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  className={`pl-11 pr-11 h-11 text-sm bg-white rounded-xl font-medium transition-all ${
                    errors.confirmPassword ? 'border-rose-400 focus-visible:ring-rose-400' : 'border-[#E8EEF2] focus-visible:ring-[#087F8C]'
                  }`}
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-rose-500 text-xs font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.confirmPassword.message}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Submit CTA Button */}
        <Button
          type="submit"
          className={`w-full h-11 text-white font-extrabold text-sm rounded-xl transition-all duration-200 shadow-md active:scale-98 flex items-center justify-center space-x-2 border-0 cursor-pointer ${
            isSuccess ? 'bg-[#22A06B] shadow-[#22A06B]/30' : 'bg-[#087F8C] hover:bg-[#076b77] shadow-[#087F8C]/25'
          }`}
          disabled={isSubmitting}
        >
          {isSuccess ? (
            <>
              <Check className="w-4.5 h-4.5" />
              <span>Hospital Registered! Launching System...</span>
            </>
          ) : isSubmitting ? (
            <span>Registering Hospital Infrastructure...</span>
          ) : (
            <>
              <span>Complete Hospital Registration</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </form>

      {/* Back to Login Footer */}
      <div className="pt-4 border-t border-[#E8EEF2] text-center">
        <p className="text-[#567781] text-xs font-semibold">
          Already registered?{' '}
          <Link
            href="/login"
            className="text-[#087F8C] hover:text-[#076b77] font-extrabold transition-colors underline underline-offset-2"
          >
            Sign In to Portal
          </Link>
        </p>
      </div>
    </div>
  );
}
