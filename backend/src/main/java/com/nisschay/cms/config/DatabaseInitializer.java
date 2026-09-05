package com.nisschay.cms.config;

import com.nisschay.cms.entity.Permission;
import com.nisschay.cms.entity.Role;
import com.nisschay.cms.repository.PermissionRepository;
import com.nisschay.cms.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class DatabaseInitializer implements CommandLineRunner {

    private final PermissionRepository permissionRepository;
    private final RoleRepository roleRepository;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        log.info("Initializing database seeds (roles, permissions, schema updates)...");

        // 0. Auto-migrate new columns if absent
        try {
            jdbcTemplate.execute("ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS device_info VARCHAR(255)");
            jdbcTemplate.execute("ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS ip_address VARCHAR(100)");
            jdbcTemplate.execute("ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP");
            jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_daily_report BOOLEAN DEFAULT TRUE");
            jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_emergency_visit BOOLEAN DEFAULT TRUE");
            jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_rx_audit BOOLEAN DEFAULT FALSE");
            jdbcTemplate.execute("ALTER TABLE clinics ADD COLUMN IF NOT EXISTS emergency_phone VARCHAR(50)");
            jdbcTemplate.execute("ALTER TABLE clinics ADD COLUMN IF NOT EXISTS tagline VARCHAR(255)");
            jdbcTemplate.execute("ALTER TABLE clinics ADD COLUMN IF NOT EXISTS landmark VARCHAR(255)");
            jdbcTemplate.execute("ALTER TABLE clinics ADD COLUMN IF NOT EXISTS city VARCHAR(100)");
            jdbcTemplate.execute("ALTER TABLE clinics ADD COLUMN IF NOT EXISTS state VARCHAR(100)");
            jdbcTemplate.execute("ALTER TABLE clinics ADD COLUMN IF NOT EXISTS pincode VARCHAR(20)");
            jdbcTemplate.execute("ALTER TABLE clinics ADD COLUMN IF NOT EXISTS allow_doctor_discount BOOLEAN DEFAULT TRUE");
            jdbcTemplate.execute("ALTER TABLE clinics ADD COLUMN IF NOT EXISTS max_discount_percentage INT DEFAULT 100");
            jdbcTemplate.execute("ALTER TABLE clinics ADD COLUMN IF NOT EXISTS discount_reasons TEXT DEFAULT 'Senior Citizen Concession,Follow-up Courtesy,Staff/Family Discount,Financial Hardship'");

            // Dashboard Layout & Widgets Customization columns
            jdbcTemplate.execute("ALTER TABLE clinics ADD COLUMN IF NOT EXISTS dash_show_kpi_stats BOOLEAN DEFAULT TRUE");
            jdbcTemplate.execute("ALTER TABLE clinics ADD COLUMN IF NOT EXISTS dash_show_revenue BOOLEAN DEFAULT TRUE");
            jdbcTemplate.execute("ALTER TABLE clinics ADD COLUMN IF NOT EXISTS dash_show_opd_queue BOOLEAN DEFAULT TRUE");
            jdbcTemplate.execute("ALTER TABLE clinics ADD COLUMN IF NOT EXISTS dash_show_appointments BOOLEAN DEFAULT TRUE");
            jdbcTemplate.execute("ALTER TABLE clinics ADD COLUMN IF NOT EXISTS dash_show_clinical_alerts BOOLEAN DEFAULT TRUE");
            jdbcTemplate.execute("ALTER TABLE clinics ADD COLUMN IF NOT EXISTS dash_show_quick_actions BOOLEAN DEFAULT TRUE");
            jdbcTemplate.execute("ALTER TABLE clinics ADD COLUMN IF NOT EXISTS dash_show_recent_patients BOOLEAN DEFAULT TRUE");
            jdbcTemplate.execute("ALTER TABLE clinics ADD COLUMN IF NOT EXISTS dash_show_inventory_alerts BOOLEAN DEFAULT TRUE");
            jdbcTemplate.execute("ALTER TABLE clinics ADD COLUMN IF NOT EXISTS dash_privacy_mode BOOLEAN DEFAULT FALSE");
            jdbcTemplate.execute("ALTER TABLE clinics ADD COLUMN IF NOT EXISTS dash_density VARCHAR(50) DEFAULT 'COMFORTABLE'");
            jdbcTemplate.execute("ALTER TABLE clinics ADD COLUMN IF NOT EXISTS dash_auto_refresh_interval INT DEFAULT 60");
            jdbcTemplate.execute("ALTER TABLE clinics ADD COLUMN IF NOT EXISTS dash_default_date_range VARCHAR(50) DEFAULT 'TODAY'");
            jdbcTemplate.execute("ALTER TABLE clinics ADD COLUMN IF NOT EXISTS dash_role_preset VARCHAR(50) DEFAULT 'DOCTOR'");

            // Phase 1: Multi-Specialty Hospital & Facility Onboarding columns
            jdbcTemplate.execute("ALTER TABLE clinics ADD COLUMN IF NOT EXISTS facility_type VARCHAR(50) DEFAULT 'HOSPITAL'");
            jdbcTemplate.execute("ALTER TABLE clinics ADD COLUMN IF NOT EXISTS total_beds INT DEFAULT 50");
            jdbcTemplate.execute("ALTER TABLE clinics ADD COLUMN IF NOT EXISTS total_icu_beds INT DEFAULT 10");
            jdbcTemplate.execute("ALTER TABLE clinics ADD COLUMN IF NOT EXISTS total_ot_rooms INT DEFAULT 2");
            jdbcTemplate.execute("ALTER TABLE clinics ADD COLUMN IF NOT EXISTS nabh_accreditation_number VARCHAR(100)");
            jdbcTemplate.execute("ALTER TABLE clinics ADD COLUMN IF NOT EXISTS rohini_hospital_id VARCHAR(100)");
            jdbcTemplate.execute("ALTER TABLE clinics ADD COLUMN IF NOT EXISTS clinical_est_registration_number VARCHAR(100)");
            jdbcTemplate.execute("ALTER TABLE clinics ADD COLUMN IF NOT EXISTS enabled_departments TEXT DEFAULT 'General Medicine,General Surgery,Obstetrics & Gynecology,Pediatrics,Orthopedics,Cardiology,Dental,Ophthalmology,Emergency Care'");
            jdbcTemplate.execute("ALTER TABLE clinics ADD COLUMN IF NOT EXISTS ambulance_contact_phone VARCHAR(50)");
            jdbcTemplate.execute("ALTER TABLE clinics ADD COLUMN IF NOT EXISTS blood_bank_available BOOLEAN DEFAULT FALSE");
            jdbcTemplate.execute("ALTER TABLE clinics ADD COLUMN IF NOT EXISTS pharmacy_24x7 BOOLEAN DEFAULT TRUE");

            // Hospital Services & Tariff Master columns
            jdbcTemplate.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'PROCEDURE'");
            jdbcTemplate.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS hsn_sac_code VARCHAR(20) DEFAULT '999312'");
            jdbcTemplate.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS doctor_id UUID");
            jdbcTemplate.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS doctor_name VARCHAR(255)");
            jdbcTemplate.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS description TEXT");

            // Prescription Studio Modular Customization columns
            jdbcTemplate.execute("ALTER TABLE prescription_settings ADD COLUMN IF NOT EXISTS letterhead_mode VARCHAR(50) DEFAULT 'PLAIN_PAPER'");
            jdbcTemplate.execute("ALTER TABLE prescription_settings ADD COLUMN IF NOT EXISTS top_margin_mm INT DEFAULT 10");
            jdbcTemplate.execute("ALTER TABLE prescription_settings ADD COLUMN IF NOT EXISTS show_vitals BOOLEAN DEFAULT TRUE");
            jdbcTemplate.execute("ALTER TABLE prescription_settings ADD COLUMN IF NOT EXISTS show_complaints BOOLEAN DEFAULT TRUE");
            jdbcTemplate.execute("ALTER TABLE prescription_settings ADD COLUMN IF NOT EXISTS show_diagnosis BOOLEAN DEFAULT TRUE");
            jdbcTemplate.execute("ALTER TABLE prescription_settings ADD COLUMN IF NOT EXISTS show_medicines BOOLEAN DEFAULT TRUE");
            jdbcTemplate.execute("ALTER TABLE prescription_settings ADD COLUMN IF NOT EXISTS show_lab_tests BOOLEAN DEFAULT TRUE");
            jdbcTemplate.execute("ALTER TABLE prescription_settings ADD COLUMN IF NOT EXISTS show_advice BOOLEAN DEFAULT TRUE");
            jdbcTemplate.execute("ALTER TABLE prescription_settings ADD COLUMN IF NOT EXISTS show_follow_up BOOLEAN DEFAULT TRUE");
            jdbcTemplate.execute("ALTER TABLE prescription_settings ADD COLUMN IF NOT EXISTS show_signature BOOLEAN DEFAULT TRUE");

            // Discharge Summary Customization columns
            jdbcTemplate.execute("ALTER TABLE prescription_settings ADD COLUMN IF NOT EXISTS discharge_header_title VARCHAR(255) DEFAULT 'HOSPITAL INPATIENT DISCHARGE SUMMARY'");
            jdbcTemplate.execute("ALTER TABLE prescription_settings ADD COLUMN IF NOT EXISTS discharge_show_hospital_course BOOLEAN DEFAULT TRUE");
            jdbcTemplate.execute("ALTER TABLE prescription_settings ADD COLUMN IF NOT EXISTS discharge_show_investigations BOOLEAN DEFAULT TRUE");
            jdbcTemplate.execute("ALTER TABLE prescription_settings ADD COLUMN IF NOT EXISTS discharge_show_diet_activity BOOLEAN DEFAULT TRUE");
            jdbcTemplate.execute("ALTER TABLE prescription_settings ADD COLUMN IF NOT EXISTS discharge_show_emergency_warning BOOLEAN DEFAULT TRUE");
            jdbcTemplate.execute("ALTER TABLE prescription_settings ADD COLUMN IF NOT EXISTS discharge_show_attendant_signature BOOLEAN DEFAULT TRUE");
            jdbcTemplate.execute("ALTER TABLE prescription_settings ADD COLUMN IF NOT EXISTS default_discharge_emergency_notes TEXT");
            jdbcTemplate.execute("ALTER TABLE prescription_settings ADD COLUMN IF NOT EXISTS default_discharge_diet_notes TEXT");

            // Consultation Report Customization columns
            jdbcTemplate.execute("ALTER TABLE prescription_settings ADD COLUMN IF NOT EXISTS consultation_report_title VARCHAR(255) DEFAULT 'CLINICAL CONSULTATION & OPD ENCOUNTER REPORT'");
            jdbcTemplate.execute("ALTER TABLE prescription_settings ADD COLUMN IF NOT EXISTS consultation_show_vitals BOOLEAN DEFAULT TRUE");
            jdbcTemplate.execute("ALTER TABLE prescription_settings ADD COLUMN IF NOT EXISTS consultation_show_systemic_exam BOOLEAN DEFAULT TRUE");
            jdbcTemplate.execute("ALTER TABLE prescription_settings ADD COLUMN IF NOT EXISTS consultation_show_investigations BOOLEAN DEFAULT TRUE");
            jdbcTemplate.execute("ALTER TABLE prescription_settings ADD COLUMN IF NOT EXISTS consultation_show_referral_notes BOOLEAN DEFAULT TRUE");
            jdbcTemplate.execute("ALTER TABLE prescription_settings ADD COLUMN IF NOT EXISTS default_consultation_disclaimer TEXT");

            // Medical Certificate Customization columns
            jdbcTemplate.execute("ALTER TABLE prescription_settings ADD COLUMN IF NOT EXISTS medical_cert_title VARCHAR(255) DEFAULT 'MEDICAL FITNESS & SICKNESS CERTIFICATE'");
            jdbcTemplate.execute("ALTER TABLE prescription_settings ADD COLUMN IF NOT EXISTS medical_cert_council_authority TEXT DEFAULT 'Issued under the Regulations of the National Medical Commission & State Medical Council'");
            jdbcTemplate.execute("ALTER TABLE prescription_settings ADD COLUMN IF NOT EXISTS default_medical_cert_remarks TEXT");
            jdbcTemplate.execute("ALTER TABLE prescription_settings ADD COLUMN IF NOT EXISTS medical_cert_show_seal BOOLEAN DEFAULT TRUE");
        } catch (Exception e) {
            log.warn("Non-fatal schema auto-migration note: {}", e.getMessage());
        }

        // 1. Seed Permissions
        Permission manageClinic = savePermissionIfAbsent("MANAGE_CLINIC", "Allows managing clinic settings and configuration");
        Permission readPatients = savePermissionIfAbsent("READ_PATIENTS", "Allows viewing patient list and profiles");
        Permission writePatients = savePermissionIfAbsent("WRITE_PATIENTS", "Allows creating and modifying patient records");
        Permission readAppts = savePermissionIfAbsent("READ_APPOINTMENTS", "Allows viewing appointments calendar and status");
        Permission writeAppts = savePermissionIfAbsent("WRITE_APPOINTMENTS", "Allows creating, moving, and canceling appointments");
        Permission viewBilling = savePermissionIfAbsent("VIEW_BILLING", "Allows viewing invoices and financial logs");
        Permission manageBilling = savePermissionIfAbsent("MANAGE_BILLING", "Allows creating invoices, recording payments, and raising refunds");
        Permission viewReports = savePermissionIfAbsent("VIEW_REPORTS", "Allows accessing reports, revenue charts, and usage statistics");

        // 2. Seed Roles
        
        // SUPER_ADMIN Role (Owner / System Administrator)
        if (!roleRepository.existsById("SUPER_ADMIN")) {
            Role superAdminRole = Role.builder()
                    .id("SUPER_ADMIN")
                    .name("Super Admin")
                    .description("System owner with complete oversight across clinic, billing, users, and configuration")
                    .permissions(new HashSet<>(List.of(
                            manageClinic, readPatients, writePatients, readAppts, writeAppts, viewBilling, manageBilling, viewReports
                    )))
                    .build();
            roleRepository.save(superAdminRole);
            log.info("Seeded role: SUPER_ADMIN");
        }

        // SUB_ADMIN Role (Operational Admin)
        if (!roleRepository.existsById("SUB_ADMIN")) {
            Role subAdminRole = Role.builder()
                    .id("SUB_ADMIN")
                    .name("Sub Admin")
                    .description("Operational clinic manager handling daily clinic operations, scheduling, and patients")
                    .permissions(new HashSet<>(List.of(
                            readPatients, writePatients, readAppts, writeAppts, viewBilling, manageBilling, viewReports
                    )))
                    .build();
            roleRepository.save(subAdminRole);
            log.info("Seeded role: SUB_ADMIN");
        }

        // ADMIN Role (Full access)
        if (!roleRepository.existsById("ADMIN")) {
            Role adminRole = Role.builder()
                    .id("ADMIN")
                    .name("Clinic Admin")
                    .description("Administrator of the clinic with full system configuration rights")
                    .permissions(new HashSet<>(List.of(
                            manageClinic, readPatients, writePatients, readAppts, writeAppts, viewBilling, manageBilling, viewReports
                    )))
                    .build();
            roleRepository.save(adminRole);
            log.info("Seeded role: ADMIN");
        }

        // DOCTOR Role (Clinical access)
        if (!roleRepository.existsById("DOCTOR")) {
            Role doctorRole = Role.builder()
                    .id("DOCTOR")
                    .name("Doctor")
                    .description("Clinician with access to consultations, patient medical records, and scheduling")
                    .permissions(new HashSet<>(List.of(
                            readPatients, writePatients, readAppts, writeAppts, viewReports
                    )))
                    .build();
            roleRepository.save(doctorRole);
            log.info("Seeded role: DOCTOR");
        }

        // RECEPTIONIST Role (Front-desk operations)
        if (!roleRepository.existsById("RECEPTIONIST")) {
            Role receptionistRole = Role.builder()
                    .id("RECEPTIONIST")
                    .name("Receptionist / Front Desk")
                    .description("Front-desk assistant managing patient arrivals, appointments, and token queue")
                    .permissions(new HashSet<>(List.of(readPatients, writePatients, readAppts, writeAppts)))
                    .build();
            roleRepository.save(receptionistRole);
            log.info("Seeded role: RECEPTIONIST");
        }

        // Additional Specialized Hospital Staff Roles
        seedRoleIfAbsent("HOSPITAL_MANAGER", "Hospital Operations Manager", "Manages daily clinic and hospital workflows", List.of(readPatients, writePatients, readAppts, writeAppts, viewBilling, manageBilling, viewReports));
        seedRoleIfAbsent("RMO", "Resident Medical Officer (RMO)", "24/7 duty doctor for emergency and inpatient wards", List.of(readPatients, writePatients, readAppts, writeAppts));
        seedRoleIfAbsent("NURSE", "Staff Nurse / Ward In-Charge", "Bedside patient care, vitals charting, medication administration", List.of(readPatients, writePatients, readAppts));
        seedRoleIfAbsent("OT_TECHNICIAN", "Operation Theatre (OT) Technician", "OT surgical trays, sterilization, and surgeon assistance", List.of(readPatients));
        seedRoleIfAbsent("ICU_TECHNICIAN", "ICU / Critical Care Technician", "Ventilator management and critical care equipment", List.of(readPatients));
        seedRoleIfAbsent("PHARMACIST", "Hospital Pharmacist", "Pharmacy sales counter, prescription dispensing, and medicine stock", List.of(readPatients, viewBilling, manageBilling));
        seedRoleIfAbsent("LAB_TECHNICIAN", "Lab / Pathology Technician", "Blood/pathology specimen analysis and test reports", List.of(readPatients, writePatients));
        seedRoleIfAbsent("RADIOLOGIST", "Radiology Technician", "X-Ray, CT, Ultrasound, and scan image reporting", List.of(readPatients, writePatients));
        seedRoleIfAbsent("PHYSIOTHERAPIST", "Physiotherapist", "Physical rehab and orthopedic mobility therapy", List.of(readPatients));
        seedRoleIfAbsent("DIETICIAN", "Clinical Dietician", "Inpatient dietary charts and therapeutic nutrition planning", List.of(readPatients));
        seedRoleIfAbsent("CASHIER", "Billing & Cashier Executive", "OPD POS counters, bed admission advance collection, and tax invoicing", List.of(readPatients, viewBilling, manageBilling));
        seedRoleIfAbsent("ACCOUNTANT", "Hospital Accountant", "Financial bookkeeping, ledger audit, and shift reconciliation", List.of(viewBilling, manageBilling, viewReports));
        seedRoleIfAbsent("TPA_EXECUTIVE", "TPA & Cashless Insurance Desk", "Insurance pre-authorizations, claim paperwork, and cashless approvals", List.of(readPatients, viewBilling));
        seedRoleIfAbsent("MRD_OFFICER", "Medical Records (MRD) Officer", "Patient medical history archiving, MLC records, and government certificates", List.of(readPatients));
        seedRoleIfAbsent("WARD_COORDINATOR", "Ward / IPD Coordinator", "Bed allocations, room transfers, and discharge logistics", List.of(readPatients, writePatients));
        seedRoleIfAbsent("AMBULANCE_DRIVER", "Ambulance Driver / EMT", "Emergency transit and ambulance dispatch logs", List.of());
        seedRoleIfAbsent("HOUSEKEEPING", "Housekeeping & Sanitization Staff", "Ward cleanliness, bed sanitization, and biohazard waste", List.of());
        seedRoleIfAbsent("SECURITY", "Hospital Security Staff", "Premises safety, visitor gate passes, and emergency triage", List.of());
        seedRoleIfAbsent("MAINTENANCE", "Biomedical & Maintenance Technician", "Hospital equipment calibration and electrical infrastructure", List.of());

        log.info("Database seeds initialization finished successfully.");
    }

    private Role reconfigPermissionsForReceptionist(Role role) {
        // Just returns role. Used to encapsulate builder patterns.
        return role;
    }

    private void seedRoleIfAbsent(String roleId, String roleName, String description, List<Permission> permissions) {
        if (!roleRepository.existsById(roleId)) {
            Role role = Role.builder()
                    .id(roleId)
                    .name(roleName)
                    .description(description)
                    .permissions(new HashSet<>(permissions))
                    .build();
            roleRepository.save(role);
            log.info("Seeded role: {}", roleId);
        }
    }

    private Permission savePermissionIfAbsent(String id, String description) {
        return permissionRepository.findById(id).orElseGet(() -> {
            Permission permission = Permission.builder()
                    .id(id)
                    .description(description)
                    .build();
            Permission saved = permissionRepository.save(permission);
            log.info("Seeded permission: {}", id);
            return saved;
        });
    }
}
