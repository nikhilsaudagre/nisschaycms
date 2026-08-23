package com.nisschay.cms.service;

import com.nisschay.cms.entity.Clinic;
import com.nisschay.cms.entity.PrescriptionSettings;
import com.nisschay.cms.repository.ClinicRepository;
import com.nisschay.cms.repository.PrescriptionSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PrescriptionSettingsService {

    private final PrescriptionSettingsRepository prescriptionSettingsRepository;
    private final ClinicRepository clinicRepository;

    @Transactional
    public PrescriptionSettings getSettingsByClinic(UUID clinicId) {
        return prescriptionSettingsRepository.findById(clinicId)
                .orElseGet(() -> {
                    Clinic clinic = clinicRepository.findById(clinicId)
                            .orElseThrow(() -> new IllegalArgumentException("Clinic not found"));
                    
                    PrescriptionSettings defaultSettings = PrescriptionSettings.builder()
                            .id(clinicId)
                            .clinic(clinic)
                            .showLogo(true)
                            .printMarginMm(10)
                            .enableQrCode(false)
                            .defaultAdvice("Drink plenty of water.\nFollow medicine regularly.\nVisit after 5 days.")
                            .build();
                            
                    return prescriptionSettingsRepository.save(defaultSettings);
                });
    }

    @Transactional
    public PrescriptionSettings updateSettings(UUID clinicId, PrescriptionSettings updateData) {
        PrescriptionSettings settings = getSettingsByClinic(clinicId);

        settings.setShowLogo(updateData.getShowLogo());
        settings.setDigitalSignatureUrl(updateData.getDigitalSignatureUrl());
        settings.setHeaderText(updateData.getHeaderText());
        settings.setFooterText(updateData.getFooterText());
        settings.setWatermarkUrl(updateData.getWatermarkUrl());
        settings.setPrintMarginMm(updateData.getPrintMarginMm());
        settings.setEnableQrCode(updateData.getEnableQrCode());
        settings.setDefaultAdvice(updateData.getDefaultAdvice());

        return prescriptionSettingsRepository.save(settings);
    }
}
