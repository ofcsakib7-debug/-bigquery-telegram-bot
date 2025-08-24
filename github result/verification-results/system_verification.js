// Comprehensive system verification with detailed error logging
console.log('=== BigQuery Telegram Bot - System Verification ===\n');

// Import required modules with detailed error handling
console.log('1. Testing Module Imports with Detailed Error Logging...\n');

function safeImport(modulePath, moduleName) {
  try {
    const module = require(modulePath);
    console.log(`  ✅ ${moduleName} module imported successfully`);
    return { success: true, module };
  } catch (error) {
    console.log(`  ❌ ${moduleName} module import failed:`);
    console.log(`     Error: ${error.message}`);
    console.log(`     Stack: ${error.stack}`);
    return { success: false, error };
  }
}

// Test module imports
const paymentResult = safeImport('./functions/payment', 'Payment');
const snoozeResult = safeImport('./functions/snooze', 'Snooze');
const cacheResult = safeImport('./bigquery/cache', 'Cache');

// Check if all imports were successful
const allImportsSuccessful = paymentResult.success && snoozeResult.success && cacheResult.success;
console.log(`\n  Import Summary: ${allImportsSuccessful ? '✅ All modules imported successfully' : '❌ Some modules failed to import'}\n`);

// Test function accessibility with detailed error logging
console.log('2. Testing Function Accessibility with Detailed Error Logging...\n');

function testFunctionAccessibility(moduleResult, moduleName, functionName) {
  if (!moduleResult.success) {
    console.log(`  ⚠️  Skipping ${functionName} test - ${moduleName} module failed to import`);
    return { success: false, reason: 'Module import failed' };
  }
  
  try {
    const func = moduleResult.module[functionName];
    if (typeof func === 'function') {
      console.log(`  ✅ ${moduleName}.${functionName} function is accessible`);
      return { success: true, function: func };
    } else {
      console.log(`  ❌ ${moduleName}.${functionName} function is not accessible`);
      console.log(`     Expected: function, Got: ${typeof func}`);
      return { success: false, reason: 'Function not found' };
    }
  } catch (error) {
    console.log(`  ❌ ${moduleName}.${functionName} accessibility test failed:`);
    console.log(`     Error: ${error.message}`);
    console.log(`     Stack: ${error.stack}`);
    return { success: false, error };
  }
}

// Test key functions
const validateChallanNumbersResult = testFunctionAccessibility(paymentResult, 'Payment', 'validateChallanNumbers');
const generateCacheKeyResult = testFunctionAccessibility(cacheResult, 'Cache', 'generateCacheKey');
const calculateSnoozeUntilResult = testFunctionAccessibility(snoozeResult, 'Snooze', 'calculateSnoozeUntil');

// Test function execution with detailed error logging
console.log('\n3. Testing Function Execution with Detailed Error Logging...\n');

function testFunctionExecution(functionResult, functionName, testArgs, expectedType) {
  if (!functionResult.success) {
    console.log(`  ⚠️  Skipping ${functionName} execution test - function not accessible`);
    return { success: false, reason: 'Function not accessible' };
  }
  
  try {
    console.log(`  Testing ${functionName} with args:`, JSON.stringify(testArgs));
    const result = functionResult.function(...testArgs);
    console.log(`  ✅ ${functionName} executed successfully`);
    console.log(`     Result type: ${typeof result}`);
    console.log(`     Result: ${JSON.stringify(result)}`);
    
    if (expectedType && typeof result !== expectedType) {
      console.log(`  ⚠️  ${functionName} returned unexpected type:`);
      console.log(`     Expected: ${expectedType}, Got: ${typeof result}`);
    }
    
    return { success: true, result };
  } catch (error) {
    console.log(`  ❌ ${functionName} execution failed:`);
    console.log(`     Error: ${error.message}`);
    console.log(`     Stack: ${error.stack}`);
    return { success: false, error };
  }
}

