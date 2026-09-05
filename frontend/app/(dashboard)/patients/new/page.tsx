import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PatientForm } from '@/components/patient-form';

export default function NewPatientPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* 1. Glass Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-5 sm:p-6 transition-all">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-[#087F8C]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-10 w-48 h-48 bg-[#4FA8DB]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/patients"
              className="p-2 rounded-xl bg-white border border-[#E8EEF2] text-[#567781] hover:text-[#087F8C] hover:border-[#087F8C]/40 transition-colors shadow-2xs cursor-pointer"
              title="Back to Patients Directory"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#172B34] tracking-tight">
                Register New Patient
              </h1>
              <p className="text-xs sm:text-sm font-medium text-[#567781] mt-0.5">
                Create a digital health record for consultations, prescriptions, and billing.
              </p>
            </div>
          </div>
        </div>
      </div>

      <PatientForm />
    </div>
  );
}
