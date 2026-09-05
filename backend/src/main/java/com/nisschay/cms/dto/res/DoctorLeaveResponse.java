package com.nisschay.cms.dto.res;

import com.nisschay.cms.entity.DoctorLeaveEntity;
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
public class DoctorLeaveResponse {

    private UUID id;
    private UUID clinicId;
    private UUID doctorId;
    private String doctorName;
    private LocalDate startDate;
    private LocalDate endDate;
    private String reason;
    private UUID substituteDoctorId;
    private String substituteDoctorName;
    private String status;
    private OffsetDateTime createdAt;

    public static DoctorLeaveResponse fromEntity(DoctorLeaveEntity entity) {
        if (entity == null) return null;
        return DoctorLeaveResponse.builder()
                .id(entity.getId())
                .clinicId(entity.getClinicId())
                .doctorId(entity.getDoctorId())
                .doctorName(entity.getDoctorName())
                .startDate(entity.getStartDate())
                .endDate(entity.getEndDate())
                .reason(entity.getReason())
                .substituteDoctorId(entity.getSubstituteDoctorId())
                .substituteDoctorName(entity.getSubstituteDoctorName())
                .status(entity.getStatus())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
