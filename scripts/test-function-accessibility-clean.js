#!/usr/bin/env node

console.log('=== Testing Function Accessibility ===');

const path = require('path');

// Function to test module imports with correct paths
function testFunction(moduleRelativePath, functionName, testArgs, formatter = JSON.stringify) {
  try {
    // Build the correct path from project root
    const modulePath = path.join(__dirname, '..', moduleRelativePath);
    const module = require(modulePath);
    
    if (typeof module[functionName] === 'function') {
      console.log(`? ${functionName} function accessible`);
      const result = module[functionName](...testArgs);
      console.log(`? Function execution result:`, formatter(result));
      return true;
    } else {
      console.log(`? ${functionName} function not accessible`);
      return false;
    }
  } catch (error) {
    console.log(`? ${functionName} function error:`, error.message);
    return false;
  }
}

// Test all functions with correct relative paths from project root
const tests = [
  { 
    path: 'functions/payment', 
    name: 'validateChallanNumbers', 
    args: ['CH-2023-1001'] 
  },
  { 
    path: 'bigquery/cache', 
    name: 'generateCacheKey', 
    args: ['test', 'user123', 'context'],
    formatter: (result) => result
  },
  { 
    path: 'functions/snooze', 
    name: 'calculateSnoozeUntil', 
    args: ['1h'],
    formatter: (result) => result.toISOString()
  }
];

let allPassed = true;

for (const test of tests) {
  const passed = testFunction(
    test.path, 
    test.name, 
    test.args,
    test.formatter || JSON.stringify
  );
  if (!passed) allPassed = false;
  console.log(''); // Empty line for readability
}

if (allPassed) {
  console.log('? All function accessibility tests successful');
  process.exit(0);
} else {
  console.log('? Some function accessibility tests failed');
  process.exit(1);
}