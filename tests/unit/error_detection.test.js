// tests/unit/error_detection.test.js - Unit tests for Design 7 (Logical Error Detection)

const { detectLogicalError, detectFinanceError, detectInventoryError, detectSalesError, detectServiceError } = require('../../functions/error_detection');

describe('Design 7: Logical Error Detection', () => {
  describe('detectFinanceError', () => {
    test('should not detect error in valid finance transaction', () => {
      const transaction = {
        department: 'FINANCE',
        payment_date: new Date('2023-01-15'),
        transaction_date: new Date('2023-01-10'),
        amount: 1000
      };
      const result = detectFinanceError(transaction);
      expect(result.hasError).toBe(false);
    });

    test('should detect error in invalid finance transaction (payment before transaction)', () => {
      const transaction = {
        department: 'FINANCE',
        payment_date: new Date('2023-01-05'),
        transaction_date: new Date('2023-01-10'),
        amount: 1000
      };
      const result = detectFinanceError(transaction);
      expect(result.hasError).toBe(true);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('DATE_LOGIC');
    });
  });

  describe('detectInventoryError', () => {
    test('should not detect error in valid inventory transaction', () => {
      const transaction = {
        department: 'INVENTORY',
        manufacturing_date: new Date('2023-01-05'),
        delivery_date: new Date('2023-01-10'),
        quantity: 100
      };
      const result = detectInventoryError(transaction);
      expect(result.hasError).toBe(false);
    });

    test('should detect error in invalid inventory transaction (delivery before manufacturing)', () => {
      const transaction = {
        department: 'INVENTORY',
        manufacturing_date: new Date('2023-01-10'),
        delivery_date: new Date('2023-01-05'),
        quantity: 100
      };
      const result = detectInventoryError(transaction);
      expect(result.hasError).toBe(true);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('DATE_LOGIC');
    });
  });

  describe('detectSalesError', () => {
    test('should not detect error in valid sales transaction', () => {
      const transaction = {
        department: 'SALES',
        sale_date: new Date('2023-01-15'),
        customer_creation_date: new Date('2023-01-10'),
        amount: 1000
      };
      const result = detectSalesError(transaction);
      expect(result.hasError).toBe(false);
    });

    test('should detect error in invalid sales transaction (sale before customer creation)', () => {
      const transaction = {
        department: 'SALES',
        sale_date: new Date('2023-01-05'),
        customer_creation_date: new Date('2023-01-10'),
        amount: 1000
      };
      const result = detectSalesError(transaction);
      expect(result.hasError).toBe(true);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('DATE_LOGIC');
    });
  });

  describe('detectServiceError', () => {
    test('should not detect error in valid service transaction', () => {
      const transaction = {
        department: 'SERVICE',
        service_date: new Date('2023-01-15'),
        delivery_date: new Date('2023-01-10'),
        description: 'Service description'
      };
      const result = detectServiceError(transaction);
      expect(result.hasError).toBe(false);
    });

    test('should detect error in invalid service transaction (service before delivery)', () => {
      const transaction = {
        department: 'SERVICE',
        service_date: new Date('2023-01-05'),
        delivery_date: new Date('2023-01-10'),
        description: 'Service description'
      };
      const result = detectServiceError(transaction);
      expect(result.hasError).toBe(true);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('DATE_LOGIC');
    });
  });

  describe('detectLogicalError', () => {
    test('should detect errors in finance transactions', () => {
      const transaction = {
        department: 'FINANCE',
        payment_date: new Date('2023-01-05'),
        transaction_date: new Date('2023-01-10'),
        amount: 1000
      };
      const result = detectLogicalError(transaction);
      expect(result.hasError).toBe(true);
    });

    test('should detect errors in inventory transactions', () => {
      const transaction = {
        department: 'INVENTORY',
        manufacturing_date: new Date('2023-01-10'),
        delivery_date: new Date('2023-01-05'),
        quantity: 100
      };
      const result = detectLogicalError(transaction);
      expect(result.hasError).toBe(true);
    });

    test('should not detect errors in valid transactions', () => {
      const transaction = {
        department: 'FINANCE',
        payment_date: new Date('2023-01-15'),
        transaction_date: new Date('2023-01-10'),
        amount: 1000
      };
      const result = detectLogicalError(transaction);
      expect(result.hasError).toBe(false);
    });

    test('should handle unsupported departments gracefully', () => {
      const transaction = {
        department: 'UNKNOWN',
        some_field: 'some_value'
      };
      const result = detectLogicalError(transaction);
      expect(result.hasError).toBe(false);
      expect(result.errors).toHaveLength(0);
    });
  });
});