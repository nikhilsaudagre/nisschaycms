package com.nisschay.cms.service;

import com.nisschay.cms.entity.Clinic;
import com.nisschay.cms.entity.Role;
import com.nisschay.cms.entity.User;
import com.nisschay.cms.repository.ClinicRepository;
import com.nisschay.cms.repository.RoleRepository;
import com.nisschay.cms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final ClinicRepository clinicRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public User createUser(Clinic clinic, String roleId, String name, String email, String password, String phone) {
        String normalizedEmail = email != null ? email.trim().toLowerCase() : "";
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new IllegalArgumentException("Email is already in use");
        }

        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new IllegalArgumentException("Role not found: " + roleId));

        long count = userRepository.countByClinicId(clinic.getId());
        String prefix = "DOCTOR".equalsIgnoreCase(roleId) ? "DOC" : "EMP";
        String generatedEmpId = String.format("%s-%d-%04d", prefix, java.time.LocalDate.now().getYear(), count + 1);

        User user = User.builder()
                .clinic(clinic)
                .role(role)
                .employeeId(generatedEmpId)
                .name(name != null ? name.trim() : "")
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(password))
                .phone(phone != null ? phone.trim() : "")
                .active(true)
                .build();

        return userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public User getUserById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + id));
    }

    @Transactional(readOnly = true)
    public User getUserByEmail(String email) {
        String normalizedEmail = email != null ? email.trim().toLowerCase() : "";
        return userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found with email: " + email));
    }

    @Transactional(readOnly = true)
    public java.util.List<User> getDoctorsByClinicId(UUID clinicId) {
        return userRepository.findByClinicIdAndRoleIdIn(clinicId, java.util.List.of("DOCTOR", "ADMIN", "SUB_ADMIN", "SUPER_ADMIN"));
    }

    @Transactional(readOnly = true)
    public java.util.List<User> getAllStaffByClinicId(UUID clinicId) {
        return userRepository.findByClinicId(clinicId);
    }

    @Transactional
    public User createStaffMember(UUID clinicId, com.nisschay.cms.dto.req.StaffCreateRequest request) {
        Clinic clinic = clinicRepository.findById(clinicId)
                .orElseThrow(() -> new IllegalArgumentException("Clinic not found for id: " + clinicId));

        String normalizedEmail = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new IllegalArgumentException("Email is already in use");
        }

        Role role = roleRepository.findById(request.getRoleId())
                .orElseThrow(() -> new IllegalArgumentException("Role not found: " + request.getRoleId()));

        long count = userRepository.countByClinicId(clinic.getId());
        String prefix = "DOCTOR".equalsIgnoreCase(request.getRoleId()) ? "DOC" : "EMP";
        String generatedEmpId = String.format("%s-%d-%04d", prefix, java.time.LocalDate.now().getYear(), count + 1);

        User user = User.builder()
                .clinic(clinic)
                .role(role)
                .employeeId(generatedEmpId)
                .name(request.getName() != null ? request.getName().trim() : "")
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone() != null ? request.getPhone().trim() : "")
                .department(request.getDepartment())
                .shiftTiming(request.getShiftTiming())
                .deskNumber(request.getDeskNumber())
                .bloodGroup(request.getBloodGroup())
                .aadhaarNumber(request.getAadhaarNumber())
                .panNumber(request.getPanNumber())
                .residentialAddress(request.getResidentialAddress())
                .city(request.getCity())
                .state(request.getState())
                .pincode(request.getPincode())
                .policeVerificationStatus(request.getPoliceVerificationStatus() != null ? request.getPoliceVerificationStatus() : "PENDING_SUBMISSION")
                .councilRegistrationNumber(request.getCouncilRegistrationNumber())
                .councilName(request.getCouncilName())
                .hepatitisBStatus(request.getHepatitisBStatus() != null ? request.getHepatitisBStatus() : "VACCINATED")
                .bankAccountNumber(request.getBankAccountNumber())
                .bankIfscCode(request.getBankIfscCode())
                .bankName(request.getBankName())
                .emergencyContactName(request.getEmergencyContactName())
                .emergencyContactPhone(request.getEmergencyContactPhone())
                .emergencyContactRelationship(request.getEmergencyContactRelationship())
                .active(true)
                .build();

        return userRepository.save(user);
    }

    @Transactional
    public com.nisschay.cms.dto.res.UserProfileResponse updateStaffRole(UUID clinicId, UUID userId, String roleId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));

        if (!user.getClinic().getId().equals(clinicId)) {
            throw new IllegalArgumentException("Unauthorized to modify user from another clinic");
        }

        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new IllegalArgumentException("Role not found: " + roleId));

        user.setRole(role);
        User saved = userRepository.save(user);

        return com.nisschay.cms.dto.res.UserProfileResponse.builder()
                .id(saved.getId())
                .name(saved.getName())
                .email(saved.getEmail())
                .phone(saved.getPhone())
                .role(saved.getRole().getId())
                .clinicId(saved.getClinic() != null ? saved.getClinic().getId() : null)
                .clinicName(saved.getClinic() != null ? saved.getClinic().getName() : "Nisschay Clinic")
                .profilePictureUrl(saved.getProfilePictureUrl())
                .build();
    }

    @Transactional
    public com.nisschay.cms.dto.res.UserProfileResponse updateUserProfile(UUID id, com.nisschay.cms.dto.req.UserProfileUpdateRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + id));

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            user.setName(request.getName());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }
        if (request.getPassword() != null && !request.getPassword().trim().isEmpty()) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }
        if (request.getProfilePictureUrl() != null) {
            user.setProfilePictureUrl(request.getProfilePictureUrl());
        }
        if (request.getNotifyDailyReport() != null) {
            user.setNotifyDailyReport(request.getNotifyDailyReport());
        }
        if (request.getNotifyEmergencyVisit() != null) {
            user.setNotifyEmergencyVisit(request.getNotifyEmergencyVisit());
        }
        if (request.getNotifyRxAudit() != null) {
            user.setNotifyRxAudit(request.getNotifyRxAudit());
        }

        User saved = userRepository.save(user);

        return com.nisschay.cms.dto.res.UserProfileResponse.builder()
                .id(saved.getId())
                .name(saved.getName())
                .email(saved.getEmail())
                .phone(saved.getPhone())
                .role(saved.getRole().getId())
                .clinicId(saved.getClinic() != null ? saved.getClinic().getId() : null)
                .clinicName(saved.getClinic() != null ? saved.getClinic().getName() : "Nisschay Clinic")
                .profilePictureUrl(saved.getProfilePictureUrl())
                .notifyDailyReport(saved.getNotifyDailyReport() != null ? saved.getNotifyDailyReport() : true)
                .notifyEmergencyVisit(saved.getNotifyEmergencyVisit() != null ? saved.getNotifyEmergencyVisit() : true)
                .notifyRxAudit(saved.getNotifyRxAudit() != null ? saved.getNotifyRxAudit() : false)
                .build();
    }

    @Transactional
    public void deleteStaffMember(UUID clinicId, UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));

        if (!user.getClinic().getId().equals(clinicId)) {
            throw new IllegalArgumentException("Unauthorized to delete user from another clinic");
        }

        userRepository.delete(user);
    }

    @Transactional
    public void resetStaffPassword(UUID clinicId, UUID userId, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));

        if (!user.getClinic().getId().equals(clinicId)) {
            throw new IllegalArgumentException("Unauthorized to modify user from another clinic");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public com.nisschay.cms.dto.res.UserProfileResponse getStaffMemberById(UUID clinicId, UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));

        if (!user.getClinic().getId().equals(clinicId)) {
            throw new IllegalArgumentException("Unauthorized to access user from another clinic");
        }

        return com.nisschay.cms.dto.res.UserProfileResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .employeeId(user.getEmployeeId() != null ? user.getEmployeeId() : ("EMP-" + user.getId().toString().substring(0, 8).toUpperCase()))
                .department(user.getDepartment())
                .shiftTiming(user.getShiftTiming())
                .deskNumber(user.getDeskNumber())
                .bloodGroup(user.getBloodGroup())
                .aadhaarNumber(user.getAadhaarNumber())
                .panNumber(user.getPanNumber())
                .residentialAddress(user.getResidentialAddress())
                .city(user.getCity())
                .state(user.getState())
                .pincode(user.getPincode())
                .policeVerificationStatus(user.getPoliceVerificationStatus())
                .councilRegistrationNumber(user.getCouncilRegistrationNumber())
                .councilName(user.getCouncilName())
                .hepatitisBStatus(user.getHepatitisBStatus())
                .bankAccountNumber(user.getBankAccountNumber())
                .bankIfscCode(user.getBankIfscCode())
                .bankName(user.getBankName())
                .emergencyContactName(user.getEmergencyContactName())
                .emergencyContactPhone(user.getEmergencyContactPhone())
                .emergencyContactRelationship(user.getEmergencyContactRelationship())
                .role(user.getRole() != null ? user.getRole().getId() : "STAFF")
                .clinicId(user.getClinic() != null ? user.getClinic().getId() : null)
                .clinicName(user.getClinic() != null ? user.getClinic().getName() : "Nisschay Clinic")
                .profilePictureUrl(user.getProfilePictureUrl())
                .active(user.getActive() != null ? user.getActive() : true)
                .build();
    }

    @Transactional
    public com.nisschay.cms.dto.res.UserProfileResponse updateStaffMemberDetails(UUID clinicId, UUID userId, com.nisschay.cms.dto.req.StaffCreateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));

        if (!user.getClinic().getId().equals(clinicId)) {
            throw new IllegalArgumentException("Unauthorized to modify user from another clinic");
        }

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            user.setName(request.getName().trim());
        }
        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            String newEmail = request.getEmail().trim().toLowerCase();
            if (!newEmail.equalsIgnoreCase(user.getEmail())) {
                if (userRepository.existsByEmail(newEmail)) {
                    throw new IllegalArgumentException("Email is already in use by another account");
                }
                user.setEmail(newEmail);
            }
        }
        if (request.getPassword() != null && !request.getPassword().trim().isEmpty() && request.getPassword().length() >= 6) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword().trim()));
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone().trim());
        }
        if (request.getRoleId() != null) {
            Role role = roleRepository.findById(request.getRoleId()).orElse(user.getRole());
            user.setRole(role);
        }
        if (request.getActive() != null) {
            user.setActive(request.getActive());
        }
        if (request.getDepartment() != null) user.setDepartment(request.getDepartment());
        if (request.getShiftTiming() != null) user.setShiftTiming(request.getShiftTiming());
        if (request.getDeskNumber() != null) user.setDeskNumber(request.getDeskNumber());
        if (request.getBloodGroup() != null) user.setBloodGroup(request.getBloodGroup());
        if (request.getAadhaarNumber() != null) user.setAadhaarNumber(request.getAadhaarNumber());
        if (request.getPanNumber() != null) user.setPanNumber(request.getPanNumber());
        if (request.getResidentialAddress() != null) user.setResidentialAddress(request.getResidentialAddress());
        if (request.getCity() != null) user.setCity(request.getCity());
        if (request.getState() != null) user.setState(request.getState());
        if (request.getPincode() != null) user.setPincode(request.getPincode());
        if (request.getPoliceVerificationStatus() != null) user.setPoliceVerificationStatus(request.getPoliceVerificationStatus());
        if (request.getCouncilRegistrationNumber() != null) user.setCouncilRegistrationNumber(request.getCouncilRegistrationNumber());
        if (request.getCouncilName() != null) user.setCouncilName(request.getCouncilName());
        if (request.getHepatitisBStatus() != null) user.setHepatitisBStatus(request.getHepatitisBStatus());
        if (request.getBankAccountNumber() != null) user.setBankAccountNumber(request.getBankAccountNumber());
        if (request.getBankIfscCode() != null) user.setBankIfscCode(request.getBankIfscCode());
        if (request.getBankName() != null) user.setBankName(request.getBankName());
        if (request.getEmergencyContactName() != null) user.setEmergencyContactName(request.getEmergencyContactName());
        if (request.getEmergencyContactPhone() != null) user.setEmergencyContactPhone(request.getEmergencyContactPhone());
        if (request.getEmergencyContactRelationship() != null) user.setEmergencyContactRelationship(request.getEmergencyContactRelationship());

        User saved = userRepository.save(user);
        return getStaffMemberById(clinicId, saved.getId());
    }
}
