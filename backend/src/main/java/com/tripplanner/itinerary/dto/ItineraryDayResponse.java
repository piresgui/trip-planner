package com.tripplanner.itinerary.dto;

import com.tripplanner.itinerary.ItineraryDay;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ItineraryDayResponse(
        UUID id,
        LocalDate date,
        int dayIndex,
        List<ActivityResponse> activities
) {
    public static ItineraryDayResponse from(ItineraryDay day, List<ActivityResponse> activities) {
        return new ItineraryDayResponse(day.getId(), day.getDate(), day.getDayIndex(), activities);
    }
}
