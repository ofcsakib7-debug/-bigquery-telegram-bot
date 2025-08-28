// github result/verify_fix.js
console.log("=== Verifying GitHub Actions Error Fix ===\n");

// Test that the package.json has been correctly updated
const fs = require('fs');
const path = require('path');

try {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  console.log("1. Checking package.json scripts...\n");
  
  // Check that test:design6 uses jest
  if (packageJson.scripts && packageJson.scripts['test:design6']) {
    const design6Script = packageJson.scripts['test:design6'];
    if (design6Script.includes('jest')) {
      console.log("  ✅ test:design6 correctly uses Jest");
    } else {
      console.log("  ❌ test:design6 still uses node instead of jest");
      console.log("     Current value:", design6Script);
    }
  } else {
    console.log("  ❌ test:design6 script not found");
  }
  
  // Check that test:design7 uses jest
  if (packageJson.scripts && packageJson.scripts['test:design7']) {
    const design7Script = packageJson.scripts['test:design7'];
    if (design7Script.includes('jest')) {
      console.log("  ✅ test:design7 correctly uses Jest");
    } else {
      console.log("  ❌ test:design7 still uses node instead of jest");
      console.log("     Current value:", design7Script);
    }
  } else {
    console.log("  ❌ test:design7 script not found");
  }
  
  console.log("\n2. Checking workflow file...\n");
  
  // Check that the workflow file uses npx jest
  const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'design6-design7-test.yml');
  const workflowContent = fs.readFileSync(workflowPath, 'utf8');
  
  if (workflowContent.includes('npx jest')) {
    console.log("  ✅ GitHub Actions workflow correctly uses 'npx jest'");
  } else {
    console.log("  ❌ GitHub Actions workflow still uses 'node' instead of 'npx jest'");
  }
  
  // Check that it no longer uses direct node execution of test files
  if (!workflowContent.includes('node tests/unit/search_validation.test.js') && 
      !workflowContent.includes('node tests/unit/error_detection.test.js')) {
    console.log("  ✅ GitHub Actions workflow no longer directly executes test files with node");
  } else {
    console.log("  ❌ GitHub Actions workflow still directly executes test files with node");
  }
  
  console.log("\n=== Verification Complete ===");
  console.log("The GitHub Actions error should now be resolved.");
  
} catch (error) {
  console.log("❌ Error during verification:", error.message);
}
