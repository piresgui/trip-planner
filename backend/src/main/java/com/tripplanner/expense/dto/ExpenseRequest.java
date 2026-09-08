package com.tripplanner.expense.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record ExpenseRequest(
        @NotBlank String description,
        @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
        @NotBlank String currency,
        @NotNull LocalDate date,
        // Null or empty means "split evenly across all trip participants".
        List<ExpenseShareInput> shares
) {
}
