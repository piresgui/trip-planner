package com.tripplanner.expense.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record BalanceResponse(
        UUID userId,
        String userName,
        BigDecimal totalPaid,
        BigDecimal totalOwed,
        // Positive: this person is owed money overall. Negative: they owe money.
        BigDecimal netBalance
) {
}
