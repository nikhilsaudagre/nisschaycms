'use client';

import React from 'react';
import { PatientForm } from '@/components/patient-form';

export default function NewPatientPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Register New Patient</h1>
        <p className="text-slate-500 font-medium mt-1">Open a new file for consultations, prescribing, and billing.</p>
      </div>
      <PatientForm />
    </div>
  );
}
