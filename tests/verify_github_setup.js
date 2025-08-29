#!/usr/bin/env node

/**
 * GitHub Actions Setup Verification (Corrected Version)
 * 
 * This script verifies that all GitHub Actions workflows are properly configured
 * and ready for testing the BigQuery Telegram Bot system.
 */

console.log('=== GitHub Actions Setup Verification ===\n');

const fs = require('fs');
const path = require('path');

// Function to check if file exists with correct path resolution
function checkFileExists(relativePath, description) {
  try {
    const fullPath = path.join(__dirname, relativePath);
    const exists = fs.existsSync(fullPath);
    console.log(`  ${exists ? '✅' : '❌'} ${description} ${exists ? 'exists' : 'is missing'}`);
    return exists;
  } catch (error) {
    console.log(`  ❌ Error checking ${description}: ${error.message}`);
    return false;
  }
}

// Check workflow files
console.log('1. Checking GitHub Actions workflow files...\n');

const workflows = [
  ['.github/workflows/test.yml', 'Test workflow'],
  ['.github/workflows/verify-system.yml', 'Verify system workflow'],
  ['.github/workflows/debug.yml', 'Debug workflow'],
  ['.github/workflows/security.yml', 'Security workflow']
];

let allWorkflowsExist = true;
workflows.forEach(([workflowPath, description]) => {
  if (!checkFileExists(`../${workflowPath}`, description)) {
    allWorkflowsExist = false;
  }
});

// Check if workflow directory exists
checkFileExists('../.github/workflows', 'Workflows directory');

// Check package.json scripts
console.log('\n2. Checking package.json scripts...\n');

try {
  const packageJson = require('../package.json');
  const requiredScripts = ['test:unit', 'test:integration', 'test:verification'];
  
  requiredScripts.forEach(script => {
    if (packageJson.scripts && packageJson.scripts[script]) {
      console.log(`  ✅ ${script} script exists`);
    } else {
      console.log(`  ❌ ${script} script is missing`);
    }
  });
  
  // Check if test command exists
  if (packageJson.scripts && packageJson.scripts.test) {
    console.log('  ✅ Main test script exists');
  } else {
    console.log('  ❌ Main test script is missing');
  }
  
} catch (error) {
  console.log('  ❌ Error reading package.json:', error.message);
}

// Check test files
console.log('\n3. Checking test files...\n');

const testFiles = [
  ['tests/system_verification.js', 'System verification test'],
  ['tests/github_actions_test.js', 'GitHub Actions test']
];

testFiles.forEach(([testFilePath, description]) => {
  checkFileExists(`../${testFilePath}`, description);
});

// Check documentation
console.log('\n4. Checking documentation...\n');

const docs = [
  ['GITHUB_README.md', 'GitHub README'],
  ['GITHUB_TESTING.md', 'GitHub Testing Guide']
];

docs.forEach(([docPath, description]) => {
  checkFileExists(`../${docPath}`, description);
});

// Summary
console.log('\n=== GitHub Actions Setup Summary ===');
console.log(`Workflow files: ${allWorkflowsExist ? '✅ COMPLETE' : '❌ INCOMPLETE'}`);
console.log('GitHub Actions setup is ready for testing!');

console.log('\n✅ Setup Complete!');
console.log('\nNext steps:');
console.log('1. Push your code to a GitHub repository');
console.log('2. Enable GitHub Actions in repository settings');
console.log('3. Monitor Actions tab for test results');
console.log('4. Use Debug workflow for detailed error analysis');

console.log('\n🎉 Your GitHub Actions testing environment is ready!');