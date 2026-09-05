package com.nisschay.cms.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.springframework.data.domain.Persistable;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "prescription_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class PrescriptionSettings implements Persistable<UUID> {

    @Id
    @Column(name = "id")
    private UUID id; // Maps directly to Clinic ID

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id", insertable = false, updatable = false)
    @JsonIgnore
    private Clinic clinic;

    @Builder.Default
    @Column(name = "show_logo", nullable = false)
    private Boolean showLogo = true;

    @Column(name = "digital_signature_url")
    private String digitalSignatureUrl;

    @Column(name = "header_text", columnDefinition = "TEXT")
    private String headerText;

    @Column(name = "footer_text", columnDefinition = "TEXT")
    private String footerText;

    @Column(name = "watermark_url")
    private String watermarkUrl;

    @Builder.Default
    @Column(name = "print_margin_mm")
    private Integer printMarginMm = 10;

    @Builder.Default
    @Column(name = "top_margin_mm")
    private Integer topMarginMm = 10;

    @Builder.Default
    @Column(name = "letterhead_mode", length = 50)
    private String letterheadMode = "PLAIN_PAPER"; // PLAIN_PAPER or PREPRINTED_PAD

    @Builder.Default
    @Column(name = "enable_qr_code")
    private Boolean enableQrCode = true;

    @Builder.Default
    @Column(name = "show_vitals")
    private Boolean showVitals = true;

    @Builder.Default
    @Column(name = "show_complaints")
    private Boolean showComplaints = true;

    @Builder.Default
    @Column(name = "show_diagnosis")
    private Boolean showDiagnosis = true;

    @Builder.Default
    @Column(name = "show_medicines")
    private Boolean showMedicines = true;

    @Builder.Default
    @Column(name = "show_lab_tests")
    private Boolean showLabTests = true;

    @Builder.Default
    @Column(name = "show_advice")
    private Boolean showAdvice = true;

    @Builder.Default
    @Column(name = "show_follow_up")
    private Boolean showFollowUp = true;

    @Builder.Default
    @Column(name = "show_signature")
    private Boolean showSignature = true;

    @Column(name = "default_advice", columnDefinition = "TEXT")
    private String defaultAdvice;

    @Column(name = "rx_templates", columnDefinition = "TEXT")
    private String rxTemplates;

    @Column(name = "quick_advice_list", columnDefinition = "TEXT")
    private String quickAdviceList;

    @Builder.Default
    @Column(name = "paper_size")
    private String paperSize = "A4";

    // Discharge Summary Customization
    @Builder.Default
    @Column(name = "discharge_header_title")
    private String dischargeHeaderTitle = "HOSPITAL INPATIENT DISCHARGE SUMMARY";

    @Builder.Default
    @Column(name = "discharge_show_hospital_course")
    private Boolean dischargeShowHospitalCourse = true;

    @Builder.Default
    @Column(name = "discharge_show_investigations")
    private Boolean dischargeShowInvestigations = true;

    @Builder.Default
    @Column(name = "discharge_show_diet_activity")
    private Boolean dischargeShowDietActivity = true;

    @Builder.Default
    @Column(name = "discharge_show_emergency_warning")
    private Boolean dischargeShowEmergencyWarning = true;

    @Builder.Default
    @Column(name = "discharge_show_attendant_signature")
    private Boolean dischargeShowAttendantSignature = true;

    @Column(name = "default_discharge_emergency_notes", columnDefinition = "TEXT")
    private String defaultDischargeEmergencyNotes;

    @Column(name = "default_discharge_diet_notes", columnDefinition = "TEXT")
    private String defaultDischargeDietNotes;

    // Consultation Report Customization
    @Builder.Default
    @Column(name = "consultation_report_title")
    private String consultationReportTitle = "CLINICAL CONSULTATION & OPD ENCOUNTER REPORT";

    @Builder.Default
    @Column(name = "consultation_show_vitals")
    private Boolean consultationShowVitals = true;

    @Builder.Default
    @Column(name = "consultation_show_systemic_exam")
    private Boolean consultationShowSystemicExam = true;

    @Builder.Default
    @Column(name = "consultation_show_investigations")
    private Boolean consultationShowInvestigations = true;

    @Builder.Default
    @Column(name = "consultation_show_referral_notes")
    private Boolean consultationShowReferralNotes = true;

    @Column(name = "default_consultation_disclaimer", columnDefinition = "TEXT")
    private String defaultConsultationDisclaimer;

    // Medical Certificate Customization
    @Builder.Default
    @Column(name = "medical_cert_title")
    private String medicalCertTitle = "MEDICAL FITNESS & SICKNESS CERTIFICATE";

    @Builder.Default
    @Column(name = "medical_cert_council_authority")
    private String medicalCertCouncilAuthority = "Issued under the Regulations of the National Medical Commission & State Medical Council";

    @Column(name = "default_medical_cert_remarks", columnDefinition = "TEXT")
    private String defaultMedicalCertRemarks;

    @Builder.Default
    @Column(name = "medical_cert_show_seal")
    private Boolean medicalCertShowSeal = true;

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
