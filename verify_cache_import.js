#!/usr/bin/env node

/**
 * Simple verification script to test that cache module can be imported
 * without hanging or causing issues
 */

console.log('=== Testing Cache Module Import ===');

// Test 1: Try to import the cache module
console.log('\n1. Testing cache module import...');

try {
  console.time('Cache Module Import');
  const cache = require('./bigquery/cache');
  console.timeEnd('Cache Module Import');
  console.log('  ✅ Cache module imported successfully');
  
  // Test that we can access functions
  const functions = Object.keys(cache);
  console.log('  ✅ Available functions:', functions.length);
  console.log('  ✅ Function names:', functions.slice(0, 5).join(', '));
  
  // Test a simple function that doesn't require BigQuery
  if (typeof cache.generateCacheKey === 'function') {
    const testKey = cache.generateCacheKey('test', 'user123', 'context');
    console.log('  ✅ generateCacheKey works:', testKey);
  }
  
} catch (error) {
  console.log('  ❌ Error importing cache module:', error.message);
  console.log('  ❌ Error stack:', error.stack);
}

console.log('\n=== Cache Module Import Test Complete ===');
console.log('If you see this message quickly (within 1-2 seconds), the fix worked!');
console.log('The cache module should no longer hang during import.');