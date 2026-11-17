const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export function getToken() {
  return localStorage.getItem("token");
}

export function setToken(token) {
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}

async function request(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

export const api = {
  register: (body) => request("/auth/register", { method: "POST", body }),
  login: (body) => request("/auth/login", { method: "POST", body }),
  me: () => request("/auth/me"),

  getGroups: () => request("/groups"),
  createGroup: (name) => request("/groups", { method: "POST", body: { name } }),
  getGroup: (id) => request(`/groups/${id}`),
  addMember: (id, email) =>
    request(`/groups/${id}/members`, { method: "POST", body: { email } }),
  getBalances: (id) => request(`/groups/${id}/balances`),

  addExpense: (id, body) =>
    request(`/groups/${id}/expenses`, { method: "POST", body }),
  deleteExpense: (id, expenseId) =>
    request(`/groups/${id}/expenses/${expenseId}`, { method: "DELETE" }),

  addSettlement: (id, body) =>
    request(`/groups/${id}/settlements`, { method: "POST", body }),
};
