package com.nisschay.cms.repository;

import com.nisschay.cms.entity.HospitalBedEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface HospitalBedRepository extends JpaRepository<HospitalBedEntity, UUID> {
    List<HospitalBedEntity> findByClinicId(UUID clinicId);
    Optional<HospitalBedEntity> findByIdAndClinicId(UUID id, UUID clinicId);
    List<HospitalBedEntity> findByClinicIdAndStatus(UUID clinicId, String status);
}
