package com.nisschay.cms.dto.req;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class DoctorRegisterRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;

    private String phone;

    private String registrationNumber;

    @NotBlank(message = "Specialization is required")
    private String specialization;

    @NotNull(message = "Consultation fee is required")
    private BigDecimal consultationFee;

    private BigDecimal followUpFee;

    private BigDecimal emergencyFee;

    private String qualification;

    private Integer experienceYears;

    private String roomNumber;

    private Integer slotDuration;

    private String biography;

    private String availabilitySchedule;
}
