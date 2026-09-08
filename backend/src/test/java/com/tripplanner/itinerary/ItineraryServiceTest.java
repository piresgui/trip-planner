package com.tripplanner.itinerary;

import com.tripplanner.common.ApiException;
import com.tripplanner.itinerary.dto.ActivityRequest;
import com.tripplanner.itinerary.dto.ActivityResponse;
import com.tripplanner.itinerary.dto.ItineraryDayRequest;
import com.tripplanner.itinerary.dto.ItineraryDayResponse;
import com.tripplanner.trip.Trip;
import com.tripplanner.trip.TripRepository;
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
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ItineraryServiceTest {

    @Mock
    private ItineraryDayRepository dayRepository;
    @Mock
    private ActivityRepository activityRepository;
    @Mock
    private TripRepository tripRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ItineraryService itineraryService;

    private UUID tripId;
    private User user;

    @BeforeEach
    void setUp() {
        tripId = UUID.randomUUID();
        user = User.builder().id(UUID.randomUUID()).name("Ana").email("ana@example.com").build();

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(user.getId(), null, List.of()));
        SecurityContextHolder.setContext(context);
    }

    @Test
    void addDay_assignsNextDayIndex() {
        Trip trip = Trip.builder().id(tripId).owner(user).build();
        when(tripRepository.findById(tripId)).thenReturn(Optional.of(trip));
        when(dayRepository.countByTripId(tripId)).thenReturn(2L);
        when(dayRepository.save(any(ItineraryDay.class))).thenAnswer(inv -> {
            ItineraryDay d = inv.getArgument(0);
            d.setId(UUID.randomUUID());
            return d;
        });

        ItineraryDayResponse response = itineraryService.addDay(tripId, new ItineraryDayRequest(LocalDate.now()));

        assertThat(response.dayIndex()).isEqualTo(2);
    }

    @Test
    void addDay_throwsNotFound_whenTripMissing() {
        when(tripRepository.findById(tripId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> itineraryService.addDay(tripId, new ItineraryDayRequest(LocalDate.now())))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Trip not found");
    }

    @Test
    void addActivity_savesActivityLinkedToDayAndCreator() {
        UUID dayId = UUID.randomUUID();
        ItineraryDay day = ItineraryDay.builder().id(dayId).build();
        when(dayRepository.findByIdAndTripId(dayId, tripId)).thenReturn(Optional.of(day));
        when(userRepository.getReferenceById(user.getId())).thenReturn(user);
        when(activityRepository.save(any(Activity.class))).thenAnswer(inv -> {
            Activity a = inv.getArgument(0);
            a.setId(UUID.randomUUID());
            return a;
        });

        ActivityRequest request = new ActivityRequest(LocalTime.of(9, 0), "Museum", "Visit museum", new BigDecimal("15.00"));
        ActivityResponse response = itineraryService.addActivity(tripId, dayId, request);

        assertThat(response.location()).isEqualTo("Museum");
        assertThat(response.createdById()).isEqualTo(user.getId());
    }

    @Test
    void deleteActivity_throwsNotFound_whenActivityMissing() {
        UUID dayId = UUID.randomUUID();
        UUID activityId = UUID.randomUUID();
        when(dayRepository.findByIdAndTripId(dayId, tripId)).thenReturn(Optional.of(ItineraryDay.builder().id(dayId).build()));
        when(activityRepository.findByIdAndItineraryDayId(activityId, dayId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> itineraryService.deleteActivity(tripId, dayId, activityId))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Activity not found");
    }
}
