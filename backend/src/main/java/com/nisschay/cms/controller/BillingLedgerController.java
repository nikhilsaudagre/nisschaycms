package com.nisschay.cms.controller;

import com.nisschay.cms.dto.req.BillingLedgerEntryRequest;
import com.nisschay.cms.dto.req.BillingPaymentRequest;
import com.nisschay.cms.dto.req.DischargeSettleRequest;
import com.nisschay.cms.dto.res.BillingLedgerEntryResponse;
import com.nisschay.cms.dto.res.PatientLedgerSummaryResponse;
import com.nisschay.cms.security.UserDetailsImpl;
import com.nisschay.cms.service.BillingLedgerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/billing/ledger")
@RequiredArgsConstructor
public class BillingLedgerController {

    private final BillingLedgerService billingLedgerService;

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<PatientLedgerSummaryResponse> getPatientLedger(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID patientId
    ) {
        UUID clinicId = userDetails != null ? userDetails.getClinicId() : null;
        PatientLedgerSummaryResponse response = billingLedgerService.getPatientLedger(clinicId, patientId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/entry")
    public ResponseEntity<BillingLedgerEntryResponse> addLedgerEntry(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody BillingLedgerEntryRequest request
    ) {
        UUID clinicId = userDetails != null ? userDetails.getClinicId() : null;
        BillingLedgerEntryResponse response = billingLedgerService.addEntry(clinicId, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/payment")
    public ResponseEntity<BillingLedgerEntryResponse> recordPayment(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody BillingPaymentRequest request
    ) {
        UUID clinicId = userDetails != null ? userDetails.getClinicId() : null;
        BillingLedgerEntryResponse response = billingLedgerService.recordPayment(clinicId, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/settle-discharge")
    public ResponseEntity<PatientLedgerSummaryResponse> settleDischarge(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody DischargeSettleRequest request
    ) {
        UUID clinicId = userDetails != null ? userDetails.getClinicId() : null;
        PatientLedgerSummaryResponse response = billingLedgerService.settleDischarge(clinicId, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/calculate-stay")
    public ResponseEntity<com.nisschay.cms.dto.res.StayCalculationResponse> calculateStay(
            @RequestBody com.nisschay.cms.dto.req.StayCalculationRequest request
    ) {
        com.nisschay.cms.dto.res.StayCalculationResponse response = billingLedgerService.calculateStayFinancials(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/calculate-pos")
    public ResponseEntity<com.nisschay.cms.dto.res.PosCalculationResponse> calculatePos(
            @RequestBody com.nisschay.cms.dto.req.PosCalculationRequest request
    ) {
        com.nisschay.cms.dto.res.PosCalculationResponse response = billingLedgerService.calculatePosFinancials(request);
        return ResponseEntity.ok(response);
    }
}

