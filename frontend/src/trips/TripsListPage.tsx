import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createTrip, deleteTrip, listTrips, TripInput } from "./api";
import { Trip } from "./types";
import TripForm from "./TripForm";
import { useAuth } from "../auth/AuthContext";

export default function TripsListPage() {
  const { user, logout } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      setTrips(await listTrips());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(input: TripInput) {
    await createTrip(input);
    setShowForm(false);
    await refresh();
  }

  async function handleDelete(tripId: string) {
    if (!confirm("Delete this trip?")) return;
    await deleteTrip(tripId);
    await refresh();
  }

  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Your trips</h1>
        <div>
          <span style={{ marginRight: 12 }}>{user?.name}</span>
          <button onClick={logout}>Log out</button>
        </div>
      </header>

      {loading && <p>Loading...</p>}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {trips.map((trip) => (
          <li key={trip.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 8 }}>
            <Link to={`/trips/${trip.id}`} style={{ fontWeight: 600 }}>
              {trip.title}
            </Link>
            <div>
              {trip.destination} &middot; {trip.startDate} to {trip.endDate} &middot; role: {trip.myRole}
            </div>
            {trip.myRole === "OWNER" && (
              <button onClick={() => handleDelete(trip.id)} style={{ marginTop: 4 }}>
                Delete
              </button>
            )}
          </li>
        ))}
      </ul>

      {showForm ? (
        <TripForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      ) : (
        <button onClick={() => setShowForm(true)}>New trip</button>
      )}
    </div>
  );
}
