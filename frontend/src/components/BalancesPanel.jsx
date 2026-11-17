import { useState } from "react";
import { api } from "../api.js";
import { formatMoney } from "../utils.js";

export default function BalancesPanel({ groupId, data, currentUserId, onSettled }) {
  const [error, setError] = useState("");
  const { balances, debts } = data;

  async function settle(debt) {
    setError("");
    try {
      await api.addSettlement(groupId, {
        fromUserId: debt.from.id,
        toUserId: debt.to.id,
        amountCents: debt.amountCents,
      });
      onSettled();
    } catch (err) {
      setError(err.message);
    }
  }

  const name = (u) => (u.id === currentUserId ? "You" : u.name);

  return (
    <div className="card">
      <h4>Who owes whom</h4>
      {debts.length === 0 ? (
        <p className="muted">Everyone is settled up 🎉</p>
      ) : (
        <ul className="list">
          {debts.map((d, i) => (
            <li key={i} className="debt">
              <span>
                {name(d.from)} {d.from.id === currentUserId ? "owe" : "owes"}{" "}
                {name(d.to)} <strong>{formatMoney(d.amountCents)}</strong>
              </span>
              {(d.from.id === currentUserId || d.to.id === currentUserId) && (
                <button className="btn btn-small" onClick={() => settle(d)}>
                  Settle
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="error">{error}</p>}

      <h4>Net balances</h4>
      <ul className="list">
        {balances.map((b) => (
          <li key={b.user.id} className="debt">
            <span>{name(b.user)}</span>
            <span className={b.netCents >= 0 ? "pos" : "neg"}>
              {b.netCents >= 0 ? "gets back " : "owes "}
              {formatMoney(b.netCents)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
