const path = require('path');
// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: Testing
// Phase: 1
// Component: snooze_functionality_tests
// Status: IN_PROGRESS
// Last Modified: 2025-08-24 17:45 UTC
// Next Step: Implement tests for context-aware snooze options
// =============================================

const { calculateSnoozeUntil, generateSnoozeConfirmation } = require('../../functions/snooze');

describe('Snooze Functionality', () => {
  describe('calculateSnoozeUntil', () => {
    beforeEach(() => {
      // Set a fixed date for consistent testing
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2023-11-05T10:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should calculate 30 minutes snooze', () => {
      const result = calculateSnoozeUntil('30m');
      const expected = new Date('2023-11-05T10:30:00Z');
      expect(result).toEqual(expected);
    });

    test('should calculate 1 hour snooze', () => {
      const result = calculateSnoozeUntil('1h');
      const expected = new Date('2023-11-05T11:00:00Z');
      expect(result).toEqual(expected);
    });

    test('should calculate 2 hours snooze', () => {
      const result = calculateSnoozeUntil('2h');
      const expected = new Date('2023-11-05T12:00:00Z');
      expect(result).toEqual(expected);
    });

    test('should calculate work end snooze (5pm)', () => {
      const result = calculateSnoozeUntil('work_end');
      const expected = new Date('2023-11-05T17:00:00Z');
      expect(result).toEqual(expected);
    });

    test('should calculate tomorrow morning snooze (9am)', () => {
      const result = calculateSnoozeUntil('tomorrow');
      const expected = new Date('2023-11-06T09:00:00Z');
      expect(result).toEqual(expected);
    });

    test('should default to 1 hour for unknown duration', () => {
      const result = calculateSnoozeUntil('unknown');
      const expected = new Date('2023-11-05T11:00:00Z');
      expect(result).toEqual(expected);
    });
  });

  describe('generateSnoozeConfirmation', () => {
    test('should generate confirmation for 30 minutes', () => {
      const message = generateSnoozeConfirmation('30m');
      expect(message).toContain('✅ Reminder snoozed for 30 minutes');
      expect(message).toContain("I'll check back with you then!");
    });

    test('should generate confirmation for 1 hour', () => {
      const message = generateSnoozeConfirmation('1h');
      expect(message).toContain('✅ Reminder snoozed for 1 hour');
      expect(message).toContain("I'll check back with you then!");
    });

    test('should generate confirmation for work end', () => {
      const message = generateSnoozeConfirmation('work_end');
      expect(message).toContain('✅ Reminder snoozed for the end of your work day');
      expect(message).toContain("I'll check back with you then!");
    });

    test('should generate confirmation for tomorrow', () => {
      const message = generateSnoozeConfirmation('tomorrow');
      expect(message).toContain('✅ Reminder snoozed for tomorrow morning');
      expect(message).toContain("I'll check back with you then!");
    });

    test('should default to 1 hour for unknown duration', () => {
      const message = generateSnoozeConfirmation('unknown');
      expect(message).toContain('✅ Reminder snoozed for 1 hour');
      expect(message).toContain("I'll check back with you then!");
    });
  });
});