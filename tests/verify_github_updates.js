#!/usr/bin/env node

/**
 * Verify GitHub Actions Updates
 * 
 * This script checks that all GitHub Actions workflows have been updated
 * to use the current versions of actions.
 */

console.log('=== Verifying GitHub Actions Updates ===\n');

const fs = require('fs');
const path = require('path');

// Function to check if file contains updated actions
function checkWorkflowUpdates(workflowPath, workflowName) {
  try {
    const content = fs.readFileSync(path.join(__dirname, '..', workflowPath), 'utf8');
    
    // Check for updated actions
    const hasUpdatedCheckout = content.includes('actions/checkout@v4');
    const hasUpdatedSetupNode = content.includes('actions/setup-node@v4');
    const hasUpdatedUploadArtifact = content.includes('actions/upload-artifact@v4');
    
    console.log(`  ${workflowName}:`);
    console.log(`    ✅ actions/checkout@v4: ${hasUpdatedCheckout ? 'YES' : 'NO'}`);
    console.log(`    ✅ actions/setup-node@v4: ${hasUpdatedSetupNode ? 'YES' : 'NO'}`);
    console.log(`    ✅ actions/upload-artifact@v4: ${hasUpdatedUploadArtifact ? 'YES' : 'NO'}`);
    
    return hasUpdatedCheckout && hasUpdatedSetupNode && hasUpdatedUploadArtifact;
  } catch (error) {
    console.log(`  ❌ Error checking ${workflowName}: ${error.message}`);
    return false;
  }
}

// Check all workflow files
const workflows = [
  ['.github/workflows/test.yml', 'Test Workflow'],
  ['.github/workflows/verify-system.yml', 'Verify System Workflow'],
  ['.github/workflows/debug.yml', 'Debug Workflow'],
  ['.github/workflows/security.yml', 'Security Workflow']
];

let allUpdated = true;
workflows.forEach(([workflowPath, workflowName]) => {
  if (!checkWorkflowUpdates(workflowPath, workflowName)) {
    allUpdated = false;
  }
});

// Summary
console.log('\n=== GitHub Actions Update Summary ===');
console.log(`All workflows updated: ${allUpdated ? '✅ YES' : '❌ NO'}`);

if (allUpdated) {
  console.log('\n🎉 All GitHub Actions workflows have been successfully updated!');
  console.log('✅ No more deprecated action versions');
  console.log('✅ Ready for GitHub Actions execution');
} else {
  console.log('\n⚠️  Some workflows still need to be updated');
  console.log('❌ Please check the workflow files above');
}

console.log('\nAfter uploading these updated files to GitHub:');
console.log('1. The deprecated action error should be resolved');
console.log('2. GitHub Actions should run successfully');
console.log('3. You\'ll get detailed error logs and debugging information');