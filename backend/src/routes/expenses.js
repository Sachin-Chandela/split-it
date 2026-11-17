import { Router } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth, requireGroupMember } from "../middleware/auth.js";
import { splitEqually } from "../utils/balances.js";

// mounted at /api/groups/:groupId
const router = Router({ mergeParams: true });
router.use(requireAuth, requireGroupMember);

/**
 * Add an expense.
 * Body:
 *  {
 *    description: "Dinner",
 *    amountCents: 3000,
 *    paidById: "<userId>",            // optional, defaults to current user
 *    splitType: "equal" | "exact",    // default "equal"
 *    participantIds: ["id1","id2"],   // for equal split (default: all members)
 *    splits: [{ userId, amountCents }] // for exact split
 *  }
 */
router.post("/expenses", async (req, res) => {
  try {
    const { groupId } = req.params;
    const {
      description,
      amountCents,
      paidById = req.user.id,
      splitType = "equal",
      participantIds,
      splits,
    } = req.body;

    if (!description?.trim()) return res.status(400).json({ error: "Description is required" });
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      return res.status(400).json({ error: "amountCents must be a positive integer" });
    }

    const members = await prisma.groupMember.findMany({ where: { groupId } });
    const memberIds = new Set(members.map((m) => m.userId));
    if (!memberIds.has(paidById)) {
      return res.status(400).json({ error: "Payer must be a group member" });
    }

    let finalSplits;
    if (splitType === "exact") {
      if (!Array.isArray(splits) || splits.length === 0) {
        return res.status(400).json({ error: "splits are required for exact split" });
      }
      const total = splits.reduce((sum, s) => sum + s.amountCents, 0);
      if (total !== amountCents) {
        return res.status(400).json({ error: "Split amounts must add up to the total" });
      }
      finalSplits = splits;
    } else {
      const ids = participantIds?.length ? participantIds : [...memberIds];
      finalSplits = splitEqually(amountCents, ids);
    }

    if (finalSplits.some((s) => !memberIds.has(s.userId))) {
      return res.status(400).json({ error: "All split users must be group members" });
    }

    const expense = await prisma.expense.create({
      data: {
        groupId,
        paidById,
        description: description.trim(),
        amountCents,
        splits: { create: finalSplits },
      },
      include: { splits: true },
    });

    res.status(201).json({ expense });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not add expense" });
  }
});

router.delete("/expenses/:expenseId", async (req, res) => {
  try {
    const { groupId, expenseId } = req.params;
    const expense = await prisma.expense.findFirst({ where: { id: expenseId, groupId } });
    if (!expense) return res.status(404).json({ error: "Expense not found" });

    await prisma.expense.delete({ where: { id: expenseId } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not delete expense" });
  }
});

export default router;
