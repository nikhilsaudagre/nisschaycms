package com.nisschay.cms.controller;

import com.nisschay.cms.entity.PrescriptionSettings;
import com.nisschay.cms.security.UserDetailsImpl;
import com.nisschay.cms.service.PrescriptionSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/prescription-settings")
@RequiredArgsConstructor
public class PrescriptionSettingsController {

    private final PrescriptionSettingsService prescriptionSettingsService;

    @GetMapping("/me")
    public ResponseEntity<PrescriptionSettings> getSettings(
            @AuthenticationPrincipal UserDetailsImpl userDetails
    ) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        PrescriptionSettings settings = prescriptionSettingsService.getSettingsByClinic(userDetails.getClinicId());
        return ResponseEntity.ok(settings);
    }

    @PutMapping("/me")
    public ResponseEntity<PrescriptionSettings> updateSettings(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody PrescriptionSettings request
    ) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        PrescriptionSettings settings = prescriptionSettingsService.updateSettings(userDetails.getClinicId(), request);
        return ResponseEntity.ok(settings);
    }
}
