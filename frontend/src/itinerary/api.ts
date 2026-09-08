import { apiFetch } from "../api/client";
import { ItineraryDay, Activity } from "./types";

export interface ActivityInput {
  time: string;
  location: string;
  description: string;
  estimatedCost: number | null;
}

export function listDays(tripId: string): Promise<ItineraryDay[]> {
  return apiFetch<ItineraryDay[]>(`/api/trips/${tripId}/itinerary/days`);
}

export function addDay(tripId: string, date: string): Promise<ItineraryDay> {
  return apiFetch<ItineraryDay>(`/api/trips/${tripId}/itinerary/days`, {
    method: "POST",
    body: JSON.stringify({ date }),
  });
}

export function addActivity(tripId: string, dayId: string, input: ActivityInput): Promise<Activity> {
  return apiFetch<Activity>(`/api/trips/${tripId}/itinerary/days/${dayId}/activities`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateActivity(
  tripId: string,
  dayId: string,
  activityId: string,
  input: ActivityInput
): Promise<Activity> {
  return apiFetch<Activity>(`/api/trips/${tripId}/itinerary/days/${dayId}/activities/${activityId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteActivity(tripId: string, dayId: string, activityId: string): Promise<void> {
  return apiFetch<void>(`/api/trips/${tripId}/itinerary/days/${dayId}/activities/${activityId}`, {
    method: "DELETE",
  });
}
