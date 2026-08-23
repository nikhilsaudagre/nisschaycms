package com.nisschay.cms.repository;

import com.nisschay.cms.entity.DoctorProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DoctorProfileRepository extends JpaRepository<DoctorProfile, UUID> {
    @Query("SELECT dp FROM DoctorProfile dp WHERE dp.user.clinic.id = :clinicId")
    List<DoctorProfile> findByClinicId(@Param("clinicId") UUID clinicId);
}
