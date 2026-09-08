package com.tripplanner.expense;

import com.tripplanner.expense.dto.BalanceResponse;
import com.tripplanner.user.User;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * A participant's balance is deliberately NOT a persisted column: it is
 * fully derived from Expense + ExpenseShare rows (paid - owed) every time
 * it's requested. Storing a running balance would require updating it
 * transactionally on every expense create/edit/delete/split-change and
 * would inevitably drift from the source of truth; recomputing it is cheap
 * and can never be out of sync.
 */
@Component
public class BalanceCalculator {

    public List<BalanceResponse> calculate(List<Expense> expenses) {
        Map<User, BigDecimal> paid = new LinkedHashMap<>();
        Map<User, BigDecimal> owed = new LinkedHashMap<>();

        for (Expense expense : expenses) {
            paid.merge(expense.getPaidBy(), expense.getAmount(), BigDecimal::add);

            for (ExpenseShare share : expense.getShares()) {
                owed.merge(share.getUser(), share.getShareAmount(), BigDecimal::add);
            }
        }

        Map<User, BigDecimal> allUsers = new LinkedHashMap<>();
        paid.keySet().forEach(u -> allUsers.put(u, BigDecimal.ZERO));
        owed.keySet().forEach(u -> allUsers.putIfAbsent(u, BigDecimal.ZERO));

        return allUsers.keySet().stream()
                .map(user -> {
                    BigDecimal totalPaid = paid.getOrDefault(user, BigDecimal.ZERO);
                    BigDecimal totalOwed = owed.getOrDefault(user, BigDecimal.ZERO);
                    return new BalanceResponse(
                            user.getId(),
                            user.getName(),
                            totalPaid,
                            totalOwed,
                            totalPaid.subtract(totalOwed)
                    );
                })
                .toList();
    }
}
