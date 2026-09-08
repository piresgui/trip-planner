package com.tripplanner.trip;

import com.tripplanner.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "trip_invites")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TripInvite {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    @Column(nullable = false)
    private String invitedEmail;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "invited_by", nullable = false)
    private User invitedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InviteStatus status;

    // Opaque token emailed/shared to the invitee, used to accept/decline
    // without requiring them to already have an account-linked session.
    @Column(nullable = false, unique = true)
    private String token;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (token == null) {
            token = UUID.randomUUID().toString();
        }
        if (status == null) {
            status = InviteStatus.PENDING;
        }
    }
}
