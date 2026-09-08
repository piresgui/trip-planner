package com.tripplanner.trip.dto;

import com.tripplanner.trip.Trip;
import com.tripplanner.trip.TripRole;

import java.time.LocalDate;
import java.util.UUID;

public record TripResponse(
        UUID id,
        String title,
        String destination,
        LocalDate startDate,
        LocalDate endDate,
        UUID ownerId,
        String ownerName,
        TripRole myRole
) {
    public static TripResponse from(Trip trip, TripRole myRole) {
        return new TripResponse(
                trip.getId(),
                trip.getTitle(),
                trip.getDestination(),
                trip.getStartDate(),
                trip.getEndDate(),
                trip.getOwner().getId(),
                trip.getOwner().getName(),
                myRole
        );
    }
}
