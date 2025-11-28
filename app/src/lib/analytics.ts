import type { SessionRecord } from './types'

interface WeeklyPoint {
  weekStart: string
  label: string
  minutes: number
  [key: string]: string | number
}

interface ProjectSlice {
  project: string
  label: string
  minutes: number
  [key: string]: string | number
}

interface HourlyPoint {
  hour: number
  label: string
  minutes: number
  [key: string]: string | number
}

export interface InsightSummary {
  totalMinutes: number
  totalSessions: number
  weekly: WeeklyPoint[]
  projectShare: ProjectSlice[]
  hourly: HourlyPoint[]
}

const startOfWeekIso = (iso: string) => {
  const date = new Date(iso)
  const day = date.getDay() || 7
  if (day !== 1) {
    date.setDate(date.getDate() - (day - 1))
  }
  date.setHours(0, 0, 0, 0)
  return date.toISOString().slice(0, 10)
}

const startOfWeekDate = (date: Date) => {
  const copy = new Date(date)
  const day = copy.getDay() || 7
  if (day !== 1) {
    copy.setDate(copy.getDate() - (day - 1))
  }
  copy.setHours(0, 0, 0, 0)
  return copy
}

const weekLabel = (iso: string) => {
  const date = new Date(`${iso}T00:00:00`)
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}

const hourLabel = (hour: number) => {
  const normalized = hour % 12 || 12
  return `${normalized}${hour >= 12 ? 'p' : 'a'}m`
}

export const buildInsightSummary = (sessions: SessionRecord[]): InsightSummary => {
  const focusSessions = sessions.filter((session) => session.phase === 'focus')
  const totalMinutes = focusSessions.reduce((sum, session) => sum + (session.durationMinutes || 0), 0)

  const weeklyMap = new Map<string, number>()
  const projectMap = new Map<string, number>()
  const hourlyBuckets = Array.from({ length: 24 }, () => 0)

  focusSessions.forEach((session) => {
    const minutes = session.durationMinutes || 0
    const weekKey = startOfWeekIso(session.startTime)
    weeklyMap.set(weekKey, (weeklyMap.get(weekKey) ?? 0) + minutes)

    const projectLabel = session.project?.trim() || 'Unlabeled'
    projectMap.set(projectLabel, (projectMap.get(projectLabel) ?? 0) + minutes)

    const hour = new Date(session.startTime).getHours()
    hourlyBuckets[hour] += minutes
  })

  const weekly = Array.from(weeklyMap.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([weekStart, minutes]) => ({ weekStart, label: weekLabel(weekStart), minutes }))

  const projectShare = Array.from(projectMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([project, minutes]) => ({ project, label: project, minutes }))

  const hourly = hourlyBuckets.map((minutes, hour) => ({ hour, label: hourLabel(hour), minutes }))

  return {
    totalMinutes,
    totalSessions: focusSessions.length,
    weekly,
    projectShare,
    hourly,
  }
}

export interface UserFocusSnapshot {
  todayMinutes: number
  weekMinutes: number
  averageProgress: number | null
  averageFocus: number | null
}

const dateKey = (date: Date) => date.toDateString()

const averageOf = (values: number[]) =>
  values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null

export const buildUserFocusSnapshot = (
  sessions: SessionRecord[],
  referenceDate: Date = new Date(),
): UserFocusSnapshot => {
  const todayKey = dateKey(referenceDate)
  const weekKey = dateKey(startOfWeekDate(referenceDate))
  const focusSessions = sessions.filter((session) => session.phase === 'focus')

  let todayMinutes = 0
  let weekMinutes = 0
  const progressValues: number[] = []
  const focusValues: number[] = []

  focusSessions.forEach((session) => {
    const sessionDate = new Date(session.startTime)
    const sessionDayKey = dateKey(sessionDate)
    if (sessionDayKey === todayKey) {
      todayMinutes += session.durationMinutes || 0
    }
    const sessionWeekKey = dateKey(startOfWeekDate(sessionDate))
    if (sessionWeekKey === weekKey) {
      weekMinutes += session.durationMinutes || 0
    }

    if (typeof session.progressPercent === 'number') {
      progressValues.push(session.progressPercent)
    }
    if (typeof session.focusLevel === 'number') {
      focusValues.push(session.focusLevel)
    }
  })

  return {
    todayMinutes,
    weekMinutes,
    averageProgress: averageOf(progressValues),
    averageFocus: averageOf(focusValues),
  }
}
