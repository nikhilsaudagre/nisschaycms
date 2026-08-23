package com.nisschay.cms.repository;

import com.nisschay.cms.entity.Medicine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MedicineRepository extends JpaRepository<Medicine, UUID> {
    
    @Query("SELECT m FROM Medicine m LEFT JOIN m.clinic c WHERE m.active = true AND (c.id = :clinicId OR c.id IS NULL) ORDER BY m.name ASC")
    List<Medicine> findAllActiveMedicines(@Param("clinicId") UUID clinicId);

    @Query("SELECT m FROM Medicine m LEFT JOIN m.clinic c WHERE m.active = true AND (c.id = :clinicId OR c.id IS NULL) AND " +
           "(LOWER(m.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(m.manufacturerName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(m.saltComposition) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<Medicine> searchMedicines(@Param("clinicId") UUID clinicId, @Param("query") String query);

    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE Medicine m SET m.active = false WHERE m.clinic.id = :clinicId")
    void deactivateAllByClinicId(@Param("clinicId") UUID clinicId);

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM Medicine m WHERE m.clinic.id = :clinicId OR m.clinic IS NULL")
    void deleteAllMedicinesForClinic(@Param("clinicId") UUID clinicId);
}
