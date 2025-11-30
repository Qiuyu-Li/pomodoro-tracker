import { prisma } from '../db'

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 8

const buildCode = () => Array.from({ length: CODE_LENGTH }, () => CHARSET[Math.floor(Math.random() * CHARSET.length)]).join('')

export const generateUniqueShareCode = async (): Promise<string> => {
  while (true) {
    const candidate = buildCode()
    const existing = await prisma.user.findFirst({ where: { shareCode: candidate } })
    if (!existing) {
      return candidate
    }
  }
}

export const ensureShareCodeForUser = async (userId: string): Promise<string> => {
  const existing = await prisma.user.findUnique({ where: { id: userId }, select: { shareCode: true } })
  if (existing?.shareCode) {
    return existing.shareCode
  }

  const shareCode = await generateUniqueShareCode()
  await prisma.user.update({ where: { id: userId }, data: { shareCode } })
  return shareCode
}
