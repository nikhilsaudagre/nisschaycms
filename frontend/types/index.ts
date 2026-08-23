export interface Clinic {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  website?: string;
  logoUrl?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'ADMIN' | 'DOCTOR' | 'RECEPTIONIST';
  clinicId: string;
  clinicName: string;
  profilePictureUrl?: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Patient {
  id: string;
  clinicId: string;
  phone: string;
  name?: string;
  gender?: string;
  dateOfBirth?: string;
  email?: string;
  bloodGroup?: string;
  address?: string;
  city?: string;
  pincode?: string;
  governmentId?: string;
  heightCm?: number;
  weightKg?: number;
  currentMedications?: string;
  referralSource?: string;
  insuranceProvider?: string;
  insurancePolicyNo?: string;
  allergies?: string;
  medicalHistory?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  active: boolean;
  createdAt: string;
}

export interface PatientListResponse {
  content: Patient[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface Appointment {
  id: string;
  clinicId: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: 'SCHEDULED' | 'CHECKED_IN' | 'IN_CONSULTATION' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  type: 'CONSULTATION' | 'FOLLOW_UP' | 'EMERGENCY';
  reason?: string;
  notes?: string;
  symptoms?: string;
  diagnosis?: string;
  prescription?: string;
  bpSystolic?: number;
  bpDiastolic?: number;
  pulse?: number;
  temperature?: number;
  spo2?: number;
  weight?: number;
  height?: number;
  followUpDate?: string;
  createdAt: string;
}

export interface Doctor {
  id: string;
  name: string;
  email: string;
  phone?: string;
  active: boolean;
  specialization?: string;
  registrationNumber?: string;
  consultationFee?: number;
  followUpFee?: number;
  emergencyFee?: number;
  qualification?: string;
  experienceYears?: number;
  roomNumber?: string;
  slotDuration?: number;
  biography?: string;
  availabilitySchedule?: string;
}

export interface ClinicServiceItem {
  id?: string;
  name: string;
  fee: number;
  active?: boolean;
}

export interface PrescriptionSettings {
  id?: string;
  showLogo: boolean;
  digitalSignatureUrl?: string;
  headerText?: string;
  footerText?: string;
  watermarkUrl?: string;
  printMarginMm: number;
  enableQrCode: boolean;
  defaultAdvice?: string;
}

export interface Medicine {
  id: string;
  name: string;
  manufacturerName?: string;
  saltComposition?: string;
  medicineDesc?: string;
  sideEffects?: string;
  active?: boolean;
}
