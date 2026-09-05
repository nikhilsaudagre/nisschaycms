package com.nisschay.cms.service;

import com.nisschay.cms.entity.Clinic;
import com.nisschay.cms.entity.Service;
import com.nisschay.cms.repository.ClinicRepository;
import com.nisschay.cms.repository.ServiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@org.springframework.stereotype.Service
@RequiredArgsConstructor
public class ServiceService {

    private final ServiceRepository serviceRepository;
    private final ClinicRepository clinicRepository;

    @Transactional(readOnly = true)
    public List<Service> getActiveServicesByClinic(UUID clinicId) {
        return serviceRepository.findByClinicIdAndActiveTrueOrderByCreatedAtAsc(clinicId);
    }

    @Transactional(readOnly = true)
    public List<Service> getAllServicesByClinic(UUID clinicId) {
        return serviceRepository.findByClinicIdOrderByCreatedAtAsc(clinicId);
    }

    @Transactional
    public Service createService(UUID clinicId, Service service) {
        Clinic clinic = clinicRepository.findById(clinicId)
                .orElseThrow(() -> new IllegalArgumentException("Clinic not found"));
        service.setClinic(clinic);
        service.setActive(true);
        if (service.getCategory() == null || service.getCategory().isBlank()) {
            service.setCategory("PROCEDURE");
        }
        if (service.getHsnSacCode() == null || service.getHsnSacCode().isBlank()) {
            service.setHsnSacCode("999312");
        }
        return serviceRepository.save(service);
    }

    @Transactional
    public Service updateService(UUID clinicId, UUID serviceId, Service updateData) {
        Service service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new IllegalArgumentException("Service not found"));

        if (!service.getClinic().getId().equals(clinicId)) {
            throw new IllegalArgumentException("Unauthorized to modify this service");
        }

        service.setName(updateData.getName());
        service.setFee(updateData.getFee());
        if (updateData.getCategory() != null) {
            service.setCategory(updateData.getCategory());
        }
        if (updateData.getHsnSacCode() != null) {
            service.setHsnSacCode(updateData.getHsnSacCode());
        }
        service.setDoctorId(updateData.getDoctorId());
        service.setDoctorName(updateData.getDoctorName());
        service.setDescription(updateData.getDescription());
        if (updateData.getActive() != null) {
            service.setActive(updateData.getActive());
        }

        return serviceRepository.save(service);
    }

    @Transactional
    public Service toggleServiceStatus(UUID clinicId, UUID serviceId) {
        Service service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new IllegalArgumentException("Service not found"));

        if (!service.getClinic().getId().equals(clinicId)) {
            throw new IllegalArgumentException("Unauthorized to modify this service");
        }

        service.setActive(!Boolean.TRUE.equals(service.getActive()));
        return serviceRepository.save(service);
    }

    @Transactional
    public void deactivateService(UUID clinicId, UUID serviceId) {
        Service service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new IllegalArgumentException("Service not found"));

        if (!service.getClinic().getId().equals(clinicId)) {
            throw new IllegalArgumentException("Unauthorized to modify this service");
        }

        service.setActive(false);
        serviceRepository.save(service);
    }

    @Transactional
    public void deleteServicePermanently(UUID clinicId, UUID serviceId) {
        Service service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new IllegalArgumentException("Service not found"));

        if (!service.getClinic().getId().equals(clinicId)) {
            throw new IllegalArgumentException("Unauthorized to delete this service");
        }

        serviceRepository.delete(service);
    }

    @Transactional
    public void deleteService(UUID clinicId, UUID serviceId) {
        deleteServicePermanently(clinicId, serviceId);
    }
}
