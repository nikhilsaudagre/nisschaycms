package com.nisschay.cms.dto.res;

import com.nisschay.cms.entity.DoctorProfile;
import com.nisschay.cms.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DoctorResponse {
    private UUID id;
    private String name;
    private String email;
    private String phone;
    private boolean active;
    private String specialization;
    private String registrationNumber;
    private BigDecimal consultationFee;
    private BigDecimal followUpFee;
    private BigDecimal emergencyFee;
    private String qualification;
    private Integer experienceYears;
    private String roomNumber;
    private Integer slotDuration;
    private String biography;
    private String availabilitySchedule;

    public static DoctorResponse build(User user, DoctorProfile profile) {
        DoctorResponseBuilder builder = DoctorResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .active(user.getActive());

        if (profile != null) {
            builder.specialization(profile.getSpecialization())
                    .registrationNumber(profile.getRegistrationNumber())
                    .consultationFee(profile.getConsultationFee())
                    .followUpFee(profile.getFollowUpFee() != null ? profile.getFollowUpFee() : profile.getConsultationFee())
                    .emergencyFee(profile.getEmergencyFee() != null ? profile.getEmergencyFee() : profile.getConsultationFee())
                    .qualification(profile.getQualification())
                    .experienceYears(profile.getExperienceYears())
                    .roomNumber(profile.getRoomNumber())
                    .slotDuration(profile.getSlotDuration() != null ? profile.getSlotDuration() : 15)
                    .biography(profile.getBiography())
                    .availabilitySchedule(profile.getAvailabilitySchedule());
        } else {
            // Fallback defaults for admin acting as provider
            builder.specialization("General Practice")
                    .registrationNumber("")
                    .consultationFee(BigDecimal.ZERO)
                    .followUpFee(BigDecimal.ZERO)
                    .emergencyFee(BigDecimal.ZERO)
                    .qualification("")
                    .experienceYears(0)
                    .roomNumber("")
                    .slotDuration(15)
                    .biography("")
                    .availabilitySchedule("");
        }

        return builder.build();
    }
}
