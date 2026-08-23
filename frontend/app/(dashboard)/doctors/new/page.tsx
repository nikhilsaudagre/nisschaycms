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
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-xs">
        <div className="space-y-1">
          <button
            onClick={() => router.push('/doctors')}
            className="flex items-center space-x-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-bold text-xs transition-colors group mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Doctors Directory</span>
          </button>

          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 rounded-xl border border-teal-100 dark:border-teal-800">
              <Stethoscope className="w-5 h-5" />
            </div>
            <span>Register Medical Practitioner</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Create a practitioner profile with specialization, medical registration/license, consultation tariffs, and OPD schedule.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" /> Official Practitioner Profile
          </span>
        </div>
      </div>

      {/* Form Component */}
      <DoctorForm onSuccess={() => router.push('/doctors')} onCancel={() => router.push('/doctors')} />
    </div>
  );
}
