package com.nisschay.cms.dto.req;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DischargeSettleRequest {

    @NotNull(message = "Patient ID is required")
    private UUID patientId;

    private String encounterId; // IPD Bed Number or Stay ID

    private BigDecimal settlementAmount;

    private String paymentMode; // CASH, UPI, CARD, INSURANCE_TPA

    private String receiptNumber;

    private String notes;

    private String settledBy;
}
