package com.tripplanner.expense.dto;

import com.tripplanner.expense.Expense;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ExpenseResponse(
        UUID id,
        UUID tripId,
        UUID paidById,
        String paidByName,
        String description,
        BigDecimal amount,
        String currency,
        LocalDate date,
        List<ShareResponse> shares
) {
    public record ShareResponse(UUID userId, String userName, BigDecimal shareAmount) {
    }

    public static ExpenseResponse from(Expense expense) {
        List<ShareResponse> shares = expense.getShares().stream()
                .map(s -> new ShareResponse(s.getUser().getId(), s.getUser().getName(), s.getShareAmount()))
                .toList();
        return new ExpenseResponse(
                expense.getId(),
                expense.getTrip().getId(),
                expense.getPaidBy().getId(),
                expense.getPaidBy().getName(),
                expense.getDescription(),
                expense.getAmount(),
                expense.getCurrency(),
                expense.getDate(),
                shares
        );
    }
}
