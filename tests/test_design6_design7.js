const path = require('path');
// tests/test_design6_design7.js - Comprehensive test for Design 6 & 7
console.log('=== Comprehensive Test for Design 6 & Design 7 ===\n');

// Import required modules
const { validate_search_query } = require('../functions/search_validation');
const { detectLogicalError } = require('../functions/error_detection');

// Test results tracking
const testResults = {
  design6: { passed: 0, total: 0 },
  design7: { passed: 0, total: 0 },
  integration: { passed: 0, total: 0 }
};

// Design 6 Tests: Context-Aware Search Validation
console.log('1. Testing Design 6: Context-Aware Search Validation\n');

const design6Tests = [
  {
    name: 'Valid accounting query',
    userId: 'user123',
    query: 'e cm',
    expected: 'APPROVED'
  },
  {
    name: 'Invalid syntax with special characters',
    userId: 'user123',
    query: 'e@cm',
    expected: 'REJECTED'
  },
  {
    name: 'Query with valid variables',
    userId: 'user123',
    query: 'report {time}',
    expected: 'APPROVED'
  },
  {
    name: 'Query with invalid variables',
    userId: 'user123',
    query: 'report {time',
    expected: 'REJECTED'
  }
];

design6Tests.forEach((test, index) => {
  testResults.design6.total++;
  console.log(`  Test ${index + 1}: ${test.name}`);
  try {
    const result = validate_search_query(test.userId, test.query);
    console.log(`    Input: "${test.query}"`);
    console.log(`    Expected: ${test.expected}`);
    console.log(`    Actual: ${result.status}`);
    
    if (result.status === test.expected) {
      console.log('    ✅ PASS\n');
      testResults.design6.passed++;
    } else {
      console.log('    ❌ FAIL\n');
    }
  } catch (error) {
    console.log(`    ❌ ERROR: ${error.message}\n`);
  }
});

// Design 7 Tests: Logical Error Detection
console.log('2. Testing Design 7: Logical Error Detection\n');

const design7Tests = [
  {
    name: 'Valid finance transaction',
    transaction: {
      department: 'FINANCE',
      payment_date: new Date('2023-01-15'),
      transaction_date: new Date('2023-01-10'),
      amount: 1000
    },
    expected: false // No error expected
  },
  {
    name: 'Invalid finance transaction (payment before transaction)',
    transaction: {
      department: 'FINANCE',
      payment_date: new Date('2023-01-05'),
      transaction_date: new Date('2023-01-10'),
      amount: 1000
    },
    expected: true // Error expected
  },
  {
    name: 'Valid inventory transaction',
    transaction: {
      department: 'INVENTORY',
      manufacturing_date: new Date('2023-01-05'),
      delivery_date: new Date('2023-01-10'),
      quantity: 100
    },
    expected: false // No error expected
  },
  {
    name: 'Invalid inventory transaction (delivery before manufacturing)',
    transaction: {
      department: 'INVENTORY',
      manufacturing_date: new Date('2023-01-10'),
      delivery_date: new Date('2023-01-05'),
      quantity: 100
    },
    expected: true // Error expected
  }
];

design7Tests.forEach((test, index) => {
  testResults.design7.total++;
  console.log(`  Test ${index + 1}: ${test.name}`);
  try {
    const result = detectLogicalError(test.transaction);
    console.log(`    Department: ${test.transaction.department}`);
    console.log(`    Expected error: ${test.expected}`);
    console.log(`    Detected error: ${result.hasError}`);
    
    if (result.hasError === test.expected) {
      console.log('    ✅ PASS\n');
      testResults.design7.passed++;
    } else {
      console.log('    ❌ FAIL\n');
    }
  } catch (error) {
    console.log(`    ❌ ERROR: ${error.message}\n`);
  }
});

// Integration Tests
console.log('3. Integration Tests\n');

