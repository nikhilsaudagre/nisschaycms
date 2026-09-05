package com.nisschay.cms.controller;

import com.nisschay.cms.entity.Clinic;
import com.nisschay.cms.security.UserDetailsImpl;
import com.nisschay.cms.service.ClinicService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
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

    @GetMapping("/hospital-data")
    public ResponseEntity<Map<String, String>> getHospitalData(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        Clinic clinic = clinicService.getClinicById(userDetails.getClinicId());
        Map<String, String> data = new HashMap<>();
        data.put("beds", clinic.getHospitalBedState());
        data.put("surgeries", clinic.getHospitalOtState());
        data.put("triage", clinic.getHospitalTriageState());
        data.put("sales", clinic.getPharmacySalesState());
        data.put("stock", clinic.getPharmacyStockState());
        data.put("grn", clinic.getPharmacyGrnState());
        data.put("rtp", clinic.getPharmacyRtpState());
        return ResponseEntity.ok(data);
    }

    @PostMapping("/hospital-data")
    public ResponseEntity<Map<String, Object>> saveHospitalData(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody Map<String, Object> request
    ) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        java.util.function.Function<Object, String> toStringHelper = (obj) -> {
            if (obj == null) return null;
            if (obj instanceof String) return (String) obj;
            try {
                return mapper.writeValueAsString(obj);
            } catch (Exception e) {
                return obj.toString();
            }
        };

        clinicService.saveHospitalData(
                userDetails.getClinicId(),
                toStringHelper.apply(request.get("beds")),
                toStringHelper.apply(request.get("surgeries")),
                toStringHelper.apply(request.get("triage")),
                toStringHelper.apply(request.get("sales")),
                toStringHelper.apply(request.get("stock")),
                toStringHelper.apply(request.get("grn")),
                toStringHelper.apply(request.get("rtp"))
        );
        return ResponseEntity.ok(request);
    }
}
