package com.tripplanner.expense;

import com.tripplanner.expense.dto.BalanceResponse;
import com.tripplanner.trip.Trip;
import com.tripplanner.user.User;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class BalanceCalculatorTest {

    private final BalanceCalculator calculator = new BalanceCalculator();

    private User user(String name) {
        return User.builder().id(UUID.randomUUID()).name(name).email(name + "@example.com").build();
    }

    @Test
    void calculate_evenSplit_threePeopleOneExpense() {
        User ana = user("Ana");
        User bruno = user("Bruno");
        User carla = user("Carla");
        Trip trip = Trip.builder().id(UUID.randomUUID()).owner(ana).build();

        Expense expense = Expense.builder()
                .id(UUID.randomUUID()).trip(trip).paidBy(ana)
                .description("Hotel").amount(new BigDecimal("90.00")).currency("USD").date(LocalDate.now())
                .build();
        expense.setShares(List.of(
                share(expense, ana, "30.00"),
                share(expense, bruno, "30.00"),
                share(expense, carla, "30.00")
        ));

        List<BalanceResponse> balances = calculator.calculate(List.of(expense));

        assertThat(balanceFor(balances, ana).netBalance()).isEqualByComparingTo("60.00");
        assertThat(balanceFor(balances, bruno).netBalance()).isEqualByComparingTo("-30.00");
        assertThat(balanceFor(balances, carla).netBalance()).isEqualByComparingTo("-30.00");
    }

    @Test
    void calculate_unequalSplit_reflectsEachPersonsShare() {
        User ana = user("Ana");
        User bruno = user("Bruno");
        Trip trip = Trip.builder().id(UUID.randomUUID()).owner(ana).build();

        Expense expense = Expense.builder()
                .id(UUID.randomUUID()).trip(trip).paidBy(bruno)
                .description("Dinner").amount(new BigDecimal("100.00")).currency("USD").date(LocalDate.now())
                .build();
        // Ana ordered more expensive dishes: unequal split.
        expense.setShares(List.of(
                share(expense, ana, "70.00"),
                share(expense, bruno, "30.00")
        ));

        List<BalanceResponse> balances = calculator.calculate(List.of(expense));

        assertThat(balanceFor(balances, ana).netBalance()).isEqualByComparingTo("-70.00");
        assertThat(balanceFor(balances, bruno).netBalance()).isEqualByComparingTo("70.00");
    }

    @Test
    void calculate_multipleExpenses_accumulatesAcrossAll() {
        User ana = user("Ana");
        User bruno = user("Bruno");
        Trip trip = Trip.builder().id(UUID.randomUUID()).owner(ana).build();

        Expense e1 = Expense.builder().id(UUID.randomUUID()).trip(trip).paidBy(ana)
                .description("Taxi").amount(new BigDecimal("20.00")).currency("USD").date(LocalDate.now()).build();
        e1.setShares(List.of(share(e1, ana, "10.00"), share(e1, bruno, "10.00")));

        Expense e2 = Expense.builder().id(UUID.randomUUID()).trip(trip).paidBy(bruno)
                .description("Lunch").amount(new BigDecimal("40.00")).currency("USD").date(LocalDate.now()).build();
        e2.setShares(List.of(share(e2, ana, "20.00"), share(e2, bruno, "20.00")));

        List<BalanceResponse> balances = calculator.calculate(List.of(e1, e2));

        // Ana paid 20, owes 30 total -> net -10. Bruno paid 40, owes 30 -> net +10.
        assertThat(balanceFor(balances, ana).netBalance()).isEqualByComparingTo("-10.00");
        assertThat(balanceFor(balances, bruno).netBalance()).isEqualByComparingTo("10.00");
    }

    private ExpenseShare share(Expense expense, User user, String amount) {
        return ExpenseShare.builder().expense(expense).user(user).shareAmount(new BigDecimal(amount)).build();
    }

    private BalanceResponse balanceFor(List<BalanceResponse> balances, User user) {
        return balances.stream().filter(b -> b.userId().equals(user.getId())).findFirst()
                .orElseThrow(() -> new AssertionError("No balance found for " + user.getName()));
    }
}
