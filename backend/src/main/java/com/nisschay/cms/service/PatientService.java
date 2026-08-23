package com.nisschay.cms.service;

import com.nisschay.cms.dto.req.PatientRequest;
import com.nisschay.cms.dto.res.PatientResponse;
import com.nisschay.cms.entity.Clinic;
import com.nisschay.cms.entity.Patient;
import com.nisschay.cms.exception.ResourceNotFoundException;
import com.nisschay.cms.repository.ClinicRepository;
import com.nisschay.cms.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PatientService {

    private final PatientRepository patientRepository;
    private final ClinicRepository clinicRepository;

    @Transactional
    public PatientResponse createPatient(UUID clinicId, PatientRequest request) {
        Clinic clinic = clinicRepository.findById(clinicId)
                .orElseThrow(() -> new ResourceNotFoundException("Clinic not found with id: " + clinicId));

        String patientName = StringUtils.hasText(request.getName()) ? request.getName().trim() : "Patient (" + request.getPhone() + ")";

        Patient patient = Patient.builder()
                .clinic(clinic)
                .name(patientName)
                .gender(StringUtils.hasText(request.getGender()) ? request.getGender() : "UNSPECIFIED")
                .dateOfBirth(request.getDateOfBirth())
                .phone(request.getPhone())
                .email(request.getEmail())
                .bloodGroup(request.getBloodGroup())
                .address(request.getAddress())
                .city(request.getCity())
                .pincode(request.getPincode())
                .governmentId(request.getGovernmentId())
                .heightCm(request.getHeightCm())
                .weightKg(request.getWeightKg())
                .currentMedications(request.getCurrentMedications())
                .referralSource(request.getReferralSource())
                .insuranceProvider(request.getInsuranceProvider())
                .insurancePolicyNo(request.getInsurancePolicyNo())
                .allergies(request.getAllergies())
                .medicalHistory(request.getMedicalHistory())
                .emergencyContactName(request.getEmergencyContactName())
                .emergencyContactPhone(request.getEmergencyContactPhone())
                .active(true)
                .build();

        Patient saved = patientRepository.save(patient);
        return PatientResponse.build(saved);
    }

    @Transactional
    public PatientResponse updatePatient(UUID clinicId, UUID patientId, PatientRequest request) {
        Patient patient = patientRepository.findByIdAndClinicId(patientId, clinicId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found in this clinic"));

        String patientName = StringUtils.hasText(request.getName()) ? request.getName().trim() : "Patient (" + request.getPhone() + ")";

        patient.setName(patientName);
        patient.setGender(StringUtils.hasText(request.getGender()) ? request.getGender() : "UNSPECIFIED");
        patient.setDateOfBirth(request.getDateOfBirth());
        patient.setPhone(request.getPhone());
        patient.setEmail(request.getEmail());
        patient.setBloodGroup(request.getBloodGroup());
        patient.setAddress(request.getAddress());
        patient.setCity(request.getCity());
        patient.setPincode(request.getPincode());
        patient.setGovernmentId(request.getGovernmentId());
        patient.setHeightCm(request.getHeightCm());
        patient.setWeightKg(request.getWeightKg());
        patient.setCurrentMedications(request.getCurrentMedications());
        patient.setReferralSource(request.getReferralSource());
        patient.setInsuranceProvider(request.getInsuranceProvider());
        patient.setInsurancePolicyNo(request.getInsurancePolicyNo());
        patient.setAllergies(request.getAllergies());
        patient.setMedicalHistory(request.getMedicalHistory());
        patient.setEmergencyContactName(request.getEmergencyContactName());
        patient.setEmergencyContactPhone(request.getEmergencyContactPhone());

        Patient saved = patientRepository.save(patient);
        return PatientResponse.build(saved);
    }

    @Transactional(readOnly = true)
    public PatientResponse getPatientById(UUID clinicId, UUID patientId) {
        Patient patient = patientRepository.findByIdAndClinicId(patientId, clinicId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found in this clinic"));
        return PatientResponse.build(patient);
    }

    @Transactional(readOnly = true)
    public Page<PatientResponse> searchPatients(UUID clinicId, String search, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("name").ascending());
        Page<Patient> patientsPage;

        if (StringUtils.hasText(search)) {
            patientsPage = patientRepository.searchPatients(clinicId, search.trim(), pageable);
        } else {
            patientsPage = patientRepository.findByClinicId(clinicId, pageable);
        }

        return patientsPage.map(PatientResponse::build);
    }

    @Transactional
    public PatientResponse togglePatientActiveStatus(UUID clinicId, UUID patientId) {
        Patient patient = patientRepository.findByIdAndClinicId(patientId, clinicId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found in this clinic"));

        patient.setActive(!patient.getActive());
        Patient saved = patientRepository.save(patient);
        return PatientResponse.build(saved);
    }

    @Transactional(readOnly = true)
    public long getNewPatientsCountToday(UUID clinicId) {
        java.time.OffsetDateTime todayStart = java.time.OffsetDateTime.now(java.time.ZoneId.systemDefault())
                .with(java.time.LocalTime.MIN);
        return patientRepository.countByClinicIdAndCreatedAtGreaterThanEqual(clinicId, todayStart);
    }
}
