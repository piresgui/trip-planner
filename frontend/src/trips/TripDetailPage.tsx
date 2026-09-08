import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getTrip, listParticipants, updateTrip, TripInput } from "./api";
import { Participant, Trip } from "./types";
import TripForm from "./TripForm";

export default function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [editing, setEditing] = useState(false);

  async function refresh() {
    if (!tripId) return;
    const [tripData, participantsData] = await Promise.all([getTrip(tripId), listParticipants(tripId)]);
    setTrip(tripData);
    setParticipants(participantsData);
  }

  useEffect(() => {
    refresh();
  }, [tripId]);

  async function handleUpdate(input: TripInput) {
    if (!tripId) return;
    await updateTrip(tripId, input);
    setEditing(false);
    await refresh();
  }

  if (!trip) return <p>Loading...</p>;

  const canEdit = trip.myRole === "OWNER" || trip.myRole === "EDITOR";

  return (
    <div>
      <Link to="/trips">&larr; Back to trips</Link>
      <h1>{trip.title}</h1>
      {editing ? (
        <TripForm initial={trip} onSubmit={handleUpdate} onCancel={() => setEditing(false)} />
      ) : (
        <>
          <p>
            {trip.destination} &middot; {trip.startDate} to {trip.endDate}
          </p>
          {canEdit && <button onClick={() => setEditing(true)}>Edit trip</button>}
        </>
      )}

      <h2>Participants</h2>
      <ul>
        {participants.map((p) => (
          <li key={p.userId}>
            {p.name} ({p.email}) &mdash; {p.role}
          </li>
        ))}
      </ul>

      <button onClick={() => navigate(`/trips/${tripId}/itinerary`)}>View itinerary</button>
    </div>
  );
}
