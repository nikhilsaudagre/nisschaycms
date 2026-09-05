package com.nisschay.cms.dto.res;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {
    private UUID id;
    private String name;
    private String email;
    private String phone;
    private String employeeId;
    private String department;
    private String shiftTiming;
    private String deskNumber;
    private String bloodGroup;
    private String aadhaarNumber;
    private String panNumber;
    private String residentialAddress;
    private String city;
    private String state;
    private String pincode;
    private String policeVerificationStatus;
    private String councilRegistrationNumber;
    private String councilName;
    private String hepatitisBStatus;
    private String bankAccountNumber;
    private String bankIfscCode;
    private String bankName;
    private String emergencyContactName;
    private String emergencyContactPhone;
    private String emergencyContactRelationship;
    private String role;
    private UUID clinicId;
    private String clinicName;
    private String profilePictureUrl;
    private Boolean active;
    private Boolean notifyDailyReport;
    private Boolean notifyEmergencyVisit;
    private Boolean notifyRxAudit;
}
