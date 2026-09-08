package com.tripplanner.itinerary;

import com.tripplanner.common.ApiException;
import com.tripplanner.common.CurrentUser;
import com.tripplanner.itinerary.dto.ActivityRequest;
import com.tripplanner.itinerary.dto.ActivityResponse;
import com.tripplanner.itinerary.dto.ItineraryDayRequest;
import com.tripplanner.itinerary.dto.ItineraryDayResponse;
import com.tripplanner.trip.Trip;
import com.tripplanner.trip.TripRepository;
import com.tripplanner.user.User;
import com.tripplanner.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ItineraryService {

    private final ItineraryDayRepository dayRepository;
    private final ActivityRepository activityRepository;
    private final TripRepository tripRepository;
    private final UserRepository userRepository;
    private final ItineraryBroadcaster broadcaster;

    public ItineraryService(ItineraryDayRepository dayRepository,
                             ActivityRepository activityRepository,
                             TripRepository tripRepository,
                             UserRepository userRepository,
                             ItineraryBroadcaster broadcaster) {
        this.dayRepository = dayRepository;
        this.activityRepository = activityRepository;
        this.tripRepository = tripRepository;
        this.userRepository = userRepository;
        this.broadcaster = broadcaster;
    }

    @Transactional(readOnly = true)
    public List<ItineraryDayResponse> listDays(UUID tripId) {
        return dayRepository.findByTripIdOrderByDayIndexAsc(tripId).stream()
                .map(day -> ItineraryDayResponse.from(day, listActivities(day.getId())))
                .toList();
    }

    @Transactional
    public ItineraryDayResponse addDay(UUID tripId, ItineraryDayRequest request) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> ApiException.notFound("Trip not found"));
        int nextIndex = (int) dayRepository.countByTripId(tripId);
        ItineraryDay day = ItineraryDay.builder()
                .trip(trip)
                .date(request.date())
                .dayIndex(nextIndex)
                .build();
        day = dayRepository.save(day);
        return ItineraryDayResponse.from(day, List.of());
    }

    @Transactional
    public ActivityResponse addActivity(UUID tripId, UUID dayId, ActivityRequest request) {
        ItineraryDay day = findDayOrThrow(tripId, dayId);
        User creator = userRepository.getReferenceById(CurrentUser.id());
        Activity activity = Activity.builder()
                .itineraryDay(day)
                .time(request.time())
                .location(request.location())
                .description(request.description())
                .estimatedCost(request.estimatedCost())
                .createdBy(creator)
                .build();
        activity = activityRepository.save(activity);
        ActivityResponse response = ActivityResponse.from(activity);
        broadcaster.activityCreated(tripId, response);
        return response;
    }

    @Transactional
    public ActivityResponse updateActivity(UUID tripId, UUID dayId, UUID activityId, ActivityRequest request) {
        findDayOrThrow(tripId, dayId);
        Activity activity = activityRepository.findByIdAndItineraryDayId(activityId, dayId)
                .orElseThrow(() -> ApiException.notFound("Activity not found"));
        activity.setTime(request.time());
        activity.setLocation(request.location());
        activity.setDescription(request.description());
        activity.setEstimatedCost(request.estimatedCost());
        activity = activityRepository.save(activity);
        ActivityResponse response = ActivityResponse.from(activity);
        broadcaster.activityUpdated(tripId, response);
        return response;
    }

    @Transactional
    public void deleteActivity(UUID tripId, UUID dayId, UUID activityId) {
        findDayOrThrow(tripId, dayId);
        Activity activity = activityRepository.findByIdAndItineraryDayId(activityId, dayId)
                .orElseThrow(() -> ApiException.notFound("Activity not found"));
        activityRepository.delete(activity);
        broadcaster.activityDeleted(tripId, dayId, activityId);
    }

    private List<ActivityResponse> listActivities(UUID dayId) {
        return activityRepository.findByItineraryDayIdOrderByTimeAsc(dayId).stream()
                .map(ActivityResponse::from)
                .toList();
    }

    private ItineraryDay findDayOrThrow(UUID tripId, UUID dayId) {
        return dayRepository.findByIdAndTripId(dayId, tripId)
                .orElseThrow(() -> ApiException.notFound("Itinerary day not found"));
    }
}
