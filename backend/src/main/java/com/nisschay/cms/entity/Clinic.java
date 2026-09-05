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

    @Column(name = "emergency_phone")
    private String emergencyPhone;

    @Column(name = "tagline")
    private String tagline;

    @Column(name = "landmark")
    private String landmark;

    @Column(name = "city")
    private String city;

    @Column(name = "state")
    private String state;

    @Column(name = "pincode")
    private String pincode;

    @Column(name = "logo_url")
    private String logoUrl;

    @Column(name = "gst_number")
    private String gstNumber;

    @Column(name = "registration_number")
    private String registrationNumber;

    // Multi-Specialty Hospital & Healthcare Facility Profile
    @Builder.Default
    @Column(name = "facility_type")
    private String facilityType = "HOSPITAL";

    @Builder.Default
    @Column(name = "total_beds")
    private Integer totalBeds = 50;

    @Builder.Default
    @Column(name = "total_icu_beds")
    private Integer totalIcuBeds = 10;

    @Builder.Default
    @Column(name = "total_ot_rooms")
    private Integer totalOtRooms = 2;

    @Column(name = "nabh_accreditation_number")
    private String nabhAccreditationNumber;

    @Column(name = "rohini_hospital_id")
    private String rohiniHospitalId;

    @Column(name = "clinical_est_registration_number")
    private String clinicalEstRegistrationNumber;

    @Builder.Default
    @Column(name = "enabled_departments", columnDefinition = "TEXT")
    private String enabledDepartments = "General Medicine,General Surgery,Obstetrics & Gynecology,Pediatrics,Orthopedics,Cardiology,Dental,Ophthalmology,Emergency Care";

    @Column(name = "ambulance_contact_phone")
    private String ambulanceContactPhone;

    @Builder.Default
    @Column(name = "blood_bank_available")
    private Boolean bloodBankAvailable = false;

    @Builder.Default
    @Column(name = "pharmacy_24x7")
    private Boolean pharmacy24x7 = true;

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

    @Builder.Default
    @Column(name = "morning_start_time")
    private String morningStartTime = "09:00";

    @Builder.Default
    @Column(name = "morning_end_time")
    private String morningEndTime = "13:00";

    @Builder.Default
    @Column(name = "evening_start_time")
    private String eveningStartTime = "17:00";

    @Builder.Default
    @Column(name = "evening_end_time")
    private String eveningEndTime = "21:00";

    @Builder.Default
    @Column(name = "closed_days")
    private String closedDays = "Sunday";

    @Column(name = "holiday_dates", columnDefinition = "TEXT")
    private String holidayDates;

    @Builder.Default
    @Column(name = "invoice_prefix")
    private String invoicePrefix = "INV-";

    @Builder.Default
    @Column(name = "tax_percentage")
    private Integer taxPercentage = 0;

    @Column(name = "upi_id")
    private String upiId;

    @Builder.Default
    @Column(name = "session_timeout_minutes")
    private Integer sessionTimeoutMinutes = 30;

    @Builder.Default
    @Column(name = "receptionist_access_notes")
    private Boolean receptionistAccessNotes = false;

    @Builder.Default
    @Column(name = "allow_doctor_discount")
    private Boolean allowDoctorDiscount = true;

    @Builder.Default
    @Column(name = "max_discount_percentage")
    private Integer maxDiscountPercentage = 100;

    @Column(name = "discount_reasons", columnDefinition = "TEXT")
    private String discountReasons;

    // Dashboard Layout & Widgets Customization
    @Builder.Default
    @Column(name = "dash_show_kpi_stats")
    private Boolean dashShowKpiStats = true;

    @Builder.Default
    @Column(name = "dash_show_revenue")
    private Boolean dashShowRevenue = true;

    @Builder.Default
    @Column(name = "dash_show_opd_queue")
    private Boolean dashShowOpdQueue = true;

    @Builder.Default
    @Column(name = "dash_show_appointments")
    private Boolean dashShowAppointments = true;

    @Builder.Default
    @Column(name = "dash_show_clinical_alerts")
    private Boolean dashShowClinicalAlerts = true;

    @Builder.Default
    @Column(name = "dash_show_quick_actions")
    private Boolean dashShowQuickActions = true;

    @Builder.Default
    @Column(name = "dash_show_recent_patients")
    private Boolean dashShowRecentPatients = true;

    @Builder.Default
    @Column(name = "dash_show_inventory_alerts")
    private Boolean dashShowInventoryAlerts = true;

    @Builder.Default
    @Column(name = "dash_privacy_mode")
    private Boolean dashPrivacyMode = false;

    @Builder.Default
    @Column(name = "dash_density")
    private String dashDensity = "COMFORTABLE";

    @Builder.Default
    @Column(name = "dash_auto_refresh_interval")
    private Integer dashAutoRefreshInterval = 60;

    @Builder.Default
    @Column(name = "dash_default_date_range")
    private String dashDefaultDateRange = "TODAY";

    @Builder.Default
    @Column(name = "dash_role_preset")
    private String dashRolePreset = "DOCTOR";

    @Column(name = "hospital_bed_state", columnDefinition = "TEXT")
    private String hospitalBedState;

    @Column(name = "hospital_ot_state", columnDefinition = "TEXT")
    private String hospitalOtState;

    @Column(name = "hospital_triage_state", columnDefinition = "TEXT")
    private String hospitalTriageState;

    @Column(name = "pharmacy_sales_state", columnDefinition = "TEXT")
    private String pharmacySalesState;

    @Column(name = "pharmacy_stock_state", columnDefinition = "TEXT")
    private String pharmacyStockState;

    @Column(name = "pharmacy_grn_state", columnDefinition = "TEXT")
    private String pharmacyGrnState;

    @Column(name = "pharmacy_rtp_state", columnDefinition = "TEXT")
    private String pharmacyRtpState;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
