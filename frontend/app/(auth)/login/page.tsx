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
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, Stethoscope, CheckCircle2, Check } from 'lucide-react';

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
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      const loggedInUser = await login(data);
      setIsSuccess(true);
      setSuccessMessage(`Sign in successful! Welcome back, ${loggedInUser.name || 'Doctor'}. Opening your workspace...`);
      setTimeout(() => {
        router.push('/dashboard');
      }, 900);
    } catch (err: unknown) {
      setError(typeof err === 'string' ? err : 'Failed to login. Please check your credentials.');
      setIsSubmitting(false);
      setIsSuccess(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Login Header */}
      <div className="space-y-2 text-center sm:text-left">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-50 text-teal-700 border border-sky-100 text-xs font-bold mb-1">
          <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
          <span>Doctor & Staff Portal</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Sign In</h1>
        <p className="text-slate-500 font-normal text-xs sm:text-sm">
          Enter your login credentials to access your clinic.
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
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-start space-x-3 shadow-2xs animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Fields */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-slate-700 text-xs font-extrabold uppercase tracking-wider">
            Email Address
          </Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
            <Input
              id="email"
              type="email"
              placeholder="doctor@gmail.com"
              className={`pl-11 h-11 text-sm bg-slate-50/50 focus:bg-white rounded-xl font-medium transition-all ${
                errors.email ? 'border-rose-400 focus-visible:ring-rose-400' : 'border-slate-200 focus-visible:ring-teal-600'
              }`}
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className="text-rose-500 text-xs font-semibold mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              <span>{errors.email.message}</span>
            </p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <Label htmlFor="password" className="text-slate-700 text-xs font-extrabold uppercase tracking-wider">
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs font-bold text-teal-600 hover:text-teal-800 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              className={`pl-11 pr-11 h-11 text-sm bg-slate-50/50 focus:bg-white rounded-xl font-medium transition-all ${
                errors.password ? 'border-rose-400 focus-visible:ring-rose-400' : 'border-slate-200 focus-visible:ring-teal-600'
              }`}
              {...register('password')}
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
          {errors.password && (
            <p className="text-rose-500 text-xs font-semibold mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              <span>{errors.password.message}</span>
            </p>
          )}
        </div>

        {/* Login CTA Button */}
        <Button
          type="submit"
          className={`w-full h-11 text-white font-extrabold text-sm rounded-xl transition-all duration-200 mt-6 shadow-md active:scale-98 flex items-center justify-center space-x-2 border-0 cursor-pointer ${
            isSuccess ? 'bg-teal-600 shadow-teal-600/30' : 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/25'
          }`}
          disabled={isSubmitting}
        >
          {isSuccess ? (
            <>
              <Check className="w-4.5 h-4.5" />
              <span>Signed In! Opening Dashboard...</span>
            </>
          ) : isSubmitting ? (
            <span>Signing In...</span>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </form>

      {/* Registration Footer */}
      <div className="pt-4 border-t border-slate-100 text-center">
        <p className="text-slate-500 text-xs font-semibold">
          New clinic practice?{' '}
          <Link
            href="/register-clinic"
            className="text-teal-600 hover:text-teal-800 font-extrabold transition-colors underline underline-offset-2"
          >
            Register Clinic
          </Link>
        </p>
      </div>
    </div>
  );
}
