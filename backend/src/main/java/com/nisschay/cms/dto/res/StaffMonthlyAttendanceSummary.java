package com.nisschay.cms.dto.res;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffMonthlyAttendanceSummary {

    private UUID userId;
    private String staffName;
    private String employeeId;
    private String role;
    private String department;
    private int totalDaysInMonth;
    private int presentDays;
    private int leaveDays;
    private int halfDays;
    private int lateMarks;
    private int absentDays;
    private double attendancePercentage;
}
