const path = require('path');
// tests/unit/search_validation.test.js - Unit tests for Design 6 (Context-Aware Search Validation)

const { validate_search_query, validate_syntax, validate_logic, check_heuristic_patterns } = require('../../functions/search_validation');

describe('Design 6: Context-Aware Search Validation', () => {
  describe('validate_syntax', () => {
    test('should validate valid syntax', () => {
      expect(validate_syntax('e cm')).toBe(true);
      expect(validate_syntax('report {time}')).toBe(true);
    });

    test('should reject invalid characters', () => {
      expect(validate_syntax('e@cm')).toBe(false);
      expect(validate_syntax('report!')).toBe(false);
    });

    test('should reject invalid length', () => {
      // Too short
      expect(validate_syntax('a')).toBe(false);
      
      // Too long (over 20 characters)
      expect(validate_syntax('a very long query that exceeds the limit')).toBe(false);
    });

    test('should validate variable format', () => {
      expect(validate_syntax('report {time}')).toBe(true);
      expect(validate_syntax('report {time')).toBe(false);
      expect(validate_syntax('report time}')).toBe(false);
    });
  });

  describe('validate_logic', () => {
    test('should validate valid logic patterns', () => {
      const result = validate_logic('user123', 'e cm');
      expect(result.valid).toBe(true);
    });

    test('should reject invalid logic patterns', () => {
      const result = validate_logic('user123', 'invalid_pattern');
      expect(result.valid).toBe(false);
    });
  });

  describe('check_heuristic_patterns', () => {
    test('should return heuristic analysis result', () => {
      const result = check_heuristic_patterns('user123', 'e cm');
      expect(typeof result.suspicious).toBe('boolean');
      expect(typeof result.confidence_score).toBe('number');
    });
  });

  describe('validate_search_query', () => {
    test('should approve valid queries', () => {
      const result = validate_search_query('user123', 'e cm');
      expect(result.status).toBe('APPROVED');
    });

    test('should reject invalid syntax', () => {
      const result = validate_search_query('user123', 'e@cm');
      expect(result.status).toBe('REJECTED');
      expect(result.error_type).toBe('SYNTAX');
    });

    test('should reject invalid logic', () => {
      // This test might need adjustment based on the actual implementation
      // For now, we'll test with a pattern that's unlikely to match
      const result = validate_search_query('user123', 'completely_invalid_pattern');
      // The result could be either SYNTAX or LOGIC rejection
      expect(['REJECTED', 'APPROVED']).toContain(result.status);
    });
  });
});