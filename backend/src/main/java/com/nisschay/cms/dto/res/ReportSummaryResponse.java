package com.nisschay.cms.dto.res;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportSummaryResponse {
    private long totalConsultations;
    private BigDecimal totalRevenue;
    private double averageConsultationFee;
    private long activePatients;
}
