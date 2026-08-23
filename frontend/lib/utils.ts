import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Doctor } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getDoctorFeeForType(doctor: Partial<Doctor> | undefined, type: string | undefined): number {
  if (!doctor) return 500;
  const apptType = (type || 'CONSULTATION').toUpperCase();
  if (apptType === 'FOLLOW_UP') {
    return doctor.followUpFee !== undefined && doctor.followUpFee !== null && Number(doctor.followUpFee) > 0
      ? Number(doctor.followUpFee)
      : Number(doctor.consultationFee || 500);
  }
  if (apptType === 'EMERGENCY') {
    return doctor.emergencyFee !== undefined && doctor.emergencyFee !== null && Number(doctor.emergencyFee) > 0
      ? Number(doctor.emergencyFee)
      : Number(doctor.consultationFee || 500);
  }
  return Number(doctor.consultationFee || 500);
}

export function getFeeLabelForType(type: string | undefined): string {
  const apptType = (type || 'CONSULTATION').toUpperCase();
  if (apptType === 'FOLLOW_UP') return 'Follow-Up Fee';
  if (apptType === 'EMERGENCY') return 'Emergency Fee';
  return 'Consultation Fee';
}
