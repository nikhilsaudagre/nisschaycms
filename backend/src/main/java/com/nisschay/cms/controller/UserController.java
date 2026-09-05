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
import com.nisschay.cms.dto.res.UserSessionResponse;
import com.nisschay.cms.service.SessionService;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final SessionService sessionService;

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
                .role(user.getRole() != null ? user.getRole().getId() : "DOCTOR")
                .clinicId(user.getClinic() != null ? user.getClinic().getId() : null)
                .clinicName(user.getClinic() != null ? user.getClinic().getName() : "Nisschay Clinic")
                .profilePictureUrl(user.getProfilePictureUrl())
                .notifyDailyReport(user.getNotifyDailyReport() != null ? user.getNotifyDailyReport() : true)
                .notifyEmergencyVisit(user.getNotifyEmergencyVisit() != null ? user.getNotifyEmergencyVisit() : true)
                .notifyRxAudit(user.getNotifyRxAudit() != null ? user.getNotifyRxAudit() : false)
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
                        .role(user.getRole() != null ? user.getRole().getId() : "DOCTOR")
                        .clinicId(user.getClinic() != null ? user.getClinic().getId() : null)
                        .clinicName(user.getClinic() != null ? user.getClinic().getName() : "Nisschay Clinic")
                        .profilePictureUrl(user.getProfilePictureUrl())
                        .build())
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR', 'RECEPTIONIST')")
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
                        .employeeId(user.getEmployeeId() != null ? user.getEmployeeId() : ("EMP-" + user.getId().toString().substring(0, 8).toUpperCase()))
                        .department(user.getDepartment())
                        .shiftTiming(user.getShiftTiming())
                        .deskNumber(user.getDeskNumber())
                        .bloodGroup(user.getBloodGroup())
                        .aadhaarNumber(user.getAadhaarNumber())
                        .panNumber(user.getPanNumber())
                        .residentialAddress(user.getResidentialAddress())
                        .city(user.getCity())
                        .state(user.getState())
                        .pincode(user.getPincode())
                        .policeVerificationStatus(user.getPoliceVerificationStatus())
                        .councilRegistrationNumber(user.getCouncilRegistrationNumber())
                        .councilName(user.getCouncilName())
                        .hepatitisBStatus(user.getHepatitisBStatus())
                        .bankAccountNumber(user.getBankAccountNumber())
                        .bankIfscCode(user.getBankIfscCode())
                        .bankName(user.getBankName())
                        .emergencyContactName(user.getEmergencyContactName())
                        .emergencyContactPhone(user.getEmergencyContactPhone())
                        .emergencyContactRelationship(user.getEmergencyContactRelationship())
                        .role(user.getRole() != null ? user.getRole().getId() : "STAFF")
                        .clinicId(user.getClinic() != null ? user.getClinic().getId() : null)
                        .clinicName(user.getClinic() != null ? user.getClinic().getName() : "Nisschay Clinic")
                        .profilePictureUrl(user.getProfilePictureUrl())
                        .active(user.getActive() != null ? user.getActive() : true)
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
                .employeeId(created.getEmployeeId())
                .department(created.getDepartment())
                .shiftTiming(created.getShiftTiming())
                .deskNumber(created.getDeskNumber())
                .bloodGroup(created.getBloodGroup())
                .aadhaarNumber(created.getAadhaarNumber())
                .panNumber(created.getPanNumber())
                .residentialAddress(created.getResidentialAddress())
                .city(created.getCity())
                .state(created.getState())
                .pincode(created.getPincode())
                .policeVerificationStatus(created.getPoliceVerificationStatus())
                .councilRegistrationNumber(created.getCouncilRegistrationNumber())
                .councilName(created.getCouncilName())
                .hepatitisBStatus(created.getHepatitisBStatus())
                .bankAccountNumber(created.getBankAccountNumber())
                .bankIfscCode(created.getBankIfscCode())
                .bankName(created.getBankName())
                .emergencyContactName(created.getEmergencyContactName())
                .emergencyContactPhone(created.getEmergencyContactPhone())
                .emergencyContactRelationship(created.getEmergencyContactRelationship())
                .role(created.getRole() != null ? created.getRole().getId() : "STAFF")
                .clinicId(created.getClinic() != null ? created.getClinic().getId() : null)
                .clinicName(created.getClinic() != null ? created.getClinic().getName() : "Nisschay Clinic")
                .active(created.getActive() != null ? created.getActive() : true)
                .build();

        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR', 'RECEPTIONIST')")
    @GetMapping("/staff/{userId}")
    public ResponseEntity<UserProfileResponse> getStaffMember(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID userId
    ) {
        UserProfileResponse response = userService.getStaffMemberById(userDetails.getClinicId(), userId);
        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN')")
    @PutMapping("/staff/{userId}")
    public ResponseEntity<UserProfileResponse> updateStaffMember(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID userId,
            @RequestBody StaffCreateRequest request
    ) {
        UserProfileResponse response = userService.updateStaffMemberDetails(userDetails.getClinicId(), userId, request);
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

    @GetMapping("/me/sessions")
    public ResponseEntity<List<UserSessionResponse>> getMySessions(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        List<UserSessionResponse> sessions = sessionService.getUserActiveSessions(userDetails.getId());
        return ResponseEntity.ok(sessions);
    }

    @PostMapping("/me/sessions/revoke-others")
    public ResponseEntity<Void> revokeOtherSessions(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        sessionService.revokeAllOtherSessions(userDetails.getId());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/me/sessions/{sessionId}")
    public ResponseEntity<Void> revokeSingleSession(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID sessionId
    ) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        sessionService.revokeSession(userDetails.getId(), sessionId);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN')")
    @DeleteMapping("/staff/{userId}")
    public ResponseEntity<Void> deleteStaff(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID userId
    ) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        userService.deleteStaffMember(userDetails.getClinicId(), userId);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN')")
    @PostMapping("/staff/{userId}/reset-password")
    public ResponseEntity<Void> resetStaffPassword(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID userId,
            @RequestParam String newPassword
    ) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        userService.resetStaffPassword(userDetails.getClinicId(), userId, newPassword);
        return ResponseEntity.noContent().build();
    }
}
