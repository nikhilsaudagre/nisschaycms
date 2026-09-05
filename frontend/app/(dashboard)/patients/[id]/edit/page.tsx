'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Patient } from '@/types';
import { PatientForm } from '@/components/patient-form';

export default function EditPatientPage() {
  const params = useParams();
  const id = params.id as string;

  // Fetch patient profile details
  const { data: patient, isLoading, isError } = useQuery<Patient>({
    queryKey: ['patient', id],
    queryFn: async () => {
      const response = await apiClient.get(`/patients/${id}`);
      return response.data;
    },
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* 1. Glass Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-5 sm:p-6 transition-all">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-[#087F8C]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-10 w-48 h-48 bg-[#4FA8DB]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/patients/${id}`}
              className="p-2 rounded-xl bg-white border border-[#E8EEF2] text-[#567781] hover:text-[#087F8C] hover:border-[#087F8C]/40 transition-colors shadow-2xs cursor-pointer"
              title="Back to Patient EHR"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#172B34] tracking-tight">
                Edit Patient Profile
              </h1>
              <p className="text-xs sm:text-sm font-medium text-[#567781] mt-0.5">
                Update clinical contact details, vitals, or allergies for {patient?.name || 'this patient'}.
              </p>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="p-16 text-center text-[#567781] bg-white border border-[#E8EEF2] rounded-2xl shadow-2xs">
          <div className="w-8 h-8 border-3 border-[#087F8C]/20 border-t-[#087F8C] rounded-full animate-spin mx-auto mb-3"></div>
          <span className="text-xs font-semibold">Loading patient data...</span>
        </div>
      ) : isError ? (
        <div className="p-16 text-center text-[#D64545] font-bold bg-white rounded-2xl border border-[#E8EEF2] shadow-2xs text-xs">
          Failed to load patient records. It may have been deleted or archived.
        </div>
      ) : (
        <PatientForm patient={patient} />
      )}
    </div>
  );
}
