package com.nisschay.cms.controller;

import com.nisschay.cms.dto.res.DemographicStatsResponse;
import com.nisschay.cms.dto.res.DoctorShareItem;
import com.nisschay.cms.dto.res.ReportSummaryResponse;
import com.nisschay.cms.dto.res.RevenueTrendItem;
import com.nisschay.cms.security.UserDetailsImpl;
import com.nisschay.cms.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR') or hasAuthority('VIEW_REPORTS')")
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/summary")
    public ResponseEntity<ReportSummaryResponse> getSummary(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) UUID doctorId
    ) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }

        UUID clinicId = userDetails.getClinicId();
        UUID effectiveDoctorId = doctorId;

        // Secure: Doctors can only see their own reports
        if ("DOCTOR".equalsIgnoreCase(userDetails.getRole())) {
            effectiveDoctorId = userDetails.getId();
        }

        ReportSummaryResponse summary = reportService.getSummary(clinicId, startDate, endDate, effectiveDoctorId);
        return ResponseEntity.ok(summary);
    }

    @GetMapping("/revenue-trends")
    public ResponseEntity<List<RevenueTrendItem>> getRevenueTrends(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) UUID doctorId
    ) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }

        UUID clinicId = userDetails.getClinicId();
        UUID effectiveDoctorId = doctorId;

        // Secure: Doctors can only see their own trends
        if ("DOCTOR".equalsIgnoreCase(userDetails.getRole())) {
            effectiveDoctorId = userDetails.getId();
        }

        List<RevenueTrendItem> trends = reportService.getRevenueTrends(clinicId, startDate, endDate, effectiveDoctorId);
        return ResponseEntity.ok(trends);
    }

    @GetMapping("/doctor-share")
    public ResponseEntity<List<DoctorShareItem>> getDoctorShare(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }

        // Restrict: Doctor share is for Admins/Receptionists
        if ("DOCTOR".equalsIgnoreCase(userDetails.getRole())) {
            return ResponseEntity.status(403).build();
        }

        List<DoctorShareItem> shares = reportService.getDoctorShare(userDetails.getClinicId(), startDate, endDate);
        return ResponseEntity.ok(shares);
    }

    @GetMapping("/demographics")
    public ResponseEntity<DemographicStatsResponse> getDemographics(
            @AuthenticationPrincipal UserDetailsImpl userDetails
    ) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }

        DemographicStatsResponse demographics = reportService.getDemographics(userDetails.getClinicId());
        return ResponseEntity.ok(demographics);
    }

    @GetMapping("/export-csv")
    public ResponseEntity<byte[]> exportCsv(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }

        byte[] csvBytes = reportService.getAppointmentsCsvBytes(userDetails.getClinicId(), startDate, endDate);
        String filename = String.format("clinic_report_%s_to_%s.csv", startDate, endDate);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csvBytes);
    }
}
