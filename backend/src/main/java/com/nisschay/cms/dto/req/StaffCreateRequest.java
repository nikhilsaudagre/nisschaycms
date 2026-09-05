package com.nisschay.cms.dto.req;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class StaffCreateRequest {
    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Password is required")
    private String password;

    private String phone;

    @NotBlank(message = "Role is required")
    private String roleId; // RECEPTIONIST, DOCTOR, SUB_ADMIN, ADMIN, NURSE, PHARMACIST, etc.

    private String department;
    private String shiftTiming;
    private String deskNumber;
    private String bloodGroup;
    private String aadhaarNumber;
    private String panNumber;
    private String residentialAddress;
    private String city;
    private String state;
    private String pincode;
    private String policeVerificationStatus;
    private String councilRegistrationNumber;
    private String councilName;
    private String hepatitisBStatus;
    private String bankAccountNumber;
    private String bankIfscCode;
    private String bankName;
    private String emergencyContactName;
    private String emergencyContactPhone;
    private String emergencyContactRelationship;
    private Boolean active;
}
