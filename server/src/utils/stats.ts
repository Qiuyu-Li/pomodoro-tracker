import { startOfDay, startOfWeek } from 'date-fns'
import { prisma } from '../db'

export interface UserFocusSnapshot {
  todayMinutes: number
  weekMinutes: number
  averageProgress: number | null
  averageFocus: number | null
}

const sumMinutes = (sessions: { durationMin: number }[]) =>
  sessions.reduce((acc, session) => acc + session.durationMin, 0)

const average = (values: (number | null | undefined)[]) => {
  const filtered = values.filter((value): value is number => typeof value === 'number')
  if (!filtered.length) return null
  return filtered.reduce((acc, value) => acc + value, 0) / filtered.length
}

export const buildFocusSnapshotForUser = async (userId: string): Promise<UserFocusSnapshot> => {
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const todayStart = startOfDay(now)

  const sessions = await prisma.session.findMany({
    where: {
      userId,
      startTime: { gte: weekStart },
    },
    select: {
      durationMin: true,
      startTime: true,
      progress: true,
      focusScore: true,
    },
  })

  const todaySessions = sessions.filter((session) => session.startTime >= todayStart)

  return {
    todayMinutes: sumMinutes(todaySessions),
    weekMinutes: sumMinutes(sessions),
    averageProgress: average(sessions.map((session) => session.progress)),
    averageFocus: average(sessions.map((session) => session.focusScore)),
  }
}
