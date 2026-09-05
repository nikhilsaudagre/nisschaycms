package com.nisschay.cms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "inpatient_admissions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InpatientAdmissionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "clinic_id", nullable = false)
    private UUID clinicId;

    @Column(name = "patient_id", nullable = false)
    private UUID patientId;

    @Column(name = "patient_name", nullable = false)
    private String patientName;

    @Column(name = "bed_id", nullable = false)
    private UUID bedId;

    @Column(name = "bed_number")
    private String bedNumber;

    @Column(name = "ward_name")
    private String wardName;

    @Column(name = "doctor_id")
    private UUID doctorId;

    @Column(name = "consultant_doctor_name")
    private String consultantDoctorName;

    @Column(name = "ipd_number", nullable = false)
    private String ipdNumber;

    @Column(name = "admission_date", nullable = false)
    private LocalDateTime admissionDate;

    @Column(name = "discharge_date")
    private LocalDateTime dischargeDate;

    @Column(name = "admitting_diagnosis", columnDefinition = "TEXT")
    private String admittingDiagnosis;

    @Column(name = "status", nullable = false)
    private String status; // ACTIVE, DISCHARGE_PLANNED, DISCHARGED

    @Column(name = "discharge_summary", columnDefinition = "TEXT")
    private String dischargeSummary;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
