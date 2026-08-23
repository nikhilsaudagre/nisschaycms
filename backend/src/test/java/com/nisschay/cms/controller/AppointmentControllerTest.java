package com.nisschay.cms.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nisschay.cms.dto.req.ClinicRegisterRequest;
import com.nisschay.cms.dto.req.PatientRequest;
import com.nisschay.cms.dto.req.AppointmentRequest;
import com.nisschay.cms.dto.req.ConsultationRequest;
import com.nisschay.cms.dto.res.AuthResponse;
import com.nisschay.cms.dto.res.PatientResponse;
import com.nisschay.cms.dto.res.AppointmentResponse;
import com.nisschay.cms.entity.User;
import com.nisschay.cms.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(locations = "classpath:application-test.properties")
public class AppointmentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    private String jwtToken;
    private UUID clinicId;
    private UUID doctorId;
    private UUID patientId;

    @BeforeEach
    public void setup() throws Exception {
        // 1. Register clinic and retrieve JWT (This user will act as DOCTOR/ADMIN in tests)
        String uniqueEmail = "dr.appt.test_" + UUID.randomUUID().toString().substring(0, 8) + "@nisschay.com";
        ClinicRegisterRequest registerReq = new ClinicRegisterRequest();
        registerReq.setClinicName("Appointment Test Clinic");
        registerReq.setClinicEmail(uniqueEmail);
        registerReq.setClinicPhone("9876500123");
        registerReq.setClinicAddress("789 Appt Street");
        registerReq.setAdminName("Dr. Appt Tester");
        registerReq.setAdminEmail(uniqueEmail);
        registerReq.setAdminPassword("password123");
        registerReq.setConfirmPassword("password123");

        MvcResult registerResult = mockMvc.perform(post("/api/v1/auth/register-clinic")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerReq)))
                .andExpect(status().isOk())
                .andReturn();

        String responseJson = registerResult.getResponse().getContentAsString();
        AuthResponse authResponse = objectMapper.readValue(responseJson, AuthResponse.class);
        
        this.jwtToken = authResponse.getAccessToken();
        this.clinicId = authResponse.getClinicId();
        this.doctorId = authResponse.getUserId();

        // Fix: Make sure the role of the creator is DOCTOR in database seeds to pass the validation check
        User doctorUser = userRepository.findById(this.doctorId).orElseThrow();
        // Since seed creates it as ADMIN, we can check or temporarily assign role or just use this doctorId since doctor.getClinic().getId() matches.
        // Yes, the service check only requires: doctor.getClinic().getId().equals(clinicId)

        // 2. Create Patient
        PatientRequest patientReq = new PatientRequest();
        patientReq.setName("Vijay Kumar");
        patientReq.setGender("MALE");
        patientReq.setDateOfBirth(LocalDate.of(1992, 8, 15));
        patientReq.setPhone("9876500456");

        MvcResult patientResult = mockMvc.perform(post("/api/v1/patients")
                .header("Authorization", "Bearer " + jwtToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(patientReq)))
                .andExpect(status().isOk())
                .andReturn();

        PatientResponse patientRes = objectMapper.readValue(patientResult.getResponse().getContentAsString(), PatientResponse.class);
        this.patientId = patientRes.getId();
    }

    @Test
    public void testFullAppointmentLifecycle() throws Exception {
        // 1. Create Appointment (Book slot)
        AppointmentRequest apptReq = new AppointmentRequest();
        apptReq.setPatientId(patientId);
        apptReq.setDoctorId(doctorId);
        apptReq.setAppointmentDate(LocalDate.now().plusDays(1));
        apptReq.setStartTime(LocalTime.of(10, 0));
        apptReq.setEndTime(LocalTime.of(10, 30));
        apptReq.setType("CONSULTATION");
        apptReq.setReason("Routine headache evaluation");
        apptReq.setNotes("First time visit");

        MvcResult createResult = mockMvc.perform(post("/api/v1/appointments")
                .header("Authorization", "Bearer " + jwtToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(apptReq)))
                .andExpect(status().isOk())
                .andReturn();

        AppointmentResponse apptRes = objectMapper.readValue(createResult.getResponse().getContentAsString(), AppointmentResponse.class);
        assertNotNull(apptRes.getId());
        assertEquals("SCHEDULED", apptRes.getStatus());
        assertEquals("Routine headache evaluation", apptRes.getReason());

        // 2. Retrieve Appointments List by Date
        mockMvc.perform(get("/api/v1/appointments")
                .header("Authorization", "Bearer " + jwtToken)
                .param("date", LocalDate.now().plusDays(1).toString()))
                .andExpect(status().isOk());

        // 3. Update Status to Checked In
        MvcResult checkinResult = mockMvc.perform(patch("/api/v1/appointments/" + apptRes.getId() + "/status")
                .header("Authorization", "Bearer " + jwtToken)
                .param("status", "CHECKED_IN"))
                .andExpect(status().isOk())
                .andReturn();

        AppointmentResponse checkinRes = objectMapper.readValue(checkinResult.getResponse().getContentAsString(), AppointmentResponse.class);
        assertEquals("CHECKED_IN", checkinRes.getStatus());

        // 4. Update Status to Completed
        MvcResult completeResult = mockMvc.perform(patch("/api/v1/appointments/" + apptRes.getId() + "/status")
                .header("Authorization", "Bearer " + jwtToken)
                .param("status", "COMPLETED"))
                .andExpect(status().isOk())
                .andReturn();

        AppointmentResponse completeRes = objectMapper.readValue(completeResult.getResponse().getContentAsString(), AppointmentResponse.class);
        assertEquals("COMPLETED", completeRes.getStatus());

        // 5. Test Multi-tenant Isolation: Request from Clinic B (should return 404 Not Found)
        String otherEmail = "dr.other.appt_" + UUID.randomUUID().toString().substring(0, 8) + "@nisschay.com";
        ClinicRegisterRequest otherClinic = new ClinicRegisterRequest();
        otherClinic.setClinicName("Other Appt Clinic");
        otherClinic.setClinicEmail(otherEmail);
        otherClinic.setClinicPhone("9900998811");
        otherClinic.setAdminName("Dr. Other Appt");
        otherClinic.setAdminEmail(otherEmail);
        otherClinic.setAdminPassword("password123");
        otherClinic.setConfirmPassword("password123");

        MvcResult otherResult = mockMvc.perform(post("/api/v1/auth/register-clinic")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(otherClinic)))
                .andExpect(status().isOk())
                .andReturn();

        AuthResponse otherAuth = objectMapper.readValue(otherResult.getResponse().getContentAsString(), AuthResponse.class);

        // Access Clinic A's appointment with Clinic B's JWT token
        mockMvc.perform(patch("/api/v1/appointments/" + apptRes.getId() + "/status")
                .header("Authorization", "Bearer " + otherAuth.getAccessToken())
                .param("status", "COMPLETED"))
                .andExpect(status().isNotFound());
    }

    @Test
    public void testGetDoctors() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/users/doctors")
                .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andReturn();

        String responseJson = result.getResponse().getContentAsString();
        assertNotNull(responseJson);
        
        // Assert that the response contains the registered administrator
        org.junit.jupiter.api.Assertions.assertTrue(responseJson.contains("Dr. Appt Tester"));
        org.junit.jupiter.api.Assertions.assertTrue(responseJson.contains("ADMIN"));
    }

    @Test
    public void testSaveConsultation() throws Exception {
        // 1. Create Appointment (Book slot)
        AppointmentRequest apptReq = new AppointmentRequest();
        apptReq.setPatientId(patientId);
        apptReq.setDoctorId(doctorId);
        apptReq.setAppointmentDate(LocalDate.now().plusDays(2));
        apptReq.setStartTime(LocalTime.of(11, 0));
        apptReq.setEndTime(LocalTime.of(11, 30));
        apptReq.setType("FOLLOW_UP");
        apptReq.setReason("Follow-up checkup");

        MvcResult createResult = mockMvc.perform(post("/api/v1/appointments")
                .header("Authorization", "Bearer " + jwtToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(apptReq)))
                .andExpect(status().isOk())
                .andReturn();

        AppointmentResponse apptRes = objectMapper.readValue(createResult.getResponse().getContentAsString(), AppointmentResponse.class);

        // 2. Perform Consultation
        ConsultationRequest consultReq = new ConsultationRequest();
        consultReq.setSymptoms("Mild cough and throat itching");
        consultReq.setDiagnosis("Common cold and viral pharyngitis");
        consultReq.setPrescription("Paracetamol 650mg TDS, Cough Syrup 10ml TDS");
        consultReq.setNotes("Advised warm water gargles");

        MvcResult consultResult = mockMvc.perform(post("/api/v1/appointments/" + apptRes.getId() + "/consultation")
                .header("Authorization", "Bearer " + jwtToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(consultReq)))
                .andExpect(status().isOk())
                .andReturn();

        AppointmentResponse consultRes = objectMapper.readValue(consultResult.getResponse().getContentAsString(), AppointmentResponse.class);
        assertEquals("COMPLETED", consultRes.getStatus());
        assertEquals("Mild cough and throat itching", consultRes.getSymptoms());
        assertEquals("Common cold and viral pharyngitis", consultRes.getDiagnosis());
        assertEquals("Paracetamol 650mg TDS, Cough Syrup 10ml TDS", consultRes.getPrescription());
        assertEquals("Advised warm water gargles", consultRes.getNotes());
    }
}
