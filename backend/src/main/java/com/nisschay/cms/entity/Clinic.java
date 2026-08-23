package com.nisschay.cms.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "clinics")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Clinic {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String phone;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(name = "logo_url")
    private String logoUrl;

    @Column(name = "gst_number")
    private String gstNumber;

    @Column(name = "registration_number")
    private String registrationNumber;

    @Column
    private String website;

    @Column(name = "google_maps_link")
    private String googleMapsLink;

    @Builder.Default
    @Column
    private String timezone = "Asia/Kolkata";

    @Builder.Default
    @Column
    private String currency = "₹";

    @Builder.Default
    @Column
    private String language = "en";

    @Builder.Default
    @Column(name = "appointment_slot_duration")
    private Integer appointmentSlotDuration = 15;

    @Builder.Default
    @Column(name = "walk_in_enabled")
    private Boolean walkInEnabled = true;

    @Builder.Default
    @Column(name = "double_booking_allowed")
    private Boolean doubleBookingAllowed = false;

    @Builder.Default
    @Column(name = "max_patients_per_day")
    private Integer maxPatientsPerDay = 100;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
