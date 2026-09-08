package com.tripplanner.itinerary;

import com.tripplanner.itinerary.dto.ActivityRequest;
import com.tripplanner.itinerary.dto.ActivityResponse;
import com.tripplanner.itinerary.dto.ItineraryDayRequest;
import com.tripplanner.itinerary.dto.ItineraryDayResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/trips/{tripId}/itinerary")
@PreAuthorize("@tripAuthorization.isParticipant(#tripId)")
public class ItineraryController {

    private final ItineraryService itineraryService;

    public ItineraryController(ItineraryService itineraryService) {
        this.itineraryService = itineraryService;
    }

    @GetMapping("/days")
    public ResponseEntity<List<ItineraryDayResponse>> listDays(@PathVariable UUID tripId) {
        return ResponseEntity.ok(itineraryService.listDays(tripId));
    }

    @PostMapping("/days")
    @PreAuthorize("@tripAuthorization.canEdit(#tripId)")
    public ResponseEntity<ItineraryDayResponse> addDay(@PathVariable UUID tripId,
                                                        @Valid @RequestBody ItineraryDayRequest request) {
        return ResponseEntity.ok(itineraryService.addDay(tripId, request));
    }

    @PostMapping("/days/{dayId}/activities")
    @PreAuthorize("@tripAuthorization.canEdit(#tripId)")
    public ResponseEntity<ActivityResponse> addActivity(@PathVariable UUID tripId,
                                                         @PathVariable UUID dayId,
                                                         @Valid @RequestBody ActivityRequest request) {
        return ResponseEntity.ok(itineraryService.addActivity(tripId, dayId, request));
    }

    @PutMapping("/days/{dayId}/activities/{activityId}")
    @PreAuthorize("@tripAuthorization.canEdit(#tripId)")
    public ResponseEntity<ActivityResponse> updateActivity(@PathVariable UUID tripId,
                                                            @PathVariable UUID dayId,
                                                            @PathVariable UUID activityId,
                                                            @Valid @RequestBody ActivityRequest request) {
        return ResponseEntity.ok(itineraryService.updateActivity(tripId, dayId, activityId, request));
    }

    @DeleteMapping("/days/{dayId}/activities/{activityId}")
    @PreAuthorize("@tripAuthorization.canEdit(#tripId)")
    public ResponseEntity<Void> deleteActivity(@PathVariable UUID tripId,
                                                @PathVariable UUID dayId,
                                                @PathVariable UUID activityId) {
        itineraryService.deleteActivity(tripId, dayId, activityId);
        return ResponseEntity.noContent().build();
    }
}
