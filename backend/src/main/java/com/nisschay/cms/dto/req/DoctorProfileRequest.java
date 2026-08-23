package com.nisschay.cms.dto.req;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class DoctorProfileRequest {

    @NotBlank(message = "Name is required")
    private String name;

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
