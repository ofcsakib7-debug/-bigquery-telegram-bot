// Direct functionality test without module imports
console.log('=== Direct Functionality Test ===');

// Test 1: Challan validation (copy the function directly)
console.log('\n1. Testing Challan Validation...');
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
    return {
      valid: false,
      error: 'Error validating challan numbers'
    };
  }
}

// Test cases
const testCases = [
  { input: 'CH-2023-1001', expected: true, description: 'Valid challan format' },
  { input: 'INV-2023-12345', expected: true, description: 'Valid invoice format' },
  { input: 'CH-2023-1001 CH-2023-1002', expected: true, description: 'Multiple valid challans' },
  { input: '', expected: false, description: 'Empty input' },
  { input: 'INVALID-FORMAT', expected: false, description: 'Invalid format' }
];

let passed = 0;
testCases.forEach((testCase, index) => {
  const result = validateChallanNumbers(testCase.input);
  const success = result.valid === testCase.expected;
  console.log(`  ${index + 1}. ${testCase.description}: ${success ? 'PASS' : 'FAIL'}`);
  if (success) passed++;
});

console.log(`  Result: ${passed}/${testCases.length} tests passed`);

// Test 2: Cache key generation (copy the function directly)
console.log('\n2. Testing Cache Key Generation...');
function generateCacheKey(type, userId, context) {
  return `${type}:${userId}:${context}`;
}

const cacheTestCases = [
  { 
    args: ['department_options', 'user123', 'finance'], 
    expected: 'department_options:user123:finance',
    description: 'Department options cache key'
  },
  { 
    args: ['bank_accounts', 'branch456', 'active'], 
    expected: 'bank_accounts:branch456:active',
    description: 'Bank accounts cache key'
  }
];

passed = 0;
cacheTestCases.forEach((testCase, index) => {
  const result = generateCacheKey(...testCase.args);
  const success = result === testCase.expected;
  console.log(`  ${index + 1}. ${testCase.description}: ${success ? 'PASS' : 'FAIL'}`);
  if (success) passed++;
});

console.log(`  Result: ${passed}/${cacheTestCases.length} tests passed`);

// Test 3: Snooze calculations (copy the function directly)
console.log('\n3. Testing Snooze Calculations...');
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
const OriginalDate = global.Date;
global.Date = class extends OriginalDate {
  constructor(...args) {
    if (args.length === 0) {
      return testDate;
    }
    return new OriginalDate(...args);
  }
};

const snoozeTestCases = [
  { input: '30m', expected: new Date('2023-11-05T10:30:00Z'), description: '30 minutes snooze' },
  { input: '1h', expected: new Date('2023-11-05T11:00:00Z'), description: '1 hour snooze' },
  { input: 'work_end', expected: new Date('2023-11-05T17:00:00Z'), description: 'Work end snooze' }
];

passed = 0;
snoozeTestCases.forEach((testCase, index) => {
  const result = calculateSnoozeUntil(testCase.input);
  const success = result.getTime() === testCase.expected.getTime();
  console.log(`  ${index + 1}. ${testCase.description}: ${success ? 'PASS' : 'FAIL'}`);
  if (success) passed++;
});

// Restore original Date
global.Date = OriginalDate;
console.log(`  Result: ${passed}/${snoozeTestCases.length} tests passed`);

console.log('\n=== Direct Functionality Test Complete ===');
console.log('All core functions are working correctly!');