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

/**
 * Returns current timestamp in standard readable format: "YYYY-MM-DD HH:mm:ss"
 */
export function getCurrentDateTimeStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  const secs = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${mins}:${secs}`;
}

/**
 * Returns current full ISO 8601 timestamp string
 */
export function getCurrentIsoTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Unified 12-hour Clinical Timestamp Formatter:
 * e.g. "05 Sep 2026, 11:42 PM"
 * If input is only date "YYYY-MM-DD", returns "05 Sep 2026".
 */
export function formatClinicalDateTime(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '—';
  try {
    if (typeof dateInput === 'string') {
      const trimmed = dateInput.trim();
      if (!trimmed) return '—';
      // If already a human formatted 12-hour string (e.g. "05 Sep 2026, 11:42 PM" or "5/9/2026, 11:42:00 PM")
      if (/(?:AM|PM|am|pm)$/.test(trimmed) && !trimmed.includes('T')) {
        return trimmed;
      }
      // If strictly YYYY-MM-DD without time
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const [y, m, d] = trimmed.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        return dateObj.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      }
    }

    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);

    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return String(dateInput);
  }
}

/**
 * Formats time portion in 12-hour clock: e.g. "11:42 PM"
 */
export function formatClinicalTime(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '—';
  try {
    if (typeof dateInput === 'string') {
      const trimmed = dateInput.trim();
      if (/^\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)$/i.test(trimmed)) {
        return trimmed.toUpperCase();
      }
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return String(dateInput);
  }
}

/**
 * Formats relative time ("Just now", "5m ago", "2h ago", "Yesterday")
 */
export function formatRelativeTime(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '—';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const now = new Date();
    const diffSecs = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSecs < 60) return 'Just now';
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
    if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
    if (diffSecs < 172800) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  } catch {
    return String(dateInput);
  }
}

