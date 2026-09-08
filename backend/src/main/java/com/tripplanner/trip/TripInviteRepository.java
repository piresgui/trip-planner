package com.tripplanner.trip;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TripInviteRepository extends JpaRepository<TripInvite, UUID> {
    List<TripInvite> findByTripId(UUID tripId);

    Optional<TripInvite> findByToken(String token);

    List<TripInvite> findByInvitedEmailAndStatus(String invitedEmail, InviteStatus status);
}
