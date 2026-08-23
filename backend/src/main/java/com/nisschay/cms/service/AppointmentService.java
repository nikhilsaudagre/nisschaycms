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
    private final PasswordEncoder passwordEncoder;

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

        // Validate time slot clash / double-booking prevention
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

        if (hasConflict) {
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
        return AppointmentResponse.build(saved);
    }

    @Transactional
    public AppointmentResponse updateAppointment(UUID clinicId, UUID id, AppointmentRequest request) {
        Appointment appointment = appointmentRepository.findByIdAndClinicId(id, clinicId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found in this clinic"));

        Patient patient = patientRepository.findByIdAndClinicId(request.getPatientId(), clinicId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found in this clinic"));

        User doctor = userRepository.findById(request.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found"));

        if (doctor.getClinic() != null && !doctor.getClinic().getId().equals(clinicId)) {
            throw new IllegalArgumentException("Doctor does not belong to this clinic");
        }

        // Validate time slot clash on update (excluding current appointment id)
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

        if (hasConflict) {
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
    }
}
