package com.nisschay.cms.service;

import com.nisschay.cms.dto.res.UserSessionResponse;
import com.nisschay.cms.entity.RefreshToken;
import com.nisschay.cms.entity.User;
import com.nisschay.cms.repository.RefreshTokenRepository;
import com.nisschay.cms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SessionService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<UserSessionResponse> getUserActiveSessions(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        List<RefreshToken> activeTokens = refreshTokenRepository.findByUserAndRevokedFalseOrderByCreatedAtDesc(user);

        return activeTokens.stream()
                .filter(token -> token.getExpiryDate().isAfter(OffsetDateTime.now()))
                .map(token -> UserSessionResponse.builder()
                        .id(token.getId())
                        .deviceInfo(token.getDeviceInfo() != null ? token.getDeviceInfo() : "Web Browser (Standard)")
                        .ipAddress(token.getIpAddress() != null ? token.getIpAddress() : "127.0.0.1")
                        .lastActiveAt(token.getLastActiveAt() != null ? token.getLastActiveAt() : token.getCreatedAt())
                        .createdAt(token.getCreatedAt())
                        .isCurrent(false) // frontend marks current based on local timestamp / device
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional
    public void revokeOtherSessions(UUID userId, UUID currentSessionId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        List<RefreshToken> activeTokens = refreshTokenRepository.findByUserAndRevokedFalseOrderByCreatedAtDesc(user);

        for (RefreshToken token : activeTokens) {
            if (currentSessionId == null || !token.getId().equals(currentSessionId)) {
                token.setRevoked(true);
                refreshTokenRepository.save(token);
            }
        }
    }

    @Transactional
    public void revokeAllOtherSessions(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        List<RefreshToken> activeTokens = refreshTokenRepository.findByUserAndRevokedFalseOrderByCreatedAtDesc(user);
        
        // Keep the latest created active session, revoke all older active sessions
        if (!activeTokens.isEmpty()) {
            RefreshToken latest = activeTokens.get(0);
            for (int i = 1; i < activeTokens.size(); i++) {
                RefreshToken token = activeTokens.get(i);
                token.setRevoked(true);
                refreshTokenRepository.save(token);
            }
        }
    }

    @Transactional
    public void revokeSession(UUID userId, UUID sessionId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        refreshTokenRepository.findByIdAndUser(sessionId, user).ifPresent(token -> {
            token.setRevoked(true);
            refreshTokenRepository.save(token);
        });
    }
}
