package com.tripplanner.trip;

import com.tripplanner.common.CurrentUser;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Small helper exposed to SpEL in @PreAuthorize annotations (e.g.
 * "@tripAuthorization.canEdit(#tripId)"). Kept separate from TripService so
 * authorization rules are declared right on the controller methods they
 * protect, instead of buried inside service logic.
 */
@Component("tripAuthorization")
public class TripAuthorization {

    private final TripParticipantRepository participantRepository;

    public TripAuthorization(TripParticipantRepository participantRepository) {
        this.participantRepository = participantRepository;
    }

    public boolean isParticipant(UUID tripId) {
        return participantRepository.existsByTripIdAndUserId(tripId, CurrentUser.id());
    }

    public boolean canEdit(UUID tripId) {
        return roleOf(tripId).map(role -> role == TripRole.OWNER || role == TripRole.EDITOR).orElse(false);
    }

    public boolean isOwner(UUID tripId) {
        return roleOf(tripId).map(role -> role == TripRole.OWNER).orElse(false);
    }

    private java.util.Optional<TripRole> roleOf(UUID tripId) {
        return participantRepository.findByTripIdAndUserId(tripId, CurrentUser.id()).map(TripParticipant::getRole);
    }
}
