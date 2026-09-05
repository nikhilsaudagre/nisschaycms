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
                            .topMarginMm(10)
                            .letterheadMode("PLAIN_PAPER")
                            .enableQrCode(true)
                            .showVitals(true)
                            .showComplaints(true)
                            .showDiagnosis(true)
                            .showMedicines(true)
                            .showLabTests(true)
                            .showAdvice(true)
                            .showFollowUp(true)
                            .showSignature(true)
                            .defaultAdvice("Drink plenty of water.\nTake medicines after meals.\nFollow up after 5 days.")
                            .build();
                            
                    return prescriptionSettingsRepository.save(defaultSettings);
                });
    }

    @Transactional
    public PrescriptionSettings updateSettings(UUID clinicId, PrescriptionSettings updateData) {
        PrescriptionSettings settings = getSettingsByClinic(clinicId);

        if (updateData.getShowLogo() != null) settings.setShowLogo(updateData.getShowLogo());
        settings.setDigitalSignatureUrl(updateData.getDigitalSignatureUrl());
        settings.setHeaderText(updateData.getHeaderText());
        settings.setFooterText(updateData.getFooterText());
        settings.setWatermarkUrl(updateData.getWatermarkUrl());
        if (updateData.getPrintMarginMm() != null) settings.setPrintMarginMm(updateData.getPrintMarginMm());
        if (updateData.getTopMarginMm() != null) settings.setTopMarginMm(updateData.getTopMarginMm());
        if (updateData.getLetterheadMode() != null) settings.setLetterheadMode(updateData.getLetterheadMode());
        if (updateData.getEnableQrCode() != null) settings.setEnableQrCode(updateData.getEnableQrCode());
        if (updateData.getShowVitals() != null) settings.setShowVitals(updateData.getShowVitals());
        if (updateData.getShowComplaints() != null) settings.setShowComplaints(updateData.getShowComplaints());
        if (updateData.getShowDiagnosis() != null) settings.setShowDiagnosis(updateData.getShowDiagnosis());
        if (updateData.getShowMedicines() != null) settings.setShowMedicines(updateData.getShowMedicines());
        if (updateData.getShowLabTests() != null) settings.setShowLabTests(updateData.getShowLabTests());
        if (updateData.getShowAdvice() != null) settings.setShowAdvice(updateData.getShowAdvice());
        if (updateData.getShowFollowUp() != null) settings.setShowFollowUp(updateData.getShowFollowUp());
        if (updateData.getShowSignature() != null) settings.setShowSignature(updateData.getShowSignature());
        settings.setDefaultAdvice(updateData.getDefaultAdvice());
        settings.setRxTemplates(updateData.getRxTemplates());
        settings.setQuickAdviceList(updateData.getQuickAdviceList());
        if (updateData.getPaperSize() != null) settings.setPaperSize(updateData.getPaperSize());

        // Discharge Summary
        if (updateData.getDischargeHeaderTitle() != null) settings.setDischargeHeaderTitle(updateData.getDischargeHeaderTitle());
        if (updateData.getDischargeShowHospitalCourse() != null) settings.setDischargeShowHospitalCourse(updateData.getDischargeShowHospitalCourse());
        if (updateData.getDischargeShowInvestigations() != null) settings.setDischargeShowInvestigations(updateData.getDischargeShowInvestigations());
        if (updateData.getDischargeShowDietActivity() != null) settings.setDischargeShowDietActivity(updateData.getDischargeShowDietActivity());
        if (updateData.getDischargeShowEmergencyWarning() != null) settings.setDischargeShowEmergencyWarning(updateData.getDischargeShowEmergencyWarning());
        if (updateData.getDischargeShowAttendantSignature() != null) settings.setDischargeShowAttendantSignature(updateData.getDischargeShowAttendantSignature());
        settings.setDefaultDischargeEmergencyNotes(updateData.getDefaultDischargeEmergencyNotes());
        settings.setDefaultDischargeDietNotes(updateData.getDefaultDischargeDietNotes());

        // Consultation Report
        if (updateData.getConsultationReportTitle() != null) settings.setConsultationReportTitle(updateData.getConsultationReportTitle());
        if (updateData.getConsultationShowVitals() != null) settings.setConsultationShowVitals(updateData.getConsultationShowVitals());
        if (updateData.getConsultationShowSystemicExam() != null) settings.setConsultationShowSystemicExam(updateData.getConsultationShowSystemicExam());
        if (updateData.getConsultationShowInvestigations() != null) settings.setConsultationShowInvestigations(updateData.getConsultationShowInvestigations());
        if (updateData.getConsultationShowReferralNotes() != null) settings.setConsultationShowReferralNotes(updateData.getConsultationShowReferralNotes());
        settings.setDefaultConsultationDisclaimer(updateData.getDefaultConsultationDisclaimer());

        // Medical Certificate
        if (updateData.getMedicalCertTitle() != null) settings.setMedicalCertTitle(updateData.getMedicalCertTitle());
        if (updateData.getMedicalCertCouncilAuthority() != null) settings.setMedicalCertCouncilAuthority(updateData.getMedicalCertCouncilAuthority());
        settings.setDefaultMedicalCertRemarks(updateData.getDefaultMedicalCertRemarks());
        if (updateData.getMedicalCertShowSeal() != null) settings.setMedicalCertShowSeal(updateData.getMedicalCertShowSeal());

        return prescriptionSettingsRepository.save(settings);
    }
}
