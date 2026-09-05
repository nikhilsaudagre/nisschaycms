package com.nisschay.cms.dto.res;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PatientLedgerSummaryResponse {

    private UUID patientId;
    private String patientName;
    private String patientPhone;
    private BigDecimal totalIncurred;
    private BigDecimal totalPaid;
    private BigDecimal netOutstanding;
    private String status; // SETTLED, PARTIAL, PENDING
    private List<BillingLedgerEntryResponse> charges;
    private List<BillingLedgerEntryResponse> receipts;
    private List<BillingLedgerEntryResponse> allEntries;
}
