package com.nisschay.cms.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nisschay.cms.dto.req.ClinicRegisterRequest;
import com.nisschay.cms.dto.req.PatientRequest;
import com.nisschay.cms.dto.res.AuthResponse;
import com.nisschay.cms.dto.res.PatientResponse;
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
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(locations = "classpath:application-test.properties")
public class PatientControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String jwtToken;
    private UUID clinicId;

    @BeforeEach
    public void setup() throws Exception {
        // Register clinic and retrieve JWT
        String uniqueEmail = "dr.pat.test_" + UUID.randomUUID().toString().substring(0, 8) + "@nisschay.com";
        ClinicRegisterRequest registerReq = new ClinicRegisterRequest();
        registerReq.setClinicName("Patient Test Clinic");
        registerReq.setClinicEmail(uniqueEmail);
        registerReq.setClinicPhone("9988776655");
        registerReq.setClinicAddress("456 Test Lane");
        registerReq.setAdminName("Dr. Patient Tester");
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
    public void testFullPatientLifecycle() throws Exception {
        // 1. Create Patient
        PatientRequest patientReq = new PatientRequest();
        patientReq.setName("Suresh Kumar");
        patientReq.setGender("MALE");
        patientReq.setDateOfBirth(LocalDate.of(1980, 5, 10));
        patientReq.setPhone("9876543210");
        patientReq.setEmail("suresh@gmail.com");
        patientReq.setBloodGroup("O+");
        patientReq.setAllergies("Dust, Penicillin");
        patientReq.setMedicalHistory("Mild Hypertension");
        patientReq.setEmergencyContactName("Sarita Kumar");
        patientReq.setEmergencyContactPhone("9876543211");

        MvcResult createResult = mockMvc.perform(post("/api/v1/patients")
                .header("Authorization", "Bearer " + jwtToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(patientReq)))
                .andExpect(status().isOk())
                .andReturn();

        PatientResponse patientRes = objectMapper.readValue(createResult.getResponse().getContentAsString(), PatientResponse.class);
        assertNotNull(patientRes.getId());
        assertEquals("Suresh Kumar", patientRes.getName());
        assertEquals(clinicId, patientRes.getClinicId());
        assertEquals(true, patientRes.getActive());

        // 2. Fetch Patient by ID
        MvcResult getResult = mockMvc.perform(get("/api/v1/patients/" + patientRes.getId())
                .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andReturn();

        PatientResponse fetchedRes = objectMapper.readValue(getResult.getResponse().getContentAsString(), PatientResponse.class);
        assertEquals(patientRes.getId(), fetchedRes.getId());
        assertEquals("Suresh Kumar", fetchedRes.getName());

        // 3. Update Patient Details
        patientReq.setName("Suresh Kumar Sharma");
        patientReq.setAllergies("Dust, Penicillin, Peanuts"); // added peanuts

        MvcResult updateResult = mockMvc.perform(put("/api/v1/patients/" + patientRes.getId())
                .header("Authorization", "Bearer " + jwtToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(patientReq)))
                .andExpect(status().isOk())
                .andReturn();

        PatientResponse updatedRes = objectMapper.readValue(updateResult.getResponse().getContentAsString(), PatientResponse.class);
        assertEquals("Suresh Kumar Sharma", updatedRes.getName());
        assertEquals("Dust, Penicillin, Peanuts", updatedRes.getAllergies());

        // 4. Search/List Patients
        mockMvc.perform(get("/api/v1/patients")
                .header("Authorization", "Bearer " + jwtToken)
                .param("search", "Suresh")
                .param("page", "0")
                .param("size", "10"))
                .andExpect(status().isOk());

        // 5. Toggle Patient Status (Archive)
        MvcResult toggleResult = mockMvc.perform(patch("/api/v1/patients/" + patientRes.getId() + "/toggle-status")
                .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andReturn();

        PatientResponse toggledRes = objectMapper.readValue(toggleResult.getResponse().getContentAsString(), PatientResponse.class);
        assertEquals(false, toggledRes.getActive());

        // 6. Test Multi-tenant Isolation: Request using wrong JWT (Should be 404/400 or unauthorized)
        // Creating another clinic/user session
        String otherEmail = "dr.other_" + UUID.randomUUID().toString().substring(0, 8) + "@nisschay.com";
        ClinicRegisterRequest otherClinic = new ClinicRegisterRequest();
        otherClinic.setClinicName("Other Clinic");
        otherClinic.setClinicEmail(otherEmail);
        otherClinic.setClinicPhone("9900990099");
        otherClinic.setAdminName("Dr. Other");
        otherClinic.setAdminEmail(otherEmail);
        otherClinic.setAdminPassword("password123");
        otherClinic.setConfirmPassword("password123");

        MvcResult otherResult = mockMvc.perform(post("/api/v1/auth/register-clinic")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(otherClinic)))
                .andExpect(status().isOk())
                .andReturn();

        AuthResponse otherAuth = objectMapper.readValue(otherResult.getResponse().getContentAsString(), AuthResponse.class);

        // Try fetching first clinic's patient with second clinic's JWT (Should return 404 Not Found)
        mockMvc.perform(get("/api/v1/patients/" + patientRes.getId())
                .header("Authorization", "Bearer " + otherAuth.getAccessToken()))
                .andExpect(status().isNotFound());
    }
}
