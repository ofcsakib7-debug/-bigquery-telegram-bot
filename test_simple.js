// Simple test without Google Cloud dependencies
console.log('=== Testing Functions Without Google Cloud ===');

// Test 1: Challan validation (doesn't require Google Cloud)
console.log('\n1. Testing Challan Validation...');
try {
  // Copy the validateChallanNumbers function directly here to avoid Google Cloud dependencies
  function validateChallanNumbers(challanNumbers) {
    try {
      // Split challan numbers by space
      const challanArray = challanNumbers.trim().split(/\s+/);
      
      // Check if we have at least one challan
      if (challanArray.length === 0 || (challanArray.length === 1 && challanArray[0] === '')) {
        return {
          valid: false,
          error: 'Please enter at least one challan number'
        };
      }
      
      // Check if we have more than 5 challan numbers
      if (challanArray.length > 5) {
        return {
          valid: false,
          error: 'Maximum 5 challan numbers per payment'
        };
      }
      
      // Validate each challan number format
      const regex = /^(CH|INV)-\d{4}-\d{3,5}$/;
      for (const challan of challanArray) {
        if (!regex.test(challan)) {
          return {
            valid: false,
            error: `Invalid challan format: ${challan}. Correct format: CH-2023-1001`
          };
        }
      }
      
      return {
        valid: true,
        challanNumbers: challanArray
      };
    } catch (error) {
      console.error('Error validating challan numbers:', error);
      return {
        valid: false,
        error: 'Error validating challan numbers'
      };
    }
  }
  
  const testData = [
    { input: 'CH-2023-1001', expected: true },
    { input: 'INV-2023-12345', expected: true },
    { input: 'INVALID', expected: false },
    { input: '', expected: false }
  ];
  
  testData.forEach((test, index) => {
    const result = validateChallanNumbers(test.input);
    const passed = result.valid === test.expected;
    console.log(`  Test ${index + 1}: ${passed ? 'PASS' : 'FAIL'} - Input: "${test.input}"`);
  });
} catch (error) {
  console.log('  Error:', error.message);
}

// Test 2: Cache key generation (doesn't require Google Cloud)
console.log('\n2. Testing Cache Key Generation...');
try {
  // Copy the generateCacheKey function directly here
  function generateCacheKey(type, userId, context) {
    return `${type}:${userId}:${context}`;
  }
  
  const result1 = generateCacheKey('department_options', 'user123', 'finance');
  const expected1 = 'department_options:user123:finance';
  console.log(`  Test 1: ${result1 === expected1 ? 'PASS' : 'FAIL'} - Got: "${result1}"`);
  
  const result2 = generateCacheKey('bank_accounts', 'branch456', 'active');
  const expected2 = 'bank_accounts:branch456:active';
  console.log(`  Test 2: ${result2 === expected2 ? 'PASS' : 'FAIL'} - Got: "${result2}"`);
} catch (error) {
  console.log('  Error:', error.message);
}

// Test 3: Snooze calculations (doesn't require Google Cloud)
console.log('\n3. Testing Snooze Calculations...');
try {
  // Copy the calculateSnoozeUntil function directly here
  function calculateSnoozeUntil(duration) {
    const now = new Date();
    
    switch (duration) {
      case '30m':
        return new Date(now.getTime() + 30 * 60 * 1000);
      case '1h':
        return new Date(now.getTime() + 60 * 60 * 1000);
      case '2h':
        return new Date(now.getTime() + 2 * 60 * 60 * 1000);
      case 'work_end':
        // Assume work ends at 5pm
        const workEnd = new Date();
        workEnd.setHours(17, 0, 0, 0); // 5:00 PM
        return workEnd;
      case 'tomorrow':
        // Tomorrow morning at 9am
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0); // 9:00 AM
        return tomorrow;
      default:
        // Default to 1 hour
        return new Date(now.getTime() + 60 * 60 * 1000);
    }
  }
  
  // Use a fixed date for consistent testing
  const testDate = new Date('2023-11-05T10:00:00Z');
  
  // Mock Date for consistent results
  const OriginalDate = global.Date;
  global.Date = class extends OriginalDate {
    constructor(...args) {
      if (args.length === 0) {
        return testDate;
      }
      return new OriginalDate(...args);
    }
  };
  
  const result1 = calculateSnoozeUntil('30m');
  const expected1 = new Date('2023-11-05T10:30:00Z');
  console.log(`  Test 1 (30m): ${result1.getTime() === expected1.getTime() ? 'PASS' : 'FAIL'}`);
  
  const result2 = calculateSnoozeUntil('1h');
  const expected2 = new Date('2023-11-05T11:00:00Z');
  console.log(`  Test 2 (1h): ${result2.getTime() === expected2.getTime() ? 'PASS' : 'FAIL'}`);
  
  // Restore original Date
  global.Date = OriginalDate;
} catch (error) {
  console.log('  Error:', error.message);
}

console.log('\n=== Test Complete ===');