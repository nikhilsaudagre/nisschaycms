package com.nisschay.cms.service;

import com.nisschay.cms.dto.req.DoctorRoundRequest;
import com.nisschay.cms.dto.req.InpatientAdmitRequest;
import com.nisschay.cms.dto.res.InpatientBedDetailResponse;
import com.nisschay.cms.entity.DoctorRoundLogEntity;
import com.nisschay.cms.entity.HospitalBedEntity;
import com.nisschay.cms.entity.InpatientAdmissionEntity;
import com.nisschay.cms.repository.DoctorRoundLogRepository;
import com.nisschay.cms.repository.HospitalBedRepository;
import com.nisschay.cms.repository.InpatientAdmissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InpatientService {

    private final HospitalBedRepository bedRepository;
    private final InpatientAdmissionRepository admissionRepository;
    private final DoctorRoundLogRepository roundLogRepository;

    @Transactional(readOnly = true)
    public List<InpatientAdmissionEntity> getAdmissions(UUID clinicId, UUID doctorId, UUID patientId, String status) {
        if (clinicId == null) return List.of();
        if (doctorId != null) {
            return admissionRepository.findByClinicIdAndDoctorId(clinicId, doctorId);
        }
        if (patientId != null) {
            return admissionRepository.findByClinicIdAndPatientId(clinicId, patientId);
        }
        if (status != null && !status.isBlank()) {
            return admissionRepository.findByClinicIdAndStatus(clinicId, status.toUpperCase());
        }
        return admissionRepository.findByClinicIdOrderByAdmissionDateDesc(clinicId);
    }

    @Transactional
    public List<InpatientBedDetailResponse> getClinicBeds(UUID clinicId) {
        if (clinicId == null) return List.of();

        List<HospitalBedEntity> beds = bedRepository.findByClinicId(clinicId);
        if (beds.isEmpty()) {
            // Seed default hospital beds for clinic if none exist
            beds = seedDefaultBeds(clinicId);
        }

        return beds.stream().map(this::mapToBedDetail).collect(Collectors.toList());
    }

    @Transactional
    public InpatientBedDetailResponse admitPatient(UUID clinicId, InpatientAdmitRequest req) {
        HospitalBedEntity bed = bedRepository.findByIdAndClinicId(req.getBedId(), clinicId)
                .orElseThrow(() -> new RuntimeException("Bed not found"));

        if ("OCCUPIED".equalsIgnoreCase(bed.getStatus())) {
            throw new RuntimeException("Bed " + bed.getBedNumber() + " is already occupied.");
        }

        String ipdNo = "IPD-" + System.currentTimeMillis() % 100000;

        InpatientAdmissionEntity admission = InpatientAdmissionEntity.builder()
                .clinicId(clinicId)
                .patientId(req.getPatientId())
                .patientName(req.getPatientName())
                .bedId(bed.getId())
                .bedNumber(bed.getBedNumber())
                .wardName(bed.getWardName())
                .doctorId(req.getDoctorId())
                .consultantDoctorName(req.getConsultantDoctorName() != null ? req.getConsultantDoctorName() : "Attending Consultant")
                .ipdNumber(ipdNo)
                .admissionDate(LocalDateTime.now())
                .admittingDiagnosis(req.getAdmittingDiagnosis() != null ? req.getAdmittingDiagnosis() : "Inpatient Observation & Treatment")
                .status("ACTIVE")
                .build();

        InpatientAdmissionEntity savedAdm = admissionRepository.save(admission);

        bed.setStatus("OCCUPIED");
        bed.setCurrentPatientId(req.getPatientId());
        bed.setCurrentPatientName(req.getPatientName());
        bed.setCurrentAdmissionId(savedAdm.getId());
        bedRepository.save(bed);

        return mapToBedDetail(bed);
    }

    @Transactional
    public DoctorRoundLogEntity recordDoctorRound(UUID clinicId, DoctorRoundRequest req) {
        InpatientAdmissionEntity admission = admissionRepository.findByIdAndClinicId(req.getAdmissionId(), clinicId)
                .orElseThrow(() -> new RuntimeException("Inpatient admission not found"));

        DoctorRoundLogEntity log = DoctorRoundLogEntity.builder()
                .admissionId(admission.getId())
                .clinicId(clinicId)
                .doctorId(req.getDoctorId())
                .doctorName(req.getDoctorName() != null ? req.getDoctorName() : "Attending Doctor")
                .roundDate(LocalDateTime.now())
                .temperature(req.getTemperature() != null ? req.getTemperature() : "98.6")
                .bloodPressure(req.getBloodPressure() != null ? req.getBloodPressure() : "120/80")
                .pulse(req.getPulse() != null ? req.getPulse() : "78")
                .spo2(req.getSpo2() != null ? req.getSpo2() : "99")
                .respiratoryRate(req.getRespiratoryRate() != null ? req.getRespiratoryRate() : "18")
                .clinicalNotes(req.getClinicalNotes())
                .treatmentOrders(req.getTreatmentOrders())
                .build();

        return roundLogRepository.save(log);
    }

    @Transactional
    public HospitalBedEntity updateBedStatus(UUID clinicId, UUID bedId, String status) {
        HospitalBedEntity bed = bedRepository.findByIdAndClinicId(bedId, clinicId)
                .orElseThrow(() -> new RuntimeException("Bed not found"));

        bed.setStatus(status.toUpperCase());
        if ("AVAILABLE".equalsIgnoreCase(status) || "CLEANING".equalsIgnoreCase(status)) {
            bed.setCurrentPatientId(null);
            bed.setCurrentPatientName(null);
            bed.setCurrentAdmissionId(null);
        }
        return bedRepository.save(bed);
    }

    private InpatientBedDetailResponse mapToBedDetail(HospitalBedEntity bed) {
        InpatientBedDetailResponse.InpatientBedDetailResponseBuilder builder = InpatientBedDetailResponse.builder()
                .id(bed.getId())
                .clinicId(bed.getClinicId())
                .wardName(bed.getWardName())
                .bedNumber(bed.getBedNumber())
                .dailyRate(bed.getDailyRate())
                .status(bed.getStatus())
                .currentPatientId(bed.getCurrentPatientId())
                .currentPatientName(bed.getCurrentPatientName())
                .currentAdmissionId(bed.getCurrentAdmissionId());

        if (bed.getCurrentAdmissionId() != null) {
            admissionRepository.findById(bed.getCurrentAdmissionId()).ifPresent(adm -> {
                builder.ipdNumber(adm.getIpdNumber())
                        .admissionDate(adm.getAdmissionDate())
                        .consultantDoctorName(adm.getConsultantDoctorName())
                        .admittingDiagnosis(adm.getAdmittingDiagnosis());

                List<DoctorRoundLogEntity> logs = roundLogRepository.findByAdmissionIdOrderByRoundDateDesc(adm.getId());
                builder.dailyLogs(logs);
            });
        }

        return builder.build();
    }

    private List<HospitalBedEntity> seedDefaultBeds(UUID clinicId) {
        List<HospitalBedEntity> defaultBeds = new ArrayList<>();
        String[] wards = {"ICU (Intensive Care)", "Deluxe Private Suite", "Male Medical Ward", "Female Surgical Ward", "Emergency Observation"};
        String[][] bedNumbers = {
                {"ICU-01", "ICU-02", "ICU-03"},
                {"PVT-101", "PVT-102"},
                {"GEN-M01", "GEN-M02", "GEN-M03"},
                {"GEN-F01", "GEN-F02", "GEN-F03"},
                {"EMR-01", "EMR-02"}
        };
        BigDecimal[] rates = {
                BigDecimal.valueOf(4500),
                BigDecimal.valueOf(3000),
                BigDecimal.valueOf(1200),
                BigDecimal.valueOf(1200),
                BigDecimal.valueOf(1800)
        };

        for (int w = 0; w < wards.length; w++) {
            for (String bedNo : bedNumbers[w]) {
                HospitalBedEntity b = HospitalBedEntity.builder()
                        .clinicId(clinicId)
                        .wardName(wards[w])
                        .bedNumber(bedNo)
                        .dailyRate(rates[w])
                        .status("AVAILABLE")
                        .build();
                defaultBeds.add(bedRepository.save(b));
            }
        }
        return defaultBeds;
    }
}
