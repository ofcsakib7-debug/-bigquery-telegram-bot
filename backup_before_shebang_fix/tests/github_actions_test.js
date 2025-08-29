// tests/github_actions_test.js - GitHub Actions test for Design 6 & 7
console.log('=== GitHub Actions Test for Design 6, 7, 8, 9, 10, 11, 12 ===\n');

const fs = require('fs');
const path = require('path');

// Check if required files exist
console.log('1. Checking required files...\n');

const requiredFiles = [
  'functions/search_validation.js',
  'functions/error_detection.js',
  'tests/unit/search_validation.test.js',
  'tests/unit/error_detection.test.js',
  'verify_design8.js',
  'verify_design9.js',
  'verify_design10.js',
  'verify_design11.js',
  'verify_design12.js'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    console.log(`  ✅ ${file} exists`);
  } else {
    console.log(`  ❌ ${file} is missing`);
    allFilesExist = false;
  }
});

// Test module imports
console.log('\n2. Testing module imports...\n');

function testImport(modulePath, moduleName) {
  try {
    require(modulePath);
    console.log(`  ✅ ${moduleName} module imports successfully`);
    return true;
  } catch (error) {
    console.log(`  ❌ ${moduleName} module import failed: ${error.message}`);
    return false;
  }
}

const importTests = [
  ['./functions/search_validation.js', 'Search Validation'],
  ['./functions/error_detection.js', 'Error Detection']
];

let allImportsSuccessful = true;
importTests.forEach(([modulePath, moduleName]) => {
  if (!testImport(modulePath, moduleName)) {
    allImportsSuccessful = false;
  }
});

// Test function accessibility
console.log('\n3. Testing function accessibility...\n');

function testFunctionAccess(modulePath, functionName, moduleName) {
  try {
    const module = require(modulePath);
    if (typeof module[functionName] === 'function') {
      console.log(`  ✅ ${moduleName}.${functionName} function is accessible`);
      return true;
    } else {
      console.log(`  ❌ ${moduleName}.${functionName} function is not accessible`);
      return false;
    }
  } catch (error) {
    console.log(`  ❌ ${moduleName}.${functionName} accessibility test failed: ${error.message}`);
    return false;
  }
}

const functionTests = [
  ['./functions/search_validation.js', 'validate_search_query', 'Search Validation'],
  ['./functions/error_detection.js', 'detectLogicalError', 'Error Detection']
];

let allFunctionsAccessible = true;
functionTests.forEach(([modulePath, functionName, moduleName]) => {
  if (!testFunctionAccess(modulePath, functionName, moduleName)) {
    allFunctionsAccessible = false;
  }
});

// Test function execution
console.log('\n4. Testing function execution...\n');

function testFunctionExecution(modulePath, functionName, args, moduleName) {
  try {
    const module = require(modulePath);
    const result = module[functionName](...args);
    console.log(`  ✅ ${moduleName}.${functionName} executed successfully`);
    return true;
  } catch (error) {
    console.log(`  ❌ ${moduleName}.${functionName} execution failed: ${error.message}`);
    return false;
  }
}

const executionTests = [
  ['./functions/search_validation.js', 'validate_search_query', ['user123', 'e cm'], 'Search Validation'],
  ['./functions/error_detection.js', 'detectLogicalError', [{
    department: 'FINANCE',
    payment_date: new Date('2023-01-15'),
    transaction_date: new Date('2023-01-10'),
    amount: 1000
  }], 'Error Detection']
];

let allFunctionsExecute = true;
executionTests.forEach(([modulePath, functionName, args, moduleName]) => {
  if (!testFunctionExecution(modulePath, functionName, args, moduleName)) {
    allFunctionsExecute = false;
  }
});

// Run Design 8-12 verification
console.log('\n=== Running Design 8-12 Verification ===');
const designResults = [];
for (const num of [8,9,10,11,12]) {
  try {
    const mod = require(`../verify_design${num}.js`);
    if (mod && typeof mod.runVerification === 'function') {
  console.log(`\nRunning Design ${num} Verification...`);
      mod.runVerification();
      designResults.push(true);
    } else {
      console.log(`  Skipped Design ${num} (module or function not available)`);
      designResults.push(false);
    }
  } catch (e) {
    console.log(`  Error loading Design ${num} verification: ${e.message}`);
    designResults.push(false);
  }
}

// Summary
console.log('\n=== GitHub Actions Test Summary ===');

const summary = {
  fileStructure: allFilesExist ? '✅ PASS' : '❌ FAIL',
  moduleImports: allImportsSuccessful ? '✅ PASS' : '❌ FAIL',
  functionAccessibility: allFunctionsAccessible ? '✅ PASS' : '❌ FAIL',
  functionExecution: allFunctionsExecute ? '✅ PASS' : '❌ FAIL',
  design8_12: designResults.every(Boolean) ? '✅ PASS' : '❌ FAIL'
};

Object.entries(summary).forEach(([test, result]) => {
  console.log(`  ${test}: ${result}`);
});

const overallSuccess = Object.values(summary).every(result => result.includes('✅'));
console.log(`\nOverall GitHub Actions Test Status: ${overallSuccess ? '✅ READY' : '❌ ISSUES FOUND'}`);

if (overallSuccess) {
  console.log('\n🎉 GitHub Actions test passed! Design 6-12 are ready for CI/CD.');
} else {
  console.log('\n🔧 Some tests failed. Please check the output above for details.');
  process.exit(1);
}