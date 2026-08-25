package com.nisschay.cms.service;

import com.nisschay.cms.dto.req.ClinicRegisterRequest;
import com.nisschay.cms.dto.req.LoginRequest;
import com.nisschay.cms.dto.req.ResetPasswordRequest;
import com.nisschay.cms.dto.res.AuthResponse;
import com.nisschay.cms.entity.*;
import com.nisschay.cms.exception.TokenException;
import com.nisschay.cms.repository.PasswordResetTokenRepository;
import com.nisschay.cms.repository.RefreshTokenRepository;
import com.nisschay.cms.repository.UserRepository;
import com.nisschay.cms.security.JwtUtils;
import com.nisschay.cms.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final ClinicService clinicService;
    private final UserService userService;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final JwtUtils jwtUtils;
    private final AuthenticationManager authenticationManager;
    private final PasswordEncoder passwordEncoder;

    @Value("${nisschay.app.jwtRefreshExpirationMs}")
    private Long refreshTokenDurationMs;

    @Transactional
    public AuthResponse registerClinic(ClinicRegisterRequest request) {
        if (request.getConfirmPassword() != null && !request.getAdminPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("Passwords do not match");
        }

        String adminEmail = request.getAdminEmail() != null ? request.getAdminEmail().trim().toLowerCase() : "";
        String clinicEmail = request.getClinicEmail() != null ? request.getClinicEmail().trim().toLowerCase() : "";

        // 1. Create Clinic
        Clinic clinic = clinicService.createClinic(
                request.getClinicName() != null ? request.getClinicName().trim() : "",
                clinicEmail,
                request.getClinicPhone() != null ? request.getClinicPhone().trim() : "",
                request.getClinicAddress()
        );

        // 2. Create Owner User as ADMIN
        User admin = userService.createUser(
                clinic,
                "ADMIN",
                request.getAdminName() != null ? request.getAdminName().trim() : "",
                adminEmail,
                request.getAdminPassword(),
                request.getAdminPhone()
        );

        log.info("Successfully registered clinic '{}' and admin user '{}'", clinic.getName(), admin.getEmail());

        // 3. Perform Auto Login
        LoginRequest loginReq = new LoginRequest();
        loginReq.setEmail(adminEmail);
        loginReq.setPassword(request.getAdminPassword());
        return login(loginReq);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String normalizedEmail = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(normalizedEmail, request.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        String jwt = jwtUtils.generateJwtToken(userDetails);

        // Manage refresh token rotation
        User user = userService.getUserByEmail(userDetails.getEmail());
        refreshTokenRepository.deleteByUser(user);
        
        RefreshToken refreshToken = createRefreshToken(user);

        return AuthResponse.builder()
                .accessToken(jwt)
                .refreshToken(refreshToken.getToken())
                .userId(userDetails.getId())
                .name(userDetails.getName())
                .email(userDetails.getEmail())
                .role(userDetails.getRole())
                .clinicId(userDetails.getClinicId())
                .clinicName(userDetails.getClinicName())
                .build();
    }

    @Transactional
    public RefreshToken createRefreshToken(User user) {
        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .token(UUID.randomUUID().toString())
                .expiryDate(OffsetDateTime.now().plusSeconds(refreshTokenDurationMs / 1000))
                .build();

        return refreshTokenRepository.save(refreshToken);
    }

    @Transactional
    public AuthResponse refreshAccessToken(String requestRefreshToken) {
        RefreshToken token = refreshTokenRepository.findByToken(requestRefreshToken)
                .orElseThrow(() -> new TokenException(requestRefreshToken, "Refresh token not found"));

        if (token.getRevoked()) {
            throw new TokenException(requestRefreshToken, "Refresh token has been revoked");
        }

        if (token.getExpiryDate().isBefore(OffsetDateTime.now())) {
            refreshTokenRepository.delete(token);
            throw new TokenException(requestRefreshToken, "Refresh token expired. Please login again.");
        }

        User user = token.getUser();
        
        // Rotate refresh token
        refreshTokenRepository.deleteByUser(user);
        RefreshToken newRefreshToken = createRefreshToken(user);

        UserDetailsImpl userDetails = UserDetailsImpl.build(user);
        String newAccessToken = jwtUtils.generateJwtToken(userDetails);

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken.getToken())
                .userId(userDetails.getId())
                .name(userDetails.getName())
                .email(userDetails.getEmail())
                .role(userDetails.getRole())
                .clinicId(userDetails.getClinicId())
                .clinicName(userDetails.getClinicName())
                .build();
    }

    @Transactional
    public void logout(String requestRefreshToken) {
        refreshTokenRepository.findByToken(requestRefreshToken)
                .ifPresent(token -> {
                    token.setRevoked(true);
                    refreshTokenRepository.save(token);
                });
    }

    @Transactional
    public String initiatePasswordReset(String email) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            // Silently return success to avoid user enumeration
            return "SUCCESS";
        }

        User user = userOpt.get();

        // Invalidate old pending tokens
        passwordResetTokenRepository.findByUserAndUsedFalse(user)
                .ifPresent(t -> {
                    t.setUsed(true);
                    passwordResetTokenRepository.save(t);
                });

        // Generate 6-digit OTP/code
        String resetCode = String.format("%06d", new Random().nextInt(999999));

        PasswordResetToken resetToken = PasswordResetToken.builder()
                .user(user)
                .token(resetCode)
                // Expires in 15 minutes
                .expiryDate(OffsetDateTime.now().plusMinutes(15))
                .build();

        passwordResetTokenRepository.save(resetToken);

        // In a real application, you would send this via email/SMS.
        // We log it here for demo/development purposes.
        log.info("PASSWORD RESET OTP for user '{}': {}", email, resetCode);
        return resetCode;
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(request.getToken())
                .orElseThrow(() -> new IllegalArgumentException("Invalid password reset token/code"));

        if (resetToken.getUsed()) {
            throw new IllegalArgumentException("Password reset token/code already used");
        }

        if (resetToken.getExpiryDate().isBefore(OffsetDateTime.now())) {
            throw new IllegalArgumentException("Password reset token/code expired");
        }

        User user = resetToken.getUser();
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);
        
        // Also revoke all active user sessions upon password change for security
        refreshTokenRepository.deleteByUser(user);
        log.info("Successfully reset password for user '{}'", user.getEmail());
    }
}
