package com.tripplanner.expense;

import com.tripplanner.common.ApiException;
import com.tripplanner.expense.dto.ExpenseRequest;
import com.tripplanner.expense.dto.ExpenseResponse;
import com.tripplanner.expense.dto.ExpenseShareInput;
import com.tripplanner.trip.Trip;
import com.tripplanner.trip.TripParticipant;
import com.tripplanner.trip.TripParticipantRepository;
import com.tripplanner.trip.TripRepository;
import com.tripplanner.trip.TripRole;
import com.tripplanner.user.User;
import com.tripplanner.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ExpenseServiceTest {

    @Mock
    private ExpenseRepository expenseRepository;
    @Mock
    private TripRepository tripRepository;
    @Mock
    private TripParticipantRepository participantRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ExpenseService expenseService;

    private UUID tripId;
    private User payer;
    private User other;
    private Trip trip;

    @BeforeEach
    void setUp() {
        tripId = UUID.randomUUID();
        payer = User.builder().id(UUID.randomUUID()).name("Ana").email("ana@example.com").build();
        other = User.builder().id(UUID.randomUUID()).name("Bruno").email("bruno@example.com").build();
        trip = Trip.builder().id(tripId).owner(payer).build();

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(payer.getId(), null, List.of()));
        SecurityContextHolder.setContext(context);

        // NOTE: expenseService is constructed with a real BalanceCalculator by
        // Mockito's @InjectMocks only if it's also a @Mock/@Spy; here we
        // rely on constructor injection picking it up as null-safe since
        // addExpense doesn't call it. getBalances tests build it explicitly.
    }

    @Test
    void addExpense_evenSplit_dividesAmountAcrossAllParticipants() {
        when(tripRepository.findById(tripId)).thenReturn(Optional.of(trip));
        when(userRepository.getReferenceById(payer.getId())).thenReturn(payer);
        when(participantRepository.findByTripId(tripId)).thenReturn(List.of(
                TripParticipant.builder().user(payer).role(TripRole.OWNER).build(),
                TripParticipant.builder().user(other).role(TripRole.EDITOR).build()
        ));
        when(expenseRepository.save(any(Expense.class))).thenAnswer(inv -> {
            Expense e = inv.getArgument(0);
            e.setId(UUID.randomUUID());
            return e;
        });

        ExpenseRequest request = new ExpenseRequest("Dinner", new BigDecimal("10.01"), "USD", LocalDate.now(), null);
        ExpenseResponse response = expenseService.addExpense(tripId, request);

        assertThat(response.shares()).hasSize(2);
        // 10.01 split two ways: one share gets the leftover cent.
        BigDecimal sum = response.shares().stream().map(ExpenseResponse.ShareResponse::shareAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertThat(sum).isEqualByComparingTo("10.01");
    }

    @Test
    void addExpense_explicitUnequalSplit_isPersistedAsGiven() {
        when(tripRepository.findById(tripId)).thenReturn(Optional.of(trip));
        when(userRepository.getReferenceById(payer.getId())).thenReturn(payer);
        when(userRepository.findById(payer.getId())).thenReturn(Optional.of(payer));
        when(userRepository.findById(other.getId())).thenReturn(Optional.of(other));
        when(expenseRepository.save(any(Expense.class))).thenAnswer(inv -> {
            Expense e = inv.getArgument(0);
            e.setId(UUID.randomUUID());
            return e;
        });

        ExpenseRequest request = new ExpenseRequest("Dinner", new BigDecimal("100.00"), "USD", LocalDate.now(), List.of(
                new ExpenseShareInput(payer.getId(), new BigDecimal("70.00")),
                new ExpenseShareInput(other.getId(), new BigDecimal("30.00"))
        ));

        ExpenseResponse response = expenseService.addExpense(tripId, request);

        assertThat(response.shares()).hasSize(2);
    }

    @Test
    void addExpense_throwsBadRequest_whenSharesDontSumToAmount() {
        when(tripRepository.findById(tripId)).thenReturn(Optional.of(trip));
        when(userRepository.getReferenceById(payer.getId())).thenReturn(payer);

        ExpenseRequest request = new ExpenseRequest("Dinner", new BigDecimal("100.00"), "USD", LocalDate.now(), List.of(
                new ExpenseShareInput(payer.getId(), new BigDecimal("60.00")),
                new ExpenseShareInput(other.getId(), new BigDecimal("30.00"))
        ));

        assertThatThrownBy(() -> expenseService.addExpense(tripId, request))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("must equal the expense amount");
    }
}
