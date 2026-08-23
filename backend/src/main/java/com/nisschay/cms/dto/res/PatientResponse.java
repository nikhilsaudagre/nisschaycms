package com.nisschay.cms.dto.res;

import com.nisschay.cms.entity.Patient;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatientResponse {
    private UUID id;
    private UUID clinicId;
    private String name;
    private String gender;
    private LocalDate dateOfBirth;
    private String phone;
    private String email;
    private String bloodGroup;
    private String address;
    private String city;
    private String pincode;
    private String governmentId;
    private Double heightCm;
    private Double weightKg;
    private String currentMedications;
    private String referralSource;
    private String insuranceProvider;
    private String insurancePolicyNo;
    private String allergies;
    private String medicalHistory;
    private String emergencyContactName;
    private String emergencyContactPhone;
    private Boolean active;
    private OffsetDateTime createdAt;

    public static PatientResponse build(Patient patient) {
        return PatientResponse.builder()
                .id(patient.getId())
                .clinicId(patient.getClinic().getId())
                .name(patient.getName())
                .gender(patient.getGender() != null ? patient.getGender() : "UNSPECIFIED")
                .dateOfBirth(patient.getDateOfBirth())
                .phone(patient.getPhone())
                .email(patient.getEmail())
                .bloodGroup(patient.getBloodGroup())
                .address(patient.getAddress())
                .city(patient.getCity())
                .pincode(patient.getPincode())
                .governmentId(patient.getGovernmentId())
                .heightCm(patient.getHeightCm())
                .weightKg(patient.getWeightKg())
                .currentMedications(patient.getCurrentMedications())
                .referralSource(patient.getReferralSource())
                .insuranceProvider(patient.getInsuranceProvider())
                .insurancePolicyNo(patient.getInsurancePolicyNo())
                .allergies(patient.getAllergies())
                .medicalHistory(patient.getMedicalHistory())
                .emergencyContactName(patient.getEmergencyContactName())
                .emergencyContactPhone(patient.getEmergencyContactPhone())
                .active(patient.getActive())
                .createdAt(patient.getCreatedAt())
                .build();
    }
}
