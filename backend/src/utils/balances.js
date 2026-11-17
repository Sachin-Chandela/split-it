import prisma from "../lib/prisma.js";

/**
 * Compute each member's net balance in a group (in cents).
 * Positive  => the group owes them money.
 * Negative  => they owe the group money.
 */
export async function computeNetBalances(groupId) {
  const [members, expenses, settlements] = await Promise.all([
    prisma.groupMember.findMany({
      where: { groupId },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.expense.findMany({ where: { groupId }, include: { splits: true } }),
    prisma.settlement.findMany({ where: { groupId } }),
  ]);

  const net = {};
  const users = {};
  for (const m of members) {
    net[m.userId] = 0;
    users[m.userId] = m.user;
  }

  for (const e of expenses) {
    net[e.paidById] = (net[e.paidById] ?? 0) + e.amountCents;
    for (const s of e.splits) {
      net[s.userId] = (net[s.userId] ?? 0) - s.amountCents;
    }
  }

  // A settlement from A to B means A paid B back: A's balance goes up, B's goes down.
  for (const s of settlements) {
    net[s.fromUserId] = (net[s.fromUserId] ?? 0) + s.amountCents;
    net[s.toUserId] = (net[s.toUserId] ?? 0) - s.amountCents;
  }

  return { net, users };
}

/**
 * Turn net balances into a minimal-ish list of "X owes Y" payments
 * using a greedy match of the biggest debtor with the biggest creditor.
 */
export function simplifyDebts(net) {
  const creditors = [];
  const debtors = [];

  for (const [userId, amount] of Object.entries(net)) {
    if (amount > 0) creditors.push({ userId, amount });
    else if (amount < 0) debtors.push({ userId, amount: -amount });
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const payments = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    payments.push({
      fromUserId: debtors[i].userId,
      toUserId: creditors[j].userId,
      amountCents: pay,
    });
    debtors[i].amount -= pay;
    creditors[j].amount -= pay;
    if (debtors[i].amount === 0) i++;
    if (creditors[j].amount === 0) j++;
  }
  return payments;
}

/**
 * Split a total (cents) equally among userIds. Leftover cents go to the
 * first few users so the splits always add up exactly.
 */
export function splitEqually(totalCents, userIds) {
  const base = Math.floor(totalCents / userIds.length);
  let remainder = totalCents - base * userIds.length;
  return userIds.map((userId) => {
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder--;
    return { userId, amountCents: base + extra };
  });
}
