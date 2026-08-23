package com.nisschay.cms.service;

import com.nisschay.cms.dto.req.DoctorProfileRequest;
import com.nisschay.cms.dto.req.DoctorRegisterRequest;
import com.nisschay.cms.dto.res.DoctorResponse;
import com.nisschay.cms.entity.Clinic;
import com.nisschay.cms.entity.DoctorProfile;
import com.nisschay.cms.entity.Role;
import com.nisschay.cms.entity.User;
import com.nisschay.cms.exception.ResourceNotFoundException;
import com.nisschay.cms.repository.ClinicRepository;
import com.nisschay.cms.repository.DoctorProfileRepository;
import com.nisschay.cms.repository.RoleRepository;
import com.nisschay.cms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DoctorService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final DoctorProfileRepository doctorProfileRepository;
    private final ClinicRepository clinicRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public DoctorResponse registerDoctor(UUID clinicId, DoctorRegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email is already in use");
        }

        Clinic clinic = clinicRepository.findById(clinicId)
                .orElseThrow(() -> new ResourceNotFoundException("Clinic not found"));

        Role role = roleRepository.findById("DOCTOR")
                .orElseThrow(() -> new ResourceNotFoundException("DOCTOR role not found"));

        User user = User.builder()
                .clinic(clinic)
                .role(role)
                .name(request.getName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .active(true)
                .build();

        User savedUser = userRepository.save(user);

        DoctorProfile profile = DoctorProfile.builder()
                .id(savedUser.getId())
                .user(savedUser)
                .registrationNumber(request.getRegistrationNumber())
                .specialization(request.getSpecialization())
                .consultationFee(request.getConsultationFee())
                .followUpFee(request.getFollowUpFee() != null ? request.getFollowUpFee() : request.getConsultationFee())
                .emergencyFee(request.getEmergencyFee() != null ? request.getEmergencyFee() : request.getConsultationFee())
                .qualification(request.getQualification())
                .experienceYears(request.getExperienceYears())
                .roomNumber(request.getRoomNumber())
                .slotDuration(request.getSlotDuration() != null ? request.getSlotDuration() : 15)
                .biography(request.getBiography())
                .availabilitySchedule(request.getAvailabilitySchedule())
                .build();

        DoctorProfile savedProfile = doctorProfileRepository.save(profile);

        return DoctorResponse.build(savedUser, savedProfile);
    }

    @Transactional
    public DoctorResponse updateDoctorProfile(UUID clinicId, UUID doctorId, DoctorProfileRequest request) {
        User user = userRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!user.getClinic().getId().equals(clinicId)) {
            throw new IllegalArgumentException("User does not belong to this clinic");
        }

        user.setName(request.getName());
        user.setPhone(request.getPhone());
        User savedUser = userRepository.save(user);

        DoctorProfile profile = doctorProfileRepository.findById(doctorId)
                .orElseGet(() -> DoctorProfile.builder()
                        .id(doctorId)
                        .user(savedUser)
                        .build());

        profile.setRegistrationNumber(request.getRegistrationNumber());
        profile.setSpecialization(request.getSpecialization());
        profile.setConsultationFee(request.getConsultationFee());
        if (request.getFollowUpFee() != null) {
            profile.setFollowUpFee(request.getFollowUpFee());
        }
        if (request.getEmergencyFee() != null) {
            profile.setEmergencyFee(request.getEmergencyFee());
        }
        profile.setQualification(request.getQualification());
        profile.setExperienceYears(request.getExperienceYears());
        profile.setRoomNumber(request.getRoomNumber());
        if (request.getSlotDuration() != null) {
            profile.setSlotDuration(request.getSlotDuration());
        }
        profile.setBiography(request.getBiography());
        profile.setAvailabilitySchedule(request.getAvailabilitySchedule());

        DoctorProfile savedProfile = doctorProfileRepository.save(profile);

        return DoctorResponse.build(savedUser, savedProfile);
    }

    @Transactional(readOnly = true)
    public List<DoctorResponse> getDoctorsByClinic(UUID clinicId) {
        List<User> users = userRepository.findByClinicIdAndRoleIdIn(clinicId, List.of("DOCTOR", "ADMIN"));
        return users.stream()
                .map(u -> {
                    DoctorProfile profile = doctorProfileRepository.findById(u.getId()).orElse(null);
                    return DoctorResponse.build(u, profile);
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public DoctorResponse toggleDoctorStatus(UUID clinicId, UUID doctorId) {
        User user = userRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!user.getClinic().getId().equals(clinicId)) {
            throw new IllegalArgumentException("User does not belong to this clinic");
        }

        user.setActive(!user.getActive());
        User savedUser = userRepository.save(user);

        DoctorProfile profile = doctorProfileRepository.findById(doctorId).orElse(null);
        return DoctorResponse.build(savedUser, profile);
    }
}
