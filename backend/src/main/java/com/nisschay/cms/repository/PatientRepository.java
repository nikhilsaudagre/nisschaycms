package com.nisschay.cms.repository;

import com.nisschay.cms.entity.Patient;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PatientRepository extends JpaRepository<Patient, UUID> {

    Optional<Patient> findByIdAndClinicId(UUID id, UUID clinicId);

    Page<Patient> findByClinicId(UUID clinicId, Pageable pageable);

    List<Patient> findByClinicId(UUID clinicId);

    long countByClinicIdAndCreatedAtGreaterThanEqual(UUID clinicId, java.time.OffsetDateTime start);

    @Query("SELECT p FROM Patient p WHERE p.clinic.id = :clinicId AND " +
           "(LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "p.phone LIKE CONCAT('%', :search, '%'))")
    Page<Patient> searchPatients(
            @Param("clinicId") UUID clinicId,
            @Param("search") String search,
            Pageable pageable
    );
}
