package com.nisschay.cms.dto.req;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InpatientAdmitRequest {

    @NotNull(message = "Patient ID is required")
    private UUID patientId;

    @NotBlank(message = "Patient Name is required")
    private String patientName;

    @NotNull(message = "Bed ID is required")
    private UUID bedId;

    private UUID doctorId;
    private String consultantDoctorName;
    private String admittingDiagnosis;
}
