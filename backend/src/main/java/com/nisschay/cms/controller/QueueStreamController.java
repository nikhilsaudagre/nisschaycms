package com.nisschay.cms.controller;

import com.nisschay.cms.security.UserDetailsImpl;
import com.nisschay.cms.service.QueueStreamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/appointments/queue")
@RequiredArgsConstructor
public class QueueStreamController {

    private final QueueStreamService queueStreamService;

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamQueueEvents(
            @AuthenticationPrincipal UserDetailsImpl userDetails
    ) {
        UUID clinicId = userDetails != null ? userDetails.getClinicId() : null;
        return queueStreamService.subscribe(clinicId);
    }
}
