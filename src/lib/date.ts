import { addDays, format, isValid, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Weekday } from '@/domain/types'

const weekdayLabels = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miercoles',
  'Jueves',
  'Viernes',
  'Sabado',
] as const

export const weekdayOptions = weekdayLabels.map((label, value) => ({
  label,
  value: value as Weekday,
}))

export function formatDate(date: string) {
  const parsed = parseISO(date)
  if (!isValid(parsed)) return date

  return format(parsed, "d 'de' MMMM, yyyy", { locale: es })
}

export function getWeekdayLabel(weekday: Weekday) {
  return weekdayLabels[weekday]
}

export function nextMeetingDate(weekday: Weekday, from = new Date()) {
  const current = from.getDay()
  const delta = (weekday - current + 7) % 7 || 7

  return format(addDays(from, delta), 'yyyy-MM-dd')
}
