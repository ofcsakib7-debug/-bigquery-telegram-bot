// tests/integration/design6_design7.test.js - Integration tests for Design 6 and Design 7

// Import required modules
const { validate_search_query } = require('../../functions/search_validation');
const { detectLogicalError } = require('../../functions/error_detection');

describe('Design 6 & Design 7 Integration Tests', () => {
  // Test Design 6 (Context-Aware Search Validation)
  describe('Design 6: Context-Aware Search Validation', () => {
    test('should validate a valid accounting query', () => {
      const result = validate_search_query('user123', 'e cm');
      expect(result.status).toBe('APPROVED');
    });

    test('should reject invalid syntax with special characters', () => {
      const result = validate_search_query('user123', 'e@cm');
      expect(result.status).toBe('REJECTED');
    });

    test('should validate query with valid variables', () => {
      const result = validate_search_query('user123', 'report {time}');
      expect(result.status).toBe('APPROVED');
    });

    test('should reject query with invalid variables', () => {
      const result = validate_search_query('user123', 'report {time');
      expect(result.status).toBe('REJECTED');
    });
  });

  // Test Design 7 (Logical Error Detection)
  describe('Design 7: Logical Error Detection', () => {
    test('should not detect error in valid finance transaction', () => {
      const result = detectLogicalError({
        department: 'FINANCE',
        payment_date: new Date('2023-01-15'),
        transaction_date: new Date('2023-01-10'),
        amount: 1000
      });
      expect(result.hasError).toBe(false);
    });

    test('should detect error in invalid finance transaction (payment before transaction)', () => {
      const result = detectLogicalError({
        department: 'FINANCE',
        payment_date: new Date('2023-01-05'),
        transaction_date: new Date('2023-01-10'),
        amount: 1000
      });
      expect(result.hasError).toBe(true);
    });

    test('should not detect error in valid inventory transaction', () => {
      const result = detectLogicalError({
        department: 'INVENTORY',
        manufacturing_date: new Date('2023-01-05'),
        delivery_date: new Date('2023-01-10'),
        quantity: 100
      });
      expect(result.hasError).toBe(false);
    });

    test('should detect error in invalid inventory transaction (delivery before manufacturing)', () => {
      const result = detectLogicalError({
        department: 'INVENTORY',
        manufacturing_date: new Date('2023-01-10'),
        delivery_date: new Date('2023-01-05'),
        quantity: 100
      });
      expect(result.hasError).toBe(true);
    });
  });

  // Integration tests
  describe('Integration Tests', () => {
    test('should work independently: Search Validation + Error Detection', () => {
      // First, validate a search query
      const searchResult = validate_search_query('user123', 'finance report');
      expect(searchResult.status).toBeDefined();
      
      // Then, process a transaction
      const transactionResult = detectLogicalError({
        department: 'FINANCE',
        payment_date: new Date('2023-01-15'),
        transaction_date: new Date('2023-01-10'),
        amount: 1000
      });
      expect(transactionResult.hasError).toBeDefined();
    });

    test('should work independently: Invalid Search Query + Valid Transaction', () => {
      // First, validate an invalid search query
      const searchResult = validate_search_query('user123', 'invalid@query');
      expect(searchResult.status).toBe('REJECTED');
      
      // Then, process a valid transaction
      const transactionResult = detectLogicalError({
        department: 'INVENTORY',
        manufacturing_date: new Date('2023-01-05'),
        delivery_date: new Date('2023-01-10'),
        quantity: 100
      });
      expect(transactionResult.hasError).toBe(false);
    });
  });
});