package com.tripplanner.itinerary.dto;

import com.tripplanner.itinerary.Activity;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.UUID;

public record ActivityResponse(
        UUID id,
        UUID itineraryDayId,
        LocalTime time,
        String location,
        String description,
        BigDecimal estimatedCost,
        UUID createdById,
        String createdByName
) {
    public static ActivityResponse from(Activity activity) {
        return new ActivityResponse(
                activity.getId(),
                activity.getItineraryDay().getId(),
                activity.getTime(),
                activity.getLocation(),
                activity.getDescription(),
                activity.getEstimatedCost(),
                activity.getCreatedBy().getId(),
                activity.getCreatedBy().getName()
        );
    }
}
