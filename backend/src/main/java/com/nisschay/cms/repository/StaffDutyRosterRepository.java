package com.nisschay.cms.repository;

import com.nisschay.cms.entity.StaffDutyRosterEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StaffDutyRosterRepository extends JpaRepository<StaffDutyRosterEntity, UUID> {

    List<StaffDutyRosterEntity> findByClinicId(UUID clinicId);

    List<StaffDutyRosterEntity> findByClinicIdAndUserId(UUID clinicId, UUID userId);

    Optional<StaffDutyRosterEntity> findByClinicIdAndUserIdAndDayOfWeek(UUID clinicId, UUID userId, String dayOfWeek);
}
