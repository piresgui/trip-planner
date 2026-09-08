import { useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import { getToken, API_BASE_URL } from "./client";

export interface ItineraryEvent {
  type: "ACTIVITY_CREATED" | "ACTIVITY_UPDATED" | "ACTIVITY_DELETED";
  payload: unknown;
}

/**
 * Subscribes to /topic/trips/{tripId}/itinerary for the lifetime of the
 * component and invokes onEvent for every message. One client per hook
 * instance keeps this self-contained -- callers don't need to manage
 * connection lifecycle themselves.
 */
export function useTripSocket(tripId: string | undefined, onEvent: (event: ItineraryEvent) => void) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!tripId) return;

    const wsUrl = API_BASE_URL.replace(/^http/, "ws") + "/ws";
    const client = new Client({
      brokerURL: undefined,
      webSocketFactory: () => new WebSocket(wsUrl),
      connectHeaders: {
        Authorization: `Bearer ${getToken() ?? ""}`,
      },
      reconnectDelay: 3000,
    });

    client.onConnect = () => {
      client.subscribe(`/topic/trips/${tripId}/itinerary`, (message) => {
        try {
          onEventRef.current(JSON.parse(message.body));
        } catch {
          // ignore malformed frames
        }
      });
    };

    client.activate();

    return () => {
      client.deactivate();
    };
  }, [tripId]);
}
