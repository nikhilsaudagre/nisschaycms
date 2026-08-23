package com.nisschay.cms.repository;

import com.nisschay.cms.entity.PrescriptionSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface PrescriptionSettingsRepository extends JpaRepository<PrescriptionSettings, UUID> {
}
