import { useState } from "react";
import { api } from "../api.js";
import { toCents } from "../utils.js";

export default function AddExpenseForm({ groupId, members, currentUserId, onAdded }) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidById, setPaidById] = useState(currentUserId);
  const [participants, setParticipants] = useState(() => members.map((m) => m.id));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function toggleParticipant(id) {
    setParticipants((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const amountCents = toCents(amount);
    if (!amountCents) return setError("Enter a valid amount");
    if (participants.length === 0) return setError("Select at least one person to split with");

    setBusy(true);
    try {
      await api.addExpense(groupId, {
        description,
        amountCents,
        paidById,
        splitType: "equal",
        participantIds: participants,
      });
      setDescription("");
      setAmount("");
      onAdded();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form card">
      <label>
        Description
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Dinner" required />
      </label>
      <label>
        Amount (₹)
        <input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </label>
      <label>
        Paid by
        <select value={paidById} onChange={(e) => setPaidById(e.target.value)}>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.id === currentUserId ? "You" : m.name}
            </option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend>Split equally between</legend>
        {members.map((m) => (
          <label key={m.id} className="check">
            <input
              type="checkbox"
              checked={participants.includes(m.id)}
              onChange={() => toggleParticipant(m.id)}
            />
            {m.id === currentUserId ? "You" : m.name}
          </label>
        ))}
      </fieldset>
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={busy}>
        {busy ? "Adding..." : "Add expense"}
      </button>
    </form>
  );
}
