package com.tripplanner.itinerary;

import com.tripplanner.itinerary.dto.ActivityResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.LocalTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

/**
 * "Integration" here means: verify the broadcaster talks correctly to Spring's
 * messaging template (correct topic, correct event shape) without needing a
 * real WebSocket connection/client -- that's what STOMP itself is responsible
 * for and is exercised in the underlying Spring test suite already.
 */
@ExtendWith(MockitoExtension.class)
class ItineraryBroadcasterTest {

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private ItineraryBroadcaster broadcaster;

    @Test
    void activityCreated_sendsToTripItineraryTopic() {
        UUID tripId = UUID.randomUUID();
        ActivityResponse activity = new ActivityResponse(
                UUID.randomUUID(), UUID.randomUUID(), LocalTime.of(9, 0), "Museum", "Visit", null,
                UUID.randomUUID(), "Ana");

        broadcaster.activityCreated(tripId, activity);

        ArgumentCaptor<Object> payloadCaptor = ArgumentCaptor.forClass(Object.class);
        verify(messagingTemplate).convertAndSend(
                org.mockito.ArgumentMatchers.eq("/topic/trips/" + tripId + "/itinerary"),
                payloadCaptor.capture());

        assertThat(payloadCaptor.getValue()).isInstanceOf(ItineraryBroadcaster.ItineraryEvent.class);
        var event = (ItineraryBroadcaster.ItineraryEvent) payloadCaptor.getValue();
        assertThat(event.type()).isEqualTo("ACTIVITY_CREATED");
        assertThat(event.payload()).isEqualTo(activity);
    }

    @Test
    void activityDeleted_sendsDeletedPayloadWithIds() {
        UUID tripId = UUID.randomUUID();
        UUID dayId = UUID.randomUUID();
        UUID activityId = UUID.randomUUID();

        broadcaster.activityDeleted(tripId, dayId, activityId);

        ArgumentCaptor<Object> payloadCaptor = ArgumentCaptor.forClass(Object.class);
        verify(messagingTemplate).convertAndSend(
                org.mockito.ArgumentMatchers.eq("/topic/trips/" + tripId + "/itinerary"),
                payloadCaptor.capture());

        var event = (ItineraryBroadcaster.ItineraryEvent) payloadCaptor.getValue();
        assertThat(event.type()).isEqualTo("ACTIVITY_DELETED");
        assertThat(event.payload()).isEqualTo(new ItineraryBroadcaster.DeletedActivityPayload(dayId, activityId));
    }
}
