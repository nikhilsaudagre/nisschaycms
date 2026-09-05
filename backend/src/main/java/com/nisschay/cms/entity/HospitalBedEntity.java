package com.nisschay.cms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "hospital_beds")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HospitalBedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "clinic_id", nullable = false)
    private UUID clinicId;

    @Column(name = "ward_name", nullable = false)
    private String wardName;

    @Column(name = "bed_number", nullable = false)
    private String bedNumber;

    @Column(name = "daily_rate", nullable = false)
    private BigDecimal dailyRate;

    @Column(name = "status", nullable = false)
    private String status; // AVAILABLE, OCCUPIED, DISCHARGE_PLANNED, CLEANING

    @Column(name = "current_patient_id")
    private UUID currentPatientId;

    @Column(name = "current_patient_name")
    private String currentPatientName;

    @Column(name = "current_admission_id")
    private UUID currentAdmissionId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
