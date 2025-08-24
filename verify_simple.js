// Simple verification script for core functions
console.log('=== BigQuery Telegram Bot System Verification ===');

// Test 1: Validate challan number format
console.log('\n1. Testing Challan Number Validation...');

try {
  // Import the validation function directly
  const { validateChallanNumbers } = require('./functions/payment');
  
  // Test cases
  const testCases = [
    { input: 'CH-2023-1001', expected: true, description: 'Valid challan format' },
    { input: 'INV-2023-12345', expected: true, description: 'Valid invoice format' },
    { input: 'CH-2023-1001 CH-2023-1002', expected: true, description: 'Multiple valid challans' },
    { input: '', expected: false, description: 'Empty input' },
    { input: 'INVALID-FORMAT', expected: false, description: 'Invalid format' }
  ];
  
  let passed = 0;
  let total = testCases.length;
  
  testCases.forEach((testCase, index) => {
    try {
      const result = validateChallanNumbers(testCase.input);
      const success = result.valid === testCase.expected;
      
      console.log(`  ${index + 1}. ${testCase.description}: ${success ? 'PASS' : 'FAIL'}`);
      if (!success) {
        console.log(`     Expected: ${testCase.expected}, Got: ${result.valid}`);
      } else {
        passed++;
      }
    } catch (error) {
      console.log(`  ${index + 1}. ${testCase.description}: ERROR - ${error.message}`);
    }
  });
  
  console.log(`  Result: ${passed}/${total} tests passed for Challan Validation`);
} catch (error) {
  console.log('  Skipped (module not available or error):', error.message);
}

// Test 2: Validate snooze calculations
console.log('\n2. Testing Snooze Calculations...');

try {
  // Import the snooze function
  const { calculateSnoozeUntil } = require('./functions/snooze');
  
  // Mock current time for consistent testing
  const mockNow = new Date('2023-11-05T10:00:00Z');
  
  // Test cases
  const testCases = [
    { input: '30m', expected: new Date('2023-11-05T10:30:00Z'), description: '30 minutes snooze' },
    { input: '1h', expected: new Date('2023-11-05T11:00:00Z'), description: '1 hour snooze' },
    { input: 'work_end', expected: new Date('2023-11-05T17:00:00Z'), description: 'Work end snooze' }
  ];
  
  let passed = 0;
  let total = testCases.length;
  
  // Mock Date for consistent results
  const OriginalDate = global.Date;
  global.Date = class extends OriginalDate {
    constructor(...args) {
      if (args.length === 0) {
        return mockNow;
      }
      return new OriginalDate(...args);
    }
  };
  
  testCases.forEach((testCase, index) => {
    try {
      const result = calculateSnoozeUntil(testCase.input);
      const success = result.getTime() === testCase.expected.getTime();
      
      console.log(`  ${index + 1}. ${testCase.description}: ${success ? 'PASS' : 'FAIL'}`);
      if (!success) {
        console.log(`     Expected: ${testCase.expected.toISOString()}`);
        console.log(`     Got: ${result.toISOString()}`);
      } else {
        passed++;
      }
    } catch (error) {
      console.log(`  ${index + 1}. ${testCase.description}: ERROR - ${error.message}`);
    }
  });
  
  // Restore original Date
  global.Date = OriginalDate;
  
  console.log(`  Result: ${passed}/${total} tests passed for Snooze Calculations`);
} catch (error) {
  console.log('  Skipped (module not available or error):', error.message);
}

// Test 3: Validate cache key generation
console.log('\n3. Testing Cache Key Generation...');

try {
  // Import the cache function
  const { generateCacheKey } = require('./bigquery/cache');
  
  // Test cases
  const testCases = [
    { 
      inputs: ['department_options', 'user123', 'finance'], 
      expected: 'department_options:user123:finance',
      description: 'Standard cache key generation'
    },
    {
      inputs: ['bank_accounts', 'branch456', 'active'],
      expected: 'bank_accounts:branch456:active',
      description: 'Bank accounts cache key'
    }
  ];
  
  let passed = 0;
  let total = testCases.length;
  
  testCases.forEach((testCase, index) => {
    try {
      const result = generateCacheKey(...testCase.inputs);
      const success = result === testCase.expected;
      
      console.log(`  ${index + 1}. ${testCase.description}: ${success ? 'PASS' : 'FAIL'}`);
      if (!success) {
        console.log(`     Expected: ${testCase.expected}`);
        console.log(`     Got: ${result}`);
      } else {
        passed++;
      }
    } catch (error) {
      console.log(`  ${index + 1}. ${testCase.description}: ERROR - ${error.message}`);
    }
  });
  
  console.log(`  Result: ${passed}/${total} tests passed for Cache Key Generation`);
} catch (error) {
  console.log('  Skipped (module not available or error):', error.message);
}

console.log('\n=== Verification Completed ===');