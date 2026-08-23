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
        clinic.setAddress(updateData.getAddress());
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

        return clinicRepository.save(clinic);
    }
}
