package com.tripplanner.trip;

import com.tripplanner.common.ApiException;
import com.tripplanner.trip.dto.TripRequest;
import com.tripplanner.trip.dto.TripResponse;
import com.tripplanner.user.User;
import com.tripplanner.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContext;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TripServiceTest {

    @Mock
    private TripRepository tripRepository;
    @Mock
    private TripParticipantRepository participantRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private TripService tripService;

    private UUID currentUserId;
    private User currentUser;

    @BeforeEach
    void setUp() {
        currentUserId = UUID.randomUUID();
        currentUser = User.builder().id(currentUserId).name("Ana").email("ana@example.com").build();

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(currentUserId, null, List.of()));
        SecurityContextHolder.setContext(context);
    }

    @Test
    void createTrip_savesTripAndAddsOwnerAsParticipant() {
        TripRequest request = new TripRequest("Lisbon trip", "Lisbon", LocalDate.now(), LocalDate.now().plusDays(3));
        when(userRepository.getReferenceById(currentUserId)).thenReturn(currentUser);
        when(tripRepository.save(any(Trip.class))).thenAnswer(inv -> {
            Trip t = inv.getArgument(0);
            t.setId(UUID.randomUUID());
            return t;
        });

        TripResponse response = tripService.createTrip(request);

        assertThat(response.title()).isEqualTo("Lisbon trip");
        assertThat(response.myRole()).isEqualTo(TripRole.OWNER);
        verify(participantRepository).save(argThat(p ->
                p.getRole() == TripRole.OWNER && p.getUser().getId().equals(currentUserId)));
    }

    @Test
    void getTrip_throwsForbidden_whenUserIsNotAParticipant() {
        UUID tripId = UUID.randomUUID();
        Trip trip = Trip.builder().id(tripId).title("X").destination("Y")
                .startDate(LocalDate.now()).endDate(LocalDate.now()).owner(currentUser).build();
        when(tripRepository.findById(tripId)).thenReturn(Optional.of(trip));
        when(participantRepository.findByTripIdAndUserId(tripId, currentUserId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> tripService.getTrip(tripId))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("not a participant");
    }

    @Test
    void getTrip_throwsNotFound_whenTripDoesNotExist() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.findById(tripId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> tripService.getTrip(tripId))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("not found");
    }

    @Test
    void listMyTrips_returnsTripsForCurrentUser() {
        Trip trip = Trip.builder().id(UUID.randomUUID()).title("Paris").destination("Paris")
                .startDate(LocalDate.now()).endDate(LocalDate.now()).owner(currentUser).build();
        TripParticipant participant = TripParticipant.builder().trip(trip).user(currentUser).role(TripRole.EDITOR).build();
        when(participantRepository.findByUserId(currentUserId)).thenReturn(List.of(participant));

        List<TripResponse> result = tripService.listMyTrips();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).myRole()).isEqualTo(TripRole.EDITOR);
    }
}
