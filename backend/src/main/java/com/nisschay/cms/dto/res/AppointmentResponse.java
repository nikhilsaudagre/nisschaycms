package com.nisschay.cms.dto.res;

import com.nisschay.cms.entity.Appointment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppointmentResponse {
    private UUID id;
    private UUID clinicId;
    private UUID patientId;
    private String patientName;
    private String patientPhone;
    private UUID doctorId;
    private String doctorName;
    private LocalDate appointmentDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private String status;
    private String type;
    private String reason;
    private String notes;
    private String symptoms;
    private String diagnosis;
    private String prescription;
    private Integer bpSystolic;
    private Integer bpDiastolic;
    private Integer pulse;
    private Double temperature;
    private Integer spo2;
    private Double weight;
    private Double height;
    private java.time.LocalDate followUpDate;
    private OffsetDateTime createdAt;

    public static AppointmentResponse build(Appointment appointment) {
        return AppointmentResponse.builder()
                .id(appointment.getId())
                .clinicId(appointment.getClinic() != null ? appointment.getClinic().getId() : null)
                .patientId(appointment.getPatient() != null ? appointment.getPatient().getId() : null)
                .patientName(appointment.getPatient() != null ? appointment.getPatient().getName() : "Patient")
                .patientPhone(appointment.getPatient() != null ? appointment.getPatient().getPhone() : "")
                .doctorId(appointment.getDoctor() != null ? appointment.getDoctor().getId() : null)
                .doctorName(appointment.getDoctor() != null ? appointment.getDoctor().getName() : "Doctor")
                .appointmentDate(appointment.getAppointmentDate())
                .startTime(appointment.getStartTime())
                .endTime(appointment.getEndTime())
                .status(appointment.getStatus())
                .type(appointment.getType())
                .reason(appointment.getReason())
                .notes(appointment.getNotes())
                .symptoms(appointment.getSymptoms())
                .diagnosis(appointment.getDiagnosis())
                .prescription(appointment.getPrescription())
                .bpSystolic(appointment.getBpSystolic())
                .bpDiastolic(appointment.getBpDiastolic())
                .pulse(appointment.getPulse())
                .temperature(appointment.getTemperature())
                .spo2(appointment.getSpo2())
                .weight(appointment.getWeight())
                .height(appointment.getHeight())
                .followUpDate(appointment.getFollowUpDate())
                .createdAt(appointment.getCreatedAt())
                .build();
    }
}
