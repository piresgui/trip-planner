package com.tripplanner.trip;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TripParticipantRepository extends JpaRepository<TripParticipant, UUID> {
    List<TripParticipant> findByTripId(UUID tripId);

    List<TripParticipant> findByUserId(UUID userId);

    Optional<TripParticipant> findByTripIdAndUserId(UUID tripId, UUID userId);

    boolean existsByTripIdAndUserId(UUID tripId, UUID userId);
}
