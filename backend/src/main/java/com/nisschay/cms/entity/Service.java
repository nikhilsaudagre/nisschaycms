package com.nisschay.cms.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "services")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Service {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "clinic_id", nullable = false)
    @JsonIgnore
    private Clinic clinic;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal fee;

    @Builder.Default
    @Column(name = "category", length = 50)
    private String category = "PROCEDURE"; // ROOM_BED, ICU_CCU, OPERATION_THEATRE, DOCTOR_FEE, NURSING_CARE, DIAGNOSTIC_LAB, PROCEDURE, OTHER

    @Builder.Default
    @Column(name = "hsn_sac_code", length = 20)
    private String hsnSacCode = "999312";

    @Column(name = "doctor_id")
    private UUID doctorId;

    @Column(name = "doctor_name")
    private String doctorName;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
