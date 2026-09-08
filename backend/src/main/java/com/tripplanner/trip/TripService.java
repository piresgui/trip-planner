package com.tripplanner.trip;

import com.tripplanner.common.ApiException;
import com.tripplanner.common.CurrentUser;
import com.tripplanner.trip.dto.ParticipantResponse;
import com.tripplanner.trip.dto.TripRequest;
import com.tripplanner.trip.dto.TripResponse;
import com.tripplanner.user.User;
import com.tripplanner.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class TripService {

    private final TripRepository tripRepository;
    private final TripParticipantRepository participantRepository;
    private final UserRepository userRepository;

    public TripService(TripRepository tripRepository,
                        TripParticipantRepository participantRepository,
                        UserRepository userRepository) {
        this.tripRepository = tripRepository;
        this.participantRepository = participantRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public TripResponse createTrip(TripRequest request) {
        UUID userId = CurrentUser.id();
        User owner = userRepository.getReferenceById(userId);

        Trip trip = Trip.builder()
                .title(request.title())
                .destination(request.destination())
                .startDate(request.startDate())
                .endDate(request.endDate())
                .owner(owner)
                .build();
        trip = tripRepository.save(trip);

        // The creator is automatically added as OWNER participant, so trip
        // membership/roles have a single source of truth (TripParticipant)
        // instead of special-casing "trip.owner == user" everywhere.
        TripParticipant ownerParticipant = TripParticipant.builder()
                .trip(trip)
                .user(owner)
                .role(TripRole.OWNER)
                .build();
        participantRepository.save(ownerParticipant);

        return TripResponse.from(trip, TripRole.OWNER);
    }

    @Transactional(readOnly = true)
    public List<TripResponse> listMyTrips() {
        UUID userId = CurrentUser.id();
        return participantRepository.findByUserId(userId).stream()
                .map(p -> TripResponse.from(p.getTrip(), p.getRole()))
                .toList();
    }

    @Transactional(readOnly = true)
    public TripResponse getTrip(UUID tripId) {
        Trip trip = findTripOrThrow(tripId);
        TripRole role = requireParticipant(tripId).getRole();
        return TripResponse.from(trip, role);
    }

    @Transactional
    public TripResponse updateTrip(UUID tripId, TripRequest request) {
        Trip trip = findTripOrThrow(tripId);
        TripRole role = requireParticipant(tripId).getRole();

        trip.setTitle(request.title());
        trip.setDestination(request.destination());
        trip.setStartDate(request.startDate());
        trip.setEndDate(request.endDate());
        trip = tripRepository.save(trip);

        return TripResponse.from(trip, role);
    }

    @Transactional
    public void deleteTrip(UUID tripId) {
        Trip trip = findTripOrThrow(tripId);
        tripRepository.delete(trip);
    }

    @Transactional(readOnly = true)
    public List<ParticipantResponse> listParticipants(UUID tripId) {
        findTripOrThrow(tripId);
        return participantRepository.findByTripId(tripId).stream()
                .map(ParticipantResponse::from)
                .toList();
    }

    private Trip findTripOrThrow(UUID tripId) {
        return tripRepository.findById(tripId)
                .orElseThrow(() -> ApiException.notFound("Trip not found"));
    }

    private TripParticipant requireParticipant(UUID tripId) {
        return participantRepository.findByTripIdAndUserId(tripId, CurrentUser.id())
                .orElseThrow(() -> ApiException.forbidden("You are not a participant of this trip"));
    }
}
