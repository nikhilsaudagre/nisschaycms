package com.nisschay.cms.dto.res;

import com.nisschay.cms.entity.DoctorRoundLogEntity;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InpatientBedDetailResponse {
    private UUID id;
    private UUID clinicId;
    private String wardName;
    private String bedNumber;
    private BigDecimal dailyRate;
    private String status; // AVAILABLE, OCCUPIED, DISCHARGE_PLANNED, CLEANING
    private UUID currentPatientId;
    private String currentPatientName;
    private UUID currentAdmissionId;
    private String ipdNumber;
    private LocalDateTime admissionDate;
    private String consultantDoctorName;
    private String admittingDiagnosis;
    private List<DoctorRoundLogEntity> dailyLogs;
}
