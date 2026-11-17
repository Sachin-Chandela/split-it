import { Router } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth, requireGroupMember } from "../middleware/auth.js";

// mounted at /api/groups/:groupId
const router = Router({ mergeParams: true });
router.use(requireAuth, requireGroupMember);

/**
 * Record a settlement (someone paying someone back).
 * Body: { toUserId, amountCents, fromUserId? (defaults to current user) }
 */
router.post("/settlements", async (req, res) => {
  try {
    const { groupId } = req.params;
    const { toUserId, amountCents, fromUserId = req.user.id } = req.body;

    if (!toUserId) return res.status(400).json({ error: "toUserId is required" });
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      return res.status(400).json({ error: "amountCents must be a positive integer" });
    }
    if (toUserId === fromUserId) {
      return res.status(400).json({ error: "Cannot settle with yourself" });
    }

    const members = await prisma.groupMember.findMany({
      where: { groupId, userId: { in: [toUserId, fromUserId] } },
    });
    if (members.length !== 2) {
      return res.status(400).json({ error: "Both users must be group members" });
    }

    const settlement = await prisma.settlement.create({
      data: { groupId, fromUserId, toUserId, amountCents },
    });
    res.status(201).json({ settlement });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not record settlement" });
  }
});

export default router;
