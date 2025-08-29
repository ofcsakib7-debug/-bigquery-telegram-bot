// Unified System Integration Test
// This script checks that all major modules and functions work together without conflict.

const path = require('path');
const assert = require('assert');

function safeImport(modulePath) {
  try {
    return require(modulePath);
  } catch (e) {
    console.error(`❌ Cannot import ${modulePath}: ${e.message}`);
    return null;
  }
}

const modulesToTest = [
  './functions/payment',
  './functions/snooze',
  './bigquery/cache',
  './functions/search_validation',
  './functions/error_detection',
  './functions/admin_management',
  './functions/contextual_actions',
  './functions/multi_input_processor',
  './functions/department_validations',
  './bigquery/quota_saving',
  './bigquery/scheduled_queries',
  './bigquery/design8_schemas',
  './bigquery/design9_schemas',
  './bigquery/design10_schemas',
  './bigquery/design11_schemas',
  './bigquery/design12_schemas'
];

console.log('=== Unified System Integration Test ===');
let allPassed = true;

modulesToTest.forEach(modPath => {
  const mod = safeImport(modPath);
  if (!mod) {
    allPassed = false;
    return;
  }
  console.log(`✅ Imported ${modPath}`);
});

// Example workflow tests
try {
  const payment = safeImport('./functions/payment');
  assert(payment && typeof payment.validateChallanNumbers === 'function', 'validateChallanNumbers missing');
  const result = payment.validateChallanNumbers('CH-2023-1001');
  assert(result && result.valid === true, 'Payment validation failed');
  console.log('✅ Payment workflow test passed');
} catch (e) {
  console.error('❌ Payment workflow test failed:', e.message);
  allPassed = false;
}

try {
  const snooze = safeImport('./functions/snooze');
  assert(snooze && typeof snooze.calculateSnoozeUntil === 'function', 'calculateSnoozeUntil missing');
  const snoozeResult = snooze.calculateSnoozeUntil('1h');
  assert(snoozeResult instanceof Date, 'Snooze calculation failed');
  console.log('✅ Snooze workflow test passed');
} catch (e) {
  console.error('❌ Snooze workflow test failed:', e.message);
  allPassed = false;
}

try {
  const cache = safeImport('./bigquery/cache');
  assert(cache && typeof cache.generateCacheKey === 'function', 'generateCacheKey missing');
  const cacheKey = cache.generateCacheKey('department_options','user123','finance');
  assert(typeof cacheKey === 'string', 'Cache key generation failed');
  console.log('✅ Cache workflow test passed');
} catch (e) {
  console.error('❌ Cache workflow test failed:', e.message);
  allPassed = false;
}

// Add more workflow tests as needed...

console.log('\n=== Unified System Test Summary ===');
console.log(`Overall Status: ${allPassed ? '✅ ALL SYSTEMS GO' : '❌ ISSUES FOUND'}`);
if (!allPassed) {
  process.exit(1);
}
