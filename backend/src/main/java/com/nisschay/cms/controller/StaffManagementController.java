package com.nisschay.cms.controller;

import com.nisschay.cms.dto.res.StaffMonthlyAttendanceSummary;
import com.nisschay.cms.entity.StaffAttendanceEntity;
import com.nisschay.cms.entity.StaffDutyRosterEntity;
import com.nisschay.cms.security.UserDetailsImpl;
import com.nisschay.cms.service.StaffManagementService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/staff")
@RequiredArgsConstructor
public class StaffManagementController {

    private final StaffManagementService staffManagementService;

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR', 'RECEPTIONIST')")
    @GetMapping("/attendance")
    public ResponseEntity<List<StaffAttendanceEntity>> getDailyAttendance(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        LocalDate targetDate = date != null ? date : LocalDate.now();
        List<StaffAttendanceEntity> records = staffManagementService.getDailyAttendance(userDetails.getClinicId(), targetDate);
        return ResponseEntity.ok(records);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR', 'RECEPTIONIST')")
    @GetMapping("/attendance/summary")
    public ResponseEntity<List<StaffMonthlyAttendanceSummary>> getMonthlyAttendanceSummary(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month
    ) {
        int y = year != null ? year : LocalDate.now().getYear();
        int m = month != null ? month : LocalDate.now().getMonthValue();
        List<StaffMonthlyAttendanceSummary> summaries = staffManagementService.getMonthlyAttendanceSummary(userDetails.getClinicId(), y, m);
        return ResponseEntity.ok(summaries);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR', 'RECEPTIONIST')")
    @GetMapping("/attendance/user/{userId}")
    public ResponseEntity<List<StaffAttendanceEntity>> getStaffAttendanceHistory(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        LocalDate start = startDate != null ? startDate : LocalDate.now().minusDays(30);
        LocalDate end = endDate != null ? endDate : LocalDate.now();
        List<StaffAttendanceEntity> records = staffManagementService.getStaffAttendanceHistory(userDetails.getClinicId(), userId, start, end);
        return ResponseEntity.ok(records);
    }

    @Data
    public static class AttendancePunchRequest {
        private UUID userId;
        private LocalDate date;
        private String status; // PRESENT, ON_LEAVE, LATE, HALF_DAY, ABSENT
        private String clockInTime;
        private String clockOutTime;
        private String shiftName;
        private String location;
        private String remarks;
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'RECEPTIONIST')")
    @PostMapping("/attendance/punch")
    public ResponseEntity<StaffAttendanceEntity> punchAttendance(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody AttendancePunchRequest request
    ) {
        LocalDate targetDate = request.getDate() != null ? request.getDate() : LocalDate.now();
        LocalTime cin = request.getClockInTime() != null && !request.getClockInTime().isEmpty() ? LocalTime.parse(request.getClockInTime().substring(0, 5)) : null;
        LocalTime cout = request.getClockOutTime() != null && !request.getClockOutTime().isEmpty() ? LocalTime.parse(request.getClockOutTime().substring(0, 5)) : null;

        StaffAttendanceEntity result = staffManagementService.punchAttendance(
                userDetails.getClinicId(),
                request.getUserId(),
                targetDate,
                request.getStatus(),
                cin,
                cout,
                request.getShiftName(),
                request.getLocation(),
                request.getRemarks()
        );
        return ResponseEntity.ok(result);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'RECEPTIONIST')")
    @PostMapping("/attendance/bulk-punch")
    public ResponseEntity<List<StaffAttendanceEntity>> bulkPunchAttendance(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(defaultValue = "PRESENT") String status
    ) {
        LocalDate targetDate = date != null ? date : LocalDate.now();
        List<StaffAttendanceEntity> results = staffManagementService.bulkPunchAttendance(userDetails.getClinicId(), targetDate, status);
        return ResponseEntity.ok(results);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR', 'RECEPTIONIST')")
    @GetMapping("/roster")
    public ResponseEntity<List<StaffDutyRosterEntity>> getClinicWeeklyRoster(
            @AuthenticationPrincipal UserDetailsImpl userDetails
    ) {
        List<StaffDutyRosterEntity> records = staffManagementService.getClinicWeeklyRoster(userDetails.getClinicId());
        return ResponseEntity.ok(records);
    }

    @Data
    public static class RosterSaveRequest {
        private UUID userId;
        private String dayOfWeek;
        private String shiftName;
        private String wardOrCabin;
        private Boolean isOffDay;
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN')")
    @PostMapping("/roster/save")
    public ResponseEntity<StaffDutyRosterEntity> saveRosterSlot(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody RosterSaveRequest request
    ) {
        StaffDutyRosterEntity record = staffManagementService.saveDutyRosterSlot(
                userDetails.getClinicId(),
                request.getUserId(),
                request.getDayOfWeek(),
                request.getShiftName(),
                request.getWardOrCabin(),
                request.getIsOffDay()
        );
        return ResponseEntity.ok(record);
    }
}
