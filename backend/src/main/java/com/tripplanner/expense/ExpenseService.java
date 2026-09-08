package com.tripplanner.expense;

import com.tripplanner.common.ApiException;
import com.tripplanner.common.CurrentUser;
import com.tripplanner.expense.dto.BalanceResponse;
import com.tripplanner.expense.dto.ExpenseRequest;
import com.tripplanner.expense.dto.ExpenseResponse;
import com.tripplanner.expense.dto.ExpenseShareInput;
import com.tripplanner.trip.Trip;
import com.tripplanner.trip.TripParticipant;
import com.tripplanner.trip.TripParticipantRepository;
import com.tripplanner.trip.TripRepository;
import com.tripplanner.user.User;
import com.tripplanner.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final TripRepository tripRepository;
    private final TripParticipantRepository participantRepository;
    private final UserRepository userRepository;
    private final BalanceCalculator balanceCalculator;

    public ExpenseService(ExpenseRepository expenseRepository,
                           TripRepository tripRepository,
                           TripParticipantRepository participantRepository,
                           UserRepository userRepository,
                           BalanceCalculator balanceCalculator) {
        this.expenseRepository = expenseRepository;
        this.tripRepository = tripRepository;
        this.participantRepository = participantRepository;
        this.userRepository = userRepository;
        this.balanceCalculator = balanceCalculator;
    }

    @Transactional
    public ExpenseResponse addExpense(UUID tripId, ExpenseRequest request) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> ApiException.notFound("Trip not found"));
        User paidBy = userRepository.getReferenceById(CurrentUser.id());

        Expense expense = Expense.builder()
                .trip(trip)
                .paidBy(paidBy)
                .description(request.description())
                .amount(request.amount())
                .currency(request.currency())
                .date(request.date())
                .build();

        List<ExpenseShare> shares = buildShares(tripId, expense, request);
        expense.setShares(shares);

        expense = expenseRepository.save(expense);
        return ExpenseResponse.from(expense);
    }

    @Transactional(readOnly = true)
    public List<ExpenseResponse> listExpenses(UUID tripId) {
        return expenseRepository.findByTripId(tripId).stream().map(ExpenseResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<BalanceResponse> getBalances(UUID tripId) {
        List<Expense> expenses = expenseRepository.findByTripId(tripId);
        return balanceCalculator.calculate(expenses);
    }

    @Transactional
    public void deleteExpense(UUID tripId, UUID expenseId) {
        Expense expense = expenseRepository.findByIdAndTripId(expenseId, tripId)
                .orElseThrow(() -> ApiException.notFound("Expense not found"));
        expenseRepository.delete(expense);
    }

    private List<ExpenseShare> buildShares(UUID tripId, Expense expense, ExpenseRequest request) {
        if (request.shares() != null && !request.shares().isEmpty()) {
            return buildExplicitShares(expense, request);
        }
        return buildEvenShares(tripId, expense, request.amount());
    }

    private List<ExpenseShare> buildExplicitShares(Expense expense, ExpenseRequest request) {
        BigDecimal sum = request.shares().stream()
                .map(ExpenseShareInput::shareAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (sum.compareTo(request.amount()) != 0) {
            throw ApiException.badRequest("Sum of shares (" + sum + ") must equal the expense amount (" + request.amount() + ")");
        }

        List<ExpenseShare> shares = new ArrayList<>();
        for (ExpenseShareInput input : request.shares()) {
            User user = userRepository.findById(input.userId())
                    .orElseThrow(() -> ApiException.badRequest("Unknown user in shares: " + input.userId()));
            shares.add(ExpenseShare.builder().expense(expense).user(user).shareAmount(input.shareAmount()).build());
        }
        return shares;
    }

    private List<ExpenseShare> buildEvenShares(UUID tripId, Expense expense, BigDecimal amount) {
        List<TripParticipant> participants = participantRepository.findByTripId(tripId);
        if (participants.isEmpty()) {
            throw ApiException.badRequest("Trip has no participants to split the expense with");
        }

        // Split as evenly as possible; any leftover cent(s) from rounding go
        // to the first participants so the shares always sum back to the
        // exact original amount (never off by a cent due to division).
        int count = participants.size();
        BigDecimal baseShare = amount.divide(BigDecimal.valueOf(count), 2, RoundingMode.DOWN);
        BigDecimal distributed = baseShare.multiply(BigDecimal.valueOf(count));
        BigDecimal remainder = amount.subtract(distributed);
        BigDecimal cent = new BigDecimal("0.01");

        List<ExpenseShare> shares = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            BigDecimal shareAmount = baseShare;
            if (remainder.compareTo(BigDecimal.ZERO) > 0) {
                shareAmount = shareAmount.add(cent);
                remainder = remainder.subtract(cent);
            }
            shares.add(ExpenseShare.builder()
                    .expense(expense)
                    .user(participants.get(i).getUser())
                    .shareAmount(shareAmount)
                    .build());
        }
        return shares;
    }
}
