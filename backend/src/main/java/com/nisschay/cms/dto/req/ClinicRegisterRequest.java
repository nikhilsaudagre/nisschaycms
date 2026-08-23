package com.nisschay.cms.dto.req;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ClinicRegisterRequest {

    // Clinic Info
    @NotBlank(message = "Clinic name is required")
    @Size(min = 2, max = 100, message = "Clinic name must be between 2 and 100 characters")
    private String clinicName;

    @NotBlank(message = "Clinic email is required")
    @Email(message = "Invalid clinic email format")
    private String clinicEmail;

    @NotBlank(message = "Clinic phone is required")
    private String clinicPhone;

    private String clinicAddress;

    // Admin User Info
    @NotBlank(message = "Admin name is required")
    @Size(min = 2, max = 100, message = "Admin name must be between 2 and 100 characters")
    private String adminName;

    @NotBlank(message = "Admin email is required")
    @Email(message = "Invalid admin email format")
    private String adminEmail;

    @NotBlank(message = "Admin password is required")
    @Size(min = 6, max = 40, message = "Password must be between 6 and 40 characters")
    private String adminPassword;

    private String confirmPassword;

    private String adminPhone;
}
