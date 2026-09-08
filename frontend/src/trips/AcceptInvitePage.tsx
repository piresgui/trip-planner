import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch, ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);

  async function respond(action: "accept" | "decline") {
    if (!token) return;
    try {
      await apiFetch(`/api/invites/${token}/${action}`, { method: "POST" });
      setMessage(action === "accept" ? "Invite accepted! Redirecting..." : "Invite declined.");
      if (action === "accept") {
        setTimeout(() => navigate("/trips"), 1200);
      }
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  if (!user) {
    return <p>Please log in with the invited email address to respond to this invite.</p>;
  }

  return (
    <div>
      <h1>Trip invitation</h1>
      {message ? (
        <p>{message}</p>
      ) : (
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => respond("accept")}>Accept</button>
          <button onClick={() => respond("decline")}>Decline</button>
        </div>
      )}
    </div>
  );
}
