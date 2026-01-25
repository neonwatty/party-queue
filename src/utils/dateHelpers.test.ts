import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isItemOverdue, formatDueDate } from './dateHelpers'
import type { QueueItem } from '../hooks/useParty'

// Helper to create a mock queue item
function createMockItem(overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    id: 'test-id',
    type: 'note',
    addedBy: 'TestUser',
    addedBySessionId: 'session-123',
    status: 'pending',
    position: 0,
    isCompleted: false,
    ...overrides,
  }
}

describe('dateHelpers', () => {
  describe('isItemOverdue', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns false when no due date is set', () => {
      const item = createMockItem({ dueDate: undefined })
      expect(isItemOverdue(item)).toBe(false)
    })

    it('returns false when item is completed', () => {
      const item = createMockItem({
        dueDate: '2024-01-10T12:00:00Z', // Past date
        isCompleted: true,
      })
      expect(isItemOverdue(item)).toBe(false)
    })

    it('returns true when due date is in the past', () => {
      const item = createMockItem({
        dueDate: '2024-01-10T12:00:00Z', // 5 days ago
      })
      expect(isItemOverdue(item)).toBe(true)
    })

    it('returns false when due date is in the future', () => {
      const item = createMockItem({
        dueDate: '2024-01-20T12:00:00Z', // 5 days from now
      })
      expect(isItemOverdue(item)).toBe(false)
    })

    it('returns false when due date is exactly now', () => {
      const item = createMockItem({
        dueDate: '2024-01-15T12:00:00Z', // Exactly now
      })
      expect(isItemOverdue(item)).toBe(false)
    })
  })

  describe('formatDueDate', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('shows overdue message for past dates', () => {
      const result = formatDueDate('2024-01-14T12:00:00Z') // 1 day ago
      expect(result).toBe('1 day overdue')
    })

    it('shows plural days for multiple days overdue', () => {
      const result = formatDueDate('2024-01-10T12:00:00Z') // 5 days ago
      expect(result).toBe('5 days overdue')
    })

    it('shows "Due today" for today', () => {
      // Same day, same time - diffDays will be 0
      const result = formatDueDate('2024-01-15T12:00:00Z')
      expect(result).toBe('Due today')
    })

    it('shows "Due tomorrow" for tomorrow', () => {
      const result = formatDueDate('2024-01-16T12:00:00Z') // Tomorrow
      expect(result).toBe('Due tomorrow')
    })

    it('shows "Due in X days" for dates within a week', () => {
      const result = formatDueDate('2024-01-18T12:00:00Z') // 3 days from now
      expect(result).toBe('Due in 3 days')
    })

    it('shows formatted date for dates more than a week away', () => {
      const result = formatDueDate('2024-01-30T12:00:00Z') // 15 days from now
      expect(result).toMatch(/Due \d+\/\d+\/\d+/)
    })
  })
})
