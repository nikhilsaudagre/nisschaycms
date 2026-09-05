package com.nisschay.cms.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "billing_ledger_entries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class BillingLedgerEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "clinic_id", nullable = false)
    @JsonIgnore
    private Clinic clinic;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    @JsonIgnore
    private Patient patient;

    @Column(name = "encounter_type", nullable = false)
    private String encounterType; // OPD, IPD, LAB, GENERAL

    @Column(name = "encounter_id")
    private String encounterId; // Appointment UUID, Bed/Stay IPD Number, Lab Order ID

    @Column(name = "entry_type", nullable = false)
    private String entryType; // DEBIT (Charge), CREDIT (Payment)

    @Column(nullable = false)
    private String category; // OPD_CONSULTATION, IPD_BED_RENT, IPD_SERVICE, IPD_MEDICATION, LAB_INVESTIGATION, ADVANCE_DEPOSIT, DISCHARGE_SETTLEMENT, DISCOUNT

    @Column(nullable = false, length = 500)
    private String description;

    @Column(name = "unit_price", precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Builder.Default
    @Column(nullable = false)
    private Integer quantity = 1;

    @Column(name = "total_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @Builder.Default
    @Column(name = "payment_mode")
    private String paymentMode = "NA"; // CASH, UPI, CARD, INSURANCE_TPA, NA

    @Column(name = "receipt_number")
    private String receiptNumber;

    @Column(name = "recorded_by")
    private String recordedBy;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
