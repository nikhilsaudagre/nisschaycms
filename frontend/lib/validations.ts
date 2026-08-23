import * as z from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const clinicRegisterSchema = z
  .object({
    clinicName: z.string().min(2, 'Clinic name must be at least 2 characters'),
    clinicEmail: z.string().min(1, 'Clinic email is required').email('Invalid clinic email'),
    clinicPhone: z.string().min(10, 'Phone number must be at least 10 digits'),
    clinicAddress: z.string().optional(),
    adminName: z.string().min(2, 'Admin name must be at least 2 characters'),
    adminEmail: z.string().min(1, 'Admin email is required').email('Invalid admin email'),
    adminPhone: z.string().min(10, 'Admin phone number must be at least 10 digits').optional().or(z.literal('')),
    adminPassword: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Confirm password must be at least 6 characters'),
  })
  .refine((data) => data.adminPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(6, 'OTP must be 6 digits').max(6, 'OTP must be 6 digits'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Confirm password must be at least 6 characters'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ClinicRegisterInput = z.infer<typeof clinicRegisterSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// Patient Schema
export const patientSchema = z.object({
  phone: z.string().min(10, 'Mobile phone number must be at least 10 digits').max(15, 'Phone number cannot exceed 15 digits'),
  name: z.string().optional().or(z.literal('')),
  gender: z.string().optional().or(z.literal('')),
  dateOfBirth: z.string().optional().or(z.literal('')),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  bloodGroup: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  pincode: z.string().optional().or(z.literal('')),
  governmentId: z.string().optional().or(z.literal('')),
  heightCm: z.preprocess((v) => (v === '' || v === null || v === undefined ? undefined : Number(v)), z.number().optional()),
  weightKg: z.preprocess((v) => (v === '' || v === null || v === undefined ? undefined : Number(v)), z.number().optional()),
  currentMedications: z.string().optional().or(z.literal('')),
  referralSource: z.string().optional().or(z.literal('')),
  insuranceProvider: z.string().optional().or(z.literal('')),
  insurancePolicyNo: z.string().optional().or(z.literal('')),
  allergies: z.string().optional().or(z.literal('')),
  medicalHistory: z.string().optional().or(z.literal('')),
  emergencyContactName: z.string().optional().or(z.literal('')),
  emergencyContactPhone: z.string().optional().or(z.literal('')),
});

export type PatientInput = z.infer<typeof patientSchema>;

export const appointmentSchema = z.object({
  patientId: z.string().min(36, 'Please select a valid patient'),
  doctorId: z.string().min(36, 'Please select a doctor'),
  appointmentDate: z.string().min(10, 'Appointment date is required').regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  startTime: z.string().min(5, 'Start time is required').regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format'),
  endTime: z.string().min(5, 'End time is required').regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format'),
  type: z.string().min(1, 'Appointment type is required'),
  reason: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

export type AppointmentInput = z.infer<typeof appointmentSchema>;

// Doctor Registration & Profile Schema
export const doctorSchema = z.object({
  name: z.string().min(2, 'Doctor name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(15, 'Phone number cannot exceed 15 digits'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().optional().or(z.literal('')),
  registrationNumber: z.string().optional().or(z.literal('')),
  specialization: z.string().min(2, 'Specialization is required'),
  qualification: z.string().optional().or(z.literal('')),
  experienceYears: z.preprocess((v) => (v === '' || v === null || v === undefined ? 0 : Number(v)), z.number().optional()),
  consultationFee: z.preprocess((v) => (v === '' || v === null || v === undefined ? 0 : Number(v)), z.number().min(0, 'Fee cannot be negative')),
  followUpFee: z.preprocess((v) => (v === '' || v === null || v === undefined ? undefined : Number(v)), z.number().optional()),
  emergencyFee: z.preprocess((v) => (v === '' || v === null || v === undefined ? undefined : Number(v)), z.number().optional()),
  roomNumber: z.string().optional().or(z.literal('')),
  slotDuration: z.preprocess((v) => (v === '' || v === null || v === undefined ? 15 : Number(v)), z.number().optional()),
  availabilitySchedule: z.string().optional().or(z.literal('')),
  biography: z.string().optional().or(z.literal('')),
});

export type DoctorInput = z.infer<typeof doctorSchema>;
