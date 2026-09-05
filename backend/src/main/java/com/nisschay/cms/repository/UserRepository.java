package com.nisschay.cms.repository;

import com.nisschay.cms.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    java.util.List<User> findByClinicId(UUID clinicId);
    long countByClinicId(UUID clinicId);
    java.util.List<User> findByClinicIdAndRoleIdIn(UUID clinicId, java.util.Collection<String> roleIds);
}
