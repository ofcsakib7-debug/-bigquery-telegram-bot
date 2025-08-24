#!/usr/bin/env node

/**
 * Test script to verify that cache module can be imported without hanging
 */

console.log('=== Testing Cache Module Import ===');

// Test 1: Try to import the cache module
console.log('\n1. Testing cache module import...');

try {
  console.time('Cache Module Import');
  const cache = require('./bigquery/cache');
  console.timeEnd('Cache Module Import');
  console.log('  ✅ Cache module imported successfully');
  console.log('  ✅ Available functions:', Object.keys(cache).join(', '));
} catch (error) {
  console.log('  ❌ Error importing cache module:', error.message);
  console.log('  ❌ Error stack:', error.stack);
}

// Test 2: Try to import other modules to make sure they work
console.log('\n2. Testing other module imports...');

try {
  console.time('Payment Module Import');
  const payment = require('./functions/payment');
  console.timeEnd('Payment Module Import');
  console.log('  ✅ Payment module imported successfully');
  
  // Test a function from payment module
  if (typeof payment.validateChallanNumbers === 'function') {
    const result = payment.validateChallanNumbers('CH-2023-1001');
    console.log('  ✅ Payment validation function works:', result.valid);
  }
} catch (error) {
  console.log('  ❌ Error importing payment module:', error.message);
}

try {
  console.time('Snooze Module Import');
  const snooze = require('./functions/snooze');
  console.timeEnd('Snooze Module Import');
  console.log('  ✅ Snooze module imported successfully');
  
  // Test a function from snooze module
  if (typeof snooze.calculateSnoozeUntil === 'function') {
    const result = snooze.calculateSnoozeUntil('1h');
    console.log('  ✅ Snooze calculation function works:', result.toISOString());
  }
} catch (error) {
  console.log('  ❌ Error importing snooze module:', error.message);
}

console.log('\n=== Import Testing Complete ===');
console.log('If you see this message, all modules imported without hanging!');
