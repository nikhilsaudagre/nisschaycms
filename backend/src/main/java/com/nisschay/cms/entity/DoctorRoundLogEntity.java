package com.nisschay.cms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "doctor_round_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DoctorRoundLogEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "admission_id", nullable = false)
    private UUID admissionId;

    @Column(name = "clinic_id", nullable = false)
    private UUID clinicId;

    @Column(name = "doctor_id")
    private UUID doctorId;

    @Column(name = "doctor_name", nullable = false)
    private String doctorName;

    @Column(name = "round_date", nullable = false)
    private LocalDateTime roundDate;

    @Column(name = "temperature")
    private String temperature;

    @Column(name = "blood_pressure")
    private String bloodPressure;

    @Column(name = "pulse")
    private String pulse;

    @Column(name = "spo2")
    private String spo2;

    @Column(name = "respiratory_rate")
    private String respiratoryRate;

    @Column(name = "clinical_notes", columnDefinition = "TEXT")
    private String clinicalNotes;

    @Column(name = "treatment_orders", columnDefinition = "TEXT")
    private String treatmentOrders;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
