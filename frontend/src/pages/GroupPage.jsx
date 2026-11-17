import { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { formatMoney, formatDate } from "../utils.js";
import AddExpenseForm from "../components/AddExpenseForm.jsx";
import BalancesPanel from "../components/BalancesPanel.jsx";

export default function GroupPage() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [balances, setBalances] = useState({ balances: [], debts: [] });
  const [error, setError] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberMsg, setMemberMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const [g, b] = await Promise.all([api.getGroup(groupId), api.getBalances(groupId)]);
      setGroup(g.group);
      setBalances(b);
    } catch (err) {
      setError(err.message);
    }
  }, [groupId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAddMember(e) {
    e.preventDefault();
    setMemberMsg("");
    try {
      await api.addMember(groupId, memberEmail);
      setMemberEmail("");
      setMemberMsg("Member added!");
      load();
    } catch (err) {
      setMemberMsg(err.message);
    }
  }

  async function handleDelete(expenseId) {
    if (!confirm("Delete this expense?")) return;
    try {
      await api.deleteExpense(groupId, expenseId);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!group) return <p className="muted">Loading...</p>;

  const members = group.members.map((m) => m.user);

  return (
    <div>
      <Link to="/" className="muted">← All groups</Link>
      <h2>{group.name}</h2>

      <div className="two-col">
        <section>
          <h3>Add an expense</h3>
          <AddExpenseForm groupId={groupId} members={members} currentUserId={user.id} onAdded={load} />

          <h3>Expenses</h3>
          {group.expenses.length === 0 ? (
            <p className="muted">No expenses yet.</p>
          ) : (
            <ul className="list">
              {group.expenses.map((e) => (
                <li key={e.id} className="card expense">
                  <div>
                    <strong>{e.description}</strong>
                    <p className="muted">
                      {e.paidBy.id === user.id ? "You" : e.paidBy.name} paid {formatMoney(e.amountCents)} · {formatDate(e.createdAt)}
                    </p>
                  </div>
                  <button className="btn btn-ghost" onClick={() => handleDelete(e.id)}>
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside>
          <h3>Balances</h3>
          <BalancesPanel
            groupId={groupId}
            data={balances}
            currentUserId={user.id}
            onSettled={load}
          />

          <h3>Members</h3>
          <ul className="list">
            {members.map((m) => (
              <li key={m.id}>
                {m.name} <span className="muted">({m.email})</span>
              </li>
            ))}
          </ul>
          <form onSubmit={handleAddMember} className="row">
            <input
              type="email"
              placeholder="Add member by email"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              required
            />
            <button className="btn">Add</button>
          </form>
          {memberMsg && <p className="muted">{memberMsg}</p>}
        </aside>
      </div>
    </div>
  );
}
