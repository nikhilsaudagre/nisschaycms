package com.nisschay.cms.dto.req;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class PatientRequest {

    // Only Phone is mandatory!
    @NotBlank(message = "Mobile phone number is mandatory")
    @Size(min = 10, max = 15, message = "Phone number must be between 10 and 15 digits")
    private String phone;

    private String name;

    private String gender; // MALE, FEMALE, OTHER

    private LocalDate dateOfBirth;

    @Email(message = "Invalid email format")
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
}
