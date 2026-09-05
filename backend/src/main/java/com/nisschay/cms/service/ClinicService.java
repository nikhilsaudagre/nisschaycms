package com.nisschay.cms.service;

import com.nisschay.cms.entity.Clinic;
import com.nisschay.cms.repository.ClinicRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ClinicService {

    private final ClinicRepository clinicRepository;

    @Transactional
    public Clinic createClinic(String name, String email, String phone, String address) {
        if (clinicRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Clinic email is already in use");
        }

        Clinic clinic = Clinic.builder()
                .name(name)
                .email(email)
                .phone(phone)
                .address(address)
                .build();

        return clinicRepository.save(clinic);
    }

    @Transactional(readOnly = true)
    public Clinic getClinicById(UUID id) {
        return clinicRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Clinic not found with id: " + id));
    }

    @Transactional
    public Clinic updateClinic(UUID id, Clinic updateData) {
        Clinic clinic = clinicRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Clinic not found with id: " + id));

        clinic.setName(updateData.getName());
        clinic.setEmail(updateData.getEmail());
        clinic.setPhone(updateData.getPhone());
        clinic.setEmergencyPhone(updateData.getEmergencyPhone());
        clinic.setTagline(updateData.getTagline());
        clinic.setAddress(updateData.getAddress());
        clinic.setLandmark(updateData.getLandmark());
        clinic.setCity(updateData.getCity());
        clinic.setState(updateData.getState());
        clinic.setPincode(updateData.getPincode());
        clinic.setLogoUrl(updateData.getLogoUrl());
        clinic.setGstNumber(updateData.getGstNumber());
        clinic.setRegistrationNumber(updateData.getRegistrationNumber());
        clinic.setWebsite(updateData.getWebsite());
        clinic.setGoogleMapsLink(updateData.getGoogleMapsLink());
        clinic.setTimezone(updateData.getTimezone());
        clinic.setCurrency(updateData.getCurrency());
        clinic.setLanguage(updateData.getLanguage());
        clinic.setAppointmentSlotDuration(updateData.getAppointmentSlotDuration());
        clinic.setWalkInEnabled(updateData.getWalkInEnabled());
        clinic.setDoubleBookingAllowed(updateData.getDoubleBookingAllowed());
        clinic.setMaxPatientsPerDay(updateData.getMaxPatientsPerDay());
        clinic.setMorningStartTime(updateData.getMorningStartTime());
        clinic.setMorningEndTime(updateData.getMorningEndTime());
        clinic.setEveningStartTime(updateData.getEveningStartTime());
        clinic.setEveningEndTime(updateData.getEveningEndTime());
        clinic.setClosedDays(updateData.getClosedDays());
        clinic.setHolidayDates(updateData.getHolidayDates());
        clinic.setInvoicePrefix(updateData.getInvoicePrefix());
        clinic.setTaxPercentage(updateData.getTaxPercentage());
        clinic.setUpiId(updateData.getUpiId());
        clinic.setSessionTimeoutMinutes(updateData.getSessionTimeoutMinutes());
        clinic.setReceptionistAccessNotes(updateData.getReceptionistAccessNotes());
        if (updateData.getAllowDoctorDiscount() != null) {
            clinic.setAllowDoctorDiscount(updateData.getAllowDoctorDiscount());
        }
        if (updateData.getMaxDiscountPercentage() != null) {
            clinic.setMaxDiscountPercentage(updateData.getMaxDiscountPercentage());
        }
        clinic.setDiscountReasons(updateData.getDiscountReasons());
        
        // Multi-Specialty Hospital Profile & Infrastructure
        if (updateData.getFacilityType() != null) clinic.setFacilityType(updateData.getFacilityType());
        if (updateData.getTotalBeds() != null) clinic.setTotalBeds(updateData.getTotalBeds());
        if (updateData.getTotalIcuBeds() != null) clinic.setTotalIcuBeds(updateData.getTotalIcuBeds());
        if (updateData.getTotalOtRooms() != null) clinic.setTotalOtRooms(updateData.getTotalOtRooms());
        if (updateData.getNabhAccreditationNumber() != null) clinic.setNabhAccreditationNumber(updateData.getNabhAccreditationNumber());
        if (updateData.getRohiniHospitalId() != null) clinic.setRohiniHospitalId(updateData.getRohiniHospitalId());
        if (updateData.getClinicalEstRegistrationNumber() != null) clinic.setClinicalEstRegistrationNumber(updateData.getClinicalEstRegistrationNumber());
        if (updateData.getEnabledDepartments() != null) clinic.setEnabledDepartments(updateData.getEnabledDepartments());
        if (updateData.getAmbulanceContactPhone() != null) clinic.setAmbulanceContactPhone(updateData.getAmbulanceContactPhone());
        if (updateData.getBloodBankAvailable() != null) clinic.setBloodBankAvailable(updateData.getBloodBankAvailable());
        if (updateData.getPharmacy24x7() != null) clinic.setPharmacy24x7(updateData.getPharmacy24x7());

        // Dashboard Layout settings
        if (updateData.getDashShowKpiStats() != null) clinic.setDashShowKpiStats(updateData.getDashShowKpiStats());
        if (updateData.getDashShowRevenue() != null) clinic.setDashShowRevenue(updateData.getDashShowRevenue());
        if (updateData.getDashShowOpdQueue() != null) clinic.setDashShowOpdQueue(updateData.getDashShowOpdQueue());
        if (updateData.getDashShowAppointments() != null) clinic.setDashShowAppointments(updateData.getDashShowAppointments());
        if (updateData.getDashShowClinicalAlerts() != null) clinic.setDashShowClinicalAlerts(updateData.getDashShowClinicalAlerts());
        if (updateData.getDashShowQuickActions() != null) clinic.setDashShowQuickActions(updateData.getDashShowQuickActions());
        if (updateData.getDashShowRecentPatients() != null) clinic.setDashShowRecentPatients(updateData.getDashShowRecentPatients());
        if (updateData.getDashShowInventoryAlerts() != null) clinic.setDashShowInventoryAlerts(updateData.getDashShowInventoryAlerts());
        if (updateData.getDashPrivacyMode() != null) clinic.setDashPrivacyMode(updateData.getDashPrivacyMode());
        if (updateData.getDashDensity() != null) clinic.setDashDensity(updateData.getDashDensity());
        if (updateData.getDashAutoRefreshInterval() != null) clinic.setDashAutoRefreshInterval(updateData.getDashAutoRefreshInterval());
        if (updateData.getDashDefaultDateRange() != null) clinic.setDashDefaultDateRange(updateData.getDashDefaultDateRange());
        if (updateData.getDashRolePreset() != null) clinic.setDashRolePreset(updateData.getDashRolePreset());
        if (updateData.getHospitalBedState() != null) clinic.setHospitalBedState(updateData.getHospitalBedState());
        if (updateData.getHospitalOtState() != null) clinic.setHospitalOtState(updateData.getHospitalOtState());
        if (updateData.getHospitalTriageState() != null) clinic.setHospitalTriageState(updateData.getHospitalTriageState());
        if (updateData.getPharmacySalesState() != null) clinic.setPharmacySalesState(updateData.getPharmacySalesState());
        if (updateData.getPharmacyStockState() != null) clinic.setPharmacyStockState(updateData.getPharmacyStockState());
        if (updateData.getPharmacyGrnState() != null) clinic.setPharmacyGrnState(updateData.getPharmacyGrnState());
        if (updateData.getPharmacyRtpState() != null) clinic.setPharmacyRtpState(updateData.getPharmacyRtpState());

        return clinicRepository.save(clinic);
    }

    @Transactional
    public void saveHospitalData(UUID clinicId, String beds, String surgeries, String triage, String sales, String stock, String grn, String rtp) {
        Clinic clinic = clinicRepository.findById(clinicId)
                .orElseThrow(() -> new IllegalArgumentException("Clinic not found with id: " + clinicId));
        if (beds != null) clinic.setHospitalBedState(beds);
        if (surgeries != null) clinic.setHospitalOtState(surgeries);
        if (triage != null) clinic.setHospitalTriageState(triage);
        if (sales != null) clinic.setPharmacySalesState(sales);
        if (stock != null) clinic.setPharmacyStockState(stock);
        if (grn != null) clinic.setPharmacyGrnState(grn);
        if (rtp != null) clinic.setPharmacyRtpState(rtp);
        clinicRepository.save(clinic);
    }
}
