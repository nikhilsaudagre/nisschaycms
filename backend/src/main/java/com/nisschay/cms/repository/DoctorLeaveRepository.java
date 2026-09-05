package com.nisschay.cms.repository;

import com.nisschay.cms.entity.DoctorLeaveEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface DoctorLeaveRepository extends JpaRepository<DoctorLeaveEntity, UUID> {

    List<DoctorLeaveEntity> findByClinicIdAndDoctorIdOrderByStartDateDesc(UUID clinicId, UUID doctorId);

    List<DoctorLeaveEntity> findByClinicIdAndStatusOrderByStartDateDesc(UUID clinicId, String status);

    @Query("SELECT l FROM DoctorLeaveEntity l WHERE l.clinicId = :clinicId AND l.doctorId = :doctorId " +
           "AND l.status = 'APPROVED' AND :date BETWEEN l.startDate AND l.endDate")
    List<DoctorLeaveEntity> findActiveLeaveOnDate(@Param("clinicId") UUID clinicId, 
                                                @Param("doctorId") UUID doctorId, 
                                                @Param("date") LocalDate date);

    @Query("SELECT l FROM DoctorLeaveEntity l WHERE l.clinicId = :clinicId " +
           "AND l.status = 'APPROVED' AND l.endDate >= :today ORDER BY l.startDate ASC")
    List<DoctorLeaveEntity> findUpcomingLeavesByClinic(@Param("clinicId") UUID clinicId, 
                                                      @Param("today") LocalDate today);
}
