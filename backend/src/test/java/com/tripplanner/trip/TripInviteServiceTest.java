package com.tripplanner.trip;

import com.tripplanner.common.ApiException;
import com.tripplanner.trip.dto.InviteRequest;
import com.tripplanner.trip.dto.InviteResponse;
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

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TripInviteServiceTest {

    @Mock
    private TripInviteRepository inviteRepository;
    @Mock
    private TripRepository tripRepository;
    @Mock
    private TripParticipantRepository participantRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private TripInviteService inviteService;

    private User owner;
    private User invitee;
    private Trip trip;

    @BeforeEach
    void setUp() {
        owner = User.builder().id(UUID.randomUUID()).name("Owner").email("owner@example.com").build();
        invitee = User.builder().id(UUID.randomUUID()).name("Invitee").email("invitee@example.com").build();
        trip = Trip.builder().id(UUID.randomUUID()).owner(owner).build();

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(owner.getId(), null, List.of()));
        SecurityContextHolder.setContext(context);
    }

    @Test
    void createInvite_savesPendingInvite() {
        when(tripRepository.findById(trip.getId())).thenReturn(Optional.of(trip));
        when(userRepository.getReferenceById(owner.getId())).thenReturn(owner);
        when(inviteRepository.save(any(TripInvite.class))).thenAnswer(inv -> {
            TripInvite i = inv.getArgument(0);
            i.setId(UUID.randomUUID());
            i.setToken("generated-token");
            return i;
        });

        InviteResponse response = inviteService.createInvite(trip.getId(), new InviteRequest("invitee@example.com"));

        assertThat(response.status()).isEqualTo(InviteStatus.PENDING);
        assertThat(response.invitedEmail()).isEqualTo("invitee@example.com");
    }

    @Test
    void acceptInvite_addsParticipant_whenEmailMatches() {
        TripInvite invite = TripInvite.builder()
                .id(UUID.randomUUID()).trip(trip).invitedEmail("invitee@example.com")
                .invitedBy(owner).status(InviteStatus.PENDING).token("tok-123").build();

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(invitee.getId(), null, List.of()));

        when(inviteRepository.findByToken("tok-123")).thenReturn(Optional.of(invite));
        when(userRepository.findById(invitee.getId())).thenReturn(Optional.of(invitee));
        when(participantRepository.existsByTripIdAndUserId(trip.getId(), invitee.getId())).thenReturn(false);
        when(inviteRepository.save(any(TripInvite.class))).thenAnswer(inv -> inv.getArgument(0));

        InviteResponse response = inviteService.acceptInvite("tok-123");

        assertThat(response.status()).isEqualTo(InviteStatus.ACCEPTED);
        verify(participantRepository).save(argThat(p -> p.getRole() == TripRole.EDITOR && p.getUser().equals(invitee)));
    }

    @Test
    void acceptInvite_throwsForbidden_whenEmailDoesNotMatch() {
        TripInvite invite = TripInvite.builder()
                .id(UUID.randomUUID()).trip(trip).invitedEmail("someone-else@example.com")
                .invitedBy(owner).status(InviteStatus.PENDING).token("tok-456").build();

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(invitee.getId(), null, List.of()));

        when(inviteRepository.findByToken("tok-456")).thenReturn(Optional.of(invite));
        when(userRepository.findById(invitee.getId())).thenReturn(Optional.of(invitee));

        assertThatThrownBy(() -> inviteService.acceptInvite("tok-456"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("different email");
    }

    @Test
    void acceptInvite_throwsConflict_whenAlreadyAccepted() {
        TripInvite invite = TripInvite.builder()
                .id(UUID.randomUUID()).trip(trip).invitedEmail("invitee@example.com")
                .invitedBy(owner).status(InviteStatus.ACCEPTED).token("tok-789").build();

        when(inviteRepository.findByToken("tok-789")).thenReturn(Optional.of(invite));

        assertThatThrownBy(() -> inviteService.acceptInvite("tok-789"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("already been accepted");
    }
}
