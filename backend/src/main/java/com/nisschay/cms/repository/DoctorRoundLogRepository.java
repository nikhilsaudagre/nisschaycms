package com.nisschay.cms.repository;

import com.nisschay.cms.entity.DoctorRoundLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DoctorRoundLogRepository extends JpaRepository<DoctorRoundLogEntity, UUID> {
    List<DoctorRoundLogEntity> findByAdmissionIdOrderByRoundDateDesc(UUID admissionId);
    List<DoctorRoundLogEntity> findByClinicIdOrderByRoundDateDesc(UUID clinicId);
}
