package com.tripplanner.trip.dto;

import com.tripplanner.trip.TripParticipant;
import com.tripplanner.trip.TripRole;

import java.util.UUID;

public record ParticipantResponse(
        UUID userId,
        String name,
        String email,
        TripRole role
) {
    public static ParticipantResponse from(TripParticipant participant) {
        return new ParticipantResponse(
                participant.getUser().getId(),
                participant.getUser().getName(),
                participant.getUser().getEmail(),
                participant.getRole()
        );
    }
}
