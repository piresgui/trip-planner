package com.tripplanner.itinerary.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record ItineraryDayRequest(
        @NotNull LocalDate date
) {
}
