package com.nisschay.cms.service;

import com.nisschay.cms.dto.res.DemographicStatsResponse;
import com.nisschay.cms.dto.res.DoctorShareItem;
import com.nisschay.cms.dto.res.ReportSummaryResponse;
import com.nisschay.cms.dto.res.RevenueTrendItem;
import com.nisschay.cms.entity.Appointment;
import com.nisschay.cms.entity.DoctorProfile;
import com.nisschay.cms.entity.Patient;
import com.nisschay.cms.entity.User;
import com.nisschay.cms.repository.AppointmentRepository;
import com.nisschay.cms.repository.DoctorProfileRepository;
import com.nisschay.cms.repository.PatientRepository;
import com.nisschay.cms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Period;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final AppointmentRepository appointmentRepository;
    private final DoctorProfileRepository doctorProfileRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public ReportSummaryResponse getSummary(UUID clinicId, LocalDate startDate, LocalDate endDate, UUID doctorId) {
        List<Appointment> appts = fetchAppointments(clinicId, startDate, endDate, doctorId);
        List<Appointment> completed = appts.stream()
                .filter(a -> "COMPLETED".equalsIgnoreCase(a.getStatus()))
                .collect(Collectors.toList());

        long totalConsultations = completed.size();
        Map<UUID, DoctorProfile> profileMap = getDoctorProfileMap(clinicId);

        BigDecimal totalRevenue = BigDecimal.ZERO;
        Set<UUID> patientIds = new HashSet<>();

        for (Appointment a : completed) {
            DoctorProfile profile = profileMap.get(a.getDoctor().getId());
            BigDecimal fee = profile != null ? profile.getFeeForType(a.getType()) : new BigDecimal("500");
            totalRevenue = totalRevenue.add(fee);
            if (a.getPatient() != null) {
                patientIds.add(a.getPatient().getId());
            }
        }

        double averageFee = totalConsultations == 0 ? 0.0 :
                totalRevenue.divide(BigDecimal.valueOf(totalConsultations), 2, RoundingMode.HALF_UP).doubleValue();

        return ReportSummaryResponse.builder()
                .totalConsultations(totalConsultations)
                .totalRevenue(totalRevenue)
                .averageConsultationFee(averageFee)
                .activePatients(patientIds.size())
                .build();
    }

    @Transactional(readOnly = true)
    public List<RevenueTrendItem> getRevenueTrends(UUID clinicId, LocalDate startDate, LocalDate endDate, UUID doctorId) {
        List<Appointment> appts = fetchAppointments(clinicId, startDate, endDate, doctorId);
        List<Appointment> completed = appts.stream()
                .filter(a -> "COMPLETED".equalsIgnoreCase(a.getStatus()))
                .collect(Collectors.toList());

        Map<UUID, DoctorProfile> profileMap = getDoctorProfileMap(clinicId);
        Map<LocalDate, List<Appointment>> grouped = completed.stream()
                .collect(Collectors.groupingBy(Appointment::getAppointmentDate));

        List<RevenueTrendItem> trends = new ArrayList<>();
        LocalDate current = startDate;

        while (!current.isAfter(endDate)) {
            List<Appointment> dayAppts = grouped.getOrDefault(current, Collections.emptyList());
            BigDecimal amount = BigDecimal.ZERO;
            for (Appointment a : dayAppts) {
                DoctorProfile profile = profileMap.get(a.getDoctor().getId());
                BigDecimal fee = profile != null ? profile.getFeeForType(a.getType()) : new BigDecimal("500");
                amount = amount.add(fee);
            }
            trends.add(RevenueTrendItem.builder()
                    .date(current.toString())
                    .amount(amount)
                    .count(dayAppts.size())
                    .build());
            current = current.plusDays(1);
        }

        return trends;
    }

    @Transactional(readOnly = true)
    public List<DoctorShareItem> getDoctorShare(UUID clinicId, LocalDate startDate, LocalDate endDate) {
        List<Appointment> appts = fetchAppointments(clinicId, startDate, endDate, null);
        List<Appointment> completed = appts.stream()
                .filter(a -> "COMPLETED".equalsIgnoreCase(a.getStatus()))
                .collect(Collectors.toList());

        Map<UUID, DoctorProfile> profileMap = getDoctorProfileMap(clinicId);
        Map<UUID, List<Appointment>> groupedByDoc = completed.stream()
                .collect(Collectors.groupingBy(a -> a.getDoctor().getId()));

        List<DoctorShareItem> shares = new ArrayList<>();
        List<User> doctors = userRepository.findByClinicIdAndRoleIdIn(clinicId, List.of("DOCTOR", "ADMIN"));

        for (User doc : doctors) {
            UUID docId = doc.getId();
            String name = doc.getName();
            List<Appointment> docAppts = groupedByDoc.getOrDefault(docId, Collections.emptyList());
            BigDecimal revenue = BigDecimal.ZERO;

            for (Appointment a : docAppts) {
                DoctorProfile profile = profileMap.get(docId);
                BigDecimal fee = profile != null ? profile.getFeeForType(a.getType()) : new BigDecimal("500");
                revenue = revenue.add(fee);
            }

            shares.add(DoctorShareItem.builder()
                    .doctorName(name)
                    .consultationCount(docAppts.size())
                    .revenueShare(revenue)
                    .build());
        }

        return shares;
    }

    @Transactional(readOnly = true)
    public DemographicStatsResponse getDemographics(UUID clinicId) {
        List<Patient> patients = patientRepository.findByClinicId(clinicId);

        Map<String, Long> genders = new HashMap<>();
        genders.put("MALE", 0L);
        genders.put("FEMALE", 0L);
        genders.put("OTHER", 0L);

        Map<String, Long> ages = new HashMap<>();
        ages.put("0-18", 0L);
        ages.put("19-35", 0L);
        ages.put("36-50", 0L);
        ages.put("51+", 0L);

        LocalDate now = LocalDate.now();

        for (Patient p : patients) {
            // Gender
            String genderKey = p.getGender() != null ? p.getGender().toUpperCase() : "OTHER";
            if (!genders.containsKey(genderKey)) {
                genderKey = "OTHER";
            }
            genders.put(genderKey, genders.get(genderKey) + 1);

            // Age
            if (p.getDateOfBirth() != null) {
                int age = Period.between(p.getDateOfBirth(), now).getYears();
                if (age <= 18) ages.put("0-18", ages.get("0-18") + 1);
                else if (age <= 35) ages.put("19-35", ages.get("19-35") + 1);
                else if (age <= 50) ages.put("36-50", ages.get("36-50") + 1);
                else ages.put("51+", ages.get("51+") + 1);
            }
        }

        return DemographicStatsResponse.builder()
                .ageDistribution(ages)
                .genderDistribution(genders)
                .build();
    }

    private List<Appointment> fetchAppointments(UUID clinicId, LocalDate startDate, LocalDate endDate, UUID doctorId) {
        if (doctorId == null) {
            return appointmentRepository.findByClinicIdAndAppointmentDateBetween(clinicId, startDate, endDate);
        } else {
            return appointmentRepository.findByClinicIdAndDoctorIdAndAppointmentDateBetween(clinicId, doctorId, startDate, endDate);
        }
    }

    private Map<UUID, DoctorProfile> getDoctorProfileMap(UUID clinicId) {
        List<User> doctors = userRepository.findByClinicIdAndRoleIdIn(clinicId, List.of("DOCTOR", "ADMIN"));
        Map<UUID, DoctorProfile> profileMap = new HashMap<>();
        for (User doc : doctors) {
            DoctorProfile p = doctorProfileRepository.findById(doc.getId()).orElse(null);
            if (p != null) {
                profileMap.put(doc.getId(), p);
            }
        }
        return profileMap;
    }

    @Transactional(readOnly = true)
    public byte[] getAppointmentsCsvBytes(UUID clinicId, LocalDate startDate, LocalDate endDate) {
        List<Appointment> appts = fetchAppointments(clinicId, startDate, endDate, null);
        List<Appointment> completed = appts.stream()
                .filter(a -> "COMPLETED".equalsIgnoreCase(a.getStatus()))
                .sorted(Comparator.comparing(Appointment::getAppointmentDate))
                .collect(Collectors.toList());

        Map<UUID, DoctorProfile> profileMap = getDoctorProfileMap(clinicId);

        StringBuilder sb = new StringBuilder();
        sb.append("Appointment Date,Patient Name,Gender,Phone,Doctor Name,Visit Type,Fee (₹),Diagnosis,Symptoms,Notes\n");

        for (Appointment a : completed) {
            DoctorProfile profile = profileMap.get(a.getDoctor().getId());
            BigDecimal fee = profile != null ? profile.getFeeForType(a.getType()) : new BigDecimal("500");
            sb.append(escapeCsv(a.getAppointmentDate().toString())).append(",")
              .append(escapeCsv(a.getPatient() != null ? a.getPatient().getName() : "Unknown")).append(",")
              .append(escapeCsv(a.getPatient() != null ? a.getPatient().getGender() : "N/A")).append(",")
              .append(escapeCsv(a.getPatient() != null ? a.getPatient().getPhone() : "N/A")).append(",")
              .append(escapeCsv(a.getDoctor().getName())).append(",")
              .append(escapeCsv(a.getType())).append(",")
              .append(fee.toString()).append(",")
              .append(escapeCsv(a.getDiagnosis())).append(",")
              .append(escapeCsv(a.getSymptoms())).append(",")
              .append(escapeCsv(a.getNotes())).append("\n");
        }

        return sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    private String escapeCsv(String val) {
        if (val == null) return "";
        if (val.contains(",") || val.contains("\"") || val.contains("\n") || val.contains("\r")) {
            return "\"" + val.replace("\"", "\"\"") + "\"";
        }
        return val;
    }
}
