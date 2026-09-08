import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { addActivity, addDay, deleteActivity, listDays } from "./api";
import { ItineraryDay } from "./types";

export default function ItineraryPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [newDate, setNewDate] = useState("");

  async function refresh() {
    if (!tripId) return;
    setDays(await listDays(tripId));
  }

  useEffect(() => {
    refresh();
  }, [tripId]);

  async function handleAddDay(e: FormEvent) {
    e.preventDefault();
    if (!tripId || !newDate) return;
    await addDay(tripId, newDate);
    setNewDate("");
    await refresh();
  }

  return (
    <div>
      <Link to={`/trips/${tripId}`}>&larr; Back to trip</Link>
      <h1>Itinerary</h1>

      {days.map((day, idx) => (
        <DayCard key={day.id} tripId={tripId!} day={day} dayNumber={idx + 1} onChange={refresh} />
      ))}

      <form onSubmit={handleAddDay} style={{ marginTop: 16 }}>
        <label>
          Add day (date):
          <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} required />
        </label>
        <button type="submit">Add day</button>
      </form>
    </div>
  );
}

function DayCard({
  tripId,
  day,
  dayNumber,
  onChange,
}: {
  tripId: string;
  day: ItineraryDay;
  dayNumber: number;
  onChange: () => void;
}) {
  const [time, setTime] = useState("09:00");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    await addActivity(tripId, day.id, {
      time,
      location,
      description,
      estimatedCost: cost ? Number(cost) : null,
    });
    setLocation("");
    setDescription("");
    setCost("");
    onChange();
  }

  async function handleDelete(activityId: string) {
    await deleteActivity(tripId, day.id, activityId);
    onChange();
  }

  return (
    <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 12 }}>
      <h2>
        Day {dayNumber} &mdash; {day.date}
      </h2>
      <ul>
        {day.activities.map((activity) => (
          <li key={activity.id}>
            {activity.time} &middot; {activity.location} &mdash; {activity.description}
            {activity.estimatedCost != null && ` (est. $${activity.estimatedCost})`}
            <button onClick={() => handleDelete(activity.id)} style={{ marginLeft: 8 }}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={handleAdd} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        <input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} required />
        <input
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <input
          placeholder="Est. cost"
          type="number"
          step="0.01"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
        />
        <button type="submit">Add activity</button>
      </form>
    </section>
  );
}
