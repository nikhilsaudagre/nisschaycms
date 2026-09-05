package com.nisschay.cms.service;

import com.nisschay.cms.dto.req.DoctorLeaveRequest;
import com.nisschay.cms.dto.req.DoctorProfileRequest;
import com.nisschay.cms.dto.req.DoctorRegisterRequest;
import com.nisschay.cms.dto.res.DoctorLeaveResponse;
import com.nisschay.cms.dto.res.DoctorResponse;
import com.nisschay.cms.entity.Clinic;
import com.nisschay.cms.entity.DoctorLeaveEntity;
import com.nisschay.cms.entity.DoctorProfile;
import com.nisschay.cms.entity.Role;
import com.nisschay.cms.entity.User;
import com.nisschay.cms.exception.ResourceNotFoundException;
import com.nisschay.cms.repository.ClinicRepository;
import com.nisschay.cms.repository.DoctorLeaveRepository;
import com.nisschay.cms.repository.DoctorProfileRepository;
import com.nisschay.cms.repository.RoleRepository;
import com.nisschay.cms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DoctorService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final DoctorProfileRepository doctorProfileRepository;
    private final DoctorLeaveRepository doctorLeaveRepository;
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

        long count = userRepository.countByClinicId(clinic.getId());
        String generatedDocId = String.format("DOC-%d-%04d", java.time.LocalDate.now().getYear(), count + 1);

        User user = User.builder()
                .clinic(clinic)
                .role(role)
                .employeeId(generatedDocId)
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
                .medicalCouncil(request.getMedicalCouncil())
                .registrationYear(request.getRegistrationYear())
                .languagesSpoken(request.getLanguagesSpoken())
                .gender(request.getGender())
                .subSpecialization(request.getSubSpecialization())
                .digitalSignature(request.getDigitalSignature())
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
        profile.setMedicalCouncil(request.getMedicalCouncil());
        profile.setRegistrationYear(request.getRegistrationYear());
        profile.setLanguagesSpoken(request.getLanguagesSpoken());
        profile.setGender(request.getGender());
        profile.setSubSpecialization(request.getSubSpecialization());
        profile.setDigitalSignature(request.getDigitalSignature());
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

    @Transactional(readOnly = true)
    public DoctorResponse getDoctorById(UUID clinicId, UUID doctorId) {
        User user = userRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found"));

        if (!user.getClinic().getId().equals(clinicId)) {
            throw new IllegalArgumentException("Doctor does not belong to this clinic");
        }

        DoctorProfile profile = doctorProfileRepository.findById(doctorId).orElse(null);
        return DoctorResponse.build(user, profile);
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

    @Transactional
    public DoctorLeaveResponse applyDoctorLeave(UUID clinicId, UUID doctorId, DoctorLeaveRequest request) {
        User doctor = userRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found"));

        if (!doctor.getClinic().getId().equals(clinicId)) {
            throw new IllegalArgumentException("Doctor does not belong to this clinic");
        }

        if (request.getStartDate().isAfter(request.getEndDate())) {
            throw new IllegalArgumentException("Leave start date cannot be after end date");
        }

        String substituteName = null;
        if (request.getSubstituteDoctorId() != null) {
            User sub = userRepository.findById(request.getSubstituteDoctorId()).orElse(null);
            if (sub != null) substituteName = sub.getName();
        }

        DoctorLeaveEntity leave = DoctorLeaveEntity.builder()
                .clinicId(clinicId)
                .doctorId(doctorId)
                .doctorName(doctor.getName())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .reason(request.getReason())
                .substituteDoctorId(request.getSubstituteDoctorId())
                .substituteDoctorName(substituteName)
                .status("APPROVED")
                .build();

        DoctorLeaveEntity saved = doctorLeaveRepository.save(leave);
        return DoctorLeaveResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public List<DoctorLeaveResponse> getDoctorLeaves(UUID clinicId, UUID doctorId) {
        return doctorLeaveRepository.findByClinicIdAndDoctorIdOrderByStartDateDesc(clinicId, doctorId)
                .stream()
                .map(DoctorLeaveResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DoctorLeaveResponse> getUpcomingLeaves(UUID clinicId) {
        return doctorLeaveRepository.findUpcomingLeavesByClinic(clinicId, LocalDate.now())
                .stream()
                .map(DoctorLeaveResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public void cancelDoctorLeave(UUID clinicId, UUID doctorId, UUID leaveId) {
        DoctorLeaveEntity leave = doctorLeaveRepository.findById(leaveId)
                .orElseThrow(() -> new ResourceNotFoundException("Leave record not found"));

        if (!leave.getClinicId().equals(clinicId) || !leave.getDoctorId().equals(doctorId)) {
            throw new IllegalArgumentException("Leave record does not belong to this doctor");
        }

        leave.setStatus("CANCELLED");
        doctorLeaveRepository.save(leave);
    }

    @Transactional(readOnly = true)
    public boolean isDoctorOnLeave(UUID clinicId, UUID doctorId, LocalDate date) {
        List<DoctorLeaveEntity> activeLeaves = doctorLeaveRepository.findActiveLeaveOnDate(clinicId, doctorId, date);
        return !activeLeaves.isEmpty();
    }
}
