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

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        log.info("Initializing database seeds (roles and permissions)...");

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

        // RECEPTIONIST Role (Front-desk operations: Appointments and Patient lookup/registration)
        if (!roleRepository.existsById("RECEPTIONIST")) {
            Role receptionistRole = Role.builder()
                    .id("RECEPTIONIST")
                    .name("Receptionist")
                    .description("Front-desk assistant managing patient arrivals and appointment booking")
                    .permissions(new HashSet<>(List.of(
                            readPatients, writePatients, readAppts, writeAppts
                    )))
                    .build();
            roleRepository.save(receptionistRole);
            log.info("Seeded role: RECEPTIONIST");
        }

        log.info("Database seeds initialization finished successfully.");
    }

    private Role reconfigPermissionsForReceptionist(Role role) {
        // Just returns role. Used to encapsulate builder patterns.
        return role;
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
