package com.nisschay.cms.dto.req;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BillingPaymentRequest {

    @NotNull(message = "Patient ID is required")
    private UUID patientId;

    private String encounterType; // OPD, IPD, GENERAL

    private String encounterId; // Bed Number or IPD Stay ID

    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be positive")
    private BigDecimal amount;

    private String paymentMode; // CASH, UPI, CARD, INSURANCE_TPA

    private String receiptNumber;

    private String notes;

    private String recordedBy;
}
