package com.nisschay.cms.controller;

import com.nisschay.cms.dto.req.DoctorProfileRequest;
import com.nisschay.cms.dto.req.DoctorRegisterRequest;
import com.nisschay.cms.dto.res.DoctorResponse;
import com.nisschay.cms.security.UserDetailsImpl;
import com.nisschay.cms.service.DoctorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/doctors")
@RequiredArgsConstructor
public class DoctorController {

    private final DoctorService doctorService;

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN')")
    @PostMapping
    public ResponseEntity<DoctorResponse> registerDoctor(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody DoctorRegisterRequest request
    ) {
        DoctorResponse response = doctorService.registerDoctor(userDetails.getClinicId(), request);
        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR')")
    @PutMapping("/{id}")
    public ResponseEntity<DoctorResponse> updateDoctor(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id,
            @Valid @RequestBody DoctorProfileRequest request
    ) {
        DoctorResponse response = doctorService.updateDoctorProfile(userDetails.getClinicId(), id, request);
        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR', 'RECEPTIONIST')")
    @GetMapping
    public ResponseEntity<List<DoctorResponse>> getDoctors(
            @AuthenticationPrincipal UserDetailsImpl userDetails
    ) {
        List<DoctorResponse> response = doctorService.getDoctorsByClinic(userDetails.getClinicId());
        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN')")
    @PatchMapping("/{id}/status")
    public ResponseEntity<DoctorResponse> toggleStatus(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id
    ) {
        DoctorResponse response = doctorService.toggleDoctorStatus(userDetails.getClinicId(), id);
        return ResponseEntity.ok(response);
    }
}
