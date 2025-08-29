// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: Testing
// Phase: 1
// Component: payment_workflow_tests
// Status: IN_PROGRESS
// Last Modified: 2025-08-24 17:30 UTC
// Next Step: Implement tests for challan validation
// =============================================

const { validateChallanNumbers, generateChallanValidationError } = require('../../functions/payment');

describe('Payment Workflow Functions', () => {
  describe('validateChallanNumbers', () => {
    test('should validate correct single challan number', () => {
      const result = validateChallanNumbers('CH-2023-1001');
      expect(result.valid).toBe(true);
      expect(result.challanNumbers).toEqual(['CH-2023-1001']);
    });

    test('should validate correct multiple challan numbers', () => {
      const result = validateChallanNumbers('CH-2023-1001 CH-2023-1002 CH-2023-1003');
      expect(result.valid).toBe(true);
      expect(result.challanNumbers).toEqual(['CH-2023-1001', 'CH-2023-1002', 'CH-2023-1003']);
    });

    test('should validate invoice numbers', () => {
      const result = validateChallanNumbers('INV-2023-12345');
      expect(result.valid).toBe(true);
      expect(result.challanNumbers).toEqual(['INV-2023-12345']);
    });

    test('should reject empty input', () => {
      const result = validateChallanNumbers('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Please enter at least one challan number');
    });

    test('should reject too many challan numbers', () => {
      const manyChallans = 'CH-2023-1001 CH-2023-1002 CH-2023-1003 CH-2023-1004 CH-2023-1005 CH-2023-1006';
      const result = validateChallanNumbers(manyChallans);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Maximum 5 challan numbers per payment');
    });

    test('should reject invalid format', () => {
      const result = validateChallanNumbers('INVALID-FORMAT');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid challan format');
    });

    test('should reject mixed valid and invalid formats', () => {
      const result = validateChallanNumbers('CH-2023-1001 INVALID CH-2023-1002');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid challan format: INVALID');
    });
  });

  describe('generateChallanValidationError', () => {
    test('should generate error message with provided error', () => {
      const error = 'Invalid challan format';
      const message = generateChallanValidationError(error);
      
      expect(message).toContain('❌ *Invalid Challan Numbers*');
      expect(message).toContain(error);
      expect(message).toContain('✅ *Correct Examples*:');
      expect(message).toContain('CH-2023-1001');
      expect(message).toContain('INV-2023-12345');
      expect(message).toContain('Please re-enter the challan number(s):');
    });
  });
});