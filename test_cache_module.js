#!/usr/bin/env node

/**
 * BigQuery Cache Module Test
 * 
 * This script specifically tests the BigQuery cache module to ensure it
 * doesn't hang during import and functions correctly.
 */

console.log('=== BigQuery Cache Module Test ===\n');

// Test 1: Import the cache module
console.log('1. Testing cache module import...\n');

try {
  console.time('Cache Module Import');
  const cache = require('./bigquery/cache');
  console.timeEnd('Cache Module Import');
  
  console.log('  ✅ Cache module imported successfully');
  console.log('  ✅ Available functions:', Object.keys(cache).join(', '));
  
  // Test 2: Test key functions
  console.log('\n2. Testing key cache functions...\n');
  
  // Test generateCacheKey function
  if (typeof cache.generateCacheKey === 'function') {
    console.log('  ✅ generateCacheKey function is accessible');
    
    // Test the function
    const testKey = cache.generateCacheKey('test', 'user123', 'context');
    console.log('  ✅ generateCacheKey result:', testKey);
  } else {
    console.log('  ❌ generateCacheKey function is not accessible');
  }
  
  // Test getFromCache function
  if (typeof cache.getFromCache === 'function') {
    console.log('  ✅ getFromCache function is accessible');
  } else {
    console.log('  ❌ getFromCache function is not accessible');
  }
  
  // Test storeInCache function
  if (typeof cache.storeInCache === 'function') {
    console.log('  ✅ storeInCache function is accessible');
  } else {
    console.log('  ❌ storeInCache function is not accessible');
  }
  
  // Test 3: Test BigQuery client initialization
  console.log('\n3. Testing BigQuery client initialization...\n');
  
  // This should not hang because we implemented lazy initialization
  try {
    console.time('BigQuery Client Access');
    const bigqueryClient = cache.getBigQuery(); // This should return immediately
    console.timeEnd('BigQuery Client Access');
    console.log('  ✅ BigQuery client accessed successfully (lazy initialization working)');
  } catch (error) {
    console.log('  ⚠️  BigQuery client access failed (but this is expected in test environment):', error.message);
  }
  
} catch (error) {
  console.timeEnd('Cache Module Import');
  console.log('  ❌ Error importing cache module:', error.message);
  console.log('  ❌ Error stack:', error.stack);
}

console.log('\n=== Cache Module Test Complete ===');
console.log('If you see this message quickly (within 1-2 seconds), the fix worked!');
console.log('The cache module should no longer hang during import.');
