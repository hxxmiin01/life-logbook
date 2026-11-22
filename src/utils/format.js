import { format, parseISO, isValid } from 'date-fns'
import { ko } from 'date-fns/locale'

export function formatDate(value, pattern = 'yyyy년 M월 d일 EEEE') {
  const date = typeof value === 'string' ? parseISO(value) : value
  return isValid(date) ? format(date, pattern, { locale: ko }) : '날짜 없음'
}

export function todayString() {
  return format(new Date(), 'yyyy-MM-dd')
}

export function entryYear(entry) {
  return entry.date?.slice(0, 4) ?? ''
}

export function sortEntries(entries, direction = 'desc') {
  return [...entries].sort((a, b) => {
    const byDate = (a.date || '').localeCompare(b.date || '')
    if (byDate !== 0) return direction === 'desc' ? -byDate : byDate
    return direction === 'desc' ? b.id - a.id : a.id - b.id
  })
}

export const moods = [
  { id: 'happy', label: '행복', emoji: '😊' },
  { id: 'calm', label: '평온', emoji: '😌' },
  { id: 'sad', label: '슬픔', emoji: '😢' },
  { id: 'angry', label: '화남', emoji: '😡' },
  { id: 'tired', label: '피곤', emoji: '😴' },
  { id: 'excited', label: '설렘', emoji: '🤩' },
]

export function moodFor(id) {
  return moods.find((mood) => mood.id === id)
}