package com.tripplanner.expense.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * One entry of a split. When shares are omitted on ExpenseRequest, the
 * service falls back to an even split across all trip participants -- this
 * type is only needed for an explicit/unequal split.
 */
public record ExpenseShareInput(
        @NotNull UUID userId,
        @NotNull @DecimalMin(value = "0.0", inclusive = true) BigDecimal shareAmount
) {
}
