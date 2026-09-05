package com.nisschay.cms.repository;

import com.nisschay.cms.entity.StaffAttendanceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StaffAttendanceRepository extends JpaRepository<StaffAttendanceEntity, UUID> {

    List<StaffAttendanceEntity> findByClinicIdAndAttendanceDate(UUID clinicId, LocalDate attendanceDate);

    Optional<StaffAttendanceEntity> findByClinicIdAndUserIdAndAttendanceDate(UUID clinicId, UUID userId, LocalDate attendanceDate);

    List<StaffAttendanceEntity> findByClinicIdAndUserIdAndAttendanceDateBetween(UUID clinicId, UUID userId, LocalDate startDate, LocalDate endDate);

    List<StaffAttendanceEntity> findByClinicIdAndAttendanceDateBetween(UUID clinicId, LocalDate startDate, LocalDate endDate);
}
