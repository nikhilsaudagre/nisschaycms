'use client';

import React from 'react';
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Edit Patient Demographics</h1>
        <p className="text-slate-500 font-medium mt-1">Modify registered data details for this patient.</p>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-500 font-medium">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <span>Loading patient data...</span>
        </div>
      ) : isError ? (
        <div className="p-12 text-center text-red-600 font-bold bg-white rounded-xl border border-slate-200">
          Failed to load patient records. It may have been deleted or archived.
        </div>
      ) : (
        <PatientForm patient={patient} />
      )}
    </div>
  );
}
