package com.nisschay.cms.service;

import com.nisschay.cms.dto.req.BillingLedgerEntryRequest;
import com.nisschay.cms.dto.req.BillingPaymentRequest;
import com.nisschay.cms.dto.req.DischargeSettleRequest;
import com.nisschay.cms.dto.res.BillingLedgerEntryResponse;
import com.nisschay.cms.dto.res.PatientLedgerSummaryResponse;
import com.nisschay.cms.entity.BillingLedgerEntry;
import com.nisschay.cms.entity.Clinic;
import com.nisschay.cms.entity.Patient;
import com.nisschay.cms.exception.ResourceNotFoundException;
import com.nisschay.cms.repository.BillingLedgerRepository;
import com.nisschay.cms.repository.ClinicRepository;
import com.nisschay.cms.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BillingLedgerService {

    private final BillingLedgerRepository billingLedgerRepository;
    private final PatientRepository patientRepository;
    private final ClinicRepository clinicRepository;

    @Transactional
    public BillingLedgerEntryResponse addEntry(UUID clinicId, BillingLedgerEntryRequest request) {
        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with id: " + request.getPatientId()));

        Clinic clinic = clinicId != null 
                ? clinicRepository.findById(clinicId).orElse(patient.getClinic())
                : patient.getClinic();

        if (clinic == null) {
            clinic = clinicRepository.findAll().stream().findFirst().orElse(null);
        }

        BillingLedgerEntry entry = BillingLedgerEntry.builder()
                .clinic(clinic)
                .patient(patient)
                .encounterType(request.getEncounterType())
                .encounterId(request.getEncounterId())
                .entryType(request.getEntryType())
                .category(request.getCategory())
                .description(request.getDescription())
                .unitPrice(request.getUnitPrice() != null ? request.getUnitPrice() : request.getTotalAmount())
                .quantity(request.getQuantity() != null ? request.getQuantity() : 1)
                .totalAmount(request.getTotalAmount())
                .paymentMode(request.getPaymentMode() != null ? request.getPaymentMode() : "NA")
                .receiptNumber(request.getReceiptNumber())
                .recordedBy(request.getRecordedBy() != null ? request.getRecordedBy() : "Staff")
                .notes(request.getNotes())
                .build();

        BillingLedgerEntry saved = billingLedgerRepository.save(entry);
        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public PatientLedgerSummaryResponse getPatientLedger(UUID clinicId, UUID patientId) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with id: " + patientId));

        List<BillingLedgerEntry> entries = billingLedgerRepository.findByPatientIdOrderByCreatedAtAsc(patientId);

        List<BillingLedgerEntryResponse> charges = new ArrayList<>();
        List<BillingLedgerEntryResponse> receipts = new ArrayList<>();
        List<BillingLedgerEntryResponse> allResponses = new ArrayList<>();

        BigDecimal totalIncurred = BigDecimal.ZERO;
        BigDecimal totalPaid = BigDecimal.ZERO;

        for (BillingLedgerEntry e : entries) {
            BillingLedgerEntryResponse res = mapToResponse(e);
            allResponses.add(res);

            if ("DEBIT".equalsIgnoreCase(e.getEntryType())) {
                charges.add(res);
                totalIncurred = totalIncurred.add(e.getTotalAmount());
            } else if ("CREDIT".equalsIgnoreCase(e.getEntryType())) {
                receipts.add(res);
                totalPaid = totalPaid.add(e.getTotalAmount());
            }
        }

        BigDecimal netOutstanding = totalIncurred.subtract(totalPaid);
        if (netOutstanding.compareTo(BigDecimal.ZERO) < 0) {
            netOutstanding = BigDecimal.ZERO;
        }

        String status = "SETTLED";
        if (netOutstanding.compareTo(BigDecimal.ZERO) > 0) {
            status = totalPaid.compareTo(BigDecimal.ZERO) > 0 ? "PARTIAL" : "PENDING";
        }

        return PatientLedgerSummaryResponse.builder()
                .patientId(patient.getId())
                .patientName(patient.getName())
                .patientPhone(patient.getPhone())
                .totalIncurred(totalIncurred)
                .totalPaid(totalPaid)
                .netOutstanding(netOutstanding)
                .status(status)
                .charges(charges)
                .receipts(receipts)
                .allEntries(allResponses)
                .build();
    }

    @Transactional
    public BillingLedgerEntryResponse recordPayment(UUID clinicId, BillingPaymentRequest request) {
        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with id: " + request.getPatientId()));

        Clinic clinic = clinicId != null 
                ? clinicRepository.findById(clinicId).orElse(patient.getClinic())
                : patient.getClinic();

        if (clinic == null) {
            clinic = clinicRepository.findAll().stream().findFirst().orElse(null);
        }

        String receiptNo = request.getReceiptNumber() != null ? request.getReceiptNumber()
                : "REC-" + ((int) (100000 + Math.random() * 900000));

        BillingLedgerEntry entry = BillingLedgerEntry.builder()
                .clinic(clinic)
                .patient(patient)
                .encounterType(request.getEncounterType() != null ? request.getEncounterType() : "GENERAL")
                .encounterId(request.getEncounterId())
                .entryType("CREDIT")
                .category("ADVANCE_DEPOSIT")
                .description(request.getNotes() != null && !request.getNotes().isEmpty() ? request.getNotes() : "Payment Receipt #" + receiptNo)
                .unitPrice(request.getAmount())
                .quantity(1)
                .totalAmount(request.getAmount())
                .paymentMode(request.getPaymentMode() != null ? request.getPaymentMode() : "UPI")
                .receiptNumber(receiptNo)
                .recordedBy(request.getRecordedBy() != null ? request.getRecordedBy() : "Billing Desk Cashier")
                .notes(request.getNotes())
                .build();

        BillingLedgerEntry saved = billingLedgerRepository.save(entry);
        return mapToResponse(saved);
    }

    @Transactional
    public PatientLedgerSummaryResponse settleDischarge(UUID clinicId, DischargeSettleRequest request) {
        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with id: " + request.getPatientId()));

        Clinic clinic = clinicId != null 
                ? clinicRepository.findById(clinicId).orElse(patient.getClinic())
                : patient.getClinic();

        if (clinic == null) {
            clinic = clinicRepository.findAll().stream().findFirst().orElse(null);
        }

        // Calculate current outstanding
        PatientLedgerSummaryResponse currentLedger = getPatientLedger(clinicId, request.getPatientId());
        BigDecimal outstanding = currentLedger.getNetOutstanding();

        BigDecimal settleAmt = request.getSettlementAmount() != null ? request.getSettlementAmount() : outstanding;

        if (settleAmt != null && settleAmt.compareTo(BigDecimal.ZERO) > 0) {
            String receiptNo = request.getReceiptNumber() != null ? request.getReceiptNumber()
                    : "REC-DISCHARGE-" + ((int) (100000 + Math.random() * 900000));

            BillingLedgerEntry settleEntry = BillingLedgerEntry.builder()
                    .clinic(clinic)
                    .patient(patient)
                    .encounterType("IPD")
                    .encounterId(request.getEncounterId())
                    .entryType("CREDIT")
                    .category("DISCHARGE_SETTLEMENT")
                    .description("Final Inpatient Discharge Settlement & Clearance")
                    .unitPrice(settleAmt)
                    .quantity(1)
                    .totalAmount(settleAmt)
                    .paymentMode(request.getPaymentMode() != null ? request.getPaymentMode() : "UPI")
                    .receiptNumber(receiptNo)
                    .recordedBy(request.getSettledBy() != null ? request.getSettledBy() : "Discharge Desk")
                    .notes(request.getNotes())
                    .build();

            billingLedgerRepository.save(settleEntry);
        }

        return getPatientLedger(clinicId, request.getPatientId());
    }

    public com.nisschay.cms.dto.res.StayCalculationResponse calculateStayFinancials(com.nisschay.cms.dto.req.StayCalculationRequest req) {
        long stayDays = 1;
        if (req.getAdmissionDate() != null && !req.getAdmissionDate().isEmpty()) {
            try {
                java.time.LocalDate adm = java.time.LocalDate.parse(req.getAdmissionDate().substring(0, 10));
                java.time.LocalDate dis = req.getDischargeDate() != null && !req.getDischargeDate().isEmpty()
                        ? java.time.LocalDate.parse(req.getDischargeDate().substring(0, 10))
                        : java.time.LocalDate.now();
                long days = java.time.temporal.ChronoUnit.DAYS.between(adm, dis);
                stayDays = Math.max(1, days);
            } catch (Exception ignored) {
                stayDays = 1;
            }
        }

        BigDecimal dailyRate = req.getDailyRate() != null ? req.getDailyRate() : new BigDecimal("1000");
        BigDecimal roomCharges = dailyRate.multiply(BigDecimal.valueOf(stayDays));

        BigDecimal servicesTotal = BigDecimal.ZERO;
        if (req.getServiceAmounts() != null) {
            for (BigDecimal s : req.getServiceAmounts()) {
                if (s != null) servicesTotal = servicesTotal.add(s);
            }
        }

        BigDecimal grossTotal = roomCharges.add(servicesTotal);

        BigDecimal advancesPaid = BigDecimal.ZERO;
        if (req.getAdvanceAmounts() != null) {
            for (BigDecimal a : req.getAdvanceAmounts()) {
                if (a != null) advancesPaid = advancesPaid.add(a);
            }
        }

        BigDecimal balanceDue = grossTotal.subtract(advancesPaid);
        if (balanceDue.compareTo(BigDecimal.ZERO) < 0) {
            balanceDue = BigDecimal.ZERO;
        }

        String status = "PAID";
        if (balanceDue.compareTo(BigDecimal.ZERO) > 0) {
            status = advancesPaid.compareTo(BigDecimal.ZERO) > 0 ? "PARTIAL" : "UNPAID";
        }

        return com.nisschay.cms.dto.res.StayCalculationResponse.builder()
                .stayDays(stayDays)
                .dailyRate(dailyRate)
                .roomCharges(roomCharges)
                .servicesTotal(servicesTotal)
                .grossTotal(grossTotal)
                .advancesPaid(advancesPaid)
                .balanceDue(balanceDue)
                .paymentStatus(status)
                .build();
    }

    public com.nisschay.cms.dto.res.PosCalculationResponse calculatePosFinancials(com.nisschay.cms.dto.req.PosCalculationRequest req) {
        BigDecimal subtotal = BigDecimal.ZERO;
        if (req.getItems() != null) {
            for (com.nisschay.cms.dto.req.PosCalculationRequest.PosItem item : req.getItems()) {
                if (item.getUnitPrice() != null && item.getQuantity() != null) {
                    subtotal = subtotal.add(item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())));
                }
            }
        }

        BigDecimal taxRate = req.getTaxRate() != null ? req.getTaxRate() : new BigDecimal("12");
        BigDecimal taxAmount = subtotal.multiply(taxRate).divide(new BigDecimal("100"), 2, java.math.RoundingMode.HALF_UP);

        BigDecimal discount = req.getDiscountAmount() != null ? req.getDiscountAmount() : BigDecimal.ZERO;
        BigDecimal grandTotal = subtotal.add(taxAmount).subtract(discount);
        if (grandTotal.compareTo(BigDecimal.ZERO) < 0) {
            grandTotal = BigDecimal.ZERO;
        }

        BigDecimal cashTendered = req.getCashTendered() != null ? req.getCashTendered() : BigDecimal.ZERO;
        BigDecimal changeDue = cashTendered.subtract(grandTotal);
        if (changeDue.compareTo(BigDecimal.ZERO) < 0) {
            changeDue = BigDecimal.ZERO;
        }

        return com.nisschay.cms.dto.res.PosCalculationResponse.builder()
                .subtotal(subtotal)
                .taxRate(taxRate)
                .taxAmount(taxAmount)
                .discountAmount(discount)
                .grandTotal(grandTotal)
                .cashTendered(cashTendered)
                .changeDue(changeDue)
                .build();
    }

    private BillingLedgerEntryResponse mapToResponse(BillingLedgerEntry entry) {
        String formattedCreatedAt = entry.getCreatedAt() != null 
                ? entry.getCreatedAt().format(java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"))
                : null;

        return BillingLedgerEntryResponse.builder()
                .id(entry.getId())
                .clinicId(entry.getClinic() != null ? entry.getClinic().getId() : null)
                .patientId(entry.getPatient() != null ? entry.getPatient().getId() : null)
                .patientName(entry.getPatient() != null ? entry.getPatient().getName() : null)
                .encounterType(entry.getEncounterType())
                .encounterId(entry.getEncounterId())
                .entryType(entry.getEntryType())
                .category(entry.getCategory())
                .description(entry.getDescription())
                .unitPrice(entry.getUnitPrice())
                .quantity(entry.getQuantity())
                .totalAmount(entry.getTotalAmount())
                .paymentMode(entry.getPaymentMode())
                .receiptNumber(entry.getReceiptNumber())
                .recordedBy(entry.getRecordedBy())
                .notes(entry.getNotes())
                .createdAt(entry.getCreatedAt())
                .formattedCreatedAt(formattedCreatedAt)
                .build();
    }
}

