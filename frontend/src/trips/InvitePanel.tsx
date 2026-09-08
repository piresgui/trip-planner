import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "../api/client";

interface Invite {
  id: string;
  tripId: string;
  invitedEmail: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  token: string;
}

export default function InvitePanel({ tripId }: { tripId: string }) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    setInvites(await apiFetch<Invite[]>(`/api/trips/${tripId}/invites`));
  }

  useEffect(() => {
    refresh();
  }, [tripId]);

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch(`/api/trips/${tripId}/invites`, {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setEmail("");
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h2>Invite a collaborator</h2>
      <form onSubmit={handleInvite} style={{ display: "flex", gap: 8 }}>
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" disabled={submitting}>
          Invite
        </button>
      </form>
      <ul>
        {invites.map((invite) => (
          <li key={invite.id}>
            {invite.invitedEmail} &mdash; {invite.status}
          </li>
        ))}
      </ul>
    </div>
  );
}
