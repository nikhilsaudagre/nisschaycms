package com.nisschay.cms.dto.req;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConsultationRequest {
    private String symptoms;
    private String diagnosis;
    private String prescription;
    private String notes;
    private Integer bpSystolic;
    private Integer bpDiastolic;
    private Integer pulse;
    private Double temperature;
    private Integer spo2;
    private Double weight;
    private Double height;
    private java.time.LocalDate followUpDate;
}
