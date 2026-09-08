package com.tripplanner.itinerary;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ActivityRepository extends JpaRepository<Activity, UUID> {
    List<Activity> findByItineraryDayIdOrderByTimeAsc(UUID itineraryDayId);

    Optional<Activity> findByIdAndItineraryDayId(UUID id, UUID itineraryDayId);
}
