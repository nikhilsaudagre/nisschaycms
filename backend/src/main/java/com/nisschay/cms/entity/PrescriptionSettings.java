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
    @Column(name = "print_margin_mm", nullable = false)
    private Integer printMarginMm = 10;

    @Builder.Default
    @Column(name = "enable_qr_code", nullable = false)
    private Boolean enableQrCode = false;

    @Column(name = "default_advice", columnDefinition = "TEXT")
    private String defaultAdvice;

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
