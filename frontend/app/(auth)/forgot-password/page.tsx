'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, ForgotPasswordInput } from '@/lib/validations';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, KeyRound, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setError(null);
    setMessage(null);
    setOtpCode(null);
    setIsSubmitting(true);
    try {
      const responseMessage = await forgotPassword(data.email);
      setMessage('Password reset code generated.');
      
      const otpMatch = responseMessage.match(/Code:\s*(\d+)/);
      if (otpMatch && otpMatch[1]) {
        setOtpCode(otpMatch[1]);
      }
      setIsSubmitting(false);
    } catch (err: unknown) {
      setError(typeof err === 'string' ? err : 'Failed to request password reset. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2 text-center sm:text-left">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-100 text-xs font-extrabold mb-1 shadow-2xs">
          <KeyRound className="w-3.5 h-3.5 text-sky-600" />
          <span>Password Recovery</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Forgot Password?</h1>
        <p className="text-slate-500 font-medium text-xs sm:text-sm">
          Enter your registered email ID to receive a verification OTP code.
        </p>
      </div>

      {/* Error Alert Card */}
      {error && (
        <div className="p-4 bg-rose-50/90 border border-rose-200/80 rounded-2xl text-xs text-rose-700 font-semibold flex items-start space-x-3 shadow-2xs animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Alert Card */}
      {message && (
        <div className="p-5 bg-emerald-50/90 border border-emerald-200/80 rounded-2xl space-y-3 shadow-2xs animate-fadeIn">
          <div className="flex items-center space-x-2 text-emerald-800 font-extrabold text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{message}</span>
          </div>

          {otpCode && (
            <div className="bg-white border border-emerald-200 rounded-xl p-3.5 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Verification OTP Code</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Active</span>
              </div>
              <p className="text-2xl font-extrabold font-mono text-sky-700 tracking-widest text-center py-1">
                {otpCode}
              </p>
              <p className="text-[11px] text-slate-500 text-center font-medium">Use this 6-digit code on the reset password screen.</p>
            </div>
          )}

          <div className="pt-1">
            <Link
              href="/reset-password"
              className="w-full h-10 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center justify-center space-x-2 transition-all"
            >
              <span>Proceed to Reset Password</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {!message && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-slate-700 text-xs font-extrabold uppercase tracking-wider">
              Registered Email ID
            </Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5 pointer-events-none" />
              <Input
                id="email"
                type="email"
                placeholder="doctor@nisschay.com"
                className={`pl-11 h-11 text-sm bg-slate-50/50 focus:bg-white rounded-xl font-medium transition-all ${
                  errors.email ? 'border-rose-400 focus-visible:ring-rose-400' : 'border-slate-200 focus-visible:ring-sky-500'
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

          <Button
            type="submit"
            className="w-full h-11 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-blue-700 text-white font-extrabold text-sm rounded-xl transition-all duration-200 mt-6 shadow-md shadow-sky-500/20 active:scale-98 flex items-center justify-center space-x-2"
            disabled={isSubmitting}
          >
            <span>{isSubmitting ? 'Sending Request...' : 'Send Password Reset Code'}</span>
            {!isSubmitting && <ArrowRight className="w-4 h-4" />}
          </Button>
        </form>
      )}

      {/* Back to Login Footer */}
      <div className="pt-4 border-t border-slate-100 text-center">
        <p className="text-slate-500 text-xs font-semibold">
          Remembered password?{' '}
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
