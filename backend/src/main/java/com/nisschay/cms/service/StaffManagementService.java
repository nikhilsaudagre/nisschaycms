package com.nisschay.cms.service;

import com.nisschay.cms.dto.res.StaffMonthlyAttendanceSummary;
import com.nisschay.cms.entity.StaffAttendanceEntity;
import com.nisschay.cms.entity.StaffDutyRosterEntity;
import com.nisschay.cms.entity.User;
import com.nisschay.cms.repository.StaffAttendanceRepository;
import com.nisschay.cms.repository.StaffDutyRosterRepository;
import com.nisschay.cms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StaffManagementService {

    private final StaffAttendanceRepository attendanceRepository;
    private final StaffDutyRosterRepository rosterRepository;
    private final UserRepository userRepository;

    public List<StaffAttendanceEntity> getDailyAttendance(UUID clinicId, LocalDate date) {
        return attendanceRepository.findByClinicIdAndAttendanceDate(clinicId, date);
    }

    public List<StaffAttendanceEntity> getStaffAttendanceHistory(UUID clinicId, UUID userId, LocalDate startDate, LocalDate endDate) {
        return attendanceRepository.findByClinicIdAndUserIdAndAttendanceDateBetween(clinicId, userId, startDate, endDate);
    }

    public List<StaffMonthlyAttendanceSummary> getMonthlyAttendanceSummary(UUID clinicId, int year, int month) {
        YearMonth ym = YearMonth.of(year, month);
        LocalDate start = ym.atDay(1);
        LocalDate end = ym.atEndOfMonth();
        int daysInMonth = ym.lengthOfMonth();

        List<User> staffMembers = userRepository.findByClinicId(clinicId);
        List<StaffAttendanceEntity> monthPunches = attendanceRepository.findByClinicIdAndAttendanceDateBetween(clinicId, start, end);

        Map<UUID, List<StaffAttendanceEntity>> punchesByUser = monthPunches.stream()
                .collect(Collectors.groupingBy(StaffAttendanceEntity::getUserId));

        List<StaffMonthlyAttendanceSummary> summaries = new ArrayList<>();

        for (User u : staffMembers) {
            List<StaffAttendanceEntity> uPunches = punchesByUser.getOrDefault(u.getId(), List.of());

            int present = 0;
            int leave = 0;
            int halfDay = 0;
            int late = 0;
            int absent = 0;

            for (StaffAttendanceEntity p : uPunches) {
                String st = p.getStatus() != null ? p.getStatus().toUpperCase() : "PRESENT";
                switch (st) {
                    case "PRESENT": present++; break;
                    case "ON_LEAVE": leave++; break;
                    case "HALF_DAY": halfDay++; break;
                    case "LATE": late++; break;
                    case "ABSENT": absent++; break;
                    default: present++; break;
                }
            }

            double effectivePresent = present + late + (halfDay * 0.5);
            double pct = daysInMonth > 0 ? Math.min(100.0, Math.round((effectivePresent / (double) daysInMonth) * 1000.0) / 10.0) : 0.0;

            summaries.add(StaffMonthlyAttendanceSummary.builder()
                    .userId(u.getId())
                    .staffName(u.getName())
                    .employeeId(u.getEmployeeId())
                    .role(u.getRole() != null ? u.getRole().getName() : "STAFF")
                    .department(u.getDepartment() != null ? u.getDepartment() : "General Hospital Operations")
                    .totalDaysInMonth(daysInMonth)
                    .presentDays(present)
                    .leaveDays(leave)
                    .halfDays(halfDay)
                    .lateMarks(late)
                    .absentDays(absent)
                    .attendancePercentage(pct)
                    .build());
        }

        return summaries;
    }

    @Transactional
    public StaffAttendanceEntity punchAttendance(
            UUID clinicId,
            UUID userId,
            LocalDate date,
            String status,
            LocalTime clockInTime,
            LocalTime clockOutTime,
            String shiftName,
            String location,
            String remarks
    ) {
        if (date != null && !date.equals(LocalDate.now())) {
            throw new IllegalArgumentException("Attendance punching is only permitted for the current day (" + LocalDate.now() + "). Historical past dates and future dates cannot be altered.");
        }

        StaffAttendanceEntity record = attendanceRepository
                .findByClinicIdAndUserIdAndAttendanceDate(clinicId, userId, date)
                .orElseGet(() -> StaffAttendanceEntity.builder()
                        .clinicId(clinicId)
                        .userId(userId)
                        .attendanceDate(date)
                        .build());

        if (status != null) record.setStatus(status);
        if (clockInTime != null) record.setClockInTime(clockInTime);
        if (clockOutTime != null) record.setClockOutTime(clockOutTime);
        if (shiftName != null) record.setShiftName(shiftName);
        if (location != null) record.setAssignedLocation(location);
        if (remarks != null) record.setRemarks(remarks);

        return attendanceRepository.save(record);
    }

    @Transactional
    public List<StaffAttendanceEntity> bulkPunchAttendance(UUID clinicId, LocalDate date, String status) {
        if (date != null && !date.equals(LocalDate.now())) {
            throw new IllegalArgumentException("Bulk attendance punching is only permitted for today's active shift (" + LocalDate.now() + ").");
        }

        List<User> staffMembers = userRepository.findByClinicId(clinicId);
        List<StaffAttendanceEntity> saved = new ArrayList<>();
        LocalTime nowTime = LocalTime.now();

        for (User u : staffMembers) {
            StaffAttendanceEntity record = attendanceRepository
                    .findByClinicIdAndUserIdAndAttendanceDate(clinicId, u.getId(), date)
                    .orElseGet(() -> StaffAttendanceEntity.builder()
                            .clinicId(clinicId)
                            .userId(u.getId())
                            .attendanceDate(date)
                            .shiftName(u.getShiftTiming() != null ? u.getShiftTiming() : "General Shift")
                            .assignedLocation(u.getDeskNumber() != null ? u.getDeskNumber() : "General Station")
                            .clockInTime(nowTime)
                            .build());

            record.setStatus(status != null ? status : "PRESENT");
            if (record.getClockInTime() == null && "PRESENT".equalsIgnoreCase(status)) {
                record.setClockInTime(nowTime);
            }
            saved.add(attendanceRepository.save(record));
        }

        return saved;
    }

    public List<StaffDutyRosterEntity> getClinicWeeklyRoster(UUID clinicId) {
        return rosterRepository.findByClinicId(clinicId);
    }

    @Transactional
    public StaffDutyRosterEntity saveDutyRosterSlot(
            UUID clinicId,
            UUID userId,
            String dayOfWeek,
            String shiftName,
            String wardOrCabin,
            Boolean isOffDay
    ) {
        StaffDutyRosterEntity record = rosterRepository
                .findByClinicIdAndUserIdAndDayOfWeek(clinicId, userId, dayOfWeek.toUpperCase())
                .orElseGet(() -> StaffDutyRosterEntity.builder()
                        .clinicId(clinicId)
                        .userId(userId)
                        .dayOfWeek(dayOfWeek.toUpperCase())
                        .build());

        if (shiftName != null) record.setShiftName(shiftName);
        if (wardOrCabin != null) record.setAssignedWardOrCabin(wardOrCabin);
        if (isOffDay != null) record.setIsOffDay(isOffDay);

        return rosterRepository.save(record);
    }
}
