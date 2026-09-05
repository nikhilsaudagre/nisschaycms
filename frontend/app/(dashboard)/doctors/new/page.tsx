'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DoctorForm } from '@/components/doctor-form';
import { ArrowLeft, Stethoscope, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NewDoctorRegistrationPage() {
  const router = useRouter();

  return (
    <div className="w-full space-y-6 pb-16 font-sans">
      {/* Navigation & Header */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-[#E8EEF2] shadow-2xs p-5 sm:p-6 transition-all no-print">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-[#087F8C]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-10 w-48 h-48 bg-[#4FA8DB]/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <button
              onClick={() => router.push('/doctors')}
              className="flex items-center space-x-2 text-[#567781] hover:text-[#172B34] font-bold text-xs transition-colors group mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Doctors Directory</span>
            </button>

            <h1 className="text-xl sm:text-2xl font-extrabold text-[#172B34] tracking-tight flex items-center gap-2.5">
              <div className="p-2 bg-[#087F8C]/10 text-[#087F8C] rounded-xl border border-[#087F8C]/20">
                <Stethoscope className="w-5 h-5" />
              </div>
              <span>Register Medical Practitioner</span>
            </h1>
            <p className="text-xs text-[#567781] font-medium pt-0.5">
              Create a practitioner profile with specialization, medical license/MCI registration, consultation fees, and OPD schedule.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#087F8C]/10 text-[#087F8C] border border-[#087F8C]/20 text-xs font-bold">
              <ShieldCheck className="w-4 h-4" /> Official Practitioner Profile
            </span>
          </div>
        </div>
      </div>

      {/* Form Component */}
      <DoctorForm onSuccess={() => router.push('/doctors')} onCancel={() => router.push('/doctors')} />
    </div>
  );
}
