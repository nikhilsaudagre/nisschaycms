package com.nisschay.cms.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nisschay.cms.dto.req.ClinicRegisterRequest;
import com.nisschay.cms.dto.req.LoginRequest;
import com.nisschay.cms.dto.res.AuthResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(locations = "classpath:application-test.properties")
public class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    public void testFullAuthenticationFlow() throws Exception {
        // 1. Register Clinic & Owner Admin
        ClinicRegisterRequest registerReq = new ClinicRegisterRequest();
        registerReq.setClinicName("Nisschay Test Clinic");
        registerReq.setClinicEmail("test@nisschay.com");
        registerReq.setClinicPhone("9876543210");
        registerReq.setClinicAddress("123 Test Street, Bangalore");
        registerReq.setAdminName("Dr. Test User");
        registerReq.setAdminEmail("dr.test@nisschay.com");
        registerReq.setAdminPassword("password123");
        registerReq.setConfirmPassword("password123");
        registerReq.setAdminPhone("9876543210");

        MvcResult registerResult = mockMvc.perform(post("/api/v1/auth/register-clinic")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerReq)))
                .andExpect(status().isOk())
                .andReturn();

        String registerResponseJson = registerResult.getResponse().getContentAsString();
        AuthResponse registerResponse = objectMapper.readValue(registerResponseJson, AuthResponse.class);
        
        assertNotNull(registerResponse.getAccessToken());
        assertNotNull(registerResponse.getRefreshToken());
        assertNotNull(registerResponse.getClinicId());

        // 2. Perform Login with Same Credentials
        LoginRequest loginReq = new LoginRequest();
        loginReq.setEmail("dr.test@nisschay.com");
        loginReq.setPassword("password123");

        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andReturn();

        String loginResponseJson = loginResult.getResponse().getContentAsString();
        AuthResponse loginResponse = objectMapper.readValue(loginResponseJson, AuthResponse.class);

        assertNotNull(loginResponse.getAccessToken());
        assertNotNull(loginResponse.getRefreshToken());

        // 3. Test Accessing Protected User Profile Endpoint
        mockMvc.perform(get("/api/v1/users/me")
                .header("Authorization", "Bearer " + loginResponse.getAccessToken()))
                .andExpect(status().isOk());

        // 4. Test Accessing Profile Endpoint WITHOUT JWT (Should be 401)
        mockMvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isUnauthorized());
    }
}
