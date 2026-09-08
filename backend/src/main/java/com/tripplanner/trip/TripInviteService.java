package com.tripplanner.trip;

import com.tripplanner.common.ApiException;
import com.tripplanner.common.CurrentUser;
import com.tripplanner.trip.dto.InviteRequest;
import com.tripplanner.trip.dto.InviteResponse;
import com.tripplanner.user.User;
import com.tripplanner.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class TripInviteService {

    private final TripInviteRepository inviteRepository;
    private final TripRepository tripRepository;
    private final TripParticipantRepository participantRepository;
    private final UserRepository userRepository;

    public TripInviteService(TripInviteRepository inviteRepository,
                              TripRepository tripRepository,
                              TripParticipantRepository participantRepository,
                              UserRepository userRepository) {
        this.inviteRepository = inviteRepository;
        this.tripRepository = tripRepository;
        this.participantRepository = participantRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public InviteResponse createInvite(UUID tripId, InviteRequest request) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> ApiException.notFound("Trip not found"));
        User invitedBy = userRepository.getReferenceById(CurrentUser.id());

        TripInvite invite = TripInvite.builder()
                .trip(trip)
                .invitedEmail(request.email())
                .invitedBy(invitedBy)
                .status(InviteStatus.PENDING)
                .build();
        invite = inviteRepository.save(invite);
        return InviteResponse.from(invite);
    }

    @Transactional(readOnly = true)
    public List<InviteResponse> listInvites(UUID tripId) {
        return inviteRepository.findByTripId(tripId).stream().map(InviteResponse::from).toList();
    }

    /**
     * Accepting requires the current user's own email to match the invited
     * one -- otherwise anyone who guesses/intercepts a token could join a
     * trip meant for someone else's inbox.
     */
    @Transactional
    public InviteResponse acceptInvite(String token) {
        TripInvite invite = findPendingInviteOrThrow(token);
        User currentUser = userRepository.findById(CurrentUser.id())
                .orElseThrow(() -> ApiException.unauthorized("User not found"));

        if (!currentUser.getEmail().equalsIgnoreCase(invite.getInvitedEmail())) {
            throw ApiException.forbidden("This invite was sent to a different email address");
        }

        invite.setStatus(InviteStatus.ACCEPTED);
        inviteRepository.save(invite);

        if (!participantRepository.existsByTripIdAndUserId(invite.getTrip().getId(), currentUser.getId())) {
            TripParticipant participant = TripParticipant.builder()
                    .trip(invite.getTrip())
                    .user(currentUser)
                    .role(TripRole.EDITOR)
                    .build();
            participantRepository.save(participant);
        }

        return InviteResponse.from(invite);
    }

    @Transactional
    public InviteResponse declineInvite(String token) {
        TripInvite invite = findPendingInviteOrThrow(token);
        invite.setStatus(InviteStatus.DECLINED);
        invite = inviteRepository.save(invite);
        return InviteResponse.from(invite);
    }

    private TripInvite findPendingInviteOrThrow(String token) {
        TripInvite invite = inviteRepository.findByToken(token)
                .orElseThrow(() -> ApiException.notFound("Invite not found"));
        if (invite.getStatus() != InviteStatus.PENDING) {
            throw ApiException.conflict("Invite has already been " + invite.getStatus().name().toLowerCase());
        }
        return invite;
    }
}
