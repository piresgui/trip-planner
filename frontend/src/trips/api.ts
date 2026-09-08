import { apiFetch } from "../api/client";
import { Participant, Trip } from "./types";

export interface TripInput {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
}

export function listTrips(): Promise<Trip[]> {
  return apiFetch<Trip[]>("/api/trips");
}

export function getTrip(tripId: string): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}`);
}

export function createTrip(input: TripInput): Promise<Trip> {
  return apiFetch<Trip>("/api/trips", { method: "POST", body: JSON.stringify(input) });
}

export function updateTrip(tripId: string, input: TripInput): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}`, { method: "PUT", body: JSON.stringify(input) });
}

export function deleteTrip(tripId: string): Promise<void> {
  return apiFetch<void>(`/api/trips/${tripId}`, { method: "DELETE" });
}

export function listParticipants(tripId: string): Promise<Participant[]> {
  return apiFetch<Participant[]>(`/api/trips/${tripId}/participants`);
}
