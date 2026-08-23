package com.nisschay.cms.repository;

import com.nisschay.cms.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, UUID> {

    Optional<Appointment> findByIdAndClinicId(UUID id, UUID clinicId);

    List<Appointment> findByClinicIdAndAppointmentDateOrderByStartTimeAsc(UUID clinicId, LocalDate date);

    List<Appointment> findByClinicIdAndDoctorIdAndAppointmentDateOrderByStartTimeAsc(UUID clinicId, UUID doctorId, LocalDate date);

    List<Appointment> findByClinicIdAndPatientIdOrderByAppointmentDateDescStartTimeDesc(UUID clinicId, UUID patientId);

    List<Appointment> findByClinicIdAndAppointmentDateBetween(UUID clinicId, LocalDate startDate, LocalDate endDate);

    List<Appointment> findByClinicIdAndDoctorIdAndAppointmentDateBetween(UUID clinicId, UUID doctorId, LocalDate startDate, LocalDate endDate);
}
