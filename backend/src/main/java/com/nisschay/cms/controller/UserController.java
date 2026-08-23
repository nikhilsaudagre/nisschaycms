package com.nisschay.cms.controller;

import com.nisschay.cms.dto.res.UserProfileResponse;
import com.nisschay.cms.entity.User;
import com.nisschay.cms.security.UserDetailsImpl;
import com.nisschay.cms.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.nisschay.cms.dto.req.StaffCreateRequest;
import com.nisschay.cms.dto.req.UserProfileUpdateRequest;
import com.nisschay.cms.dto.res.UserProfileResponse;
import com.nisschay.cms.entity.User;
import com.nisschay.cms.security.UserDetailsImpl;
import com.nisschay.cms.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getCurrentUser(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        
        User user = userService.getUserById(userDetails.getId());
        
        UserProfileResponse response = UserProfileResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(user.getRole().getId())
                .clinicId(user.getClinic().getId())
                .clinicName(user.getClinic().getName())
                .profilePictureUrl(user.getProfilePictureUrl())
                .build();
                
        return ResponseEntity.ok(response);
    }

    @GetMapping("/doctors")
    public ResponseEntity<List<UserProfileResponse>> getDoctors(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }

        List<UserProfileResponse> response = userService.getDoctorsByClinicId(userDetails.getClinicId())
                .stream()
                .map(user -> UserProfileResponse.builder()
                        .id(user.getId())
                        .name(user.getName())
                        .email(user.getEmail())
                        .phone(user.getPhone())
                        .role(user.getRole().getId())
                        .clinicId(user.getClinic().getId())
                        .clinicName(user.getClinic().getName())
                        .profilePictureUrl(user.getProfilePictureUrl())
                        .build())
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN')")
    @GetMapping("/staff")
    public ResponseEntity<List<UserProfileResponse>> getAllStaff(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }

        List<UserProfileResponse> response = userService.getAllStaffByClinicId(userDetails.getClinicId())
                .stream()
                .map(user -> UserProfileResponse.builder()
                        .id(user.getId())
                        .name(user.getName())
                        .email(user.getEmail())
                        .phone(user.getPhone())
                        .role(user.getRole().getId())
                        .clinicId(user.getClinic().getId())
                        .clinicName(user.getClinic().getName())
                        .profilePictureUrl(user.getProfilePictureUrl())
                        .build())
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN')")
    @PostMapping("/staff")
    public ResponseEntity<UserProfileResponse> createStaff(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody StaffCreateRequest request
    ) {
        User created = userService.createStaffMember(userDetails.getClinicId(), request);

        UserProfileResponse response = UserProfileResponse.builder()
                .id(created.getId())
                .name(created.getName())
                .email(created.getEmail())
                .phone(created.getPhone())
                .role(created.getRole().getId())
                .clinicId(created.getClinic().getId())
                .clinicName(created.getClinic().getName())
                .build();

        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN')")
    @PatchMapping("/staff/{userId}/role")
    public ResponseEntity<UserProfileResponse> updateStaffRole(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID userId,
            @RequestParam String roleId
    ) {
        UserProfileResponse response = userService.updateStaffRole(userDetails.getClinicId(), userId, roleId);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/me")
    public ResponseEntity<UserProfileResponse> updateMe(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody UserProfileUpdateRequest request
    ) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        UserProfileResponse response = userService.updateUserProfile(userDetails.getId(), request);
        return ResponseEntity.ok(response);
    }
}
