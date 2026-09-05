package com.nisschay.cms.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
@Slf4j
public class QueueStreamService {

    // Map of Clinic ID to list of active SSE emitters
    private final Map<UUID, CopyOnWriteArrayList<SseEmitter>> clinicEmitters = new ConcurrentHashMap<>();

    public SseEmitter subscribe(UUID clinicId) {
        if (clinicId == null) {
            clinicId = UUID.fromString("00000000-0000-0000-0000-000000000000");
        }

        SseEmitter emitter = new SseEmitter(180_000L); // 3 minutes timeout
        clinicEmitters.computeIfAbsent(clinicId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        final UUID finalClinicId = clinicId;
        emitter.onCompletion(() -> removeEmitter(finalClinicId, emitter));
        emitter.onTimeout(() -> removeEmitter(finalClinicId, emitter));
        emitter.onError((e) -> removeEmitter(finalClinicId, emitter));

        try {
            emitter.send(SseEmitter.event().name("INIT").data("Connected to Live OPD Queue Stream"));
        } catch (IOException e) {
            removeEmitter(finalClinicId, emitter);
        }

        return emitter;
    }

    public void broadcastQueueUpdate(UUID clinicId, String eventType, Object data) {
        if (clinicId == null) {
            clinicId = UUID.fromString("00000000-0000-0000-0000-000000000000");
        }

        CopyOnWriteArrayList<SseEmitter> emitters = clinicEmitters.get(clinicId);
        if (emitters == null || emitters.isEmpty()) return;

        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name(eventType != null ? eventType : "QUEUE_UPDATED")
                        .data(data));
            } catch (Exception e) {
                removeEmitter(clinicId, emitter);
            }
        }
    }

    private void removeEmitter(UUID clinicId, SseEmitter emitter) {
        CopyOnWriteArrayList<SseEmitter> list = clinicEmitters.get(clinicId);
        if (list != null) {
            list.remove(emitter);
        }
    }
}
