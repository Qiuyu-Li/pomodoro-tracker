import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth'
import { ensureShareCodeForUser } from '../utils/shareCodes'
import { prisma } from '../db'
import { buildFocusSnapshotForUser, type UserFocusSnapshot } from '../utils/stats'

const friendsRouter = Router()
const shareCodeSchema = z.object({
  shareCode: z.string().min(4).max(32),
})

const normalizeShareCode = (code: string) => code.trim().toUpperCase()

interface FriendResponse {
  id: string
  displayName: string
  stats: UserFocusSnapshot
}

const buildFriendPayload = async (peerId: string): Promise<FriendResponse> => {
  const peer = await prisma.user.findUnique({
    where: { id: peerId },
    select: { id: true, displayName: true },
  })

  if (!peer) {
    throw new Error('Friend not found')
  }

  const stats = await buildFocusSnapshotForUser(peer.id)
  return {
    id: peer.id,
    displayName: peer.displayName,
    stats,
  }
}

friendsRouter.use(requireAuth)

friendsRouter.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const shareCode = await ensureShareCodeForUser(req.user!.id)
    const links = await prisma.friendLink.findMany({
      where: { ownerId: req.user!.id },
      select: { peerId: true },
      orderBy: { createdAt: 'asc' },
    })

    const friends = await Promise.all(links.map((link) => buildFriendPayload(link.peerId)))
    return res.json({ shareCode, friends })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load friends.' })
  }
})

friendsRouter.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { shareCode } = shareCodeSchema.parse(req.body)
    const normalized = normalizeShareCode(shareCode)

    const target = await prisma.user.findFirst({
      where: { shareCode: normalized },
      select: { id: true, displayName: true },
    })

    if (!target) {
      return res.status(404).json({ message: 'Share code not found.' })
    }

    if (target.id === req.user!.id) {
      return res.status(400).json({ message: 'You cannot add yourself as a friend.' })
    }

    const existing = await prisma.friendLink.findUnique({
      where: {
        ownerId_peerId: {
          ownerId: req.user!.id,
          peerId: target.id,
        },
      },
    })

    if (existing) {
      return res.status(409).json({ message: 'Friend already added.' })
    }

    await ensureShareCodeForUser(req.user!.id)

    await prisma.friendLink.create({
      data: {
        ownerId: req.user!.id,
        peerId: target.id,
      },
    })

    const friend = await buildFriendPayload(target.id)
    return res.status(201).json({ friend })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid payload.', errors: error.flatten() })
    }
    return res.status(500).json({ message: 'Failed to add friend.' })
  }
})

friendsRouter.delete('/:peerId', async (req: AuthenticatedRequest, res) => {
  try {
    const peerId = req.params.peerId
    const result = await prisma.friendLink.deleteMany({
      where: {
        ownerId: req.user!.id,
        peerId,
      },
    })

    if (!result.count) {
      return res.status(404).json({ message: 'Friend link not found.' })
    }

    return res.status(204).send()
  } catch (error) {
    return res.status(500).json({ message: 'Failed to remove friend.' })
  }
})

export { friendsRouter }
