package com.tripplanner.expense;

import com.tripplanner.expense.dto.BalanceResponse;
import com.tripplanner.expense.dto.ExpenseRequest;
import com.tripplanner.expense.dto.ExpenseResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/trips/{tripId}/expenses")
@PreAuthorize("@tripAuthorization.isParticipant(#tripId)")
public class ExpenseController {

    private final ExpenseService expenseService;

    public ExpenseController(ExpenseService expenseService) {
        this.expenseService = expenseService;
    }

    @GetMapping
    public ResponseEntity<List<ExpenseResponse>> listExpenses(@PathVariable UUID tripId) {
        return ResponseEntity.ok(expenseService.listExpenses(tripId));
    }

    @PostMapping
    @PreAuthorize("@tripAuthorization.canEdit(#tripId)")
    public ResponseEntity<ExpenseResponse> addExpense(@PathVariable UUID tripId, @Valid @RequestBody ExpenseRequest request) {
        return ResponseEntity.ok(expenseService.addExpense(tripId, request));
    }

    @DeleteMapping("/{expenseId}")
    @PreAuthorize("@tripAuthorization.canEdit(#tripId)")
    public ResponseEntity<Void> deleteExpense(@PathVariable UUID tripId, @PathVariable UUID expenseId) {
        expenseService.deleteExpense(tripId, expenseId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/balances")
    public ResponseEntity<List<BalanceResponse>> getBalances(@PathVariable UUID tripId) {
        return ResponseEntity.ok(expenseService.getBalances(tripId));
    }
}
