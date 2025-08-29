const path = require('path');
// test_imports.js - Simple test script to check module imports
console.log('Testing module imports...\n');

try {
  const payment = require('../functions/payment');
  console.log('✅ Payment module imported successfully');
} catch (error) {
  console.log('❌ Payment module import failed:', error.message);
}

try {
  const snooze = require('../functions/snooze');
  console.log('✅ Snooze module imported successfully');
} catch (error) {
  console.log('❌ Snooze module import failed:', error.message);
}

try {
  const cache = require('../bigquery/cache');
  console.log('✅ Cache module imported successfully');
} catch (error) {
  console.log('❌ Cache module import failed:', error.message);
}

try {
  const searchValidation = require('../functions/search_validation');
  console.log('✅ Search Validation module imported successfully');
} catch (error) {
  console.log('❌ Search Validation module import failed:', error.message);
}

try {
  const errorDetection = require('../functions/error_detection');
  console.log('✅ Error Detection module imported successfully');
} catch (error) {
  console.log('❌ Error Detection module import failed:', error.message);
}

console.log('\nImport test complete.');