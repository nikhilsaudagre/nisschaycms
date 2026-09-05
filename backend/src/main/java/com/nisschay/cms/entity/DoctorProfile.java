package com.nisschay.cms.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.springframework.data.domain.Persistable;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "doctor_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class DoctorProfile implements Persistable<UUID> {

    @Id
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "id")
    @JsonIgnore
    private User user;

    @Column(nullable = false)
    private String specialization;

    @Column(name = "consultation_fee", nullable = false)
    private BigDecimal consultationFee;

    @Column(name = "follow_up_fee")
    private BigDecimal followUpFee;

    @Column(name = "emergency_fee")
    private BigDecimal emergencyFee;

    public BigDecimal getFeeForType(String type) {
        if (type == null) return consultationFee != null ? consultationFee : BigDecimal.ZERO;
        switch (type.trim().toUpperCase()) {
            case "FOLLOW_UP":
                return (followUpFee != null && followUpFee.compareTo(BigDecimal.ZERO) > 0) ? followUpFee : (consultationFee != null ? consultationFee : BigDecimal.ZERO);
            case "EMERGENCY":
                return (emergencyFee != null && emergencyFee.compareTo(BigDecimal.ZERO) > 0) ? emergencyFee : (consultationFee != null ? consultationFee : BigDecimal.ZERO);
            case "CONSULTATION":
            default:
                return consultationFee != null ? consultationFee : BigDecimal.ZERO;
        }
    }

    @Column(name = "registration_number")
    private String registrationNumber;

    @Column(name = "medical_council")
    private String medicalCouncil;

    @Column(name = "registration_year")
    private Integer registrationYear;

    @Column(name = "languages_spoken")
    private String languagesSpoken;

    private String gender;

    @Column(name = "sub_specialization")
    private String subSpecialization;

    @Column(name = "digital_signature", columnDefinition = "TEXT")
    private String digitalSignature;

    private String qualification;

    @Column(name = "experience_years")
    private Integer experienceYears;

    @Column(name = "room_number")
    private String roomNumber;

    @Column(name = "slot_duration")
    private Integer slotDuration;

    @Column(columnDefinition = "TEXT")
    private String biography;

    @Column(name = "availability_schedule", columnDefinition = "TEXT")
    private String availabilitySchedule;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Transient
    @Builder.Default
    private boolean isNew = true;

    @Override
    public boolean isNew() {
        return isNew || id == null;
    }

    @PostPersist
    @PostLoad
    public void markNotNew() {
        this.isNew = false;
    }
}
