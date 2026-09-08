package com.tripplanner.trip;

import com.tripplanner.trip.dto.InviteRequest;
import com.tripplanner.trip.dto.InviteResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
public class TripInviteController {

    private final TripInviteService inviteService;

    public TripInviteController(TripInviteService inviteService) {
        this.inviteService = inviteService;
    }

    @PostMapping("/api/trips/{tripId}/invites")
    @PreAuthorize("@tripAuthorization.canEdit(#tripId)")
    public ResponseEntity<InviteResponse> createInvite(@PathVariable UUID tripId, @Valid @RequestBody InviteRequest request) {
        return ResponseEntity.ok(inviteService.createInvite(tripId, request));
    }

    @GetMapping("/api/trips/{tripId}/invites")
    @PreAuthorize("@tripAuthorization.isParticipant(#tripId)")
    public ResponseEntity<List<InviteResponse>> listInvites(@PathVariable UUID tripId) {
        return ResponseEntity.ok(inviteService.listInvites(tripId));
    }

    // Accept/decline are not scoped under /api/trips/{tripId} because the
    // invitee is not yet a participant of the trip at this point -- the
    // token itself is the authorization to act on this specific invite.
    @PostMapping("/api/invites/{token}/accept")
    public ResponseEntity<InviteResponse> accept(@PathVariable String token) {
        return ResponseEntity.ok(inviteService.acceptInvite(token));
    }

    @PostMapping("/api/invites/{token}/decline")
    public ResponseEntity<InviteResponse> decline(@PathVariable String token) {
        return ResponseEntity.ok(inviteService.declineInvite(token));
    }
}
