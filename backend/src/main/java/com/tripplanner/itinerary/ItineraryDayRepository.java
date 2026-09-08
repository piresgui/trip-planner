package com.tripplanner.itinerary;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ItineraryDayRepository extends JpaRepository<ItineraryDay, UUID> {
    List<ItineraryDay> findByTripIdOrderByDayIndexAsc(UUID tripId);

    Optional<ItineraryDay> findByIdAndTripId(UUID id, UUID tripId);

    long countByTripId(UUID tripId);
}