// Test function executions
if (validateChallanNumbersResult.success) {
  testFunctionExecution(validateChallanNumbersResult, 'validateChallanNumbers', ['CH-2023-1001'], 'object');
  testFunctionExecution(validateChallanNumbersResult, 'validateChallanNumbers', ['INVALID'], 'object');
}

if (generateCacheKeyResult.success) {
  testFunctionExecution(generateCacheKeyResult, 'generateCacheKey', ['test', 'user123', 'context'], 'string');
}

if (calculateSnoozeUntilResult.success) {
  testFunctionExecution(calculateSnoozeUntilResult, 'calculateSnoozeUntil', ['1h'], 'object');
}

// Test file structure
console.log('\n4. Testing File Structure...\n');

const fs = require('fs');
const path = require('path');

function checkFileExists(filePath, description) {
  try {
    const fullPath = path.join(__dirname, '..', filePath);
    if (fs.existsSync(fullPath)) {
      console.log(`  ✅ ${description} exists (${filePath})`);
      return true;
    } else {
      console.log(`  ❌ ${description} is missing (${filePath})`);
      return false;
    }
  } catch (error) {
    console.log(`  ❌ Error checking ${description}: ${error.message}`);
    return false;
  }
}

const requiredFiles = [
  ['functions/payment.js', 'Payment module'],
  ['functions/snooze.js', 'Snooze module'],
  ['bigquery/cache.js', 'Cache module'],
  ['cloudbuild.yaml', 'Cloud Build configuration'],
  ['package.json', 'Package configuration'],
  ['README.md', 'Documentation']
];

let allFilesExist = true;
requiredFiles.forEach(([filePath, description]) => {
  if (!checkFileExists(filePath, description)) {
    allFilesExist = false;
  }
});

// Test package.json
console.log('\n5. Testing Package.json Configuration...\n');

function checkPackageJson() {
  try {
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    console.log('  ✅ package.json parsed successfully');
    
    const requiredScripts = ['test:unit', 'test:integration', 'test:e2e', 'verify'];
    let allScriptsPresent = true;
    
    requiredScripts.forEach(script => {
      if (packageJson.scripts && packageJson.scripts[script]) {
        console.log(`  ✅ ${script} script exists`);
      } else {
        console.log(`  ❌ ${script} script is missing`);
        allScriptsPresent = false;
      }
    });
    
    return { success: true, allScriptsPresent };
  } catch (error) {
    console.log(`  ❌ Error checking package.json: ${error.message}`);
    return { success: false, error };
  }
}

const packageJsonResult = checkPackageJson();

// Summary
console.log('\n=== System Verification Summary ===');

const summary = {
  moduleImports: allImportsSuccessful ? '✅ PASS' : '❌ FAIL',
  functionAccessibility: (
    validateChallanNumbersResult.success && 
    generateCacheKeyResult.success && 
    calculateSnoozeUntilResult.success
  ) ? '✅ PASS' : '❌ FAIL',
  fileStructure: allFilesExist ? '✅ PASS' : '❌ FAIL',
  packageJson: packageJsonResult.success && packageJsonResult.allScriptsPresent ? '✅ PASS' : '❌ FAIL'
};

Object.entries(summary).forEach(([test, result]) => {
  console.log(`  ${test}: ${result}`);
});

const overallSuccess = Object.values(summary).every(result => result.includes('✅'));
console.log(`\nOverall System Status: ${overallSuccess ? '✅ READY' : '❌ ISSUES FOUND'}`);

if (!overallSuccess) {
  console.log('\n🔧 Recommended Actions:');
  if (!summary.moduleImports.includes('✅')) {
    console.log('  - Check module import errors above');
  }
  if (!summary.functionAccessibility.includes('✅')) {
    console.log('  - Check function accessibility errors above');
  }
  if (!summary.fileStructure.includes('✅')) {
    console.log('  - Ensure all required files exist');
  }
  if (!summary.packageJson.includes('✅')) {
    console.log('  - Check package.json scripts configuration');
  }
}

console.log('\n=== Verification Complete ===');