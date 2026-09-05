package com.nisschay.cms.controller;

import com.nisschay.cms.dto.req.AppointmentRequest;
import com.nisschay.cms.dto.req.ConsultationRequest;
import com.nisschay.cms.dto.res.AppointmentResponse;
import com.nisschay.cms.security.UserDetailsImpl;
import com.nisschay.cms.service.AppointmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;
    private final com.nisschay.cms.service.PrescriptionPdfService prescriptionPdfService;

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR', 'RECEPTIONIST') or hasAuthority('READ_APPOINTMENTS')")
    @GetMapping("/{id}/prescription-pdf")
    public ResponseEntity<byte[]> getPrescriptionPdf(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id
    ) {
        byte[] pdfBytes = prescriptionPdfService.generatePrescriptionPdf(userDetails.getClinicId(), id);
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_TYPE, org.springframework.http.MediaType.APPLICATION_PDF_VALUE)
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"prescription-" + id + ".pdf\"")
                .body(pdfBytes);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR', 'RECEPTIONIST') or hasAuthority('WRITE_APPOINTMENTS')")
    @PostMapping
    public ResponseEntity<AppointmentResponse> createAppointment(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody AppointmentRequest request
    ) {
        AppointmentResponse response = appointmentService.createAppointment(userDetails.getClinicId(), request);
        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR', 'RECEPTIONIST') or hasAuthority('WRITE_APPOINTMENTS')")
    @PutMapping("/{id}")
    public ResponseEntity<AppointmentResponse> updateAppointment(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id,
            @Valid @RequestBody AppointmentRequest request
    ) {
        AppointmentResponse response = appointmentService.updateAppointment(userDetails.getClinicId(), id, request);
        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR', 'RECEPTIONIST') or hasAuthority('WRITE_APPOINTMENTS')")
    @PatchMapping("/{id}/status")
    public ResponseEntity<AppointmentResponse> updateStatus(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id,
            @RequestParam String status,
            @RequestParam(required = false) String type
    ) {
        AppointmentResponse response = appointmentService.updateStatus(userDetails.getClinicId(), id, status, type);
        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR', 'RECEPTIONIST') or hasAuthority('READ_APPOINTMENTS')")
    @GetMapping
    public ResponseEntity<List<AppointmentResponse>> getAppointments(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) UUID doctorId
    ) {
        LocalDate queryDate = (date != null) ? date : LocalDate.now();
        List<AppointmentResponse> response = appointmentService.getAppointmentsByDate(userDetails.getClinicId(), queryDate, doctorId);
        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR', 'RECEPTIONIST') or hasAuthority('READ_APPOINTMENTS')")
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<AppointmentResponse>> getPatientAppointments(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID patientId
    ) {
        List<AppointmentResponse> response = appointmentService.getAppointmentsForPatient(userDetails.getClinicId(), patientId);
        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR', 'RECEPTIONIST') or hasAuthority('READ_APPOINTMENTS')")
    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<List<AppointmentResponse>> getDoctorAppointments(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID doctorId
    ) {
        List<AppointmentResponse> response = appointmentService.getAppointmentsForDoctor(userDetails.getClinicId(), doctorId);
        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR')")
    @PostMapping("/{id}/consultation")
    public ResponseEntity<AppointmentResponse> saveConsultation(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id,
            @RequestBody ConsultationRequest request
    ) {
        AppointmentResponse response = appointmentService.saveConsultation(userDetails.getClinicId(), id, request);
        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN')")
    @PostMapping("/reset-today")
    public ResponseEntity<Void> resetToday(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam String password
    ) {
        appointmentService.resetTodayAppointments(userDetails.getClinicId(), userDetails.getId(), password);
        return ResponseEntity.ok().build();
    }
}
