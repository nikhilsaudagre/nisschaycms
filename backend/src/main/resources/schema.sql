-- Database Schema for Nisschay CMS (PostgreSQL)
-- Optimized for lightweight, fast operations, and multi-tenancy.

-- 1. Clinics Table
CREATE TABLE IF NOT EXISTS clinics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Permissions Table
CREATE TABLE IF NOT EXISTS permissions (
    id VARCHAR(100) PRIMARY KEY,
    description VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(50) PRIMARY KEY, -- ADMIN, DOCTOR, RECEPTIONIST
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. Role-Permissions Join Table
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id VARCHAR(50) REFERENCES roles(id) ON DELETE CASCADE,
    permission_id VARCHAR(100) REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 5. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    role_id VARCHAR(50) REFERENCES roles(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. Refresh Tokens Table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 7. Password Reset Tokens Table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(100) UNIQUE NOT NULL,
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexing for speed and optimization
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_clinic ON users(clinic_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);

-- 8. Patients Table
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    gender VARCHAR(20),
    date_of_birth DATE,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    blood_group VARCHAR(10),
    address TEXT,
    city VARCHAR(100),
    pincode VARCHAR(20),
    government_id VARCHAR(100),
    height_cm DOUBLE PRECISION,
    weight_kg DOUBLE PRECISION,
    current_medications TEXT,
    referral_source VARCHAR(100),
    insurance_provider VARCHAR(255),
    insurance_policy_no VARCHAR(100),
    allergies TEXT,
    medical_history TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Ensure nullable gender and date_of_birth & add new columns if table existed
ALTER TABLE patients ALTER COLUMN gender DROP NOT NULL;
ALTER TABLE patients ALTER COLUMN date_of_birth DROP NOT NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS government_id VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS height_cm DOUBLE PRECISION;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS weight_kg DOUBLE PRECISION;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS current_medications TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS referral_source VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_provider VARCHAR(255);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_policy_no VARCHAR(100);

-- Indexing for patient queries
CREATE INDEX IF NOT EXISTS idx_patients_clinic ON patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);

-- 9. Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(50) DEFAULT 'SCHEDULED' NOT NULL,
    type VARCHAR(50) DEFAULT 'CONSULTATION' NOT NULL,
    reason TEXT,
    notes TEXT,
    symptoms TEXT,
    diagnosis TEXT,
    prescription TEXT,
    bp_systolic INTEGER,
    bp_diastolic INTEGER,
    pulse INTEGER,
    temperature DOUBLE PRECISION,
    spo2 INTEGER,
    weight DOUBLE PRECISION,
    height DOUBLE PRECISION,
    follow_up_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexing for appointment queries
CREATE INDEX IF NOT EXISTS idx_appointments_clinic ON appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date_doctor ON appointments(appointment_date, doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);

-- 10. Doctor Profiles Table
CREATE TABLE IF NOT EXISTS doctor_profiles (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    specialization VARCHAR(255) NOT NULL,
    consultation_fee DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    follow_up_fee DECIMAL(10, 2) DEFAULT 0.00,
    emergency_fee DECIMAL(10, 2) DEFAULT 0.00,
    qualification VARCHAR(255),
    experience_years INTEGER,
    biography TEXT,
    availability_schedule TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS follow_up_fee DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS emergency_fee DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS registration_number VARCHAR(255);
ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS room_number VARCHAR(255);
ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS slot_duration INTEGER DEFAULT 15;
