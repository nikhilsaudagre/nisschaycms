package com.nisschay.cms.controller;

import com.nisschay.cms.entity.Clinic;
import com.nisschay.cms.security.UserDetailsImpl;
import com.nisschay.cms.service.ClinicService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/clinics")
@RequiredArgsConstructor
public class ClinicController {

    private final ClinicService clinicService;

    @GetMapping("/me")
    public ResponseEntity<Clinic> getCurrentClinic(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        Clinic clinic = clinicService.getClinicById(userDetails.getClinicId());
        return ResponseEntity.ok(clinic);
    }

    @PutMapping("/me")
    public ResponseEntity<Clinic> updateClinic(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody Clinic request
    ) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        Clinic clinic = clinicService.updateClinic(userDetails.getClinicId(), request);
        return ResponseEntity.ok(clinic);
    }
}
