package com.nisschay.cms.dto.req;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DoctorRoundRequest {

    @NotNull(message = "Admission ID is required")
    private UUID admissionId;

    private UUID doctorId;
    private String doctorName;
    private String temperature;
    private String bloodPressure;
    private String pulse;
    private String spo2;
    private String respiratoryRate;
    private String clinicalNotes;
    private String treatmentOrders;
}
