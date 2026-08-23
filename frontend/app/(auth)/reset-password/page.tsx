'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, ResetPasswordInput } from '@/lib/validations';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await resetPassword(data);
      setSuccess(true);
    } catch (err: unknown) {
      setError(typeof err === 'string' ? err : 'Failed to reset password. Please verify the OTP code.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2 text-center sm:text-left">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-100 text-xs font-extrabold mb-1 shadow-2xs">
          <KeyRound className="w-3.5 h-3.5 text-sky-600" />
          <span>Credential Reset</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Reset Password</h1>
        <p className="text-slate-500 font-medium text-xs sm:text-sm">
          Enter your 6-digit OTP code and choose your new password.
        </p>
      </div>

      {/* Error Alert Card */}
      {error && (
        <div className="p-4 bg-rose-50/90 border border-rose-200/80 rounded-2xl text-xs text-rose-700 font-semibold flex items-start space-x-3 shadow-2xs animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Card */}
      {success ? (
        <div className="p-6 bg-emerald-50/90 border border-emerald-200/80 rounded-2xl space-y-4 shadow-2xs text-center">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-2xs">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-emerald-900">Password Reset Successful</h3>
            <p className="text-xs text-emerald-700 font-medium">
              Your password has been updated. You can now log in with your new credentials.
            </p>
          </div>
          <Link
            href="/login"
            className="w-full h-11 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-sm rounded-xl shadow-xs flex items-center justify-center space-x-2 transition-all"
          >
            <span>Proceed to Login</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="token" className="text-slate-700 text-xs font-extrabold uppercase tracking-wider">
              6-Digit Verification OTP Code *
            </Label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
              <Input
                id="token"
                placeholder="e.g. 123456"
                className={`pl-11 h-11 text-sm bg-slate-50/50 focus:bg-white rounded-xl font-mono tracking-widest text-center ${
                  errors.token ? 'border-rose-400 focus-visible:ring-rose-400' : 'border-slate-200 focus-visible:ring-sky-500'
                }`}
                maxLength={6}
                {...register('token')}
              />
            </div>
            {errors.token && (
              <p className="text-rose-500 text-xs font-semibold mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>{errors.token.message}</span>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="newPassword" className="text-slate-700 text-xs font-extrabold uppercase tracking-wider">
              New Password *
            </Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
              <Input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min 6 characters"
                className={`pl-11 pr-11 h-11 text-sm bg-slate-50/50 focus:bg-white rounded-xl font-medium transition-all ${
                  errors.newPassword ? 'border-rose-400 focus-visible:ring-rose-400' : 'border-slate-200 focus-visible:ring-sky-500'
                }`}
                {...register('newPassword')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-rose-500 text-xs font-semibold mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>{errors.newPassword.message}</span>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-slate-700 text-xs font-extrabold uppercase tracking-wider">
              Confirm New Password *
            </Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Re-enter new password"
                className={`pl-11 pr-11 h-11 text-sm bg-slate-50/50 focus:bg-white rounded-xl font-medium transition-all ${
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

          <Button
            type="submit"
            className="w-full h-11 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-blue-700 text-white font-extrabold text-sm rounded-xl transition-all duration-200 mt-6 shadow-md shadow-sky-500/20 active:scale-98 flex items-center justify-center space-x-2"
            disabled={isSubmitting}
          >
            <span>{isSubmitting ? 'Updating Password...' : 'Save New Password'}</span>
            {!isSubmitting && <ArrowRight className="w-4 h-4" />}
          </Button>
        </form>
      )}

      {/* Back to Login Footer */}
      <div className="pt-4 border-t border-slate-100 text-center">
        <p className="text-slate-500 text-xs font-semibold">
          Remembered credentials?{' '}
          <Link
            href="/login"
            className="text-sky-600 hover:text-sky-800 font-extrabold transition-colors underline underline-offset-2"
          >
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
