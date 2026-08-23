'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clinicRegisterSchema, ClinicRegisterInput } from '@/lib/validations';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Mail, Phone, MapPin, User, Lock, Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck, Hospital } from 'lucide-react';

export default function RegisterClinicPage() {
  const { registerClinic } = useAuth();
  const [error, setError] = useState<string | null>(null);
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
    setIsSubmitting(true);
    try {
      await registerClinic(data);
    } catch (err: unknown) {
      setError(typeof err === 'string' ? err : 'Failed to register clinic. Please check all fields.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-h-[85vh] overflow-y-auto pr-2 custom-scrollbar">
      {/* Page Title */}
      <div className="space-y-2 text-center sm:text-left">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-100 text-xs font-extrabold mb-1 shadow-2xs">
          <Hospital className="w-3.5 h-3.5 text-sky-600" />
          <span>New Clinic Onboarding</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Register Clinic Practice</h1>
        <p className="text-slate-500 font-medium text-xs sm:text-sm">
          Setup a digital health management account for your clinic.
        </p>
      </div>

      {/* Error Alert Card */}
      {error && (
        <div className="p-4 bg-rose-50/90 border border-rose-200/80 rounded-2xl text-xs text-rose-700 font-semibold flex items-start space-x-3 shadow-2xs animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Section 1: Clinic Information */}
        <div className="bg-slate-50/60 p-4.5 rounded-2xl border border-slate-200/80 space-y-4">
          <h2 className="text-xs font-extrabold text-sky-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/60 pb-2">
            <Building2 className="w-4 h-4 text-sky-600" />
            <span>Clinic Identity & Details</span>
          </h2>

          <div className="space-y-1.5">
            <Label htmlFor="clinicName" className="text-slate-700 text-xs font-extrabold uppercase tracking-wider">
              Clinic Name *
            </Label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
              <Input
                id="clinicName"
                placeholder="e.g. Apollo Clinic Indiranagar"
                className={`pl-11 h-11 text-sm bg-white rounded-xl font-medium transition-all ${
                  errors.clinicName ? 'border-rose-400 focus-visible:ring-rose-400' : 'border-slate-200 focus-visible:ring-sky-500'
                }`}
                {...register('clinicName')}
              />
            </div>
            {errors.clinicName && (
              <p className="text-rose-500 text-xs font-semibold mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>{errors.clinicName.message}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="clinicEmail" className="text-slate-700 text-xs font-extrabold uppercase tracking-wider">
                Clinic Email *
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
                <Input
                  id="clinicEmail"
                  type="email"
                  placeholder="info@apollo.com"
                  className={`pl-11 h-11 text-sm bg-white rounded-xl font-medium transition-all ${
                    errors.clinicEmail ? 'border-rose-400 focus-visible:ring-rose-400' : 'border-slate-200 focus-visible:ring-sky-500'
                  }`}
                  {...register('clinicEmail')}
                />
              </div>
              {errors.clinicEmail && (
                <p className="text-rose-500 text-xs font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.clinicEmail.message}</span>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="clinicPhone" className="text-slate-700 text-xs font-extrabold uppercase tracking-wider">
                Clinic Phone Number *
              </Label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
                <Input
                  id="clinicPhone"
                  placeholder="08025256262"
                  className={`pl-11 h-11 text-sm bg-white rounded-xl font-medium transition-all ${
                    errors.clinicPhone ? 'border-rose-400 focus-visible:ring-rose-400' : 'border-slate-200 focus-visible:ring-sky-500'
                  }`}
                  {...register('clinicPhone')}
                />
              </div>
              {errors.clinicPhone && (
                <p className="text-rose-500 text-xs font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.clinicPhone.message}</span>
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="clinicAddress" className="text-slate-700 text-xs font-extrabold uppercase tracking-wider">
              Clinic Address
            </Label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
              <Input
                id="clinicAddress"
                placeholder="Full address of your clinic facility"
                className="pl-11 h-11 text-sm bg-white border-slate-200 focus-visible:ring-sky-500 rounded-xl font-medium"
                {...register('clinicAddress')}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Owner/Admin Account */}
        <div className="bg-slate-50/60 p-4.5 rounded-2xl border border-slate-200/80 space-y-4">
          <h2 className="text-xs font-extrabold text-sky-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/60 pb-2">
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            <span>Practitioner / Admin Credentials</span>
          </h2>

          <div className="space-y-1.5">
            <Label htmlFor="adminName" className="text-slate-700 text-xs font-extrabold uppercase tracking-wider">
              Doctor/Admin Name *
            </Label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
              <Input
                id="adminName"
                placeholder="Dr. Rajesh Kumar"
                className={`pl-11 h-11 text-sm bg-white rounded-xl font-medium transition-all ${
                  errors.adminName ? 'border-rose-400 focus-visible:ring-rose-400' : 'border-slate-200 focus-visible:ring-sky-500'
                }`}
                {...register('adminName')}
              />
            </div>
            {errors.adminName && (
              <p className="text-rose-500 text-xs font-semibold mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>{errors.adminName.message}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="adminEmail" className="text-slate-700 text-xs font-extrabold uppercase tracking-wider">
                Login Email ID *
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder="dr.rajesh@gmail.com"
                  className={`pl-11 h-11 text-sm bg-white rounded-xl font-medium transition-all ${
                    errors.adminEmail ? 'border-rose-400 focus-visible:ring-rose-400' : 'border-slate-200 focus-visible:ring-sky-500'
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
              <Label htmlFor="adminPhone" className="text-slate-700 text-xs font-extrabold uppercase tracking-wider">
                Mobile Number
              </Label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
                <Input
                  id="adminPhone"
                  placeholder="9876543210"
                  className={`pl-11 h-11 text-sm bg-white rounded-xl font-medium transition-all ${
                    errors.adminPhone ? 'border-rose-400 focus-visible:ring-rose-400' : 'border-slate-200 focus-visible:ring-sky-500'
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
              <Label htmlFor="adminPassword" className="text-slate-700 text-xs font-extrabold uppercase tracking-wider">
                Password *
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
                <Input
                  id="adminPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  className={`pl-11 pr-11 h-11 text-sm bg-white rounded-xl font-medium transition-all ${
                    errors.adminPassword ? 'border-rose-400 focus-visible:ring-rose-400' : 'border-slate-200 focus-visible:ring-sky-500'
                  }`}
                  {...register('adminPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
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
              <Label htmlFor="confirmPassword" className="text-slate-700 text-xs font-extrabold uppercase tracking-wider">
                Confirm Password *
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  className={`pl-11 pr-11 h-11 text-sm bg-white rounded-xl font-medium transition-all ${
                    errors.confirmPassword ? 'border-rose-400 focus-visible:ring-rose-400' : 'border-slate-200 focus-visible:ring-sky-500'
                  }`}
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
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
          className="w-full h-11 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-blue-700 text-white font-extrabold text-sm rounded-xl transition-all duration-200 shadow-md shadow-sky-500/20 active:scale-98 flex items-center justify-center space-x-2"
          disabled={isSubmitting}
        >
          <span>{isSubmitting ? 'Registering Clinic Account...' : 'Complete Clinic Onboarding'}</span>
          {!isSubmitting && <ArrowRight className="w-4 h-4" />}
        </Button>
      </form>

      {/* Back to Login Footer */}
      <div className="pt-4 border-t border-slate-100 text-center">
        <p className="text-slate-500 text-xs font-semibold">
          Already registered?{' '}
          <Link
            href="/login"
            className="text-sky-600 hover:text-sky-800 font-extrabold transition-colors underline underline-offset-2"
          >
            Sign in to existing account
          </Link>
        </p>
      </div>
    </div>
  );
}
