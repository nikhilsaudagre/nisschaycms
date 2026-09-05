package com.nisschay.cms.controller;

import com.nisschay.cms.entity.Service;
import com.nisschay.cms.security.UserDetailsImpl;
import com.nisschay.cms.service.ServiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/services")
@RequiredArgsConstructor
public class ServiceController {

    private final ServiceService serviceService;

    @GetMapping
    public ResponseEntity<List<Service>> getServices(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(required = false, defaultValue = "false") boolean includeInactive
    ) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        List<Service> services = includeInactive 
                ? serviceService.getAllServicesByClinic(userDetails.getClinicId())
                : serviceService.getActiveServicesByClinic(userDetails.getClinicId());
        return ResponseEntity.ok(services);
    }

    @PostMapping
    public ResponseEntity<Service> createService(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody Service service
    ) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        Service response = serviceService.createService(userDetails.getClinicId(), service);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Service> updateService(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id,
            @RequestBody Service service
    ) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        Service response = serviceService.updateService(userDetails.getClinicId(), id, service);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/toggle-status")
    public ResponseEntity<Service> toggleServiceStatus(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id
    ) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        Service response = serviceService.toggleServiceStatus(userDetails.getClinicId(), id);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteService(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id,
            @RequestParam(required = false, defaultValue = "true") boolean permanent
    ) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        if (permanent) {
            serviceService.deleteServicePermanently(userDetails.getClinicId(), id);
        } else {
            serviceService.deactivateService(userDetails.getClinicId(), id);
        }
        return ResponseEntity.noContent().build();
    }
}
