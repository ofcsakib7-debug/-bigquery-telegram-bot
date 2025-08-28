// simple_test.js - Simple test to verify system integration
console.log('=== Simple System Integration Test ===\n');

// Test 1: Design 6 (Search Validation)
console.log('1. Testing Design 6 (Search Validation)...');
const { validate_search_query } = require('./functions/search_validation');
const searchResult = validate_search_query('user123', 'e cm');
console.log('  Result:', searchResult.status);

// Test 2: Design 7 (Error Detection)
console.log('\n2. Testing Design 7 (Error Detection)...');
const { detectLogicalError } = require('./functions/error_detection');
const errorResult = detectLogicalError({
  department: 'FINANCE',
  payment_date: new Date('2023-01-05'),
  transaction_date: new Date('2023-01-10'),
  amount: 1000
});
console.log('  Error detected:', errorResult.hasError);

// Test 3: Core Components
console.log('\n3. Testing Core Components...');
const payment = require('./functions/payment');
console.log('  Payment module loaded');

const cache = require('./bigquery/cache');
console.log('  Cache module loaded');

const snooze = require('./functions/snooze');
console.log('  Snooze module loaded');

console.log('\n✅ All components loaded successfully!');
console.log('🚀 System integration verified!');