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

import java.time.LocalDate;
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
        LocalDate dob = request.getDateOfBirth() != null ? request.getDateOfBirth() : java.time.LocalDate.now().minusYears(30);

        long count = patientRepository.countByClinicId(clinicId);
        String generatedPid = String.format("PID-%d-%04d", LocalDate.now().getYear(), count + 1);

        Patient patient = Patient.builder()
                .clinic(clinic)
                .pid(generatedPid)
                .name(patientName)
                .gender(StringUtils.hasText(request.getGender()) ? request.getGender() : "UNSPECIFIED")
                .dateOfBirth(dob)
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
        if (StringUtils.hasText(request.getGender())) {
            patient.setGender(request.getGender());
        }
        if (request.getDateOfBirth() != null) {
            patient.setDateOfBirth(request.getDateOfBirth());
        }
        if (StringUtils.hasText(request.getPhone())) {
            patient.setPhone(request.getPhone());
        }
        if (request.getEmail() != null) patient.setEmail(request.getEmail());
        if (request.getBloodGroup() != null) patient.setBloodGroup(request.getBloodGroup());
        if (request.getAddress() != null) patient.setAddress(request.getAddress());
        if (request.getCity() != null) patient.setCity(request.getCity());
        if (request.getPincode() != null) patient.setPincode(request.getPincode());
        if (request.getGovernmentId() != null) patient.setGovernmentId(request.getGovernmentId());
        if (request.getHeightCm() != null) patient.setHeightCm(request.getHeightCm());
        if (request.getWeightKg() != null) patient.setWeightKg(request.getWeightKg());
        if (request.getCurrentMedications() != null) patient.setCurrentMedications(request.getCurrentMedications());
        if (request.getReferralSource() != null) patient.setReferralSource(request.getReferralSource());
        if (request.getInsuranceProvider() != null) patient.setInsuranceProvider(request.getInsuranceProvider());
        if (request.getInsurancePolicyNo() != null) patient.setInsurancePolicyNo(request.getInsurancePolicyNo());
        if (request.getAllergies() != null) patient.setAllergies(request.getAllergies());
        if (request.getMedicalHistory() != null) patient.setMedicalHistory(request.getMedicalHistory());
        if (request.getEmergencyContactName() != null) patient.setEmergencyContactName(request.getEmergencyContactName());
        if (request.getEmergencyContactPhone() != null) patient.setEmergencyContactPhone(request.getEmergencyContactPhone());

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
