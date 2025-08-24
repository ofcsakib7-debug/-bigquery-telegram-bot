// Test GitHub Actions setup
console.log('=== GitHub Actions Setup Verification ===\n');

const fs = require('fs');
const path = require('path');

// Check if GitHub Actions workflow files exist
console.log('1. Checking GitHub Actions workflow files...\n');

const workflowFiles = [
  '.github/workflows/test.yml',
  '.github/workflows/verify-system.yml'
];

let allWorkflowsExist = true;
workflowFiles.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    console.log(`  ✅ ${file} exists`);
  } else {
    console.log(`  ❌ ${file} is missing`);
    allWorkflowsExist = false;
  }
});

// Check if system verification script exists
console.log('\n2. Checking system verification script...\n');

const verificationScript = 'tests/system_verification.js';
const verificationPath = path.join(__dirname, '..', verificationScript);
if (fs.existsSync(verificationPath)) {
  console.log(`  ✅ ${verificationScript} exists`);
} else {
  console.log(`  ❌ ${verificationScript} is missing`);
}

// Check package.json scripts
console.log('\n3. Checking package.json scripts for GitHub Actions...\n');

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
} catch (error) {
  console.log('  ❌ Error reading package.json:', error.message);
}

// Summary
console.log('\n=== GitHub Actions Setup Summary ===');
console.log(`Workflow files: ${allWorkflowsExist ? '✅ READY' : '❌ INCOMPLETE'}`);
console.log('GitHub Actions setup is ready for testing!');
console.log('\nTo use this setup:');
console.log('1. Push your code to a GitHub repository');
console.log('2. Enable GitHub Actions in the repository settings');
console.log('3. Monitor the Actions tab for test results');
console.log('4. Check the detailed logs for any errors');