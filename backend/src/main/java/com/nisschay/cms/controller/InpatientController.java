package com.nisschay.cms.controller;

import com.nisschay.cms.dto.req.DoctorRoundRequest;
import com.nisschay.cms.dto.req.InpatientAdmitRequest;
import com.nisschay.cms.dto.res.InpatientBedDetailResponse;
import com.nisschay.cms.entity.DoctorRoundLogEntity;
import com.nisschay.cms.entity.HospitalBedEntity;
import com.nisschay.cms.security.UserDetailsImpl;
import com.nisschay.cms.service.InpatientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/inpatient")
@RequiredArgsConstructor
public class InpatientController {

    private final InpatientService inpatientService;

    @GetMapping("/admissions")
    public ResponseEntity<List<com.nisschay.cms.entity.InpatientAdmissionEntity>> getAdmissions(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(required = false) UUID doctorId,
            @RequestParam(required = false) UUID patientId,
            @RequestParam(required = false) String status
    ) {
        UUID clinicId = userDetails != null ? userDetails.getClinicId() : null;
        List<com.nisschay.cms.entity.InpatientAdmissionEntity> response = inpatientService.getAdmissions(clinicId, doctorId, patientId, status);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/beds")
    public ResponseEntity<List<InpatientBedDetailResponse>> getBeds(
            @AuthenticationPrincipal UserDetailsImpl userDetails
    ) {
        UUID clinicId = userDetails != null ? userDetails.getClinicId() : null;
        List<InpatientBedDetailResponse> response = inpatientService.getClinicBeds(clinicId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/admit")
    public ResponseEntity<InpatientBedDetailResponse> admitPatient(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody InpatientAdmitRequest request
    ) {
        UUID clinicId = userDetails != null ? userDetails.getClinicId() : null;
        InpatientBedDetailResponse response = inpatientService.admitPatient(clinicId, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/doctor-round")
    public ResponseEntity<DoctorRoundLogEntity> recordDoctorRound(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody DoctorRoundRequest request
    ) {
        UUID clinicId = userDetails != null ? userDetails.getClinicId() : null;
        DoctorRoundLogEntity response = inpatientService.recordDoctorRound(clinicId, request);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/beds/{bedId}/status")
    public ResponseEntity<HospitalBedEntity> updateBedStatus(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID bedId,
            @RequestParam String status
    ) {
        UUID clinicId = userDetails != null ? userDetails.getClinicId() : null;
        HospitalBedEntity response = inpatientService.updateBedStatus(clinicId, bedId, status);
        return ResponseEntity.ok(response);
    }
}
