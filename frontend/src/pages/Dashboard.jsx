import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export default function Dashboard() {
  const [groups, setGroups] = useState([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadGroups() {
    try {
      const data = await api.getGroups();
      setGroups(data.groups);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGroups();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    try {
      await api.createGroup(name);
      setName("");
      loadGroups();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2>Your groups</h2>

      <form onSubmit={handleCreate} className="row card">
        <input
          placeholder="New group name (e.g. Goa Trip)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <button className="btn">Create group</button>
      </form>
      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="muted">Loading...</p>
      ) : groups.length === 0 ? (
        <p className="muted">No groups yet. Create one above to get started.</p>
      ) : (
        <div className="grid">
          {groups.map((g) => (
            <Link key={g.id} to={`/groups/${g.id}`} className="card group-card">
              <h3>{g.name}</h3>
              <p className="muted">
                {g._count.members} members · {g._count.expenses} expenses
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
