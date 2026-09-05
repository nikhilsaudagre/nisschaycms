package com.nisschay.cms.dto.res;

import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BillingLedgerEntryResponse {

    private UUID id;
    private UUID clinicId;
    private UUID patientId;
    private String patientName;
    private String encounterType;
    private String encounterId;
    private String entryType; // DEBIT (Charge), CREDIT (Payment)
    private String category;
    private String description;
    private BigDecimal unitPrice;
    private Integer quantity;
    private BigDecimal totalAmount;
    private String paymentMode;
    private String receiptNumber;
    private String recordedBy;
    private String notes;
    private OffsetDateTime createdAt;
    private String formattedCreatedAt;
}
