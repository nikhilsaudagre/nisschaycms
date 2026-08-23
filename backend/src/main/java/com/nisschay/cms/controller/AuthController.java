package com.nisschay.cms.controller;

import com.nisschay.cms.dto.req.*;
import com.nisschay.cms.dto.res.AuthResponse;
import com.nisschay.cms.dto.res.MessageResponse;
import com.nisschay.cms.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register-clinic")
    public ResponseEntity<AuthResponse> registerClinic(@Valid @RequestBody ClinicRegisterRequest request) {
        AuthResponse response = authService.registerClinic(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        AuthResponse response = authService.refreshAccessToken(request.getRefreshToken());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<MessageResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        String resetCode = authService.initiatePasswordReset(request.getEmail());
        // In a real application, you would send this via email/SMS.
        // We return a generic success message.
        return ResponseEntity.ok(new MessageResponse("If the email is registered, a password reset OTP has been sent. Code: " + resetCode));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<MessageResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(new MessageResponse("Password has been reset successfully."));
    }

    @PostMapping("/logout")
    public ResponseEntity<MessageResponse> logout(@Valid @RequestBody RefreshRequest request) {
        authService.logout(request.getRefreshToken());
        return ResponseEntity.ok(new MessageResponse("Logout successful."));
    }
}
