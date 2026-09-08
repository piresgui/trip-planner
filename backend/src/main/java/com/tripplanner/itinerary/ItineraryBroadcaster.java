package com.tripplanner.itinerary;

import com.tripplanner.itinerary.dto.ActivityResponse;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Kept separate from ItineraryController/ItineraryService on purpose: the
 * REST layer's job is to persist state and answer the caller, while
 * broadcasting is a side effect for *other* connected clients. Separating
 * them means the WebSocket transport can be swapped out (or the broadcaster
 * disabled in tests) without touching persistence logic at all.
 */
@Component
public class ItineraryBroadcaster {

    private static final String DESTINATION_PREFIX = "/topic/trips/";

    private final SimpMessagingTemplate messagingTemplate;

    public ItineraryBroadcaster(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void activityCreated(UUID tripId, ActivityResponse activity) {
        send(tripId, new ItineraryEvent("ACTIVITY_CREATED", activity));
    }

    public void activityUpdated(UUID tripId, ActivityResponse activity) {
        send(tripId, new ItineraryEvent("ACTIVITY_UPDATED", activity));
    }

    public void activityDeleted(UUID tripId, UUID dayId, UUID activityId) {
        send(tripId, new ItineraryEvent("ACTIVITY_DELETED", new DeletedActivityPayload(dayId, activityId)));
    }

    private void send(UUID tripId, ItineraryEvent event) {
        messagingTemplate.convertAndSend(DESTINATION_PREFIX + tripId + "/itinerary", event);
    }

    public record ItineraryEvent(String type, Object payload) {
    }

    public record DeletedActivityPayload(UUID dayId, UUID activityId) {
    }
}
