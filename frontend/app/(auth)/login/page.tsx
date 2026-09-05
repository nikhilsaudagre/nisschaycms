'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginInput } from '@/lib/validations';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  Stethoscope,
  CheckCircle2,
  Check,
  Loader2,
  ShieldCheck
} from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      const loggedInUser = await login(data);
      setIsSuccess(true);
      const doctorGreeting = loggedInUser.name
        ? `Dr. ${loggedInUser.name.replace(/^dr\.?\s*/i, '')}`
        : 'Doctor';
      setSuccessMessage(`Sign in successful! Welcome back, ${doctorGreeting}. Opening ${loggedInUser.clinicName || 'your clinic workspace'}...`);
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } catch (err: unknown) {
      setError(typeof err === 'string' ? err : 'Failed to sign in. Please verify your credentials.');
      setIsSubmitting(false);
      setIsSuccess(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Login Header */}
      <div className="space-y-2 text-center sm:text-left">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#087F8C]/10 text-[#087F8C] border border-[#087F8C]/20 text-xs font-extrabold mb-1">
          <Stethoscope className="w-3.5 h-3.5 text-[#087F8C]" />
          <span>Doctor & Healthcare Staff Portal</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#172B34]">
          Sign In to Practice
        </h1>
        <p className="text-[#567781] font-medium text-xs sm:text-sm">
          Enter your registered practitioner or administrative credentials.
        </p>
      </div>

      {/* Success Alert Card */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-950 font-bold flex items-start space-x-3 shadow-xs animate-fadeIn">
          <div className="w-7 h-7 rounded-full bg-[#22A06B] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Check className="w-4 h-4" />
          </div>
          <div>
            <div className="text-emerald-900 font-extrabold text-sm">Authenticated Successfully!</div>
            <p className="text-emerald-800 text-xs font-medium mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error Alert Card */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 font-semibold flex items-start space-x-3 shadow-2xs animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-bold text-rose-800">Authentication Issue</div>
            <div className="text-rose-700 text-[11.5px] leading-relaxed">{error}</div>
          </div>
        </div>
      )}

      {/* Form Fields */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4.5">
        {/* Email Field */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-[#172B34] text-xs font-extrabold uppercase tracking-wider">
            Email Address *
          </Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#567781] w-4.5 h-4.5 pointer-events-none" />
            <Input
              id="email"
              type="email"
              placeholder="doctor@hospital.com"
              autoComplete="email"
              className={`pl-11 h-11 text-sm bg-[#F6F9FB] focus:bg-white rounded-xl font-medium transition-all text-[#172B34] ${
                errors.email
                  ? 'border-rose-400 focus-visible:ring-rose-400'
                  : 'border-[#E8EEF2] focus-visible:ring-[#087F8C]'
              }`}
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className="text-rose-600 text-xs font-semibold mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              <span>{errors.email.message}</span>
            </p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <Label htmlFor="password" className="text-[#172B34] text-xs font-extrabold uppercase tracking-wider">
              Password *
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs font-bold text-[#087F8C] hover:text-[#076b77] transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#567781] w-4.5 h-4.5 pointer-events-none" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter account password"
              autoComplete="current-password"
              className={`pl-11 pr-11 h-11 text-sm bg-[#F6F9FB] focus:bg-white rounded-xl font-medium transition-all text-[#172B34] ${
                errors.password
                  ? 'border-rose-400 focus-visible:ring-rose-400'
                  : 'border-[#E8EEF2] focus-visible:ring-[#087F8C]'
              }`}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#567781] hover:text-[#172B34] transition-colors focus:outline-none cursor-pointer p-1"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-rose-600 text-xs font-semibold mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              <span>{errors.password.message}</span>
            </p>
          )}
        </div>

        {/* Login CTA Button */}
        <Button
          type="submit"
          className={`w-full h-11 text-white font-extrabold text-sm rounded-xl transition-all duration-200 mt-6 shadow-md active:scale-98 flex items-center justify-center space-x-2 border-0 cursor-pointer ${
            isSuccess
              ? 'bg-[#22A06B] hover:bg-[#1f8f5f] shadow-emerald-600/30'
              : 'bg-[#087F8C] hover:bg-[#076b77] shadow-[#087F8C]/25'
          }`}
          disabled={isSubmitting || isSuccess}
        >
          {isSuccess ? (
            <>
              <Check className="w-5 h-5" />
              <span>Signed In! Opening Workspace...</span>
            </>
          ) : isSubmitting ? (
            <>
              <Loader2 className="w-4.5 h-4.5 animate-spin" />
              <span>Verifying Credentials...</span>
            </>
          ) : (
            <>
              <span>Sign In to Clinic</span>
              <ArrowRight className="w-4.5 h-4.5" />
            </>
          )}
        </Button>
      </form>

      {/* Security & Multi-Tenancy Guarantee */}
      <div className="flex items-center justify-center gap-2 text-[11px] font-semibold text-[#567781] pt-1">
        <ShieldCheck className="w-3.5 h-3.5 text-[#22A06B]" />
        <span>HIPAA / DISHA Compliant Tenant Data Isolation</span>
      </div>

      {/* Registration Footer */}
      <div className="pt-4 border-t border-[#E8EEF2] text-center">
        <p className="text-[#567781] text-xs font-semibold">
          Need to register a new clinic or hospital?{' '}
          <Link
            href="/register-clinic"
            className="text-[#087F8C] hover:text-[#076b77] font-extrabold transition-colors underline underline-offset-2"
          >
            Register Clinic / Hospital
          </Link>
        </p>
      </div>
    </div>
  );
}
