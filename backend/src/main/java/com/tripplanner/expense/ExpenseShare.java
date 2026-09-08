package com.tripplanner.expense;

import com.tripplanner.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * One row per participant who owes part of an Expense. Splitting this out
 * from Expense (rather than an even-split flag + participant list) is what
 * lets an expense be divided unequally -- each share carries its own amount.
 */
@Entity
@Table(name = "expense_shares")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseShare {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "expense_id", nullable = false)
    private Expense expense;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal shareAmount;
}
