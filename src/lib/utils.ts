import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Merge Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format date
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions) {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  })
}

// Format time
export function formatTime(date: string | Date) {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Format datetime
export function formatDateTime(date: string | Date) {
  return `${formatDate(date)} ${formatTime(date)}`
}

// Format duration (seconds to mm:ss or hh:mm:ss)
export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Parse duration string (e.g., "10" or "10:30") to seconds
export function parseDurationToSeconds(durationStr: string): number | null {
  if (!durationStr.trim()) return null
  
  // Check if format is "minutes:seconds"
  if (durationStr.includes(':')) {
    const parts = durationStr.split(':')
    if (parts.length !== 2) return null
    
    const minutes = parseInt(parts[0], 10)
    const seconds = parseInt(parts[1], 10)
    
    if (isNaN(minutes) || isNaN(seconds) || minutes < 0 || seconds < 0 || seconds >= 60) {
      return null
    }
    
    return minutes * 60 + seconds
  }
  
  // Otherwise, treat as minutes only
  const minutes = parseInt(durationStr, 10)
  if (isNaN(minutes) || minutes < 0) return null
  
  return minutes * 60
}

// Format seconds to "minutes" or "minutes:seconds"
export function formatDurationForInput(seconds: number): string {
  if (!seconds) return ''
  
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  
  if (secs === 0) {
    return mins.toString()
  }
  
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Format points
export function formatPoints(points: number): string {
  return points.toLocaleString('th-TH')
}

// Get level from points
export function getLevelFromPoints(points: number): number {
  return Math.max(1, Math.floor(points / 500) + 1)
}

// Get progress to next level
export function getProgressToNextLevel(points: number): number {
  const currentLevelPoints = (Math.floor(points / 500)) * 500
  const nextLevelPoints = currentLevelPoints + 500
  return ((points - currentLevelPoints) / 500) * 100
}

// Get next level points required (for display)
export function getNextLevelPoints(points: number): number {
  const currentLevelPoints = (Math.floor(points / 500)) * 500
  return currentLevelPoints + 500
}

// Get current level points range
export function getCurrentLevelPointsRange(points: number): { min: number; max: number } {
  const min = (Math.floor(points / 500)) * 500
  const max = min + 500
  return { min, max }
}

// Truncate text
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length) + '...'
}

// Generate initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Check if date is today
export function isToday(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  )
}

// Get relative time
export function getRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'เมื่อสักครู่'
  if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`
  if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`
  if (diffDays < 7) return `${diffDays} วันที่แล้ว`
  return formatDate(d)
}

