package com.nisschay.cms.repository;

import com.nisschay.cms.entity.Clinic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClinicRepository extends JpaRepository<Clinic, UUID> {
    Optional<Clinic> findByEmail(String email);
    boolean existsByEmail(String email);
}
