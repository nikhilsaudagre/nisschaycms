package com.nisschay.cms.repository;

import com.nisschay.cms.entity.BillingLedgerEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BillingLedgerRepository extends JpaRepository<BillingLedgerEntry, UUID> {

    List<BillingLedgerEntry> findByClinicIdAndPatientIdOrderByCreatedAtAsc(UUID clinicId, UUID patientId);

    List<BillingLedgerEntry> findByPatientIdOrderByCreatedAtAsc(UUID patientId);

    List<BillingLedgerEntry> findByClinicIdOrderByCreatedAtDesc(UUID clinicId);

    List<BillingLedgerEntry> findByClinicIdAndEncounterId(UUID clinicId, String encounterId);
}
