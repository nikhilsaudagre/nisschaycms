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

        User user = User.builder()
                .clinic(clinic)
                .role(role)
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

        return createUser(clinic, request.getRoleId(), request.getName(), request.getEmail(), request.getPassword(), request.getPhone());
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
                .clinicId(saved.getClinic().getId())
                .clinicName(saved.getClinic().getName())
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

        User saved = userRepository.save(user);

        return com.nisschay.cms.dto.res.UserProfileResponse.builder()
                .id(saved.getId())
                .name(saved.getName())
                .email(saved.getEmail())
                .phone(saved.getPhone())
                .role(saved.getRole().getId())
                .clinicId(saved.getClinic().getId())
                .clinicName(saved.getClinic().getName())
                .profilePictureUrl(saved.getProfilePictureUrl())
                .build();
    }
}