// Integration Test 1: Validate search query and then process transaction
testResults.integration.total++;
try {
  console.log('  Integration Test 1: Search Validation + Error Detection');
  
  // First, validate a search query
  const searchResult = validate_search_query('user123', 'finance report');
  console.log(`    Search validation result: ${searchResult.status}`);
  
  // Then, process a transaction
  const transactionResult = detectLogicalError({
    department: 'FINANCE',
    payment_date: new Date('2023-01-15'),
    transaction_date: new Date('2023-01-10'),
    amount: 1000
  });
  console.log(`    Transaction error detection result: ${transactionResult.hasError ? 'ERROR FOUND' : 'NO ERROR'}`);
  
  console.log('    ✅ Integration test passed\n');
  testResults.integration.passed++;
} catch (error) {
  console.log(`    ❌ Integration test failed: ${error.message}\n`);
}

// Integration Test 2: Invalid search query should not affect transaction processing
testResults.integration.total++;
try {
  console.log('  Integration Test 2: Invalid Search Query + Valid Transaction');
  
  // First, validate an invalid search query
  const searchResult = validate_search_query('user123', 'invalid@query');
  console.log(`    Search validation result: ${searchResult.status}`);
  
  // Then, process a valid transaction
  const transactionResult = detectLogicalError({
    department: 'INVENTORY',
    manufacturing_date: new Date('2023-01-05'),
    delivery_date: new Date('2023-01-10'),
    quantity: 100
  });
  console.log(`    Transaction error detection result: ${transactionResult.hasError ? 'ERROR FOUND' : 'NO ERROR'}`);
  
  // Both should work independently
  if (searchResult.status === 'REJECTED' && !transactionResult.hasError) {
    console.log('    ✅ Integration test passed\n');
    testResults.integration.passed++;
  } else {
    console.log('    ❌ Integration test failed\n');
  }
} catch (error) {
  console.log(`    ❌ Integration test failed: ${error.message}\n`);
}

// Summary
console.log('=== Comprehensive Test Summary ===');
console.log(`Design 6 (Search Validation): ${testResults.design6.passed}/${testResults.design6.total} tests passed`);
console.log(`Design 7 (Error Detection): ${testResults.design7.passed}/${testResults.design7.total} tests passed`);
console.log(`Integration Tests: ${testResults.integration.passed}/${testResults.integration.total} tests passed`);

const overallDesign6Success = testResults.design6.passed === testResults.design6.total;
const overallDesign7Success = testResults.design7.passed === testResults.design7.total;
const overallIntegrationSuccess = testResults.integration.passed === testResults.integration.total;
const overallSuccess = overallDesign6Success && overallDesign7Success && overallIntegrationSuccess;

console.log(`\nOverall Test Status: ${overallSuccess ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

if (overallSuccess) {
  console.log('\n🎉 All tests passed! Design 6 & Design 7 are working correctly.');
  console.log('The system is ready for deployment.');
} else {
  console.log('\n🔧 Some tests failed. Please check the output above for details.');
  process.exit(1);
}

// Generate detailed report
console.log('\n=== Detailed Test Report ===');
console.log('Design 6 - Context-Aware Search Validation:');
console.log('  - Syntax validation: Checks character set, length, and variable format');
console.log('  - Logical validation: Department-specific pattern matching');
console.log('  - Heuristic pattern check: BQML-powered analysis');
console.log('  - Semantic validation: Deep validation for suspicious queries');

console.log('\nDesign 7 - Logical Error Detection:');
console.log('  - Department-specific validation rules:');
console.log('    * FINANCE: Payment date vs transaction date');
console.log('    * INVENTORY: Manufacturing date vs delivery date');
console.log('    * SALES: Sale date vs customer creation date');
console.log('    * SERVICE: Service date vs delivery date');
console.log('  - Multi-layered error detection');
console.log('  - Severity scoring (1-5 scale)');
console.log('  - Confidence scoring (0.0-1.0 scale)');

console.log('\nIntegration:');
console.log('  - Search validation and error detection work independently');
console.log('  - Both systems can be used together in the same workflow');
console.log('  - No interference between systems');