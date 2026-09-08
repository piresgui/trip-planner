package com.tripplanner.itinerary;

import com.tripplanner.trip.Trip;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "itinerary_days", uniqueConstraints = @UniqueConstraint(columnNames = {"trip_id", "day_index"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItineraryDay {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    @Column(nullable = false)
    private LocalDate date;

    // 0-based position within the trip, kept independent from the calendar
    // date so the UI can render "Day 1, Day 2, ..." even if dates are edited.
    @Column(name = "day_index", nullable = false)
    private int dayIndex;
}
