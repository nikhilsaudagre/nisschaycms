package com.nisschay.cms.service;

import com.nisschay.cms.dto.req.AppointmentRequest;
import com.nisschay.cms.dto.req.ConsultationRequest;
import com.nisschay.cms.dto.res.AppointmentResponse;
import com.nisschay.cms.entity.Appointment;
import com.nisschay.cms.entity.Clinic;
import com.nisschay.cms.entity.Patient;
import com.nisschay.cms.entity.User;
import com.nisschay.cms.exception.ResourceNotFoundException;
import com.nisschay.cms.repository.AppointmentRepository;
import com.nisschay.cms.repository.ClinicRepository;
import com.nisschay.cms.repository.DoctorLeaveRepository;
import com.nisschay.cms.repository.PatientRepository;
import com.nisschay.cms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final ClinicRepository clinicRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final DoctorLeaveRepository doctorLeaveRepository;
    private final PasswordEncoder passwordEncoder;
    private final QueueStreamService queueStreamService;

    @Transactional
    public AppointmentResponse createAppointment(UUID clinicId, AppointmentRequest request) {
        Clinic clinic = clinicRepository.findById(clinicId)
                .orElseThrow(() -> new ResourceNotFoundException("Clinic not found"));

        Patient patient = patientRepository.findByIdAndClinicId(request.getPatientId(), clinicId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found in this clinic"));

        User doctor = userRepository.findById(request.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found"));

        if (doctor.getClinic() != null && !doctor.getClinic().getId().equals(clinicId)) {
            throw new IllegalArgumentException("Doctor does not belong to this clinic");
        }

        // 1. Real-time validation against clinic operating schedule, closed days, and holidays
        validateClinicSchedule(clinic, request.getAppointmentDate(), request.getStartTime(), request.getEndTime(), doctor.getId(), null);

        // 2. Validate time slot clash / double-booking prevention
        List<Appointment> existingAppointments = appointmentRepository
                .findByClinicIdAndDoctorIdAndAppointmentDateOrderByStartTimeAsc(clinicId, doctor.getId(), request.getAppointmentDate());

        java.time.LocalTime reqStart = request.getStartTime();
        java.time.LocalTime reqEnd = request.getEndTime();

        boolean hasConflict = existingAppointments.stream()
                .filter(a -> !"CANCELLED".equalsIgnoreCase(a.getStatus()))
                .anyMatch(a -> {
                    java.time.LocalTime existStart = a.getStartTime();
                    java.time.LocalTime existEnd = a.getEndTime() != null ? a.getEndTime() : existStart.plusMinutes(15);
                    return reqStart.isBefore(existEnd) && existStart.isBefore(reqEnd);
                });

        if (hasConflict && Boolean.FALSE.equals(clinic.getDoubleBookingAllowed())) {
            throw new IllegalArgumentException("The selected time slot (" + reqStart + " - " + reqEnd + ") is already booked for Dr. " + doctor.getName() + ". Please choose another available slot.");
        }

        Appointment appointment = Appointment.builder()
                .clinic(clinic)
                .patient(patient)
                .doctor(doctor)
                .appointmentDate(request.getAppointmentDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .status("SCHEDULED")
                .type(request.getType())
                .reason(request.getReason())
                .notes(request.getNotes())
                .build();

        Appointment saved = appointmentRepository.save(appointment);
        queueStreamService.broadcastQueueUpdate(clinicId, "APPOINTMENT_CREATED", saved.getId().toString());
        return AppointmentResponse.build(saved);
    }

    @Transactional
    public AppointmentResponse updateAppointment(UUID clinicId, UUID id, AppointmentRequest request) {
        Appointment appointment = appointmentRepository.findByIdAndClinicId(id, clinicId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found in this clinic"));

        Clinic clinic = appointment.getClinic();

        Patient patient = patientRepository.findByIdAndClinicId(request.getPatientId(), clinicId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found in this clinic"));

        User doctor = userRepository.findById(request.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found"));

        if (doctor.getClinic() != null && !doctor.getClinic().getId().equals(clinicId)) {
            throw new IllegalArgumentException("Doctor does not belong to this clinic");
        }

        // 1. Real-time validation against clinic operating schedule, closed days, and holidays
        validateClinicSchedule(clinic, request.getAppointmentDate(), request.getStartTime(), request.getEndTime(), doctor.getId(), id);

        // 2. Validate time slot clash on update (excluding current appointment id)
        List<Appointment> existingAppointments = appointmentRepository
                .findByClinicIdAndDoctorIdAndAppointmentDateOrderByStartTimeAsc(clinicId, doctor.getId(), request.getAppointmentDate());

        java.time.LocalTime reqStart = request.getStartTime();
        java.time.LocalTime reqEnd = request.getEndTime();

        boolean hasConflict = existingAppointments.stream()
                .filter(a -> !a.getId().equals(id))
                .filter(a -> !"CANCELLED".equalsIgnoreCase(a.getStatus()))
                .anyMatch(a -> {
                    java.time.LocalTime existStart = a.getStartTime();
                    java.time.LocalTime existEnd = a.getEndTime() != null ? a.getEndTime() : existStart.plusMinutes(15);
                    return reqStart.isBefore(existEnd) && existStart.isBefore(reqEnd);
                });

        if (hasConflict && (clinic == null || Boolean.FALSE.equals(clinic.getDoubleBookingAllowed()))) {
            throw new IllegalArgumentException("The selected time slot (" + reqStart + " - " + reqEnd + ") is already booked for Dr. " + doctor.getName() + ". Please choose another available slot.");
        }

        appointment.setPatient(patient);
        appointment.setDoctor(doctor);
        appointment.setAppointmentDate(request.getAppointmentDate());
        appointment.setStartTime(request.getStartTime());
        appointment.setEndTime(request.getEndTime());
        appointment.setType(request.getType());
        appointment.setReason(request.getReason());
        appointment.setNotes(request.getNotes());

        Appointment saved = appointmentRepository.save(appointment);
        return AppointmentResponse.build(saved);
    }

    @Transactional
    public AppointmentResponse updateStatus(UUID clinicId, UUID id, String status, String type) {
        Appointment appointment = appointmentRepository.findByIdAndClinicId(id, clinicId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found in this clinic"));

        // Validate status
        String normalizedStatus = status.trim().toUpperCase();
        switch (normalizedStatus) {
            case "SCHEDULED":
            case "CHECKED_IN":
            case "IN_CONSULTATION":
            case "COMPLETED":
            case "CANCELLED":
            case "NO_SHOW":
                appointment.setStatus(normalizedStatus);
                break;
            default:
                throw new IllegalArgumentException("Invalid appointment status: " + status);
        }

        if (type != null && !type.trim().isEmpty()) {
            String normalizedType = type.trim().toUpperCase();
            switch (normalizedType) {
                case "CONSULTATION":
                case "FOLLOW_UP":
                case "EMERGENCY":
                    appointment.setType(normalizedType);
                    break;
                default:
                    break;
            }
        }

        Appointment saved = appointmentRepository.save(appointment);
        queueStreamService.broadcastQueueUpdate(clinicId, "QUEUE_STATUS_CHANGED", saved.getId().toString());
        return AppointmentResponse.build(saved);
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> getAppointmentsByDate(UUID clinicId, LocalDate date, UUID doctorId) {
        List<Appointment> appointments;
        if (doctorId != null) {
            appointments = appointmentRepository.findByClinicIdAndDoctorIdAndAppointmentDateOrderByStartTimeAsc(clinicId, doctorId, date);
        } else {
            appointments = appointmentRepository.findByClinicIdAndAppointmentDateOrderByStartTimeAsc(clinicId, date);
        }
        return appointments.stream()
                .map(AppointmentResponse::build)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> getAppointmentsForPatient(UUID clinicId, UUID patientId) {
        List<Appointment> appointments = appointmentRepository.findByClinicIdAndPatientIdOrderByAppointmentDateDescStartTimeDesc(clinicId, patientId);
        return appointments.stream()
                .map(AppointmentResponse::build)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> getAppointmentsForDoctor(UUID clinicId, UUID doctorId) {
        List<Appointment> appointments = appointmentRepository.findByClinicIdAndDoctorIdOrderByAppointmentDateDescStartTimeDesc(clinicId, doctorId);
        return appointments.stream()
                .map(AppointmentResponse::build)
                .collect(Collectors.toList());
    }

    @Transactional
    public AppointmentResponse saveConsultation(UUID clinicId, UUID id, ConsultationRequest request) {
        Appointment appointment = appointmentRepository.findByIdAndClinicId(id, clinicId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found in this clinic"));

        appointment.setSymptoms(request.getSymptoms());
        appointment.setDiagnosis(request.getDiagnosis());
        appointment.setPrescription(request.getPrescription());
        appointment.setBpSystolic(request.getBpSystolic());
        appointment.setBpDiastolic(request.getBpDiastolic());
        appointment.setPulse(request.getPulse());
        appointment.setTemperature(request.getTemperature());
        appointment.setSpo2(request.getSpo2());
        appointment.setWeight(request.getWeight());
        appointment.setHeight(request.getHeight());
        appointment.setFollowUpDate(request.getFollowUpDate());
        if (request.getNotes() != null) {
            appointment.setNotes(request.getNotes());
        }
        appointment.setStatus("COMPLETED");

        Appointment saved = appointmentRepository.save(appointment);
        queueStreamService.broadcastQueueUpdate(clinicId, "CONSULTATION_COMPLETED", saved.getId().toString());
        return AppointmentResponse.build(saved);
    }

    @Transactional
    public void resetTodayAppointments(UUID clinicId, UUID userId, String password) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new IllegalArgumentException("Incorrect password. Reset authorization denied.");
        }

        LocalDate today = LocalDate.now();
        List<Appointment> todayAppts = appointmentRepository.findByClinicIdAndAppointmentDateOrderByStartTimeAsc(clinicId, today);
        appointmentRepository.deleteAll(todayAppts);
        queueStreamService.broadcastQueueUpdate(clinicId, "QUEUE_RESET", "ALL");
    }

    private void validateClinicSchedule(Clinic clinic, LocalDate date, java.time.LocalTime startTime, java.time.LocalTime endTime, UUID doctorId, UUID appointmentIdToExclude) {
        if (clinic == null || date == null) return;

        // 1. Validate Weekly Closed Days (e.g. "Sunday", "Monday")
        if (clinic.getClosedDays() != null && !clinic.getClosedDays().trim().isEmpty()) {
            String dayOfWeekName = date.getDayOfWeek().name(); // MONDAY, SUNDAY...
            boolean isClosedDay = java.util.Arrays.stream(clinic.getClosedDays().split(","))
                    .map(String::trim)
                    .anyMatch(d -> d.equalsIgnoreCase(dayOfWeekName) || dayOfWeekName.equalsIgnoreCase(d));
            if (isClosedDay) {
                String properDay = date.getDayOfWeek().toString().substring(0, 1) + date.getDayOfWeek().toString().substring(1).toLowerCase();
                throw new IllegalArgumentException("The clinic is closed on " + properDay + "s according to the operating schedule. Please choose an open working day.");
            }
        }

        // 2. Validate Holiday Calendar (e.g. "2026-08-28, 2026-10-02")
        if (clinic.getHolidayDates() != null && !clinic.getHolidayDates().trim().isEmpty()) {
            String targetDateStr = date.toString();
            boolean isHoliday = java.util.Arrays.stream(clinic.getHolidayDates().split(","))
                    .map(String::trim)
                    .anyMatch(h -> h.equals(targetDateStr));
            if (isHoliday) {
                throw new IllegalArgumentException("The clinic is closed on " + date + " due to a scheduled holiday / clinic closure.");
            }
        }

        // 3. Validate Doctor Scheduled Leave / Out-of-Office Blocker
        if (doctorId != null && doctorLeaveRepository != null) {
            List<com.nisschay.cms.entity.DoctorLeaveEntity> activeLeaves = doctorLeaveRepository.findActiveLeaveOnDate(clinic.getId(), doctorId, date);
            if (!activeLeaves.isEmpty()) {
                com.nisschay.cms.entity.DoctorLeaveEntity leave = activeLeaves.get(0);
                String subInfo = leave.getSubstituteDoctorName() != null ? " (Substitute Dr. " + leave.getSubstituteDoctorName() + " is available)" : "";
                throw new IllegalArgumentException("Dr. " + (leave.getDoctorName() != null ? leave.getDoctorName() : "Doctor") +
                        " is on scheduled leave / out-of-office on " + date + subInfo + (leave.getReason() != null ? " (" + leave.getReason() + ")" : "."));
            }
        }

        // 3. Validate Operating Hours (Morning and Evening Shifts)
        if (startTime != null) {
            java.time.LocalTime mStart = parseTimeOrDefault(clinic.getMorningStartTime(), "09:00");
            java.time.LocalTime mEnd = parseTimeOrDefault(clinic.getMorningEndTime(), "13:00");
            java.time.LocalTime eStart = parseTimeOrDefault(clinic.getEveningStartTime(), "17:00");
            java.time.LocalTime eEnd = parseTimeOrDefault(clinic.getEveningEndTime(), "21:00");

            java.time.LocalTime slotEnd = endTime != null ? endTime : startTime.plusMinutes(15);

            boolean inMorningShift = !startTime.isBefore(mStart) && !slotEnd.isAfter(mEnd);
            boolean inEveningShift = !startTime.isBefore(eStart) && !slotEnd.isAfter(eEnd);

            if (!inMorningShift && !inEveningShift) {
                throw new IllegalArgumentException("The selected time (" + startTime + " - " + slotEnd + ") is outside clinic operating hours (Morning: " + mStart + " - " + mEnd + ", Evening: " + eStart + " - " + eEnd + ").");
            }
        }

        // 4. Validate Max Daily Patients Limit
        if (clinic.getMaxPatientsPerDay() != null && clinic.getMaxPatientsPerDay() > 0) {
            List<Appointment> allDayAppts = appointmentRepository.findByClinicIdAndAppointmentDateOrderByStartTimeAsc(clinic.getId(), date);
            long activeCount = allDayAppts.stream()
                    .filter(a -> appointmentIdToExclude == null || !a.getId().equals(appointmentIdToExclude))
                    .filter(a -> !"CANCELLED".equalsIgnoreCase(a.getStatus()))
                    .count();
            if (activeCount >= clinic.getMaxPatientsPerDay()) {
                throw new IllegalArgumentException("Daily patient capacity limit of " + clinic.getMaxPatientsPerDay() + " patients reached for " + date + ".");
            }
        }
    }

    private java.time.LocalTime parseTimeOrDefault(String timeStr, String defaultTime) {
        try {
            if (timeStr == null || timeStr.trim().isEmpty()) {
                return java.time.LocalTime.parse(defaultTime);
            }
            return java.time.LocalTime.parse(timeStr.trim().substring(0, 5));
        } catch (Exception e) {
            return java.time.LocalTime.parse(defaultTime);
        }
    }
}
