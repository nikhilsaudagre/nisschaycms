package com.nisschay.cms.dto.res;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSessionResponse {
    private UUID id;
    private String deviceInfo;
    private String ipAddress;
    private OffsetDateTime lastActiveAt;
    private OffsetDateTime createdAt;
    private boolean isCurrent;
}
