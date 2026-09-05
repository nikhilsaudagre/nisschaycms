package com.nisschay.cms.dto.res;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StayCalculationResponse {

    private long stayDays;
    private BigDecimal dailyRate;
    private BigDecimal roomCharges;
    private BigDecimal servicesTotal;
    private BigDecimal grossTotal;
    private BigDecimal advancesPaid;
    private BigDecimal balanceDue;
    private String paymentStatus; // PAID, PARTIAL, UNPAID
}
