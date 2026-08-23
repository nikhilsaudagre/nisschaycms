package com.nisschay.cms.controller;

import com.nisschay.cms.dto.req.MedicineRequest;
import com.nisschay.cms.dto.res.MedicineResponse;
import com.nisschay.cms.security.UserDetailsImpl;
import com.nisschay.cms.service.MedicineService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/medicines")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR')")
public class MedicineController {

    private final MedicineService medicineService;

    @GetMapping
    public ResponseEntity<List<MedicineResponse>> getAllMedicines(
            @AuthenticationPrincipal UserDetailsImpl userDetails
    ) {
        List<MedicineResponse> response = medicineService.getAllMedicines(userDetails.getClinicId());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/search")
    public ResponseEntity<List<MedicineResponse>> searchOrSuggestMedicines(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(required = false) String query
    ) {
        List<MedicineResponse> response = medicineService.searchOrSuggestMedicines(userDetails.getClinicId(), query);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/reseed")
    public ResponseEntity<List<MedicineResponse>> reseedMedicines(
            @AuthenticationPrincipal UserDetailsImpl userDetails
    ) {
        List<MedicineResponse> response = medicineService.reseedDefaultMedicines(userDetails.getClinicId());
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<MedicineResponse> createMedicine(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody MedicineRequest request
    ) {
        MedicineResponse response = medicineService.createMedicine(userDetails.getClinicId(), request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/bulk")
    public ResponseEntity<List<MedicineResponse>> createMedicinesBulk(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody List<MedicineRequest> requests
    ) {
        List<MedicineResponse> response = medicineService.createMedicinesBulk(userDetails.getClinicId(), requests);
        return ResponseEntity.ok(response);
    }

    @PostMapping(value = "/upload", consumes = "multipart/form-data")
    public ResponseEntity<List<MedicineResponse>> uploadMedicinesFile(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file
    ) {
        List<MedicineResponse> response = medicineService.importMedicinesFile(userDetails.getClinicId(), file);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/reset")
    public ResponseEntity<Void> resetClinicMedicines(
            @AuthenticationPrincipal UserDetailsImpl userDetails
    ) {
        medicineService.resetClinicMedicines(userDetails.getClinicId());
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<MedicineResponse> updateMedicine(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id,
            @Valid @RequestBody MedicineRequest request
    ) {
        MedicineResponse response = medicineService.updateMedicine(userDetails.getClinicId(), id, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMedicine(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id
    ) {
        medicineService.deleteMedicine(userDetails.getClinicId(), id);
        return ResponseEntity.noContent().build();
    }
}
