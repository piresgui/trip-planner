package com.tripplanner.itinerary.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalTime;

public record ActivityRequest(
        @NotNull LocalTime time,
        @NotBlank String location,
        @NotBlank String description,
        @DecimalMin(value = "0.0", message = "estimatedCost must not be negative") BigDecimal estimatedCost
) {
}
