package com.tripplanner.trip;

import com.tripplanner.trip.dto.ParticipantResponse;
import com.tripplanner.trip.dto.TripRequest;
import com.tripplanner.trip.dto.TripResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/trips")
public class TripController {

    private final TripService tripService;

    public TripController(TripService tripService) {
        this.tripService = tripService;
    }

    @PostMapping
    public ResponseEntity<TripResponse> createTrip(@Valid @RequestBody TripRequest request) {
        return ResponseEntity.ok(tripService.createTrip(request));
    }

    @GetMapping
    public ResponseEntity<List<TripResponse>> listMyTrips() {
        return ResponseEntity.ok(tripService.listMyTrips());
    }

    @GetMapping("/{tripId}")
    @PreAuthorize("@tripAuthorization.isParticipant(#tripId)")
    public ResponseEntity<TripResponse> getTrip(@PathVariable UUID tripId) {
        return ResponseEntity.ok(tripService.getTrip(tripId));
    }

    @PutMapping("/{tripId}")
    @PreAuthorize("@tripAuthorization.canEdit(#tripId)")
    public ResponseEntity<TripResponse> updateTrip(@PathVariable UUID tripId, @Valid @RequestBody TripRequest request) {
        return ResponseEntity.ok(tripService.updateTrip(tripId, request));
    }

    @DeleteMapping("/{tripId}")
    @PreAuthorize("@tripAuthorization.isOwner(#tripId)")
    public ResponseEntity<Void> deleteTrip(@PathVariable UUID tripId) {
        tripService.deleteTrip(tripId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{tripId}/participants")
    @PreAuthorize("@tripAuthorization.isParticipant(#tripId)")
    public ResponseEntity<List<ParticipantResponse>> listParticipants(@PathVariable UUID tripId) {
        return ResponseEntity.ok(tripService.listParticipants(tripId));
    }
}
