package com.tripplanner.trip.dto;

import com.tripplanner.trip.InviteStatus;
import com.tripplanner.trip.TripInvite;

import java.util.UUID;

public record InviteResponse(
        UUID id,
        UUID tripId,
        String invitedEmail,
        InviteStatus status,
        String token
) {
    public static InviteResponse from(TripInvite invite) {
        return new InviteResponse(
                invite.getId(),
                invite.getTrip().getId(),
                invite.getInvitedEmail(),
                invite.getStatus(),
                invite.getToken()
        );
    }
}
