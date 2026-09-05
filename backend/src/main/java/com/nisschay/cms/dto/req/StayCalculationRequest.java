package com.nisschay.cms.dto.req;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StayCalculationRequest {

    private String admissionDate;
    private String dischargeDate;
    private BigDecimal dailyRate;
    private List<BigDecimal> serviceAmounts;
    private List<BigDecimal> advanceAmounts;
}
