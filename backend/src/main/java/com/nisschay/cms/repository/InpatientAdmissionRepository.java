package com.nisschay.cms.repository;

import com.nisschay.cms.entity.InpatientAdmissionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InpatientAdmissionRepository extends JpaRepository<InpatientAdmissionEntity, UUID> {
    List<InpatientAdmissionEntity> findByClinicId(UUID clinicId);
    List<InpatientAdmissionEntity> findByClinicIdOrderByAdmissionDateDesc(UUID clinicId);
    Optional<InpatientAdmissionEntity> findByIdAndClinicId(UUID id, UUID clinicId);
    List<InpatientAdmissionEntity> findByClinicIdAndPatientId(UUID clinicId, UUID patientId);
    List<InpatientAdmissionEntity> findByClinicIdAndDoctorId(UUID clinicId, UUID doctorId);
    List<InpatientAdmissionEntity> findByClinicIdAndStatus(UUID clinicId, String status);
}
