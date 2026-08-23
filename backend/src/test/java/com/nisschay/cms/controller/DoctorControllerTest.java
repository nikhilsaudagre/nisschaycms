package com.nisschay.cms.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nisschay.cms.dto.req.ClinicRegisterRequest;
import com.nisschay.cms.dto.req.DoctorProfileRequest;
import com.nisschay.cms.dto.req.DoctorRegisterRequest;
import com.nisschay.cms.dto.res.AuthResponse;
import com.nisschay.cms.dto.res.DoctorResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(locations = "classpath:application-test.properties")
public class DoctorControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String jwtToken;
    private UUID clinicId;

    @BeforeEach
    public void setup() throws Exception {
        // Register clinic and retrieve JWT
        String uniqueEmail = "dr.test_" + UUID.randomUUID().toString().substring(0, 8) + "@nisschay.com";
        ClinicRegisterRequest registerReq = new ClinicRegisterRequest();
        registerReq.setClinicName("Doctor Test Clinic");
        registerReq.setClinicEmail(uniqueEmail);
        registerReq.setClinicPhone("9876500999");
        registerReq.setClinicAddress("456 Doctor Street");
        registerReq.setAdminName("Dr. Test Admin");
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
    }

    @Test
    public void testDoctorLifecycle() throws Exception {
        // 1. Register a new Doctor
        String doctorEmail = "doctor_" + UUID.randomUUID().toString().substring(0, 8) + "@nisschay.com";
        DoctorRegisterRequest registerReq = new DoctorRegisterRequest();
        registerReq.setName("Suresh Raina");
        registerReq.setEmail(doctorEmail);
        registerReq.setPassword("doctorPass123");
        registerReq.setPhone("9988776655");
        registerReq.setSpecialization("Pediatrics");
        registerReq.setConsultationFee(BigDecimal.valueOf(350.00));
        registerReq.setQualification("MBBS, MD Pediatrics");
        registerReq.setExperienceYears(8);
        registerReq.setBiography("Specialist in childhood infectious diseases");
        registerReq.setAvailabilitySchedule("Mon-Fri: 9:00 AM - 1:00 PM");

        MvcResult createResult = mockMvc.perform(post("/api/v1/doctors")
                .header("Authorization", "Bearer " + jwtToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerReq)))
                .andExpect(status().isOk())
                .andReturn();

        DoctorResponse docRes = objectMapper.readValue(createResult.getResponse().getContentAsString(), DoctorResponse.class);
        assertNotNull(docRes.getId());
        assertEquals("Suresh Raina", docRes.getName());
        assertEquals("Pediatrics", docRes.getSpecialization());
        assertEquals(0, docRes.getConsultationFee().compareTo(BigDecimal.valueOf(350.00)));

        // 2. Retrieve Doctors List
        mockMvc.perform(get("/api/v1/doctors")
                .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk());

        // 3. Edit Doctor Profile
        DoctorProfileRequest editReq = new DoctorProfileRequest();
        editReq.setName("Dr. Suresh Raina");
        editReq.setPhone("9988776600");
        editReq.setSpecialization("Pediatric Cardiology");
        editReq.setConsultationFee(BigDecimal.valueOf(500.00));
        editReq.setQualification("MBBS, MD, DM Cardiology");
        editReq.setExperienceYears(10);
        editReq.setBiography("Pediatric cardiologist with 10 years experience");
        editReq.setAvailabilitySchedule("Mon-Sat: 10:00 AM - 2:00 PM");

        MvcResult editResult = mockMvc.perform(put("/api/v1/doctors/" + docRes.getId())
                .header("Authorization", "Bearer " + jwtToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(editReq)))
                .andExpect(status().isOk())
                .andReturn();

        DoctorResponse updatedRes = objectMapper.readValue(editResult.getResponse().getContentAsString(), DoctorResponse.class);
        assertEquals("Dr. Suresh Raina", updatedRes.getName());
        assertEquals("Pediatric Cardiology", updatedRes.getSpecialization());
        assertEquals(0, updatedRes.getConsultationFee().compareTo(BigDecimal.valueOf(500.00)));

        // 4. Toggle Status (Active / Inactive)
        MvcResult statusResult = mockMvc.perform(patch("/api/v1/doctors/" + docRes.getId() + "/status")
                .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andReturn();

        DoctorResponse statusRes = objectMapper.readValue(statusResult.getResponse().getContentAsString(), DoctorResponse.class);
        assertFalse(statusRes.isActive());

        // 5. Test Multi-tenant Isolation: Edit Doctor from Clinic B (should return 400 or 404/Access Denied)
        String otherEmail = "dr.other.doc_" + UUID.randomUUID().toString().substring(0, 8) + "@nisschay.com";
        ClinicRegisterRequest otherClinic = new ClinicRegisterRequest();
        otherClinic.setClinicName("Other Doctor Clinic");
        otherClinic.setClinicEmail(otherEmail);
        otherClinic.setClinicPhone("9900998822");
        otherClinic.setAdminName("Dr. Other Admin");
        otherClinic.setAdminEmail(otherEmail);
        otherClinic.setAdminPassword("password123");
        otherClinic.setConfirmPassword("password123");

        MvcResult otherResult = mockMvc.perform(post("/api/v1/auth/register-clinic")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(otherClinic)))
                .andExpect(status().isOk())
                .andReturn();

        AuthResponse otherAuth = objectMapper.readValue(otherResult.getResponse().getContentAsString(), AuthResponse.class);

        // Edit Clinic A's doctor with Clinic B's JWT token
        mockMvc.perform(put("/api/v1/doctors/" + docRes.getId())
                .header("Authorization", "Bearer " + otherAuth.getAccessToken())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(editReq)))
                .andExpect(status().isBadRequest()); // Service throws IllegalArgumentException
    }
}
