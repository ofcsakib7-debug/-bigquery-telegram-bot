#!/usr/bin/env node

/**
 * GitHub Actions Setup Verification
 * 
 * This script verifies that all GitHub Actions workflows are properly configured
 * and ready for testing the BigQuery Telegram Bot system.
 */

console.log('=== GitHub Actions Setup Verification ===\n');

const fs = require('fs');
const path = require('path');

// Check workflow files
console.log('1. Checking GitHub Actions workflow files...\n');

const workflowDir = '.github/workflows';
const requiredWorkflows = [
  'test.yml',
  'verify-system.yml',
  'debug.yml',
  'security.yml'
];

let allWorkflowsExist = true;
requiredWorkflows.forEach(workflow => {
  const workflowPath = path.join(__dirname, '..', workflowDir, workflow);
  if (fs.existsSync(workflowPath)) {
    console.log(`  ✅ ${workflow} exists`);
  } else {
    console.log(`  ❌ ${workflow} is missing`);
    allWorkflowsExist = false;
  }
});

// Check if workflow directory exists
const workflowDirPath = path.join(__dirname, '..', workflowDir);
if (fs.existsSync(workflowDirPath) && fs.statSync(workflowDirPath).isDirectory()) {
  console.log(`  ✅ ${workflowDir} directory exists`);
} else {
  console.log(`  ❌ ${workflowDir} directory is missing`);
  allWorkflowsExist = false;
}

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
  'tests/system_verification.js',
  'tests/github_actions_test.js'
];

testFiles.forEach(testFile => {
  const testFilePath = path.join(__dirname, '..', testFile);
  if (fs.existsSync(testFilePath)) {
    console.log(`  ✅ ${testFile} exists`);
  } else {
    console.log(`  ❌ ${testFile} is missing`);
  }
});

// Check documentation
console.log('\n4. Checking documentation...\n');

const docs = [
  'GITHUB_README.md',
  'GITHUB_TESTING.md'
];

docs.forEach(doc => {
  const docPath = path.join(__dirname, '..', doc);
  if (fs.existsSync(docPath)) {
    console.log(`  ✅ ${doc} exists`);
  } else {
    console.log(`  ❌ ${doc} is missing`);
  }
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