package com.nisschay.cms.controller;

import com.nisschay.cms.dto.req.PatientRequest;
import com.nisschay.cms.dto.res.PatientResponse;
import com.nisschay.cms.security.UserDetailsImpl;
import com.nisschay.cms.service.PatientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/patients")
@RequiredArgsConstructor
public class PatientController {

    private final PatientService patientService;

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR', 'RECEPTIONIST') or hasAuthority('WRITE_PATIENTS')")
    @PostMapping
    public ResponseEntity<PatientResponse> createPatient(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody PatientRequest request
    ) {
        PatientResponse response = patientService.createPatient(userDetails.getClinicId(), request);
        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR', 'RECEPTIONIST') or hasAuthority('WRITE_PATIENTS')")
    @PutMapping("/{id}")
    public ResponseEntity<PatientResponse> updatePatient(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id,
            @Valid @RequestBody PatientRequest request
    ) {
        PatientResponse response = patientService.updatePatient(userDetails.getClinicId(), id, request);
        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR', 'RECEPTIONIST') or hasAuthority('READ_PATIENTS')")
    @GetMapping("/new-today")
    public ResponseEntity<Long> getNewPatientsTodayCount(
            @AuthenticationPrincipal UserDetailsImpl userDetails
    ) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        long count = patientService.getNewPatientsCountToday(userDetails.getClinicId());
        return ResponseEntity.ok(count);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR', 'RECEPTIONIST') or hasAuthority('READ_PATIENTS')")
    @GetMapping("/{id}")
    public ResponseEntity<PatientResponse> getPatientById(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id
    ) {
        PatientResponse response = patientService.getPatientById(userDetails.getClinicId(), id);
        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR', 'RECEPTIONIST') or hasAuthority('READ_PATIENTS')")
    @GetMapping
    public ResponseEntity<Page<PatientResponse>> searchPatients(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Page<PatientResponse> response = patientService.searchPatients(userDetails.getClinicId(), search, page, size);
        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN')")
    @PatchMapping("/{id}/toggle-status")
    public ResponseEntity<PatientResponse> togglePatientStatus(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id
    ) {
        PatientResponse response = patientService.togglePatientActiveStatus(userDetails.getClinicId(), id);
        return ResponseEntity.ok(response);
    }
}
