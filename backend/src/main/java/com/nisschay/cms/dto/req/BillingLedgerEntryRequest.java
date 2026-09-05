package com.nisschay.cms.dto.req;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BillingLedgerEntryRequest {

    @NotNull(message = "Patient ID is required")
    private UUID patientId;

    @NotBlank(message = "Encounter type is required (OPD, IPD, LAB, GENERAL)")
    private String encounterType;

    private String encounterId;

    @NotBlank(message = "Entry type is required (DEBIT, CREDIT)")
    private String entryType;

    @NotBlank(message = "Category is required")
    private String category;

    @NotBlank(message = "Description is required")
    private String description;

    private BigDecimal unitPrice;

    private Integer quantity;

    @NotNull(message = "Total amount is required")
    private BigDecimal totalAmount;

    private String paymentMode;

    private String receiptNumber;

    private String recordedBy;

    private String notes;
}
