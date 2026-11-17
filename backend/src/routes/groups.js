import { Router } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth, requireGroupMember } from "../middleware/auth.js";
import { computeNetBalances, simplifyDebts } from "../utils/balances.js";

const router = Router();
router.use(requireAuth);

// Create a group (creator is added as the first member)
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Group name is required" });

    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        createdById: req.user.id,
        members: { create: { userId: req.user.id } },
      },
    });
    res.status(201).json({ group });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create group" });
  }
});

// List groups the user belongs to
router.get("/", async (req, res) => {
  try {
    const groups = await prisma.group.findMany({
      where: { members: { some: { userId: req.user.id } } },
      include: { _count: { select: { members: true, expenses: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ groups });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch groups" });
  }
});

// Group details: members, expenses, settlements
router.get("/:groupId", requireGroupMember, async (req, res) => {
  try {
    const group = await prisma.group.findUnique({
      where: { id: req.params.groupId },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        expenses: {
          orderBy: { createdAt: "desc" },
          include: {
            paidBy: { select: { id: true, name: true } },
            splits: { include: { user: { select: { id: true, name: true } } } },
          },
        },
        settlements: {
          orderBy: { createdAt: "desc" },
          include: {
            fromUser: { select: { id: true, name: true } },
            toUser: { select: { id: true, name: true } },
          },
        },
      },
    });
    res.json({ group });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch group" });
  }
});

// Add a member by email (they must already have an account)
router.post("/:groupId/members", requireGroupMember, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "email is required" });

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, name: true, email: true },
    });
    if (!user) return res.status(404).json({ error: "No user found with that email" });

    const existing = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: req.params.groupId, userId: user.id } },
    });
    if (existing) return res.status(409).json({ error: "User is already in this group" });

    await prisma.groupMember.create({
      data: { groupId: req.params.groupId, userId: user.id },
    });
    res.status(201).json({ member: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not add member" });
  }
});

// Balances: net per member + simplified "who owes whom"
router.get("/:groupId/balances", requireGroupMember, async (req, res) => {
  try {
    const { net, users } = await computeNetBalances(req.params.groupId);

    const balances = Object.entries(net).map(([userId, netCents]) => ({
      user: users[userId],
      netCents,
    }));

    const debts = simplifyDebts(net).map((d) => ({
      from: users[d.fromUserId],
      to: users[d.toUserId],
      amountCents: d.amountCents,
    }));

    res.json({ balances, debts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not compute balances" });
  }
});

export default router;
